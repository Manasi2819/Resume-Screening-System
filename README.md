# Resume Screening System

An AI-powered resume screening tool using **Retrieval-Augmented Generation (RAG)**.  
Upload 1–20 candidate PDFs + a Job Description → get a ranked list of candidates with AI-generated fit/gap explanations backed by direct evidence from their resumes.

**Tech Stack:** FastAPI · BGE Embeddings · Qdrant · LangChain · Groq (llama-3.3-70b) · React · Vite · PostgreSQL

---

## Quick Overview

```
Resume Screening System/
├── backend/                 ← FastAPI Python backend
├── frontend/                ← React + Vite + Tailwind frontend
├── TECHNICAL_REPORT.md      ← Full architecture & design document
└── PRESENTATION.md          ← Slide-by-slide presentation guide
```

---

## Prerequisites

Before running the system, ensure you have the following installed:

| Tool | Version | Download |
| :--- | :--- | :--- |
| Python | 3.11+ | https://python.org/downloads |
| Node.js | 20+ | https://nodejs.org |
| PostgreSQL | 16 | https://www.postgresql.org/download/windows/ |
| Git | any | https://git-scm.com |

> **Note on BGE models:** On first startup, the backend will automatically download the BGE embedding model and reranker from HuggingFace.  
> - **Local dev (default):** bge-base-en-v1.5 + bge-reranker-base (~400 MB total)  
> - **Production (optional):** bge-large-en-v1.5 + bge-reranker-large (~2.4 GB total) — configure in `.env`

---

## Step 1 — Get a Groq API Key (Free)

1. Go to **https://console.groq.com**
2. Sign up for a free account
3. Click **API Keys** → **Create API Key**
4. Copy the key — you'll need it in Step 4

---

## Step 2 — Set Up PostgreSQL

### On Windows:
1. Download and install PostgreSQL from https://www.postgresql.org/download/windows/
2. During install, set a password for the `postgres` superuser (remember it!)
3. After install, open **SQL Shell (psql)** from the Start menu
4. Run the following commands (replace `your_password` with something secure):

```sql
-- Create a dedicated user for the app
CREATE USER screener_user WITH PASSWORD 'your_password';

-- Create the database
CREATE DATABASE resume_screener OWNER screener_user;

-- Grant all privileges
GRANT ALL PRIVILEGES ON DATABASE resume_screener TO screener_user;

-- Exit
\q
```

---

## Step 3 — Set Up the Backend

Open a terminal and navigate to the `backend/` folder:

```powershell
# Navigate to backend
cd "d:\Resume project\backend"

# Create a Python virtual environment
python -m venv venv

# Activate the virtual environment (Windows)
.\venv\Scripts\activate

# Install all Python dependencies
pip install -r requirements.txt

# Download the spaCy English NLP model
python -m spacy download en_core_web_sm
```

> **Windows only:** If you encounter build errors for `torch` or `spacy`, use the included `install.ps1` script instead of `pip install -r requirements.txt`. It forces binary wheels to avoid compiler dependencies:
> ```powershell
> .\install.ps1
> ```

---

## Step 4 — Configure Environment Variables

```powershell
# Still inside the backend/ folder
# Copy the example .env file
copy .env.example .env
```

Now open `.env` in any text editor and fill in your values:

```env
# PostgreSQL — use the credentials you created in Step 2
POSTGRES_USER=screener_user
POSTGRES_PASSWORD=your_password
POSTGRES_DB=resume_screener
POSTGRES_HOST=localhost
POSTGRES_PORT=5432

# Qdrant — keep this as true for local development (no extra install needed)
QDRANT_USE_MEMORY=true

# Groq — paste your API key from Step 1
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
GROQ_MODEL=llama-3.3-70b-versatile

# Models — LOCAL DEV (default, ~400 MB total download)
EMBED_MODEL=BAAI/bge-base-en-v1.5
RERANKER_MODEL=BAAI/bge-reranker-base
EMBED_DIM=768

# Models — PRODUCTION (optional, ~2.4 GB total, higher accuracy)
# EMBED_MODEL=BAAI/bge-large-en-v1.5
# RERANKER_MODEL=BAAI/bge-reranker-large
# EMBED_DIM=1024

# Local file storage — folder to save uploaded PDFs
UPLOAD_DIR=uploads
```

