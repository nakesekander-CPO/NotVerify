import { Search, X, Store, Puzzle } from 'lucide-react'

export default function MarketplaceHero({ searchQuery, onSearchChange, agentCount, onClose, activeTab, onTabChange, connectedCount }) {
  return (
    <div className="pt-8 pb-4">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#3D16FA]/10 flex items-center justify-center">
            <Store className="w-5 h-5 text-[#3D16FA]" />
          </div>
          <div>
            <h1 className="text-[24px] font-bold text-gray-900 tracking-tight">Intelligence Marketplace</h1>
            <p className="text-[13px] text-gray-500">Discover, evaluate, and deploy AI agents, models and integrations</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-black/[0.06] transition-colors cursor-pointer"
          aria-label="Close marketplace"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* Tab toggle */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-lg w-fit mb-5">
        <button
          onClick={() => onTabChange('agents')}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-[12px] font-medium transition-all cursor-pointer ${
            activeTab === 'agents'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Store className="w-3.5 h-3.5" />
          Agents &amp; Models
        </button>
        <button
          onClick={() => onTabChange('integrations')}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-[12px] font-medium transition-all cursor-pointer ${
            activeTab === 'integrations'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Puzzle className="w-3.5 h-3.5" />
          Integrations
          {connectedCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-[#3D16FA]/10 text-[#3D16FA] text-[10px] font-semibold">
              {connectedCount}
            </span>
          )}
        </button>
      </div>

      {/* Search — only shown on agents tab */}
      {activeTab === 'agents' && (
        <>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => onSearchChange(e.target.value)}
              placeholder="Search agents, models, capabilities..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-gray-100 border border-black/[0.12] text-[13px] text-gray-900 placeholder:text-gray-400 outline-none focus:border-[#3D16FA] focus:ring-1 focus:ring-[#3D16FA]/20 transition-all"
            />
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6 text-[12px] text-gray-400">
            <span className="font-mono">{agentCount} Intelligence Providers</span>
            <span className="w-px h-3 bg-black/[0.08]" />
            <span className="font-mono">7 Categories</span>
            <span className="w-px h-3 bg-black/[0.08]" />
            <span className="font-mono">12K+ Deployments</span>
          </div>
        </>
      )}
    </div>
  )
}
