"""
Custom PDF parser — does NOT use LangChain.
Reason: Generic text splitters blindly chop text every N chars.
Resumes need semantic section-aware chunking (Experience, Skills, etc.)
"""
import io
import re
from typing import Optional

import pdfplumber
import spacy

# Load spaCy model once at module level
try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    raise RuntimeError(
        "spaCy model not found. Run: python -m spacy download en_core_web_sm"
    )

# ── Section header keywords ──────────────────────────────────────────────────
SECTION_HEADERS: dict[str, list[str]] = {
    "summary": ["summary", "objective", "profile", "about me", "career objective"],
    "skills": [
        "skills", "technical skills", "core competencies", "technologies",
        "tools", "tech stack", "areas of expertise",
    ],
    "experience": [
        "experience", "work experience", "employment", "professional experience",
        "work history", "career history",
    ],
    "education": ["education", "academic background", "qualifications", "academics"],
    "projects": ["projects", "personal projects", "key projects", "portfolio"],
    "certifications": ["certifications", "certificates", "awards", "achievements"],
}

# ── Common tech skills for metadata extraction ───────────────────────────────
SKILL_KEYWORDS = [
    "python", "java", "javascript", "typescript", "react", "node.js", "nodejs",
    "sql", "postgresql", "mysql", "mongodb", "redis", "elasticsearch",
    "machine learning", "deep learning", "nlp", "computer vision", "llm",
    "fastapi", "django", "flask", "spring boot", "express",
    "docker", "kubernetes", "aws", "gcp", "azure", "terraform",
    "tensorflow", "pytorch", "scikit-learn", "pandas", "numpy", "langchain",
    "git", "ci/cd", "rest api", "graphql", "kafka", "spark",
    "c++", "c#", "go", "rust", "scala", "r",
]


def heal_split_headers(text: str) -> str:
    """Heal PDF layout splitting issues where first letters are on a separate line (drop caps)."""
    lines = text.split("\n")
    if len(lines) < 2:
        return text

    i = 0
    while i < len(lines) - 1:
        line1 = lines[i].strip()
        line2 = lines[i+1].strip()

        words1 = line1.split()
        words2 = line2.split()

        if (len(words1) >= 2 and
            all(len(w) == 1 and w.isupper() for w in words1) and
            len(words1) == len(words2)):

            healed_words = [w1 + w2 for w1, w2 in zip(words1, words2)]
            healed_line = " ".join(healed_words)
            lines[i] = healed_line
            lines.pop(i+1)
            continue
        i += 1

    return "\n".join(lines)


def sanitize_text(text: str) -> str:
    """
    Remove characters that PostgreSQL cannot store in text columns:
    - NUL bytes (0x00) — PostgreSQL string literals cannot contain them
    - Other non-printable control characters (except \t, \n, \r)
    """
    # Remove NUL bytes
    text = text.replace("\x00", "")
    # Remove other non-printable control chars (keep tab, newline, carriage return)
    text = re.sub(r"[\x01-\x08\x0b\x0c\x0e-\x1f\x7f]", "", text)
    return text


def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """Extract text from a PDF using pdfplumber. Returns plain text string."""
    text = ""
    try:
        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text() or ""
                text += page_text + "\n"
    except Exception as e:
        raise ValueError(f"Could not read PDF: {e}")

    # Sanitize before any further processing — strips NUL bytes that
    # PostgreSQL rejects (ValueError: string literal cannot contain NUL)
    text = sanitize_text(text)
    healed_text = heal_split_headers(text.strip())
    return healed_text


def detect_section(line: str) -> Optional[str]:
    """Return section label if this line is a section header, else None."""
    cleaned = line.lower().strip().rstrip(":").strip()
    for section, keywords in SECTION_HEADERS.items():
        if cleaned in keywords:
            return section
        # Handle lines like "WORK EXPERIENCE:" or "--- Skills ---"
        cleaned_no_special = re.sub(r"[^a-z\s]", "", cleaned).strip()
        if cleaned_no_special in keywords:
            return section
    return None


def chunk_by_sections(text: str) -> list[dict]:
    """
    Split resume text into labelled section chunks.
    Returns: [{section: str, text: str}, ...]
    """
    lines = text.split("\n")
    chunks: list[dict] = []
    current_section = "summary"
    current_lines: list[str] = []

    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue
        section = detect_section(stripped)
        if section and len(stripped) < 60:  # Headers are short lines
            if current_lines:
                chunk_text = "\n".join(current_lines).strip()
                if len(chunk_text) > 30:
                    chunks.append({"section": current_section, "text": chunk_text})
            current_section = section
            current_lines = []
        else:
            current_lines.append(line)

    # Flush last section
    if current_lines:
        chunk_text = "\n".join(current_lines).strip()
        if len(chunk_text) > 30:
            chunks.append({"section": current_section, "text": chunk_text})

    return chunks


