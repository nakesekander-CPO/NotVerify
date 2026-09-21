/**
 * Cortex — Change Review drawer (governed change register, 2026-09-21).
 *
 * The approver's working surface for a versioned claim: what changes
 * (version + evidence), where it lands (scope altitude + impact map,
 * computed live from the org tree and the RBAC engine), who must ratify
 * it (federated country sign-offs for a Global business claim), and
 * which local exceptions survive into re-affirmation.
 *
 * Every Sign / Decline / Re-affirm goes through the ONE engine via the
 * register mutations — refusals render the engine's reason verbatim,
 * so the admin/business split and scope rules are visible product.
 */

import { useState } from 'react'
import { X, FileText, GitCommitHorizontal, Users, ShieldCheck, Bot, BadgeCheck, CircleDashed } from 'lucide-react'
import { MonoLabel } from '../HITLVendorWorkflow/shared'
import { useToast } from '../ToastProvider'
import { useViewAs } from '../../services/rbac/viewAs'
import { can } from '../../services/rbac/engine'
import { USERS, ORG_NODES, NODE_TYPE_STYLES } from '../../data/rbacModel'
import {
  CLAIM_KIND_META, claimPermission, impactOf,
  signClaimUnit, declineClaimUnit, reaffirmException,
} from '../../data/changeRegister'

const MONO = { fontFamily: "'IBM Plex Mono', monospace" }
const userName = (id) => USERS.find(u => u.id === id)?.name || id
const nodeName = (id) => ORG_NODES.find(n => n.id === id)?.name || id

const STATUS_CHIP = {
  pending:  { label: 'Awaiting sign-off', cls: 'text-[#996800] bg-[#FFF7E6] border-[#FFB000]/45' },
  approved: { label: 'Published',         cls: 'text-teal bg-teal/10 border-teal/30' },
  rejected: { label: 'Rejected',          cls: 'text-error bg-error/10 border-error/30' },
}

