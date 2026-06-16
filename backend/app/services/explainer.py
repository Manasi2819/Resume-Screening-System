"""
LangChain-based LLM explainer.
Uses ChatGroq (LangChain wrapper) + ChatPromptTemplate + JsonOutputParser
to generate a fit/gap summary per candidate from retrieved evidence chunks.
"""
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser

from app.core.config import settings

# ── Build the LangChain chain once ──────────────────────────────────────────
_chain = None


def _get_chain():
    global _chain
    if _chain is None:
        llm = ChatGroq(
            model=settings.GROQ_MODEL,
            api_key=settings.GROQ_API_KEY,
            temperature=0.3,
            max_tokens=300,
        )

        prompt = ChatPromptTemplate.from_messages([
            (
                "system",
                (
                    "You are an expert technical recruiter. Given a Job Description and a "
                    "candidate's resume excerpts, write a brief evaluation. "
                    "Respond ONLY with valid JSON in exactly this format: "
                    '{{"fit": "One sentence about what the candidate does well.", '
                    '"gap": "One sentence about what skills or experience are missing."}}'
                ),
            ),
            (
                "human",
                (
                    "Job Description:\n{jd_text}\n\n"
                    "Candidate: {candidate_name}\n\n"
                    "Resume excerpts:\n{chunks_text}"
                ),
            ),
        ])

        _chain = prompt | llm | JsonOutputParser()
    return _chain


def generate_explanation(
    jd_text: str,
    candidate_name: str,
    top_chunks: list[str],
) -> dict:
    """
    Call Groq via LangChain chain to generate fit + gap explanation.
    Returns {"fit": "...", "gap": "..."}
    """
    try:
        chain = _get_chain()
        chunks_text = "\n---\n".join(top_chunks[:3])
        result = chain.invoke({
            "jd_text": jd_text[:800],
            "candidate_name": candidate_name,
            "chunks_text": chunks_text[:1500],
        })
        # Ensure we always return the expected keys
        return {
            "fit": result.get("fit", "Strong technical background relevant to this role."),
            "gap": result.get("gap", "No significant gaps identified."),
        }
    except Exception as e:
        return {
            "fit": "Could not generate explanation.",
            "gap": f"Error: {str(e)[:100]}",
        }
