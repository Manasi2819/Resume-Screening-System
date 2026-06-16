import React from 'react'

/**
 * PrintSection component.
 * Rendered at the root level and configured with CSS to be visible ONLY during printing.
 */
export default function PrintSection({ printData }) {
  if (!printData) return null

  const { type, data } = printData

  return (
    <div id="print-section" className="hidden print:block p-8 bg-white text-black font-sans min-h-screen text-[14px] leading-relaxed">
      {type === 'results' ? (
        <PrintResultsList results={data} />
      ) : (
        <PrintCandidateScorecard candidate={data} />
      )}
    </div>
  )
}

/**
 * Renders the ranked candidate list report.
 */
function PrintResultsList({ results }) {
  if (!results || results.length === 0) return null

  const topMatch = results[0]
  const avgScore = Math.round(results.reduce((a, r) => a + r.final_score, 0) / results.length * 100)

  return (
    <div className="flex flex-col gap-6">
      {/* Document Header */}
      <div className="flex justify-between items-start border-b-2 border-slate-300 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">AI Candidate Screening Report</h1>
          <p className="text-slate-500 text-[12px] mt-1">
            Generated on: {new Date().toLocaleDateString()} · AI Screen Orchestrator
          </p>
        </div>
        <div className="text-right">
          <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 font-semibold rounded text-[12px]">
            Ranked List
          </span>
        </div>
      </div>

      {/* Overview Statistics Cards */}
      <div className="grid grid-cols-3 gap-4 my-2">
        <div className="border border-slate-200 rounded p-3 bg-slate-50">
          <p className="text-slate-500 text-[11px] uppercase tracking-wider font-semibold">Total Candidates</p>
          <p className="text-xl font-bold text-slate-800">{results.length}</p>
        </div>
        <div className="border border-slate-200 rounded p-3 bg-slate-50">
          <p className="text-slate-500 text-[11px] uppercase tracking-wider font-semibold">Top AI Match Score</p>
          <p className="text-xl font-bold text-green-700">{Math.round(topMatch.final_score * 100)}%</p>
        </div>
        <div className="border border-slate-200 rounded p-3 bg-slate-50">
          <p className="text-slate-500 text-[11px] uppercase tracking-wider font-semibold">Average Match Score</p>
          <p className="text-xl font-bold text-blue-700">{avgScore}%</p>
        </div>
      </div>

      {/* Main Table */}
      <div>
        <h2 className="text-lg font-bold text-slate-800 mb-2">Ranked Candidate Summary</h2>
        <table className="w-full border-collapse border border-slate-300 text-left">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-300 text-[12px]">
              <th className="p-2 border-r border-slate-300 w-[60px] text-center font-bold">Rank</th>
              <th className="p-2 border-r border-slate-300 font-bold">Candidate Details</th>
              <th className="p-2 border-r border-slate-300 w-[100px] text-center font-bold">Overall Match</th>
              <th className="p-2 border-r border-slate-300 font-bold">Key Skills</th>
              <th className="p-2 font-bold">AI Fit Summary</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r) => {
              const score = Math.round(r.final_score * 100)
              const scoreClass = score >= 75 ? 'text-green-700' : score >= 50 ? 'text-blue-700' : 'text-red-700'
              return (
                <tr key={r.resume_id} className="border-b border-slate-300 text-[12px] page-break-inside-avoid">
                  <td className="p-2 border-r border-slate-300 text-center font-bold text-slate-800">
                    #{r.rank}
                  </td>
                  <td className="p-2 border-r border-slate-300">
                    <p className="font-bold text-slate-900">{r.candidate_name}</p>
                    <p className="text-slate-500 text-[11px]">{r.candidate_email || 'No Email'}</p>
                    <p className="text-slate-500 text-[11px]">{r.candidate_phone || 'No Phone'}</p>
                  </td>
                  <td className={`p-2 border-r border-slate-300 text-center font-bold ${scoreClass}`}>
                    {score}%
                  </td>
                  <td className="p-2 border-r border-slate-300">
                    <div className="flex flex-wrap gap-1">
                      {r.skills && r.skills.length > 0 ? (
                        r.skills.slice(0, 6).map((skill, index) => (
                          <span key={index} className="px-1 bg-slate-100 border border-slate-200 rounded text-[10px] font-medium text-slate-700">
                            {skill}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-400">N/A</span>
                      )}
                    </div>
                  </td>
                  <td className="p-2 text-slate-700 italic text-[11px] leading-relaxed">
                    {r.explanation_fit}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Report Footer */}
      <div className="mt-8 border-t border-slate-200 pt-4 text-center text-slate-400 text-[11px]">
        Confidential Document · Formatted for Internal Hiring Managers
      </div>
    </div>
  )
}

/**
 * Renders an individual candidate evaluation scorecard.
 */
function PrintCandidateScorecard({ candidate }) {
  if (!candidate) return null

  const overall = Math.round(candidate.final_score * 100)
  const vector = Math.round(candidate.vector_score * 100)
  const rerank = Math.round(candidate.reranker_score * 100)
  const rules = Math.round(candidate.rule_score * 100)

  return (
    <div className="flex flex-col gap-6">
      {/* Scorecard Header */}
      <div className="flex justify-between items-start border-b-2 border-slate-300 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Candidate Evaluation Scorecard</h1>
          <p className="text-slate-500 text-[12px] mt-1">
            Overall Rank: <strong className="text-slate-800">#{candidate.rank}</strong> · Screened via AI RAG Pipeline
          </p>
        </div>
        <div className="text-right">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Overall Match Score</p>
          <p className="text-3xl font-extrabold text-green-700">{overall}%</p>
        </div>
      </div>

      {/* Profile Details Card */}
      <div className="border border-slate-300 rounded-lg p-4 bg-slate-50 grid grid-cols-3 gap-4">
        <div>
          <p className="text-slate-400 text-[11px] uppercase tracking-wider">Candidate Name</p>
          <p className="text-md font-bold text-slate-800">{candidate.candidate_name}</p>
        </div>
        <div>
          <p className="text-slate-400 text-[11px] uppercase tracking-wider">Contact Email</p>
          <p className="text-md font-semibold text-slate-800">{candidate.candidate_email || 'N/A'}</p>
        </div>
        <div>
          <p className="text-slate-400 text-[11px] uppercase tracking-wider">Contact Phone</p>
          <p className="text-md font-semibold text-slate-800">{candidate.candidate_phone || 'N/A'}</p>
        </div>
      </div>

      {/* Scoring Breakdown & Skills */}
      <div className="grid grid-cols-2 gap-6">
        {/* Left: Score Metrics */}
        <div className="border border-slate-200 rounded p-4 bg-white">
          <h2 className="text-[14px] font-bold text-slate-800 mb-3 border-b pb-1">AI Scoring Breakdown</h2>
          <div className="flex flex-col gap-3">
            <div>
              <div className="flex justify-between text-[12px] text-slate-600 mb-1">
                <span>Vector Semantic Similarity</span>
                <span className="font-bold">{vector}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full">
                <div className="bg-blue-600 h-full rounded-full" style={{ width: `${vector}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[12px] text-slate-600 mb-1">
                <span>Reranker Cross-Encoder</span>
                <span className="font-bold">{rerank}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full">
                <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${rerank}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[12px] text-slate-600 mb-1">
                <span>Rule-Based Rules Bonus</span>
                <span className="font-bold">{rules}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full">
                <div className="bg-purple-600 h-full rounded-full" style={{ width: `${rules}%` }} />
              </div>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-4 italic">
            * Weighted Score = 45% Reranker + 40% Vector Similarity + 15% Heuristic Rules
          </p>
        </div>

        {/* Right: Extracted Skills */}
        <div className="border border-slate-200 rounded p-4 bg-white">
          <h2 className="text-[14px] font-bold text-slate-800 mb-3 border-b pb-1">Extracted Technical Skills</h2>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {candidate.skills && candidate.skills.length > 0 ? (
              candidate.skills.map((skill, index) => (
                <span key={index} className="px-2 py-0.5 bg-blue-50 border border-blue-200 text-blue-800 font-semibold rounded text-[11px]">
                  {skill}
                </span>
              ))
            ) : (
              <span className="text-slate-400 italic text-[12px]">No specific skills parsed.</span>
            )}
          </div>
        </div>
      </div>

      {/* AI Fit Assessment */}
      <div className="border-l-4 border-blue-600 pl-4 py-1">
        <h2 className="text-[14px] font-bold text-slate-800 mb-1">AI Fit Assessment</h2>
        <p className="text-[13px] text-slate-700 leading-relaxed italic bg-blue-50/50 p-2 rounded">
          "{candidate.explanation_fit}"
        </p>
      </div>

      {/* Identified Gaps */}
      {candidate.explanation_gap && (
        <div className="border-l-4 border-red-600 pl-4 py-1">
          <h2 className="text-[14px] font-bold text-slate-800 mb-1">Identified Experience Gaps</h2>
          <p className="text-[13px] text-slate-700 leading-relaxed bg-red-50/30 p-2 rounded italic">
            "{candidate.explanation_gap}"
          </p>
        </div>
      )}

      {/* Retrieved Evidence Chunks */}
      {candidate.evidence_chunks && candidate.evidence_chunks.length > 0 && (
        <div className="flex flex-col gap-3 page-break-before-avoid">
          <h2 className="text-[14px] font-bold text-slate-800 border-b pb-1">
            Resume Evidence Chunks ({candidate.evidence_chunks.length})
          </h2>
          {candidate.evidence_chunks.map((chunk, i) => (
            <div key={i} className="bg-slate-50 border border-slate-200 p-3 rounded text-[12px] leading-relaxed page-break-inside-avoid">
              <span className="font-bold text-slate-500 block mb-1">Evidence Reference #{i + 1}</span>
              <p className="text-slate-700">"{chunk}"</p>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="mt-auto pt-6 border-t border-slate-200 text-center text-slate-400 text-[11px]">
        Confidential Scorecard · Do Not Distribute Outside Recruiting Panel
      </div>
    </div>
  )
}
