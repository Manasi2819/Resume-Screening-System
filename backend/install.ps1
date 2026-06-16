# ─── install.ps1 ─────────────────────────────────────────────────────────────
# Safe install script for Windows (Python 3.11+).
# Installs dependencies in the correct order to avoid source-build failures
# for heavy ML libraries (torch, spacy, sentence-transformers).
#
# Usage: .\install.ps1  (run from inside backend/ with venv activated)
# ─────────────────────────────────────────────────────────────────────────────

$ErrorActionPreference = "Stop"

Write-Host "==> Upgrading pip..." -ForegroundColor Cyan
.\venv\Scripts\python.exe -m pip install --upgrade pip

Write-Host ""
Write-Host "==> Step 1: Install numpy (binary wheel only)..." -ForegroundColor Cyan
.\venv\Scripts\pip install --only-binary=:all: "numpy>=2.0.0"

Write-Host ""
Write-Host "==> Step 2: Install torch (binary wheel only, ~2GB)..." -ForegroundColor Cyan
.\venv\Scripts\pip install --only-binary=:all: "torch==2.6.0"

Write-Host ""
Write-Host "==> Step 3: Install spacy (binary wheel only)..." -ForegroundColor Cyan
.\venv\Scripts\pip install --only-binary=:all: "spacy==3.8.7"

Write-Host ""
Write-Host "==> Step 4: Install sentence-transformers + langchain-huggingface..." -ForegroundColor Cyan
.\venv\Scripts\pip install --only-binary=:all: "sentence-transformers==3.3.1" "langchain-huggingface==0.1.2"

Write-Host ""
Write-Host "==> Step 5: Install remaining packages from requirements.txt..." -ForegroundColor Cyan
.\venv\Scripts\pip install `
    --only-binary=psycopg2-binary `
    "fastapi==0.111.0" `
    "uvicorn[standard]==0.29.0" `
    "pydantic>=2.7.1" `
    "pydantic-settings>=2.2.1" `
    "python-multipart==0.0.9" `
    "python-dotenv==1.0.1" `
    "aiofiles==23.2.1" `
    "sqlalchemy>=2.0.36" `
    "psycopg2-binary==2.9.10" `
    "alembic==1.13.1" `
    "pdfplumber==0.11.0" `
    "Pillow==10.4.0" `
    "pdfminer.six==20231228" `
    "langchain>=0.3.20,<0.4.0" `
    "langchain-community>=0.3.19,<0.4.0" `
    "langchain-groq>=0.2.0,<0.3.0" `
    "langchain-qdrant>=0.2.0,<0.3.0" `
    "qdrant-client>=1.9.0" `
    "httpx==0.28.1"

Write-Host ""
Write-Host "==> All packages installed successfully!" -ForegroundColor Green
Write-Host "==> Now run: python -m spacy download en_core_web_sm" -ForegroundColor Yellow
