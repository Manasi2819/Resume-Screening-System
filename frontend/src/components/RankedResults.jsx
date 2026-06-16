import { useState } from 'react'
import CandidateCard from './CandidateCard'
import JDDrawer from './JDDrawer'
import { exportToCSV } from '../api/exportUtils'

export default function RankedResults({ results, jdText, onViewDetail, onNewScreening, onPrint }) {
  const [jdOpen, setJdOpen] = useState(false)

  if (!results || results.length === 0) {
    return (
      <div className="text-center py-2xl text-on-surface-variant">
        <span className="material-symbols-outlined text-[48px]">search_off</span>
        <p className="text-body-lg mt-md">No candidates to display.</p>
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-col gap-xl">
        {/* Header */}
        <div className="flex items-end justify-between border-b border-outline-variant pb-md">
          <div>
            <p className="text-mono-sm text-on-surface-variant uppercase tracking-wider mb-xs">
              Screening Complete
            </p>
            <h2 className="text-headline-md font-bold text-on-surface">Ranked Candidates</h2>
            <p className="text-body-md text-on-surface-variant mt-xs">
              {results.length} candidate{results.length !== 1 ? 's' : ''} ranked by AI match score
            </p>
          </div>
          <div className="flex items-center gap-sm shrink-0">
            <button
              onClick={() => exportToCSV(results)}
              className="flex items-center gap-xs px-md py-sm border border-outline-variant rounded-DEFAULT text-label-md text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
              title="Export all candidates to CSV"
            >
              <span className="material-symbols-outlined text-[18px]">download</span>
              Export CSV
            </button>
            <button
              onClick={() => onPrint('results', results)}
              className="flex items-center gap-xs px-md py-sm border border-outline-variant rounded-DEFAULT text-label-md text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
              title="Print ranked list report to PDF"
            >
              <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
              Export PDF
            </button>
            <button
              onClick={onNewScreening}
              className="flex items-center gap-xs px-md py-sm bg-primary text-on-primary rounded-DEFAULT text-label-md hover:bg-primary-container transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              New Screening
            </button>
            {/* ── View JD button ────────────────────────────────────────── */}
            {jdText && (
              <button
                id="view-jd-btn"
                onClick={() => setJdOpen(true)}
                className="flex items-center gap-xs px-md py-sm bg-surface-container-low border border-primary/30 text-primary rounded-DEFAULT text-label-md hover:bg-primary/10 transition-colors cursor-pointer"
                title="View Job Description used for this screening"
              >
                <span className="material-symbols-outlined text-[18px]">assignment</span>
                View JD
              </button>
            )}
          </div>
        </div>

        {/* Summary bar */}
        <div className="grid grid-cols-3 gap-md">
          {[
            { label: 'Top Match', value: `${Math.round(results[0]?.final_score * 100)}%`, color: 'text-secondary', icon: 'star' },
            { label: 'Candidates', value: results.length, color: 'text-primary', icon: 'group' },
            { label: 'Avg Score', value: `${Math.round(results.reduce((a, r) => a + r.final_score, 0) / results.length * 100)}%`, color: 'text-tertiary', icon: 'analytics' },
          ].map((stat) => (
            <div key={stat.label} className="bg-surface-container-lowest border border-outline-variant rounded-lg p-md flex items-center gap-md">
              <span className={`material-symbols-outlined text-[28px] ${stat.color}`}>{stat.icon}</span>
              <div>
                <p className={`text-headline-md ${stat.color}`}>{stat.value}</p>
                <p className="text-label-md text-on-surface-variant uppercase tracking-wider">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Candidate cards */}
        <div className="flex flex-col gap-lg">
          {results.map((candidate) => (
            <CandidateCard
              key={candidate.resume_id}
              candidate={candidate}
              onViewDetail={onViewDetail}
            />
          ))}
        </div>
      </div>

      {/* ── Slide-in JD Drawer ───────────────────────────────────────────── */}
      <JDDrawer
        isOpen={jdOpen}
        onClose={() => setJdOpen(false)}
        jdText={jdText}
      />
    </>
  )
}
