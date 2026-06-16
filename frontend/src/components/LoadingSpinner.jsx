export default function LoadingSpinner({ message = 'Processing...' }) {
  const steps = [
    { label: 'Parsing PDFs', icon: 'description' },
    { label: 'Generating embeddings', icon: 'hub' },
    { label: 'Searching vector DB', icon: 'manage_search' },
    { label: 'Reranking results', icon: 'sort' },
    { label: 'Generating AI summaries', icon: 'auto_awesome' },
  ]

  return (
    <div className="flex flex-col items-center justify-center py-2xl gap-lg">
      {/* Animated spinner */}
      <div className="relative w-20 h-20">
        <svg className="w-full h-full animate-spin" viewBox="0 0 50 50">
          <circle
            cx="25" cy="25" r="20"
            fill="none"
            stroke="#e5eeff"
            strokeWidth="4"
          />
          <circle
            cx="25" cy="25" r="20"
            fill="none"
            stroke="#0058be"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray="90 60"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="material-symbols-outlined text-primary" style={{ fontSize: 24 }}>analytics</span>
        </div>
      </div>

      <div className="text-center">
        <h3 className="text-headline-sm text-on-surface mb-xs">AI Analysis in Progress</h3>
        <p className="text-body-sm text-on-surface-variant">
          This may take 30–60 seconds for the first run (model loading)
        </p>
      </div>

      {/* Pipeline steps */}
      <div className="flex flex-col gap-sm w-full max-w-xs">
        {steps.map((step, i) => (
          <div key={step.label} className="flex items-center gap-sm">
            <div className="w-6 h-6 rounded-full bg-surface-container flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-primary-fixed-dim" style={{ fontSize: 14 }}>
                {step.icon}
              </span>
            </div>
            <span className="text-body-sm text-on-surface-variant">{step.label}</span>
            <div className="ml-auto">
              <div className="w-4 h-1 bg-surface-container-high rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full animate-pulse"
                  style={{ width: '60%', animationDelay: `${i * 200}ms` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