> **QDRANT_USE_MEMORY=true** means Qdrant runs in-memory inside the Python process — no server or Docker needed. Perfect for local testing. Data resets when the server restarts, which is fine for testing.

---

## Step 5 — Initialize the Database

```powershell
# Make sure you're in backend/ with venv activated
python init_db.py
```

Expected output:
```
Creating PostgreSQL tables...
✓ Tables created: jobs, candidates, screenings
✓ Database ready. You can now start the backend server.
```

---

## Step 6 — Start the Backend Server

```powershell
# Make sure you're in backend/ with venv activated
uvicorn app.main:app --reload --port 8000
```

Expected output:
```
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
```

> **First request will be slow** (30–60 seconds) as the BGE models are downloaded and loaded into memory. After that, all subsequent requests are fast.

You can verify the backend is working by visiting: **http://localhost:8000/docs** (Swagger UI)

---

## Step 7 — Set Up and Start the Frontend

Open a **new terminal window** (keep the backend running):

```powershell
# Navigate to the frontend folder
cd "d:\Resume project\frontend"

# Install Node.js dependencies
npm install

# Start the Vite development server
npm run dev
```

Expected output:
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: ...
```

Open your browser and go to: **http://localhost:5173**

---

## How to Use the System

1. **Upload Resumes**: Drag and drop 1–20 PDF resumes into the upload zone on the left.
2. **Provide Job Description**: Either:
   - Click **"Paste Text"** tab and paste the JD text directly, OR
   - Click **"Upload PDF"** tab and upload a JD PDF file
3. **Click "Run AI Screening"**: The button activates once both resumes and JD are provided.
4. **Wait ~30–60 seconds** on first run (model loading). Subsequent runs take ~15–20 seconds.
5. **View Results**: Candidates are ranked by AI match score. Click **"View Evidence"** on any card to see the RAG evidence chunks that drove the score.
6. **Export or Print**: Use "Export CSV" to download the ranked table or "Print" for individual scorecards.
7. **History**: Click the History icon in the sidebar to reload any previous screening session.

---

## Running Both Servers Simultaneously

You need **two terminal windows** open at the same time:

| Terminal | Command | URL |
| :--- | :--- | :--- |
| Terminal 1 (Backend) | `uvicorn app.main:app --reload` | http://localhost:8000 |
| Terminal 2 (Frontend) | `npm run dev` | http://localhost:5173 |

---

## Troubleshooting

### ❌ `ModuleNotFoundError: No module named 'app'`
Make sure you are running uvicorn from **inside the `backend/` folder** with the venv activated.

### ❌ `psycopg2.OperationalError: connection refused`
PostgreSQL is not running. Start it:
- Windows: Open **Services** (Win+R → services.msc) → Find **postgresql-x64-16** → Start

### ❌ `GROQ_API_KEY not set` error
Open `.env` and make sure your Groq API key is filled in. Check there are no spaces around the `=`.

### ❌ Model download is very slow
The base BGE models are ~400 MB combined. This is a one-time download. Ensure you have a stable internet connection and sufficient free disk space.

### ❌ Frontend shows "Network Error"
The frontend cannot reach the backend. Ensure:
1. The backend is running on port 8000
2. You started frontend with `npm run dev` (not `npm run build`)

### ❌ `error: spacy model not found`
Run: `python -m spacy download en_core_web_sm` inside the backend venv.

### ❌ Build errors on Windows (torch/spacy)
Use the `install.ps1` script instead of `pip install -r requirements.txt`. It forces pre-built binary wheels.

---

## API Reference

Once the backend is running, visit **http://localhost:8000/docs** for the full interactive Swagger UI.

### Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/screen` | Upload resumes + JD, run full pipeline |
| `GET` | `/api/jobs` | List all past screening jobs |
| `GET` | `/api/jobs/{job_id}/results` | Retrieve results for a previous screening |
| `GET` | `/api/candidates/{candidate_id}` | Get detailed candidate info + PDF URL |
| `GET` | `/api/health` | Health check |

