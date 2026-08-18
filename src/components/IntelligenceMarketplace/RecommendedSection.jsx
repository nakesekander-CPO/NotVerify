import { Sparkles } from 'lucide-react'
import AgentCard from './AgentCard'

export default function RecommendedSection({ agents, documentProfile, reducedMotion, onSelect, onTestDrive, onDeploy }) {
  if (!documentProfile || agents.length === 0) return null

  const profileParts = [
    documentProfile.vertical || '',
    documentProfile.contentTypes?.[0] || '',
    (documentProfile.locales || []).map(l => l.toUpperCase()).join(', '),
  ].filter(Boolean)

  return (
    <div className="py-4 border-b border-black/[0.06]">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="w-3.5 h-3.5 text-[#3D16FA]" />
        <h3 className="text-[13px] font-semibold text-gray-800">Recommended for your workflow</h3>
      </div>
      <p className="text-[11px] text-gray-400 mb-3">
        Based on {profileParts.join(' · ')}
      </p>

      <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory" style={{ scrollbarWidth: 'thin' }}>
        {agents.map((agent, i) => (
          <div key={agent.id} className="min-w-[280px] max-w-[300px] snap-start shrink-0">
            <AgentCard
              agent={agent}
              index={i}
              reducedMotion={reducedMotion}
              onSelect={onSelect}
              onTestDrive={onTestDrive}
              onDeploy={onDeploy}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
