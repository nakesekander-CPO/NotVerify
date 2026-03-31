import { Sparkles, CheckCheck, Filter } from 'lucide-react'

export default function SmartHighlightFilter({ realignedCount, filterActive, onToggleFilter, onVerifyAll }) {
  if (realignedCount === 0) return null

  return (
    <div className="rounded-lg border border-purple-200/50 bg-purple-50/40 p-3 space-y-2.5">
      <div className="flex items-center gap-2">
        <Sparkles className="w-3.5 h-3.5 text-purple-500" />
        <p className="text-[10px] font-semibold text-purple-700 uppercase tracking-wider">AI Realigned</p>
        <span className="ml-auto px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-purple-100 text-purple-600">
          {realignedCount}
        </span>
      </div>

      <div className="flex items-center gap-2">
        {/* Filter toggle */}
        <button
          onClick={onToggleFilter}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${
            filterActive
              ? 'bg-purple-500 text-white'
              : 'bg-white border border-purple-200/60 text-purple-600 hover:bg-purple-50'
          }`}
        >
          <Filter className="w-3 h-3" />
          {filterActive ? 'Show All' : 'Filter'}
        </button>

        {/* Verify All */}
        <button
          onClick={onVerifyAll}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-semibold bg-white border border-purple-200/60 text-purple-600 hover:bg-purple-50 transition-colors"
        >
          <CheckCheck className="w-3 h-3" />
          Verify All
        </button>
      </div>

      <p className="text-[10px] text-purple-500/70 leading-relaxed">
        <kbd className="px-1 py-0.5 rounded bg-purple-100 text-purple-600 font-mono text-[9px]">Shift+V</kbd> to verify selected segment
      </p>
    </div>
  )
}
