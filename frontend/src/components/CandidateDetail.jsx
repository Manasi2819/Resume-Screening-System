import { useState, useEffect, useRef } from 'react'
import { getCandidate } from '../api/client'
import { exportCandidateToCSV } from '../api/exportUtils'
import LoadingSpinner from './LoadingSpinner'

/**
 * Candidate Detail view — Side-by-Side AI analysis and resume preview.
 * Integrated with click-to-highlight and scroll-to-view capabilities.
 */
export default function CandidateDetail({ candidate, jdText, onBack, onPrint }) {
  if (!candidate) return null

  const [detailedCandidate, setDetailedCandidate] = useState(null)
  const [loading, setLoading] = useState(true)
  const [previewTab, setPreviewTab] = useState('text') // 'text' | 'pdf' | 'jd'

  const textContainerRef = useRef(null)

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      try {
        const data = await getCandidate(candidate.resume_id)
        if (active) {
          setDetailedCandidate(data)
        }
      } catch (err) {
        console.error("Error loading candidate detail:", err)
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }
    load()
    return () => {
      active = false
    }
  }, [candidate.resume_id])

  useEffect(() => {
    if (detailedCandidate && previewTab === 'text') {
      const timer = setTimeout(() => {
        const el = document.getElementById('first-highlight')
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }, 200)
      return () => clearTimeout(timer)
    }
  }, [detailedCandidate, previewTab])

  const renderHighlightedText = () => {
    if (!detailedCandidate?.raw_text) return ''
    const text = detailedCandidate.raw_text
    const chunks = candidate.evidence_chunks || []

    if (chunks.length === 0) return text

    // Find all match ranges
    const ranges = []
    chunks.forEach((chunk, i) => {
      if (!chunk) return
      let idx = text.toLowerCase().indexOf(chunk.toLowerCase())
      while (idx !== -1) {
        ranges.push({
          start: idx,
          end: idx + chunk.length,
          chunkIndex: i
        })
        idx = text.toLowerCase().indexOf(chunk.toLowerCase(), idx + 1)
      }
    })

    if (ranges.length === 0) return text

    // Sort ranges by start index, then by end index descending
    ranges.sort((a, b) => a.start - b.start || b.end - a.end)

    // Merge overlapping ranges
    const mergedRanges = []
    let current = ranges[0]

    for (let i = 1; i < ranges.length; i++) {
      const next = ranges[i]
      if (next.start < current.end) {
        if (next.end > current.end) {
          current.end = next.end
        }
      } else {
        mergedRanges.push(current)
        current = next
      }
    }
    mergedRanges.push(current)

    // Render text with highlights
    const result = []
    let lastIndex = 0

    mergedRanges.forEach((range, idx) => {
      if (range.start > lastIndex) {
        result.push(text.substring(lastIndex, range.start))
      }
      
      const matchText = text.substring(range.start, range.end)
      result.push(
        <mark
          key={idx}
          id={idx === 0 ? 'first-highlight' : undefined}
          className="bg-yellow-100 text-on-surface font-semibold px-[2px] rounded border border-yellow-400/40 shadow-sm"
          title="AI Match Evidence"
        >
          {matchText}
        </mark>
      )
      lastIndex = range.end
    })

    if (lastIndex < text.length) {
      result.push(text.substring(lastIndex))
    }

    return result
  }

  const pct = Math.round(candidate.final_score * 100)

  const scoreMetrics = [
    {
      label: 'Vector Similarity',
      value: Math.round(candidate.vector_score * 100),
      color: 'bg-primary',
      textColor: 'text-on-surface',
      desc: 'Dense embedding ANN search distance to JD',
    },
    {
      label: 'Reranker Score',
      value: Math.round(candidate.reranker_score * 100),
      color: 'bg-secondary',
      textColor: 'text-secondary',
      desc: 'Cross-encoder semantic verification',
    },
    {
      label: 'Rule-based Bonus',
      value: Math.round(candidate.rule_score * 100),
      color: 'bg-tertiary',
      textColor: 'text-tertiary',
      desc: 'Keyword hits + experience match',
    },
  ]

  return (
    <div className="flex flex-col gap-xl select-none">
      {/* Breadcrumb + back + actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-md text-on-surface-variant text-body-sm">
        <div className="flex items-center gap-sm">
          <button
            onClick={onBack}
            className="flex items-center gap-xs hover:text-primary transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Back to Results
          </button>
          <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          <span className="text-on-surface font-semibold">{candidate.candidate_name}</span>
        </div>

        {/* Action Group */}
        <div className="flex items-center gap-sm">
          <button
            onClick={() => exportCandidateToCSV(candidate)}
            className="flex items-center gap-xs px-md py-xs border border-outline-variant rounded-DEFAULT text-label-md text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
            title="Download Candidate CSV Scorecard"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            Export CSV
          </button>
          <button
            onClick={() => onPrint('candidate', candidate)}
            className="flex items-center gap-xs px-md py-xs border border-outline-variant rounded-DEFAULT text-label-md text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
            title="Print Candidate PDF Scorecard"
          >
            <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
            Export PDF
          </button>
        </div>
      </div>

      {/* Candidate header card */}
      <section className="bg-surface-container-lowest border border-outline-variant rounded-lg p-lg flex items-start justify-between gap-lg">
        <div className="flex items-center gap-lg">
          <div className="w-14 h-14 rounded-full bg-primary-fixed flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-on-primary-fixed" style={{ fontSize: 28 }}>person</span>
          </div>
          <div>
            <h2 className="text-headline-md text-on-surface flex items-center gap-sm flex-wrap">
              {candidate.candidate_name}
              {candidate.rank === 1 && (
                <span className="inline-flex items-center px-sm py-[2px] rounded-full bg-secondary-container text-on-secondary-container text-mono-sm border border-secondary/20 uppercase tracking-widest">
                  Top Match
                </span>
              )}
            </h2>
            <p className="text-body-md text-on-surface-variant mt-xs">
              Rank #{candidate.rank} · AI Match Score: <strong className="text-on-surface">{pct}%</strong>
            </p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-md shrink-0 text-right">
          <div>
            <p className="text-label-md text-outline uppercase tracking-wider mb-xs">Overall Score</p>
            <p className="text-display-lg text-secondary">{pct}<span className="text-headline-sm text-secondary/70">%</span></p>
          </div>
        </div>
      </section>

      {/* 2-column layout: Left (AI Analysis & Scores) + Right (Resume Previewer) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-xl">
        {/* Left Side: Scorecard & RAG Evidence */}
        <div className="lg:col-span-6 flex flex-col gap-lg min-w-0">
          
          {/* Scoring Breakdown Card */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-lg">
            <h3 className="text-headline-sm text-on-surface mb-lg">Scoring Breakdown</h3>
            <div className="flex flex-col gap-md">
              {scoreMetrics.map((m) => (
                <div key={m.label}>
                  <div className="flex justify-between items-end mb-xs">
                    <span className="text-body-sm text-on-surface-variant">{m.label}</span>
                    <span className={`text-mono-sm font-semibold ${m.textColor}`}>{m.value}%</span>
                  </div>
                  <div className="w-full bg-surface-variant h-[6px] rounded-full overflow-hidden">
                    <div
                      className={`${m.color} h-full rounded-full transition-all duration-700`}
                      style={{ width: `${m.value}%` }}
                    />
                  </div>
                  <p className="text-mono-sm text-outline mt-xs">{m.desc}</p>
                </div>
              ))}
            </div>
            <div className="mt-lg pt-md border-t border-outline-variant">
              <p className="text-mono-sm text-on-surface-variant">
                Formula: Final = <strong>45%</strong> Reranker + <strong>40%</strong> Vector + <strong>15%</strong> Rules
              </p>
            </div>
          </div>

          {/* Fit Assessment Card */}
          <div className="flex flex-col gap-sm">
            <h3 className="text-headline-sm text-on-surface flex items-center gap-xs">
              <span className="material-symbols-outlined text-primary text-[20px]">auto_awesome</span>
              AI Fit Assessment
            </h3>
            <div className="evidence-block relative">
              <p className="text-body-md text-on-surface leading-relaxed whitespace-pre-wrap">
                {candidate.explanation_fit}
              </p>
            </div>
          </div>

          {/* Gaps Card */}
          {candidate.explanation_gap && (
            <div className="flex flex-col gap-sm">
              <h3 className="text-headline-sm text-on-surface flex items-center gap-xs">
                <span className="material-symbols-outlined text-error text-[20px]">warning</span>
                Identified Gaps
              </h3>
              <div className="bg-surface-container-lowest border-l-[3px] border-error p-md rounded-r-lg border border-y-outline-variant border-r-outline-variant relative">
                <p className="text-body-md text-on-surface-variant italic leading-relaxed">
                  {candidate.explanation_gap}
                </p>
              </div>
            </div>
          )}

          </div>


        {/* Right Side: Resume Previewer Panel */}
        <div className="lg:col-span-6 flex flex-col gap-md min-w-0">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-md flex flex-col h-full min-h-[600px] max-h-[780px]">
            {/* Previewer Header & Tabs */}
            <div className="flex items-center justify-between border-b border-outline-variant pb-sm mb-md shrink-0">
              <h3 className="text-headline-sm text-on-surface flex items-center gap-xs">
                <span className="material-symbols-outlined text-primary text-[20px]">
                  {previewTab === 'jd' ? 'assignment' : 'description'}
                </span>
                {previewTab === 'jd' ? 'Job Description' : 'Resume Previewer'}
              </h3>
              <div className="flex bg-surface-container rounded-sm p-[2px] gap-[2px]">
                <button
                  onClick={() => setPreviewTab('text')}
                  className={`px-sm py-xs text-body-sm font-semibold rounded-sm transition-colors duration-150 cursor-pointer ${
                    previewTab === 'text'
                      ? 'bg-white text-primary shadow-sm'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  Text Preview
                </button>
                <button
                  onClick={() => setPreviewTab('pdf')}
                  className={`px-sm py-xs text-body-sm font-semibold rounded-sm transition-colors duration-150 cursor-pointer ${
                    previewTab === 'pdf'
                      ? 'bg-white text-primary shadow-sm'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {(() => {
                    const ext = (detailedCandidate?.file_url || detailedCandidate?.pdf_url || '').split('.').pop().toLowerCase()
                    if (ext === 'docx' || ext === 'doc') return 'Original DOCX'
                    if (['png','jpg','jpeg','webp'].includes(ext)) return 'Original Image'
                    return 'Original PDF'
                  })()}
                </button>
                {jdText && (
                  <button
                    id="jd-tab-btn"
                    onClick={() => setPreviewTab('jd')}
                    className={`px-sm py-xs text-body-sm font-semibold rounded-sm transition-colors duration-150 cursor-pointer flex items-center gap-[4px] ${
                      previewTab === 'jd'
                        ? 'bg-primary text-on-primary shadow-sm'
                        : 'text-on-surface-variant hover:text-primary'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[13px]">assignment</span>
                    Job Description
                  </button>
                )}
              </div>
            </div>

            {/* Preview Area Content */}
            <div className="flex-1 flex flex-col relative min-h-[500px] overflow-hidden">
              {loading ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <LoadingSpinner />
                </div>
              ) : previewTab === 'jd' ? (
                /* ── Job Description tab ─────────────────────────────── */
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="flex items-center gap-xs px-md py-xs bg-primary/5 border border-primary/15 rounded-t text-mono-sm text-primary shrink-0">
                    <span className="material-symbols-outlined text-[14px]">assignment</span>
                    Job Description used for this screening
                  </div>
                  <div className="flex-1 overflow-y-auto bg-surface border border-t-0 border-outline-variant rounded-b p-md custom-scroll text-body-md text-on-surface whitespace-pre-wrap font-sans leading-relaxed select-text">
                    {jdText || (
                      <span className="text-on-surface-variant italic">Job description not available.</span>
                    )}
                  </div>
                </div>
              ) : previewTab === 'text' ? (
                <div
                  ref={textContainerRef}
                  className="flex-1 overflow-y-auto bg-surface border border-outline-variant rounded p-md custom-scroll text-body-md text-on-surface whitespace-pre-wrap font-sans leading-relaxed select-text"
                >
                  {renderHighlightedText()}
                </div>
              ) : (
                <div className="flex-1 flex flex-col bg-surface border border-outline-variant rounded overflow-hidden">
                  {(() => {
                    const fileUrl = detailedCandidate?.file_url || detailedCandidate?.pdf_url
                    if (!fileUrl) {
                      return (
                        <div className="flex-1 flex flex-col items-center justify-center text-on-surface-variant">
                          <span className="material-symbols-outlined text-[48px] text-outline">error</span>
                          <p className="text-body-md mt-sm">File URL not available.</p>
                        </div>
                      )
                    }
                    const ext = fileUrl.split('.').pop().toLowerCase()
                    // ── Images: render with <img> ──────────────────────────
                    if (['png', 'jpg', 'jpeg', 'webp'].includes(ext)) {
                      return (
                        <div className="flex-1 flex flex-col items-center justify-center overflow-auto p-md">
                          <img
                            src={fileUrl}
                            alt="Uploaded resume image"
                            className="max-w-full max-h-full object-contain rounded shadow-sm"
                          />
                        </div>
                      )
                    }
                    // ── DOCX: offer a download link (browsers cannot render inline) ──
                    if (ext === 'docx' || ext === 'doc') {
                      return (
                        <div className="flex-1 flex flex-col items-center justify-center gap-md text-on-surface-variant p-lg">
                          <span className="material-symbols-outlined text-[56px] text-primary">description</span>
                          <p className="text-body-md text-center">
                            Word documents cannot be previewed in the browser.
                          </p>
                          <a
                            href={fileUrl}
                            download
                            className="flex items-center gap-xs px-md py-sm bg-primary text-on-primary rounded-lg text-label-md font-semibold hover:bg-primary/90 transition-colors"
                          >
                            <span className="material-symbols-outlined text-[18px]">download</span>
                            Download Resume (.{ext})
                          </a>
                          <p className="text-body-sm text-outline text-center mt-xs">
                            Use the <strong>Text Preview</strong> tab above to read the extracted resume content.
                          </p>
                        </div>
                      )
                    }
                    // ── PDF: embed with iframe (default) ──────────────────
                    return (
                      <iframe
                        src={`${fileUrl}#toolbar=0`}
                        className="w-full h-full border-none"
                        title="Original Resume"
                      />
                    )
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
