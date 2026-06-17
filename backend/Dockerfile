# ── Stage 1: Builder ──────────────────────────────────────────────────────────
# Use official Python 3.11 slim image as the base
FROM python:3.11-slim AS builder

# Set environment variables to prevent Python from writing .pyc files
# and to ensure stdout/stderr are unbuffered (important for logs)
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Install system dependencies needed to compile some Python packages
# (psycopg2 needs libpq, pdfminer needs libgomp for torch)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set the working directory inside the container
WORKDIR /app

# Copy only requirements first (Docker caches this layer — speeds up rebuilds)
COPY requirements.txt .

# Install all Python dependencies
RUN pip install --upgrade pip && \
    pip install -r requirements.txt

# Download the spaCy English language model (needed for NLP parsing)
RUN python -m spacy download en_core_web_sm

# ── Stage 2: Runtime ───────────────────────────────────────────────────────────
FROM python:3.11-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Install only runtime system libraries (no build tools)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy installed packages from the builder stage (keeps image smaller)
COPY --from=builder /usr/local/lib/python3.11 /usr/local/lib/python3.11
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy application source code
COPY . .

# Create the uploads directory (where PDFs will be stored)
RUN mkdir -p uploads

# Expose the port FastAPI will run on
EXPOSE 8000

# Health check — Docker will ping this to know if the container is healthy
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8000/ || exit 1

# Startup command:
# 1. Initialize the database tables (init_db.py)
# 2. Start the FastAPI server with uvicorn
CMD ["sh", "-c", "python init_db.py && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
