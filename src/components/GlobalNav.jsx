import { Home, Brain, BarChart3, Scale, Bot } from 'lucide-react'

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: Home, phases: ['dashboard'] },
  { id: 'org-brain', label: 'Cortex', icon: Brain, phases: ['org-brain'] },
  { id: 'agent-studio', label: 'Agent Studio', icon: Bot, phases: ['agent-studio'] },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, phases: ['analytics'] },
  { id: 'governance', label: 'Governance', icon: Scale, phases: ['governance'] },
]

export default function GlobalNav({ currentPhase, onNavigate }) {
  return (
    <nav className="sticky top-16 z-40 border-b border-black/[0.12] bg-white" aria-label="Platform navigation">
      <div className="max-w-[1280px] xl:max-w-[1440px] 2xl:max-w-[1600px] mx-auto px-6 lg:px-8 xl:px-12 2xl:px-16 flex items-center gap-1 py-1">
        {NAV_ITEMS.map(item => {
          const Icon = item.icon
          const isActive = item.phases.includes(currentPhase)
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id === 'dashboard' ? 'dashboard' : item.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-[12px] font-medium transition-colors cursor-pointer ${
                isActive
                  ? 'bg-[#009eda]/10 text-[#009eda]'
                  : 'text-gray-500 hover:bg-black/[0.04] hover:text-gray-700'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {item.label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
