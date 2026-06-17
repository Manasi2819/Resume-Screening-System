# Presentation Guide — AI-Powered Resume Screening System

> **A slide-by-slide presentation script with speaker notes, demo walkthrough, and Q&A preparation.**

---

## Slide 1 — Title Slide

### Content
```
AI-Powered Resume Screening System

Automated Candidate Ranking Using Retrieval-Augmented Generation (RAG)

Tech Stack: FastAPI · BGE Embeddings · Qdrant · LangChain · Groq (LLaMA-3.3-70B) · React · Docker
```

### Speaker Notes
> "Today I'll walk you through a system I built that automates the most time-consuming step in hiring — reading through stacks of resumes. Instead of keyword matching or manual review, this system uses a three-stage AI pipeline to semantically understand both the job description and each candidate's resume, then ranks them with an explainable score."

---

## Slide 2 — The Problem

### Content
```
The Problem with Traditional Resume Screening

❌  Keyword matching misses qualified candidates
    → A "Python developer" may write "scripting" not "Python"

❌  Manual review is slow and inconsistent
    → 250 resumes per open role on average (LinkedIn data)

❌  Generic AI summaries hallucinate
    → "This candidate is perfect for ML" — based on what exactly?

❌  No audit trail
    → Can't explain why Candidate A ranked above Candidate B
```

### Speaker Notes
> "The core problem I was solving is three-fold: traditional tools miss semantic equivalence, manual review doesn't scale, and when companies use generic LLMs to summarize resumes, those summaries aren't grounded in the actual resume text — they hallucinate. My system solves all three."

---

## Slide 3 — The Solution

### Content
```
The Solution: RAG-Based Resume Screening

✅  Semantic understanding — not just keywords
✅  Evidence-grounded explanations — every claim traceable to resume text
✅  Three-signal scoring — vector + reranker + rules
✅  Fully auditable — see exactly which resume excerpts drove the score
✅  Free to run — BGE models run locally, Groq API is free
```

### Speaker Notes
> "RAG — Retrieval Augmented Generation — is the key. Instead of feeding the entire resume to an LLM and hoping for a good summary, I first semantically search the resume for the most relevant excerpts relative to the job description, then feed only those excerpts to the LLM. This grounds every explanation in real evidence."

---

## Slide 4 — System Architecture

### Content
```
Architecture Overview

[Browser]
     ↓
[Nginx (frontend container)] ←─ React built files served statically
     ↓ proxies /api →
[FastAPI Backend (backend container)]
     ↓
[Pipeline Orchestrator]
  ├─ PDF Parser (pdfplumber + spaCy)      → section-aware chunks
  ├─ BGE Embedder (HuggingFace)           → 768-dim vectors
  ├─ Qdrant Vector Store (container)      → ANN search, top-30 chunks
  ├─ BGE Cross-Encoder Reranker           → precise (JD, chunk) scoring
  ├─ Weighted Scorer                      → final_score per candidate
  └─ Groq LLM (LLaMA-3.3-70B)           → fit/gap explanation
     ↓
[PostgreSQL (container)] → persistent results

All 4 services managed by Docker Compose — one command to start everything
```

### Speaker Notes
> "The pipeline has 7 stages. The key insight is the two-stage retrieval: first we use fast approximate nearest-neighbor search to get the top 30 chunks, then we run an expensive but accurate cross-encoder reranker on just those 30. This gives us both speed and precision."

---

## Slide 5 — The RAG Pipeline Deep Dive

### Content
```
Why RAG? The Two-Stage Retrieval Strategy

Stage 1 — Vector Search (Fast, Broad Recall)
  • BGE-base embeds JD → 768-dim query vector
  • Qdrant ANN finds top-30 semantically similar chunks
  • Cosine similarity score attached to each chunk

Stage 2 — Cross-Encoder Reranking (Slow, High Precision)
  • BGE reranker reads (JD text, chunk text) TOGETHER
  • No pre-computed vectors — full attention over both texts
  • Far more accurate than vector similarity alone

Why both?
  • ANN: O(log n) — fast enough for 1000s of chunks
  • Cross-encoder: O(n) per pair — too slow for all chunks, perfect for top-30
```

### Speaker Notes
> "The two-stage approach is a classic information retrieval technique now popularized by production RAG systems at Google and OpenAI. The vector search gives us broad recall — we won't miss relevant chunks. The cross-encoder gives us precision — it can distinguish 'candidate has 3 years Python' from 'candidate mentions Python in passing'."

---

## Slide 6 — Scoring Formula

### Content
```
The Scoring Formula

Final Score = (0.45 × Reranker) + (0.40 × Vector) + (0.15 × Rules)

Reranker Score (45%)  — most accurate, reads JD + chunk together
Vector Score   (40%)  — semantic recall, captures synonyms and context
Rule Bonus     (15%)  — skill keyword overlap + years-of-experience match

Example:
  Candidate A: reranker=0.82, vector=0.74, rules=0.65
  Final = (0.45×0.82) + (0.40×0.74) + (0.15×0.65)
        = 0.369 + 0.296 + 0.097 = 0.762 → 76%
```

