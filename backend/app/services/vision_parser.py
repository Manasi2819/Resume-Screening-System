"""
Vision LLM-based parser for job portal profile screenshots.

Uses Groq's meta-llama/llama-4-scout-17b-16e-instruct multimodal model
to extract structured candidate data directly from images of profiles from
Naukri, LinkedIn, Indeed, Hirist, and any other job portal.

Why Vision LLM beats Tesseract OCR for portal screenshots:
  - Understands layout, icons, highlighted skill tags, two-column cards
  - Returns clean structured JSON regardless of portal UI complexity
  - Captures salary, notice period, current role — fields OCR can never get
  - Not confused by profile photos, borders, or coloured backgrounds

Rate limit / failure handling  (pipeline NEVER breaks):
  ┌────────────────────────────────────────────────────────────┐
  │  Any failure (rate limit, network, bad JSON, size limit)   │
  │      → logs a warning → returns None                       │
  │      → caller (parse_resume) falls back to OCR silently    │
  └────────────────────────────────────────────────────────────┘
"""

import base64
import json
import logging
import re
from typing import Optional

logger = logging.getLogger(__name__)

# ── Lazy import — module loads fine even if groq isn't installed ──────────────
try:
    from groq import Groq
    try:
        from groq import RateLimitError as _GroqRateLimitError
    except ImportError:
        from groq import APIStatusError as _GroqRateLimitError  # type: ignore
    try:
        from groq import BadRequestError as _GroqBadRequestError
    except ImportError:
        _GroqBadRequestError = Exception  # type: ignore
    _GROQ_AVAILABLE = True
except ImportError:
    _GROQ_AVAILABLE = False
    Groq = None                      # type: ignore
    _GroqRateLimitError   = Exception  # type: ignore
    _GroqBadRequestError  = Exception  # type: ignore


# ── Vision extraction prompt ──────────────────────────────────────────────────
_VISION_PROMPT = """
You are a professional HR assistant and resume parser.
Analyze this candidate profile image from a job portal (Naukri, LinkedIn, Indeed, Hirist, or similar).

Extract ALL visible information and return ONLY a valid JSON object with these exact fields:

{
  "name": "Full name of the candidate",
  "current_role": "Current job title and company (e.g. 'Software Engineer at TechCorp')",
  "previous_role": "Previous job title and company if visible, else null",
  "company": "Current company name only",
  "education": "Highest degree, college name, graduation year (e.g. 'B.Tech NIT Pune 2024')",
  "skills": ["Python", "React.js", "Node.js"],
  "years_experience": 2,
  "months_experience": 6,
  "location": "Comma-separated preferred/current cities (e.g. 'Pune, Mumbai, Bengaluru')",
  "salary_lacs": 4.5,
  "notice_period": "Immediate / X days / X months",
  "portal_source": "naukri or linkedin or indeed or hirist or unknown",
  "raw_text": "Complete readable reconstruction of all text visible in the profile"
}

Rules:
- skills must be a JSON array of individual technology/tool/language names — not full sentences
- years_experience and months_experience are integers (e.g. years=0, months=6 for '0y 6m')
- salary_lacs is a decimal number in Indian Lakhs (e.g. 1.20 for ₹1.20 Lacs)
- If a field is not visible in the image use null — do NOT guess or hallucinate
- raw_text should be a clean human-readable reconstruction of all text in the card
- Return ONLY the JSON object — no markdown fences, no explanation, no extra text
""".strip()


# ── Vision extraction prompt for Job Descriptions ─────────────────────────────
_JD_VISION_PROMPT = """
You are a professional HR assistant.
Analyze this Job Description (JD) image.

Extract and transcribe the complete text of the job description visible in the image.
Make sure to preserve headings, bullet points, requirements, and responsibilities.
Return ONLY the clean extracted plain text. Do NOT add any conversational filler, explanation, markdown formatting (such as ``` or ```text), or intro text.
""".strip()


# ── JSON extraction helper ───────────────────────────────────────────────────

def _extract_json(text: str) -> dict:
    """
    Extract a JSON object from free-form model output.

    Handles three common model output styles:
      1. Pure JSON   : '{"name": "..."}'                      (ideal)
      2. Fenced JSON : '```json\n{...}\n```'                  (common)
      3. Mixed prose : 'Here is the result: {"name": "..."}' (occasional)

    Raises json.JSONDecodeError if no valid JSON object is found.
    """
    # Strip markdown code fences if present
    text = re.sub(r"```(?:json)?\s*", "", text, flags=re.IGNORECASE).strip()
    text = text.replace("```", "").strip()

    # Try parsing the whole string first (fastest path)
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Fallback: find the outermost {...} block
    match = re.search(r"\{[\s\S]*\}", text)
    if match:
        return json.loads(match.group(0))

    raise json.JSONDecodeError("No JSON object found in model response", text, 0)


