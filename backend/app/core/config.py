from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # ── PostgreSQL ──────────────────────────────────────────────────────────
    POSTGRES_USER: str = "screener_user"
    POSTGRES_PASSWORD: str = "password"
    POSTGRES_DB: str = "resume_screener"
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432

    @property
    def DATABASE_URL(self) -> str:
        import urllib.parse
        encoded_password = urllib.parse.quote_plus(self.POSTGRES_PASSWORD)
        return (
            f"postgresql://{self.POSTGRES_USER}:{encoded_password}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    # ── Qdrant Vector DB ────────────────────────────────────────────────────
    QDRANT_USE_MEMORY: bool = True        # True = in-memory (local dev, no install)
    QDRANT_HOST: str = "localhost"
    QDRANT_PORT: int = 6333
    QDRANT_COLLECTION: str = "resume_chunks"

    # ── Groq LLM ────────────────────────────────────────────────────────────
    GROQ_API_KEY: str
    GROQ_MODEL: str = "llama-3.3-70b-versatile"

    # ── Vision LLM (image / portal-screenshot parsing) ──────────────────
    # Set USE_VISION_FOR_IMAGES=false to fall back to OCR-only for all images.
    # GROQ_VISION_MODEL must be a Groq model that supports image inputs.
    USE_VISION_FOR_IMAGES: bool = True
    GROQ_VISION_MODEL: str = "meta-llama/llama-4-scout-17b-16e-instruct"

    # ── HuggingFace Models ──────────────────────────────────────────────────
    # LOCAL DEV  (default): bge-base-en-v1.5  + bge-reranker-base   (~400 MB, EMBED_DIM=768)
    # PRODUCTION (optional): bge-large-en-v1.5 + bge-reranker-large (~2.4 GB, EMBED_DIM=1024)
    # Override via .env — see .env.example for the large-model configuration.
    EMBED_MODEL: str = "BAAI/bge-base-en-v1.5"
    RERANKER_MODEL: str = "BAAI/bge-reranker-base"
    EMBED_DIM: int = 768

    # ── Local File Storage ──────────────────────────────────────────────────
    UPLOAD_DIR: str = "uploads"

    # ── Tesseract OCR (for image resumes / JD uploads) ────────────────────
    # Linux/Docker: leave empty — tesseract binary is on PATH automatically
    # Windows local dev: set to full path of tesseract.exe
    #   e.g.  C:\Program Files\Tesseract-OCR\tesseract.exe
    TESSERACT_CMD: str = ""

    class Config:
        env_file = ".env"


settings = Settings()
