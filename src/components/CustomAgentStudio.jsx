import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload,
  Sparkles,
  Brain,
  Cpu,
  CheckCircle2,
  Building2,
  X,
  FileText,
  Zap,
  Shield,
  Settings,
  ChevronRight,
  Trash2,
  Globe,
  Briefcase,
  Wrench,
  TrendingUp,
  BarChart3,
  ArrowRight,
  RotateCcw,
} from 'lucide-react'
import useReducedMotion from '../hooks/useReducedMotion'

const spring = { type: 'spring', stiffness: 300, damping: 20 }

const PHASES = ['configure', 'upload', 'training', 'validate', 'complete']
const PHASE_LABELS = {
  configure: 'Configure',
  upload: 'Upload',
  training: 'Train',
  validate: 'Validate',
  complete: 'Deploy',
}

const FOCUS_AREAS = [
  'Terminology Precision',
  'Tone & Voice',
  'Formatting Rules',
  'Regulatory Compliance',
  'Cultural Adaptation',
]

const BASE_MODELS = [
  {
    id: 'general',
    label: 'General Purpose',
    icon: Globe,
    description: 'Balanced model for diverse content types across all industries.',
  },
  {
    id: 'financial',
    label: 'Financial Specialist',
    icon: Briefcase,
    description: 'Optimised for banking, insurance, and regulatory financial content.',
  },
  {
    id: 'technical',
    label: 'Technical Specialist',
    icon: Wrench,
    description: 'Built for engineering, IT, and scientific documentation.',
  },
]

const EXTRACTION_STEPS = [
  {
    label: 'Extracting Style Patterns...',
    result: '847 patterns found',
  },
  {
    label: 'Building Terminology Index...',
    result: '1,247 terms indexed',
  },
  {
    label: 'Mapping Tone Fingerprint...',
    result: 'Formal-Corporate detected',
  },
  {
    label: 'Learning Formatting Rules...',
    result: '23 rules captured',
  },
]

const TRAINING_MESSAGES = [
  'Analyzing 342 content segments...',
  'Cross-referencing with industry standards...',
  'Calibrating confidence thresholds...',
]

const CAPABILITY_SCORES = [
  { label: 'Style Consistency', value: 96 },
  { label: 'Terminology Precision', value: 94 },
  { label: 'Tone Accuracy', value: 98 },
  { label: 'Format Compliance', value: 92 },
]

const EXTRACT_INFO = [
  'Style patterns',
  'Terminology preferences',
  'Tone fingerprint',
  'Formatting rules',
]

const VALIDATION_SAMPLES = [
  {
    id: 1,
    generic: 'The financial report must be submitted before the end of fiscal quarter for compliance review by the regulatory authority.',
    custom: 'The Financial Report shall be filed prior to fiscal quarter-end for Compliance Review by the Regulatory Authority.',
    highlights: ['Financial Report', 'shall be filed', 'prior to', 'fiscal quarter-end', 'Compliance Review', 'Regulatory Authority'],
  },
  {
    id: 2,
    generic: 'Please make sure all terms and conditions are checked and approved by the legal team before publishing.',
    custom: 'Ensure all Terms & Conditions receive Legal Team approval prior to publication.',
    highlights: ['Terms & Conditions', 'Legal Team', 'prior to publication'],
  },
  {
    id: 3,
    generic: 'The user interface should be easy to use and follow the company brand guidelines for consistency.',
    custom: 'The User Interface must adhere to Corporate Brand Guidelines to maintain visual consistency.',
    highlights: ['User Interface', 'adhere to', 'Corporate Brand Guidelines', 'visual consistency'],
  },
]

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileTypeBadge(name) {
  const ext = name.split('.').pop()?.toLowerCase()
  const map = { zip: 'ZIP', tmx: 'TMX', xliff: 'XLIFF', csv: 'CSV', xlf: 'XLIFF' }
  return map[ext] || ext?.toUpperCase() || 'FILE'
}

