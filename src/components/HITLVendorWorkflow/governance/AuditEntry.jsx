const TONE = {
  'signoff.approved': 'text-teal', 'signoff.blocked': 'text-error', 'signoff.requested': 'text-ocean',
  'mode.change': 'text-amber-deep', 'mode.manual_override': 'text-amber-deep',
  'rbac.view_as': 'text-slate', 'autonomy.threshold_change': 'text-amber-deep',
  'policy.violation': 'text-error',
}

function fmtTime(ts) {
  try { return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) }
  catch { return ts }
}

export default function AuditEntry({ entry }) {
  const tone = TONE[entry.eventType] || 'text-ink'
  const meta = entry.sessionMeta || {}
  const gateLabel = meta.gate ? `${meta.score ?? ''}→${meta.gate}` : ''
  return (
    <div className="grid items-center gap-3 px-3.5 py-2.5 text-[12.5px] border-t border-rule"
      style={{ gridTemplateColumns: '92px 132px 1fr 110px', fontFamily: "'IBM Plex Mono', monospace" }}>
      <span className="text-mist">{fmtTime(entry.timestamp)}</span>
      <span className="text-slate truncate">
        {entry.actorId || '—'}
        {entry.actorRole && <span className="ml-1.5 inline-block rounded bg-pale text-ocean px-1.5 text-[11px]">{entry.actorRole}</span>}
      </span>
      <span className={`font-semibold ${tone}`}>{entry.reason || entry.eventType}</span>
      <span className="text-mist text-right">{gateLabel}</span>
    </div>
  )
}
