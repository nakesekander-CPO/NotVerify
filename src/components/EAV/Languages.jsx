/**
 * EAV — Languages.
 *
 * Per-configured-locale coverage, prominence, and accuracy, with a parity
 * component measured against the reference locale (English). Only configured
 * target locales are evaluated; a locale is not "supported" merely because a
 * provider accepts text in it.
 */

import { LANGUAGE_COVERAGE } from '../../data/eav'
import { SectionHeading, Card, MonoLabel, ScoreBar } from './shared'

export default function Languages() {
  const ref = LANGUAGE_COVERAGE.find(l => l.reference) || LANGUAGE_COVERAGE[0]
  const parity = (v) => (ref.coverage ? Math.round((v / ref.coverage) * 100) : 0)

  return (
    <div className="space-y-5">
      <SectionHeading title="Languages" subtitle={`Performance by configured locale, with parity vs the reference locale (${ref.name}).`} />

      <Card padding="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="bg-pale/50 border-b border-rule text-left">
                {['Locale', 'Coverage', 'Prominence', 'Accuracy', 'Parity vs ref'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-[10px] uppercase tracking-wider text-mist font-semibold" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {LANGUAGE_COVERAGE.map(l => {
                const p = l.reference ? 100 : parity(l.coverage)
                return (
                  <tr key={l.code} className="border-b border-rule/60 last:border-b-0">
                    <td className="px-4 py-3 text-ink whitespace-nowrap">{l.name}{l.reference && <span className="text-[10px] text-mist"> · reference</span>}</td>
                    <td className="px-4 py-3 w-[220px]"><Bar v={l.coverage} /></td>
                    <td className="px-4 py-3 w-[220px]"><Bar v={l.prominence} /></td>
                    <td className="px-4 py-3 w-[220px]"><Bar v={l.accuracy} /></td>
                    <td className="px-4 py-3">
                      <span className={`text-[12px] font-medium ${p >= 70 ? 'text-teal' : p >= 40 ? 'text-[#996800]' : 'text-error'}`} style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{p}%</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <MonoLabel>Reading</MonoLabel>
        <p className="text-[12.5px] text-slate mt-1.5 leading-relaxed">
          Vietnamese, Spanish, and Hindi trail English materially — the largest parity gap is a leading driver of the
          Multilingual dimension (50/100). Localised, source-backed content is the highest-leverage fix; see
          <span className="text-ocean"> Recommendations</span>.
        </p>
      </Card>
    </div>
  )
}

function Bar({ v }) {
  const tone = v >= 60 ? 'bg-teal' : v >= 25 ? 'bg-amber' : 'bg-error'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-rule/60 overflow-hidden"><div className={`h-full ${tone}`} style={{ width: `${v}%` }} /></div>
      <span className="text-[11px] text-slate w-8 text-right" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{v}%</span>
    </div>
  )
}
