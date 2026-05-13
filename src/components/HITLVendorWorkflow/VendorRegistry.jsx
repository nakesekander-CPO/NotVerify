import { useMemo, useState } from 'react'
import { Search, Filter } from 'lucide-react'
import { VENDORS, filterVendors, SECURITY_TIERS, SERVICE_TYPES } from '../../data/hitlVendorWorkflow'
import { SectionHeading, Card, StatusBadge, SecurityTierBadge, MonoLabel, KeyValueRow, ScoreBar, SecondaryButton, PrimaryButton } from './shared'

export default function VendorRegistry() {
  const [selected, setSelected] = useState(VENDORS[0]?.id || null)
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState({ language: '', domain: '', service: '', securityTier: '', minRating: '' })

  const filtered = useMemo(() => {
    let list = filterVendors({
      language: filters.language || undefined,
      domain: filters.domain || undefined,
      securityTier: filters.securityTier || undefined,
      minRating: filters.minRating ? Number(filters.minRating) : undefined,
    })
    if (filters.service) list = list.filter(v => v.services.includes(filters.service))
    if (query) {
      const q = query.toLowerCase()
      list = list.filter(v => v.name.toLowerCase().includes(q) || v.region.toLowerCase().includes(q) || v.domains.join(' ').toLowerCase().includes(q))
    }
    return list
  }, [query, filters])

  const vendor = VENDORS.find(v => v.id === selected)

  return (
    <div>
      <SectionHeading
        title="Vendor Registry"
        subtitle="Approved vendors who can be assigned to projects through arbitr. All work for these vendors happens inside arbitr — no raw files leave the system by default."
        actions={<PrimaryButton>+ New vendor</PrimaryButton>}
      />

      <div className="grid grid-cols-[1fr_2fr] gap-6">
        <div>
          <Card padding="p-3" className="mb-3">
            <div className="flex items-center gap-2 px-2 py-1 border border-rule rounded-md">
              <Search className="w-4 h-4 text-mist" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search vendors, regions, domains…"
                className="flex-1 text-[13px] bg-transparent outline-none placeholder:text-mist"
              />
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3">
              <FilterSelect label="Language" value={filters.language} onChange={v => setFilters({ ...filters, language: v })} options={['', 'en', 'ja', 'de', 'fr', 'it']} />
              <FilterSelect label="Service" value={filters.service} onChange={v => setFilters({ ...filters, service: v })} options={['', ...SERVICE_TYPES]} />
              <FilterSelect label="Domain" value={filters.domain} onChange={v => setFilters({ ...filters, domain: v })} options={['', 'financial', 'legal', 'regulatory', 'cultural']} />
              <FilterSelect label="Security tier" value={filters.securityTier} onChange={v => setFilters({ ...filters, securityTier: v })} options={['', ...SECURITY_TIERS]} />
            </div>
            <p className="mt-3 text-[11px] text-mist">{filtered.length} vendor{filtered.length === 1 ? '' : 's'} match</p>
          </Card>

          <ul className="space-y-2">
            {filtered.map(v => (
              <li key={v.id}>
                <button
                  onClick={() => setSelected(v.id)}
                  className={`w-full text-left rounded-lg border p-3 transition-colors cursor-pointer ${selected === v.id ? 'border-ocean bg-pale/70' : 'border-rule bg-white hover:border-ocean/30'}`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[13px] font-semibold text-ink truncate">{v.name}</p>
                    <StatusBadge status={v.status} />
                  </div>
                  <p className="text-[11px] text-mist">{v.region} · {v.type} · {v.languages.join('/')}</p>
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-[10.5px] text-slate">
                      <span>Quality {v.qualityScore ?? '—'}</span>
                      <span>SLA {v.slaCommitmentHours}h · {v.currency} {v.standardRate}/w</span>
                    </div>
                    <ScoreBar value={v.qualityScore ?? 0} color="ocean" />
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div>
          {vendor ? <VendorDetail vendor={vendor} /> : <p className="text-mist">Select a vendor.</p>}
        </div>
      </div>
    </div>
  )
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-wider text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{label}</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="mt-0.5 w-full text-[12px] border border-rule rounded px-2 py-1.5 bg-white cursor-pointer"
      >
        {options.map(o => <option key={o} value={o}>{o || 'Any'}</option>)}
      </select>
    </label>
  )
}

function VendorDetail({ vendor }) {
  return (
    <Card padding="p-0">
      <div className="px-5 py-4 border-b border-rule">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[18px] font-semibold text-ink">{vendor.name}</p>
            <div className="flex items-center gap-2 mt-1.5">
              <StatusBadge status={vendor.status} />
              <SecurityTierBadge tier={vendor.securityTier} />
              <span className="text-[11px] text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{vendor.id}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <SecondaryButton>Edit</SecondaryButton>
            <SecondaryButton>Suspend</SecondaryButton>
          </div>
        </div>
        <p className="text-[13px] text-slate mt-3 leading-relaxed">{vendor.notes}</p>
      </div>

      <div className="grid grid-cols-2 gap-x-6 px-5 py-4">
        <div>
          <MonoLabel>Capability</MonoLabel>
          <div className="mt-2">
            <KeyValueRow label="Type" value={vendor.type} />
            <KeyValueRow label="Languages" value={vendor.languages.join(', ')} />
            <KeyValueRow label="Locales" value={vendor.locales.join(', ') || '—'} />
            <KeyValueRow label="Domains" value={vendor.domains.join(', ')} />
            <KeyValueRow label="Services" value={vendor.services.join(', ')} />
            <KeyValueRow label="Region" value={`${vendor.region} (${vendor.jurisdiction})`} />
          </div>
        </div>
        <div>
          <MonoLabel>Commercials</MonoLabel>
          <div className="mt-2">
            <KeyValueRow label="Cost model" value={vendor.costModel} />
            <KeyValueRow label="Standard" value={`${vendor.currency} ${vendor.standardRate}`} mono />
            <KeyValueRow label="Rush" value={`${vendor.currency} ${vendor.rushRate}`} mono />
            <KeyValueRow label="Minimum fee" value={`${vendor.currency} ${vendor.minimumFee}`} mono />
            <KeyValueRow label="Turnaround" value={`${vendor.avgTurnaroundHours}h avg / ${vendor.slaCommitmentHours}h SLA`} mono />
            <KeyValueRow label="Capacity" value={`${vendor.capacityWordsPerWeek.toLocaleString()} w/wk`} mono />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-6 px-5 py-4 border-t border-rule">
        <div>
          <MonoLabel>Performance</MonoLabel>
          <div className="mt-2">
            <KeyValueRow label="Quality" value={vendor.qualityScore} mono />
            <KeyValueRow label="Rating" value={`${vendor.rating} / 5`} mono />
            <KeyValueRow label="On-time" value={`${vendor.onTimeDeliveryScore}%`} mono />
            <KeyValueRow label="Rework rate" value={`${(vendor.reworkRate * 100).toFixed(1)}%`} mono />
            <KeyValueRow label="Escalation rate" value={`${(vendor.escalationRate * 100).toFixed(1)}%`} mono />
            <KeyValueRow label="Validation avg" value={vendor.avgValidationScore} mono />
          </div>
        </div>
        <div>
          <MonoLabel>Compliance</MonoLabel>
          <div className="mt-2">
            <KeyValueRow label="Certifications" value={vendor.certifications.join(', ') || '—'} />
            <KeyValueRow label="Compliance tags" value={vendor.complianceTags.join(', ') || '—'} />
            <KeyValueRow label="Data residency" value={vendor.dataResidencyEligibility.join(', ')} />
            <KeyValueRow label="NDA" value={vendor.ndaStatus} />
            <KeyValueRow label="Contract" value={vendor.contractStatus} />
            <KeyValueRow label="Insurance" value={vendor.insuranceStatus} />
          </div>
        </div>
      </div>

      <div className="px-5 py-4 border-t border-rule">
        <MonoLabel>Audit trail</MonoLabel>
        <ul className="mt-2 space-y-1.5">
          {vendor.auditTrail.map((e, i) => (
            <li key={i} className="text-[12px] text-slate flex items-center gap-2">
              <span className="text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{new Date(e.timestamp).toLocaleString()}</span>
              <span className="text-ink">{e.action}</span>
              <span className="text-mist">by {e.actor}</span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  )
}
