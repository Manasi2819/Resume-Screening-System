"""
Local file storage — saves uploaded PDFs to a local `uploads/` directory.
Replaces MinIO for local development. Will be swapped for MinIO/S3 on production.
"""
import os
import uuid
from pathlib import Path
from app.core.config import settings


def _ensure_upload_dir() -> Path:
    """Create the uploads directory if it doesn't exist."""
    upload_path = Path(settings.UPLOAD_DIR)
    upload_path.mkdir(parents=True, exist_ok=True)
    return upload_path


def save_pdf(file_bytes: bytes, original_filename: str) -> str:
    """
    Save a PDF to the local uploads directory.
    Returns the full path to the saved file.
    """
    upload_dir = _ensure_upload_dir()
    # Unique filename to avoid collisions
    unique_name = f"{uuid.uuid4().hex}_{original_filename}"
    file_path = upload_dir / unique_name
    file_path.write_bytes(file_bytes)
    return str(file_path)


def read_pdf(file_path: str) -> bytes:
    """Read a previously saved PDF from disk.
    NOTE: Reserved for future use (e.g., re-parsing stored PDFs on demand).
    """
    return Path(file_path).read_bytes()
