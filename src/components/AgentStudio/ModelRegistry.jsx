/**
 * Model Registry — list view (the "Models" tab of Agent Studio).
 *
 * The custom models arbitr has built for this workspace: browse, filter,
 * open the full model card. Enabling happens on the detail view through
 * the governed enable flow.
 */

import { useMemo, useState } from 'react'
import { Cpu, Layers, Fingerprint, ScanSearch } from 'lucide-react'
import { useModelRegistry, agentsUsingModel, MODEL_STATUS_LABEL } from '../../data/modelRegistry'
import { ACTIVE_CUSTOMER } from '../../data/agentStudio'
import { Card, ModelStatusBadge, CreditUsageBadge } from './shared'
import { SearchInput } from '../ui'

const TIER_ICON = {
  'Platform base': Layers,
  'Domain base': Cpu,
  'Custom fine-tune': Fingerprint,
  Detection: ScanSearch,
}

export default function ModelRegistry({ go }) {
  const { models } = useModelRegistry()
  const [q, setQ] = useState('')
  const [statusF, setStatusF] = useState('all')

  const filtered = useMemo(() => models.filter(m => {
    if (statusF !== 'all' && m.status !== statusF) return false
    if (q && !`${m.name} ${m.purpose} ${m.technical.baseModel}`.toLowerCase().includes(q.toLowerCase())) return false
    return true
  }), [models, q, statusF])

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-5 border-b border-rule pb-4">
        <p className="text-[13px] text-slate max-w-2xl leading-relaxed">
          The custom models built for your workspace. Review what each one does, then enable it — every enablement runs policy checks and records who approved it.
        </p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <SearchInput className="flex-1 min-w-[200px]" value={q} onChange={setQ} placeholder="Search models…" />
        <select
          value={statusF}
          onChange={e => setStatusF(e.target.value)}
          aria-label="Filter by status"
          className="text-[12.5px] border border-rule rounded-lg px-2.5 py-2 bg-white cursor-pointer text-slate"
        >
          <option value="all">All statuses</option>
          {Object.entries(MODEL_STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      <p className="text-[11px] text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
        {filtered.length} model{filtered.length === 1 ? '' : 's'} · workspace {ACTIVE_CUSTOMER.name}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(m => (
          <ModelCard key={m.id} model={m} onOpen={() => go('model-detail', { modelId: m.id, agentId: null })} />
        ))}
      </div>
      {filtered.length === 0 && <p className="text-[13px] text-mist py-8 text-center">No models match your filters.</p>}
    </div>
  )
}

function ModelCard({ model, onOpen }) {
  const Icon = TIER_ICON[model.tier] || Cpu
  const agentCount = agentsUsingModel(model.modelKey).length
  const { baselineScore, boostedScore } = model.evals.testDrive
  return (
    <button onClick={onOpen} className="text-left w-full">
      <Card className="hover:border-ocean/40 transition-colors h-full cursor-pointer">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-ocean/10 flex items-center justify-center shrink-0"><Icon className="w-4.5 h-4.5 text-ocean" /></div>
            <div className="min-w-0">
              <p className="text-[14px] font-semibold text-ink truncate">{model.name}</p>
              <p className="text-[10.5px] text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{model.tier}</p>
            </div>
          </div>
          <ModelStatusBadge status={model.status} />
        </div>

        <p className="text-[12px] text-slate leading-relaxed line-clamp-2 mb-3">{model.purpose}</p>

        <div className="flex items-center justify-between gap-2 pt-3 border-t border-rule">
          <span className="text-[11px] text-mist truncate" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
            {model.technical.baseModel} · {model.technical.version}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 mt-2">
          <span className="text-[11px] text-slate" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
            eval {baselineScore} → <span className="text-teal font-semibold">{boostedScore}</span>
          </span>
          <span className="inline-flex items-center gap-3">
            <span className="text-[11px] text-slate">{agentCount} agent{agentCount === 1 ? '' : 's'}</span>
            <CreditUsageBadge value={model.creditCostPerRun} />
          </span>
        </div>
      </Card>
    </button>
  )
}
