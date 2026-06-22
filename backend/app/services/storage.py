"""
Local file storage — saves uploaded files to a local `uploads/` directory.
Supports PDF, DOCX, image, and text files (any extension).
"""
import re
import uuid
from pathlib import Path
from app.core.config import settings


def _safe_filename(original_filename: str) -> str:
    """
    Sanitize a filename so it is URL-safe:
    - Preserve the file extension exactly
    - Replace spaces and any character that is not alphanumeric, dot, dash,
      or underscore with an underscore in the stem portion
    """
    p = Path(original_filename)
    stem = re.sub(r"[^\w.\-]", "_", p.stem)  # replace unsafe chars in the name
    stem = re.sub(r"_+", "_", stem).strip("_")  # collapse consecutive underscores
    suffix = p.suffix  # keep extension as-is (.pdf, .docx, .png …)
    return f"{stem}{suffix}"


def _ensure_upload_dir() -> Path:
    """Create the uploads directory if it doesn't exist."""
    upload_path = Path(settings.UPLOAD_DIR)
    upload_path.mkdir(parents=True, exist_ok=True)
    return upload_path


def save_file(file_bytes: bytes, original_filename: str) -> str:
    """
    Save any uploaded file to the local uploads directory.
    Returns the full path to the saved file.
    Supports PDF, DOCX, image, and text files.
    """
    upload_dir = _ensure_upload_dir()
    # Sanitize the original filename so URLs never break on spaces/special chars
    safe_name = _safe_filename(original_filename)
    unique_name = f"{uuid.uuid4().hex}_{safe_name}"
    file_path = upload_dir / unique_name
    file_path.write_bytes(file_bytes)
    return str(file_path)


# Backward-compatible alias
def save_pdf(file_bytes: bytes, original_filename: str) -> str:
    """Alias for save_file — kept for backward compatibility."""
    return save_file(file_bytes, original_filename)


def read_file(file_path: str) -> bytes:
    """Read a previously saved file from disk."""
    return Path(file_path).read_bytes()


# Backward-compatible alias
def read_pdf(file_path: str) -> bytes:
    """Alias for read_file — kept for backward compatibility."""
    return read_file(file_path)
