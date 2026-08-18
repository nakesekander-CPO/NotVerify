/**
 * Governance dashboard — SwiftBridge status card.
 *
 * SwiftBridge is one specific workflow (Japan IR localization on committed
 * SLAs), so it surfaces on the dashboard like any other work in flight:
 * active projects with live SLA countdowns and a blocked flag, opening the
 * full SwiftBridge page. Data comes from the same seeded model the page
 * itself renders — one story.
 */

import { useMemo } from 'react'
import { Languages, Clock, AlertTriangle, ChevronRight } from 'lucide-react'
import { getSwiftBridgeDemo, slaCountdown } from '../../services/swiftbridge/swiftbridgeModel'
import { Card } from '../HITLVendorWorkflow/shared'

export default function SwiftBridgeCard({ onOpenSwiftBridge }) {
  const { projects } = useMemo(() => getSwiftBridgeDemo(), [])
  const active = projects.filter(p => p.status !== 'delivered')
  const blocked = active.filter(p => p.status === 'blocked')
  const soonest = active
    .map(p => ({ p, c: slaCountdown(p) }))
    .sort((a, b) => a.c.dueAt - b.c.dueAt)
    .slice(0, 2)

  return (
    <Card padding="p-0">
      <button
        onClick={() => onOpenSwiftBridge?.()}
        className="w-full text-left cursor-pointer group"
        aria-label="Open SwiftBridge"
      >
        <div className="px-4 py-3 border-b border-rule flex items-center justify-between gap-2">
          <span className="flex items-center gap-2.5 min-w-0">
            <span className="w-8 h-8 rounded-lg bg-straker-900 flex items-center justify-center shrink-0">
              <Languages className="w-4 h-4 text-lens" />
            </span>
            <span className="min-w-0">
              <span className="block text-[12.5px] font-semibold text-ink">SwiftBridge · Japan IR</span>
              <span className="block text-[10px] text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                アビタAI · SLA-committed delivery
              </span>
            </span>
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-mist shrink-0 group-hover:translate-x-0.5 transition-transform" />
        </div>

        <div className="px-4 py-3 space-y-2">
          <p className="text-[11px] text-slate">
            <span className="font-semibold text-ink">{active.length} active</span>
            {blocked.length > 0 && (
              <span className="text-[#996800]"> · {blocked.length} blocked — action needed</span>
            )}
          </p>
          {soonest.map(({ p, c }) => (
            <div key={p.id} className="flex items-center justify-between gap-2">
              <span className="text-[11.5px] text-ink truncate">{p.name}</span>
              <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border whitespace-nowrap shrink-0 ${c.remainingHours <= 6 ? 'bg-[#FFF7E6] text-[#996800] border-[#FFB000]/40' : 'bg-pale text-slate border-rule'}`} style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                {p.status === 'blocked' ? <AlertTriangle className="w-2.5 h-2.5" /> : <Clock className="w-2.5 h-2.5" />}
                {c.remainingHours}h left
              </span>
            </div>
          ))}
        </div>
      </button>
    </Card>
  )
}
