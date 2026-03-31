import { AnimatePresence } from 'framer-motion'
import { Search } from 'lucide-react'
import AgentCard from './AgentCard'

export default function AgentCatalog({ agents, reducedMotion, onSelect, onTestDrive, onDeploy }) {
  if (agents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Search className="w-8 h-8 text-gray-300" />
        <p className="text-[14px] text-gray-400">No agents match your filters</p>
        <p className="text-[12px] text-gray-300">Try adjusting your search or filter criteria</p>
      </div>
    )
  }

  return (
    <div className="py-5">
      <p className="text-[11px] text-gray-400 mb-4">{agents.length} result{agents.length !== 1 ? 's' : ''}</p>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        <AnimatePresence mode="popLayout">
          {agents.map((agent, i) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              index={i}
              reducedMotion={reducedMotion}
              onSelect={onSelect}
              onTestDrive={onTestDrive}
              onDeploy={onDeploy}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
