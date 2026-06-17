# AI-Powered Resume Screening System

> Automated candidate ranking using Retrieval-Augmented Generation (RAG). Upload resumes + a Job Description and get an evidence-grounded ranked shortlist in seconds.

[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?style=flat&logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=flat&logo=react)](https://react.dev)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat&logo=docker)](https://docs.docker.com/compose)
[![Python](https://img.shields.io/badge/Python-3.11-3776AB?style=flat&logo=python)](https://python.org)

---

## Overview

This system automates the candidate shortlisting phase of technical hiring. Given 1–20 candidate PDF resumes and a Job Description, it returns a ranked list with AI-generated fit/gap explanations — grounded in direct evidence from the resumes, not hallucinated summaries.

**How it works:**
1. Resumes are parsed into section-aware chunks (Skills, Experience, Education, etc.)
2. Chunks are embedded into 768-dim vectors and stored in Qdrant
3. A two-stage retrieval (ANN search → cross-encoder reranking) finds the most relevant content per candidate
4. A weighted scoring formula produces a final match score
5. Groq LLaMA-3.3-70B generates concise fit/gap explanations anchored to retrieved evidence

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite, Tailwind CSS, Nginx |
| **Backend** | FastAPI, Python 3.11, Uvicorn |
| **AI / NLP** | BGE Embeddings (HuggingFace), BGE Cross-Encoder Reranker, spaCy |
| **LLM** | Groq (LLaMA-3.3-70B) via LangChain |
| **Vector DB** | Qdrant |
| **Database** | PostgreSQL 16 |
| **Containerization** | Docker, Docker Compose |

---

## Quick Start — Docker (Recommended)

Run the entire application with a single command. No Python, Node.js, or database installation needed.

**1. Clone the repository**
```bash
git clone https://github.com/Manasi2819/Resume-Screening-System.git
cd Resume-Screening-System
```

**2. Configure environment**
```bash
copy backend\.env.example backend\.env
```
Open `backend\.env` and set your Groq API key:
```env
GROQ_API_KEY=gsk_your_key_here
```
> All other values have sensible defaults — PostgreSQL and Qdrant are fully managed by Docker.

**3. Start all services**
```bash
docker-compose up --build
```
> ⏳ First run takes 5–15 minutes (downloads base images and ~400 MB AI models). Subsequent starts take ~30 seconds.

**4. Open the app**

| Service | URL |
|---|---|
| **Application UI** | http://localhost:3000 |
| **API Docs (Swagger)** | http://localhost:8000/docs |
| **Qdrant Dashboard** | http://localhost:6333/dashboard |

**5. Stop**
```bash
docker-compose down        # stops containers, preserves data
docker-compose down -v     # stops containers and deletes all data
```

---

## Local Development Setup

Use this if you want to run services individually for active development.

### Requirements

| Tool | Version | Download |
|---|---|---|
| Python | 3.11+ | https://python.org/downloads |
| Node.js | 20+ | https://nodejs.org |
| PostgreSQL | 16 | https://www.postgresql.org/download/windows |

### 1. Get a Groq API Key
Sign up at [console.groq.com](https://console.groq.com) → API Keys → Create API Key (free).

### 2. Set up PostgreSQL
```sql
CREATE USER screener_user WITH PASSWORD 'your_password';
CREATE DATABASE resume_screener OWNER screener_user;
GRANT ALL PRIVILEGES ON DATABASE resume_screener TO screener_user;
```

### 3. Set up the Backend
```bash
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
python -m spacy download en_core_web_sm
```
> **Windows note:** If you get build errors for `torch` or `spacy`, run `.\install.ps1` instead of pip install.

### 4. Configure Environment
```bash
copy .env.example .env
```

### 5. Initialize Database & Start Backend
```bash
python init_db.py
uvicorn app.main:app --reload --port 8000
```

### 6. Start Frontend
```bash
cd ../frontend
npm install
npm run dev
```
App runs at: **http://localhost:5173**

---

## Usage

1. **Upload Resumes** — Drag and drop 1–20 PDF files into the upload zone
2. **Add Job Description** — Paste text or upload a JD PDF
3. **Run Screening** — Click "Run AI Screening" (~15–20 seconds)
4. **View Results** — Candidates ranked by score with AI fit/gap summaries
5. **Explore Evidence** — Click "View Evidence" to see the exact resume excerpts that drove the score
6. **Export** — Download as CSV or print individual scorecards
7. **History** — Reload any past screening session from the sidebar

---

## Project Structure

```
Resume-Screening-System/
├── docker-compose.yml              ← Starts all 4 services
├── backend/
│   ├── Dockerfile
│   ├── .dockerignore
│   ├── requirements.txt
│   ├── .env.example
│   ├── init_db.py                  ← Creates PostgreSQL tables
│   └── app/
│       ├── main.py                 ← FastAPI entry point
│       ├── core/
│       │   ├── config.py           ← Settings (Pydantic)
│       │   └── database.py         ← SQLAlchemy engine
│       ├── models/orm.py           ← DB table definitions
│       ├── api/
│       │   ├── routes.py           ← API endpoints
│       │   └── schemas.py          ← Response schemas
│       └── services/
│           ├── pipeline.py         ← End-to-end orchestrator
│           ├── parser.py           ← PDF parsing + section chunking
│           ├── embedder.py         ← BGE embeddings (LangChain)
│           ├── retriever.py        ← Qdrant vector store (LangChain)
│           ├── reranker.py         ← Cross-encoder reranking
│           ├── scorer.py           ← Weighted scoring formula
│           ├── explainer.py        ← LLM fit/gap explanation (LangChain + Groq)
│           └── storage.py          ← PDF file storage
└── frontend/
    ├── Dockerfile
    ├── nginx.conf
    ├── .dockerignore
    └── src/
        ├── App.jsx                 ← Root component + state management
        ├── api/client.js           ← Axios API wrapper
        └── components/
            ├── Sidebar.jsx
            ├── UploadPanel.jsx
            ├── JDPanel.jsx
            ├── RankedResults.jsx
            ├── CandidateCard.jsx
            ├── CandidateDetail.jsx ← Evidence view + score breakdown
            ├── HistoryPanel.jsx
            └── PrintSection.jsx
```

---

## Scoring Formula

```
Final Score = (0.45 × Reranker Score) + (0.40 × Vector Score) + (0.15 × Rule Bonus)
```

| Signal | Weight | How it works |
|---|---|---|
| **Reranker** | 45% | BGE cross-encoder reads JD + chunk together — most accurate |
| **Vector** | 40% | Cosine similarity from Qdrant ANN search — semantic recall |
| **Rule Bonus** | 15% | Skill keyword overlap + years-of-experience match |

---

## Documentation

- [`TECHNICAL_REPORT.md`](./TECHNICAL_REPORT.md) — Full architecture, pipeline design, and engineering decisions