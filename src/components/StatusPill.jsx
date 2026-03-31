import { useState, useRef, useEffect } from 'react'
import { Activity, CheckCircle2 } from 'lucide-react'

const systems = [
  { name: 'Deployment API', status: 'operational', latency: '45ms' },
  { name: 'Agent Orchestrator', status: 'operational', latency: '120ms' },
  { name: 'Document Parser', status: 'operational', latency: '89ms' },
  { name: 'Quality Engine', status: 'operational', latency: '67ms' },
]

export default function StatusPill() {
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!isOpen) return
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setIsOpen(false)
    }
    const handleEsc = (e) => { if (e.key === 'Escape') setIsOpen(false) }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleEsc)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleEsc)
    }
  }, [isOpen])

  return (
    <div ref={ref} className="relative">
      <button
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-emerald-600/20 bg-emerald-500/[0.06] text-[11px] font-semibold text-emerald-700 hover:bg-emerald-500/10 transition-all cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label="System status — All systems operational"
      >
        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" aria-hidden="true" />
        <span>All Systems Operational</span>
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label="System status details"
          className="absolute top-full mt-2 right-0 w-72 bg-white border border-black/[0.12] rounded-lg  p-4 z-50"
        >
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4 text-emerald-400" />
            <h3 className="text-[13px] font-semibold text-gray-900">System Status</h3>
          </div>
          <div className="space-y-2">
            {systems.map((sys) => (
              <div key={sys.name} className="flex items-center justify-between p-2.5 bg-gray-100 rounded-lg border border-black/[0.06]">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[12px] text-gray-700">{sys.name}</span>
                </div>
                <span className="text-[10px] font-mono text-gray-400">{sys.latency}</span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-gray-400 mt-3 text-center">Last checked: 2 minutes ago</p>
        </div>
      )}
    </div>
  )
}
