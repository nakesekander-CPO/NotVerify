/**
 * EAV — Citations (source view).
 *
 * The domains AI assistants cite when representing the organisation: type,
 * first-party vs independent, resolvability, what they support, reliability,
 * and usage. Citation quality is multi-factor — not a generic SEO
 * "domain authority" proxy.
 */

import { CITATIONS } from '../../data/eav'
import { SectionHeading, Card, MonoLabel } from './shared'
import { Check, X } from 'lucide-react'

const SUPPORT_LABEL = { mention: 'Org mention', claim: 'A claim', competitor: 'A competitor' }
const RELIABILITY_TONE = { high: 'text-teal', medium: 'text-amber-deep', low: 'text-error' }

export default function Citations() {
  return (
    <div className="space-y-5">
      <SectionHeading title="Citations" subtitle="Sources assistants cite when representing Northstar. Quality is multi-factor, not domain authority." />

      <Card padding="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="bg-pale/50 border-b border-rule text-left">
                {['Domain', 'Type', 'Party', 'Resolvable', 'Supports', 'Reliability', 'Uses'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-[10px] uppercase tracking-wider text-mist font-semibold whitespace-nowrap" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CITATIONS.map(c => (
                <tr key={c.domain} className="border-b border-rule/60 last:border-b-0 hover:bg-pale/40">
                  <td className="px-4 py-2.5 text-ink" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{c.domain}</td>
                  <td className="px-4 py-2.5 text-slate whitespace-nowrap">{c.type}</td>
                  <td className="px-4 py-2.5">{c.firstParty ? <span className="text-[11px] text-ocean">First-party</span> : <span className="text-[11px] text-slate">Independent</span>}</td>
                  <td className="px-4 py-2.5">{c.resolvable ? <Check className="w-3.5 h-3.5 text-teal" /> : <X className="w-3.5 h-3.5 text-error" />}</td>
                  <td className="px-4 py-2.5 text-slate whitespace-nowrap">{SUPPORT_LABEL[c.supports] || c.supports}</td>
                  <td className={`px-4 py-2.5 ${RELIABILITY_TONE[c.reliability]}`}>{c.reliability}</td>
                  <td className="px-4 py-2.5 text-slate" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{c.uses}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <MonoLabel>Citation gaps</MonoLabel>
        <ul className="mt-2 space-y-1.5 text-[12.5px] text-slate list-disc pl-4">
          <li>One low-reliability blog citation is <strong className="text-error">unresolvable</strong> — a candidate for replacement with primary or independent evidence.</li>
          <li>Competitor first-party domains are cited more often than Northstar’s in the sampled set — strengthen legitimate independent citations.</li>
        </ul>
      </Card>
    </div>
  )
}
