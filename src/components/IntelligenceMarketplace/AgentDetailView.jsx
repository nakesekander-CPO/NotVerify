import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, ArrowRight, Shield, Building2, Mic, Megaphone, Scale, Code, Heart,
  FileText, Globe, Activity, Briefcase, Landmark, Languages, Gavel,
  Star, Users, Clock, CheckCircle2, Lock, Eye, Zap, BarChart3,
  GitBranch, ShieldCheck, MapPin, Brain, BookOpen,
  PenTool, Repeat, Sparkles, Gauge, Video, Workflow, Bot, FileSearch,
} from 'lucide-react'
import useFocusTrap from '../../hooks/useFocusTrap'
import TrustScoreBadge from './TrustScoreBadge'
import { TYPE_COLORS, ICON_COLOR_MAP } from './data/marketplaceCategories'
import { MOCK_REVIEWS } from './data/marketplaceAgents'

const ICON_MAP = {
  Shield, Building2, Mic, Megaphone, Scale, Code, Heart, FileText,
  Globe, Activity, Briefcase, Landmark, Languages, Gavel,
  PenTool, Repeat, Sparkles, Gauge, BookOpen, Video, Workflow, Bot, FileSearch,
  Stethoscope: Heart,
}

const SPRING = { type: 'spring', damping: 30, stiffness: 300 }
const TABS = ['Overview', 'Capabilities', 'Trust & Safety', 'Integration', 'Reviews']

/* ── Radar Chart (adapted for light bg) ── */
function RadarChart({ scores, size = 140 }) {
  const axes = ['accuracy', 'speed', 'tone', 'regulatory']
  const labels = ['Accuracy', 'Speed', 'Tone', 'Regulatory']
  const center = size / 2
  const maxR = size / 2 - 20

  function polar(angle, r) {
    const rad = (angle - 90) * (Math.PI / 180)
    return { x: center + r * Math.cos(rad), y: center + r * Math.sin(rad) }
  }

  const points = axes.map((a, i) => {
    const angle = (360 / axes.length) * i
    const r = (scores[a] / 100) * maxR
    return polar(angle, r)
  })
  const poly = points.map(p => `${p.x},${p.y}`).join(' ')

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Grid rings */}
      {[0.25, 0.5, 0.75, 1].map(pct => (
        <polygon
          key={pct}
          points={axes.map((_, i) => {
            const p = polar((360 / axes.length) * i, maxR * pct)
            return `${p.x},${p.y}`
          }).join(' ')}
          fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="1"
        />
      ))}
      {/* Axes */}
      {axes.map((_, i) => {
        const p = polar((360 / axes.length) * i, maxR)
        return <line key={i} x1={center} y1={center} x2={p.x} y2={p.y} stroke="rgba(0,0,0,0.06)" strokeWidth="1" />
      })}
      {/* Data polygon */}
      <polygon points={poly} fill="rgba(0,158,218,0.15)" stroke="#009eda" strokeWidth="2" />
      {/* Dots */}
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill="#009eda" />
      ))}
      {/* Labels */}
      {axes.map((_, i) => {
        const p = polar((360 / axes.length) * i, maxR + 14)
        return (
          <text key={i} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central" fontSize="9" fill="#9ca3af">
            {labels[i]}
          </text>
        )
      })}
    </svg>
  )
}

