import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'

/**
 * JD Panel — supports two modes:
 *  1. Paste Text:  traditional textarea
 *  2. Upload PDF:  drag & drop JD PDF file
 */
export default function JDPanel({ jdText, setJdText, jdPdf, setJdPdf }) {
  const [mode, setMode] = useState('text') // 'text' | 'pdf'

  // Dropzone for JD PDF
  const onDrop = useCallback((accepted) => {
    if (accepted.length > 0) setJdPdf(accepted[0])
  }, [setJdPdf])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
  })

  const switchMode = (m) => {
    setMode(m)
    if (m === 'text') setJdPdf(null)
    if (m === 'pdf')  setJdText('')
  }

  const hasContent = mode === 'text' ? jdText.trim().length > 0 : jdPdf !== null

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-lg flex flex-col h-full overflow-hidden">
      {/* Header + tabs */}
      <div className="px-lg pt-lg pb-md shrink-0">
        <h3 className="text-headline-sm text-on-surface flex items-center gap-sm mb-md">
          <span className="material-symbols-outlined text-primary">assignment</span>
          Job Description
        </h3>

        {/* Mode tabs */}
        <div className="flex gap-xs bg-surface-container rounded-sm p-xs">
          <button
            onClick={() => switchMode('text')}
            className={`tab-btn flex-1 flex items-center justify-center gap-xs ${mode === 'text' ? 'active' : ''}`}
          >
            <span className="material-symbols-outlined text-[16px]">edit_note</span>
            Paste Text
          </button>
          <button
            onClick={() => switchMode('pdf')}
            className={`tab-btn flex-1 flex items-center justify-center gap-xs ${mode === 'pdf' ? 'active' : ''}`}
          >
            <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
            Upload PDF
          </button>
        </div>
      </div>

      {/* ── Text mode ─────────────────────────────────────────────────────── */}
      {mode === 'text' && (
        <>
          {/* Toolbar */}
          <div className="border-t border-b border-outline-variant bg-surface px-lg py-xs flex items-center gap-sm shrink-0">
            <button
              onClick={() => {
                navigator.clipboard.readText().then(setJdText).catch(() => {})
              }}
              title="Paste from clipboard"
              className="flex items-center gap-xs text-body-sm text-on-surface-variant hover:text-primary transition-colors px-sm py-xs rounded-sm hover:bg-surface-container"
            >
              <span className="material-symbols-outlined text-[18px]">content_paste</span>
              Paste
            </button>
            {jdText && (
              <button
                onClick={() => setJdText('')}
                title="Clear"
                className="flex items-center gap-xs text-body-sm text-on-surface-variant hover:text-error transition-colors px-sm py-xs rounded-sm hover:bg-surface-container ml-auto"
              >
                <span className="material-symbols-outlined text-[18px]">clear</span>
                Clear
              </button>
            )}
          </div>

          <textarea
            className="w-full flex-grow p-lg bg-transparent border-none focus:ring-0 resize-none text-body-md text-on-surface custom-scroll placeholder:text-outline"
            placeholder="Paste the full job description here.&#10;&#10;Include:&#10;• Required skills and technologies&#10;• Years of experience needed&#10;• Responsibilities&#10;• Nice-to-have qualifications"
            value={jdText}
            onChange={(e) => setJdText(e.target.value)}
          />

          <div className="px-lg py-sm border-t border-outline-variant shrink-0">
            <span className="text-mono-sm text-on-surface-variant">
              {jdText.length} characters
              {jdText.length > 0 && jdText.length < 50 && (
                <span className="text-error ml-sm">— need at least 50 characters</span>
              )}
            </span>
          </div>
        </>
      )}

      {/* ── PDF upload mode ───────────────────────────────────────────────── */}
      {mode === 'pdf' && (
        <div className="flex-grow flex flex-col items-center justify-center p-lg gap-md">
          {!jdPdf ? (
            <div
              {...getRootProps()}
              className={`w-full h-48 border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-center cursor-pointer transition-colors duration-200 ${
                isDragActive
                  ? 'border-primary bg-surface-container'
                  : 'border-outline-variant hover:border-outline hover:bg-surface-container-low'
              }`}
            >
              <input {...getInputProps()} />
              <div className="w-14 h-14 rounded-full bg-surface-container flex items-center justify-center mb-sm">
                <span className="material-symbols-outlined text-primary" style={{ fontSize: 28 }}>upload_file</span>
              </div>
              <p className="text-headline-sm text-on-surface">
                {isDragActive ? 'Drop JD PDF here' : 'Upload Job Description PDF'}
              </p>
              <p className="text-body-sm text-on-surface-variant mt-xs">
                Drag & drop or click to browse
              </p>
            </div>
          ) : (
            <div className="w-full flex flex-col gap-md">
              {/* Uploaded file card */}
              <div className="bg-surface-container-low border border-outline-variant rounded-lg p-md flex items-center gap-md">
                <span className="material-symbols-outlined text-primary text-[32px]">picture_as_pdf</span>
                <div className="flex-1 min-w-0">
                  <p className="text-body-md font-semibold text-on-surface truncate">{jdPdf.name}</p>
                  <p className="text-mono-sm text-on-surface-variant">
                    {(jdPdf.size / 1024).toFixed(0)} KB · JD PDF ready
                  </p>
                </div>
                <button
                  onClick={() => setJdPdf(null)}
                  className="text-on-surface-variant hover:text-error transition-colors"
                  title="Remove"
                >
                  <span className="material-symbols-outlined text-[20px]">delete</span>
                </button>
              </div>

              <p className="text-body-sm text-on-surface-variant text-center">
                The system will extract the JD text from this PDF automatically.
              </p>

              <button
                onClick={() => setJdPdf(null)}
                className="text-body-sm text-primary hover:underline mx-auto"
              >
                Replace PDF
              </button>
            </div>
          )}
        </div>
      )}

      {/* Bottom status */}
      {hasContent && (
        <div className="px-lg py-sm border-t border-outline-variant shrink-0">
          <span className="inline-flex items-center gap-xs text-mono-sm text-secondary">
            <span className="material-symbols-outlined text-[14px]">check_circle</span>
            Job description ready
          </span>
        </div>
      )}
    </div>
  )
}
