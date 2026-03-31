import { useMemo } from 'react'
import { Sparkles, ArrowRight, CheckCircle2, AlertTriangle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function ActiveEntitySurface({ segment, rules }) {
  const matches = useMemo(() => {
    if (!segment || !rules || rules.length === 0) return []

    const sourceText = (segment.source || '').toLowerCase()
    const translationText = (segment.translation || '').toLowerCase()
    const combinedText = sourceText + ' ' + translationText

    return rules
      .filter(rule => {
        const src = rule.sourceTerm.toLowerCase()
        const tgt = rule.targetTerm.toLowerCase()
        // Rule applies if source term OR target term appears in the segment
        return combinedText.includes(src) || combinedText.includes(tgt)
      })
      .map(rule => {
        const src = rule.sourceTerm.toLowerCase()
        const tgt = rule.targetTerm.toLowerCase()
        // Check compliance: translation should contain targetTerm, not sourceTerm
        const translationHasTarget = translationText.includes(tgt)
        const translationHasSource = translationText.includes(src)

        let status = 'compliant'
        if (translationHasSource && !translationHasTarget) {
          status = 'violation'
        } else if (!translationHasTarget && !translationHasSource) {
          status = 'compliant' // not directly relevant to translation
        }

        return {
          ruleId: rule.id,
          sourceTerm: rule.sourceTerm,
          targetTerm: rule.targetTerm,
          contextNote: rule.contextNote,
          status,
        }
      })
  }, [segment, rules])

  if (!segment || matches.length === 0) return null

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <Sparkles className="w-3.5 h-3.5 text-purple-500" />
        <p className="text-[10px] font-semibold text-purple-600 uppercase tracking-wider">Active Rules</p>
        <span className="ml-auto text-[9px] text-gray-400 font-mono">SEG-{String(segment.segmentNumber).padStart(3, '0')}</span>
      </div>

      <div className="space-y-1.5 max-h-40 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
        <AnimatePresence mode="popLayout">
          {matches.map((match, i) => (
            <motion.div
              key={match.ruleId}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.15, delay: i * 0.04 }}
              className={`p-2 rounded-lg border transition-colors ${
                match.status === 'violation'
                  ? 'bg-red-50/60 border-red-300/40'
                  : 'bg-white border-black/[0.08]'
              }`}
            >
              {/* Source → Target */}
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[10px] font-medium text-gray-800 truncate">{match.sourceTerm}</span>
                <ArrowRight className="w-2.5 h-2.5 text-purple-400 shrink-0" />
                <span className="text-[10px] font-medium text-purple-700 truncate">{match.targetTerm}</span>
              </div>

              {/* Status badge */}
              <div className="flex items-center gap-1.5">
                {match.status === 'compliant' ? (
                  <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-emerald-600">
                    <CheckCircle2 className="w-2.5 h-2.5" /> Compliant
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-red-600">
                    <AlertTriangle className="w-2.5 h-2.5" /> Violation
                  </span>
                )}
                {match.contextNote && (
                  <span className="text-[9px] text-gray-400 truncate">{match.contextNote}</span>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
