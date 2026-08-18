/**
 * Video Dubbing — governed video localization page.
 *
 * One source video, every language — and every frame governed: script and
 * terminology checks run before any voice is cloned, a likeness & voice
 * consent gate (evidence on file) sits before lip sync, and human review
 * precedes export. Held tracks are the product working, never an error.
 * The lip-sync engine (LipDub) is credited in the pipeline detail only —
 * the offering is arbitr's.
 */

import { useState } from 'react'
import { Clapperboard, ShieldCheck, FileCheck2, ArrowRight, Bot, BadgeCheck, Clock, Plus } from 'lucide-react'
import { PageHeader } from '../ui'
import {
  DUB_STAGES, DUB_PROJECTS, dubbingSummary, consentFor,
} from '../../data/videoDubbing'
import { Card, MonoLabel, SectionHeading, StatusBadge, PrimaryButton } from '../HITLVendorWorkflow/shared'
import NewDubProject from './NewDubProject'
import { SAMPLE_SOURCE, RUN_LANGS } from '../../data/videoDubbing'

const TRACK_BADGE = {
  held: { status: 'awaiting-approval', label: 'Held' },
  'in-progress': { status: 'in-progress', label: 'In progress' },
  cleared: { status: 'approved', label: 'Cleared' },
}

const STAGE_LABEL = Object.fromEntries(DUB_STAGES.map(s => [s.id, s.label]))

export default function VideoDubbing({ onBack }) {
  const summary = dubbingSummary()
  const [view, setView] = useState('overview')          // overview | new
  const [extraProjects, setExtraProjects] = useState([])

  const completeRun = () => {
    setExtraProjects(ps => [{
      id: `VD-2026-${String(20 + ps.length)}`,
      name: SAMPLE_SOURCE.name.replace('.mp4', '').replace(/_/g, ' '),
      source: `${SAMPLE_SOURCE.srcLang} · ${SAMPLE_SOURCE.duration} · 1 speaker (${SAMPLE_SOURCE.speaker})`,
      speakers: [SAMPLE_SOURCE.consentId],
      tracks: RUN_LANGS.map(lang => ({ lang, stage: 'export', status: 'cleared', note: 'Delivered — sample output' })),
    }, ...ps])
    setView('overview')
  }

  if (view === 'new') {
    return (
      <div className="space-y-5">
        <NewDubProject onComplete={completeRun} onCancel={() => setView('overview')} />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <PageHeader
        icon={Clapperboard}
        title="Video Dubbing"
        subtitle="Governed video localization · one source, every language"
        onBack={onBack}
        actions={
          <>
            <span className="text-[11.5px] px-3 py-1.5 rounded-full bg-white border border-rule text-slate">
              <span className="font-bold text-ink" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{summary.projects}</span> projects ·{' '}
              <span className="font-bold text-ink" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{summary.tracks}</span> language tracks ·{' '}
              <span className="font-bold text-[#996800]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{summary.held}</span> held
            </span>
            <PrimaryButton onClick={() => setView('new')}><Plus className="w-4 h-4" /> New dubbing project</PrimaryButton>
          </>
        }
      />

      {/* ── Governed pipeline ── */}
      <Card padding="p-0">
        <div className="px-5 py-3 border-b border-rule flex items-center justify-between gap-2 flex-wrap">
          <p className="text-[13px] font-semibold text-ink">The governed pipeline</p>
          <p className="text-[10.5px] text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
            gates can hold a track · a hold is arbitr working
          </p>
        </div>
        <div className="p-4 overflow-x-auto">
          <div className="flex items-stretch gap-2 min-w-[980px]">
            {DUB_STAGES.map((s, i) => (
              <div key={s.id} className="flex items-center gap-2 flex-1 min-w-0">
                <div className={`flex-1 rounded-lg border p-3 h-full ${s.kind === 'gate' ? 'border-[#FFB000]/45 bg-[#FFF7E6]/60' : 'border-rule bg-white'}`}>
                  <div className="flex items-center gap-1.5">
                    {s.kind === 'gate'
                      ? <ShieldCheck className="w-3.5 h-3.5 text-[#996800] shrink-0" />
                      : <Bot className="w-3.5 h-3.5 text-ocean shrink-0" />}
                    <p className="text-[12px] font-semibold text-ink leading-tight">{s.label}</p>
                  </div>
                  <p className="text-[10.5px] text-slate leading-snug mt-1">{s.detail}</p>
                  {s.engine && (
                    <p className="text-[9.5px] text-mist mt-1.5" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{s.engine}</p>
                  )}
                </div>
                {i < DUB_STAGES.length - 1 && <ArrowRight className="w-3.5 h-3.5 text-mist shrink-0" aria-hidden="true" />}
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* ── Projects ── */}
      <SectionHeading
        title="Projects"
        subtitle="Each language track moves through the pipeline on its own — a held track never blocks the others."
      />
      <div className="space-y-4">
        {[...extraProjects, ...DUB_PROJECTS].map(p => {
          const consents = consentFor(p)
          return (
            <Card key={p.id} padding="p-0">
              <div className="px-5 py-3 border-b border-rule flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-[13.5px] font-semibold text-ink">{p.name}</p>
                  <p className="text-[10.5px] text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{p.id} · {p.source}</p>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {consents.map(c => (
                    <span
                      key={c.id}
                      className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border ${c.status === 'valid' ? 'bg-teal/10 text-teal border-teal/25' : 'bg-error/10 text-error border-error/30'}`}
                      style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                      title={`${c.scope} · ${c.doc}`}
                    >
                      {c.status === 'valid' ? <BadgeCheck className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                      {c.speaker.split(',')[0]} · consent {c.status === 'valid' ? `to ${c.validUntil}` : 'expired'}
                    </span>
                  ))}
                </div>
              </div>
              <ul className="divide-y divide-rule/70">
                {p.tracks.map(t => {
                  const badge = TRACK_BADGE[t.status]
                  return (
                    <li key={t.lang} className="px-5 py-2.5 flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="w-9 text-[11px] font-bold text-ink" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{t.lang}</span>
                          <span className="text-[11px] text-slate">{STAGE_LABEL[t.stage]}</span>
                          {t.note && <span className="text-[10.5px] text-mist">· {t.note}</span>}
                        </div>
                        {t.status === 'held' && (
                          <p className="text-[11.5px] text-slate mt-1 ml-11">
                            <span className="font-medium text-[#996800]">{t.reason}</span>
                            <span className="block text-[10px] text-mist mt-0.5" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                              {t.source} · reviewer {t.reviewer.name}
                            </span>
                          </p>
                        )}
                      </div>
                      <StatusBadge status={badge.status}>{badge.label}</StatusBadge>
                    </li>
                  )
                })}
              </ul>
            </Card>
          )
        })}
      </div>

      {/* ── Evidence note ── */}
      <p className="text-[10.5px] text-mist flex items-center gap-1.5" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
        <FileCheck2 className="w-3.5 h-3.5" />
        Every export ships with its evidence trail — script checks, consent records, and reviewer sign-off. Simulation for demo purposes.
      </p>
    </div>
  )
}
