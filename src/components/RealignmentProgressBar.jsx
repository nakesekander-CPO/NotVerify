import { motion } from 'framer-motion'
import { Sparkles, X } from 'lucide-react'

export default function RealignmentProgressBar({ isRunning, processed, total, onCancel, reduced }) {
  if (!isRunning) return null

  const percent = total > 0 ? Math.round((processed / total) * 100) : 0

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={reduced ? { duration: 0 } : { duration: 0.25 }}
      className="overflow-hidden border-b border-purple-200/60"
    >
      <div className="px-5 py-3 bg-purple-50/50">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <motion.div
              animate={{ rotate: [0, 15, -15, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Sparkles className="w-4 h-4 text-purple-500 shrink-0" />
            </motion.div>
            <p className="text-xs font-medium text-purple-700 truncate">
              Sage is realigning {processed} of {total} segments&hellip;
            </p>
          </div>
          <button
            onClick={onCancel}
            className="p-1 rounded hover:bg-purple-100 transition-colors shrink-0"
            aria-label="Cancel realignment"
          >
            <X className="w-3.5 h-3.5 text-purple-400" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="mt-2 h-1.5 w-full rounded-full bg-purple-100 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-purple-500"
            initial={{ width: 0 }}
            animate={{ width: `${percent}%` }}
            transition={reduced ? { duration: 0 } : { duration: 0.4, ease: 'easeOut' }}
          />
        </div>
      </div>
    </motion.div>
  )
}