export default function ChangeReview({ claim, onClose }) {
  const { addToast } = useToast()
  const [viewAs] = useViewAs()
  const [inlineReason, setInlineReason] = useState(null) // { unitNodeId, text }

  if (!claim) return null
  const meta = CLAIM_KIND_META[claim.kind]
  const impact = impactOf(claim)
  const chip = STATUS_CHIP[claim.status] || STATUS_CHIP.pending

  const handleSign = (unitNodeId) => {
    const res = signClaimUnit(claim.id, unitNodeId, { actorId: viewAs })
    if (res.ok) {
      setInlineReason(null)
      addToast(res.published
        ? `${claim.id} published — exceptions moved to re-affirmation`
        : `Signed for ${nodeName(unitNodeId)}`, 'success')
    } else {
      setInlineReason({ unitNodeId, text: res.reason })
    }
  }

  const handleDecline = (unitNodeId) => {
    const res = declineClaimUnit(claim.id, unitNodeId, { actorId: viewAs, reason: 'Declined in review' })
    if (res.ok) { setInlineReason(null); addToast(`${claim.id} declined for ${nodeName(unitNodeId)}`, 'error') }
    else setInlineReason({ unitNodeId, text: res.reason })
  }

  const handleReaffirm = (excId, excNode) => {
    const res = reaffirmException(excId, { actorId: viewAs })
    if (res.ok) addToast(`Exception re-affirmed for ${nodeName(excNode)}`, 'success')
    else addToast(res.reason, 'error')
  }

  return (
    <aside
      aria-label={`Change review — ${claim.id}`}
      className="absolute inset-y-0 right-0 w-[460px] max-w-full z-20 bg-white/95 backdrop-blur-sm border-l border-rule shadow-[-12px_0_32px_rgba(13,9,42,0.08)] overflow-y-auto"
    >
      <div className="p-5 space-y-5">
        {/* Identity */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.14em] border rounded-full px-2 py-0.5 ${chip.cls}`} style={MONO}>
                <BadgeCheck className="w-3 h-3" /> {chip.label}
              </span>
              <MonoLabel>{meta.label}</MonoLabel>
              <MonoLabel>{claim.id}</MonoLabel>
            </div>
            <h3 className="text-[16px] font-semibold text-ink leading-snug">{claim.title}</h3>
            <p className="text-[12px] text-slate mt-1 leading-relaxed">{claim.summary}</p>
            <p className="text-[11px] text-mist mt-1.5">
              Owner {userName(claim.ownerId)} · proposed {claim.proposedAt?.slice(0, 10)}
            </p>
          </div>
          <button onClick={onClose} aria-label="Close change review" className="shrink-0 w-7 h-7 rounded-lg border border-rule text-slate hover:text-ink hover:bg-pale flex items-center justify-center cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scope */}
        <div className="border-t border-rule pt-4">
          <MonoLabel className="block mb-2">Scope</MonoLabel>
          <div className="flex items-center gap-1.5 flex-wrap text-[12px]">
            {impact.path.map((n, i) => {
              const style = NODE_TYPE_STYLES[n.type] || NODE_TYPE_STYLES.department
              return (
                <span key={n.id} className="inline-flex items-center gap-1.5">
                  {i > 0 && <span className="text-mist" aria-hidden>›</span>}
                  <span className={`px-2 py-0.5 rounded-md border ${style.bg} ${style.text} ${style.border}`}>{n.name}</span>
                </span>
              )
            })}
          </div>
        </div>

        {/* Version */}
        <div className="border-t border-rule pt-4">
          <MonoLabel className="block mb-2"><GitCommitHorizontal className="w-3 h-3 inline -mt-0.5 mr-1" />Version</MonoLabel>
          <p className="text-[13px] text-ink" style={MONO}>
            <span className="text-mist line-through">{claim.version.from}</span>
            <span className="text-mist mx-2" aria-hidden>→</span>
            <span className="font-bold">{claim.version.to}</span>
          </p>
          <p className="text-[11.5px] text-mist mt-1">Replaces {claim.version.from} everywhere inside this scope on publish.</p>
        </div>

        {/* Evidence */}
        <div className="border-t border-rule pt-4">
          <MonoLabel className="block mb-2">Evidence</MonoLabel>
          <div className="space-y-1.5">
            {claim.evidence.map(ev => (
              <p key={ev.src} className="flex items-start gap-1.5 text-[12px] text-ocean bg-ocean/[0.06] border border-ocean/15 rounded-lg px-2.5 py-1.5">
                <FileText className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span className="min-w-0">{ev.label}<span className="block text-[10.5px] text-mist" style={MONO}>{ev.src} · {ev.date}</span></span>
              </p>
            ))}
          </div>
        </div>

        {/* Sign-offs */}
        <div className="border-t border-rule pt-4">
          <MonoLabel className="block mb-2"><ShieldCheck className="w-3 h-3 inline -mt-0.5 mr-1" />
            {claim.approvals.length > 1 ? 'Country sign-offs' : 'Sign-off'}
          </MonoLabel>
          {claim.approvals.length > 1 && (
            <p className="text-[11.5px] text-mist mb-2.5">A Global Company change is ratified per Country Business — it publishes when every country has signed.</p>
          )}
          <div className="space-y-2">
            {claim.approvals.map(slot => {
              const signable = claim.status === 'pending' && slot.status === 'pending'
              const probe = signable ? can({ principal: viewAs, permission: claimPermission(claim), nodeId: slot.unitNodeId }) : null
              return (
                <div key={slot.unitNodeId} className="rounded-lg border border-rule px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[12.5px] font-medium text-ink">{nodeName(slot.unitNodeId)}</p>
                      {slot.status === 'signed' ? (
                        <p className="text-[11px] text-teal mt-0.5 inline-flex items-center gap-1">
                          <BadgeCheck className="w-3 h-3" /> Signed by {userName(slot.by)} · {slot.at?.slice(0, 10)}
                        </p>
                      ) : slot.status === 'declined' ? (
                        <p className="text-[11px] text-error mt-0.5">Declined by {userName(slot.by)} · {slot.at?.slice(0, 10)}</p>
                      ) : (
                        <p className="text-[11px] text-[#996800] mt-0.5 inline-flex items-center gap-1">
                          <CircleDashed className="w-3 h-3" /> Awaiting sign-off
                        </p>
                      )}
                      {slot.note && <p className="text-[11px] text-mist mt-1">“{slot.note}”</p>}
                    </div>
                    {signable && (
                      <div className="shrink-0 flex items-center gap-1.5">
                        <button
                          onClick={() => handleDecline(slot.unitNodeId)}
                          className="px-2 py-1.5 rounded-lg text-[11.5px] font-medium text-slate hover:text-error hover:bg-error/[0.06] transition-colors cursor-pointer"
                        >
                          Decline
                        </button>
                        <button
                          onClick={() => handleSign(slot.unitNodeId)}
                          className={`px-2.5 py-1.5 rounded-lg text-[11.5px] font-medium border transition-colors cursor-pointer ${
                            probe?.allow
                              ? 'bg-amber text-white border-transparent hover:opacity-90'
                              : 'bg-white text-slate border-rule hover:bg-pale'
                          }`}
                        >
                          Sign for {nodeName(slot.unitNodeId).replace('Meridian ', '')}
                        </button>
                      </div>
                    )}
                  </div>
                  {inlineReason?.unitNodeId === slot.unitNodeId && (
                    <p className="mt-2 text-[11.5px] text-error bg-error/[0.06] border border-error/20 rounded-lg px-2.5 py-1.5" role="alert">
                      {inlineReason.text}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Impact map */}
        <div className="border-t border-rule pt-4">
          <MonoLabel className="block mb-2"><Users className="w-3 h-3 inline -mt-0.5 mr-1" />Impact map</MonoLabel>
          <p className="text-[12.5px] text-slate mb-2.5">
            <strong className="text-ink font-semibold">{impact.peopleCount} principals</strong> across{' '}
            <strong className="text-ink font-semibold">{impact.nodeCount} org node{impact.nodeCount === 1 ? '' : 's'}</strong>
            {impact.teamCount > 0 && <> ({impact.teamCount} department{impact.teamCount === 1 ? '' : 's'}/teams)</>} inherit this change.
          </p>
          <div className="space-y-2">
            {impact.byAltitude.map(alt => (
              <div key={alt.key}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-mist mb-1" style={MONO}>{alt.label}</p>
                <div className="flex flex-wrap gap-1.5">
                  {alt.nodes.map(({ node, memberCount }) => (
                    <span key={node.id} className="inline-flex items-center gap-1.5 text-[11.5px] text-slate bg-pale border border-rule rounded-full px-2.5 py-1">
                      {node.name}
                      <span className="text-mist" style={MONO}>{memberCount}</span>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {impact.uses.length > 0 && (
            <div className="mt-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-mist mb-1" style={MONO}>Affected uses</p>
              <div className="flex flex-wrap gap-1.5">
                {impact.uses.map(u => (
                  <span key={u.label + u.detail} className="inline-flex items-center gap-1.5 text-[11.5px] text-violet-700 bg-violet-500/[0.08] border border-violet-500/20 rounded-full px-2.5 py-1">
                    <Bot className="w-3 h-3" /> {u.label}
                    <span className="text-mist normal-case">{u.detail}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Exceptions */}
        {impact.exceptions.length > 0 && (
          <div className="border-t border-rule pt-4">
            <MonoLabel className="block mb-2">Local exceptions</MonoLabel>
            <p className="text-[11.5px] text-mist mb-2.5">
              Approved local deviations survive this change — publishing moves them to re-affirmation, never silently voids them.
            </p>
            <div className="space-y-2">
              {impact.exceptions.map(exc => (
                <div key={exc.id} className={`rounded-lg border px-3 py-2.5 ${exc.status === 'reaffirm-required' ? 'border-[#FFB000]/45 bg-[#FFF7E6]' : 'border-rule'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[11px] text-mist" style={MONO}>{exc.id} · {nodeName(exc.nodeId)}</p>
                      <p className="text-[12px] text-slate mt-0.5 leading-snug">{exc.reason}</p>
                      <p className="text-[11px] mt-1">
                        {exc.status === 'in-force' && <span className="text-teal">In force · owner {userName(exc.ownerId)}</span>}
                        {exc.status === 'reaffirm-required' && <span className="text-[#996800] font-medium">Re-affirmation required — approval predates {claim.version.to} · owner {userName(exc.ownerId)}</span>}
                        {exc.status === 'reaffirmed' && <span className="text-teal">Re-affirmed by {userName(exc.reaffirmedBy)} · {exc.reaffirmedAt?.slice(0, 10)}</span>}
                      </p>
                    </div>
                    {exc.status === 'reaffirm-required' && (
                      <button
                        onClick={() => handleReaffirm(exc.id, exc.nodeId)}
                        className="shrink-0 px-2.5 py-1.5 rounded-lg text-[11.5px] font-medium bg-white border border-rule text-slate hover:bg-pale hover:text-ink transition-colors cursor-pointer"
                      >
                        Re-affirm
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
