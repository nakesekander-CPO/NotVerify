import { useState } from 'react'
import { Sliders, ShieldCheck } from 'lucide-react'
import { SELECTION_POLICIES } from '../../data/hitlVendorWorkflow'
import { SectionHeading, Card, MonoLabel, KeyValueRow, PrimaryButton, SecondaryButton, ScoreBar } from './shared'
import { ConfidenceThresholdEditor } from './cockpit'

const WEIGHT_LABELS = {
  languageMatch: 'Language match',
  domainExpertise: 'Domain expertise',
  qualityScore: 'Quality score',
  rating: 'Rating',
  onTimeDelivery: 'On-time delivery',
  reworkRate: 'Rework rate (lower better)',
  costFit: 'Cost fit',
  slaFit: 'SLA fit',
  availability: 'Availability',
  capacity: 'Capacity',
  securityTier: 'Security tier',
  clientPreference: 'Client preference',
}

export default function SelectionPolicyBuilder({ currentUserId }) {
  const [selected, setSelected] = useState(SELECTION_POLICIES[0]?.id)
  const policy = SELECTION_POLICIES.find(p => p.id === selected)
  const [, force] = useState(0)
  const refresh = () => force(n => n + 1)

  return (
    <div>
      <SectionHeading
        title="Selection Policies"
        subtitle="Configurable vendor-selection algorithm. Hard filters are non-negotiable gates; weights drive the ranked score. Auto-assign fires only above the threshold when manual approval is off."
        actions={<PrimaryButton>+ New policy</PrimaryButton>}
      />

      <div className="grid grid-cols-[1fr_2fr] gap-6">
        <ul className="space-y-2">
          {SELECTION_POLICIES.map(p => (
            <li key={p.id}>
              <button onClick={() => setSelected(p.id)} className={`w-full text-left rounded-lg border p-3 cursor-pointer transition-colors ${selected === p.id ? 'border-ocean bg-pale/70' : 'border-rule bg-white hover:border-ocean/30'}`}>
                <div className="flex items-center gap-2">
                  <Sliders className="w-3.5 h-3.5 text-ocean" />
                  <p className="text-[13px] font-semibold text-ink">{p.name}</p>
                </div>
                <p className="text-[11px] text-mist mt-1">Auto-assign ≥ {(p.autoAssignThreshold * 100).toFixed(0)}% · {p.requireManualApproval ? 'Manual approval' : 'Auto'}</p>
                <p className="text-[11px] text-slate mt-1 line-clamp-2">{p.description}</p>
              </button>
            </li>
          ))}
        </ul>

        {policy && (
          <Card padding="p-0">
            <div className="px-5 py-4 border-b border-rule">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[18px] font-semibold text-ink">{policy.name}</p>
                  <p className="text-[12px] text-slate mt-1 max-w-md">{policy.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <SecondaryButton>Clone</SecondaryButton>
                  <SecondaryButton>Edit</SecondaryButton>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-6 px-5 py-4">
              <div>
                <MonoLabel>Thresholds</MonoLabel>
                <div className="mt-2">
                  <KeyValueRow label="Auto-assign at" value={`${(policy.autoAssignThreshold * 100).toFixed(0)}%`} mono />
                  <KeyValueRow label="Min quality" value={policy.minQualityScore} mono />
                  <KeyValueRow label="Max cost multiplier" value={`${policy.maxCostMultiplier}×`} mono />
                  <KeyValueRow label="Manual approval" value={policy.requireManualApproval ? 'Required' : 'Optional'} />
                  <KeyValueRow label="Fallback policy" value={policy.fallbackPolicyId || '—'} />
                </div>
              </div>
              <div>
                <MonoLabel>Hard filters</MonoLabel>
                <ul className="mt-2 space-y-1">
                  {Object.entries(policy.hardFilters).map(([k, v]) => (
                    <li key={k} className="flex items-center gap-2 text-[12px]">
                      <ShieldCheck className={`w-3.5 h-3.5 ${v ? 'text-teal' : 'text-mist'}`} />
                      <span className={v ? 'text-ink' : 'text-mist line-through'}>{k.replace(/^require/, '').replace(/([A-Z])/g, ' $1').trim()}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="px-5 py-4 border-t border-rule">
              <MonoLabel>Weighted scoring</MonoLabel>
              <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2.5">
                {Object.entries(policy.weights).map(([k, w]) => (
                  <div key={k}>
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="text-ink">{WEIGHT_LABELS[k] || k}</span>
                      <span className="text-slate font-mono" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{(w * 100).toFixed(0)}%</span>
                    </div>
                    <ScoreBar value={w * 100} color="ocean" />
                  </div>
                ))}
              </div>
              <ConfidenceThresholdEditor policy={policy} currentUserId={currentUserId || 'alex'} onSaved={refresh} />
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
