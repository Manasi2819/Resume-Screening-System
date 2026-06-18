import os
import uuid
from pathlib import Path

from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.orm import Job, Candidate, Screening
from app.services.pipeline import run_pipeline
from app.services.parser import extract_text, RESUME_ALLOWED_EXTS, JD_ALLOWED_EXTS

router = APIRouter()

# ── Allowed extensions (defined in parser.py, imported here for HTTP validation)
_RESUME_EXT_DISPLAY = "PDF, DOCX, PNG, JPG, JPEG, WEBP"
_JD_EXT_DISPLAY     = "PDF, DOCX, TXT, PNG, JPG, JPEG, WEBP"


@router.post("/screen")
async def screen_resumes(
    jd_text: str = Form(default=""),
    jd_file: UploadFile = File(default=None),   # JD as any supported file type
    resumes: list[UploadFile] = File(...),
    db: Session = Depends(get_db),
):
    """
    Main screening endpoint.
    Accepts multipart/form-data:
      - jd_text : pasted JD text (optional if jd_file provided)
      - jd_file : JD as PDF / DOCX / TXT / image (optional if jd_text provided)
      - resumes : list of candidate files — PDF / DOCX / image (1–20 files)
    """
    # ── Resolve JD text ───────────────────────────────────────────────────────
    final_jd_text = jd_text.strip()

    if not final_jd_text and jd_file is not None:
        jd_ext = Path(jd_file.filename or "").suffix.lower()

        # Reject .doc early with a clear message
        if jd_ext == ".doc":
            raise HTTPException(
                400,
                f"'{jd_file.filename}' — .doc files are not supported for Job Descriptions. "
                "Please open the file in Word, save it as .docx, and re-upload."
            )

        if jd_ext not in JD_ALLOWED_EXTS:
            raise HTTPException(
                400,
                f"'{jd_file.filename}' is not a supported format for the Job Description. "
                f"Accepted: {_JD_EXT_DISPLAY}."
            )

        jd_bytes = await jd_file.read()
        try:
            final_jd_text = extract_text(jd_bytes, jd_file.filename)
        except ValueError as e:
            raise HTTPException(400, f"Could not read JD file: {e}")
        except Exception as e:
            raise HTTPException(400, f"Unexpected error reading JD file: {e}")

    if not final_jd_text or len(final_jd_text) < 50:
        raise HTTPException(
            400,
            "Job description is too short. Paste text or upload a JD file (min 50 chars)."
        )

    # ── Validate resumes ──────────────────────────────────────────────────────
    if not resumes:
        raise HTTPException(400, "Upload at least one resume file.")
    if len(resumes) > 20:
        raise HTTPException(400, "Maximum 20 resume files per submission.")

    resume_files = []
    for upload in resumes:
        ext = Path(upload.filename or "").suffix.lower()

        # Reject .doc with a specific, actionable message
        if ext == ".doc":
            raise HTTPException(
                400,
                f"'{upload.filename}' — .doc files are not supported for resumes. "
                "Please open the file in Word, choose 'Save As', select .docx format, "
                "and re-upload."
            )

        # Reject .txt for resumes (only allowed for JD)
        if ext == ".txt":
            raise HTTPException(
                400,
                f"'{upload.filename}' — .txt files are not accepted for resumes. "
                f"Accepted resume formats: {_RESUME_EXT_DISPLAY}."
            )

        if ext not in RESUME_ALLOWED_EXTS:
            raise HTTPException(
                400,
                f"'{upload.filename}' is not a supported format for resumes. "
                f"Accepted: {_RESUME_EXT_DISPLAY}."
            )

        file_bytes = await upload.read()
        resume_files.append({"filename": upload.filename, "bytes": file_bytes})

    # ── Create job record ─────────────────────────────────────────────────────
    job = Job(id=uuid.uuid4(), jd_text=final_jd_text, status="processing")
    db.add(job)
    db.commit()

    # ── Run pipeline ──────────────────────────────────────────────────────────
    try:
        results = run_pipeline(
            job_id=str(job.id),
            jd_text=final_jd_text,
            resume_files=resume_files,
            db=db,
        )
        job.status = "done"
        db.commit()
        return {"job_id": str(job.id), "status": "done", "jd_text": final_jd_text, "results": results}

    except Exception as e:
        db.rollback()
        job.status = "failed"
        db.commit()
        raise HTTPException(500, f"Screening pipeline failed: {str(e)}")


@router.get("/jobs")
def list_jobs(db: Session = Depends(get_db)):
    """Retrieve all past screening jobs ordered by date."""
    jobs = db.query(Job).order_by(Job.created_at.desc()).all()
    return [
        {
            "id": str(job.id),
            "jd_text": job.jd_text,
            "status": job.status,
            "created_at": f"{job.created_at.isoformat()}Z",
            "candidate_count": len(job.candidates)
        }
        for job in jobs
    ]


@router.get("/jobs/{job_id}/results")
def get_results(job_id: str, db: Session = Depends(get_db)):
    """Retrieve previously computed results by job_id."""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(404, "Job not found.")

    rows = (
        db.query(Screening, Candidate)
        .join(Candidate, Screening.candidate_id == Candidate.id)
        .filter(Screening.job_id == job_id)
        .order_by(Screening.rank)
        .all()
    )

    return {
        "job_id": job_id,
        "status": job.status,
        "jd_text": job.jd_text,
        "results": [
            {
                "rank": s.rank,
                "resume_id": str(s.candidate_id),
                "candidate_name": c.name,
                "candidate_email": c.email,
                "candidate_phone": c.metadata_json.get("phone") if c.metadata_json else None,
                "skills": c.metadata_json.get("skills", []) if c.metadata_json else [],
                "final_score": s.final_score,
                "vector_score": s.vector_score,
                "reranker_score": s.reranker_score,
                "rule_score": s.rule_score,
                "explanation_fit": s.explanation_fit,
                "explanation_gap": s.explanation_gap,
                "evidence_chunks": s.evidence_chunks or [],
            }
            for s, c in rows
        ],
    }


@router.get("/candidates/{candidate_id}")
def get_candidate(candidate_id: str, db: Session = Depends(get_db)):
    """Retrieve detailed candidate information including raw text and file URL."""
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(404, "Candidate not found.")

    filename = os.path.basename(candidate.file_path) if candidate.file_path else None

    return {
        "id": str(candidate.id),
        "job_id": str(candidate.job_id),
        "name": candidate.name,
        "email": candidate.email,
        "raw_text": candidate.raw_text,
        "metadata_json": candidate.metadata_json,
        "file_url": f"/uploads/{filename}" if filename else None,
        # Keep old key for backward compatibility
        "pdf_url": f"/uploads/{filename}" if filename else None,
    }


@router.get("/health")
def health():
    return {"status": "ok", "system": "Resume Screening System"}
