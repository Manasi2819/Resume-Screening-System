/**
 * Circular score ring + candidate summary card.
 * Matches the design from code2.html (screen2.png).
 */
export default function CandidateCard({ candidate, onViewDetail }) {
  const pct = Math.round(candidate.final_score * 100)

  // Color based on score
  const scoreColor =
    pct >= 75 ? { stroke: '#006c49', text: 'text-secondary' } :
    pct >= 50 ? { stroke: '#4648d4', text: 'text-tertiary'  } :
                { stroke: '#ba1a1a', text: 'text-error'     }

  // Circular progress: circumference = 2π × 15.9155 ≈ 100
  const circumference = 100
  const dashArray = `${pct} ${circumference}`

  const formatSkill = (s) => {
    if (!s) return ''
    return s.split(' ').map(w => {
      if (['js', 'sql', 'ml', 'ai', 'aws', 'gcp', 'id', 'cv'].includes(w.toLowerCase())) {
        return w.toUpperCase()
      }
      return w.charAt(0).toUpperCase() + w.slice(1)
    }).join(' ')
  }

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-md flex flex-col lg:flex-row gap-lg hover:border-outline hover:shadow-sm transition-all duration-200">

      {/* ── Score + basic info ────────────────────────────────────────────── */}
      <div className="flex flex-row lg:flex-col items-center lg:items-start gap-md w-full lg:w-[240px] border-b lg:border-b-0 lg:border-r border-outline-variant pb-md lg:pb-0 lg:pr-md shrink-0 min-w-0">

        {/* Circular score ring */}
        <div className="relative w-20 h-20 shrink-0">
          <svg className="score-ring w-full h-full" viewBox="0 0 36 36">
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none" stroke="#dce9ff" strokeWidth="3"
            />
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke={scoreColor.stroke}
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={dashArray}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-headline-md leading-none ${scoreColor.text}`}>{pct}</span>
            <span className="text-mono-sm text-on-surface-variant leading-none">/100</span>
          </div>
        </div>

        {/* Name + contact info + rank */}
        <div className="flex-1 min-w-0">
          <p className="text-mono-sm text-on-surface-variant font-semibold uppercase tracking-wider">
            Rank #{candidate.rank}
          </p>
          <h3 className="text-headline-sm text-on-surface font-bold mt-xs leading-tight truncate" title={candidate.candidate_name}>
            {candidate.candidate_name}
          </h3>

          <div className="flex flex-col gap-[4px] text-body-sm text-on-surface-variant mt-sm">
            <span className="flex items-center gap-xs truncate" title={candidate.candidate_email}>
              <span className="material-symbols-outlined text-[16px] text-primary shrink-0">mail</span>
              <span className="truncate">{candidate.candidate_email || 'No email'}</span>
            </span>
            <span className="flex items-center gap-xs truncate" title={candidate.candidate_phone}>
              <span className="material-symbols-outlined text-[16px] text-primary shrink-0">phone</span>
              <span className="truncate">{candidate.candidate_phone || 'No phone'}</span>
            </span>
          </div>

          {candidate.rank === 1 && (
            <span className="inline-flex items-center gap-xs mt-sm px-sm py-[2px] rounded-full bg-secondary-container text-on-secondary-container text-mono-sm border border-secondary/20">
              <span className="material-symbols-outlined text-[10px]">star</span>
              Top Match
            </span>
          )}
        </div>
      </div>

      {/* ── Details ────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col gap-md min-w-0">

        {/* Score breakdown */}
        <div className="flex gap-lg text-mono-sm text-on-surface-variant">
          <span>Vector: <strong className="text-on-surface">{Math.round(candidate.vector_score * 100)}%</strong></span>
          <span>Reranker: <strong className="text-on-surface">{Math.round(candidate.reranker_score * 100)}%</strong></span>
          <span>Rules: <strong className="text-on-surface">{Math.round(candidate.rule_score * 100)}%</strong></span>
        </div>

        {/* AI Fit Summary */}
        <div>
          <h4 className="text-label-md text-on-surface-variant mb-xs flex items-center gap-xs uppercase">
            <span className="material-symbols-outlined text-[14px]">psychology</span>
            AI Fit Summary
          </h4>
          <p className="text-body-md text-on-surface bg-surface p-sm rounded-DEFAULT border-l-2 border-primary leading-relaxed">
            {candidate.explanation_fit}
          </p>
        </div>

        {/* Skills */}
        {candidate.skills && candidate.skills.length > 0 && (
          <div>
            <h4 className="text-label-md text-on-surface-variant mb-xs flex items-center gap-xs uppercase">
              <span className="material-symbols-outlined text-[14px]">extension</span>
              Extracted Skills
            </h4>
            <div className="flex flex-wrap gap-xs">
              {candidate.skills.map((skill, index) => (
                <span key={index} className="px-sm py-[2px] bg-primary-fixed text-on-primary-fixed rounded text-body-sm font-semibold border border-primary/10">
                  {formatSkill(skill)}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Gap */}
        {candidate.explanation_gap && (
          <div className="flex items-start gap-sm text-body-sm bg-error-container/20 p-xs px-sm rounded border border-error/10 w-fit">
            <span className="text-error font-semibold shrink-0">✗ Key Gap:</span>
            <span className="text-on-surface-variant">{candidate.explanation_gap}</span>
          </div>
        )}
      </div>

      {/* ── Actions ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col justify-center items-stretch gap-sm pl-md border-t lg:border-t-0 lg:border-l border-outline-variant pt-md lg:pt-0 min-w-[140px] shrink-0">
        <button
          onClick={() => onViewDetail(candidate)}
          className="flex items-center justify-center gap-xs px-md py-sm bg-primary text-on-primary rounded-DEFAULT text-label-md hover:bg-primary-container transition-colors shadow-sm"
        >
          View Evidence
          <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
        </button>
        <button className="flex items-center justify-center gap-xs px-md py-sm text-on-surface-variant rounded-DEFAULT text-label-md hover:bg-surface-container transition-colors">
          Shortlist
        </button>
      </div>
    </div>
  )
}
