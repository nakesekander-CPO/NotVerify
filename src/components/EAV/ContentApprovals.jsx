/**
 * EAV — Content & Approvals.
 *
 * Grounded drafting: every factual sentence cites an approved claim, policy
 * checks run inline, and the draft moves through the approval workflow
 * (draft → in_review → approved → published) with export. No unsupported
 * claims, fabricated evidence, or autonomous publishing.
 */

import { useState } from 'react'
import { Check, ShieldCheck, FileDown, Eye, Send } from 'lucide-react'
import { SAMPLE_DRAFT, CLAIMS, RECOMMENDATIONS } from '../../data/eav'
import { SectionHeading, Card, MonoLabel, PrimaryButton, SecondaryButton } from './shared'

const claim = (id) => CLAIMS.find(c => c.id === id)
const FLOW = ['draft', 'in_review', 'approved', 'published']

export default function ContentApprovals({ ctx }) {
  const rec = ctx?.recId ? RECOMMENDATIONS.find(r => r.id === ctx.recId) : null
  const [state, setState] = useState('draft')
  const draft = SAMPLE_DRAFT
  const stateIdx = FLOW.indexOf(state)

  return (
    <div className="space-y-5">
      <SectionHeading
        title="Content & Approvals"
        subtitle={rec ? `Grounded draft for: ${rec.title}` : 'Draft, review, and approve grounded content.'}
      />

      {/* Workflow strip */}
      <Card>
        <div className="flex items-center gap-2 flex-wrap">
          {FLOW.map((s, i) => (
            <span key={s} className="inline-flex items-center gap-2">
              {i > 0 && <span className="text-mist">→</span>}
              <span className={`text-[11.5px] px-2.5 py-1 rounded-full border ${i <= stateIdx ? 'bg-teal/10 text-teal border-teal/30' : 'bg-white text-mist border-rule'}`} style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                {i < stateIdx ? <Check className="w-3 h-3 inline mr-1" /> : null}{s.replace('_', ' ')}
              </span>
            </span>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-[1.5fr_1fr] gap-5 items-start">
        {/* Draft with sentence-level evidence */}
        <Card padding="p-0">
          <div className="px-5 py-3 border-b border-rule flex items-center justify-between">
            <p className="text-[13px] font-semibold text-ink">{draft.title}</p>
            <span className="text-[10.5px] text-mist uppercase" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{draft.locale}</span>
          </div>
          <div className="p-5 space-y-3">
            {draft.sentences.map((s, i) => {
              const c = claim(s.claim)
              return (
                <div key={i} className="border-l-2 border-teal/40 pl-3">
                  <p className="text-[13px] text-ink leading-relaxed">{s.text}</p>
                  <p className="text-[10.5px] text-teal mt-1 inline-flex items-center gap-1" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                    <ShieldCheck className="w-3 h-3" /> {s.claim} · {c ? `${c.subject} ${c.predicate} ${c.object}` : 'approved claim'} {c && <span className="text-mist">({c.evidence})</span>}
                  </p>
                </div>
              )
            })}
          </div>
          <div className="px-5 py-3 border-t border-rule">
            <MonoLabel>Policy checks</MonoLabel>
            {draft.policyWarnings.length === 0 ? (
              <p className="text-[12px] text-teal mt-1.5 inline-flex items-center gap-1"><Check className="w-3.5 h-3.5" /> All sentences cite approved claims · no unsupported claims · no policy violations.</p>
            ) : (
              <ul className="mt-1.5 text-[12px] text-amber-deep list-disc pl-4">{draft.policyWarnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
            )}
          </div>
        </Card>

        {/* Actions */}
        <div className="space-y-4">
          <Card>
            <MonoLabel>Review &amp; approval</MonoLabel>
            <div className="mt-2 flex flex-col gap-2">
              {state === 'draft' && <PrimaryButton onClick={() => setState('in_review')}><Send className="w-3.5 h-3.5" /> Request approval</PrimaryButton>}
              {state === 'in_review' && (
                <div className="flex gap-2">
                  <PrimaryButton onClick={() => setState('approved')}><Check className="w-3.5 h-3.5" /> Approve</PrimaryButton>
                  <SecondaryButton onClick={() => setState('draft')}>Return</SecondaryButton>
                </div>
              )}
              {state === 'approved' && <PrimaryButton onClick={() => setState('published')}>Publish (generic adapter)</PrimaryButton>}
              {state === 'published' && <p className="text-[12.5px] text-teal">✓ Published (demo) · version recorded · rollback available.</p>}
              <p className="text-[10.5px] text-mist">Approval is required before publication. Publishing is versioned and audited; nothing is published autonomously.</p>
            </div>
          </Card>
          <Card>
            <MonoLabel>Export</MonoLabel>
            <div className="mt-2 flex flex-wrap gap-2">
              {['Markdown', 'HTML', 'JSON'].map(f => (
                <SecondaryButton key={f} onClick={() => {}}><FileDown className="w-3.5 h-3.5" /> {f}</SecondaryButton>
              ))}
              <SecondaryButton onClick={() => {}}><Eye className="w-3.5 h-3.5" /> Preview</SecondaryButton>
            </div>
          </Card>
          <Card>
            <MonoLabel>Grounding</MonoLabel>
            <p className="text-[12px] text-slate mt-1.5">Every factual sentence is cited to an approved claim. If evidence were insufficient, the draft would return “insufficient approved evidence” rather than fill the gap.</p>
          </Card>
        </div>
      </div>
    </div>
  )
}
