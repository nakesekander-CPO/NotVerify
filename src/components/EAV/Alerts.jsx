/**
 * EAV — Alerts.
 *
 * Meaningful-change alerts (not small within-variance noise): severity, reason,
 * scope, exact evidence, recommended action, and acknowledgement state.
 */

import { useState } from 'react'
import { ALERTS } from '../../data/eav'
import { SectionHeading, Card, MonoLabel, SeverityBadge, SecondaryButton } from './shared'

export default function Alerts({ go }) {
  const [acked, setAcked] = useState(() => new Set(ALERTS.filter(a => a.ack).map(a => a.id)))
  const ack = (id) => setAcked(s => new Set(s).add(id))

  return (
    <div className="space-y-5">
      <SectionHeading title="Alerts" subtitle="Meaningful changes only — outside normal model variability." />
      <div className="space-y-3">
        {ALERTS.map(a => {
          const isAck = acked.has(a.id)
          return (
            <Card key={a.id} className={isAck ? 'opacity-60' : ''}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <SeverityBadge severity={a.severity} />
                    <p className="text-[13px] font-semibold text-ink">{a.reason}</p>
                  </div>
                  <p className="text-[11.5px] text-mist mt-1" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{a.scope} · evidence {a.evidence} · {a.when}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <SecondaryButton onClick={() => go(a.action?.startsWith('Open rec') ? 'recommendations' : 'knowledge')}>{a.action}</SecondaryButton>
                  {!isAck && <SecondaryButton onClick={() => ack(a.id)}>Acknowledge</SecondaryButton>}
                  {isAck && <span className="text-[11px] text-teal">Acknowledged</span>}
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