### Speaker Notes
> "The weights were chosen based on the relative reliability of each signal. The reranker gets the most weight because it has full context. Vector similarity gets nearly as much because it handles cases where the reranker might over-fit to surface features. The rule bonus is a 15% tiebreaker for when candidates are semantically similar but one has exactly the required tech stack."

---

## Slide 7 — PDF Section-Aware Parsing

### Content
```
Custom Resume Parser — Why Not LangChain?

LangChain PDF loaders: split every N characters → blindly chops mid-sentence

Our parser: section-aware chunking
  Resume → [Summary chunk] [Skills chunk] [Experience chunk] [Education chunk]

Why it matters:
  • Skills section retrieved as a unit → exact tech stack matching
  • Experience section preserved → years and context intact
  • Prevents "half a bullet point" appearing as evidence

Also handles:
  • PDF drop-cap artifacts (split header healing)
  • spaCy NER for name extraction with heuristic fallback
  • Regex extraction for email, phone, years of experience
```

### Speaker Notes
> "I chose to write a custom parser because resume structure is highly predictable — every resume has Skills, Experience, and Education sections — and exploiting that structure gives much better retrieval results. The LangChain generic splitter has no concept of 'this is a skills section'."

---

## Slide 8 — Technology Choices & Rationale

### Content
```
Why These Technologies?

BGE Embeddings    → Free, offline, top BEIR benchmark performance
                    outperforms text-embedding-ada-002 on retrieval tasks

Qdrant            → Native cosine similarity, metadata filtering by job_id,
                    Docker container in production, in-memory for local dev

Groq (LLaMA-3.3-70B) → Free tier (14,400 req/day), ~150 tokens/sec,
                         quality comparable to GPT-4o for structured JSON output

FastAPI           → Async, auto-generated OpenAPI docs at /docs,
                    Pydantic validation built-in

PostgreSQL        → ACID compliance, UUID support, JSON columns for metadata
                    survives Qdrant resets

Docker Compose    → One command starts all 4 services (frontend, backend,
                    postgres, qdrant) with health checks and startup ordering

React + Vite      → Fast HMR dev experience, Tailwind for rapid UI iteration
                    served in production by Nginx in Docker
```

### Speaker Notes
> "Every technology choice was made with a constraint: it must work free and locally. BGE runs on CPU with no API key. Qdrant runs in-process with no Docker. Groq's free tier is more than sufficient. The only cost is a one-time model download of ~400 MB."

---

## Slide 9 — Live Demo Walkthrough

### Demo Script (5–7 minutes)

#### Step 1 — Open the Application
- Navigate to `http://localhost:3000` *(Docker)* or `http://localhost:5173` *(local dev)*
- Show the three-panel layout: Upload (left), JD (right), Sidebar (left rail)

#### Step 2 — Upload Resumes
- Drag and drop 3–5 test PDF resumes into the Upload Panel
- Show the file list with names and sizes appearing
- Point out: "Each file is validated as a PDF, max 20 files"

#### Step 3 — Provide the Job Description
- Click "Paste Text" tab
- Paste a sample JD (e.g., "Senior Python Developer, 5+ years, FastAPI, PostgreSQL, Docker, AWS")
- OR switch to "Upload PDF" tab and upload a JD PDF

#### Step 4 — Run Screening
- Click "Run AI Screening" button
- Show the loading spinner: "First run takes 30-60 seconds as models load — then it's fast"
- Point out: "The button is disabled until both resumes and JD are provided — good UX"

#### Step 5 — View Results
- Show the ranked candidate cards with:
  - Score ring (circular percentage indicator)
  - AI Fit summary (green)
  - AI Gap summary (amber)
  - Skill tags
  - Email and phone
- Show "Export CSV" and "Print" options

#### Step 6 — View Evidence (The RAG Payoff)
- Click "View Evidence" on the top-ranked candidate
- Show the CandidateDetail view:
  - Score breakdown (3 bars: reranker, vector, rules)
  - 3 evidence chunks — actual text from the resume
  - "These aren't summaries — these are the exact paragraphs that drove the score"

#### Step 7 — History Panel
- Click "History" in the sidebar
- Show past screening sessions with job counts and dates
- Click a past job to reload its results instantly from PostgreSQL

---

## Slide 10 — Results & Demonstration Highlights

### Content
```
Key Outcomes

• Accurate ranking — candidate with most relevant experience consistently ranks #1
• Evidence-grounded — every explanation cites real resume text
• Fast (warm) — 15–20 seconds for 10 resumes
• Works with varied PDF formats — tested on different resume templates
• Export-ready — CSV download for ATS integration
• Print-ready — formatted scorecard per candidate

Comparison with keyword matching:
  • Candidate who writes "scripting" vs "Python" — caught by vector similarity
  • Candidate who lists Python last but uses it heavily — caught by cross-encoder
  • Candidate who lists Python but only for 6 months — caught by rule score penalty
```

