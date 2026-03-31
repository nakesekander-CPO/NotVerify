import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Brain, ChevronDown, ChevronUp, AlertTriangle, AlertCircle, Info } from 'lucide-react'
import { dimensionIcons, severityConfig, getScoreColor, getOverallColor } from '../utils/scoreColors'

function FindingCount({ severity, count }) {
  const sev = severityConfig[severity]
  const Icon = severity === 'critical' ? AlertCircle : severity === 'major' ? AlertTriangle : Info
  return <div className={`flex items-center gap-1.5 text-[11px] font-medium ${sev.color}`}><Icon className="w-3 h-3" /><span>{count} {severity}</span></div>
}

function FindingDetail({ finding }) {
  const sev = severityConfig[finding.severity]
  return (
    <div className={`p-3.5 rounded-lg border ${sev.border} bg-gray-100`}>
      <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${sev.bg} ${sev.color}`}>{sev.label} ({finding.delta})</span>
      <p className="text-[13px] text-gray-700 leading-relaxed mt-2">{finding.text}</p>
      {finding.source && <div className="mt-2 flex items-start gap-2"><span className="text-[11px] text-gray-500 font-medium shrink-0">Source:</span><span className="text-[11px] text-gray-500 font-mono">{finding.source}</span></div>}
      {finding.recommendation && <div className="mt-1.5 flex items-start gap-2"><span className="text-[11px] text-gray-500 font-medium shrink-0">Fix:</span><span className="text-[11px] text-straker-600">{finding.recommendation}</span></div>}
    </div>
  )
}

export default function SourceIQCard({ sourceIQ }) {
  const [expandedDim, setExpandedDim] = useState(null)
  const overallColor = getOverallColor(sourceIQ.overall)
  const totalFindings = sourceIQ.dimensions.reduce((acc, d) => {
    d.findings.forEach(f => { acc[f.severity] = (acc[f.severity] || 0) + 1 }); return acc
  }, {})

  return (
    <div className="rounded-lg border border-black/[0.12] overflow-hidden">
      <div className="bg-gray-100 px-6 py-5 border-b border-black/[0.12]">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-7 h-7 rounded-lg bg-orange-500/10 flex items-center justify-center"><Brain className="w-3.5 h-3.5 text-orange-400" /></div>
          <h2 className="text-[12px] font-bold uppercase tracking-wider text-gray-500">Source IQ Analysis</h2>
        </div>
        <div className="flex items-start gap-6">
          <div className="shrink-0 flex flex-col items-center">
            <div className={`w-[88px] h-[88px] rounded-full border-[3px] ${overallColor.ring} flex flex-col items-center justify-center bg-gray-100`} role="img" aria-label={`Source IQ score: ${sourceIQ.overall} out of 100`}>
              <span className={`text-[32px] font-bold tracking-tight leading-none ${overallColor.text}`}>{sourceIQ.overall}</span>
              <span className="text-[10px] text-gray-500 font-medium mt-0.5">/ 100</span>
            </div>
            <span className={`text-[10px] font-bold uppercase tracking-wider mt-2 px-2 py-0.5 rounded ${overallColor.badge}`}>{sourceIQ.label}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] text-gray-500 leading-relaxed">{sourceIQ.summary}</p>
            <div className="flex items-center gap-3 mt-3">
              {totalFindings.critical > 0 && <FindingCount severity="critical" count={totalFindings.critical} />}
              {totalFindings.major > 0 && <FindingCount severity="major" count={totalFindings.major} />}
              {totalFindings.minor > 0 && <FindingCount severity="minor" count={totalFindings.minor} />}
            </div>
          </div>
        </div>
      </div>
      <div className="divide-y divide-black/[0.06]">
        {sourceIQ.dimensions.map((dim, i) => {
          const isExpanded = expandedDim === i
          const Icon = dimensionIcons[dim.icon] || Brain
          const scoreColor = getScoreColor(dim.score)
          const benchmarkText = dim.benchmark
            ? `${dim.score - dim.benchmark.average} pts ${dim.score >= dim.benchmark.average ? 'above' : 'below'} avg for ${dim.benchmark.context}`
            : null
          return (
            <div key={i} className="bg-white">
              <button
                onClick={() => setExpandedDim(isExpanded ? null : i)}
                aria-expanded={isExpanded}
                aria-controls={`sourceiq-dim-${i}`}
                className="w-full px-6 py-4 flex items-center gap-4 hover:bg-black/[0.02] transition-colors cursor-pointer"
              >
                <Icon className="w-4 h-4 text-gray-500 shrink-0" />
                <div className="flex-1 text-left">
                  <span className="text-[14px] font-medium text-gray-700">{dim.name}</span>
                  {benchmarkText && <span className="block text-[10px] text-gray-500 mt-0.5">{benchmarkText}</span>}
                </div>
                <div className="w-32 flex items-center gap-3">
                  <div className="flex-1 h-1.5 bg-black/[0.03] rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${scoreColor.bar}`} style={{ width: `${dim.score}%` }} />
                  </div>
                  <span className={`text-[13px] font-semibold tabular-nums ${scoreColor.text} w-8 text-right`}>{dim.score}</span>
                </div>
                <div className="flex items-center gap-1.5 w-24 justify-end">
                  {dim.findings.map((f, fi) => {
                    const sev = severityConfig[f.severity]
                    const tooltipText = `${sev.tooltip}: ${f.delta} points`
                    return (
                      <span key={fi} className="relative group">
                        <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${sev.bg} ${sev.color}`} aria-label={tooltipText}>{f.delta}</span>
                        <span className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 px-2 py-1 rounded bg-white border border-black/[0.12] text-[10px] text-gray-700 whitespace-nowrap invisible group-hover:visible z-10 shadow-sm">{tooltipText}</span>
                      </span>
                    )
                  })}
                </div>
                {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-500 shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-500 shrink-0" />}
              </button>
              <AnimatePresence>
                {isExpanded && (
                  <motion.div id={`sourceiq-dim-${i}`} initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                    <div className="px-6 pb-4 space-y-3">
                      {dim.findings.map((finding, fi) => <FindingDetail key={fi} finding={finding} />)}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>
    </div>
  )
}
