import { Home, Brain, BarChart3, Scale, Bot, Radar } from 'lucide-react'
import { holdsPermissionAnywhere, useRbacStore } from '../services/rbac/engine'
import { useViewAs } from '../services/rbac/viewAs'

/* Surface taxonomy (point 5, ruled 2026-09-21): each module is gated
 * by its access permission. The nav a person sees IS their role. */
const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: Home, phases: ['dashboard'], accessPerm: null },
  { id: 'org-brain', label: 'Cortex', icon: Brain, phases: ['org-brain'], accessPerm: 'access_cortex' },
  { id: 'agent-studio', label: 'Agent Studio', icon: Bot, phases: ['agent-studio'], accessPerm: 'access_agent_studio' },
  { id: 'ai-visibility', label: 'AI Visibility', icon: Radar, phases: ['ai-visibility'], accessPerm: 'access_ai_visibility' },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, phases: ['analytics'], accessPerm: 'access_analytics' },
  { id: 'governance', label: 'Governance', icon: Scale, phases: ['governance'], accessPerm: 'access_governance' },
]

export default function GlobalNav({ currentPhase, onNavigate }) {
  const [viewAs] = useViewAs()
  useRbacStore()
  const visibleItems = NAV_ITEMS.filter(item =>
    !item.accessPerm || holdsPermissionAnywhere(viewAs, item.accessPerm))
  return (
    // Split Frame chrome: Midnight nav band; cyan carries the active state
    // on dark grounds per DS v2 Finding 3 (indigo fails as text on dark).
    <nav className="sticky top-16 z-40 border-b border-inkslate bg-midnight" aria-label="Platform navigation">
      <div className="max-w-[1280px] xl:max-w-[1440px] 2xl:max-w-[1600px] mx-auto px-6 lg:px-8 xl:px-12 2xl:px-16 flex items-center gap-1 py-1">
        {visibleItems.map(item => {
          const Icon = item.icon
          const isActive = item.phases.includes(currentPhase)
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id === 'dashboard' ? 'dashboard' : item.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-[12px] font-medium transition-colors cursor-pointer ${
                isActive
                  ? 'bg-lens/10 text-lens'
                  : 'text-white/55 hover:bg-white/10 hover:text-white'
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
