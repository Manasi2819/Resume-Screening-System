"""
Cross-Encoder Reranker — custom code (no LangChain).
LangChain does not have a production-ready cross-encoder reranker module.
We use sentence-transformers CrossEncoder directly.

The cross-encoder takes each (JD, chunk) pair and scores them precisely.
This is more accurate than vector similarity alone because it reads both texts
together rather than comparing pre-computed vectors.
"""
import math
from sentence_transformers import CrossEncoder
from app.core.config import settings

# ── Singleton ────────────────────────────────────────────────────────────────
_reranker: CrossEncoder | None = None


def get_reranker() -> CrossEncoder:
    global _reranker
    if _reranker is None:
        print(f"[Reranker] Loading {settings.RERANKER_MODEL} ...")
        _reranker = CrossEncoder(settings.RERANKER_MODEL)
        print("[Reranker] ✓ Model loaded.")
    return _reranker


def _sigmoid(x: float) -> float:
    """Map raw cross-encoder score to 0–1 range."""
    return 1.0 / (1.0 + math.exp(-x))


def rerank(jd_text: str, chunks: list[dict]) -> list[dict]:
    """
    Score each (JD, chunk) pair with the cross-encoder.
    Adds 'reranker_score' (0–1) to each chunk dict.
    Returns chunks sorted by reranker_score descending.
    """
    if not chunks:
        return []

    model = get_reranker()
    pairs = [(jd_text, chunk["text"]) for chunk in chunks]
    raw_scores = model.predict(pairs)

    for chunk, raw in zip(chunks, raw_scores):
        chunk["reranker_score"] = round(_sigmoid(float(raw)), 4)

    return sorted(chunks, key=lambda c: c["reranker_score"], reverse=True)
