/**
 * Governance dashboard — the mechanic strip.
 *
 * Checks → Flags → Publishes: the core mechanic from the ruled positioning.
 * Replaces the old "Content Intake → Intelligence Extraction → Trusted
 * Output" pipeline strip. Static — it names the machine, the stat row
 * below carries the numbers.
 */

import { ScanSearch, Flag, CheckCircle2, ArrowRight } from 'lucide-react'
import { Card } from '../HITLVendorWorkflow/shared'

const STAGES = [
  {
    icon: ScanSearch,
    title: 'Checks',
    detail: 'Every change checked against your approved rules before it publishes',
    iconTone: 'bg-ocean/10 text-ocean',
  },
  {
    icon: Flag,
    title: 'Flags',
    detail: 'Risky changes held with a named reason and routed to a reviewer',
    iconTone: 'bg-[#FFF7E6] text-[#996800]',
  },
  {
    icon: CheckCircle2,
    title: 'Publishes',
    detail: 'Safe changes flow straight through to your live systems',
    iconTone: 'bg-teal/10 text-teal',
  },
]

export default function MechanicStrip() {
  return (
    <div className="flex items-stretch gap-3">
      {STAGES.map((s, i) => {
        const Icon = s.icon
        return (
          <div key={s.title} className="flex items-center gap-3 flex-1 min-w-0">
            <Card padding="p-4" className="flex-1 h-full">
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${s.iconTone}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[13.5px] font-semibold text-ink">{s.title}</p>
                  <p className="text-[11.5px] text-slate leading-snug mt-0.5">{s.detail}</p>
                </div>
              </div>
            </Card>
            {i < STAGES.length - 1 && <ArrowRight className="w-4 h-4 text-mist shrink-0" aria-hidden="true" />}
          </div>
        )
      })}
    </div>
  )
}
