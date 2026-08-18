import { useState, useMemo, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import useFocusTrap from '../../hooks/useFocusTrap'
import useReducedMotion from '../../hooks/useReducedMotion'
import MARKETPLACE_AGENTS from './data/marketplaceAgents'
import MarketplaceHero from './MarketplaceHero'
import RecommendedSection from './RecommendedSection'
import FilterBar from './FilterBar'
import AgentCatalog from './AgentCatalog'
import AgentDetailView from './AgentDetailView'
import IntegrationsHub from '../Integrations'

export default function IntelligenceMarketplace({
  isOpen,
  onClose,
  onDeployAgent,
  hiredAgents = [],
  onRemoveAgent,
  documentProfile,
  connectedIntegrations = [],
  onConnectIntegration,
  onDisconnectIntegration,
}) {
  const reducedMotion = useReducedMotion()
  const ref = useRef(null)
  useFocusTrap(ref, isOpen)

  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState({
    type: 'All',
    industry: [],
    languages: [],
    compliance: 'Any',
    sort: 'recommended',
  })
  const [selectedAgent, setSelectedAgent] = useState(null)
  const [showDetail, setShowDetail] = useState(false)
  const [marketplaceTab, setMarketplaceTab] = useState('agents')

  // Lock body scroll
  useEffect(() => {
    if (!isOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [isOpen])

  // Escape to close (only if detail isn't open)
  useEffect(() => {
    if (!isOpen || showDetail) return
    const h = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [isOpen, onClose, showDetail])

  // Reset state on close
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('')
      setFilters({ type: 'All', industry: [], languages: [], compliance: 'Any', sort: 'recommended' })
      setSelectedAgent(null)
      setShowDetail(false)
      setMarketplaceTab('agents')
    }
  }, [isOpen])

  // Recommended agents based on document profile
  const recommendedAgents = useMemo(() => {
    if (!documentProfile) return []
    const v = (documentProfile.vertical || '').toLowerCase()
    return MARKETPLACE_AGENTS
      .filter(a =>
        a.recommendedFor?.some(r => v.includes(r)) ||
        a.industry?.some(ind => v.includes(ind))
      )
      .slice(0, 4)
  }, [documentProfile])

  // Filtered agents
  const filteredAgents = useMemo(() => {
    let agents = [...MARKETPLACE_AGENTS]

    // Text search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      agents = agents.filter(a =>
        a.name.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.tags.some(t => t.toLowerCase().includes(q)) ||
        a.provider.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q)
      )
    }

    // Type
    if (filters.type !== 'All') {
      agents = agents.filter(a => a.type === filters.type)
    }

    // Industry
    if (filters.industry.length > 0) {
      agents = agents.filter(a =>
        a.industry?.some(ind => filters.industry.includes(ind))
      )
    }

    // Language
    if (filters.languages.length > 0) {
      agents = agents.filter(a =>
        filters.languages.every(lang => a.languages?.includes(lang))
      )
    }

    // Compliance
    if (filters.compliance !== 'Any') {
      const cert = filters.compliance.toLowerCase()
      agents = agents.filter(a =>
        a.compliance?.certifications?.some(c => c.toLowerCase().includes(cert))
      )
    }

    // Sort
    switch (filters.sort) {
      case 'rating': agents.sort((a, b) => b.rating - a.rating); break
      case 'usage': agents.sort((a, b) => b.usedBy - a.usedBy); break
      case 'trust': agents.sort((a, b) => b.trustScore - a.trustScore); break
      case 'newest':
        agents.sort((a, b) => {
          const dateA = a.technical?.versionHistory?.[0]?.date || ''
          const dateB = b.technical?.versionHistory?.[0]?.date || ''
          return dateB.localeCompare(dateA)
        })
        break
      case 'recommended':
      default:
        agents.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || b.trustScore - a.trustScore)
    }

    return agents
  }, [searchQuery, filters])

  function handleSelect(agent) {
    setSelectedAgent(agent)
    setShowDetail(true)
  }

  function handleTestDrive(agent) {
    setSelectedAgent(agent)
    setShowDetail(true)
  }

  function handleDeploy(agent) {
    onDeployAgent?.(agent)
    setShowDetail(false)
  }

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={ref}
          className="fixed inset-0 z-[70] bg-white overflow-y-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.25 }}
          style={{ scrollbarWidth: 'thin' }}
        >
          <div className="max-w-[1100px] xl:max-w-[1280px] 2xl:max-w-[1440px] mx-auto px-6 lg:px-8 xl:px-12 pb-12">
            <MarketplaceHero
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              agentCount={MARKETPLACE_AGENTS.length}
              onClose={onClose}
              activeTab={marketplaceTab}
              onTabChange={setMarketplaceTab}
              connectedCount={connectedIntegrations.length}
            />

            {marketplaceTab === 'agents' ? (
              <>
                <RecommendedSection
                  agents={recommendedAgents}
                  documentProfile={documentProfile}
                  reducedMotion={reducedMotion}
                  onSelect={handleSelect}
                  onTestDrive={handleTestDrive}
                  onDeploy={handleDeploy}
                />
                <FilterBar
                  filters={filters}
                  onFilterChange={setFilters}
                />
                <AgentCatalog
                  agents={filteredAgents}
                  reducedMotion={reducedMotion}
                  onSelect={handleSelect}
                  onTestDrive={handleTestDrive}
                  onDeploy={handleDeploy}
                />
              </>
            ) : (
              <IntegrationsHub
                embedded
                connectedIntegrations={connectedIntegrations}
                onConnectIntegration={onConnectIntegration}
                onDisconnectIntegration={onDisconnectIntegration}
              />
            )}
          </div>

          {/* Agent Detail View */}
          <AgentDetailView
            agent={selectedAgent}
            isOpen={showDetail}
            onClose={() => setShowDetail(false)}
            onDeploy={handleDeploy}
            reducedMotion={reducedMotion}
          />
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
