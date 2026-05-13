import { useMemo, useState } from 'react'
import { ScrollText, Filter, Download } from 'lucide-react'
import { HITL_AUDIT_LOG, HITL_PROJECTS } from '../../data/hitlVendorWorkflow'
import { SectionHeading, Card, MonoLabel, EmptyState, SecondaryButton } from './shared'

const EVENT_TYPE_TONE = {
  'vendor.recommended': 'bg-pale text-ocean',
  'vendor.auto-assigned': 'bg-teal/10 text-teal',
  'assignment.awaiting-approval': 'bg-amber/15 text-amber-deep',
  'assignment.approved': 'bg-teal/10 text-teal',
  'assignment.rejected': 'bg-error/10 text-error',
  'assignment.manual-override': 'bg-amber/15 text-amber-deep',
  'segment.verified': 'bg-teal/10 text-teal',
  'segment.not-verified': 'bg-error/10 text-error',
  'segment.edited': 'bg-pale text-ocean',
  'segment.needs-rework': 'bg-amber/15 text-amber-deep',
  'segment.escalated': 'bg-amber/15 text-amber-deep',
  'segment.locked': 'bg-slate/10 text-slate',
  'segment.comment-added': 'bg-cream text-slate',
  'project.signed-off': 'bg-teal/10 text-teal',
  'project.created': 'bg-pale text-ocean',
  'project.risk-assessed': 'bg-pale text-ocean',
  'retraining.queued': 'bg-amber/15 text-amber-deep',
  'retraining.approved': 'bg-teal/10 text-teal',
  'retraining.rejected': 'bg-error/10 text-error',
  'policy.violation': 'bg-error/15 text-error',
  'segment.access-denied': 'bg-error/15 text-error',
  'segment.write-on-locked-rejected': 'bg-error/15 text-error',
}

export default function AuditLogViewer({ activeProjectId }) {
  const [filter, setFilter] = useState({ project: '', actor: '', event: '' })

  const list = useMemo(() => {
    let out = [...HITL_AUDIT_LOG]
    if (filter.project) out = out.filter(e => e.projectId === filter.project)
    if (filter.actor) out = out.filter(e => (e.actorId || '').includes(filter.actor))
    if (filter.event) out = out.filter(e => e.eventType.includes(filter.event))
    return out.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1))
  }, [filter, HITL_AUDIT_LOG.length])

  return (
    <div>
      <SectionHeading
        title="Audit Log"
        subtitle="Every critical HITL action — vendor selection, assignment, override, segment decision, sign-off, retraining approval, RBAC change, restricted-action attempt — is appended here with before / after values and the policy that allowed or blocked it."
        actions={<SecondaryButton><Download className="w-3.5 h-3.5" /> Export CSV</SecondaryButton>}
      />

      <Card padding="p-3" className="mb-4">
        <div className="grid grid-cols-3 gap-3">
          <FilterField label="Project" value={filter.project} onChange={v => setFilter({ ...filter, project: v })} options={['', ...HITL_PROJECTS.map(p => p.id)]} />
          <input
            value={filter.actor}
            onChange={e => setFilter({ ...filter, actor: e.target.value })}
            placeholder="Actor user-id filter"
            className="text-[12.5px] border border-rule rounded px-2 py-1.5"
          />
          <input
            value={filter.event}
            onChange={e => setFilter({ ...filter, event: e.target.value })}
            placeholder="Event type filter (substring)"
            className="text-[12.5px] border border-rule rounded px-2 py-1.5"
          />
        </div>
      </Card>

      {list.length === 0 ? (
        <EmptyState title="No audit events match your filters." icon={ScrollText} />
      ) : (
        <Card padding="p-0">
          <table className="w-full text-[12.5px]">
            <thead className="bg-cream border-b border-rule">
              <tr>
                <Th>When</Th><Th>Actor</Th><Th>Role</Th><Th>Event</Th><Th>Project</Th><Th>Before → After</Th><Th>Reason / policy</Th>
              </tr>
            </thead>
            <tbody>
              {list.slice(0, 100).map(e => (
                <tr key={e.id} className="border-b border-rule last:border-b-0">
                  <Td mono>{new Date(e.timestamp).toLocaleString()}</Td>
                  <Td>{e.actorId}</Td>
                  <Td mono>{e.actorRole || '—'}</Td>
                  <Td>
                    <span className={`px-2 py-0.5 rounded-full text-[10.5px] ${EVENT_TYPE_TONE[e.eventType] || 'bg-rule text-slate'}`}>{e.eventType}</span>
                  </Td>
                  <Td mono>{e.projectId || '—'}</Td>
                  <Td>
                    <div className="text-[11px] text-slate truncate max-w-xs">
                      {e.beforeValue != null && <span className="text-mist">{JSON.stringify(e.beforeValue)}</span>}
                      {e.beforeValue != null && e.afterValue != null && <span className="mx-1">→</span>}
                      {e.afterValue != null && <span className="text-ink">{JSON.stringify(e.afterValue)}</span>}
                    </div>
                  </Td>
                  <Td>
                    <div className="text-[11px] text-slate truncate max-w-xs">{e.reason || e.policy || '—'}</div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}

function FilterField({ label, value, onChange, options }) {
  return (
    <label className="block">
      <span className="text-[10.5px] uppercase tracking-wider text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{label}</span>
      <select value={value} onChange={e => onChange(e.target.value)} className="mt-1 w-full text-[12.5px] border border-rule rounded px-2 py-1.5 bg-white cursor-pointer">
        {options.map(o => <option key={o} value={o}>{o || 'Any'}</option>)}
      </select>
    </label>
  )
}

function Th({ children }) {
  return <th className="text-left font-medium text-mist uppercase tracking-wider text-[10.5px] px-4 py-2.5" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{children}</th>
}

function Td({ children, mono }) {
  return <td className="px-4 py-2 text-ink" style={mono ? { fontFamily: "'IBM Plex Mono', monospace" } : undefined}>{children}</td>
}
