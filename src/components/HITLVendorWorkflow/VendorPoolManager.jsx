import { useState } from 'react'
import { FolderTree, Globe, Lock, Plus } from 'lucide-react'
import { VENDOR_POOLS, VENDORS, SELECTION_POLICIES } from '../../data/hitlVendorWorkflow'
import { SectionHeading, Card, MonoLabel, KeyValueRow, StatusBadge, PrimaryButton, SecondaryButton } from './shared'

export default function VendorPoolManager() {
  const [selected, setSelected] = useState(VENDOR_POOLS[0]?.id)
  const pool = VENDOR_POOLS.find(p => p.id === selected)
  const policy = SELECTION_POLICIES.find(p => p.id === pool?.defaultSelectionPolicy)
  const members = (pool?.includedVendorIds || []).map(id => VENDORS.find(v => v.id === id)).filter(Boolean)

  return (
    <div>
      <SectionHeading
        title="Vendor Pools"
        subtitle="Pools group approved vendors by scope, domain, or security tier. They are the gating set for the selection engine: a vendor must be in the project's required pool to be considered."
        actions={<PrimaryButton><Plus className="w-4 h-4" /> New pool</PrimaryButton>}
      />

      <div className="grid grid-cols-[1fr_2fr] gap-6">
        <ul className="space-y-2">
          {VENDOR_POOLS.map(p => (
            <li key={p.id}>
              <button onClick={() => setSelected(p.id)} className={`w-full text-left rounded-lg border p-3 transition-colors cursor-pointer ${selected === p.id ? 'border-ocean bg-pale/70' : 'border-rule bg-white hover:border-ocean/30'}`}>
                <div className="flex items-center justify-between">
                  <p className="text-[13px] font-semibold text-ink truncate">{p.name}</p>
                  {p.approvalRequired ? <Lock className="w-3.5 h-3.5 text-amber" /> : <Globe className="w-3.5 h-3.5 text-ocean" />}
                </div>
                <p className="text-[11px] text-mist mt-0.5">{p.scope} · {p.includedVendorIds.length} vendor{p.includedVendorIds.length === 1 ? '' : 's'}</p>
                <p className="text-[11px] text-slate mt-1 line-clamp-2">{p.description}</p>
              </button>
            </li>
          ))}
        </ul>

        {pool && (
          <Card padding="p-0">
            <div className="px-5 py-4 border-b border-rule">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[18px] font-semibold text-ink">{pool.name}</p>
                  <p className="text-[12px] text-slate mt-1 max-w-md">{pool.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <SecondaryButton>Edit</SecondaryButton>
                  <SecondaryButton>Clone</SecondaryButton>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-6 px-5 py-4">
              <div>
                <MonoLabel>Scope rules</MonoLabel>
                <div className="mt-2">
                  <KeyValueRow label="Scope" value={pool.scope} />
                  <KeyValueRow label="Default policy" value={policy?.name || '—'} />
                  <KeyValueRow label="Min security tier" value={pool.securityMinTier} />
                  <KeyValueRow label="Approval required" value={pool.approvalRequired ? 'Yes' : 'No'} />
                  <KeyValueRow label="Fallback pool" value={pool.fallbackPoolId || '—'} />
                </div>
              </div>
              <div>
                <MonoLabel>Allowed scope</MonoLabel>
                <div className="mt-2">
                  <KeyValueRow label="Project types" value={pool.allowedProjectTypes.join(', ')} />
                  <KeyValueRow label="Languages" value={pool.allowedLanguages.join(', ')} />
                </div>
              </div>
            </div>

            <div className="px-5 py-4 border-t border-rule">
              <MonoLabel>Members ({members.length})</MonoLabel>
              <ul className="mt-2 grid grid-cols-2 gap-2">
                {members.map(v => (
                  <li key={v.id} className="flex items-center justify-between p-2 rounded-md border border-rule">
                    <div className="min-w-0">
                      <p className="text-[12.5px] text-ink truncate">{v.name}</p>
                      <p className="text-[10.5px] text-mist truncate">{v.region} · {v.type}</p>
                    </div>
                    <StatusBadge status={v.status} />
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
