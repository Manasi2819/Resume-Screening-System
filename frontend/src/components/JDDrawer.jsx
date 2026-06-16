import { useEffect, useRef } from 'react'

/**
 * JDDrawer — a smooth slide-in right panel that shows the full Job Description.
 * Triggered from either the Results page or the Candidate Detail page.
 *
 * Props:
 *  - isOpen   {boolean}  controls visibility
 *  - onClose  {fn}       called when backdrop or X is clicked
 *  - jdText   {string}   the full job description text
 */
export default function JDDrawer({ isOpen, onClose, jdText }) {
  const drawerRef = useRef(null)

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape' && isOpen) onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  const wordCount = jdText ? jdText.trim().split(/\s+/).length : 0

  return (
    <>
      {/* ── Backdrop ──────────────────────────────────────────────────────── */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-40 transition-opacity duration-300"
        style={{
          backgroundColor: 'rgba(0,0,0,0.45)',
          backdropFilter: 'blur(2px)',
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
        }}
        aria-hidden="true"
      />

      {/* ── Drawer panel ──────────────────────────────────────────────────── */}
      <aside
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Job Description"
        className="fixed top-0 right-0 z-50 h-full flex flex-col bg-surface border-l border-outline-variant shadow-2xl"
        style={{
          width: 'clamp(320px, 38vw, 560px)',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.32s cubic-bezier(0.4, 0, 0.2, 1)',
          willChange: 'transform',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-lg py-md border-b border-outline-variant shrink-0 bg-surface-container-lowest">
          <div className="flex items-center gap-sm">
            <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-[18px]">assignment</span>
            </div>
            <div>
              <h2 className="text-headline-sm text-on-surface font-semibold leading-tight">
                Job Description
              </h2>
              <p className="text-mono-sm text-on-surface-variant">
                {wordCount.toLocaleString()} words
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            id="jd-drawer-close"
            className="w-8 h-8 flex items-center justify-center rounded-full text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors"
            title="Close (Esc)"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Accent bar */}
        <div className="h-[3px] w-full bg-gradient-to-r from-primary via-secondary to-tertiary shrink-0" />

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto custom-scroll px-lg py-lg">
          {jdText ? (
            <p className="text-body-md text-on-surface leading-relaxed whitespace-pre-wrap select-text font-sans">
              {jdText}
            </p>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-on-surface-variant gap-sm">
              <span className="material-symbols-outlined text-[48px] text-outline">description</span>
              <p className="text-body-md">No job description available.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-lg py-sm border-t border-outline-variant shrink-0 bg-surface-container-lowest">
          <div className="flex items-center gap-xs text-mono-sm text-on-surface-variant">
            <span className="material-symbols-outlined text-[14px] text-secondary">check_circle</span>
            This is the JD used for AI screening
          </div>
        </div>
      </aside>
    </>
  )
}
