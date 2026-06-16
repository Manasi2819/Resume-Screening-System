"""
LangChain + Qdrant vector store wrapper.

Local dev:  QDRANT_USE_MEMORY=true  → in-memory Qdrant (no server needed)
Production: QDRANT_USE_MEMORY=false → connects to Qdrant server on QDRANT_HOST:QDRANT_PORT

We use langchain_qdrant.QdrantVectorStore which wraps qdrant_client.
"""
from langchain_qdrant import QdrantVectorStore
from langchain_core.documents import Document
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams

from app.core.config import settings
from app.services.embedder import get_embedder

# ── Singleton Qdrant client ─────────────────────────────────────────────────
_qdrant_client: QdrantClient | None = None


def get_qdrant_client() -> QdrantClient:
    global _qdrant_client
    if _qdrant_client is None:
        if settings.QDRANT_USE_MEMORY:
            print("[Qdrant] Using in-memory mode (local dev)")
            _qdrant_client = QdrantClient(":memory:")
        else:
            print(f"[Qdrant] Connecting to {settings.QDRANT_HOST}:{settings.QDRANT_PORT}")
            _qdrant_client = QdrantClient(
                host=settings.QDRANT_HOST,
                port=settings.QDRANT_PORT,
            )
        _ensure_collection(_qdrant_client)
    return _qdrant_client


def _ensure_collection(client: QdrantClient) -> None:
    """Create the Qdrant collection if it doesn't already exist."""
    existing = [c.name for c in client.get_collections().collections]
    if settings.QDRANT_COLLECTION not in existing:
        client.create_collection(
            collection_name=settings.QDRANT_COLLECTION,
            vectors_config=VectorParams(
                size=settings.EMBED_DIM,      # 1024 for BGE-large
                distance=Distance.COSINE,      # ANN search with cosine similarity
            ),
        )
        print(f"[Qdrant] ✓ Collection '{settings.QDRANT_COLLECTION}' created.")


def get_vector_store() -> QdrantVectorStore:
    """Return a LangChain QdrantVectorStore instance."""
    return QdrantVectorStore(
        client=get_qdrant_client(),
        collection_name=settings.QDRANT_COLLECTION,
        embedding=get_embedder(),
    )


def upsert_chunks(chunks: list[dict]) -> None:
    """
    Store resume chunks into Qdrant via LangChain.
    Each chunk: {resume_id, job_id, candidate_name, section, text}
    """
    docs = [
        Document(
            page_content=chunk["text"],
            metadata={
                "resume_id": chunk["resume_id"],
                "job_id": chunk["job_id"],
                "candidate_name": chunk["candidate_name"],
                "section": chunk["section"],
            },
        )
        for chunk in chunks
    ]
    store = get_vector_store()
    store.add_documents(docs)


def search_chunks(jd_text: str, job_id: str, top_k: int = 30) -> list[dict]:
    """
    Search Qdrant for the most relevant resume chunks for a given JD.
    Filters by job_id so we only search resumes from the current submission.
    Returns list of {score, resume_id, candidate_name, section, text}.
    """
    store = get_vector_store()

    # LangChain Qdrant filter syntax
    from qdrant_client.models import Filter, FieldCondition, MatchValue
    results = store.similarity_search_with_score(
        query=jd_text,
        k=top_k,
        filter=Filter(
            must=[FieldCondition(key="metadata.job_id", match=MatchValue(value=job_id))]
        ),
    )

    return [
        {
            "score": float(score),
            "resume_id": doc.metadata.get("resume_id"),
            "candidate_name": doc.metadata.get("candidate_name"),
            "section": doc.metadata.get("section"),
            "text": doc.page_content,
        }
        for doc, score in results
    ]