---

## Slide 11 — Challenges & Solutions

### Content
```
Challenges Encountered

1. PDF Layout Artifacts
   Problem: Some PDFs render headers as individual letters on separate lines
   Solution: heal_split_headers() merges split-letter lines before processing

2. Name Extraction Accuracy
   Problem: spaCy NER identifies company names as PERSON entities
   Solution: Heuristic filter (job title exclusion, format check) with NER fallback

3. Model Version Compatibility
   Problem: LangChain 0.2.x → 0.3.x was a breaking change
   Solution: Locked >=0.3.20 in requirements.txt; install.ps1 updated to match

4. Cross-Origin File Serving
   Problem: React needed to serve uploaded PDFs from FastAPI
   Solution: FastAPI StaticFiles mount + Vite proxy for /uploads endpoint

5. Large Model Download on First Run
   Problem: Users don't expect a 400 MB download on first API call
   Solution: Clear console logging + README warning + loading spinner in UI
```

---

## Slide 12 — What I Learned

### Content
```
Key Learnings

Technical:
  • Two-stage retrieval (ANN + reranker) is the standard in production RAG
  • Cross-encoders are dramatically more accurate than bi-encoders for ranking
  • Section-aware chunking > generic text splitting for structured documents
  • LangChain is excellent glue code but not always the right choice (custom parser)

System Design:
  • Singleton pattern for heavy ML models (load once, reuse across requests)
  • Graceful fallbacks at every stage keep the pipeline running on edge cases
  • Separating Qdrant (session data) from PostgreSQL (persistent data) is clean

Product:
  • Evidence display is the most valuable feature — builds trust in AI decisions
  • History panel makes the system feel like a real product, not a demo
```

---

## Slide 13 — Future Roadmap

### Content
```
Phase 2 — Production Hardening ✅ Complete
  ☑ Docker Compose: FastAPI + PostgreSQL + Qdrant + Nginx (all 4 containers)
  ☑ Persistent Qdrant server (vectors survive restarts)
  ☑ Named Docker volumes (DB, uploads, model cache persist)
  ☑ Multi-stage Dockerfiles for minimal image size
  ☑ Health checks + proper container startup ordering

Phase 3 — Feature Expansion
  □ OCR for image-based PDFs
  □ Async batch processing (Celery + Redis)
  □ Configurable scoring weights per role type
  □ ATS integration (Greenhouse, Lever)

Phase 4 — Scale
  □ GPU cross-encoder inference (10× speedup)
  □ Cloud deployment (Railway / AWS ECS)
  □ Multi-tenant with organization accounts
```

---

## Slide 14 — Q&A

### Anticipated Questions & Answers

**Q: How is this different from just asking ChatGPT to rank resumes?**  
> ChatGPT has a token limit and would require pasting entire resumes. More importantly, it can hallucinate qualifications. Our system retrieves actual text from resumes and cites it — every score is traceable. Also, it's free.

**Q: What's the accuracy of the ranking?**  
> The system is highly consistent — the same resumes against the same JD always produce the same ranking (deterministic). In testing, the top-ranked candidate always had the most relevant experience. Absolute accuracy depends on JD quality — a vague JD produces noisier results.

**Q: Can it handle non-English resumes?**  
> BGE has multilingual variants. The current implementation uses English-only BGE. spaCy English model would also need to be swapped. Feasible in Phase 3.

**Q: Why Groq instead of running an LLM locally?**  
> Running LLaMA-3.3-70B locally requires 48 GB VRAM. Groq's free tier gives us cloud-quality inference at zero cost. For true offline use, a smaller model like LLaMA-3.2-8B could run locally on 8 GB VRAM.

**Q: Is this GDPR compliant?**  
> For production: resumes must be deleted after processing, users must consent, storage location matters. The architecture supports this — file deletion API is straightforward to add. Not implemented in v1.0 (local dev).

**Q: What happens if the PDF is scanned (image-only)?**  
> pdfplumber returns empty text for image PDFs. The pipeline produces an empty chunk and returns 0% score for that candidate. OCR (Tesseract) is the planned Phase 3 solution.

---

## Presentation Tips

### 5-Minute Version
- Slides: 1, 2, 3, 5 (just the diagram), 9 (demo only), 14 (2-3 Q&A)
- Skip: detailed architecture, technology choices, challenges

### 15-Minute Version  
- All slides, demo running live
- Pause on Slide 9 (demo) for 5–6 minutes

### 30-Minute Version (Technical Deep Dive)
- All slides + Slides 5, 6, 7 get full explanation
- Show source code for `parser.py` section chunking and `scorer.py` formula
- Open `http://localhost:8000/docs` — show Swagger UI of the API

### Pro Tips
- Run the system beforehand and keep it warm (model already loaded)
- Have 3-5 diverse test PDFs ready (different formats, experience levels)
- Prepare a JD that will clearly differentiate the candidates
- Show the evidence view last — it's the most impressive feature