# ── Public API ────────────────────────────────────────────────────────────────

def extract_profile_with_vision(
    image_bytes: bytes,
    groq_api_key: str,
    vision_model: str,
) -> Optional[dict]:
    """
    Send an image to Groq Vision LLM and extract a structured candidate profile.

    Returns a dict with keys:
        name, current_role, previous_role, company, education, skills[],
        years_experience, months_experience, location, salary_lacs,
        notice_period, portal_source, raw_text

    Returns None on ANY failure — caller must fall back to OCR.

    Failure cases handled gracefully (all return None):
        - groq package not installed
        - Image larger than 4 MB base64 limit
        - HTTP 429 Rate Limit  ← explicit catch with clear log message
        - Network / API error
        - Model returns malformed / non-JSON response
        - Any unexpected exception
    """
    if not _GROQ_AVAILABLE:
        logger.warning("[VisionParser] groq package not installed — using OCR fallback")
        return None

    # ── Size guard: Groq base64 limit is 4 MB ────────────────────────────────
    size_kb = len(image_bytes) / 1024
    if size_kb > 3900:          # ~3.9 MB safety margin
        logger.warning(
            f"[VisionParser] Image {size_kb:.0f} KB exceeds 4 MB base64 limit — using OCR fallback"
        )
        return None

    b64_image = base64.b64encode(image_bytes).decode("utf-8")

    try:
        client = Groq(api_key=groq_api_key)
        response = client.chat.completions.create(
            model=vision_model,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:image/jpeg;base64,{b64_image}"},
                        },
                        {
                            "type": "text",
                            "text": _VISION_PROMPT,
                        },
                    ],
                }
            ],
            temperature=0.1,   # Low temperature = deterministic, factual extraction
            max_tokens=1024,
            # NOTE: response_format is intentionally omitted.
            # Groq raises json_validate_failed (400) on some complex images when
            # strict JSON mode is enabled. We parse JSON from free-form text instead
            # via _extract_json(), which is equally reliable and never crashes.
        )

        raw_content = (response.choices[0].message.content or "").strip()
        if not raw_content:
            logger.warning("[VisionParser] Model returned empty response content — falling back to OCR")
            return None

        data: dict = _extract_json(raw_content)

        # ── Quality guard ─────────────────────────────────────────────────────
        # If the model failed to extract a name AND skills, treat it as a failure
        # and fall back to OCR parser.
        has_name = data.get("name") is not None and str(data.get("name")).strip() != ""
        has_skills = bool(data.get("skills"))
        if not has_name and not has_skills:
            logger.warning("[VisionParser] Vision extraction returned no candidate name and no skills — falling back to OCR")
            return None

        logger.info(
            f"[VisionParser] Vision extraction OK — "
            f"candidate: {data.get('name', 'Unknown')}, "
            f"skills: {len(data.get('skills') or [])}, "
            f"portal: {data.get('portal_source', '?')}"
        )
        return data

    # ── Rate limit (HTTP 429) ─────────────────────────────────────────────────
    except _GroqRateLimitError as e:
        logger.warning(
            f"[VisionParser] Groq rate limit hit (HTTP 429) — falling back to OCR. "
            f"Tip: reduce concurrent uploads or upgrade plan. Detail: {e}"
        )
        return None

    # ── Bad request / json_validate_failed (HTTP 400) ────────────────────────
    # This should no longer occur now that response_format is removed, but kept
    # as a safety net in case the model returns a 400 for other reasons.
    except _GroqBadRequestError as e:
        logger.warning(
            f"[VisionParser] Groq bad request (HTTP 400) — falling back to OCR. "
            f"Detail: {e}"
        )
        return None

    # ── Bad / missing JSON in model response ─────────────────────────────────
    except (json.JSONDecodeError, ValueError) as e:
        logger.warning(
            f"[VisionParser] Could not parse JSON from model response — falling back to OCR. "
            f"Detail: {e}"
        )
        return None

    # ── Anything else (network, timeout, invalid model name, etc.) ────────────
    except Exception as e:
        logger.warning(
            f"[VisionParser] Unexpected error — falling back to OCR. "
            f"Type: {type(e).__name__}, Detail: {str(e)[:200]}"
        )
        return None


