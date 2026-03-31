import { useState, useRef, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Upload, FileText, Film, Lock, CheckCircle2, X } from 'lucide-react'
import { useToast } from './ToastProvider'

const ACCEPTED_EXTENSIONS = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'mp4', 'mov', 'avi', 'webm', 'txt', 'csv']

function isFileTypeAccepted(file) {
  const ext = file.name.split('.').pop()?.toLowerCase()
  return ext && ACCEPTED_EXTENSIONS.includes(ext)
}

export default function Dropzone({ onFileAccepted, compact }) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [batchMode, setBatchMode] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [selectedFiles, setSelectedFiles] = useState([])
  const [uploadProgress, setUploadProgress] = useState(null)
  const [uploadSpeed, setUploadSpeed] = useState(null)
  const [uploadEta, setUploadEta] = useState(null)
  const [uploadStalled, setUploadStalled] = useState(false)
  const [showError, setShowError] = useState(false)
  const [rejectFlash, setRejectFlash] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const fileInputRef = useRef(null)
  const lastProgressRef = useRef({ value: 0, time: Date.now() })
  const stallTimerRef = useRef(null)
  const { addToast } = useToast()

  const hasFiles = batchMode ? selectedFiles.length > 0 : !!selectedFile
  const currentFileSize = batchMode
    ? selectedFiles.reduce((s, f) => s + f.size, 0)
    : (selectedFile?.size || 0)
  const isLargeFile = currentFileSize > 50 * 1024 * 1024

  // Simulate upload progress
  useEffect(() => {
    if (!hasFiles || uploadProgress === null) return
    if (uploadProgress >= 100) return

    const interval = isLargeFile ? 200 : 80
    const increment = isLargeFile
      ? () => Math.random() * 4 + 1
      : () => Math.random() * 15 + 5

    const timer = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) { clearInterval(timer); return 100 }
        const next = Math.min(100, prev + increment())

        if (isLargeFile) {
          const now = Date.now()
          const last = lastProgressRef.current
          const elapsed = (now - last.time) / 1000
          if (elapsed > 0) {
            const progressDelta = next - last.value
            const bytesUploaded = (progressDelta / 100) * currentFileSize
            const speed = bytesUploaded / elapsed / (1024 * 1024)
            const remaining = ((100 - next) / 100) * currentFileSize
            const eta = speed > 0 ? remaining / (speed * 1024 * 1024) : 0
            setUploadSpeed(Math.round(speed * 10) / 10)
            setUploadEta(Math.round(eta))
          }
          lastProgressRef.current = { value: next, time: now }
        }

        return next
      })
    }, interval)

    return () => clearInterval(timer)
  }, [hasFiles, uploadProgress, isLargeFile, currentFileSize])

  // Auto-trigger analysis when upload completes
  const autoTriggerRef = useRef(false)
  useEffect(() => {
    if (uploadProgress >= 100 && hasFiles && !autoTriggerRef.current) {
      autoTriggerRef.current = true
      setSubmitted(true)
      const fileToProcess = batchMode ? selectedFiles[0] : selectedFile
      // Small delay so user sees the completed state briefly
      setTimeout(() => onFileAccepted(fileToProcess), 600)
    }
  }, [uploadProgress, hasFiles, batchMode, selectedFiles, selectedFile, onFileAccepted])

  // Stall detection for large files
  useEffect(() => {
    if (!isLargeFile || !hasFiles || uploadProgress === null || uploadProgress >= 100) {
      setUploadStalled(false)
      return
    }
    clearTimeout(stallTimerRef.current)
    stallTimerRef.current = setTimeout(() => setUploadStalled(true), 5000)
    setUploadStalled(false)
    return () => clearTimeout(stallTimerRef.current)
  }, [uploadProgress, isLargeFile, hasFiles])

  // Reset speed/eta when upload completes or is cancelled
  useEffect(() => {
    if (uploadProgress === null || uploadProgress >= 100) {
      setUploadSpeed(null)
      setUploadEta(null)
      setUploadStalled(false)
    }
  }, [uploadProgress])

  // Clear error when file is selected
  useEffect(() => {
    if (hasFiles) setShowError(false)
  }, [hasFiles])

  const handleFile = (file) => {
    if (!file) return
    if (!isFileTypeAccepted(file)) {
      addToast('Unsupported file type. Accepted: PDF, DOCX, XLSX, PPTX, MP4, MOV', 'error')
      setRejectFlash(true)
      setTimeout(() => setRejectFlash(false), 400)
      return
    }
    if (batchMode) {
      setSelectedFiles((prev) => {
        if (prev.length >= 20) {
          addToast('Maximum 20 files allowed in batch mode', 'error')
          return prev
        }
        if (prev.some((f) => f.name === file.name && f.size === file.size)) return prev
        const next = [...prev, file]
        if (next.length === 1) setUploadProgress(0)
        return next
      })
      if (selectedFiles.length === 0) setUploadProgress(0)
    } else {
      setSelectedFile(file)
      setUploadProgress(0)
    }
  }

  const handleFiles = (files) => {
    Array.from(files).forEach(handleFile)
  }

  const removeFile = (index) => {
    setSelectedFiles((prev) => {
      const next = prev.filter((_, i) => i !== index)
      if (next.length === 0) setUploadProgress(null)
      return next
    })
  }

  const cancelUpload = () => {
    setSelectedFile(null)
    setSelectedFiles([])
    setUploadProgress(null)
    setUploadSpeed(null)
    setUploadEta(null)
    setUploadStalled(false)
    setSubmitted(false)
    autoTriggerRef.current = false
    lastProgressRef.current = { value: 0, time: Date.now() }
  }

  const handleDrag = useCallback((e) => { e.preventDefault(); e.stopPropagation() }, [])
  const handleDragIn = useCallback((e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true) }, [])
  const handleDragOut = useCallback((e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(false) }, [])
  const handleDrop = useCallback((e) => {
    e.preventDefault(); e.stopPropagation(); setIsDragOver(false)
    if (batchMode) {
      handleFiles(e.dataTransfer.files)
    } else {
      const file = e.dataTransfer.files?.[0]
      if (file) handleFile(file)
    }
  }, [batchMode])

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const getAutoDetection = (file) => {
    const ext = file.name.split('.').pop()?.toLowerCase()
    const pages = Math.max(1, Math.round(file.size / 25000))
    if (['mp4', 'mov', 'avi', 'webm'].includes(ext)) {
      const mins = Math.max(1, Math.round(file.size / (5 * 1024 * 1024)))
      return `Detected: ${ext.toUpperCase()} video, ~${mins} min`
    }
    if (ext === 'pdf') return `Detected: PDF document, ~${pages} pages`
    if (['doc', 'docx'].includes(ext)) return `Detected: Word document, ~${pages} pages`
    if (['xls', 'xlsx'].includes(ext)) return `Detected: Excel workbook, ${formatSize(file.size)}`
    return `Detected: ${ext?.toUpperCase()} file, ${formatSize(file.size)}`
  }

  const getFileIcon = (file) => {
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (['mp4', 'mov', 'avi', 'webm'].includes(ext)) return Film
    return FileText
  }

  const uploadDone = uploadProgress !== null && uploadProgress >= 100
  const batchTotalSize = selectedFiles.reduce((sum, f) => sum + f.size, 0)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {!compact && (
        <div className="text-center mb-8">
          <h1 className="text-[28px] font-semibold text-gray-900 tracking-tight mb-2">
            New Deployment Project
          </h1>
          <p className="text-[15px] text-gray-500 max-w-lg mx-auto leading-relaxed">
            Upload your document or video. Analysis begins automatically.
          </p>
        </div>
      )}

      <div className={`bg-gray-50 border border-black/[0.12] rounded-lg overflow-hidden${compact ? ' p-0' : ''}`}>
        {/* Mode toggle */}
        <div className="px-5 pt-4 pb-1">
          <div className="inline-flex rounded-lg border border-black/[0.12] p-0.5" role="radiogroup" aria-label="Upload mode">
            <button
              role="radio"
              aria-checked={!batchMode}
              onClick={() => { setBatchMode(false); setSelectedFiles([]); if (!selectedFile) setUploadProgress(null) }}
              className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-all cursor-pointer ${
                !batchMode ? 'bg-straker-600/20 text-straker-600' : 'text-gray-500 hover:text-gray-500'
              }`}
            >
              Single File
            </button>
            <button
              role="radio"
              aria-checked={batchMode}
              onClick={() => { setBatchMode(true); setSelectedFile(null); if (selectedFiles.length === 0) setUploadProgress(null) }}
              className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-all cursor-pointer ${
                batchMode ? 'bg-straker-600/20 text-straker-600' : 'text-gray-500 hover:text-gray-500'
              }`}
            >
              Batch Upload
            </button>
          </div>
        </div>

        {/* Dropzone */}
        <div
          role="button"
          tabIndex={0}
          aria-label={hasFiles
            ? batchMode
              ? `${selectedFiles.length} files selected. Press Enter to add more files.`
              : `File selected: ${selectedFile.name}. Press Enter to choose a different file.`
            : 'Upload file. Press Enter to browse or drag and drop a file.'
          }
          className={`
            relative p-10 border-2 border-dashed rounded-lg m-4 transition-all duration-200 cursor-pointer
            ${rejectFlash
              ? 'border-red-500 bg-red-500/[0.06]'
              : showError && !hasFiles
                ? 'border-red-500/50 bg-red-500/[0.03]'
                : isDragOver
                  ? 'border-straker-400 bg-straker-500/[0.08]'
                  : uploadDone
                    ? 'border-emerald-500/30 bg-emerald-500/[0.04]'
                    : 'border-black/[0.12] hover:border-black/[0.20] hover:bg-black/[0.02]'
            }
          `}
          onDragEnter={handleDragIn}
          onDragLeave={handleDragOut}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => !uploadDone && fileInputRef.current?.click()}
          onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !uploadDone) { e.preventDefault(); fileInputRef.current?.click() } }}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.mp4,.mov,.avi,.webm,.txt,.csv"
            multiple={batchMode}
            onChange={(e) => {
              if (batchMode) {
                handleFiles(e.target.files)
              } else {
                const f = e.target.files?.[0]
                if (f) handleFile(f)
              }
              e.target.value = ''
            }}
            aria-hidden="true"
            tabIndex={-1}
          />

          {/* Single file mode — file selected */}
          {!batchMode && selectedFile ? (
            <div className="flex flex-col items-center gap-3">
              <div className={`w-14 h-14 rounded-lg flex items-center justify-center transition-all ${
                uploadDone ? 'bg-emerald-50 border border-emerald-500/20' : 'bg-straker-50 border border-straker-500/20'
              }`}>
                {uploadDone ? (
                  <CheckCircle2 className="w-7 h-7 text-emerald-400" />
                ) : (() => { const Icon = getFileIcon(selectedFile); return <Icon className="w-7 h-7 text-straker-600" /> })()}
              </div>
              <div className="text-center">
                <p className="text-[15px] font-medium text-gray-900">{selectedFile.name}</p>
                <p className="text-[12px] text-gray-500 mt-0.5">{formatSize(selectedFile.size)}</p>
                {uploadDone && (
                  <>
                    <p className="text-[12px] text-emerald-400/80 font-medium mt-1">{getAutoDetection(selectedFile)}</p>
                    <p className="text-[12px] text-straker-600 mt-2 animate-pulse">Starting analysis...</p>
                  </>
                )}
              </div>

              {/* Upload progress bar */}
              {uploadProgress !== null && uploadProgress < 100 && (
                <div className="w-full max-w-xs mt-1">
                  <div className="h-1.5 bg-black/[0.03] rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${isLargeFile ? 'bg-gradient-to-r from-amber-500 to-straker-400' : 'bg-straker-400'}`}
                      initial={{ width: '0%' }}
                      animate={{ width: `${uploadProgress}%` }}
                      transition={{ duration: 0.1 }}
                    />
                  </div>
                  {isLargeFile && (
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-[11px] text-gray-500">{Math.round(uploadProgress)}%</span>
                      <div className="flex items-center gap-2 text-[11px] text-gray-500">
                        {uploadSpeed !== null && <span>{uploadSpeed} MB/s</span>}
                        {uploadEta !== null && uploadEta > 0 && <span>~{uploadEta}s remaining</span>}
                      </div>
                    </div>
                  )}
                  {uploadStalled && isLargeFile && (
                    <p className="text-[11px] text-amber-400/80 mt-1 text-center">Upload may be slow on your connection</p>
                  )}
                  {isLargeFile && (
                    <button
                      onClick={(e) => { e.stopPropagation(); cancelUpload() }}
                      className="mt-2 flex items-center gap-1 mx-auto text-[11px] text-gray-500 hover:text-red-400 transition-colors cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                      Cancel Upload
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : !batchMode ? (
            /* Single file mode — no file */
            <div className="flex flex-col items-center gap-4">
              <div className={`w-16 h-16 rounded-lg flex items-center justify-center transition-all duration-200 ${
                isDragOver ? 'bg-straker-500/20 scale-110' : 'bg-black/[0.03] border border-black/[0.12]'
              }`}>
                <Upload className={`w-7 h-7 transition-colors ${isDragOver ? 'text-straker-600' : 'text-gray-500'}`} />
              </div>
              <div className="text-center">
                <p className="text-[15px] text-gray-700">
                  <span className="text-straker-600 font-medium">Click to browse</span> or drag & drop
                </p>
                <p className="text-[12px] text-gray-500 mt-2">
                  PDF, DOCX, XLSX, PPTX, MP4, MOV up to 500MB
                </p>
              </div>
            </div>
          ) : selectedFiles.length > 0 ? (
            /* Batch mode — files selected */
            <div className="flex flex-col items-center gap-3">
              <div className={`w-14 h-14 rounded-lg flex items-center justify-center transition-all ${
                uploadDone ? 'bg-emerald-50 border border-emerald-500/20' : 'bg-straker-50 border border-straker-500/20'
              }`}>
                {uploadDone ? (
                  <CheckCircle2 className="w-7 h-7 text-emerald-400" />
                ) : (
                  <Upload className="w-7 h-7 text-straker-600" />
                )}
              </div>
              <div className="text-center">
                <p className="text-[14px] font-medium text-gray-900">{selectedFiles.length} files selected</p>
                <p className="text-[12px] text-gray-500 mt-0.5">{formatSize(batchTotalSize)} total</p>
                {uploadDone && (
                  <p className="text-[12px] text-straker-600 mt-2 animate-pulse">Starting analysis...</p>
                )}
              </div>

              {uploadProgress !== null && uploadProgress < 100 && (
                <div className="w-full max-w-xs mt-1">
                  <div className="h-1.5 bg-black/[0.03] rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${isLargeFile ? 'bg-gradient-to-r from-amber-500 to-straker-400' : 'bg-straker-400'}`}
                      initial={{ width: '0%' }}
                      animate={{ width: `${uploadProgress}%` }}
                      transition={{ duration: 0.1 }}
                    />
                  </div>
                  {isLargeFile && (
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-[11px] text-gray-500">{Math.round(uploadProgress)}%</span>
                      <div className="flex items-center gap-2 text-[11px] text-gray-500">
                        {uploadSpeed !== null && <span>{uploadSpeed} MB/s</span>}
                        {uploadEta !== null && uploadEta > 0 && <span>~{uploadEta}s remaining</span>}
                      </div>
                    </div>
                  )}
                  {isLargeFile && (
                    <button
                      onClick={(e) => { e.stopPropagation(); cancelUpload() }}
                      className="mt-2 flex items-center gap-1 mx-auto text-[11px] text-gray-500 hover:text-red-400 transition-colors cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                      Cancel Upload
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* Batch mode — no files */
            <div className="flex flex-col items-center gap-4">
              <div className={`w-16 h-16 rounded-lg flex items-center justify-center transition-all duration-200 ${
                isDragOver ? 'bg-straker-500/20 scale-110' : 'bg-black/[0.03] border border-black/[0.12]'
              }`}>
                <Upload className={`w-7 h-7 transition-colors ${isDragOver ? 'text-straker-600' : 'text-gray-500'}`} />
              </div>
              <div className="text-center">
                <p className="text-[15px] text-gray-700">
                  <span className="text-straker-600 font-medium">Click to browse</span> or drag & drop
                </p>
                <p className="text-[12px] text-gray-500 mt-2">
                  Drop files or click to browse (up to 20 files)
                </p>
                <p className="text-[12px] text-gray-500 mt-1">
                  PDF, DOCX, XLSX, PPTX, MP4, MOV up to 500MB each
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Batch file list */}
        {batchMode && selectedFiles.length > 0 && (
          <div className="px-5 -mt-2 mb-3">
            <div className="max-h-32 overflow-y-auto space-y-1 rounded-lg border border-black/[0.06] p-2 bg-gray-100">
              {selectedFiles.map((file, i) => {
                const Icon = getFileIcon(file)
                return (
                  <div key={`${file.name}-${i}`} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-black/[0.02]">
                    <Icon className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                    <span className="text-[12px] text-gray-700 truncate flex-1">{file.name}</span>
                    <span className="text-[11px] text-gray-500 shrink-0">{formatSize(file.size)}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeFile(i) }}
                      className="text-gray-500 hover:text-red-400 transition-colors cursor-pointer shrink-0"
                      aria-label={`Remove ${file.name}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Security footer */}
        <div className="px-5 pb-4 flex items-center gap-4 text-[12px] text-gray-500">
          <div className="flex items-center gap-1.5">
            <Lock className="w-3 h-3" aria-hidden="true" />
            <span>AES-256 encrypted</span>
          </div>
          <div className="w-px h-3 bg-black/[0.04]" aria-hidden="true" />
          <span>Data processed in-region</span>
          <div className="w-px h-3 bg-black/[0.04]" aria-hidden="true" />
          <span>Auto-deleted after 24h</span>
        </div>
      </div>
    </motion.div>
  )
}
