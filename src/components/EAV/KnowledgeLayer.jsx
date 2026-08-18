/**
 * EAV — Trusted Enterprise Knowledge Layer.
 *
 * The governed store of approved facts: entities, atomic claims (with review
 * states), evidence, conflicts, freshness, locale variants, public/private
 * classification, and source lineage. Only approved public claims are eligible
 * for public content generation.
 */

import { useState } from 'react'
import { Boxes, FileText, AlertTriangle, Database, Lock, Globe } from 'lucide-react'
import { ENTITIES, CLAIMS, CONFLICTS, SOURCES } from '../../data/eav'
import { SectionHeading, Card, MonoLabel } from './shared'

const TABS = [
  { id: 'entities', label: 'Entities', icon: Boxes },
  { id: 'claims', label: 'Claims', icon: FileText },
  { id: 'conflicts', label: 'Conflicts', icon: AlertTriangle },
  { id: 'sources', label: 'Sources', icon: Database },
]

const CLAIM_STATE_TONE = {
  approved: 'text-teal bg-teal/10 border-teal/30',
  needs_review: 'text-[#996800] bg-[#FFF7E6] border-[#FFB000]/40',
  disputed: 'text-error bg-error/10 border-error/30',
  expired: 'text-mist bg-rule/60 border-rule-strong',
  rejected: 'text-error bg-error/10 border-error/30',
  extracted: 'text-slate bg-pale border-rule',
  superseded: 'text-mist bg-rule/60 border-rule-strong',
}

export default function KnowledgeLayer() {
  const [tab, setTab] = useState('claims')
  return (
    <div className="space-y-5">
      <SectionHeading title="Knowledge Layer" subtitle="Trusted Enterprise Knowledge Layer — approved facts, evidence, and lineage." />

      <div className="flex items-center gap-1 border-b border-rule">
        {TABS.map(t => {
          const Icon = t.icon
          const active = tab === t.id
          return (
            <button key={t.id} onClick={() => setTab(t.id)} className={`inline-flex items-center gap-1.5 px-3 py-2 -mb-px border-b-2 text-[12.5px] cursor-pointer ${active ? 'border-ocean text-ocean font-semibold' : 'border-transparent text-slate hover:bg-pale/50'}`}>
              <Icon className="w-3.5 h-3.5" /> {t.label}
            </button>
          )
        })}
      </div>

      {tab === 'entities' && (
        <Card padding="p-0">
          <table className="w-full text-[12.5px]">
            <thead><tr className="bg-pale/50 border-b border-rule text-left">{['Entity', 'Type', 'Aliases', 'Locales'].map(h => <th key={h} className="px-4 py-2.5 text-[10px] uppercase tracking-wider text-mist font-semibold" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{h}</th>)}</tr></thead>
            <tbody>
              {ENTITIES.map(e => (
                <tr key={e.id} className="border-b border-rule/60 last:border-b-0">
                  <td className="px-4 py-2.5 text-ink font-medium">{e.name}</td>
                  <td className="px-4 py-2.5 text-slate">{e.type}</td>
                  <td className="px-4 py-2.5 text-slate">{e.aliases.join(', ') || '—'}</td>
                  <td className="px-4 py-2.5 text-mist uppercase" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{e.locales.join(' ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {tab === 'claims' && (
        <Card padding="p-0">
          <table className="w-full text-[12.5px]">
            <thead><tr className="bg-pale/50 border-b border-rule text-left">{['Claim', 'Locale', 'State', 'Public', 'Evidence', 'Confidence'].map(h => <th key={h} className="px-4 py-2.5 text-[10px] uppercase tracking-wider text-mist font-semibold" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{h}</th>)}</tr></thead>
            <tbody>
              {CLAIMS.map(c => (
                <tr key={c.id} className="border-b border-rule/60 last:border-b-0 hover:bg-pale/40">
                  <td className="px-4 py-2.5 text-ink max-w-[360px]"><span className="text-ink">{c.subject}</span> <span className="text-mist">{c.predicate}</span> <span className="text-slate">{c.object}</span></td>
                  <td className="px-4 py-2.5 text-slate uppercase" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{c.locale}</td>
                  <td className="px-4 py-2.5"><span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${CLAIM_STATE_TONE[c.state]}`} style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{c.state.replace('_', ' ')}</span></td>
                  <td className="px-4 py-2.5">{c.public ? <Globe className="w-3.5 h-3.5 text-ocean" title="Public-eligible" /> : <Lock className="w-3.5 h-3.5 text-mist" title="Not public" />}</td>
                  <td className="px-4 py-2.5 text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{c.evidence}</td>
                  <td className="px-4 py-2.5 text-slate" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{Math.round(c.confidence * 100)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-[10.5px] text-mist px-4 py-2.5 border-t border-rule">Only <strong className="text-teal">approved</strong> + public claims are eligible for public content generation.</p>
        </Card>
      )}

      {tab === 'conflicts' && (
        <div className="space-y-3">
          {CONFLICTS.map(cf => (
            <Card key={cf.id}>
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-3.5 h-3.5 text-[#996800]" />
                <p className="text-[13px] font-semibold text-ink">{cf.claim}</p>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#FFF7E6] text-[#996800] border border-[#FFB000]/40">{cf.severity}</span>
              </div>
              <p className="text-[12.5px] text-slate">{cf.detail}</p>
              <p className="text-[10.5px] text-mist mt-1.5" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>Sources: {cf.sources.join(' · ')} · status: {cf.status}</p>
            </Card>
          ))}
          {CONFLICTS.length === 0 && <Card><p className="text-[12px] text-teal">No open conflicts.</p></Card>}
        </div>
      )}

      {tab === 'sources' && (
        <Card padding="p-0">
          <table className="w-full text-[12.5px]">
            <thead><tr className="bg-pale/50 border-b border-rule text-left">{['Source', 'Kind', 'Classification', 'Status', 'Locale', 'Last sync'].map(h => <th key={h} className="px-4 py-2.5 text-[10px] uppercase tracking-wider text-mist font-semibold" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{h}</th>)}</tr></thead>
            <tbody>
              {SOURCES.map(s => (
                <tr key={s.id} className="border-b border-rule/60 last:border-b-0">
                  <td className="px-4 py-2.5 text-ink">{s.name}{s.ocrWarning && <span className="ml-1.5 text-[10px] text-[#996800]">OCR review</span>}{s.neverPublic && <span className="ml-1.5 text-[10px] text-error">never public</span>}</td>
                  <td className="px-4 py-2.5 text-slate">{s.kind}</td>
                  <td className="px-4 py-2.5">{s.classification === 'private' ? <span className="text-error inline-flex items-center gap-1"><Lock className="w-3 h-3" /> private</span> : <span className="text-slate">public</span>}</td>
                  <td className="px-4 py-2.5 text-slate">{s.status.replace('_', ' ')}</td>
                  <td className="px-4 py-2.5 text-mist uppercase" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{s.locale}</td>
                  <td className="px-4 py-2.5 text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{s.lastSync}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}
