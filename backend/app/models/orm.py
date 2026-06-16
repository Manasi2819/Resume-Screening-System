import uuid
from datetime import datetime

from sqlalchemy import Column, String, Float, Integer, DateTime, Text, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class Job(Base):
    """One row per screening session (one JD submission)."""
    __tablename__ = "jobs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    jd_text = Column(Text, nullable=False)
    status = Column(String(20), default="pending")   # pending | processing | done | failed
    created_at = Column(DateTime, default=datetime.utcnow)

    candidates = relationship("Candidate", back_populates="job", cascade="all, delete")
    screenings = relationship("Screening", back_populates="job", cascade="all, delete")


class Candidate(Base):
    """One row per uploaded resume."""
    __tablename__ = "candidates"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_id = Column(UUID(as_uuid=True), ForeignKey("jobs.id"), nullable=False)
    name = Column(String(200), default="Unknown")
    email = Column(String(200), nullable=True)
    file_path = Column(String(500))       # path to saved PDF on disk
    raw_text = Column(Text)               # full extracted text
    metadata_json = Column(JSON)          # {skills, years_exp, phone, ...}
    created_at = Column(DateTime, default=datetime.utcnow)

    job = relationship("Job", back_populates="candidates")
    screening = relationship("Screening", back_populates="candidate", uselist=False)


class Screening(Base):
    """One row per candidate per job — stores final scores and LLM explanation."""
    __tablename__ = "screenings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_id = Column(UUID(as_uuid=True), ForeignKey("jobs.id"), nullable=False)
    candidate_id = Column(UUID(as_uuid=True), ForeignKey("candidates.id"), nullable=False)
    rank = Column(Integer)
    final_score = Column(Float)
    vector_score = Column(Float)
    reranker_score = Column(Float)
    rule_score = Column(Float)
    explanation_fit = Column(Text)
    explanation_gap = Column(Text)
    evidence_chunks = Column(JSON)        # list of matching text snippets
    created_at = Column(DateTime, default=datetime.utcnow)

    job = relationship("Job", back_populates="screenings")
    candidate = relationship("Candidate", back_populates="screening")
