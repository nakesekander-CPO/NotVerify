import { useMemo, useState } from 'react'
import { Award, Brain, Sparkles, BookOpen, Mic, ArrowRight } from 'lucide-react'
import { USERS, ROLE_ASSIGNMENTS, ROLES } from '../../data/rbacModel'
import {
  REVIEW_DECISIONS, ORG_BRAIN_UPDATES, RATIONALE_CHIPS, HITL_SEGMENTS, getProjectById,
} from '../../data/hitlVendorWorkflow'
import { contributorLifetimeImpact } from '../../services/hitl/pedigree'
import { SectionHeading, Card, MonoLabel, ScoreBar, KeyValueRow } from './shared'

/**
 * Trainer Profile — the "Contributor Footprint" surface.
 *
 * Shows: lifetime impact stats, the Org Brain entries the trainer is
 * attributed to, the rationale tags they most often apply, and the
 * confidence lifts they have generated. Replaces the ephemeral
 * piecework view with a durable intellectual contribution record.
 */
export default function TrainerProfile({ currentUserId }) {
  const [viewedUserId, setViewedUserId] = useState(currentUserId || 'sarah')
  const user = USERS.find(u => u.id === viewedUserId)
  const roles = ROLE_ASSIGNMENTS.filter(a => a.userId === viewedUserId).map(a => ROLES.find(r => r.id === a.roleId)).filter(Boolean)
  const impact = useMemo(() => contributorLifetimeImpact(viewedUserId), [viewedUserId, REVIEW_DECISIONS.length, ORG_BRAIN_UPDATES.length])

  const memoryEntries = ORG_BRAIN_UPDATES.filter(o => (o.contributorFootprint || []).some(c => c.userId === viewedUserId))
  const tagBreakdown = Object.entries(impact.tagFrequency).sort((a, b) => b[1] - a[1])
  const maxTagCount = tagBreakdown[0]?.[1] || 1

  /* Candidate trainers — only show users who have at least one decision. */
  const candidates = useMemo(() => {
    const ids = new Set(REVIEW_DECISIONS.map(d => d.actorId).filter(Boolean))
    return USERS.filter(u => ids.has(u.id) || u.id === viewedUserId)
  }, [REVIEW_DECISIONS.length, viewedUserId])

  // Coarse certification bands.
  const band = (() => {
    const score = impact.adjudicated + impact.authored * 2 + impact.memoryEntries * 3
    if (score >= 20) return { label: 'Lead Trainer', tone: 'text-amber-deep', desc: 'Sustained measurable impact across model versions.' }
    if (score >= 8)  return { label: 'Practitioner', tone: 'text-ocean',      desc: 'Established contributor across multiple domains.' }
    return { label: 'Apprentice', tone: 'text-mist', desc: 'Building footprint. First memory promotion ahead.' }
  })()

  return (
    <div>
      <SectionHeading
        title="Trainer Profile"
        subtitle="Every adjudication is attributable. This is the durable record of your contribution to arbitr's intelligence — the work that makes models defensible."
      />

      {/* Trainer picker */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        {candidates.map(u => (
          <button
            key={u.id}
            onClick={() => setViewedUserId(u.id)}
            className={`px-3 py-1.5 rounded-md border text-[12px] cursor-pointer transition-colors ${viewedUserId === u.id ? 'bg-ocean text-white border-ocean' : 'bg-white border-rule text-ink hover:border-ocean/40'}`}
          >
            {u.name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-[2fr_3fr] gap-6">
        {/* Identity panel */}
        <Card padding="p-0">
          <div className="px-5 py-4 border-b border-rule bg-cream/60 flex items-center gap-4">
            <span className="w-14 h-14 rounded-full bg-ocean text-white text-[18px] font-semibold flex items-center justify-center" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{user?.initials}</span>
            <div>
              <p className="text-[18px] font-semibold text-ink">{user?.name}</p>
              <p className="text-[12px] text-mist">{user?.email}</p>
              <p className="text-[11px] text-slate mt-1">{roles.map(r => r.name).join(' · ') || 'No HITL role'}</p>
            </div>
          </div>
          <div className="px-5 py-4">
            <div className="flex items-center gap-2 mb-3">
              <Award className={`w-4 h-4 ${band.tone}`} />
              <span className={`text-[13px] font-semibold ${band.tone}`}>{band.label}</span>
            </div>
            <p className="text-[12px] text-slate leading-relaxed">{band.desc}</p>
            <div className="mt-4">
              <KeyValueRow label="Lifetime adjudications" value={impact.adjudicated} mono />
              <KeyValueRow label="Authored rulings" value={impact.authored} mono />
              <KeyValueRow label="Tagged decisions" value={impact.tagged} mono />
              <KeyValueRow label="Org Brain entries" value={impact.memoryEntries} mono />
              <KeyValueRow label="Confidence lifts (pts)" value={impact.confidenceLiftsRaw} mono />
              <KeyValueRow label="Domains touched" value={impact.memoryDomains.length ? impact.memoryDomains.join(', ') : '—'} />
            </div>
          </div>
        </Card>

        {/* Impact + tag breakdown + footprint */}
        <div className="space-y-5">
          <Card padding="p-0">
            <div className="px-5 py-3 border-b border-rule flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber" />
              <p className="text-[13px] font-semibold text-ink">Rationale signature</p>
            </div>
            <div className="px-5 py-3">
              {tagBreakdown.length === 0 ? (
                <p className="text-[12px] text-mist">No tagged decisions yet. Tag at least one adjudication in the workspace to start building a signature.</p>
              ) : (
                <ul className="space-y-2.5">
                  {tagBreakdown.map(([id, count]) => {
                    const chip = RATIONALE_CHIPS.find(c => c.id === id)
                    return (
                      <li key={id}>
                        <div className="flex items-center justify-between text-[12px]">
                          <span className="text-ink">{chip?.label || id}</span>
                          <span className="font-mono text-slate" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{count}</span>
                        </div>
                        <ScoreBar value={(count / maxTagCount) * 100} color="ocean" />
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </Card>

          <Card padding="p-0">
            <div className="px-5 py-3 border-b border-rule flex items-center gap-2">
              <Brain className="w-4 h-4 text-ocean" />
              <p className="text-[13px] font-semibold text-ink">Contributor footprint · Org Brain</p>
            </div>
            <div className="px-5 py-3">
              {memoryEntries.length === 0 ? (
                <p className="text-[12px] text-mist">No Org Brain entries attributed to this trainer yet. Memory promotions appear here after sign-off.</p>
              ) : (
                <ul className="space-y-2.5">
                  {memoryEntries.slice(-8).reverse().map(o => (
                    <li key={o.id} className="text-[12.5px] bg-pale/60 rounded p-2.5">
                      <p className="text-ink leading-relaxed">"{o.approvedFragment.slice(0, 160)}{o.approvedFragment.length > 160 ? '…' : ''}"</p>
                      <p className="text-[10.5px] text-mist mt-1" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                        {o.domain} · {o.language} · approved {new Date(o.approvedAt).toLocaleDateString()} · project {o.projectId}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