---

## Project Structure

```
d:\Resume project\
├── .gitignore
├── README.md
├── TECHNICAL_REPORT.md          ← Full architecture & design document
├── PRESENTATION.md              ← Presentation guide with demo script
│
├── backend/
│   ├── app/
│   │   ├── main.py              ← FastAPI app entry point
│   │   ├── core/
│   │   │   ├── config.py        ← All settings from .env (Pydantic Settings)
│   │   │   └── database.py      ← SQLAlchemy engine + session
│   │   ├── models/
│   │   │   └── orm.py           ← PostgreSQL table definitions (Job, Candidate, Screening)
│   │   ├── api/
│   │   │   ├── routes.py        ← API endpoints (screen, jobs, candidates, health)
│   │   │   └── schemas.py       ← Pydantic response shape documentation
│   │   └── services/
│   │       ├── parser.py        ← PDF text extraction + section-aware chunking [CUSTOM]
│   │       ├── embedder.py      ← LangChain HuggingFaceEmbeddings (BGE)
│   │       ├── retriever.py     ← LangChain QdrantVectorStore (upsert + ANN search)
│   │       ├── reranker.py      ← BGE cross-encoder reranker [CUSTOM]
│   │       ├── scorer.py        ← Weighted scoring formula [CUSTOM]
│   │       ├── explainer.py     ← LangChain ChatGroq chain (fit/gap explanation)
│   │       ├── storage.py       ← Local PDF file storage
│   │       └── pipeline.py      ← Orchestrates all 7 services end-to-end
│   ├── init_db.py               ← Run once to create PostgreSQL tables
│   ├── install.ps1              ← Windows binary-wheel installer (avoids build errors)
│   ├── requirements.txt         ← Python dependencies
│   ├── .env.example             ← Template — copy to .env and fill in your values
│   └── uploads/                 ← Saved PDF files (gitignored)
│
└── frontend/
    ├── index.html
    ├── vite.config.js           ← Dev server + proxy to backend
    ├── tailwind.config.js
    ├── package.json
    └── src/
        ├── main.jsx             ← React entry point
        ├── App.jsx              ← Root component — manages all screens and state
        ├── index.css            ← Tailwind base + custom component classes
        ├── api/
        │   ├── client.js        ← Axios API wrapper (screen, jobs, candidates)
        │   └── exportUtils.js   ← CSV export utilities
        └── components/
            ├── Sidebar.jsx          ← Left navigation rail
            ├── UploadPanel.jsx      ← Resume drag-and-drop upload zone
            ├── JDPanel.jsx          ← JD: paste text OR upload PDF
            ├── JDDrawer.jsx         ← Expandable JD preview drawer
            ├── LoadingSpinner.jsx   ← Animated loading state
            ├── RankedResults.jsx    ← Ranked candidate list with export
            ├── CandidateCard.jsx    ← Individual candidate score card
            ├── CandidateDetail.jsx  ← RAG evidence view + score breakdown
            ├── HistoryPanel.jsx     ← Past screening sessions list
            └── PrintSection.jsx     ← Print-optimized scorecard layout
```

---

## Scoring Formula

```
Final Score = (0.45 × Reranker Score) + (0.40 × Vector Similarity) + (0.15 × Rule Bonus)
```

- **Reranker Score (45%)**: BGE cross-encoder reads JD + chunk together → most accurate signal
- **Vector Score (40%)**: Cosine similarity from Qdrant ANN search → semantic recall
- **Rule Bonus (15%)**: Skill keyword hits + years of experience match → hard heuristics

Score is displayed as a percentage (0–100%) and capped at 100%.

---

## Next Steps (After Local Testing)

Once you're happy with local testing, the next phase will be:
1. Switching from Qdrant in-memory → Qdrant server (persistent vectors)
2. Adding Docker Compose to orchestrate all services
3. Moving uploaded PDFs to S3-compatible storage
4. Adding API key authentication
5. Deploying to cloud (Railway / Render / AWS)

See `TECHNICAL_REPORT.md` for the full production roadmap.
