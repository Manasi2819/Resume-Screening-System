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

    Internal split (within the 15% Rule Bonus component of the final score):
      - Skill keyword overlap with JD  → up to 0.3  (30%)
      - Years of experience match      → up to 0.7  (70%)

    Experience gate: candidates with < 1 year of experience receive 0.0
    for the experience component regardless of the JD requirement.
    """
    jd_lower = jd_text.lower()

    # ── Skill keyword overlap (up to 0.3) ────────────────────────────────
    candidate_skills = {s.lower() for s in metadata.get("skills", [])}
    jd_hits = sum(1 for skill in candidate_skills if skill in jd_lower)
    skill_bonus = min(jd_hits / 5.0, 1.0) * 0.3

    # ── Years of experience (up to 0.7, gated at ≥ 1 year) ──────────────
    jd_exp = re.search(r"(\d+)\+?\s*years?", jd_lower)
    required_years = int(jd_exp.group(1)) if jd_exp else 0
    candidate_years = metadata.get("years_experience", 0)

    if candidate_years < 1:
        # Hard gate: less than 1 year of experience earns no experience score
        exp_bonus = 0.0
    elif required_years == 0:
        # JD doesn't specify years — full experience bonus for any qualified candidate
        exp_bonus = 0.7
    elif candidate_years >= required_years:
        exp_bonus = 0.7
    else:
        exp_bonus = (candidate_years / required_years) * 0.7

    return min(skill_bonus + exp_bonus, 1.0)

