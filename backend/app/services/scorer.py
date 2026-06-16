"""
Weighted scoring formula — custom code.
Aggregates per-candidate scores from vector similarity, cross-encoder reranking,
and rule-based heuristics into a final 0–1 score.
"""
import re
from collections import defaultdict

# ── Scoring weights (must sum to 1.0) ───────────────────────────────────────
WEIGHT_RERANKER = 0.45
WEIGHT_VECTOR   = 0.40
WEIGHT_RULES    = 0.15


def compute_scores(
    retrieved_chunks: list[dict],
    reranked_chunks: list[dict],
    candidate_metadata: dict,   # {resume_id: {skills, years_exp, ...}}
    jd_text: str,
) -> list[dict]:
    """
    Aggregate chunk scores per candidate, compute final weighted score.
    Returns list of candidate score dicts sorted by final_score descending.
    """
    # Group scores by resume_id
    reranker_by_id: dict[str, list[float]] = defaultdict(list)
    vector_by_id: dict[str, list[float]] = defaultdict(list)
    name_by_id: dict[str, str] = {}

    for chunk in reranked_chunks:
        rid = chunk["resume_id"]
        reranker_by_id[rid].append(chunk["reranker_score"])
        name_by_id[rid] = chunk.get("candidate_name", "Unknown")

    for chunk in retrieved_chunks:
        rid = chunk["resume_id"]
        vector_by_id[rid].append(chunk["score"])

    results = []
    for resume_id, r_scores in reranker_by_id.items():
        avg_reranker = sum(r_scores) / len(r_scores)
        v_scores = vector_by_id.get(resume_id, [0.0])
        avg_vector = sum(v_scores) / len(v_scores)

        meta = candidate_metadata.get(resume_id, {})
        rule_score = _compute_rule_score(meta, jd_text)

        final = (
            WEIGHT_RERANKER * avg_reranker
            + WEIGHT_VECTOR   * avg_vector
            + WEIGHT_RULES    * rule_score
        )

        results.append({
            "resume_id": resume_id,
            "candidate_name": name_by_id.get(resume_id, "Unknown"),
            "final_score": round(min(final, 1.0), 4),
            "vector_score": round(avg_vector, 4),
            "reranker_score": round(avg_reranker, 4),
            "rule_score": round(rule_score, 4),
        })

    return sorted(results, key=lambda x: x["final_score"], reverse=True)


def _compute_rule_score(metadata: dict, jd_text: str) -> float:
    """
    Rule-based bonus (0.0 – 1.0) based on hard heuristics.
    60% weight for skill overlap, 40% for years of experience.
    """
    jd_lower = jd_text.lower()

    # ── Skill overlap bonus (up to 0.6) ──────────────────────────────────
    candidate_skills = {s.lower() for s in metadata.get("skills", [])}
    jd_hits = sum(1 for skill in candidate_skills if skill in jd_lower)
    skill_bonus = min(jd_hits / 5.0, 1.0) * 0.6

    # ── Years of experience bonus (up to 0.4) ────────────────────────────
    jd_exp = re.search(r"(\d+)\+?\s*years?", jd_lower)
    required_years = int(jd_exp.group(1)) if jd_exp else 0
    candidate_years = metadata.get("years_experience", 0)
    if required_years == 0:
        exp_bonus = 0.4
    elif candidate_years >= required_years:
        exp_bonus = 0.4
    else:
        exp_bonus = (candidate_years / required_years) * 0.4

    return min(skill_bonus + exp_bonus, 1.0)
