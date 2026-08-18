import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowLeft, TrendingUp, TrendingDown, BarChart3, Clock, Shield,
  Brain, Zap, Globe, AlertTriangle, CheckCircle2, Users, FileText,
} from 'lucide-react'
import useReducedMotion from '../hooks/useReducedMotion'

/* ─── Mock Data ──────────────────────────────────────────────── */

const MONTHLY_JOBS = [
  { month: 'Oct', jobs: 18, quality: 82, escalations: 6, credits: 340 },
  { month: 'Nov', jobs: 24, quality: 84, escalations: 5, credits: 480 },
  { month: 'Dec', jobs: 19, quality: 85, escalations: 4, credits: 390 },
  { month: 'Jan', jobs: 31, quality: 86, escalations: 7, credits: 620 },
  { month: 'Feb', jobs: 28, quality: 87, escalations: 4, credits: 560 },
  { month: 'Mar', jobs: 36, quality: 88, escalations: 5, credits: 720 },
]

const QUALITY_BY_LOCALE = [
  { locale: 'JA', scores: [78, 80, 82, 84, 85, 84], current: 84, delta: +6 },
  { locale: 'DE', scores: [85, 86, 87, 88, 89, 91], current: 91, delta: +6 },
  { locale: 'ZH', scores: [80, 81, 83, 85, 86, 89], current: 89, delta: +9 },
]

const COMPLIANCE_FLAGS = [
  { type: 'Terminology mismatch', count: 23, trend: 'down', delta: -8 },
  { type: 'Regulatory reference', count: 14, trend: 'down', delta: -3 },
  { type: 'Currency formatting', count: 9, trend: 'down', delta: -5 },
  { type: 'Cultural adaptation', count: 7, trend: 'up', delta: +2 },
  { type: 'Brand voice deviation', count: 4, trend: 'down', delta: -1 },
]

const ORG_BRAIN_REUSE = [
  { domain: 'Financial (J-GAAP)', entries: 412, reused: 287, rate: 70 },
  { domain: 'Regulatory (TSE)', entries: 287, reused: 198, rate: 69 },
  { domain: 'Brand Voice', entries: 198, reused: 156, rate: 79 },
  { domain: 'Cultural', entries: 156, reused: 89, rate: 57 },
  { domain: 'Legal', entries: 143, reused: 72, rate: 50 },
]

const CREDIT_BY_WORKFLOW = [
  { workflow: 'Single document analysis', credits: 1840, pct: 42 },
  { workflow: 'Campaign (multi-doc)', credits: 1320, pct: 30 },
  { workflow: 'Content creation', credits: 680, pct: 16 },
  { workflow: 'Human review', credits: 520, pct: 12 },
]

/* ─── Sparkline ──────────────────────────────────────────────── */

