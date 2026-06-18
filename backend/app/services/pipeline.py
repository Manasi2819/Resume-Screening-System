"""
Pipeline orchestrator — ties all services together end-to-end.
Called by the FastAPI route handler.

Flow:
  1. Save PDFs locally
  2. Parse each PDF (custom parser)
  3. Build LangChain Documents + store in Qdrant (LangChain)
  4. Search Qdrant with the JD vector (LangChain)
  5. Rerank retrieved chunks (custom)
  6. Compute per-candidate weighted score (custom)
  7. Generate fit/gap explanation via Groq (LangChain chain)
  8. Persist results to PostgreSQL
  9. Return ranked JSON
"""
import uuid

from sqlalchemy.orm import Session

from app.models.orm import Job, Candidate, Screening
from app.services import parser, storage, retriever, reranker, scorer, explainer


def run_pipeline(
    job_id: str,
    jd_text: str,
    resume_files: list[dict],   # [{filename: str, bytes: bytes}]
    db: Session,
) -> list[dict]:
    """
    End-to-end screening pipeline.
    Returns ranked list of candidates with scores and explanations.
    """

    # ── STEP 1: Parse all resumes & save to disk ──────────────────────────
    all_chunks: list[dict] = []
    candidate_metadata_map: dict[str, dict] = {}

    for rf in resume_files:
        # Save file to disk (any supported format)
        file_path = storage.save_file(rf["bytes"], rf["filename"])

        # Parse: extract text, sections, metadata (format detected by filename)
        parsed = parser.parse_resume(rf["bytes"], rf["filename"])

        # Save candidate to DB
        candidate = Candidate(
            id=uuid.uuid4(),
            job_id=uuid.UUID(job_id),
            name=parsed["metadata"]["name"],
            email=parsed["metadata"].get("email"),
            file_path=file_path,
            raw_text=parsed["raw_text"],
            metadata_json=parsed["metadata"],
        )
        db.add(candidate)
        db.flush()  # get candidate.id without full commit

        resume_id = str(candidate.id)
        candidate_metadata_map[resume_id] = parsed["metadata"]

        # Build chunk dicts for vector storage
        for chunk in parsed["chunks"]:
            all_chunks.append({
                "resume_id": resume_id,
                "job_id": job_id,
                "candidate_name": parsed["metadata"]["name"],
                "section": chunk["section"],
                "text": chunk["text"],
            })

    # ── STEP 2: Embed & upsert all chunks into Qdrant (LangChain) ─────────
    retriever.upsert_chunks(all_chunks)

    # ── STEP 3: Search Qdrant with JD (LangChain ANN + cosine similarity) ─
    retrieved = retriever.search_chunks(
        jd_text=jd_text,
        job_id=job_id,
        top_k=30,
    )

    if not retrieved:
        # Edge case: no chunks found (Qdrant may be empty)
        db.commit()
        return []

    # ── STEP 4: Cross-encoder reranking (custom) ──────────────────────────
    reranked = reranker.rerank(jd_text, retrieved)

    # ── STEP 5: Weighted scoring per candidate (custom) ───────────────────
    ranked = scorer.compute_scores(
        retrieved_chunks=retrieved,
        reranked_chunks=reranked,
        candidate_metadata=candidate_metadata_map,
        jd_text=jd_text,
    )

    # ── STEP 6: Generate LLM explanations + save to DB (LangChain chain) ──
    results: list[dict] = []
    for rank_pos, cand_score in enumerate(ranked, start=1):
        rid = cand_score["resume_id"]

        # Top 3 evidence chunks for this candidate
        top_chunks = [
            c["text"] for c in reranked if c["resume_id"] == rid
        ][:3]

        explanation = explainer.generate_explanation(
            jd_text=jd_text,
            candidate_name=cand_score["candidate_name"],
            top_chunks=top_chunks,
        )

        screening = Screening(
            job_id=uuid.UUID(job_id),
            candidate_id=uuid.UUID(rid),
            rank=rank_pos,
            final_score=cand_score["final_score"],
            vector_score=cand_score["vector_score"],
            reranker_score=cand_score["reranker_score"],
            rule_score=cand_score["rule_score"],
            explanation_fit=explanation.get("fit", ""),
            explanation_gap=explanation.get("gap", ""),
            evidence_chunks=top_chunks,
        )
        db.add(screening)

        meta = candidate_metadata_map.get(rid, {})
        results.append({
            "rank": rank_pos,
            "resume_id": rid,
            "candidate_name": cand_score["candidate_name"],
            "candidate_email": meta.get("email"),
            "candidate_phone": meta.get("phone"),
            "skills": meta.get("skills", []),
            "final_score": cand_score["final_score"],
            "vector_score": cand_score["vector_score"],
            "reranker_score": cand_score["reranker_score"],
            "rule_score": cand_score["rule_score"],
            "explanation_fit": explanation.get("fit", ""),
            "explanation_gap": explanation.get("gap", ""),
            "evidence_chunks": top_chunks,
        })

    db.commit()
    return results
