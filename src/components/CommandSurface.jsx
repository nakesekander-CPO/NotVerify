import { useRef, useState, useCallback, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText, Film, Clock, Globe, TrendingUp, Minus, Upload, Sparkles,
  ArrowRight, Bot, Zap, BookOpen, Shield, Database, Brain,
  ChevronDown, Check, X, Eye, EyeOff, ChevronRight, CheckCircle2, Info,
  GripVertical, Settings2, Puzzle, Plus, Layers,
} from 'lucide-react'
import IntelligenceFeed from './IntelligenceFeed'
import useReducedMotion from '../hooks/useReducedMotion'
import { detectDocumentType, estimatePageCount, ENSEMBLE_TEMPLATES } from '../data/campaignModel'

const SPRING = { type: 'spring', stiffness: 300, damping: 20 }

const ALL_LOCALES = [
  { code: 'ja', label: 'Japanese' }, { code: 'de', label: 'German' }, { code: 'zh', label: 'Chinese' },
  { code: 'fr', label: 'French' }, { code: 'es', label: 'Spanish' }, { code: 'ko', label: 'Korean' },
  { code: 'pt', label: 'Portuguese' }, { code: 'it', label: 'Italian' }, { code: 'nl', label: 'Dutch' },
  { code: 'ru', label: 'Russian' }, { code: 'ar', label: 'Arabic' }, { code: 'th', label: 'Thai' },
]

function recommendEnsemble(docType) {
  if (docType === 'Financial') return ENSEMBLE_TEMPLATES.find(t => t.id === 'financial')
  if (docType === 'Legal') return ENSEMBLE_TEMPLATES.find(t => t.id === 'legal')
  if (docType === 'Marketing') return ENSEMBLE_TEMPLATES.find(t => t.id === 'marketing')
  return ENSEMBLE_TEMPLATES.find(t => t.id === 'general') || ENSEMBLE_TEMPLATES[0]
}

/* ─── Launch Briefing ─────────────────────────────────────────── */

