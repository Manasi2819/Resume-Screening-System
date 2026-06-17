# Technical Report — AI-Powered Resume Screening System

**Version:** 1.1.0  
**Date:** 17 th June 2026  
**Stack:** FastAPI · BGE Embeddings · Qdrant · LangChain · Groq (LLaMA-3.3-70B) · React · Vite · PostgreSQL · Docker

---

## 1. Executive Summary

This system automates the candidate shortlisting phase of technical hiring using **Retrieval-Augmented Generation (RAG)**. Given 1–20 candidate PDF resumes and a Job Description (JD), it returns a ranked list of candidates with AI-generated fit/gap explanations grounded in direct evidence from their resumes — not hallucinated summaries.

**Key design choices:**
- Semantic search over resume sections (not full-document keyword matching)
- Three-signal weighted scoring (vector similarity + cross-encoder reranking + rule heuristics)
- LLM explanations anchored to retrieved evidence chunks, not raw text
- All models run locally or via free-tier API (zero cost per screening)

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│              Docker Compose (docker-compose.yml)                         │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ frontend container (Nginx + React build)  :3000                    │ │
│  │  Browser → Nginx → proxies /api, /uploads to backend               │ │
│  └───────────────────────────┬────────────────────────────────────────┘ │
│                              │ HTTP                                      │
│  ┌───────────────────────────▼────────────────────────────────────────┐ │
│  │ backend container (FastAPI + Uvicorn)  :8000                       │ │
│  │                                                                    │ │
│  │  ┌──────────┐   ┌──────────────────────────────────────────────┐  │ │
│  │  │ API Layer│──▶│          Pipeline Orchestrator                │  │ │
│  │  │routes.py │   │  parser → embedder → retriever → reranker    │  │ │
│  │  └──────────┘   │         → scorer  → explainer                │  │ │
│  │                 └──────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                              │                                           │
│          ┌───────────────────┴───────────────────┐                      │
│          │                                       │                      │
│  ┌───────▼──────┐                      ┌────────▼──────┐               │
│  │  postgres    │                      │    qdrant     │               │
│  │  container   │                      │   container   │               │
│  │  :5432       │                      │   :6333       │               │
│  └──────────────┘                      └───────────────┘               │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Pipeline — Step-by-Step

### Step 1: PDF Parsing (`parser.py`)

**Why custom — not LangChain's PDF loader:**  
LangChain's `PyPDFLoader` and `UnstructuredPDFLoader` split text every N characters. Resumes require *semantic* splitting — the Skills section must be retrieved as a unit, not split mid-entry.

**What it does:**
1. `pdfplumber` extracts raw text page-by-page
2. `heal_split_headers()` — fixes PDF layout bugs where headers are split into individual characters on separate lines (drop-cap artifacts)
3. `chunk_by_sections()` — detects 6 section types (summary, skills, experience, education, projects, certifications) and creates labelled chunks
4. `extract_metadata()` — heuristic + spaCy NER to extract: name, email, phone, years of experience, skills list

**Fallbacks at every level:**
- If spaCy NER fails → first-line heuristic
- If no sections detected → treat whole text as one "experience" chunk
- If PDF unreadable → `ValueError` propagated to API as HTTP 400

---

### Step 2: Embedding + Vector Storage (`embedder.py` + `retriever.py`)

**Model:** `BAAI/bge-base-en-v1.5` (local dev) / `BAAI/bge-large-en-v1.5` (production)

**Why BGE over OpenAI embeddings:**
- Free — no API cost per embedding call
- Runs offline — no network dependency
- BGE models are trained specifically for retrieval tasks (BEIR benchmark top performer)
- `bge-large` outperforms `text-embedding-ada-002` on most retrieval benchmarks

**Storage:** LangChain `QdrantVectorStore` wrapping `qdrant_client`
- **Local dev:** In-memory mode (`QDRANT_USE_MEMORY=true`) — no installation, resets on restart
- **Docker / production:** Persistent Qdrant server container (`QDRANT_USE_MEMORY=false`) — vectors survive restarts
- Each chunk stored with metadata: `resume_id`, `job_id`, `candidate_name`, `section`
- Filtered search by `job_id` so results from different screenings don't mix

**Embedding dimension:** 768 (base) / 1024 (large)  
**Distance metric:** Cosine similarity

---

### Step 3: Retrieval (`retriever.py`)

JD text is embedded using `embed_query()` (BGE requires a query instruction prefix for queries, which LangChain handles automatically).

Top-30 chunks are retrieved via Qdrant ANN (Approximate Nearest Neighbor) search, filtered to the current `job_id`. This gives broad recall before precise reranking.

---

### Step 4: Cross-Encoder Reranking (`reranker.py`)

