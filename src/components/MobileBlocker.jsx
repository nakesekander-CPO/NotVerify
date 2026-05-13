import { Zap, Monitor } from 'lucide-react'

export default function MobileBlocker() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-white">
      <div className="max-w-sm text-center">
        <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-straker-500 to-straker-700 flex items-center justify-center mx-auto mb-6">
          <Zap className="w-7 h-7 text-white" strokeWidth={2.5} />
        </div>
        <h1 className="text-[22px] font-semibold text-gray-900 tracking-tight mb-3">
          Desktop Recommended
        </h1>
        <p className="text-[14px] text-gray-500 leading-relaxed mb-6">
          The arbitr Agentic Orchestrator provides an enterprise-grade analysis experience
          best viewed on a desktop or laptop display.
        </p>
        <div className="flex items-center justify-center gap-2 text-[13px] text-straker-600 font-medium">
          <Monitor className="w-4 h-4" />
          <span>Switch to a wider screen for full orchestration view</span>
        </div>
      </div>
    </div>
  )
}