function LaunchBriefing({ file, defaultLocales, onConfirm, onCancel, prefersReduced }) {
  const [locales, setLocales] = useState(() => defaultLocales.length > 0 ? [...defaultLocales] : ['ja', 'de', 'zh'])
  const [showLocalePicker, setShowLocalePicker] = useState(false)

  const docType = detectDocumentType(file)
  const pageCount = estimatePageCount(file)
  const ensemble = recommendEnsemble(docType)
  const available = ALL_LOCALES.filter(l => !locales.includes(l.code))

  const removeLocale = (code) => setLocales(prev => prev.filter(l => l !== code))
  const addLocale = (code) => { setLocales(prev => [...prev, code]); setShowLocalePicker(false) }

  return (
    <motion.div
      initial={prefersReduced ? false : { opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={prefersReduced ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      className="w-full max-w-lg rounded-xl border border-black/[0.12] bg-white shadow-lg overflow-hidden"
    >
      {/* File info */}
      <div className="px-5 pt-5 pb-4 border-b border-black/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-straker-50 border border-straker-500/15 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5 text-straker-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold text-gray-900 truncate">{file.name}</p>
            <p className="text-[12px] text-gray-500">{docType} &middot; ~{pageCount} pages &middot; {(file.size / 1024).toFixed(0)} KB</p>
          </div>
        </div>
      </div>

      {/* Locale selector */}
      <div className="px-5 py-4 space-y-3">
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">Target Languages</label>
          <div className="flex flex-wrap items-center gap-1.5">
            {locales.map(code => {
              const locale = ALL_LOCALES.find(l => l.code === code)
              return (
                <span key={code} className="inline-flex items-center gap-1 bg-straker-50 border border-straker-500/20 text-straker-600 text-[12px] font-medium px-2.5 py-1 rounded-lg">
                  {code.toUpperCase()}
                  <button type="button" onClick={() => removeLocale(code)} className="ml-0.5 text-straker-400 hover:text-straker-600 cursor-pointer transition-colors" aria-label={`Remove ${locale?.label || code}`}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )
            })}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowLocalePicker(v => !v)}
                className="inline-flex items-center gap-1 text-[12px] text-gray-400 hover:text-gray-600 px-2 py-1 rounded-lg border border-dashed border-black/[0.12] hover:border-black/[0.20] cursor-pointer transition-all"
              >
                <Plus className="w-3 h-3" /> Add
              </button>
              <AnimatePresence>
                {showLocalePicker && available.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="absolute top-full left-0 mt-1 z-20 w-44 bg-white border border-black/[0.10] rounded-xl shadow-lg overflow-hidden"
                  >
                    <div className="max-h-[180px] overflow-y-auto py-1">
                      {available.map(l => (
                        <button key={l.code} type="button" onClick={() => addLocale(l.code)}
                          className="w-full text-left px-3 py-2 text-[12px] text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors">
                          {l.label} <span className="text-gray-400 ml-1">{l.code.toUpperCase()}</span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Ensemble recommendation */}
        {ensemble && (
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1.5">Ensemble</label>
            <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-gray-50 border border-black/[0.06]">
              <Bot className="w-4 h-4 text-straker-600 shrink-0" />
              <div className="min-w-0">
                <p className="text-[12px] font-medium text-gray-800">{ensemble.name}</p>
                <p className="text-[10px] text-gray-400">{ensemble.bestFor}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-5 pb-5 flex items-center gap-2">
        <button
          type="button"
          onClick={() => onConfirm(file, locales)}
          disabled={locales.length === 0}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-straker-600 hover:bg-straker-500 text-white text-[13px] font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Start Processing <ArrowRight className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2.5 rounded-lg border border-black/[0.10] text-gray-500 text-[13px] font-medium hover:bg-gray-50 transition-colors cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </motion.div>
  )
}

const PUBLISH_THRESHOLDS = [
  { value: 90, label: '90%' },
  { value: 92, label: '92%' },
  { value: 95, label: '95%' },
  { value: 98, label: '98%' },
  { value: 100, label: '100% (manual only)' },
]

const SIMULATION_PROJECTS = [
  { name: 'Q2 Earnings (JA, DE, ZH)', score: 96, consensus: 98 },
  { name: 'Product Launch (DE)', score: 94, consensus: 96 },
  { name: 'Annual Report (JA)', score: 97, consensus: 99 },
  { name: 'Legal Filing (DE)', score: 91, consensus: 93 },
  { name: 'Marketing Brief (ZH)', score: 88, consensus: 91 },
  { name: 'Board Minutes (JA, DE)', score: 95, consensus: 97 },
  { name: 'Investor Deck (JA, ZH)', score: 93, consensus: 95 },
  { name: 'Compliance Doc (DE)', score: 96, consensus: 98 },
]

const localeNames = {
  ja: 'JA', de: 'DE', zh: 'ZH', fr: 'FR', es: 'ES',
  ko: 'KO', 'pt-br': 'PT-BR', it: 'IT', nl: 'NL', ar: 'AR',
}

const WIDGET_STORAGE_KEY = 'nv-command-widgets-v2'

const DEFAULT_WIDGETS = [
  { id: 'intelligence', visible: true, collapsed: false },
  { id: 'org-health', visible: true, collapsed: true },
  { id: 'org-brain', visible: true, collapsed: true },
  { id: 'auto-publish', visible: true, collapsed: true },
  { id: 'smart-defaults', visible: true, collapsed: true },
  { id: 'connected-tools', visible: false, collapsed: false },
]

const WIDGET_LABELS = {
  'intelligence': 'Intelligence',
  'org-health': 'Org Health',
  'org-brain': 'Org Brain',
  'auto-publish': 'Auto-Publish',
  'smart-defaults': 'Smart Defaults',
  'connected-tools': 'Connected Tools',
}

function loadWidgetConfig() {
  try {
    const stored = localStorage.getItem(WIDGET_STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      return DEFAULT_WIDGETS.map(def => {
        const saved = parsed.find(w => w.id === def.id)
        return saved ? { ...def, ...saved } : def
      })
    }
  } catch { /* ignore */ }
  return DEFAULT_WIDGETS
}

function saveWidgetConfig(config) {
  try {
    localStorage.setItem(WIDGET_STORAGE_KEY, JSON.stringify(config))
  } catch { /* ignore */ }
}

/* ── Collapsible Widget Card ── */
function WidgetCard({ id, title, badge, icon: Icon, collapsed, onToggle, children, prefersReduced }) {
  return (
    <div className="rounded-lg border border-black/[0.12] bg-white overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2 px-4 py-3 text-left cursor-pointer hover:bg-black/[0.02] transition-colors"
        aria-expanded={!collapsed}
        aria-controls={`widget-${id}`}
      >
        {Icon && <Icon size={14} className="text-gray-400 shrink-0" />}
        <h3 className="text-[11px] font-semibold uppercase tracking-widest text-gray-600 flex-1">
          {title}
        </h3>
        {badge && (
          <span className="text-[11px] font-medium text-gray-400 mr-1">{badge}</span>
        )}
        <ChevronDown
          size={14}
          className={`text-gray-400 transition-transform ${collapsed ? '' : 'rotate-180'}`}
        />
      </button>
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            id={`widget-${id}`}
            initial={prefersReduced ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ── Customize Panel ── */
function CustomizePanel({ widgets, onUpdate, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.15 }}
      className="absolute top-full right-0 mt-2 w-56 bg-white border border-black/[0.12] rounded-lg shadow-lg z-20 p-3"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[12px] font-semibold text-gray-700">Show Widgets</span>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 cursor-pointer">
          <X size={14} />
        </button>
      </div>
      <div className="space-y-1">
        {Object.entries(WIDGET_LABELS).map(([id, label]) => {
          const w = widgets.find(w => w.id === id)
          const isVisible = w?.visible ?? true
          return (
            <button
              key={id}
              onClick={() => {
                const updated = widgets.map(w =>
                  w.id === id ? { ...w, visible: !w.visible } : w
                )
                onUpdate(updated)
              }}
              className="flex w-full items-center gap-2 px-2 py-1.5 rounded-md text-[12px] text-gray-600 hover:bg-black/[0.03] cursor-pointer transition-colors"
            >
              {isVisible ? (
                <Eye size={13} className="text-straker-600" />
              ) : (
                <EyeOff size={13} className="text-gray-300" />
              )}
              <span className={isVisible ? 'text-gray-700' : 'text-gray-400'}>{label}</span>
            </button>
          )
        })}
      </div>
      <button
        onClick={() => { onUpdate(DEFAULT_WIDGETS); onClose() }}
        className="mt-2 w-full text-center text-[11px] text-gray-400 hover:text-gray-600 cursor-pointer transition-colors"
      >
        Reset to default
      </button>
    </motion.div>
  )
}

/* ── Simulation Modal (from Auto-Publish) ── */
function SimulationModal({ threshold, onThresholdChange, onEnable, onWatchMode, onClose }) {
  const prefersReducedMotion = useReducedMotion()
  const [educationOpen, setEducationOpen] = useState(false)

  const results = useMemo(() => {
    return SIMULATION_PROJECTS.map(p => ({
      ...p,
      passes: p.consensus >= threshold,
    }))
  }, [threshold])

  const passCount = results.filter(r => r.passes).length
  const totalCount = results.length

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', backgroundColor: 'rgba(0,0,0,0.4)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.97 }}
        transition={prefersReducedMotion ? { duration: 0 } : SPRING}
        className="bg-white border border-black/[0.12] rounded-lg w-full max-w-[640px] max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 pb-4">
          <div className="flex items-center gap-2.5 mb-1.5">
            <Sparkles className="w-5 h-5 text-straker-600" />
            <h2 className="text-[17px] font-semibold text-gray-900">See what Auto-Publish would have done</h2>
          </div>
          <p className="text-[13px] text-gray-500 leading-relaxed">
            Based on Meridian Capital&rsquo;s project history, here&rsquo;s what would have happened at your selected threshold.
          </p>
        </div>

        <div className="px-6 pb-4">
          <div className="flex items-center gap-3">
            <span className="text-[12px] text-gray-400 font-medium">Consensus Threshold:</span>
            <select
              value={threshold}
              onChange={(e) => onThresholdChange(Number(e.target.value))}
              className="rounded-lg border border-black/[0.12] bg-gray-100 px-3 py-1.5 text-[12px] font-medium text-gray-900 outline-none transition-colors hover:border-black/[0.20] focus:border-straker-500/50"
            >
              {PUBLISH_THRESHOLDS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="px-6 pb-2">
          <div className="rounded-lg border border-black/[0.12] overflow-hidden">
            <div className="grid grid-cols-[1fr_60px_80px_140px] gap-2 px-4 py-2.5 bg-gray-100 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              <span>Project</span>
              <span className="text-center">Score</span>
              <span className="text-center">Consensus</span>
              <span className="text-right">Would Auto-Publish</span>
            </div>

            {results.map((project) => (
              <motion.div
                key={project.name}
                layout={!prefersReducedMotion}
                transition={prefersReducedMotion ? { duration: 0 } : { ...SPRING }}
                className="grid grid-cols-[1fr_60px_80px_140px] gap-2 px-4 py-2.5 border-t border-black/[0.06] items-center"
              >
                <span className="text-[12px] text-gray-700 truncate">{project.name}</span>
                <span className="text-[12px] text-gray-700 text-center font-mono">{project.score}%</span>
                <span className="text-[12px] text-gray-700 text-center font-mono">{project.consensus}%</span>
                <AnimatePresence mode="wait">
                  {project.passes ? (
                    <motion.span
                      key="pass"
                      initial={prefersReducedMotion ? false : { opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: 4 }}
                      transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.2 }}
                      className="flex items-center justify-end gap-1.5 text-[12px] text-emerald-600 font-medium"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Yes
                    </motion.span>
                  ) : (
                    <motion.span
                      key="fail"
                      initial={prefersReducedMotion ? false : { opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: 4 }}
                      transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.2 }}
                      className="flex items-center justify-end gap-1.5 text-[12px] text-gray-400"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>No <span className="text-[10px]">(below {threshold}%)</span></span>
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>

          <p className="mt-3 text-[12px] text-gray-500 text-center">
            <span className="text-gray-900 font-semibold">{passCount} of {totalCount}</span> projects would have auto-published &middot; <span className="text-emerald-600 font-medium">0 quality incidents</span>
          </p>
        </div>

        <div className="px-6 pt-3 pb-1">
          <button
            onClick={() => setEducationOpen(prev => !prev)}
            className="flex items-center gap-2 text-[12px] font-semibold text-gray-500 hover:text-gray-700 transition-colors cursor-pointer w-full"
          >
            <motion.span
              animate={{ rotate: educationOpen ? 90 : 0 }}
              transition={{ duration: 0.15 }}
              className="inline-flex"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </motion.span>
            How it works
          </button>
          <AnimatePresence>
            {educationOpen && (
              <motion.div
                initial={prefersReducedMotion ? false : { height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={prefersReducedMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
                transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.25, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <ul className="mt-2.5 mb-1 space-y-2 text-[12px] text-gray-500 leading-relaxed">
                  <li className="flex items-start gap-2">
                    <span className="w-1 h-1 rounded-full bg-gray-400 mt-1.5 shrink-0" />
                    Agent consensus is calculated across all active agents in your ensemble
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1 h-1 rounded-full bg-gray-400 mt-1.5 shrink-0" />
                    Only projects exceeding your threshold are auto-published — all others require manual review
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1 h-1 rounded-full bg-gray-400 mt-1.5 shrink-0" />
                    You can undo any auto-published project within 48 hours
                  </li>
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="p-6 pt-4 flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.97 }}
            onClick={onEnable}
            className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg flex items-center justify-center gap-2 cursor-pointer transition-colors text-[13px]"
          >
            <Zap className="w-4 h-4" />
            Enable Auto-Publish
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.97 }}
            onClick={onWatchMode}
            className="flex-1 h-11 bg-transparent border border-black/[0.12] hover:border-black/[0.2] text-gray-700 hover:text-gray-900 font-semibold rounded-lg flex items-center justify-center gap-2 cursor-pointer transition-colors text-[13px]"
          >
            <Eye className="w-4 h-4" />
            Start in Watch Mode
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ── Helper functions ── */
function computeAvgQuality(orgPatterns) {
  const trend = orgPatterns?.avgQualityTrend
  if (!trend || !Array.isArray(trend) || trend.length === 0) return 91
  const values = trend.map(t => t.value ?? t.score ?? t).filter(v => typeof v === 'number')
  if (values.length === 0) return 91
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length)
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                      */
/* ------------------------------------------------------------------ */

export default function CommandSurface({ onFileAccepted, onFileWithLocales, orgIntelligence, onRerun, onStartPredicted, onOpenTeamDirectory, onOpenOrgBrain, onOpenMarketplace, onOpenAgentStudio, userName, companyName, connectedIntegrations = [], onOpenIntegrations, onStartCampaign, defaultLocales = [] }) {
  const prefersReduced = useReducedMotion()
  const [feedToast, setFeedToast] = useState(null)
  const [showCustomize, setShowCustomize] = useState(false)
  const [widgets, setWidgets] = useState(loadWidgetConfig)
  const [isDragOver, setIsDragOver] = useState(false)
  const [pendingFile, setPendingFile] = useState(null) // file waiting for locale confirmation
  const customizeRef = useRef(null)
  const fileInputRef = useRef(null)
  const dropRef = useRef(null)

  // Auto-publish state
  const [publishMode, setPublishMode] = useState('off')
  const [threshold, setThreshold] = useState(95)
  const [showSimulation, setShowSimulation] = useState(false)
  const [hasSeenSimulation, setHasSeenSimulation] = useState(false)

  const m = (variants) => (prefersReduced ? {} : variants)

  // Persist widget config
  useEffect(() => { saveWidgetConfig(widgets) }, [widgets])

  // Close customize panel on outside click
  useEffect(() => {
    if (!showCustomize) return
    const handleClick = (e) => {
      if (customizeRef.current && !customizeRef.current.contains(e.target)) {
        setShowCustomize(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showCustomize])

  const toggleWidget = useCallback((id) => {
    setWidgets(prev => prev.map(w =>
      w.id === id ? { ...w, collapsed: !w.collapsed } : w
    ))
  }, [])

  // Intelligence feed actions
  const handleFeedAction = useCallback((action) => {
    switch (action.type) {
      case 'studio':
        onOpenAgentStudio?.()
        break
      case 'marketplace':
        onOpenMarketplace?.()
        break
      case 'diagnostics':
        onOpenOrgBrain?.()
        break
      case 'glossary':
        setFeedToast({ message: '3 terms added to J-GAAP Knowledge Base', type: 'success' })
        setTimeout(() => setFeedToast(null), 3000)
        break
      case 'rerun':
        setFeedToast({ message: 'Re-run scheduled for next available slot', type: 'info' })
        setTimeout(() => setFeedToast(null), 3000)
        break
      case 'report':
        setFeedToast({ message: 'Opening analytics report...', type: 'info' })
        setTimeout(() => setFeedToast(null), 2000)
        break
      default:
        console.log('Intelligence feed action:', action)
    }
  }, [onOpenAgentStudio, onOpenMarketplace, onOpenOrgBrain])

  // Auto-publish handlers
  const handleTogglePublish = () => {
    if (publishMode === 'off') {
      if (!hasSeenSimulation) {
        setShowSimulation(true)
      } else {
        setPublishMode('active')
      }
    } else {
      setPublishMode('off')
    }
  }

  const handleEnablePublish = () => {
    setHasSeenSimulation(true)
    setShowSimulation(false)
    setPublishMode('active')
  }

  const handleWatchMode = () => {
    setHasSeenSimulation(true)
    setShowSimulation(false)
    setPublishMode('watch')
  }

  // Drag & drop
  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    if (dropRef.current && !dropRef.current.contains(e.relatedTarget)) {
      setIsDragOver(false)
    }
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
    const file = e.dataTransfer?.files?.[0]
    if (file) setPendingFile(file)
  }, [])

  // Org intelligence data
  const org = orgIntelligence || {}
  const patterns = org.orgPatterns || {}
  const defaults = org.smartDefaults || {}
  const prediction = org.predictiveSuggestion || null
  const totalProjectsCompleted = patterns.totalProjectsCompleted || 156
  const totalWordsProcessed = patterns.totalWordsProcessed || '2.4M'
  const suggestedLocales = (defaults.suggestedLocales || []).map(l => l.toUpperCase()).join(', ')
  const suggestedVertical = defaults.suggestedVertical || ''
  const terminologyConsistency = patterns.terminologyConsistency?.current ?? 87
  const avgQuality = computeAvgQuality(patterns)

  const orgHealthStats = [
    { label: 'Avg Quality', value: `${avgQuality}%`, change: '+9pts / 6mo', icon: TrendingUp, color: 'text-emerald-600' },
    { label: 'Domain Precision', value: `${terminologyConsistency}%`, change: '+12% / 6mo', icon: TrendingUp, color: 'text-emerald-600' },
    { label: 'Compliance', value: '98.5%', change: '+3.2% / 3mo', icon: Shield, color: 'text-emerald-600' },
    { label: 'Custom Agents', value: '34%', change: '+18% / 6mo', icon: Database, color: 'text-amber-600' },
  ]

  const handleStartPredicted = () => {
    if (prediction && onStartPredicted) {
      onStartPredicted({
        projectName: prediction.projectName,
        locales: prediction.preloadedConfig?.locales,
        vertical: prediction.preloadedConfig?.vertical,
        glossary: prediction.preloadedConfig?.glossary,
      })
    }
  }

  const isOn = publishMode !== 'off'
  const isWatch = publishMode === 'watch'
  const isActive = publishMode === 'active'

  const getWidget = (id) => widgets.find(w => w.id === id)
  const visibleWidgets = widgets.filter(w => w.visible)

  return (
    <div className="w-full p-6 xl:p-8 2xl:p-10 pb-10 xl:pb-14">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.mp4,.mov,.avi,.webm,.txt,.csv"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) setPendingFile(file)
          e.target.value = ''
        }}
      />

      {/* ── Hero Section ── */}
      <motion.div
        className="flex flex-col items-center gap-4 mb-8"
        {...m({ initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: SPRING })}
      >
        {/* Greeting */}
        <div className="text-center">
          <h1 className="text-xl font-semibold text-gray-900 tracking-tight mb-1">
            Good morning, {userName || 'Alex'}.
          </h1>
          <p className="text-sm text-gray-500">
            {totalProjectsCompleted.toLocaleString()} projects &middot; {totalWordsProcessed} words processed
          </p>
        </div>

        {/* Predictive CTA */}
        <div className="w-full max-w-lg rounded-lg border border-black/[0.12] bg-[#f8f9ff] p-5">
          <div className="flex flex-col items-center text-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-straker-50 border border-straker-500/15 flex items-center justify-center">
              <Bot className="w-5 h-5 text-straker-600" />
            </div>
            <div>
              <h2 className="text-[15px] font-semibold text-gray-900 mb-1">
                It&rsquo;s Q3 Earnings season.
              </h2>
              <p className="text-[13px] text-gray-500 leading-relaxed max-w-md">
                {prediction?.prompt ||
                  "Your Q3 Earnings Report is due for processing. J-GAAP knowledge base (1,247 entries) and JA \u00b7 DE \u00b7 ZH targets are pre-loaded."}
              </p>
            </div>

            {/* Config pills */}
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              {(prediction?.preloadedConfig?.locales || ['ja', 'de', 'zh']).map((l) => (
                <span
                  key={l}
                  className="text-[11px] bg-straker-50 text-straker-600 px-2 py-0.5 rounded-md font-medium"
                >
                  {(localeNames[l] || l).toUpperCase()}
                </span>
              ))}
              <span className="text-[11px] bg-amber-50 text-amber-600 px-2 py-0.5 rounded-md font-medium">
                {prediction?.preloadedConfig?.vertical || 'Financial Services'}
              </span>
            </div>

            <button
              onClick={handleStartPredicted}
              className="w-full h-10 bg-straker-600 hover:bg-straker-500 text-white font-semibold rounded-lg flex items-center justify-center gap-2 cursor-pointer transition-colors text-[13px]"
            >
              Start Q3 Earnings Project
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Upload zone / Launch Briefing */}
        <AnimatePresence mode="wait">
          {pendingFile ? (
            <LaunchBriefing
              key="briefing"
              file={pendingFile}
              defaultLocales={defaultLocales}
              prefersReduced={prefersReduced}
              onConfirm={(file, locales) => {
                if (onFileWithLocales) {
                  onFileWithLocales(file, locales)
                } else {
                  onFileAccepted(file)
                }
                setPendingFile(null)
              }}
              onCancel={() => setPendingFile(null)}
            />
          ) : (
            <motion.div
              key="dropzone"
              initial={false}
              exit={prefersReduced ? { opacity: 0 } : { opacity: 0, scale: 0.97 }}
              ref={dropRef}
              role="button"
              tabIndex={0}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  fileInputRef.current?.click()
                }
              }}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`w-full max-w-lg cursor-pointer flex items-center gap-3 rounded-lg border-2 border-dashed px-5 py-3.5 transition-all ${
                isDragOver
                  ? 'border-straker-500 bg-straker-50 scale-[1.02]'
                  : 'border-black/[0.12] bg-gray-50 hover:border-black/[0.20]'
              }`}
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                isDragOver ? 'bg-straker-50' : 'bg-black/[0.03]'
              }`}>
                <Upload className={`w-4.5 h-4.5 transition-colors ${isDragOver ? 'text-straker-600' : 'text-gray-400'}`} />
              </div>
              <div className="min-w-0">
                <p className={`text-[13px] font-medium transition-colors ${isDragOver ? 'text-straker-600' : 'text-gray-700'}`}>
                  Or drop a new document here
                </p>
                <p className="text-[11px] text-gray-400">
                  .docx, .pdf, .pptx, .xlsx, .mp4
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Multi-document campaign CTA */}
        <button
          type="button"
          onClick={() => onStartCampaign?.()}
          className="w-full max-w-lg flex items-center justify-between gap-3 px-5 py-3.5 rounded-lg border border-black/[0.08] bg-white hover:border-[#009eda]/30 hover:bg-[#009eda]/[0.02] group cursor-pointer transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-black/[0.03] flex items-center justify-center shrink-0 group-hover:bg-[#009eda]/[0.08] transition-colors">
              <Layers className="w-4 h-4 text-gray-400 group-hover:text-[#009eda] transition-colors" />
            </div>
            <div className="text-left min-w-0">
              <p className="text-[13px] font-medium text-gray-700 group-hover:text-gray-900 transition-colors">
                Start a multi-document campaign
              </p>
              <p className="text-[11px] text-gray-400">
                Bulk upload · shared settings · quality heatmap
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#009eda] shrink-0 transition-colors" />
        </button>
      </motion.div>

      {/* ── Widget Grid ── */}
      <motion.div {...m({ initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { ...SPRING, delay: 0.2 } })}>
        {/* Header with customize button */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-[12px] text-gray-400">
            {visibleWidgets.length} widget{visibleWidgets.length !== 1 ? 's' : ''} visible
          </p>
          <div className="relative" ref={customizeRef}>
            <button
              onClick={() => setShowCustomize(prev => !prev)}
              className="flex items-center gap-1.5 text-[12px] text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              aria-label="Customize dashboard widgets"
            >
              <Settings2 size={13} />
              <span>Customize</span>
            </button>
            <AnimatePresence>
              {showCustomize && (
                <CustomizePanel
                  widgets={widgets}
                  onUpdate={(updated) => { setWidgets(updated); saveWidgetConfig(updated) }}
                  onClose={() => setShowCustomize(false)}
                />
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Widget cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Intelligence Feed */}
          {getWidget('intelligence')?.visible && (
            <div className="sm:col-span-2">
              <WidgetCard
                id="intelligence"
                title="Intelligence"
                icon={Zap}
                badge="5 items"
                collapsed={getWidget('intelligence')?.collapsed}
                onToggle={() => toggleWidget('intelligence')}
                prefersReduced={prefersReduced}
              >
                <IntelligenceFeed
                  orgIntelligence={org}
                  onActionClick={handleFeedAction}
                  onOpenTeamDirectory={onOpenTeamDirectory}
                  hideHeader
                />
                {/* Feed action toast */}
                <AnimatePresence>
                  {feedToast && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                      className={`mt-3 flex items-center gap-2 text-[12px] font-medium rounded-lg px-4 py-2.5 border ${
                        feedToast.type === 'success'
                          ? 'text-emerald-700 bg-emerald-500/8 border-emerald-500/15'
                          : 'text-straker-700 bg-straker-500/8 border-straker-500/15'
                      }`}
                    >
                      {feedToast.type === 'success' ? <CheckCircle2 size={14} /> : <Info size={14} />}
                      {feedToast.message}
                    </motion.div>
                  )}
                </AnimatePresence>
              </WidgetCard>
            </div>
          )}

          {/* Org Health */}
          {getWidget('org-health')?.visible && (
            <WidgetCard
              id="org-health"
              title="Org Health"
              icon={TrendingUp}
              collapsed={getWidget('org-health')?.collapsed}
              onToggle={() => toggleWidget('org-health')}
              prefersReduced={prefersReduced}
            >
              <div className="divide-y divide-black/[0.04]">
                {orgHealthStats.map((stat) => (
                  <div key={stat.label} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <stat.icon className={`w-3 h-3 ${stat.color} shrink-0`} />
                      <span className="text-[12px] text-gray-500 truncate">{stat.label}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[13px] font-semibold text-gray-900 font-mono">{stat.value}</span>
                      <span className="text-[10px] text-emerald-600 font-medium whitespace-nowrap">
                        {stat.change}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </WidgetCard>
          )}

          {/* Org Brain */}
          {getWidget('org-brain')?.visible && (
            <WidgetCard
              id="org-brain"
              title="Org Brain"
              icon={Brain}
              badge="34%"
              collapsed={getWidget('org-brain')?.collapsed}
              onToggle={() => toggleWidget('org-brain')}
              prefersReduced={prefersReduced}
            >
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[12px] text-gray-500">Knowledge Growth</span>
                    <span className="text-[11px] font-mono text-gray-700">34% coverage</span>
                  </div>
                  <div className="h-2 bg-black/[0.03] rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-straker-600 to-violet-400 rounded-full"
                      initial={{ width: '0%' }}
                      animate={{ width: '34%' }}
                      transition={{ duration: prefersReduced ? 0 : 0.8, delay: 0.3, ease: 'easeOut' }}
                    />
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1.5 font-mono">
                    1,247 entries &rarr; 34% coverage
                  </p>
                </div>

                <div className="bg-gray-100 border border-black/[0.06] rounded-lg px-3 py-2">
                  <p className="text-[11px] text-gray-500">
                    <span className="text-emerald-600 font-medium">Last learning:</span>{' '}
                    23 terms added from Q3 Earnings (2h ago)
                  </p>
                </div>

                <button
                  onClick={onOpenOrgBrain}
                  className="group flex items-center gap-1.5 text-[12px] font-medium text-straker-600 hover:text-straker-500 transition-colors cursor-pointer"
                >
                  View Org Brain
                  <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-1" />
                </button>
              </div>
            </WidgetCard>
          )}

          {/* Auto-Publish */}
          {getWidget('auto-publish')?.visible && (
            <WidgetCard
              id="auto-publish"
              title="Auto-Publish"
              icon={Zap}
              badge={isActive ? 'Active' : isWatch ? 'Watching' : 'Off'}
              collapsed={getWidget('auto-publish')?.collapsed}
              onToggle={() => toggleWidget('auto-publish')}
              prefersReduced={prefersReduced}
            >
              <div className="space-y-3">
                {/* Toggle + threshold */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleTogglePublish}
                    className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer shrink-0 ${
                      isActive
                        ? 'bg-emerald-500/50 border border-emerald-500/60'
                        : isWatch
                          ? 'bg-amber-500/50 border border-amber-500/60'
                          : 'bg-black/[0.08] border border-black/[0.12]'
                    }`}
                    role="switch"
                    aria-checked={isOn}
                    aria-label="Toggle autonomous publishing"
                  >
                    <span className={`absolute top-0.5 w-5 h-5 rounded-full transition-all ${
                      isActive
                        ? 'left-[26px] bg-emerald-400'
                        : isWatch
                          ? 'left-[26px] bg-amber-400'
                          : 'left-0.5 bg-gray-400'
                    }`} />
                  </button>
                  <span className="text-[12px] text-gray-700 font-medium">
                    {isActive ? 'Enabled' : isWatch ? 'Watch Mode' : 'Disabled'}
                  </span>
                  <div className="ml-auto flex items-center gap-2">
                    <span className="text-[11px] text-gray-400">Threshold:</span>
                    <select
                      value={threshold}
                      onChange={(e) => setThreshold(Number(e.target.value))}
                      className="rounded-md border border-black/[0.12] bg-gray-100 px-2 py-1 text-[11px] font-medium text-gray-900 outline-none"
                    >
                      {PUBLISH_THRESHOLDS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Status */}
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${
                    isActive ? 'bg-emerald-400 animate-pulse' : isWatch ? 'bg-amber-400 animate-pulse' : 'bg-gray-400'
                  }`} />
                  <span className={`text-[11px] font-medium ${
                    isActive ? 'text-emerald-600' : isWatch ? 'text-amber-600' : 'text-gray-400'
                  }`}>
                    {isActive
                      ? '12 projects auto-deployed this month \u00b7 0 incidents'
                      : isWatch
                        ? '3 projects would have auto-published this week'
                        : 'Manual review required for all projects'}
                  </span>
                </div>
              </div>
            </WidgetCard>
          )}

          {/* Connected Tools */}
          {getWidget('connected-tools')?.visible && (
            <WidgetCard
              id="connected-tools"
              title="Connected Tools"
              icon={Puzzle}
              badge={connectedIntegrations.length > 0 ? `${connectedIntegrations.length}` : '0'}
              collapsed={getWidget('connected-tools')?.collapsed}
              onToggle={() => toggleWidget('connected-tools')}
              prefersReduced={prefersReduced}
            >
              {connectedIntegrations.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-4 border border-dashed border-black/[0.10] rounded-lg">
                  <p className="text-[12px] text-gray-400 text-center">Connect your team's tools to unlock automated workflows</p>
                  <button
                    onClick={onOpenIntegrations}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium bg-[#009eda] text-white hover:bg-[#0089bf] cursor-pointer transition-colors"
                  >
                    <Plus size={13} />
                    Get Started
                  </button>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-3">
                    {connectedIntegrations.slice(0, 8).map(conn => (
                      <div
                        key={conn.id}
                        title={conn.name}
                        className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-white text-[11px] shrink-0"
                        style={{ backgroundColor: conn.color }}
                      >
                        {conn.letter}
                      </div>
                    ))}
                    {connectedIntegrations.length > 8 && (
                      <span className="text-[11px] text-gray-400">+{connectedIntegrations.length - 8} more</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-gray-500">
                      {connectedIntegrations.reduce((s, c) => s + (c.actionsCount || 0), 0)} actions this month
                    </span>
                    <button
                      onClick={onOpenIntegrations}
                      className="flex items-center gap-1 text-[12px] text-[#009eda] hover:underline cursor-pointer"
                    >
                      <Plus size={12} />
                      Connect
                    </button>
                  </div>
                </div>
              )}
            </WidgetCard>
          )}

          {/* Smart Defaults */}
          {getWidget('smart-defaults')?.visible && (suggestedLocales || suggestedVertical) && (
            <WidgetCard
              id="smart-defaults"
              title="Smart Defaults"
              icon={Sparkles}
              collapsed={getWidget('smart-defaults')?.collapsed}
              onToggle={() => toggleWidget('smart-defaults')}
              prefersReduced={prefersReduced}
            >
              <div className="space-y-2 text-[13px]">
                {suggestedVertical && (
                  <>
                    <div className="flex items-baseline justify-between">
                      <span className="text-gray-500">Vertical</span>
                      <span className="text-gray-700 font-medium">{suggestedVertical}</span>
                    </div>
                    <div className="h-px bg-black/[0.04]" />
                  </>
                )}
                <div className="flex items-baseline justify-between">
                  <span className="text-gray-500">Tone</span>
                  <span className="text-gray-700 font-medium">Formal</span>
                </div>
                {suggestedLocales && (
                  <>
                    <div className="h-px bg-black/[0.04]" />
                    <div className="flex items-baseline justify-between">
                      <span className="text-gray-500">Locales</span>
                      <span className="text-gray-700 font-medium">{suggestedLocales}</span>
                    </div>
                  </>
                )}
              </div>
              <p className="text-[11px] text-gray-400 mt-3">
                These learn from every project.
              </p>
            </WidgetCard>
          )}
        </div>
      </motion.div>

      {/* Simulation Modal */}
      <AnimatePresence>
        {showSimulation && (
          <SimulationModal
            threshold={threshold}
            onThresholdChange={setThreshold}
            onEnable={handleEnablePublish}
            onWatchMode={handleWatchMode}
            onClose={() => setShowSimulation(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
