import { useState } from 'react'

export default function HistoryPanel({ jobs, loading, error, onSelectJob, onRefresh }) {
  const [searchTerm, setSearchTerm] = useState('')

  const formatDate = (isoString) => {
    try {
      const date = new Date(isoString)
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch (e) {
      return isoString
    }
  }

  const filteredJobs = jobs.filter(job => 
    job.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (job.jd_text || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="flex flex-col gap-xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-md">
        <div>
          <h2 className="text-headline-md font-bold text-on-surface">Screening History</h2>
          <p className="text-body-lg text-on-surface-variant mt-xs">
            Review past screening sessions and reload candidate rankings.
          </p>
        </div>
        <button
          onClick={onRefresh}
          className="flex items-center gap-xs px-md py-sm bg-surface border border-outline-variant rounded-lg text-body-md text-on-surface-variant hover:text-primary hover:border-primary transition-all self-start md:self-auto"
        >
          <span className="material-symbols-outlined text-[18px]">refresh</span>
          Refresh Log
        </button>
      </div>

      {/* Search and Filter */}
      {jobs.length > 0 && (
        <div className="relative max-w-md">
          <span className="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-outline text-[20px]">
            search
          </span>
          <input
            type="text"
            placeholder="Search by Job ID or Description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-xl pr-md py-sm rounded-lg bg-surface-container-lowest border border-outline-variant text-body-md text-on-surface placeholder:text-outline-variant focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
          />
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-md">
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          <p className="text-body-md text-on-surface-variant">Loading historical runs...</p>
        </div>
      )}

      {!loading && error && (
        <div className="flex items-center gap-sm bg-error-container border border-error/20 text-on-error-container rounded-lg px-md py-sm text-body-sm">
          <span className="material-symbols-outlined text-[18px]">error</span>
          <span>Failed to load history: {error}</span>
        </div>
      )}

      {!loading && !error && filteredJobs.length === 0 && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-xl flex flex-col items-center justify-center text-center py-20">
          <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center text-outline-variant mb-md">
            <span className="material-symbols-outlined text-[36px]">history</span>
          </div>
          <h3 className="text-headline-sm text-on-surface font-semibold">
            {searchTerm ? 'No matches found' : 'No screening history yet'}
          </h3>
          <p className="text-body-md text-on-surface-variant mt-xs max-w-sm">
            {searchTerm
              ? 'Try adjusting your search terms to find a past job run.'
              : 'Uploaded jobs will be saved in PostgreSQL and appear here for later retrieval.'}
          </p>
        </div>
      )}

      {!loading && !error && filteredJobs.length > 0 && (
        <div className="flex flex-col gap-md">
          {filteredJobs.map((job) => {
            const isProcessing = job.status === 'processing'
            const isFailed = job.status === 'failed'
            const isDone = job.status === 'done'

            let statusBadge = (
              <span className="inline-flex items-center gap-xs px-sm py-[2px] rounded-full bg-secondary-container text-on-secondary-container text-mono-sm font-semibold border border-secondary/20">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
                Done
              </span>
            )

            if (isProcessing) {
              statusBadge = (
                <span className="inline-flex items-center gap-xs px-sm py-[2px] rounded-full bg-tertiary-fixed text-on-tertiary-fixed-variant text-mono-sm font-semibold border border-tertiary/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-ping" />
                  Processing
                </span>
              )
            } else if (isFailed) {
              statusBadge = (
                <span className="inline-flex items-center gap-xs px-sm py-[2px] rounded-full bg-error-container text-on-error-container text-mono-sm font-semibold border border-error/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-error" />
                  Failed
                </span>
              )
            }

            return (
              <div
                key={job.id}
                className="bg-surface-container-lowest border border-outline-variant hover:border-outline hover:shadow-sm rounded-lg p-md flex flex-col md:flex-row items-stretch gap-md md:gap-lg transition-all duration-200"
              >
                {/* ID, status & Date */}
                <div className="flex flex-col justify-between md:w-[220px] shrink-0 border-b md:border-b-0 md:border-r border-outline-variant pb-sm md:pb-0 md:pr-md">
                  <div>
                    <div className="flex items-center gap-xs text-mono-sm text-outline-variant">
                      <span className="material-symbols-outlined text-[14px]">id_card</span>
                      <span className="font-mono text-xs">{job.id.substring(0, 8)}...</span>
                    </div>
                    <p className="text-body-sm text-on-surface-variant mt-xs">
                      {formatDate(job.created_at)}
                    </p>
                  </div>
                  <div className="mt-sm md:mt-auto">{statusBadge}</div>
                </div>

                {/* Job Description Sample */}
                <div className="flex-1 flex flex-col justify-center min-w-0">
                  <span className="text-label-md text-on-surface-variant uppercase tracking-wider flex items-center gap-xs mb-xs">
                    <span className="material-symbols-outlined text-[14px]">description</span>
                    Job Description Snippet
                  </span>
                  <p className="text-body-md text-on-surface leading-relaxed line-clamp-2 italic">
                    "{job.jd_text || 'No job description text provided.'}"
                  </p>
                </div>

                {/* Candidates count & View Action */}
                <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-sm pl-0 md:pl-md border-t md:border-t-0 md:border-l border-outline-variant pt-sm md:pt-0 min-w-[150px] shrink-0">
                  <div className="text-left md:text-right">
                    <span className="inline-flex items-center gap-xs px-sm py-[4px] rounded-full bg-surface-container-low text-primary text-mono-sm font-semibold border border-outline-variant">
                      <span className="material-symbols-outlined text-[14px]">person</span>
                      {job.candidate_count} Candidates
                    </span>
                  </div>

                  <button
                    disabled={isProcessing}
                    onClick={() => onSelectJob(job.id)}
                    className={`flex items-center justify-center gap-xs px-md py-sm bg-primary text-on-primary rounded-DEFAULT text-label-md transition-colors shadow-sm ${
                      isProcessing ? 'opacity-50 cursor-not-allowed' : 'hover:bg-primary-container'
                    }`}
                  >
                    View Results
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