/* ── Tab: Overview ── */
function OverviewTab({ agent }) {
  return (
    <div className="space-y-5">
      <p className="text-[13px] text-gray-600 leading-relaxed">{agent.longDescription}</p>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Trust Score', value: agent.trustScore, suffix: '/100', icon: ShieldCheck },
          { label: 'Avg Latency', value: agent.technical?.avgLatency || '—', icon: Clock },
          { label: 'Languages', value: agent.languages?.length || 0, icon: Globe },
          { label: 'Deployments', value: agent.usedBy?.toLocaleString() || '0', suffix: ' orgs', icon: Users },
        ].map(m => (
          <div key={m.label} className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <m.icon className="w-3 h-3 text-gray-400" />
              <span className="text-[10px] uppercase tracking-wider text-gray-400">{m.label}</span>
            </div>
            <p className="text-[16px] font-bold font-mono text-gray-900">
              {m.value}{m.suffix || ''}
            </p>
          </div>
        ))}
      </div>

      {/* Radar Chart */}
      <div className="flex justify-center">
        <RadarChart scores={agent.scores} size={180} />
      </div>

      {/* ROI Summary */}
      {agent.roi && (
        <div className="bg-emerald-50/50 border border-emerald-200/30 rounded-lg p-4">
          <p className="text-[10px] uppercase tracking-wider text-emerald-600 font-semibold mb-2">ROI Summary</p>
          <div className="flex items-center gap-4 text-[12px]">
            <span className="text-emerald-700 font-mono font-semibold">+{agent.roi.avgQualityLift}% quality</span>
            <span className="text-gray-400">·</span>
            <span className="text-emerald-700">{agent.roi.avgTimeSaved} saved</span>
            <span className="text-gray-400">·</span>
            <span className="text-gray-600">{agent.roi.tier} tier</span>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Tab: Capabilities ── */
function CapabilitiesTab({ agent }) {
  const [showTestDrive, setShowTestDrive] = useState(false)

  return (
    <div className="space-y-5">
      {/* Content Types */}
      <div>
        <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-2">Supported Content Types</p>
        <div className="flex flex-wrap gap-1.5">
          {agent.contentTypes?.map(ct => (
            <span key={ct} className="px-2 py-0.5 rounded-md text-[11px] bg-blue-50 text-blue-600 font-medium">{ct}</span>
          ))}
        </div>
      </div>

      {/* Languages */}
      <div>
        <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-2">Supported Languages</p>
        <div className="flex flex-wrap gap-1.5">
          {agent.languages?.map(lang => (
            <span key={lang} className="px-2 py-0.5 rounded-md text-[11px] bg-gray-100 text-gray-700 font-medium font-mono">
              {lang.toUpperCase()}
            </span>
          ))}
        </div>
      </div>

      {/* Score dimensions */}
      <div>
        <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-2">Domain Confidence</p>
        <div className="space-y-2">
          {Object.entries(agent.scores || {}).map(([key, val]) => (
            <div key={key} className="flex items-center gap-3">
              <span className="text-[11px] text-gray-500 w-20 capitalize">{key}</span>
              <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#009eda] transition-all"
                  style={{ width: `${val}%` }}
                />
              </div>
              <span className="text-[11px] font-mono text-gray-700 w-7 text-right">{val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Test Drive */}
      {agent.testDrive && (
        <div>
          <button
            onClick={() => setShowTestDrive(v => !v)}
            className="flex items-center gap-1.5 text-[12px] font-medium text-[#009eda] hover:text-[#0089c4] transition-colors cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
            {showTestDrive ? 'Hide Test Drive' : 'Show Test Drive'}
          </button>
          {showTestDrive && (
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1.5">Without Agent</p>
                <p className="text-[12px] text-gray-600 leading-relaxed">{agent.testDrive.before}</p>
                <span className="inline-block mt-2 px-1.5 py-0.5 rounded text-[10px] font-mono bg-red-50 text-red-600">
                  {agent.testDrive.baselineScore}%
                </span>
              </div>
              <div className="bg-emerald-50/50 rounded-lg p-3 border border-emerald-200/30">
                <p className="text-[10px] uppercase tracking-wider text-emerald-600 mb-1.5">With Agent</p>
                <p className="text-[12px] text-gray-700 leading-relaxed">{agent.testDrive.after}</p>
                <span className="inline-block mt-2 px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-100 text-emerald-700">
                  {agent.testDrive.boostedScore}%
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ── Tab: Trust & Safety ── */
function TrustSafetyTab({ agent }) {
  const c = agent.compliance || {}
  return (
    <div className="space-y-5">
      {/* Certifications */}
      <div>
        <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-2">Compliance Certifications</p>
        <div className="flex flex-wrap gap-2">
          {(c.certifications || []).map(cert => (
            <div key={cert} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-emerald-200/50 bg-emerald-50/30">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span className="text-[12px] font-medium text-emerald-700">{cert}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Privacy Rating */}
      <div>
        <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-2">Data Privacy Rating</p>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map(i => (
            <div
              key={i}
              className={`w-8 h-2 rounded-full ${i <= (c.privacyRating || 0) ? 'bg-emerald-400' : 'bg-gray-200'}`}
            />
          ))}
          <span className="ml-2 text-[12px] font-mono text-gray-700">{c.privacyRating}/5</span>
        </div>
      </div>

      {/* Data Residency */}
      <div>
        <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-2">Data Residency</p>
        <div className="flex flex-wrap gap-1.5">
          {(c.dataResidency || []).map(region => (
            <span key={region} className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] bg-blue-50 text-blue-600 font-medium">
              <MapPin className="w-3 h-3" /> {region}
            </span>
          ))}
        </div>
      </div>

      {/* Bias Audit */}
      <div>
        <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-2">Bias Audit Score</p>
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-emerald-400" style={{ width: `${c.biasAuditScore || 0}%` }} />
          </div>
          <span className="text-[12px] font-mono font-medium text-emerald-600">{c.biasAuditScore || '—'}</span>
        </div>
      </div>

      {/* Training Data Provenance */}
      <div>
        <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-2">Training Data Provenance</p>
        <p className="text-[12px] text-gray-600 leading-relaxed bg-gray-50 rounded-lg p-3">
          {c.trainingDataProvenance || 'Not disclosed'}
        </p>
      </div>

      {/* Last Audit */}
      <div className="flex items-center gap-2 text-[11px] text-gray-500">
        <Lock className="w-3 h-3" />
        Last security audit: {c.lastAuditDate || 'Unknown'}
      </div>
    </div>
  )
}

/* ── Tab: Integration ── */
function IntegrationTab({ agent }) {
  const t = agent.technical || {}
  const int = agent.integration || {}

  return (
    <div className="space-y-5">
      {/* Technical Specs */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Base Model', value: t.baseModel || '—' },
          { label: 'Version', value: t.version || '—' },
          { label: 'Context Window', value: t.contextWindow || '—' },
          { label: 'Avg Latency', value: t.avgLatency || '—' },
        ].map(s => (
          <div key={s.label} className="bg-gray-50 rounded-lg p-3">
            <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-0.5">{s.label}</p>
            <p className="text-[13px] font-mono font-medium text-gray-800">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Deployment Options */}
      <div>
        <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-2">Deployment Options</p>
        <div className="flex gap-2">
          {(int.deploymentOptions || []).map(opt => (
            <span key={opt} className="px-2.5 py-1 rounded-md text-[11px] bg-gray-100 text-gray-700 font-medium capitalize">
              {opt.replace('-', ' ')}
            </span>
          ))}
        </div>
      </div>

      {/* API Endpoint */}
      {int.apiEndpoint && (
        <div>
          <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-2">API Endpoint</p>
          <code className="block bg-gray-100 rounded-lg px-3 py-2 text-[11px] font-mono text-gray-700">
            {int.apiEndpoint}
          </code>
        </div>
      )}

      {/* Config Example */}
      {int.configExample && (
        <div>
          <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-2">Configuration Example</p>
          <pre className="bg-gray-900 rounded-lg px-4 py-3 text-[11px] font-mono text-emerald-400 overflow-x-auto">
            {JSON.stringify(int.configExample, null, 2)}
          </pre>
        </div>
      )}

      {/* Version History */}
      {t.versionHistory?.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-2">Version History</p>
          <div className="space-y-2">
            {t.versionHistory.map((v, i) => (
              <div key={v.version} className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <div className={`w-2 h-2 rounded-full mt-1 ${i === 0 ? 'bg-[#009eda]' : 'bg-gray-300'}`} />
                  {i < t.versionHistory.length - 1 && <div className="w-px h-6 bg-gray-200" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-mono font-semibold text-gray-800">{v.version}</span>
                    <span className="text-[10px] text-gray-400">{v.date}</span>
                  </div>
                  <p className="text-[11px] text-gray-500">{v.notes}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Tab: Reviews ── */
function ReviewsTab({ agent }) {
  const reviews = MOCK_REVIEWS.slice(0, 4)
  const stars = [5, 4, 3, 2, 1]
  // Mock distribution
  const dist = { 5: 65, 4: 22, 3: 8, 2: 3, 1: 2 }

  return (
    <div className="space-y-5">
      {/* Rating overview */}
      <div className="flex items-center gap-6">
        <div className="text-center">
          <p className="text-[32px] font-bold font-mono text-gray-900">{agent.rating}</p>
          <div className="flex items-center gap-0.5 justify-center">
            {[1, 2, 3, 4, 5].map(i => (
              <Star key={i} className={`w-3 h-3 ${i <= Math.round(agent.rating) ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
            ))}
          </div>
          <p className="text-[10px] text-gray-400 mt-1">{agent.reviewCount} reviews</p>
        </div>
        <div className="flex-1 space-y-1">
          {stars.map(s => (
            <div key={s} className="flex items-center gap-2">
              <span className="text-[10px] text-gray-400 w-3">{s}</span>
              <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-amber-400" style={{ width: `${dist[s]}%` }} />
              </div>
              <span className="text-[10px] text-gray-400 w-6 text-right">{dist[s]}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Reviews list */}
      <div className="space-y-3">
        {reviews.map(r => (
          <div key={r.id} className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-500">
                  {r.reviewer.charAt(0)}
                </div>
                <div>
                  <p className="text-[12px] font-medium text-gray-800">{r.reviewer}</p>
                  <p className="text-[10px] text-gray-400">{r.org}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map(i => (
                  <Star key={i} className={`w-2.5 h-2.5 ${i <= r.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
                ))}
              </div>
            </div>
            <p className="text-[11px] text-gray-600 leading-relaxed">{r.comment}</p>
            <p className="text-[9px] text-gray-400 mt-1.5">{r.date}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════
   Main Detail View
   ══════════════════════════════════════════════════ */
export default function AgentDetailView({ agent, isOpen, onClose, onDeploy, reducedMotion }) {
  const [activeTab, setActiveTab] = useState(0)
  const ref = useRef(null)
  useFocusTrap(ref, isOpen)

  // Reset tab on agent change
  useEffect(() => { setActiveTab(0) }, [agent?.id])

  // Escape to close
  useEffect(() => {
    if (!isOpen) return
    const h = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [isOpen, onClose])

  if (!agent) return null

  const IconComp = ICON_MAP[agent.icon] || Shield
  const iconColor = ICON_COLOR_MAP[agent.icon] || '#009eda'
  const typeColor = TYPE_COLORS[agent.type] || TYPE_COLORS['Agent']

  const tabContent = [
    <OverviewTab key="overview" agent={agent} />,
    <CapabilitiesTab key="capabilities" agent={agent} />,
    <TrustSafetyTab key="trust" agent={agent} />,
    <IntegrationTab key="integration" agent={agent} />,
    <ReviewsTab key="reviews" agent={agent} />,
  ]

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[75]">
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            ref={ref}
            className="absolute top-0 right-0 h-full w-full max-w-3xl bg-white border-l border-black/[0.12] flex flex-col"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={reducedMotion ? { duration: 0 } : SPRING}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-black/[0.12] shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${iconColor}15` }}>
                  <IconComp size={20} style={{ color: iconColor }} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-[16px] font-semibold text-gray-900 truncate">{agent.name}</h2>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${typeColor.bg} ${typeColor.text}`}>
                      {agent.type}
                    </span>
                    <span className="text-[10px] font-mono text-gray-400">{agent.technical?.version}</span>
                  </div>
                  <p className="text-[11px] text-gray-500">{agent.provider}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => onDeploy(agent)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#009eda] text-[13px] font-medium text-white hover:bg-[#0089c4] transition-colors cursor-pointer"
                >
                  Deploy <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-black/[0.06] transition-colors cursor-pointer"
                  aria-label="Close"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-black/[0.06] px-6 shrink-0">
              {TABS.map((tab, i) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(i)}
                  className={`px-3 py-2.5 text-[12px] font-medium border-b-2 transition-colors cursor-pointer ${
                    activeTab === i
                      ? 'text-[#009eda] border-[#009eda]'
                      : 'text-gray-500 border-transparent hover:text-gray-700'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-5" style={{ scrollbarWidth: 'thin' }}>
              {tabContent[activeTab]}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