def extract_jd_with_vision(
    image_bytes: bytes,
    groq_api_key: str,
    vision_model: str,
) -> Optional[str]:
    """
    Send an image of a Job Description to Groq Vision LLM and extract its text content.

    Returns the transcribed text of the JD, or None on any failure.
    """
    if not _GROQ_AVAILABLE:
        logger.warning("[VisionParser] groq package not installed — using OCR fallback for JD")
        return None

    # ── Size guard: Groq base64 limit is 4 MB ────────────────────────────────
    size_kb = len(image_bytes) / 1024
    if size_kb > 3900:          # ~3.9 MB safety margin
        logger.warning(
            f"[VisionParser] JD Image {size_kb:.0f} KB exceeds 4 MB base64 limit — using OCR fallback"
        )
        return None

    b64_image = base64.b64encode(image_bytes).decode("utf-8")

    try:
        client = Groq(api_key=groq_api_key)
        response = client.chat.completions.create(
            model=vision_model,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:image/jpeg;base64,{b64_image}"},
                        },
                        {
                            "type": "text",
                            "text": _JD_VISION_PROMPT,
                        },
                    ],
                }
            ],
            temperature=0.1,   # Low temperature = factual transcription
            max_tokens=1024,
        )

        raw_content = (response.choices[0].message.content or "").strip()
        if not raw_content:
            logger.warning("[VisionParser] Model returned empty response content for JD — falling back to OCR")
            return None

        # Basic quality guard
        if len(raw_content) < 50:
            logger.warning("[VisionParser] JD Vision extraction returned too little text (< 50 chars) — falling back to OCR")
            return None

        logger.info(f"[VisionParser] JD Vision extraction OK — text length: {len(raw_content)}")
        return raw_content

    # ── Rate limit (HTTP 429) ─────────────────────────────────────────────────
    except _GroqRateLimitError as e:
        logger.warning(
            f"[VisionParser] Groq rate limit hit (HTTP 429) during JD parsing — falling back to OCR. Detail: {e}"
        )
        return None

    # ── Bad request / json_validate_failed (HTTP 400) ────────────────────────
    except _GroqBadRequestError as e:
        logger.warning(
            f"[VisionParser] Groq bad request (HTTP 400) during JD parsing — falling back to OCR. Detail: {e}"
        )
        return None

    # ── Anything else (network, timeout, invalid model name, etc.) ────────────
    except Exception as e:
        logger.warning(
            f"[VisionParser] Unexpected error during JD Vision parsing — falling back to OCR. "
            f"Type: {type(e).__name__}, Detail: {str(e)[:200]}"
        )
        return None


def vision_data_to_metadata(vision_data: dict) -> dict:
    """
    Convert Vision LLM output dict → standard metadata dict shape.

    The returned dict is a superset of what OCR/regex extract_metadata() returns,
    so it is a drop-in replacement everywhere in the pipeline.
    """
    # ── Normalise skills list ─────────────────────────────────────────────────
    skills_raw = vision_data.get("skills") or []
    if isinstance(skills_raw, str):
        # Model occasionally returns a comma-separated string instead of array
        skills_raw = [s.strip() for s in skills_raw.split(",") if s.strip()]
    skills = [str(s).lower().strip() for s in skills_raw if s]

    # ── Experience: pass the experience gate in scorer ────────────────────────
    # The scorer hard-gates candidates with years_experience < 1 to 0 exp_bonus.
    # Treat "0y 6m" (6+ months) as 1 year so freshers with real internship
    # experience are not unfairly penalised.
    years  = int(vision_data.get("years_experience")  or 0)
    months = int(vision_data.get("months_experience") or 0)
    effective_years = years
    if years == 0 and months >= 6:
        effective_years = 1

    # ── Salary: coerce to float safely ───────────────────────────────────────
    salary_raw = vision_data.get("salary_lacs")
    try:
        salary_lacs: Optional[float] = float(salary_raw) if salary_raw is not None else None
    except (TypeError, ValueError):
        salary_lacs = None

    return {
        # ── Core fields (same as OCR metadata) ──────────────────────────────
        "name":             str(vision_data.get("name") or "Unknown").strip(),
        "email":            vision_data.get("email"),       # rarely on portal cards
        "phone":            vision_data.get("phone"),       # rarely on portal cards
        "years_experience": effective_years,
        "skills":           skills,
        "location":         vision_data.get("location"),
        # ── Extended fields (portal-specific, new) ───────────────────────────
        "months_experience": months,
        "current_role":     vision_data.get("current_role"),
        "previous_role":    vision_data.get("previous_role"),
        "company":          vision_data.get("company"),
        "education":        vision_data.get("education"),
        "salary_lacs":      salary_lacs,
        "notice_period":    vision_data.get("notice_period"),
        "portal_source":    vision_data.get("portal_source"),
        "parsed_by":        "vision_llm",
    }
