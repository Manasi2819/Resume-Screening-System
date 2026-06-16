import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'

export default function UploadPanel({ files, setFiles }) {
  const onDrop = useCallback((accepted) => {
    setFiles((prev) => {
      const existing = new Set(prev.map((f) => f.name))
      const newFiles = accepted.filter((f) => !existing.has(f.name))
      return [...prev, ...newFiles].slice(0, 20) // max 20
    })
  }, [setFiles])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 20,
  })

  const removeFile = (name) => setFiles((prev) => prev.filter((f) => f.name !== name))

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-lg flex flex-col gap-md h-full">
      <h3 className="text-headline-sm text-on-surface flex items-center gap-sm">
        <span className="material-symbols-outlined text-primary">description</span>
        Candidate Resumes
        <span className="text-body-sm text-on-surface-variant font-normal">(PDF only, max 20)</span>
      </h3>

      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-xl flex flex-col items-center justify-center text-center cursor-pointer h-44 shrink-0 transition-colors duration-200 ${
          isDragActive
            ? 'border-primary bg-surface-container'
            : 'border-outline-variant hover:border-outline hover:bg-surface-container-low'
        }`}
      >
        <input {...getInputProps()} />
        <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-sm transition-transform duration-200 ${isDragActive ? 'scale-110 bg-surface-container' : 'bg-surface-container'}`}>
          <span className="material-symbols-outlined text-primary" style={{ fontSize: 28 }}>upload_file</span>
        </div>
        <p className="text-headline-sm text-on-surface">
          {isDragActive ? 'Drop PDFs here' : 'Drag & drop PDF files here'}
        </p>
        <p className="text-body-sm text-on-surface-variant mt-xs">or click to browse from your computer</p>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="flex flex-col gap-sm overflow-y-auto custom-scroll flex-grow pr-xs">
          {files.map((file, i) => (
            <div
              key={file.name}
              className="bg-surface-container-lowest border border-outline-variant rounded-DEFAULT p-sm flex items-center justify-between gap-sm"
            >
              <div className="flex items-center gap-sm min-w-0">
                <span className="material-symbols-outlined text-secondary text-[20px] shrink-0">
                  check_circle
                </span>
                <div className="min-w-0">
                  <p className="text-body-sm font-semibold text-on-surface truncate">{file.name}</p>
                  <p className="text-mono-sm text-on-surface-variant">
                    {(file.size / 1024).toFixed(0)} KB
                  </p>
                </div>
              </div>
              <button
                onClick={() => removeFile(file.name)}
                className="text-on-surface-variant hover:text-error transition-colors shrink-0"
                title="Remove"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {files.length === 0 && (
        <p className="text-body-sm text-on-surface-variant text-center py-sm">
          No resumes added yet
        </p>
      )}

      {/* Count badge */}
      {files.length > 0 && (
        <div className="text-center">
          <span className="inline-flex items-center gap-xs px-sm py-xs bg-secondary-container text-on-secondary-container rounded-full text-mono-sm">
            <span className="material-symbols-outlined text-[14px]">description</span>
            {files.length} / 20 resumes ready
          </span>
        </div>
      )}
    </div>
  )
}