function Sparkline({ data, color = '#3D16FA', height = 32, width = 100 }) {
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const points = data.map((v, i) => `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * (height - 4) - 2}`).join(' ')
  return (
    <svg width={width} height={height} className="shrink-0">
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/* ─── Bar Chart ──────────────────────────────────────────────── */

function HorizontalBar({ label, value, maxValue, color = 'bg-[#3D16FA]', suffix = '' }) {
  const pct = Math.round((value / maxValue) * 100)
  return (
    <div className="flex items-center gap-3">
      <span className="text-[12px] text-gray-600 w-40 shrink-0 truncate">{label}</span>
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[12px] font-mono font-medium text-gray-700 w-16 text-right shrink-0">{value.toLocaleString()}{suffix}</span>
    </div>
  )
}

/* ─── Metric Card ────────────────────────────────────────────── */

function MetricCard({ icon: Icon, label, value, sub, trend, trendColor, sparkData, sparkColor, iconColor = 'text-[#3D16FA]', iconBg = 'bg-[#3D16FA]/10' }) {
  return (
    <div className="rounded-xl border border-black/[0.08] bg-white p-4 flex items-start gap-3">
      <div className={`w-9 h-9 rounded-lg ${iconBg} flex items-center justify-center shrink-0`}>
        <Icon className={`w-4.5 h-4.5 ${iconColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-gray-500 mb-0.5">{label}</p>
        <p className="text-[20px] font-bold text-gray-900 leading-none tabular-nums">{value}</p>
        {sub && <p className="text-[11px] text-gray-400 mt-1">{sub}</p>}
        {trend && (
          <p className={`text-[11px] font-medium mt-1 flex items-center gap-1 ${trendColor || 'text-emerald-600'}`}>
            {trend.startsWith('+') ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {trend}
          </p>
        )}
      </div>
      {sparkData && <Sparkline data={sparkData} color={sparkColor || '#3D16FA'} />}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */

export default function AnalyticsDashboard({ onBack }) {
  const prefersReduced = useReducedMotion()
  const [period, setPeriod] = useState('6m')

  const totalJobs = MONTHLY_JOBS.reduce((s, m) => s + m.jobs, 0)
  const avgQuality = Math.round(MONTHLY_JOBS.reduce((s, m) => s + m.quality, 0) / MONTHLY_JOBS.length)
  const totalEscalations = MONTHLY_JOBS.reduce((s, m) => s + m.escalations, 0)
  const escalationRate = Math.round((totalEscalations / totalJobs) * 100)
  const totalCredits = MONTHLY_JOBS.reduce((s, m) => s + m.credits, 0)
  const avgTurnaround = 4.2 // minutes

  return (
    <motion.div
      initial={prefersReduced ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: prefersReduced ? 0 : 0.4 }}
      className="w-full"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onBack} className="p-1.5 rounded-lg hover:bg-black/[0.06] transition-colors cursor-pointer">
            <ArrowLeft className="w-4 h-4 text-gray-500" />
          </button>
          <div>
            <h1 className="text-[20px] font-semibold text-gray-900">Analytics</h1>
            <p className="text-[12px] text-gray-500">Operational intelligence across all workflows</p>
          </div>
        </div>
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
          {['30d', '90d', '6m', '1y'].map(p => (
            <button key={p} type="button" onClick={() => setPeriod(p)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                period === p ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}>
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards — top row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <MetricCard icon={FileText} label="Jobs processed" value={totalJobs} trend="+48% vs prior period" sparkData={MONTHLY_JOBS.map(m => m.jobs)} />
        <MetricCard icon={Shield} label="Avg quality score" value={`${avgQuality}%`} trend="+6 pts" sparkData={MONTHLY_JOBS.map(m => m.quality)} sparkColor="#00B887" iconColor="text-emerald-600" iconBg="bg-emerald-50" />
        <MetricCard icon={Users} label="Escalation rate" value={`${escalationRate}%`} sub={`${totalEscalations} of ${totalJobs} jobs`} trend="-12% vs prior" trendColor="text-emerald-600" iconColor="text-amber-600" iconBg="bg-amber-50" />
        <MetricCard icon={Clock} label="Avg turnaround" value={`${avgTurnaround}m`} sub="Per document" trend="-1.3m vs prior" trendColor="text-emerald-600" iconColor="text-purple-600" iconBg="bg-purple-50" />
      </div>

      {/* Row 2: Quality by locale + Compliance flags */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        {/* Quality by locale */}
        <div className="rounded-xl border border-black/[0.08] bg-white p-5">
          <h3 className="text-[12px] font-semibold uppercase tracking-widest text-gray-400 mb-4">Quality score by locale</h3>
          <div className="space-y-4">
            {QUALITY_BY_LOCALE.map(locale => {
              const color = locale.current >= 90 ? '#00B887' : locale.current >= 80 ? '#FFBD59' : '#E53935'
              return (
                <div key={locale.locale} className="flex items-center gap-4">
                  <span className="text-[13px] font-bold text-gray-800 w-8">{locale.locale}</span>
                  <Sparkline data={locale.scores} color={color} width={120} height={28} />
                  <span className="text-[15px] font-bold tabular-nums" style={{ color }}>{locale.current}%</span>
                  <span className="text-[11px] font-medium text-emerald-600">+{locale.delta}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Compliance flags by type */}
        <div className="rounded-xl border border-black/[0.08] bg-white p-5">
          <h3 className="text-[12px] font-semibold uppercase tracking-widest text-gray-400 mb-4">Compliance flags by type</h3>
          <div className="space-y-3">
            {COMPLIANCE_FLAGS.map(flag => (
              <div key={flag.type} className="flex items-center gap-3">
                <AlertTriangle className={`w-3.5 h-3.5 shrink-0 ${flag.trend === 'down' ? 'text-emerald-500' : 'text-amber-500'}`} />
                <span className="text-[12px] text-gray-700 flex-1">{flag.type}</span>
                <span className="text-[13px] font-bold tabular-nums text-gray-800 w-8 text-right">{flag.count}</span>
                <span className={`text-[11px] font-medium w-10 text-right ${flag.trend === 'down' ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {flag.delta > 0 ? '+' : ''}{flag.delta}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 3: Cortex reuse + Credit consumption */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        {/* Cortex reuse */}
        <div className="rounded-xl border border-black/[0.08] bg-white p-5">
          <div className="flex items-center gap-2 mb-4">
            <Brain className="w-4 h-4 text-[#3D16FA]" />
            <h3 className="text-[12px] font-semibold uppercase tracking-widest text-gray-400">Cortex reuse</h3>
          </div>
          <div className="space-y-3">
            {ORG_BRAIN_REUSE.map(domain => (
              <div key={domain.domain}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[12px] text-gray-700">{domain.domain}</span>
                  <span className="text-[11px] font-medium text-gray-500">{domain.reused} / {domain.entries} entries &middot; {domain.rate}%</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-[#3D16FA]" style={{ width: `${domain.rate}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-black/[0.06] flex items-center justify-between">
            <span className="text-[11px] text-gray-500">Overall reuse rate</span>
            <span className="text-[14px] font-bold text-[#3D16FA]">67%</span>
          </div>
        </div>

        {/* Credit consumption by workflow */}
        <div className="rounded-xl border border-black/[0.08] bg-white p-5">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-4 h-4 text-purple-500" />
            <h3 className="text-[12px] font-semibold uppercase tracking-widest text-gray-400">Credit consumption</h3>
          </div>
          <div className="space-y-3">
            {CREDIT_BY_WORKFLOW.map(wf => (
              <HorizontalBar key={wf.workflow} label={wf.workflow} value={wf.credits} maxValue={2000} suffix=" cr" color={wf.workflow.includes('Human') ? 'bg-amber-400' : wf.workflow.includes('Content') ? 'bg-emerald-400' : 'bg-[#3D16FA]'} />
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-black/[0.06] flex items-center justify-between">
            <span className="text-[11px] text-gray-500">Total this period</span>
            <span className="text-[14px] font-bold text-purple-600">{totalCredits.toLocaleString()} cr</span>
          </div>
        </div>
      </div>

      {/* Row 4: Turnaround time breakdown */}
      <div className="rounded-xl border border-black/[0.08] bg-white p-5">
        <h3 className="text-[12px] font-semibold uppercase tracking-widest text-gray-400 mb-4">Turnaround time breakdown</h3>
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Intelligence assembly', time: '0.4m', pct: 10 },
            { label: 'Processing', time: '2.1m', pct: 50 },
            { label: 'Quality check', time: '0.8m', pct: 19 },
            { label: 'Human review (when escalated)', time: '8.2m', pct: 21, note: 'avg across 31 escalations' },
          ].map(step => (
            <div key={step.label} className="text-center">
              <p className="text-[20px] font-bold text-gray-900 tabular-nums">{step.time}</p>
              <p className="text-[11px] text-gray-500 mt-0.5">{step.label}</p>
              {step.note && <p className="text-[10px] text-gray-400 mt-0.5">{step.note}</p>}
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}
