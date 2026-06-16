"""
LangChain-based embedder wrapper.
Uses HuggingFaceEmbeddings — the LangChain class that wraps sentence-transformers.
BGE models require a query instruction prefix for queries (not for documents).
"""
from langchain_huggingface import HuggingFaceEmbeddings
from app.core.config import settings

# ── Singleton — model loads once per process (~30–60 sec first time) ─────────
_embedder: HuggingFaceEmbeddings | None = None


def get_embedder() -> HuggingFaceEmbeddings:
    """Return cached LangChain HuggingFaceEmbeddings instance."""
    global _embedder
    if _embedder is None:
        print(f"[Embedder] Loading {settings.EMBED_MODEL} ... (first run downloads ~1.3GB)")
        _embedder = HuggingFaceEmbeddings(
            model_name=settings.EMBED_MODEL,
            model_kwargs={"device": "cpu"},
            encode_kwargs={"normalize_embeddings": True},  # required for cosine similarity
        )
        print("[Embedder] ✓ Model loaded.")
    return _embedder


def embed_texts(texts: list[str]) -> list[list[float]]:
    """Embed a list of document/chunk texts (no prefix needed for BGE docs)."""
    return get_embedder().embed_documents(texts)


def embed_query(query: str) -> list[float]:
    """
    Embed a query/JD text.
    BGE models need a prefix: 'Represent this sentence for searching relevant passages: ...'
    LangChain's HuggingFaceEmbeddings handles this via embed_query().
    """
    return get_embedder().embed_query(query)
