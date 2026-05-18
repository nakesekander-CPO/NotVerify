import { useState, useMemo } from 'react'
import {
  Globe, Lock, Plus, Bot, ShieldCheck, AlertTriangle, Check, X,
  Pause, Play, Pin, PinOff, RotateCcw, UserCog, Sparkles,
} from 'lucide-react'
import { VENDOR_POOLS, VENDORS, SELECTION_POLICIES } from '../../data/hitlVendorWorkflow'
import { assessPool } from '../../services/hitl/poolCurationAgent'
import { appendAuditEvent } from '../../services/hitl/auditLog'
import { SectionHeading, Card, MonoLabel, KeyValueRow, StatusBadge, PrimaryButton, SecondaryButton } from './shared'

const MODES = {
  supervised: { label: 'Supervised', icon: UserCog, hint: 'Agent proposes · human approves every change' },
  autonomous: { label: 'Autonomous', icon: Bot,     hint: 'Agent applies recommendations automatically' },
  paused:     { label: 'Human hold', icon: Pause,   hint: 'Agent paused — human curates manually' },
}
const DEFAULT_STATE = { mode: 'supervised', addedIds: [], removedIds: [], pinnedIds: [], log: [] }

export default function VendorPoolManager({ currentUserId = 'demo-user' }) {
  const [selected, setSelected] = useState(VENDOR_POOLS[0]?.id)
  const [poolState, setPoolState] = useState({})

  const stateFor = (id) => poolState[id] || DEFAULT_STATE
  const pool = VENDOR_POOLS.find(p => p.id === selected)
  const policy = SELECTION_POLICIES.find(p => p.id === pool?.defaultSelectionPolicy)
  const st = stateFor(selected)

  const assessment = useMemo(
    () => assessPool(pool, { addedIds: st.addedIds, removedIds: st.removedIds, pinnedIds: st.pinnedIds }),
    [pool, st.addedIds, st.removedIds, st.pinnedIds]
  )

  /* ── Mutators ───────────────────────────────────────────────── */
  const patch = (poolId, fn) =>
    setPoolState(s => {
      const cur = s[poolId] || DEFAULT_STATE
      return { ...s, [poolId]: { ...cur, ...fn(cur) } }
    })

  const logEntry = (cur, who, action, vendor, detail) => ({
    log: [{ ts: new Date().toISOString(), who, action, vendor, detail }, ...cur.log].slice(0, 40),
  })

  const audit = (eventType, vendorId, reason, before, after) => {
    try {
      appendAuditEvent({
        actorId: currentUserId, actorRole: 'pool-curation',
        vendorId, eventType,
        beforeValue: before ?? null, afterValue: after ?? null,
        reason: reason || null,
        sessionMeta: { poolId: selected, surface: 'vendor-pool-agent' },
      })
    } catch { /* audit is best-effort in the prototype */ }
  }

  const applyRemove = (vendorId, who, reason) => {
    patch(selected, cur => ({
      removedIds: cur.removedIds.includes(vendorId) ? cur.removedIds : [...cur.removedIds, vendorId],
      addedIds: cur.addedIds.filter(id => id !== vendorId),
      ...logEntry(cur, who, 'removed', vendorId, reason || (who === 'agent' ? 'Failed pool constraint' : 'Human override')),
    }))
    audit('vendor.pool.member_removed', vendorId, reason, 'member', 'removed')
  }
  const applyAdd = (vendorId, who, reason) => {
    patch(selected, cur => ({
      addedIds: cur.addedIds.includes(vendorId) ? cur.addedIds : [...cur.addedIds, vendorId],
      removedIds: cur.removedIds.filter(id => id !== vendorId),
      ...logEntry(cur, who, 'added', vendorId, reason || (who === 'agent' ? 'Strong fit recommended' : 'Human override')),
    }))
    audit('vendor.pool.member_added', vendorId, reason, 'non-member', 'member')
  }
  const togglePin = (vendorId) => {
    patch(selected, cur => {
      const pinned = cur.pinnedIds.includes(vendorId)
      return {
        pinnedIds: pinned ? cur.pinnedIds.filter(id => id !== vendorId) : [...cur.pinnedIds, vendorId],
        ...logEntry(cur, 'human', pinned ? 'unpinned' : 'pinned', vendorId,
          pinned ? 'Released agent protection' : 'Protected from agent changes'),
      }
    })
    audit('vendor.pool.member_pinned', vendorId, null)
  }
  const setMode = (mode) => {
    patch(selected, cur => ({ mode, ...logEntry(cur, 'human', 'mode', null, `Agent mode → ${MODES[mode].label}`) }))
    audit('vendor.pool.agent_mode', null, MODES[mode].label, stateFor(selected).mode, mode)
  }
  const revert = (vendorId) => {
    patch(selected, cur => ({
      addedIds: cur.addedIds.filter(id => id !== vendorId),
      removedIds: cur.removedIds.filter(id => id !== vendorId),
      ...logEntry(cur, 'human', 'reverted', vendorId, 'Reverted to pool baseline'),
    }))
    audit('vendor.pool.member_reverted', vendorId, 'Human intervention')
  }

  const applyAllAgent = () => {
    if (!assessment) return
    assessment.members.filter(m => m.verdict === 'remove' && !m.pinned).forEach(m => applyRemove(m.vendor.id, 'agent'))
    assessment.candidates.forEach(c => applyAdd(c.vendor.id, 'agent'))
  }

  const isAutonomous = st.mode === 'autonomous'
  const isPaused = st.mode === 'paused'

  return (
    <div>
      <SectionHeading
        title="Vendor Pools"
        subtitle="Pools are agent-managed. The Pool Curation Agent continuously assesses composition against hard constraints and live vendor performance, proposing membership changes. A human can supervise, pause, override, or pin members at any time."
        actions={<PrimaryButton><Plus className="w-4 h-4" /> New pool</PrimaryButton>}
      />

      <div className="grid grid-cols-[1fr_2.2fr] gap-6">
        {/* ── Pool list with agent state ───────────────────────── */}
        <ul className="space-y-2">
          {VENDOR_POOLS.map(p => {
            const ps = stateFor(p.id)
            const a = assessPool(p, { addedIds: ps.addedIds, removedIds: ps.removedIds, pinnedIds: ps.pinnedIds })
            const ModeIcon = MODES[ps.mode].icon
            return (
              <li key={p.id}>
                <button
                  onClick={() => setSelected(p.id)}
                  className={`w-full text-left rounded-lg border p-3 transition-colors cursor-pointer ${selected === p.id ? 'border-ocean bg-pale/70' : 'border-rule bg-white hover:border-ocean/30'}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[13px] font-semibold text-ink truncate">{p.name}</p>
                    {p.approvalRequired ? <Lock className="w-3.5 h-3.5 text-amber shrink-0" /> : <Globe className="w-3.5 h-3.5 text-ocean shrink-0" />}
                  </div>
                  <p className="text-[11px] text-mist mt-0.5">{p.scope} · {a?.members.length || 0} member{(a?.members.length || 0) === 1 ? '' : 's'}</p>
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-ocean/10 text-ocean" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                      <ModeIcon className="w-3 h-3" /> {MODES[ps.mode].label}
                    </span>
                    {a?.summary.atRisk > 0 && (
                      <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-error/10 text-error" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                        <AlertTriangle className="w-3 h-3" /> {a.summary.atRisk} at risk
                      </span>
                    )}
                    {a?.summary.atRisk === 0 && a?.summary.watch > 0 && (
                      <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-amber/15 text-amber-deep" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                        {a.summary.watch} watch
                      </span>
                    )}
                    {a?.summary.atRisk === 0 && a?.summary.watch === 0 && (
                      <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-teal/10 text-teal" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                        <Check className="w-3 h-3" /> healthy
                      </span>
                    )}
                  </div>
                </button>
              </li>
            )
          })}
        </ul>

        {pool && assessment && (
          <div className="space-y-4">
            {/* ── Agent control center ─────────────────────────── */}
            <Card padding="p-0">
              <div className="px-5 py-4 border-b border-rule">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Bot className="w-4 h-4 text-ocean" />
                      <p className="text-[16px] font-semibold text-ink truncate">{pool.name}</p>
                    </div>
                    <p className="text-[12px] text-slate mt-1 max-w-lg">{pool.description}</p>
                    <div className="flex items-center gap-3 mt-2 text-[11px]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                      <span className="inline-flex items-center gap-1 text-ocean">
                        <Sparkles className="w-3 h-3" /> Pool Curation Agent
                      </span>
                      <span className="text-mist">confidence {assessment.summary.autonomyConfidence}%</span>
                      <span className={assessment.summary.pendingActions > 0 ? 'text-amber-deep' : 'text-teal'}>
                        {assessment.summary.pendingActions} pending action{assessment.summary.pendingActions === 1 ? '' : 's'}
                      </span>
                    </div>
                  </div>
                  {/* Mode switch */}
                  <div className="shrink-0">
                    <MonoLabel>Agent mode</MonoLabel>
                    <div className="inline-flex items-center rounded-md border border-rule overflow-hidden mt-1.5">
                      {Object.entries(MODES).map(([key, m]) => {
                        const Icon = m.icon
                        return (
                          <button
                            key={key}
                            onClick={() => setMode(key)}
                            title={m.hint}
                            className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-[11.5px] cursor-pointer transition-colors ${st.mode === key ? 'bg-ocean text-white' : 'bg-white text-slate hover:bg-pale'}`}
                          >
                            <Icon className="w-3.5 h-3.5" /> {m.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>

                {/* Mode-specific banner */}
                <div className={`mt-3 rounded-md px-3 py-2 text-[12px] flex items-center justify-between gap-3 ${
                  isPaused ? 'bg-amber/10 text-amber-deep' : isAutonomous ? 'bg-ocean/5 text-ocean' : 'bg-pale text-slate'
                }`}>
                  <span className="inline-flex items-center gap-2">
                    {isPaused ? <Pause className="w-3.5 h-3.5" /> : isAutonomous ? <Bot className="w-3.5 h-3.5" /> : <UserCog className="w-3.5 h-3.5" />}
                    {MODES[st.mode].hint}
                  </span>
                  {isAutonomous && assessment.summary.pendingActions > 0 && (
                    <button onClick={applyAllAgent} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-ocean text-white text-[11.5px] cursor-pointer hover:bg-ocean/90">
                      <Play className="w-3 h-3" /> Apply {assessment.summary.pendingActions} now
                    </button>
                  )}
                  {isPaused && (
                    <button onClick={() => setMode('supervised')} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-amber/40 text-amber-deep text-[11.5px] cursor-pointer hover:bg-amber/10">
                      <Play className="w-3 h-3" /> Resume agent
                    </button>
                  )}
                </div>
              </div>

              {/* Scope rules */}
              <div className="grid grid-cols-2 gap-x-6 px-5 py-4">
                <div>
                  <MonoLabel>Scope rules</MonoLabel>
                  <div className="mt-2">
                    <KeyValueRow label="Scope" value={pool.scope} />
                    <KeyValueRow label="Default policy" value={policy?.name || '—'} />
                    <KeyValueRow label="Min security tier" value={pool.securityMinTier} />
                    <KeyValueRow label="Approval required" value={pool.approvalRequired ? 'Yes' : 'No'} />
                  </div>
                </div>
                <div>
                  <MonoLabel>Allowed scope</MonoLabel>
                  <div className="mt-2">
                    <KeyValueRow label="Project types" value={pool.allowedProjectTypes.join(', ')} />
                    <KeyValueRow label="Languages" value={pool.allowedLanguages.join(', ')} />
                  </div>
                </div>
              </div>
            </Card>

            {/* ── Agent recommendations ────────────────────────── */}
            <Card padding="p-0">
              <div className="px-5 py-3 border-b border-rule flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-ocean" />
                <p className="text-[13px] font-semibold text-ink">Agent recommendations</p>
                <span className="ml-auto text-[11px] text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                  {assessment.summary.atRisk} remove · {assessment.summary.recommendedAdds} add
                </span>
              </div>

              <ul className="divide-y divide-rule">
                {assessment.members.filter(m => m.verdict === 'remove').map(m => (
                  <RecRow
                    key={m.vendor.id} kind="remove" assessment={m}
                    paused={isPaused} pinned={m.pinned}
                    onApprove={() => applyRemove(m.vendor.id, 'human', 'Approved agent recommendation')}
                    onOverride={() => { const r = window.prompt('Override the agent and KEEP this vendor — reason:'); if (r != null) { togglePin(m.vendor.id) } }}
                    onPin={() => togglePin(m.vendor.id)}
                  />
                ))}
                {assessment.candidates.map(c => (
                  <RecRow
                    key={c.vendor.id} kind="add" assessment={{ vendor: c.vendor, reasons: c.reasons.map(t => ({ kind: 'good', text: t })), confidence: 0.88 }}
                    paused={isPaused}
                    onApprove={() => applyAdd(c.vendor.id, 'human', 'Approved agent recommendation')}
                    onOverride={() => { const r = window.prompt('Dismiss this suggestion — reason (optional):'); audit('vendor.pool.suggestion_dismissed', c.vendor.id, r || 'Dismissed by human') }}
                  />
                ))}
                {assessment.summary.pendingActions === 0 && (
                  <li className="px-5 py-6 text-center text-[12.5px] text-teal inline-flex items-center justify-center gap-2 w-full">
                    <Check className="w-4 h-4" /> Composition is healthy — no agent actions pending.
                  </li>
                )}
              </ul>
            </Card>

            {/* ── Effective membership (human override) ────────── */}
            <Card padding="p-0">
              <div className="px-5 py-3 border-b border-rule flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserCog className="w-4 h-4 text-slate" />
                  <p className="text-[13px] font-semibold text-ink">Effective membership ({assessment.members.length})</p>
                </div>
                <AddMemberControl pool={pool} assessment={assessment} onAdd={(id) => applyAdd(id, 'human', 'Manually added by human')} />
              </div>
              <ul className="px-5 py-3 grid grid-cols-2 gap-2">
                {assessment.members.map(m => {
                  const v = m.vendor
                  const baseline = (pool.includedVendorIds || []).includes(v.id)
                  const verdictTone = m.verdict === 'remove' ? 'border-error/40 bg-error/5'
                    : m.verdict === 'watch' ? 'border-amber/40 bg-amber/5' : 'border-rule'
                  return (
                    <li key={v.id} className={`p-2.5 rounded-md border ${verdictTone}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[12.5px] text-ink truncate flex items-center gap-1.5">
                            {v.name}
                            {m.pinned && <Pin className="w-3 h-3 text-ocean" title="Pinned — protected from agent" />}
                          </p>
                          <p className="text-[10.5px] text-mist truncate">{v.region} · {v.type} · {v.securityTier}</p>
                        </div>
                        <StatusBadge status={v.status} />
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                          m.verdict === 'remove' ? 'bg-error/10 text-error' : m.verdict === 'watch' ? 'bg-amber/15 text-amber-deep' : 'bg-teal/10 text-teal'
                        }`} style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                          {m.verdict}
                        </span>
                        <div className="flex items-center gap-1">
                          <button onClick={() => togglePin(v.id)} title={m.pinned ? 'Unpin' : 'Pin (protect from agent)'} className="p-1 rounded hover:bg-pale text-slate cursor-pointer">
                            {m.pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                          </button>
                          {!baseline ? (
                            <button onClick={() => revert(v.id)} title="Revert (remove this human/agent add)" className="p-1 rounded hover:bg-pale text-slate cursor-pointer">
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button onClick={() => applyRemove(v.id, 'human', 'Manually removed by human')} title="Remove (human override)" className="p-1 rounded hover:bg-error/10 text-error cursor-pointer">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </Card>

            {/* ── Activity log ─────────────────────────────────── */}
            <Card padding="p-0">
              <div className="px-5 py-3 border-b border-rule flex items-center gap-2">
                <Bot className="w-4 h-4 text-ocean" />
                <p className="text-[13px] font-semibold text-ink">Agent & human activity</p>
              </div>
              {st.log.length === 0 ? (
                <p className="px-5 py-4 text-[12px] text-mist">No actions yet this session. Agent recommendations above are pending.</p>
              ) : (
                <ul className="px-5 py-2 max-h-[220px] overflow-y-auto">
                  {st.log.map((e, i) => {
                    const v = e.vendor ? VENDORS.find(x => x.id === e.vendor) : null
                    return (
                      <li key={i} className="py-2 border-b border-rule last:border-b-0 flex items-start gap-2 text-[12px]">
                        <span className={`mt-0.5 inline-flex items-center justify-center w-5 h-5 rounded-full text-[9px] font-semibold shrink-0 ${e.who === 'agent' ? 'bg-ocean/15 text-ocean' : 'bg-amber/15 text-amber-deep'}`} title={e.who}>
                          {e.who === 'agent' ? <Bot className="w-3 h-3" /> : 'H'}
                        </span>
                        <div className="min-w-0">
                          <p className="text-ink">
                            <span className="font-medium capitalize">{e.action}</span>
                            {v && <> · <span className="text-slate">{v.name}</span></>}
                          </p>
                          <p className="text-[10.5px] text-mist mt-0.5">
                            {e.detail} · {new Date(e.ts).toLocaleTimeString()}
                          </p>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Recommendation row ───────────────────────────────────────── */
function RecRow({ kind, assessment, paused, pinned, onApprove, onOverride, onPin }) {
  const v = assessment.vendor
  const isRemove = kind === 'remove'
  return (
    <li className="px-5 py-3">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-full font-semibold ${isRemove ? 'bg-error/10 text-error' : 'bg-teal/10 text-teal'}`} style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
              {isRemove ? <AlertTriangle className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
              {isRemove ? 'Remove' : 'Add'}
            </span>
            <p className="text-[13px] font-semibold text-ink truncate">{v.name}</p>
            <span className="text-[10.5px] text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
              {Math.round((assessment.confidence || 0.9) * 100)}% conf
            </span>
            {pinned && <span className="inline-flex items-center gap-1 text-[10px] text-ocean"><Pin className="w-3 h-3" /> pinned</span>}
          </div>
          <ul className="mt-1.5 space-y-0.5">
            {assessment.reasons.map((r, i) => (
              <li key={i} className={`text-[11.5px] flex items-start gap-1.5 ${
                r.kind === 'block' ? 'text-error' : r.kind === 'warn' ? 'text-amber-deep' : 'text-slate'
              }`}>
                <span className="mt-[3px] w-1 h-1 rounded-full bg-current shrink-0" />
                {r.text}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {paused ? (
            <span className="text-[11px] text-mist italic">Agent paused</span>
          ) : (
            <>
              <button onClick={onApprove} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-ocean text-white text-[11.5px] cursor-pointer hover:bg-ocean/90">
                <Check className="w-3 h-3" /> Approve
              </button>
              <button onClick={onOverride} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-rule text-slate text-[11.5px] cursor-pointer hover:bg-pale">
                <X className="w-3 h-3" /> {isRemove ? 'Keep (override)' : 'Dismiss'}
              </button>
              {isRemove && onPin && (
                <button onClick={onPin} title="Pin — protect from agent" className="p-1.5 rounded-md border border-rule text-slate cursor-pointer hover:bg-pale">
                  <Pin className="w-3.5 h-3.5" />
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </li>
  )
}

/* ── Manual add control (human override) ──────────────────────── */
function AddMemberControl({ pool, assessment, onAdd }) {
  const [open, setOpen] = useState(false)
  const memberIds = new Set(assessment.members.map(m => m.vendor.id))
  const eligible = VENDORS.filter(v => !memberIds.has(v.id))
  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-rule text-[11.5px] text-slate cursor-pointer hover:bg-pale">
        <Plus className="w-3.5 h-3.5" /> Add manually
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-72 max-h-72 overflow-y-auto bg-white border border-rule rounded-md shadow-lg z-20">
          {eligible.length === 0 && <p className="px-3 py-3 text-[12px] text-mist">All vendors already in pool.</p>}
          {eligible.map(v => (
            <button
              key={v.id}
              onClick={() => { onAdd(v.id); setOpen(false) }}
              className="w-full text-left px-3 py-2 hover:bg-pale cursor-pointer border-b border-rule last:border-b-0"
            >
              <p className="text-[12.5px] text-ink truncate">{v.name}</p>
              <p className="text-[10.5px] text-mist">{v.region} · {v.securityTier} · Q{v.qualityScore ?? '—'}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