**Why reranking:**  
Vector similarity compares pre-computed embeddings independently. A cross-encoder reads **both texts together** and scores their relevance jointly — much more accurate but too slow to run on all documents (hence the two-stage approach: ANN for broad recall → cross-encoder for precise scoring).

**Model:** `BAAI/bge-reranker-base` (local dev) / `BAAI/bge-reranker-large` (production)

**Implementation:**
- `sentence_transformers.CrossEncoder` runs inference on each (JD, chunk) pair
- Raw logit scores mapped to [0, 1] via sigmoid normalization
- Chunks sorted by reranker score descending

---

### Step 5: Weighted Scoring (`scorer.py`)

Each candidate's chunks are aggregated into a single final score:

```
Final Score = (0.45 × Reranker Score) + (0.40 × Vector Score) + (0.15 × Rule Bonus)
```

| Signal | Weight | Description |
|---|---|---|
| **Reranker Score** | 45% | Average cross-encoder score across candidate's top chunks — most accurate signal |
| **Vector Score** | 40% | Average cosine similarity from Qdrant ANN — semantic recall |
| **Rule Bonus** | 15% | Skill keyword overlap with JD (up to 0.6) + years-of-experience match (up to 0.4) |

**Weight rationale:**  
- Reranker gets highest weight because it reads JD and resume together (full context)
- Vector gets second-highest because it measures semantic alignment even when keywords differ
- Rule bonus is a tiebreaker — useful when two candidates have similar semantic scores but one exactly matches the required tech stack

**Score capped at 1.0.** Candidates sorted by `final_score` descending.

---

### Step 6: LLM Explanation (`explainer.py`)

**Model:** Groq `llama-3.3-70b-versatile` (free API, ~150 tokens/sec)

**Why Groq over OpenAI:**
- Free tier is generous (14,400 requests/day)
- LLaMA-3.3-70B quality is comparable to GPT-4o for structured JSON output tasks
- Latency: ~0.5-1s per explanation vs ~2-3s for GPT-4o

**LangChain chain:**  
`ChatPromptTemplate → ChatGroq → JsonOutputParser`

The LLM is given:
- First 800 characters of the JD
- Candidate name
- Top 3 evidence chunks (up to 1,500 chars total) — **grounded** generation, not hallucination

Output: `{"fit": "...", "gap": "..."}` — one sentence each, always parseable JSON.

**Fallback:** On any exception (network, parse error, rate limit), returns a graceful fallback string rather than crashing the pipeline.

---

### Step 7: Persistence (`orm.py` + database)

Three PostgreSQL tables:

| Table | Purpose |
|---|---|
| `jobs` | One row per screening session — stores JD text and status |
| `candidates` | One row per uploaded resume — stores name, email, file path, raw text, metadata JSON |
| `screenings` | One row per candidate-per-job — stores all scores, explanation, evidence chunks |

**Why PostgreSQL over SQLite:**
- Persistent across server restarts (unlike Qdrant in-memory mode)
- UUID primary keys supported natively
- JSON column for flexible metadata storage
- Ready for production deployment without migration

---

## 4. Technology Versions

| Component | Library | Version |
|---|---|---|
| API Framework | FastAPI | 0.111.0 |
| ASGI Server | Uvicorn | 0.29.0 |
| Validation | Pydantic | ≥2.7.1 |
| ORM | SQLAlchemy | ≥2.0.36 |
| DB Driver | psycopg2-binary | 2.9.10 |
| PDF Parsing | pdfplumber | 0.11.0 |
| NLP | spaCy | 3.8.7 |
| Embeddings | LangChain HuggingFace | 0.1.2 |
| Reranker | sentence-transformers | 3.3.1 |
| Deep Learning | PyTorch | 2.6.0 |
| Vector DB | qdrant-client | ≥1.9.0 |
| LangChain Core | langchain | ≥0.3.20 |
| LLM API | langchain-groq | ≥0.2.0 |
| Frontend | React | 18.3.1 |
| Build Tool | Vite | 5.2.13 |
| Styling | Tailwind CSS | 3.4.4 |
| HTTP Client | Axios | 1.7.2 |
| Web Server | Nginx | 1.27 (Alpine) |
| Containerization | Docker Compose | v2 |

---

## 5. Performance Characteristics

| Phase | First Run | Subsequent Runs |
|---|---|---|
| Model loading (BGE base) | 30–60 seconds | Instant (cached in memory) |
| Parsing 10 resumes | ~2 seconds | ~2 seconds |
| Embedding + Qdrant upsert | ~5 seconds | ~5 seconds |
| ANN search | <1 second | <1 second |
| Cross-encoder reranking (30 chunks) | ~3-5 seconds | ~3-5 seconds |
| LLM explanations (10 candidates) | ~5-10 seconds | ~5-10 seconds |
| **Total (10 resumes, warm)** | **~15-20 seconds** | **~15-20 seconds** |

