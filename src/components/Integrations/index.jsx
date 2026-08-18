import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Search, Check, X, ChevronRight, ExternalLink,
  Puzzle, Shield, Zap, RefreshCw, Trash2, ToggleLeft, ToggleRight,
  Clock, Activity,
} from 'lucide-react'
import { CONNECTORS, CATEGORIES, CONNECTOR_ACTIONS } from './data.js'
import WorkflowBuilder from './WorkflowBuilder.jsx'
import SecurityPermissions from './SecurityPermissions.jsx'

const SPRING = { type: 'spring', stiffness: 300, damping: 20 }

/* ── Connector brand icon ── */
export function ConnectorIcon({ connector, size = 'md' }) {
  const sizes = {
    xs: 'w-5 h-5 text-[9px]',
    sm: 'w-7 h-7 text-[11px]',
    md: 'w-10 h-10 text-[13px]',
    lg: 'w-12 h-12 text-[15px]',
  }
  return (
    <div
      className={`${sizes[size]} rounded-lg flex items-center justify-center font-bold text-white shrink-0`}
      style={{ backgroundColor: connector.color }}
      aria-hidden="true"
    >
      {connector.letter}
    </div>
  )
}

/* ── Merge Link simulation modal ── */
function MergeLinkModal({ connector, onConnect, onClose }) {
  const [step, setStep] = useState(0) // 0=select, 1=authorise, 2=done
  const [email, setEmail] = useState('')

  function handleAuthorise() {
    setStep(1)
    setTimeout(() => setStep(2), 1500)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={SPRING}
        className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 overflow-hidden"
      >
        {/* Modal header — simulates Merge Link branding */}
        <div className="px-6 pt-5 pb-4 border-b border-black/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ConnectorIcon connector={connector} size="sm" />
            <div>
              <p className="text-[13px] font-semibold text-gray-900">{connector.name}</p>
              <p className="text-[11px] text-gray-400">Powered by Merge Link</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5">
          {step === 0 && (
            <div>
              <p className="text-[13px] text-gray-700 mb-4">
                Connect your <strong>{connector.name}</strong> account to allow arbitr agents to read and write on your behalf.
              </p>
              <div className="mb-4">
                <label className="text-[11px] font-medium text-gray-500 block mb-1">Account email</label>
                <input
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@meridian-capital.com"
                  className="w-full text-[13px] text-gray-700 border border-black/[0.12] rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#3D16FA]/40 placeholder:text-gray-300"
                />
              </div>
              <div className="space-y-1.5 mb-4">
                {['Read files and documents', 'Create and update records', 'Send notifications on your behalf'].map(perm => (
                  <div key={perm} className="flex items-center gap-2 text-[12px] text-gray-500">
                    <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    {perm}
                  </div>
                ))}
              </div>
              {connector.id === 'zendesk' && (
                <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5">
                  <p className="text-[12px] text-amber-800 leading-relaxed">
                    <strong>Please Note</strong> — Zendesk enforces a <strong>60,000 character limit</strong> per API call. arbitr will automatically chunk large documents to stay within this boundary.
                  </p>
                </div>
              )}
              <button
                onClick={handleAuthorise}
                className="w-full py-2.5 rounded-lg bg-[#3D16FA] text-white text-[13px] font-medium hover:bg-[#0089bf] cursor-pointer transition-colors"
              >
                Authorise {connector.name}
              </button>
            </div>
          )}

          {step === 1 && (
            <div className="flex flex-col items-center gap-4 py-6">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                <RefreshCw className="w-8 h-8 text-[#3D16FA]" />
              </motion.div>
              <p className="text-[13px] text-gray-600">Connecting to {connector.name}…</p>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center">
                <Check className="w-7 h-7 text-emerald-500" />
              </div>
              <div className="text-center">
                <p className="text-[14px] font-semibold text-gray-900">{connector.name} connected</p>
                <p className="text-[12px] text-gray-400 mt-1">Your agents can now use this integration.</p>
              </div>
              <button
                onClick={() => { onConnect(connector); onClose() }}
                className="w-full py-2.5 rounded-lg bg-[#3D16FA] text-white text-[13px] font-medium hover:bg-[#0089bf] cursor-pointer transition-colors"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}

/* ── Manage permissions drawer ── */
function ManageDrawer({ connector, onDisconnect, onClose }) {
  const actions = CONNECTOR_ACTIONS[connector.id] || []
  const [allowed, setAllowed] = useState(() => {
    const s = {}
    actions.forEach(a => { s[a.id] = true })
    return s
  })

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/20 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={SPRING}
        className="bg-white w-80 h-full shadow-2xl flex flex-col"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/[0.08]">
          <div className="flex items-center gap-2.5">
            <ConnectorIcon connector={connector} size="sm" />
            <div>
              <p className="text-[13px] font-semibold text-gray-900">{connector.name}</p>
              <p className="text-[11px] text-emerald-500">Connected</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-3">Allowed operations</p>
          <div className="flex flex-col gap-2">
            {actions.map(action => (
              <div key={action.id} className="flex items-center justify-between gap-2">
                <span className="text-[12px] text-gray-700">{action.label}</span>
                <button
                  onClick={() => setAllowed(prev => ({ ...prev, [action.id]: !prev[action.id] }))}
                  className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer ${
                    allowed[action.id] ? 'bg-[#3D16FA]' : 'bg-gray-200'
                  }`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                    allowed[action.id] ? 'translate-x-4' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>
            ))}
            {actions.length === 0 && (
              <p className="text-[12px] text-gray-400">No configurable operations for this connector.</p>
            )}
          </div>

          <div className="mt-5 pt-4 border-t border-black/[0.08]">
            <div className="flex items-center gap-2 text-[12px] text-gray-500 mb-1">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              Connected {new Date(connector.connectedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
            <div className="flex items-center gap-2 text-[12px] text-gray-500">
              <Activity className="w-3.5 h-3.5 shrink-0" />
              {connector.actionsCount} actions performed
            </div>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-black/[0.08]">
          <button
            onClick={() => { onDisconnect(connector.id); onClose() }}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-[12px] text-red-500 border border-red-200 hover:bg-red-50 cursor-pointer transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Disconnect {connector.name}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

/* ── Connector card in the grid ── */
function ConnectorCard({ connector, isConnected, onConnect, onManage }) {
  return (
    <div className={`border rounded-xl p-4 bg-white transition-colors ${
      isConnected ? 'border-emerald-200' : 'border-black/[0.08]'
    }`}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <ConnectorIcon connector={connector} />
        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0 ${
          isConnected
            ? 'bg-emerald-50 text-emerald-600'
            : 'bg-gray-100 text-gray-400'
        }`}>
          {isConnected ? 'Connected' : 'Not connected'}
        </span>
      </div>
      <p className="text-[13px] font-semibold text-gray-900">{connector.name}</p>
      <p className="text-[11px] text-gray-400 mb-3">{connector.category}</p>
      <button
        onClick={isConnected ? onManage : onConnect}
        className={`w-full py-1.5 rounded-lg text-[12px] font-medium transition-colors cursor-pointer ${
          isConnected
            ? 'bg-gray-50 border border-black/[0.08] text-gray-600 hover:bg-black/[0.04]'
            : 'bg-[#3D16FA] text-white hover:bg-[#0089bf]'
        }`}
      >
        {isConnected ? 'Manage' : 'Connect'}
      </button>
    </div>
  )
}

/* ── Main Integrations Hub ── */
export default function IntegrationsHub({ onBack, connectedIntegrations, onConnectIntegration, onDisconnectIntegration }) {
  const [activeTab, setActiveTab] = useState('all')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [connectingConnector, setConnectingConnector] = useState(null)
  const [managingConnector, setManagingConnector] = useState(null)

  const connectedIds = connectedIntegrations.map(c => c.id)

  const filtered = useMemo(() => {
    return CONNECTORS.filter(c => {
      const matchSearch = search === '' || c.name.toLowerCase().includes(search.toLowerCase())
      const matchCategory = category === 'All' || c.category === category
      return matchSearch && matchCategory
    })
  }, [search, category])

  const connectedEnriched = connectedIntegrations.map(ci => {
    const def = CONNECTORS.find(c => c.id === ci.id) || {}
    return { ...def, ...ci }
  })

  return (
    <div className="w-full max-w-[960px]">
      {/* Back button — omitted when embedded inside another overlay */}
      {onBack && (
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-[13px] text-gray-500 hover:text-gray-900 transition-colors mb-6 self-start cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back
        </button>
      )}

      {/* Page header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-[18px] font-semibold text-gray-900 flex items-center gap-2">
            <Puzzle className="w-5 h-5 text-[#3D16FA]" />
            Connected Tools
          </h1>
          <p className="text-[13px] text-gray-500 mt-1">
            Connect your team's tools to enable automated agent workflows across the pipeline.
          </p>
        </div>
        {connectedIntegrations.length > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-100">
            <Check className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-[12px] font-medium text-emerald-600">
              {connectedIntegrations.length} tool{connectedIntegrations.length > 1 ? 's' : ''} connected
            </span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-black/[0.06] mb-6">
        {[
          ['all', 'All Integrations'],
          ['connected', `Connected${connectedIntegrations.length > 0 ? ` (${connectedIntegrations.length})` : ''}`],
          ['workflows', 'Workflows'],
          ['security', 'Security'],
        ].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`px-4 py-2.5 text-[13px] font-medium transition-colors cursor-pointer -mb-px border-b-2 ${
              activeTab === id
                ? 'border-[#3D16FA] text-[#3D16FA]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ALL tab */}
      {activeTab === 'all' && (
        <div>
          {/* Search + category filter */}
          <div className="flex items-center gap-3 mb-5">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search integrations…"
                className="w-full text-[13px] text-gray-700 border border-black/[0.12] rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#3D16FA]/40 placeholder:text-gray-300"
              />
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap mb-5">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-3 py-1 rounded-full text-[12px] font-medium transition-colors cursor-pointer ${
                  category === cat
                    ? 'bg-[#3D16FA] text-white'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-3">
            {filtered.map(connector => (
              <ConnectorCard
                key={connector.id}
                connector={connector}
                isConnected={connectedIds.includes(connector.id)}
                onConnect={() => setConnectingConnector(connector)}
                onManage={() => setManagingConnector(connectedEnriched.find(c => c.id === connector.id))}
              />
            ))}
          </div>

          <p className="text-[12px] text-center text-gray-400 mt-8">
            Don't see your tool?{' '}
            <button className="text-[#3D16FA] hover:underline cursor-pointer">Request an integration</button>
          </p>
        </div>
      )}

      {/* CONNECTED tab */}
      {activeTab === 'connected' && (
        <div>
          {connectedEnriched.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Puzzle className="w-8 h-8 text-gray-200" />
              <p className="text-[13px] text-gray-500 font-medium">No tools connected yet</p>
              <button
                onClick={() => setActiveTab('all')}
                className="text-[13px] text-[#3D16FA] hover:underline cursor-pointer"
              >
                Browse available integrations →
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {connectedEnriched.map(conn => (
                <div key={conn.id} className="border border-emerald-200 rounded-xl p-4 bg-white flex items-center gap-4">
                  <ConnectorIcon connector={conn} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[13px] font-semibold text-gray-900">{conn.name}</p>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 font-medium">Connected</span>
                    </div>
                    <div className="flex items-center gap-4 mt-0.5">
                      <span className="text-[12px] text-gray-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Since {new Date(conn.connectedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </span>
                      <span className="text-[12px] text-gray-400 flex items-center gap-1">
                        <Activity className="w-3 h-3" />
                        {conn.actionsCount} actions
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setManagingConnector(conn)}
                    className="px-3 py-1.5 rounded-lg text-[12px] text-gray-600 border border-black/[0.08] hover:bg-black/[0.04] cursor-pointer"
                  >
                    Manage
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* WORKFLOWS tab */}
      {activeTab === 'workflows' && (
        <WorkflowBuilder connectedIntegrations={connectedEnriched} />
      )}

      {/* SECURITY tab */}
      {activeTab === 'security' && (
        <SecurityPermissions connectedIntegrations={connectedEnriched} />
      )}

      {/* Merge Link modal */}
      <AnimatePresence>
        {connectingConnector && (
          <MergeLinkModal
            connector={connectingConnector}
            onConnect={(connector) => {
              onConnectIntegration({
                id: connector.id,
                name: connector.name,
                category: connector.category,
                color: connector.color,
                letter: connector.letter,
                connectedAt: new Date().toISOString(),
                actionsCount: 0,
              })
            }}
            onClose={() => setConnectingConnector(null)}
          />
        )}
      </AnimatePresence>

      {/* Manage drawer */}
      <AnimatePresence>
        {managingConnector && (
          <ManageDrawer
            connector={managingConnector}
            onDisconnect={onDisconnectIntegration}
            onClose={() => setManagingConnector(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
