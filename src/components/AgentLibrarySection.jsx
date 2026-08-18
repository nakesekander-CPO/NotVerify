import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Library, ChevronDown } from 'lucide-react'
import AgentLibraryCard from './AgentLibraryCard'

const SPRING = { type: 'spring', stiffness: 300, damping: 20 }

export default function AgentLibrarySection({ agents, agentStates, onSelectAgent, reducedMotion }) {
  const [expanded, setExpanded] = useState(false)

  const activeCount = agents.filter(a => a.status === 'active').length

  return (
    <div className="rounded-lg border border-black/[0.12] bg-white overflow-hidden">
      {/* Header — always visible, acts as toggle */}
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-black/[0.02] transition-colors cursor-pointer"
        aria-expanded={expanded}
        aria-controls="agent-library-grid"
      >
        <div className="flex items-center gap-2.5">
          <Library className="w-4 h-4 text-[#3D16FA] shrink-0" />
          <span className="text-[13px] font-semibold text-gray-900">Agent Library</span>
          <span className="text-[11px] text-gray-400">
            {activeCount} agents available
          </span>
        </div>
        <ChevronDown
          className="w-4 h-4 text-gray-400 transition-transform shrink-0"
          style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>

      {/* Collapsible grid body */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            id="agent-library-grid"
            initial={reducedMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={reducedMotion ? { duration: 0 } : { duration: 0.22, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pt-2 grid grid-cols-2 gap-3">
              {agents.map((agent, i) => (
                <AgentLibraryCard
                  key={agent.id}
                  agent={agent}
                  index={i}
                  isAssigned={!!agentStates[agent.id]?.active}
                  onSelect={onSelectAgent}
                  reducedMotion={reducedMotion}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