**Memory usage:**
- BGE-base: ~600 MB RAM
- BGE-base + reranker-base: ~900 MB RAM
- Qdrant in-memory: negligible for <100 resumes

---

## 6. Data Flow Diagram

```
PDF bytes (upload)
     │
     ▼
┌─────────────┐
│  pdfplumber  │  ──► raw text
└─────────────┘
     │
     ▼
┌──────────────────┐
│  Section Chunker  │  ──► [{section, text}, ...]
└──────────────────┘
     │                         ┌──────────────────┐
     ├────────────────────────▶│ Metadata Extractor│ ──► {name, email, phone, skills, years}
     │                         └──────────────────┘
     ▼
┌──────────────┐
│  BGE Embedder │  ──► 768-dim vectors
└──────────────┘
     │
     ▼
┌──────────────┐
│  Qdrant Store │  ◀── filtered ANN search ◀── JD embedding
└──────────────┘
     │
     │  top-30 chunks
     ▼
┌──────────────────┐
│ Cross-Encoder     │  ──► reranker_score per chunk
│ (BGE Reranker)   │
└──────────────────┘
     │
     ▼
┌──────────────┐
│  Scorer       │  ──► final_score per candidate (ranked list)
└──────────────┘
     │
     ▼
┌──────────────┐
│  Groq LLM     │  ──► {fit, gap} per candidate
└──────────────┘
     │
     ▼
┌──────────────┐
│  PostgreSQL   │  ──► persisted screenings
└──────────────┘
     │
     ▼
  JSON API response → React UI
```

---

## 7. Known Limitations

| Limitation | Impact | Mitigation |
|---|---|---|
| Qdrant in-memory resets on restart | Past screening vectors lost | Set `QDRANT_USE_MEMORY=false` + Qdrant server for production |
| spaCy NER name extraction not 100% accurate | Occasional "Unknown" candidate names | Heuristic fallback + first-line fallback handles most cases |
| PDF parsing quality depends on PDF type | Image-only PDFs return empty text | pdfplumber handles text-based PDFs; OCR not implemented |
| No authentication on API | Anyone can submit resumes if port exposed | Acceptable for local dev; add API key middleware for production |
| Cross-encoder runs on CPU | Reranking is the slowest step (~3-5s) | GPU acceleration available via `device="cuda"` in CrossEncoder |
| Groq rate limit (free tier) | 14,400 req/day limit | Cache explanations in DB; well within limit for normal use |

---

## 8. Security Considerations

| Item | Current State | Production Recommendation |
|---|---|---|
| `.env` secrets | `.gitignore` + `.dockerignore` protect from commit | Use environment variables or secrets manager (Vault, AWS SSM) |
| Uploaded files | Stored in Docker volume with UUID prefix | Move to S3/GCS with signed URLs |
| CORS origins | Whitelisted to `localhost:5173`, `localhost:3000` | Update to production domain |
| SQL injection | SQLAlchemy ORM parameterizes all queries | ✅ Safe |
| File type validation | `.pdf` extension check + pdfplumber error handling | Add MIME type validation for stricter enforcement |
| API authentication | None (local dev) | Add API key header or OAuth2 |
| Docker image secrets | Secrets passed via env vars, not baked into image | ✅ Correct — `.env` excluded via `.dockerignore` |

---

## 9. Roadmap

### Phase 2 — Production Hardening ✅ Complete
- [x] Docker Compose orchestrating FastAPI + PostgreSQL + Qdrant + Nginx
- [x] Persistent Qdrant server container (`QDRANT_USE_MEMORY=false` in Docker)
- [x] Named Docker volumes for data persistence (DB, vectors, uploads, model cache)
- [x] Multi-stage Dockerfiles (builder + runtime) for minimal image size
- [x] Health checks + startup ordering (postgres → qdrant → backend → frontend)
- [ ] Move uploaded PDFs to S3-compatible storage (MinIO or AWS S3)
- [ ] Add API key authentication middleware
- [ ] Add Alembic migrations for DB schema versioning

### Phase 3 — Feature Expansion
- [ ] OCR support for image-based PDFs (Tesseract / AWS Textract)
- [ ] Batch processing mode (async queue with Celery + Redis)
- [ ] Export to ATS systems (Greenhouse, Lever API integration)
- [ ] Configurable scoring weights per JD type (technical vs. managerial)
- [ ] Candidate comparison view (side-by-side skills matrix)

### Phase 4 — Scale
- [ ] GPU inference for cross-encoder (10× speedup)
- [ ] Cloud deployment (Railway / Render / AWS ECS)
- [ ] Persistent Qdrant with collection-per-client isolation
- [ ] Multi-tenant support with organization accounts