/* ---------- Step Indicator ---------- */
function StepIndicator({ currentPhase }) {
  const currentIdx = PHASES.indexOf(currentPhase)

  return (
    <div className="mb-8 flex items-center justify-center gap-1">
      {PHASES.map((phase, idx) => {
        const isActive = idx === currentIdx
        const isComplete = idx < currentIdx
        return (
          <div key={phase} className="flex items-center gap-1">
            <div className="flex flex-col items-center">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                  isActive
                    ? 'bg-[#5c7cfa] text-white'
                    : isComplete
                      ? 'bg-emerald-500 text-white'
                      : 'bg-gray-200 text-gray-500'
                }`}
              >
                {isComplete ? (
                  <CheckCircle2 size={14} />
                ) : (
                  idx + 1
                )}
              </div>
              <span
                className={`mt-1 text-[10px] font-medium ${
                  isActive
                    ? 'text-[#5c7cfa]'
                    : isComplete
                      ? 'text-emerald-400'
                      : 'text-gray-400'
                }`}
              >
                {PHASE_LABELS[phase]}
              </span>
            </div>
            {idx < PHASES.length - 1 && (
              <div
                className={`mb-4 h-0.5 w-8 transition-colors ${
                  idx < currentIdx ? 'bg-emerald-500' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ---------- Sparkle particle overlay ---------- */
function SparkleParticles({ count = 4 }) {
  const particles = useRef(
    Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 2,
      size: 12 + Math.random() * 10,
    }))
  ).current

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {particles.map((p) => (
        <motion.span
          key={p.id}
          className="absolute text-straker-600"
          style={{ left: `${p.x}%`, top: `${p.y}%` }}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0.5, 1.2, 0.5],
          }}
          transition={{
            duration: 2.4,
            delay: p.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <Sparkles size={p.size} />
        </motion.span>
      ))}
    </div>
  )
}

/* ---------- Configure State ---------- */
function ConfigureState({ config, onConfigChange, onNext }) {
  const { agentName, focusAreas, qualityTarget, baseModel } = config

  const canProceed = agentName.trim().length > 0 && focusAreas.length > 0

  const toggleFocus = (area) => {
    const next = focusAreas.includes(area)
      ? focusAreas.filter((a) => a !== area)
      : [...focusAreas, area]
    onConfigChange({ ...config, focusAreas: next })
  }

  return (
    <motion.div
      key="configure"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={spring}
      className="flex flex-col gap-6"
    >
      {/* Header */}
      <div className="text-center">
        <div className="mb-2 flex items-center justify-center gap-2">
          <Settings className="text-straker-600" size={24} />
          <h2
            className="text-2xl font-bold text-gray-900"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            Configure Your Agent
          </h2>
        </div>
        <p className="mx-auto max-w-md text-sm text-gray-500">
          Set up your custom agent before uploading training data.
        </p>
      </div>

      {/* Agent name */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-gray-500">
          Agent Name
        </label>
        <input
          type="text"
          value={agentName}
          onChange={(e) => onConfigChange({ ...config, agentName: e.target.value })}
          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-[#5c7cfa]"
          placeholder="e.g. Acme Corp Custom Agent"
        />
      </div>

      {/* Focus areas */}
      <div>
        <label className="mb-2 block text-xs font-medium text-gray-500">
          Focus Areas <span className="text-gray-400">(select at least 1)</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {FOCUS_AREAS.map((area) => {
            const selected = focusAreas.includes(area)
            return (
              <button
                key={area}
                type="button"
                onClick={() => toggleFocus(area)}
                className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                  selected
                    ? 'border-[#5c7cfa] bg-[rgba(92,124,250,0.15)] text-[#5c7cfa]'
                    : 'border-gray-300 bg-gray-50 text-gray-500 hover:border-gray-400'
                }`}
              >
                {selected && <CheckCircle2 size={12} className="mr-1 inline" />}
                {area}
              </button>
            )
          })}
        </div>
      </div>

      {/* Quality target slider */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-xs font-medium text-gray-500">Quality Target</label>
          <span
            className="text-sm font-semibold text-[#5c7cfa]"
            style={{ fontFamily: 'JetBrains Mono, monospace' }}
          >
            {qualityTarget}%
          </span>
        </div>
        <input
          type="range"
          min={85}
          max={99}
          value={qualityTarget}
          onChange={(e) =>
            onConfigChange({ ...config, qualityTarget: Number(e.target.value) })
          }
          className="slider-straker w-full accent-[#5c7cfa]"
        />
        <div className="mt-1 flex justify-between text-[10px] text-gray-400">
          <span>85%</span>
          <span>99%</span>
        </div>
      </div>

      {/* Base model selector */}
      <div>
        <label className="mb-2 block text-xs font-medium text-gray-500">
          Base Model
        </label>
        <div className="grid grid-cols-3 gap-3">
          {BASE_MODELS.map((model) => {
            const Icon = model.icon
            const selected = baseModel === model.id
            return (
              <button
                key={model.id}
                type="button"
                onClick={() => onConfigChange({ ...config, baseModel: model.id })}
                className={`flex flex-col items-center gap-2 rounded-lg border p-4 text-center transition-colors ${
                  selected
                    ? 'border-[#5c7cfa] bg-[rgba(92,124,250,0.1)]'
                    : 'border-gray-300 bg-gray-50 hover:border-gray-400'
                }`}
              >
                <Icon
                  size={24}
                  className={selected ? 'text-[#5c7cfa]' : 'text-gray-500'}
                />
                <span
                  className={`text-xs font-semibold ${
                    selected ? 'text-gray-900' : 'text-gray-500'
                  }`}
                >
                  {model.label}
                </span>
                <span className="text-[10px] leading-snug text-gray-500">
                  {model.description}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Next button */}
      <button
        onClick={onNext}
        disabled={!canProceed}
        className={`flex items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold transition-colors ${
          canProceed
            ? 'bg-[#5c7cfa] text-white hover:bg-[#4c6ef5]'
            : 'cursor-not-allowed bg-gray-200 text-gray-500'
        }`}
      >
        Next: Upload Training Data
        <ChevronRight size={16} />
      </button>
    </motion.div>
  )
}

/* ---------- Upload State ---------- */
function UploadState({ files, onFilesChange, onBeginTraining, trainingRound, trainingHistory }) {
  const [dragging, setDragging] = useState(false)
  const [infoOpen, setInfoOpen] = useState(false)
  const inputRef = useRef(null)

  const addFiles = useCallback(
    (newFiles) => {
      const arr = Array.from(newFiles)
      onFilesChange((prev) => {
        const existingNames = new Set(prev.map((f) => f.name))
        const unique = arr.filter((f) => !existingNames.has(f.name))
        return [...prev, ...unique]
      })
    },
    [onFilesChange]
  )

  const removeFile = useCallback(
    (name) => {
      onFilesChange((prev) => prev.filter((f) => f.name !== name))
    },
    [onFilesChange]
  )

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    setDragging(true)
  }, [])

  const handleDragLeave = useCallback((e) => {
    e.preventDefault()
    setDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault()
      setDragging(false)
      if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files)
    },
    [addFiles]
  )

  const handleInputChange = useCallback(
    (e) => {
      if (e.target.files?.length) addFiles(e.target.files)
      e.target.value = ''
    },
    [addFiles]
  )

  const totalSize = files.reduce((sum, f) => sum + f.size, 0)

  return (
    <motion.div
      key="upload"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={spring}
      className="flex flex-col items-center gap-6"
    >
      {/* Header */}
      <div className="text-center">
        <div className="mb-2 flex items-center justify-center gap-2">
          <Sparkles className="text-straker-600" size={24} />
          <h2
            className="text-2xl font-bold text-gray-900"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            {trainingRound > 1 ? `Training Round ${trainingRound}` : 'Train Your Own Agent'}
          </h2>
        </div>
        <p className="max-w-md text-sm text-gray-500">
          Upload your best verified outputs to create a custom AI agent that thinks
          like your team.
        </p>
      </div>

      {/* Previous Training summary (round 2+) */}
      {trainingRound > 1 && trainingHistory.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="w-full rounded-lg border border-gray-300 bg-gray-50 p-4"
        >
          <h4 className="mb-2 text-xs font-semibold text-gray-700">
            <RotateCcw size={12} className="mr-1.5 inline text-[#5c7cfa]" />
            Previous Training
          </h4>
          {trainingHistory.map((round) => (
            <p
              key={round.round}
              className="text-xs text-gray-500"
              style={{ fontFamily: 'JetBrains Mono, monospace' }}
            >
              Round {round.round}: {round.goldenRecords} golden records
              {round.scores.map((s) => (
                <span key={s.label}>
                  {' · '}
                  {s.value}% {s.label}
                </span>
              ))}
            </p>
          ))}
          <p className="mt-2 text-xs text-emerald-400/80">
            This round will build on your existing agent knowledge
          </p>
        </motion.div>
      )}

      {/* Dropzone */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`flex w-full cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-dashed px-8 py-12 transition-colors ${
          dragging
            ? 'border-straker-400 bg-[rgba(92,124,250,0.1)]'
            : 'border-gray-300 bg-white'
        }`}
      >
        <Upload size={64} className="text-gray-500" />
        <span className="text-lg font-semibold text-gray-700">
          Drop your Golden Records here
        </span>
        <span className="text-xs text-gray-500">
          .zip, .tmx, .xliff, .csv — Previous perfect outputs
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".zip,.tmx,.xliff,.csv"
        multiple
        className="hidden"
        onChange={handleInputChange}
      />

      {/* File list */}
      {files.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="w-full"
        >
          <div className="mb-2 text-xs text-gray-500">
            <span className="font-semibold text-gray-700">{files.length} file{files.length !== 1 ? 's' : ''} selected</span>
            {' · '}
            {formatFileSize(totalSize)} total
          </div>
          <div className="flex flex-col gap-2">
            {files.map((f) => (
              <div
                key={f.name}
                className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-2.5"
              >
                <div className="flex items-center gap-3">
                  <FileText size={16} className="text-straker-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{f.name}</p>
                    <p
                      className="text-[10px] text-gray-500"
                      style={{ fontFamily: 'JetBrains Mono, monospace' }}
                    >
                      {formatFileSize(f.size)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-gray-200 px-2 py-0.5 text-[10px] font-semibold text-gray-500">
                    {getFileTypeBadge(f.name)}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      removeFile(f.name)
                    }}
                    className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-200 hover:text-red-400"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Begin Training button */}
          <button
            onClick={onBeginTraining}
            className="mt-4 w-full rounded-lg bg-[#5c7cfa] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#4c6ef5]"
          >
            Begin Training
          </button>
        </motion.div>
      )}

      {/* Info accordion */}
      <div className="w-full">
        <button
          type="button"
          onClick={() => setInfoOpen((o) => !o)}
          className="flex items-center gap-2 text-sm text-straker-600 hover:underline"
        >
          <Zap size={14} />
          What are Golden Records?
          <span className="text-xs">{infoOpen ? '\u25B2' : '\u25BC'}</span>
        </button>
        <AnimatePresence>
          {infoOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <p className="mt-2 text-xs leading-relaxed text-gray-500">
                Golden Records are your highest-quality, approved outputs
                that represent the ideal output for your brand. The system will
                extract:
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {EXTRACT_INFO.map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-700"
                  >
                    <Shield size={12} className="text-emerald-400" />
                    {item}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

/* ---------- Training State ---------- */
function TrainingState({ completedSteps, activeStep, logMessages }) {
  const overallProgress =
    EXTRACTION_STEPS.length > 0
      ? (completedSteps / EXTRACTION_STEPS.length) * 100
      : 0

  return (
    <motion.div
      key="training"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={spring}
      className="flex flex-col items-center gap-8"
    >
      {/* Header */}
      <div className="text-center">
        <h2
          className="text-2xl font-bold text-gray-900"
          style={{ fontFamily: 'Inter, sans-serif' }}
        >
          Extracting Intelligence...
        </h2>
      </div>

      {/* Central brain icon + progress */}
      <div className="relative flex flex-col items-center gap-4">
        <motion.div
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
          className="rounded-full bg-gradient-to-br from-[#5c7cfa] to-[#34d399] p-5"
        >
          <Brain size={48} className="text-white" />
        </motion.div>

        {/* Overall progress bar */}
        <div className="h-1.5 w-48 overflow-hidden rounded-full bg-gray-200">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-[#5c7cfa] to-[#34d399]"
            initial={{ width: 0 }}
            animate={{ width: `${overallProgress}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
      </div>

      {/* Extraction steps */}
      <div className="flex w-full flex-col gap-3">
        {EXTRACTION_STEPS.map((step, idx) => {
          const isComplete = idx < completedSteps
          const isActive = idx === activeStep
          return (
            <motion.div
              key={step.label}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1, ...spring }}
              className="flex items-center gap-3"
            >
              {/* Status indicator */}
              <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center">
                {isComplete ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={spring}
                  >
                    <CheckCircle2 size={20} className="text-emerald-400" />
                  </motion.div>
                ) : isActive ? (
                  <motion.div
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                    className="h-4 w-4 rounded-full bg-[#5c7cfa]"
                  />
                ) : (
                  <div className="h-4 w-4 rounded-full border border-gray-300" />
                )}
              </div>

              {/* Label + progress */}
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span
                    className={`text-sm ${
                      isComplete
                        ? 'text-emerald-400'
                        : isActive
                          ? 'text-gray-900'
                          : 'text-gray-500'
                    }`}
                  >
                    {isComplete ? step.result : step.label}
                  </span>
                  {isComplete && (
                    <span
                      className="text-xs text-emerald-400"
                      style={{ fontFamily: 'JetBrains Mono, monospace' }}
                    >
                      100%
                    </span>
                  )}
                </div>
                {/* Step progress bar */}
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-gray-200">
                  <motion.div
                    className={`h-full rounded-full ${
                      isComplete
                        ? 'bg-emerald-400'
                        : isActive
                          ? 'bg-[#5c7cfa]'
                          : 'bg-transparent'
                    }`}
                    initial={{ width: 0 }}
                    animate={{
                      width: isComplete ? '100%' : isActive ? '60%' : '0%',
                    }}
                    transition={{ duration: 1.2, ease: 'easeOut' }}
                  />
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Streaming log */}
      <div className="w-full rounded-lg bg-gray-50 p-4">
        <div className="flex flex-col gap-1.5">
          {logMessages.map((msg, idx) => (
            <motion.p
              key={idx}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-gray-500"
              style={{ fontFamily: 'JetBrains Mono, monospace' }}
            >
              &gt; {msg}
            </motion.p>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

/* ---------- Validate State ---------- */
function ValidateState({ onDeploy, onRefine, baselineScore, customScore }) {
  const improvement = (customScore - baselineScore).toFixed(1)

  return (
    <motion.div
      key="validate"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={spring}
      className="flex flex-col gap-6"
    >
      {/* Header */}
      <div className="text-center">
        <div className="mb-2 flex items-center justify-center gap-2">
          <BarChart3 className="text-straker-600" size={24} />
          <h2
            className="text-2xl font-bold text-gray-900"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            Validation Results
          </h2>
        </div>
        <p className="mx-auto max-w-md text-sm text-gray-500">
          Comparing your custom agent against baseline on held-out content.
        </p>
      </div>

      {/* Overall score bar */}
      <div className="w-full rounded-lg border border-gray-300 bg-gray-50 p-5">
        <p className="mb-3 text-center text-sm font-semibold text-emerald-400">
          Your custom agent improves quality by{' '}
          <span
            className="text-base"
            style={{ fontFamily: 'JetBrains Mono, monospace' }}
          >
            +{improvement}%
          </span>{' '}
          on held-out content
        </p>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="text-gray-500">Baseline</span>
              <span
                className="text-gray-500"
                style={{ fontFamily: 'JetBrains Mono, monospace' }}
              >
                {baselineScore}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-gray-200">
              <motion.div
                className="h-full rounded-full bg-gray-400"
                initial={{ width: 0 }}
                animate={{ width: `${baselineScore}%` }}
                transition={{ duration: 0.6, delay: 0.2 }}
              />
            </div>
          </div>
          <ArrowRight size={16} className="mb-3 text-gray-400" />
          <div className="flex-1">
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="text-emerald-400">Custom Agent</span>
              <span
                className="text-emerald-400"
                style={{ fontFamily: 'JetBrains Mono, monospace' }}
              >
                {customScore}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-gray-200">
              <motion.div
                className="h-full rounded-full bg-emerald-400"
                initial={{ width: 0 }}
                animate={{ width: `${customScore}%` }}
                transition={{ duration: 0.6, delay: 0.4 }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Sample comparisons */}
      <div className="flex flex-col gap-3">
        <h4 className="text-xs font-semibold text-gray-500">Sample Comparisons</h4>
        {VALIDATION_SAMPLES.map((sample) => (
          <div
            key={sample.id}
            className="grid grid-cols-2 gap-3 rounded-lg border border-gray-300 bg-gray-50 p-4"
          >
            {/* Generic */}
            <div>
              <span className="mb-1.5 block text-[10px] font-semibold text-gray-500">
                Without Custom Agent
              </span>
              <p className="text-xs leading-relaxed text-gray-500">
                {sample.generic}
              </p>
            </div>
            {/* Custom */}
            <div>
              <span className="mb-1.5 block text-[10px] font-semibold text-emerald-500">
                With Custom Agent
              </span>
              <p className="text-xs leading-relaxed text-gray-700">
                {sample.custom.split(new RegExp(`(${sample.highlights.map((h) => h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'g')).map((part, i) =>
                  sample.highlights.includes(part) ? (
                    <span
                      key={i}
                      className="rounded bg-emerald-50 px-0.5 text-emerald-700"
                    >
                      {part}
                    </span>
                  ) : (
                    <span key={i}>{part}</span>
                  )
                )}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={onDeploy}
          className="flex-1 rounded-lg bg-[#4c6ef5] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#5c7cfa]"
        >
          Deploy Agent
        </button>
        <button
          onClick={onRefine}
          className="flex-1 rounded-lg border border-gray-300 py-3 text-sm font-semibold text-gray-700 transition-colors hover:border-gray-400 hover:text-gray-900"
        >
          Refine Training
        </button>
      </div>
    </motion.div>
  )
}

/* ---------- Score Progression Mini Chart ---------- */
function ScoreProgressionChart({ history }) {
  if (history.length < 2) return null

  const maxScore = 100
  const chartH = 60
  const chartW = 200
  const padding = 4
  const usableW = chartW - padding * 2
  const usableH = chartH - padding * 2

  // Average score per round
  const points = history.map((r) => {
    const avg = r.scores.reduce((sum, s) => sum + s.value, 0) / r.scores.length
    return { round: r.round, avg }
  })

  const minY = Math.min(...points.map((p) => p.avg)) - 2
  const rangeY = maxScore - minY || 1

  const coords = points.map((p, i) => {
    const x = padding + (i / (points.length - 1)) * usableW
    const y = padding + usableH - ((p.avg - minY) / rangeY) * usableH
    return { x, y, avg: p.avg, round: p.round }
  })

  const pathD = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ')

  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[10px] font-medium text-gray-500">Score Progression</span>
      <svg width={chartW} height={chartH} className="overflow-visible">
        <path d={pathD} fill="none" stroke="#5c7cfa" strokeWidth={2} />
        {coords.map((c) => (
          <g key={c.round}>
            <circle cx={c.x} cy={c.y} r={3} fill="#5c7cfa" />
            <text
              x={c.x}
              y={c.y - 8}
              textAnchor="middle"
              className="fill-gray-500"
              style={{ fontSize: '8px', fontFamily: 'JetBrains Mono, monospace' }}
            >
              {c.avg.toFixed(0)}%
            </text>
            <text
              x={c.x}
              y={chartH - 1}
              textAnchor="middle"
              className="fill-gray-400"
              style={{ fontSize: '7px', fontFamily: 'JetBrains Mono, monospace' }}
            >
              R{c.round}
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}

/* ---------- Complete State ---------- */
function CompleteState({ agentName, trainingRound, trainingHistory, previousScores, onDeploy, onContinue }) {
  const version = `v${trainingRound}.0`
  const totalRecords = trainingHistory.reduce((sum, r) => sum + r.goldenRecords, 0)
  const lastTrained = trainingHistory.length > 0
    ? trainingHistory[trainingHistory.length - 1].date
    : null

  return (
    <motion.div
      key="complete"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={spring}
      className="relative flex flex-col items-center gap-6"
    >
      <SparkleParticles count={4} />

      {/* Agent card */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={spring}
        className="relative w-full overflow-hidden rounded-lg border border-gray-300 bg-white p-8"
      >
        {/* Icon area */}
        <div className="mb-6 flex flex-col items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#5c7cfa] to-[#34d399]">
            <Building2 size={40} className="text-white" />
          </div>
          <div className="text-center">
            <h3
              className="text-xl font-bold text-gray-900"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              {agentName}
            </h3>
            <span
              className="text-xs text-gray-500"
              style={{ fontFamily: 'JetBrains Mono, monospace' }}
            >
              {version}
            </span>
          </div>
        </div>

        {/* Training history summary */}
        <div className="mb-4 text-center">
          <p
            className="text-xs text-gray-500"
            style={{ fontFamily: 'JetBrains Mono, monospace' }}
          >
            Trained over {trainingRound} round{trainingRound !== 1 ? 's' : ''}
            {' · '}{totalRecords} golden records
            {lastTrained && <>{' · '}Last trained: {lastTrained}</>}
          </p>
        </div>

        {/* Score progression chart (multi-round) */}
        {trainingHistory.length >= 2 && (
          <div className="mb-4 flex justify-center">
            <ScoreProgressionChart history={trainingHistory} />
          </div>
        )}

        {/* Badge row */}
        <div className="mb-6 flex flex-wrap items-center justify-center gap-2">
          {['847 style patterns', '1,247 terms', 'Formal-Corporate'].map(
            (badge) => (
              <span
                key={badge}
                className="rounded-full bg-gray-50 px-3 py-1 text-xs text-gray-700"
                style={{ fontFamily: 'JetBrains Mono, monospace' }}
              >
                {badge}
              </span>
            )
          )}
        </div>

        {/* Capability scores with deltas */}
        <div className="mb-6 grid grid-cols-2 gap-x-6 gap-y-3">
          {CAPABILITY_SCORES.map((cap) => {
            const prev = previousScores?.find((p) => p.label === cap.label)
            const delta = prev ? cap.value - prev.value : 0
            return (
              <div key={cap.label}>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs text-gray-500">{cap.label}</span>
                  <span className="flex items-center gap-1">
                    <span
                      className="text-xs text-emerald-400"
                      style={{ fontFamily: 'JetBrains Mono, monospace' }}
                    >
                      {cap.value}%
                    </span>
                    {delta > 0 && (
                      <span
                        className="text-[10px] text-emerald-400"
                        style={{ fontFamily: 'JetBrains Mono, monospace' }}
                      >
                        (+{delta})
                      </span>
                    )}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-gray-200">
                  <motion.div
                    className="h-full rounded-full bg-emerald-400"
                    initial={{ width: 0 }}
                    animate={{ width: `${cap.value}%` }}
                    transition={{ duration: 0.8, delay: 0.3 }}
                  />
                </div>
              </div>
            )
          })}
        </div>

        {/* Disclaimer */}
        <p className="mb-6 text-center text-xs leading-relaxed text-gray-500">
          This agent is uniquely trained on your data. It cannot be replicated by
          competitors.
        </p>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={onDeploy}
            className="flex-1 rounded-lg bg-[#4c6ef5] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#5c7cfa]"
          >
            Deploy to Project
          </button>
          <button
            onClick={onContinue}
            className="flex-1 rounded-lg border border-gray-300 py-3 text-sm font-semibold text-gray-700 transition-colors hover:border-gray-400 hover:text-gray-900"
          >
            Continue Training
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ========== Main Component ========== */
export default function CustomAgentStudio({
  isOpen,
  onClose,
  onAgentCreated,
  orgName,
}) {
  const prefersReducedMotion = useReducedMotion()
  const [phase, setPhase] = useState('configure') // 'configure' | 'upload' | 'training' | 'validate' | 'complete'
  const [files, setFiles] = useState([])
  const [completedSteps, setCompletedSteps] = useState(0)
  const [activeStep, setActiveStep] = useState(-1)
  const [logMessages, setLogMessages] = useState([])
  const [trainingRound, setTrainingRound] = useState(1)
  const [trainingHistory, setTrainingHistory] = useState([])
  const [previousScores, setPreviousScores] = useState(null)
  const [config, setConfig] = useState({
    agentName: `${orgName || ''} Custom Agent`.trim(),
    focusAreas: [],
    qualityTarget: 95,
    baseModel: 'general',
  })
  const timersRef = useRef([])

  // Update agent name when orgName changes
  useEffect(() => {
    setConfig((prev) => ({
      ...prev,
      agentName: prev.agentName || `${orgName || ''} Custom Agent`.trim(),
    }))
  }, [orgName])

  // Clean up all timeouts on unmount or phase change
  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
  }, [])

  useEffect(() => {
    return clearTimers
  }, [clearTimers])

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      clearTimers()
      setPhase('configure')
      setFiles([])
      setCompletedSteps(0)
      setActiveStep(-1)
      setLogMessages([])
      setTrainingRound(1)
      setTrainingHistory([])
      setPreviousScores(null)
      setConfig({
        agentName: `${orgName || ''} Custom Agent`.trim(),
        focusAreas: [],
        qualityTarget: 95,
        baseModel: 'general',
      })
    }
  }, [isOpen, clearTimers, orgName])

  // Training choreography
  useEffect(() => {
    if (phase !== 'training') return
    clearTimers()

    const stepDuration = 1500 // 1.5s per step
    const timers = []

    // Kick off first step immediately
    setActiveStep(0)
    setLogMessages([TRAINING_MESSAGES[0]])

    EXTRACTION_STEPS.forEach((_, idx) => {
      // Add a log message partway through
      if (idx < TRAINING_MESSAGES.length) {
        const logTimer = setTimeout(() => {
          setLogMessages((prev) => {
            const next = TRAINING_MESSAGES[idx]
            return prev.includes(next) ? prev : [...prev, next]
          })
        }, idx * stepDuration + 400)
        timers.push(logTimer)
      }

      // Complete step and activate next
      const completeTimer = setTimeout(() => {
        setCompletedSteps(idx + 1)
        if (idx + 1 < EXTRACTION_STEPS.length) {
          setActiveStep(idx + 1)
        } else {
          setActiveStep(-1)
        }
      }, (idx + 1) * stepDuration)
      timers.push(completeTimer)
    })

    // Transition to validate
    const finalTimer = setTimeout(() => {
      setPhase('validate')
    }, EXTRACTION_STEPS.length * stepDuration + 600)
    timers.push(finalTimer)

    timersRef.current = timers
    return clearTimers
  }, [phase, clearTimers])

  const handleConfigNext = useCallback(() => {
    setPhase('upload')
  }, [])

  const handleBeginTraining = useCallback(() => {
    setPhase('training')
    setCompletedSteps(0)
    setActiveStep(-1)
    setLogMessages([])
  }, [])

  const handleValidateDeploy = useCallback(() => {
    // Record this round in history before going to complete
    setTrainingHistory((prev) => [
      ...prev,
      {
        round: trainingRound,
        goldenRecords: 42,
        scores: CAPABILITY_SCORES.map((s) => ({ label: s.label, value: s.value })),
        date: new Date().toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
      },
    ])
    setPhase('complete')
  }, [trainingRound])

  const handleValidateRefine = useCallback(() => {
    // Record this round in history then go back to upload
    setTrainingHistory((prev) => [
      ...prev,
      {
        round: trainingRound,
        goldenRecords: 42,
        scores: CAPABILITY_SCORES.map((s) => ({ label: s.label, value: s.value })),
        date: new Date().toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
      },
    ])
    setPreviousScores(CAPABILITY_SCORES.map((s) => ({ label: s.label, value: s.value })))
    setTrainingRound((r) => r + 1)
    setPhase('upload')
    setFiles([])
    setCompletedSteps(0)
    setActiveStep(-1)
    setLogMessages([])
  }, [trainingRound])

  const handleDeploy = useCallback(() => {
    const agent = {
      name: config.agentName,
      version: `v${trainingRound}.0`,
      baseModel: config.baseModel,
      focusAreas: config.focusAreas,
      qualityTarget: config.qualityTarget,
      stylePatterns: 847,
      terms: 1247,
      tone: 'Formal-Corporate',
      formattingRules: 23,
      trainingRounds: trainingRound,
      scores: {
        styleConsistency: 96,
        terminologyPrecision: 94,
        toneAccuracy: 98,
        formatCompliance: 92,
      },
    }
    onAgentCreated?.(agent)
  }, [config, trainingRound, onAgentCreated])

  const handleContinueTraining = useCallback(() => {
    setPreviousScores(CAPABILITY_SCORES.map((s) => ({ label: s.label, value: s.value })))
    setTrainingRound((r) => r + 1)
    setPhase('upload')
    setFiles([])
    setCompletedSteps(0)
    setActiveStep(-1)
    setLogMessages([])
  }, [])

  if (!isOpen) return null

  const motionProps = prefersReducedMotion
    ? { initial: false, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {}

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          style={{ fontFamily: 'Inter, sans-serif' }}
        >
          {/* Backdrop click to close */}
          <div className="absolute inset-0" onClick={onClose} />

          {/* Modal content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={spring}
            className="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-8"
            {...(prefersReducedMotion ? motionProps : {})}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute right-4 top-4 rounded-lg p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
            >
              <X size={20} />
            </button>

            {/* Step indicator */}
            <StepIndicator currentPhase={phase} />

            {/* Phase content */}
            <AnimatePresence mode="wait">
              {phase === 'configure' && (
                <ConfigureState
                  config={config}
                  onConfigChange={setConfig}
                  onNext={handleConfigNext}
                />
              )}
              {phase === 'upload' && (
                <UploadState
                  files={files}
                  onFilesChange={setFiles}
                  onBeginTraining={handleBeginTraining}
                  trainingRound={trainingRound}
                  trainingHistory={trainingHistory}
                />
              )}
              {phase === 'training' && (
                <TrainingState
                  completedSteps={completedSteps}
                  activeStep={activeStep}
                  logMessages={logMessages}
                />
              )}
              {phase === 'validate' && (
                <ValidateState
                  onDeploy={handleValidateDeploy}
                  onRefine={handleValidateRefine}
                  baselineScore={84}
                  customScore={92.2}
                />
              )}
              {phase === 'complete' && (
                <CompleteState
                  agentName={config.agentName}
                  trainingRound={trainingRound}
                  trainingHistory={trainingHistory}
                  previousScores={previousScores}
                  onDeploy={handleDeploy}
                  onContinue={handleContinueTraining}
                />
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
