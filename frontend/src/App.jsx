import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import UploadPanel from './components/UploadPanel'
import JDPanel from './components/JDPanel'
import LoadingSpinner from './components/LoadingSpinner'
import RankedResults from './components/RankedResults'
import CandidateDetail from './components/CandidateDetail'
import HistoryPanel from './components/HistoryPanel'
import PrintSection from './components/PrintSection'
import { screenResumes, listJobs, getResults } from './api/client'

export default function App() {
  // ── UI state ───────────────────────────────────────────────────────────────
  const [screen, setScreen] = useState('screen')     // 'screen' | 'results' | 'detail'
  const [selectedCandidate, setSelectedCandidate] = useState(null)

  // ── Print state ────────────────────────────────────────────────────────────
  const [printData, setPrintData] = useState(null)

  // ── Upload state ───────────────────────────────────────────────────────────
  const [resumeFiles, setResumeFiles] = useState([])
  const [jdText, setJdText] = useState('')
  const [jdPdf, setJdPdf] = useState(null)

  // ── Results state ──────────────────────────────────────────────────────────
  const [results, setResults] = useState(null)
  const [resultJdText, setResultJdText] = useState('')   // JD used for this screening
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // ── History state ──────────────────────────────────────────────────────────
  const [historyJobs, setHistoryJobs] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState(null)

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handlePrint = (type, data) => {
    setPrintData({ type, data })
    setTimeout(() => {
      window.print()
    }, 150)
  }

  useEffect(() => {
    const handleAfterPrint = () => {
      setPrintData(null)
    }
    window.addEventListener('afterprint', handleAfterPrint)
    return () => {
      window.removeEventListener('afterprint', handleAfterPrint)
    }
  }, [])

  // ── Screen handler ─────────────────────────────────────────────────────────
  const handleScreen = async () => {
    if (resumeFiles.length === 0) { setError('Please upload at least one resume PDF.'); return }
    if (!jdText.trim() && !jdPdf)  { setError('Please provide a Job Description (paste text or upload a PDF).'); return }
    if (jdText.trim() && jdText.trim().length < 50) { setError('Job description text is too short (minimum 50 characters).'); return }

    setError(null)
    setLoading(true)
    setResults(null)

    try {
      const data = await screenResumes(jdText, jdPdf, resumeFiles)
      setResults(data.results)
      setResultJdText(data.jd_text || jdText)
      setScreen('results')
    } catch (e) {
      const msg = e.response?.data?.detail || e.message || 'Something went wrong.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleViewDetail = (candidate) => {
    setSelectedCandidate(candidate)
    setScreen('detail')
  }

  const handleNewScreening = () => {
    setScreen('screen')
    setResults(null)
    setResultJdText('')
    setResumeFiles([])
    setJdText('')
    setJdPdf(null)
    setError(null)
    setSelectedCandidate(null)
  }

  const fetchHistory = async () => {
    setHistoryLoading(true)
    setHistoryError(null)
    try {
      const data = await listJobs()
      setHistoryJobs(data)
    } catch (e) {
      const msg = e.response?.data?.detail || e.message || 'Could not load history.'
      setHistoryError(msg)
    } finally {
      setHistoryLoading(false)
    }
  }

  const handleSelectHistoryJob = async (jobId) => {
    setLoading(true)
    setError(null)
    try {
      const data = await getResults(jobId)
      setResults(data.results)
      setResultJdText(data.jd_text || '')
      setScreen('results')
    } catch (e) {
      const msg = e.response?.data?.detail || e.message || 'Could not load results for this job.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleNavigate = (dest) => {
    if (dest === 'results' && !results) return // no results yet
    setScreen(dest)
    if (dest === 'screen') handleNewScreening()
    if (dest === 'history') fetchHistory()
  }

  const hasJD = jdText.trim().length >= 50 || jdPdf !== null

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar screen={screen} onNavigate={handleNavigate} />

      {/* Main area */}
      <div className="flex flex-col flex-1 min-w-0 h-screen overflow-hidden">
        {/* Top bar */}
        <header className="relative flex justify-between items-center h-topbar px-lg bg-surface border-b border-outline-variant shrink-0">
          <div className="flex items-center gap-md">
            {/* Mobile brand */}
            <div className="md:hidden">
              <h1 className="text-headline-sm text-primary font-bold">ResumeScreen</h1>
            </div>
          </div>

          {/* Breadcrumb */}
          <nav className="hidden md:flex md:absolute md:left-1/2 md:-translate-x-1/2 md:top-1/2 md:-translate-y-1/2 items-center gap-xs text-on-surface-variant whitespace-nowrap">
            <span
              onClick={() => handleNavigate('screen')}
              className={`cursor-pointer transition-colors text-headline-sm font-semibold hover:text-primary ${screen === 'screen' ? 'text-primary' : 'text-on-surface-variant'}`}
            >
              Resume Screening System
            </span>
            {(screen === 'results' || screen === 'detail') && (
              <>
                <span className="material-symbols-outlined text-[20px] text-on-surface-variant/50">chevron_right</span>
                <span
                  onClick={() => setScreen('results')}
                  className={`cursor-pointer transition-colors text-headline-sm ${screen === 'results' ? 'text-on-surface font-semibold' : 'text-on-surface-variant hover:text-primary'}`}
                >
                  Results
                </span>
              </>
            )}
            {screen === 'detail' && selectedCandidate && (
              <>
                <span className="material-symbols-outlined text-[20px] text-on-surface-variant/50">chevron_right</span>
                <span className="text-headline-sm text-on-surface font-semibold">{selectedCandidate.candidate_name}</span>
              </>
            )}
          </nav>

          <div className="flex items-center gap-sm">
            <button className="p-sm text-on-surface-variant hover:text-primary transition-colors rounded-full hover:bg-surface-container-low">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <button className="p-sm text-on-surface-variant hover:text-primary transition-colors rounded-full hover:bg-surface-container-low">
              <span className="material-symbols-outlined">help</span>
            </button>
          </div>
        </header>

        {/* Canvas */}
        <main className="flex-1 overflow-y-auto custom-scroll">
          <div className="max-w-[1440px] mx-auto p-xl">

            {/* ── Screen 1: Upload + JD ──────────────────────────────────── */}
            {screen === 'screen' && (
              <div className="flex flex-col" style={{ height: 'calc(100vh - var(--topbar-h, 64px) - 2 * var(--spacing-xl, 32px))' }}>
                {/* Header */}
                <div className="shrink-0 mb-md">
                  <h2 className="text-headline-md font-bold text-on-surface">New Screening</h2>
                  <p className="text-body-lg text-on-surface-variant mt-xs">
                    Upload candidate resumes and provide the job description to run AI analysis.
                  </p>
                </div>

                {/* Error banner */}
                {error && (
                  <div className="shrink-0 flex items-center gap-sm bg-error-container border border-error/20 text-on-error-container rounded-lg px-md py-sm text-body-sm mb-md">
                    <span className="material-symbols-outlined text-[18px]">error</span>
                    {error}
                    <button onClick={() => setError(null)} className="ml-auto hover:opacity-70">
                      <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                  </div>
                )}

                {/* Two-column upload grid — fills all remaining space */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-xl flex-1 min-h-0">
                  <div className="lg:col-span-7 min-h-0 flex flex-col">
                    <UploadPanel files={resumeFiles} setFiles={setResumeFiles} />
                  </div>
                  <div className="lg:col-span-5 min-h-0 flex flex-col">
                    <JDPanel
                      jdText={jdText}
                      setJdText={setJdText}
                      jdPdf={jdPdf}
                      setJdPdf={setJdPdf}
                    />
                  </div>
                </div>

                {/* Sticky bottom action bar — always visible */}
                <div className="shrink-0 border-t border-outline-variant mt-md pt-md">
                  {loading ? (
                    <LoadingSpinner />
                  ) : (
                    <div className="flex items-center justify-between gap-md">
                      <p className="text-mono-sm text-on-surface-variant">
                        {resumeFiles.length > 0
                          ? `${resumeFiles.length} resume${resumeFiles.length > 1 ? 's' : ''} ready`
                          : 'Upload resumes to begin'}
                        {resumeFiles.length > 0 && hasJD && ' · JD provided · Ready to screen'}
                      </p>
                      <button
                        onClick={handleScreen}
                        disabled={resumeFiles.length === 0 || !hasJD}
                        className={`flex items-center gap-sm px-xl py-md rounded-lg text-headline-sm font-semibold shadow-sm transition-all duration-200 ${
                          resumeFiles.length > 0 && hasJD
                            ? 'bg-primary text-on-primary hover:bg-primary-container hover:shadow-md active:scale-[0.98]'
                            : 'bg-surface-container text-on-surface-variant cursor-not-allowed'
                        }`}
                      >
                        <span className="material-symbols-outlined">auto_awesome</span>
                        Run AI Screening
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Screen 2: Ranked Results ───────────────────────────────── */}
            {screen === 'results' && results && (
              <RankedResults
                results={results}
                jdText={resultJdText}
                onViewDetail={handleViewDetail}
                onNewScreening={handleNewScreening}
                onPrint={handlePrint}
              />
            )}

            {/* ── Screen 2.1: Candidate Detail ───────────────────────────── */}
            {screen === 'detail' && selectedCandidate && (
              <CandidateDetail
                candidate={selectedCandidate}
                jdText={resultJdText}
                onBack={() => setScreen('results')}
                onPrint={handlePrint}
              />
            )}

            {/* ── Screen 3: History Panel ────────────────────────────────── */}
            {screen === 'history' && (
              <HistoryPanel
                jobs={historyJobs}
                loading={historyLoading}
                error={historyError}
                onSelectJob={handleSelectHistoryJob}
                onRefresh={fetchHistory}
              />
            )}

          </div>
        </main>
      </div>

      {/* Printable Scorecard/Report Layout */}
      <PrintSection printData={printData} />
    </div>
  )
}
