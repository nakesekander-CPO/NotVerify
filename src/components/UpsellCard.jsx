import { BookOpen, TrendingUp, Cpu, UserCheck, ArrowUpRight } from 'lucide-react'
import { tagColors } from '../utils/scoreColors'

const upsellIconMap = { bookOpen: BookOpen, cpu: Cpu, userCheck: UserCheck }

export default function UpsellCard({ options, enabledUpsells, onToggle }) {
  return (
    <div>
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center"><TrendingUp className="w-3.5 h-3.5 text-emerald-400" /></div>
        <h2 className="text-[12px] font-bold uppercase tracking-wider text-gray-500">Quality Improvements Available</h2>
      </div>
      <div className="space-y-3">
        {options.map((opt) => {
          const Icon = upsellIconMap[opt.icon] || BookOpen
          const tagColor = tagColors[opt.tag] || tagColors.Recommended
          const isEnabled = enabledUpsells.has(opt.id)
          return (
            <div key={opt.id} className={`p-4 rounded-lg border transition-all ${isEnabled ? 'bg-straker-500/[0.04] border-straker-500/20' : 'bg-gray-100 border-black/[0.06] hover:border-black/[0.12]'}`}>
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors ${isEnabled ? 'bg-straker-50 border border-straker-500/20' : 'bg-black/[0.03] border border-black/[0.12]'}`}>
                  <Icon className={`w-5 h-5 ${isEnabled ? 'text-straker-600' : 'text-gray-500'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-[14px] font-medium text-gray-900">{opt.title}</p>
                    <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded ${tagColor}`}>{opt.tag}</span>
                  </div>
                  <p className="text-[13px] text-gray-500 leading-relaxed">{opt.description}</p>
                  <div className="flex flex-wrap gap-2 mt-2.5">
                    {opt.impact.map((imp, ii) => (
                      <span key={ii} className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-50 px-2 py-0.5 rounded-md">
                        <ArrowUpRight className="w-3 h-3" />{imp.delta} {imp.dimension}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  role="switch"
                  aria-checked={isEnabled}
                  aria-label={`${isEnabled ? 'Disable' : 'Enable'} ${opt.title}`}
                  onClick={() => onToggle(opt.id)}
                  className={`relative w-10 h-[22px] rounded-full transition-colors cursor-pointer shrink-0 mt-1 ${isEnabled ? 'bg-straker-600' : 'bg-black/[0.08]'}`}
                >
                  <span className={`absolute top-[3px] w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${isEnabled ? 'translate-x-[22px]' : 'translate-x-[3px]'}`} />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