def heuristic_extract_name(text: str) -> str:
    """Extract candidate name from first 8 lines of text using formatting filters."""
    # Split text into lines
    lines = [line.strip() for line in text.split("\n") if line.strip()]
    
    # Common words in headers or contact info that are NOT names
    forbidden_keywords = {
        "resume", "cv", "curriculum", "vitae", "summary", "profile", "contact", 
        "email", "phone", "mobile", "address", "linkedin", "github", "page", 
        "portfolio", "experience", "education", "skills", "projects", "objective"
    }
    
    # Check the first 8 lines
    for line in lines[:8]:
        cleaned = line.strip()
        
        # Skip if too short or too long
        if not (3 <= len(cleaned) <= 50):
            continue
            
        # Skip if contains email pattern
        if "@" in cleaned or ".com" in cleaned or ".in" in cleaned:
            continue
            
        # Skip if contains phone number patterns (multiple digits)
        digits_count = sum(c.isdigit() for c in cleaned)
        if digits_count > 3:
            continue
            
        # Skip if contains any forbidden keywords (word-level match)
        words = re.findall(r"\b\w+\b", cleaned.lower())
        if any(w in forbidden_keywords for w in words):
            continue
            
        # Skip if it is a common job title or role
        job_titles = {"engineer", "developer", "analyst", "student", "architect", "lead", "manager", "intern"}
        if any(w in job_titles for w in words):
            continue
            
        # Skip if it contains typical URL symbols
        if "http" in cleaned.lower() or "www." in cleaned.lower():
            continue
            
        # Check if title case or uppercase
        # (Allows letters, spaces, dots, hyphens)
        if re.match(r"^[A-Z][a-zA-Z\s\.\-]+$", cleaned):
            return cleaned
            
        # If uppercase name
        if cleaned.isupper() and re.match(r"^[A-Z\s\.\-]+$", cleaned):
            return cleaned
            
    # Fallback to spaCy NER
    doc = nlp(text[:3000])
    for ent in doc.ents:
        if ent.label_ == "PERSON":
            val = ent.text.strip()
            # Clean up the spaCy PERSON if it contains pipes or digits
            val = re.sub(r"[\|;\+0-9]", "", val).strip()
            if len(val) >= 3 and not any(w in forbidden_keywords for w in re.findall(r"\b\w+\b", val.lower())):
                return val
                
    # Ultimate fallback: first line of text
    if lines:
        first_line = lines[0]
        # clean it a bit
        first_line = re.sub(r"[\|;\+0-9]", "", first_line).strip()
        if len(first_line) > 2:
            return first_line
            
    return "Unknown"


def extract_metadata(text: str) -> dict:
    """
    Extract structured metadata from raw resume text using spaCy + regex.
    Returns: {name, email, phone, years_experience, skills}
    """
    # Only process first 3000 chars for speed
    doc = nlp(text[:3000])

    # ── Name: heuristic extraction with spaCy fallback ───────────────────
    name = heuristic_extract_name(text)

    # ── Email ─────────────────────────────────────────────────────────────
    emails = re.findall(r"[\w.+-]+@[\w-]+\.[a-zA-Z]{2,}", text)
    email = emails[0] if emails else None

    # ── Phone ─────────────────────────────────────────────────────────────
    phones = re.findall(r"[\+]?[\d\s\-\(\)]{10,16}", text)
    phone = phones[0].strip() if phones else None

    # ── Years of experience ───────────────────────────────────────────────
    exp_matches = re.findall(
        r"(\d+)\+?\s*years?\s*(?:of\s+)?(?:experience|exp)?",
        text,
        re.IGNORECASE,
    )
    years_exp = max((int(x) for x in exp_matches), default=0)

    # ── Skills ────────────────────────────────────────────────────────────
    text_lower = text.lower()
    found_skills = [s for s in SKILL_KEYWORDS if s in text_lower]

    return {
        "name": name,
        "email": email,
        "phone": phone,
        "years_experience": years_exp,
        "skills": found_skills,
    }


def parse_resume(pdf_bytes: bytes) -> dict:
    """
    Full parse pipeline: raw bytes → {raw_text, chunks, metadata}
    This is the main entry point called by the pipeline.
    """
    raw_text = extract_text_from_pdf(pdf_bytes)
    chunks = chunk_by_sections(raw_text)
    metadata = extract_metadata(raw_text)

    # If no sections detected, treat whole text as one experience chunk
    if not chunks:
        chunks = [{"section": "experience", "text": raw_text[:3000]}]

    return {
        "raw_text": raw_text,
        "chunks": chunks,
        "metadata": metadata,
    }
