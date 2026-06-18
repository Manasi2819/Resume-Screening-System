import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'

/** Returns an appropriate Material Symbol icon for the uploaded JD file type */
function jdFileIcon(filename = '') {
  const ext = filename.split('.').pop()?.toLowerCase()
  if (ext === 'pdf') return 'picture_as_pdf'
  if (ext === 'docx' || ext === 'doc') return 'description'
  if (['png', 'jpg', 'jpeg', 'webp'].includes(ext)) return 'image'
  if (ext === 'txt') return 'text_snippet'
  return 'insert_drive_file'
}

/**
 * JD Panel — supports two modes:
 *  1. Paste Text:  traditional textarea
 *  2. Upload File: drag & drop JD as PDF / DOCX / TXT / image
 */
export default function JDPanel({ jdText, setJdText, jdPdf, setJdPdf }) {
  const [mode, setMode] = useState('text') // 'text' | 'file'

  // Dropzone for JD file (any supported type)
  const onDrop = useCallback((accepted) => {
    if (accepted.length > 0) setJdPdf(accepted[0])
  }, [setJdPdf])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'image/png':  ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/webp': ['.webp'],
      'text/plain': ['.txt'],
    },
    maxFiles: 1,
  })

  const switchMode = (m) => {
    setMode(m)
    if (m === 'text') setJdPdf(null)
    if (m === 'file') setJdText('')
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
            onClick={() => switchMode('file')}
            className={`tab-btn flex-1 flex items-center justify-center gap-xs ${mode === 'file' ? 'active' : ''}`}
          >
            <span className="material-symbols-outlined text-[16px]">upload_file</span>
            Upload File
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
            placeholder={"Paste the full job description here.\n\nInclude:\n• Required skills and technologies\n• Years of experience needed\n• Responsibilities\n• Nice-to-have qualifications"}
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

      {/* ── File upload mode ───────────────────────────────────────────────── */}
      {mode === 'file' && (
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
                {isDragActive ? 'Drop JD file here' : 'Upload Job Description'}
              </p>
              <p className="text-body-sm text-on-surface-variant mt-xs">
                Supports PDF, Word (.docx), TXT, PNG, JPG, WEBP
              </p>
            </div>
          ) : (
            <div className="w-full flex flex-col gap-md">
              {/* Uploaded file card */}
              <div className="bg-surface-container-low border border-outline-variant rounded-lg p-md flex items-center gap-md">
                <span className="material-symbols-outlined text-primary text-[32px]">
                  {jdFileIcon(jdPdf.name)}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-body-md font-semibold text-on-surface truncate">{jdPdf.name}</p>
                  <p className="text-mono-sm text-on-surface-variant">
                    {(jdPdf.size / 1024).toFixed(0)} KB · JD file ready
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
                The system will extract the JD text from this file automatically.
              </p>

              <button
                onClick={() => setJdPdf(null)}
                className="text-body-sm text-primary hover:underline mx-auto"
              >
                Replace file
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
