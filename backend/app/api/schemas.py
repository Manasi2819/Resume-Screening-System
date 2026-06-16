"""
Pydantic schemas documenting the shape of API request/response bodies.

NOTE: These schemas are not currently used as FastAPI response_model annotations
(routes return raw dicts for flexibility). They serve as authoritative
documentation of what each endpoint actually returns.
"""
from pydantic import BaseModel
from typing import Optional


class ScreeningResult(BaseModel):
    rank: int
    resume_id: str
    candidate_name: str
    candidate_email: Optional[str] = None
    candidate_phone: Optional[str] = None
    skills: list[str] = []
    final_score: float
    vector_score: float
    reranker_score: float
    rule_score: float
    explanation_fit: str
    explanation_gap: str
    evidence_chunks: list[str]


class ScreenResponse(BaseModel):
    job_id: str
    status: str
    jd_text: str
    results: list[ScreeningResult]


class JobSummary(BaseModel):
    id: str
    jd_text: str
    status: str
    created_at: str
    candidate_count: int


class JobResultsResponse(BaseModel):
    job_id: str
    status: str
    jd_text: str
    results: list[dict]
