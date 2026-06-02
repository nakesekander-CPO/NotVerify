# Governed HITL Slice 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the governance model glanceable and enforced across the HITL review experience — live confidence score + autonomy gate everywhere, a system-mode indicator, a configurable autonomy-threshold screen, RBAC-tiered sign-off with a designed blocked state, audit-native logging, and one Review Workspace shell that adapts across all three review modes — demoable via a persistent view-as-role switcher.

**Architecture:** Evolve the existing `src/components/HITLVendorWorkflow/` module. Add pure governance logic (`governance/gates.js`, `governance/capabilities.js`), four prop-driven presentational components, a thin `GovernanceProvider` context scoped to the HITL container (no App.jsx changes), one new screen (Autonomy & Modes), and instrument the existing `SecureVendorWorkspace` with gate/mode/sign-off. Reuse existing engines: `segmentPedigree`/`documentPedigree` (the 0–100 score), `rbac.js` (roles/permissions), `auditLog.js` (`appendAuditEvent`), and `project.requirements.reviewMode` (already one of `external-vendor` / `internal-single` / `internal-parallel`).

**Tech Stack:** React 19, Vite 8, Tailwind v4 (custom tokens: `ocean`, `ink`, `mist`, `slate`, `cream`, `pale`, `rule`, `teal`, `amber`/`amber-deep`, `sage`, `error`), lucide-react, Vitest (node env, pure-logic tests only — the repo has no DOM test setup; components are verified via the running preview).

**Testing strategy:** Pure logic (`gates.js`, `capabilities.js`) is TDD with real Vitest tests in `src/services/hitl/__tests__/` (matching existing style: `import { describe, it, expect } from 'vitest'`). React components/screens have **no unit tests** (consistent with the existing module — there is no jsdom/testing-library setup, and adding one is out of scope). They are verified by clicking through the running dev server (`http://localhost:5714`) as each persona. Every task ends with `npm test` green where tests exist, and the final task runs `npm run build`.

**Conventions:**
- Score for any segment = `segmentPedigree(segmentId)?.composite ?? null`; for a document = `documentPedigree(projectId)?.composite ?? null`. Treat `null` as "not yet scored" and render a neutral placeholder.
- All governed mutations call `appendAuditEvent({ actorId, actorRole, eventType, reason, beforeValue, afterValue, projectId, sessionMeta })`. `eventType` and `actorId` are required. Put `{ score, gate }` context into `sessionMeta`.
- New audit `eventType`s introduced by this slice: `rbac.view_as`, `mode.change`, `mode.manual_override`, `autonomy.threshold_change`, `signoff.approved`, `signoff.blocked`, `signoff.requested`.

---

## File Structure

**Create:**
- `src/components/HITLVendorWorkflow/governance/gates.js` — gate thresholds + `gateFor()` + gate display metadata (pure)
- `src/components/HITLVendorWorkflow/governance/capabilities.js` — capability tiers, `tierForRole()`, `canSignOff()`, `canManageAutonomy()`, `PERSONAS` (pure)
- `src/context/GovernanceStore.jsx` — `GovernanceProvider` + `useGovernance()`
- `src/components/HITLVendorWorkflow/governance/GateBadge.jsx`
- `src/components/HITLVendorWorkflow/governance/ModeIndicator.jsx`
- `src/components/HITLVendorWorkflow/governance/SignoffControl.jsx`
- `src/components/HITLVendorWorkflow/governance/AuditEntry.jsx`
- `src/components/HITLVendorWorkflow/governance/ViewAsRoleSwitcher.jsx`
- `src/components/HITLVendorWorkflow/AutonomyAndModes.jsx` — new Govern screen
- `src/services/hitl/__tests__/gates.test.js`
- `src/services/hitl/__tests__/capabilities.test.js`

**Modify:**
- `src/components/HITLVendorWorkflow/index.jsx` — wrap content in `GovernanceProvider`, add mode indicator + role switcher to top bar, restructure nav groups, add `autonomy` screen
- `src/components/HITLVendorWorkflow/SecureVendorWorkspace.jsx` — mode switcher + doc/segment GateBadge + SignoffControl + per-segment gate dots
- `src/components/HITLVendorWorkflow/AuditLogViewer.jsx` — render rows via `AuditEntry`, add tones for new event types

---

## Task 1: Gate logic (`gates.js`)

**Files:**
- Create: `src/components/HITLVendorWorkflow/governance/gates.js`
- Test: `src/services/hitl/__tests__/gates.test.js`

- [ ] **Step 1: Write the failing test**

```js
// src/services/hitl/__tests__/gates.test.js
import { describe, it, expect } from 'vitest'
import { gateFor, GATES, DEFAULT_THRESHOLDS } from '../../../components/HITLVendorWorkflow/governance/gates'

describe('gateFor — autonomy gate from score', () => {
  const t = { escalate: 75, review: 92 }

  it('escalates below the escalate threshold', () => {
    expect(gateFor(0, t).id).toBe('escalate')
    expect(gateFor(74, t).id).toBe('escalate')
  })

  it('requires review between escalate and review thresholds (inclusive of escalate)', () => {
    expect(gateFor(75, t).id).toBe('review')
    expect(gateFor(91, t).id).toBe('review')
  })

  it('auto-publishes at or above the review threshold', () => {
    expect(gateFor(92, t).id).toBe('auto-publish')
    expect(gateFor(100, t).id).toBe('auto-publish')
  })

  it('uses DEFAULT_THRESHOLDS when none passed', () => {
    expect(gateFor(96).id).toBe('auto-publish')
    expect(gateFor(80).id).toBe('review')
    expect(gateFor(50).id).toBe('escalate')
  })

  it('every gate exposes label, dot, and chip classes', () => {
    for (const key of ['auto-publish', 'review', 'escalate']) {
      expect(typeof GATES[key].label).toBe('string')
      expect(typeof GATES[key].dot).toBe('string')
      expect(typeof GATES[key].chip).toBe('string')
    }
  })

  it('returns null gate for a null score', () => {
    expect(gateFor(null, t)).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/services/hitl/__tests__/gates.test.js`
Expected: FAIL — cannot resolve module `gates` / `gateFor is not a function`.

- [ ] **Step 3: Write minimal implementation**

```js
// src/components/HITLVendorWorkflow/governance/gates.js
/**
 * Autonomy gates — maps a 0–100 confidence score to the gate it sits at,
 * given per-project thresholds. Pure; no React, no data imports.
 */

export const DEFAULT_THRESHOLDS = { escalate: 75, review: 92 }

export const GATES = {
  'auto-publish': {
    id: 'auto-publish', label: 'Auto-publish', short: 'Auto',
    dot: 'bg-teal', text: 'text-teal', chip: 'text-teal bg-teal/10 border-teal/30',
    desc: 'Above threshold — ships with no human review.',
  },
  review: {
    id: 'review', label: 'Review required', short: 'Review',
    dot: 'bg-amber', text: 'text-amber-deep', chip: 'text-amber-deep bg-amber/15 border-amber/30',
    desc: 'Assignment is forced before publish.',
  },
  escalate: {
    id: 'escalate', label: 'Escalate to senior', short: 'Escalate',
    dot: 'bg-error', text: 'text-error', chip: 'text-error bg-error/10 border-error/30',
    desc: 'Second-reviewer escalation fires automatically.',
  },
}

/**
 * @param {number|null} score 0–100, or null if unscored
 * @param {{escalate:number, review:number}} thresholds
 * @returns gate object from GATES, or null when score is null
 */
export function gateFor(score, thresholds = DEFAULT_THRESHOLDS) {
  if (score == null || Number.isNaN(score)) return null
  if (score < thresholds.escalate) return GATES.escalate
  if (score < thresholds.review) return GATES.review
  return GATES['auto-publish']
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/services/hitl/__tests__/gates.test.js`
Expected: PASS (6 passing).

- [ ] **Step 5: Commit**

```bash
git add src/components/HITLVendorWorkflow/governance/gates.js src/services/hitl/__tests__/gates.test.js
git commit -m "feat(governance): add gate logic (gateFor + thresholds)"
```

---

## Task 2: Capability tiers (`capabilities.js`)

**Files:**
- Create: `src/components/HITLVendorWorkflow/governance/capabilities.js`
- Test: `src/services/hitl/__tests__/capabilities.test.js`

Maps the existing 17 roles (`src/data/rbacModel.js` → `ROLES`, each `{ id, name, permissions: [] }`) onto sign-off capability tiers, by **permission** (faithful + testable). Also defines the demo personas for the view-as-role switcher.

- [ ] **Step 1: Write the failing test**

```js
// src/services/hitl/__tests__/capabilities.test.js
import { describe, it, expect } from 'vitest'
import {
  TIERS, tierForRole, canSignOff, canManageAutonomy, PERSONAS,
} from '../../../components/HITLVendorWorkflow/governance/capabilities'

describe('tierForRole — capability tier from role permissions', () => {
  it('grants approve-publish to sign-off roles', () => {
    expect(tierForRole('final-validator')).toBe(TIERS.PUBLISH)
    expect(tierForRole('tenant-admin')).toBe(TIERS.PUBLISH)        // has '*'
    expect(tierForRole('arbitr-global-admin')).toBe(TIERS.PUBLISH) // has '*'
  })
  it('classifies client sign-off as approve-own', () => {
    expect(tierForRole('client-reviewer')).toBe(TIERS.APPROVE_OWN)
  })
  it('classifies vendor users as submit-only', () => {
    expect(tierForRole('vendor-user')).toBe(TIERS.SUBMIT)
  })
  it('classifies reviewers as review-comment', () => {
    expect(tierForRole('internal-reviewer')).toBe(TIERS.REVIEW)
    expect(tierForRole('compliance-reviewer')).toBe(TIERS.REVIEW)
    expect(tierForRole('vendor-manager')).toBe(TIERS.REVIEW)
  })
  it('classifies read-only roles as view-only', () => {
    expect(tierForRole('read-only-observer')).toBe(TIERS.VIEW)
    expect(tierForRole('auditor')).toBe(TIERS.VIEW)
  })
})

describe('canSignOff', () => {
  it('is true only for the publish tier', () => {
    expect(canSignOff('final-validator')).toBe(true)
    expect(canSignOff('internal-reviewer')).toBe(false)
    expect(canSignOff('vendor-user')).toBe(false)
  })
})

describe('canManageAutonomy', () => {
  it('is true for admins and final validators, false for reviewers', () => {
    expect(canManageAutonomy('arbitr-global-admin')).toBe(true)
    expect(canManageAutonomy('org-admin')).toBe(true)
    expect(canManageAutonomy('final-validator')).toBe(true)
    expect(canManageAutonomy('internal-reviewer')).toBe(false)
  })
})

describe('PERSONAS — demo view-as-role list', () => {
  it('maps each persona to a real role id', () => {
    const roleIds = PERSONAS.map(p => p.roleId)
    expect(roleIds).toContain('internal-reviewer')
    expect(roleIds).toContain('final-validator')
    expect(roleIds).toContain('vendor-user')
    PERSONAS.forEach(p => {
      expect(typeof p.id).toBe('string')
      expect(typeof p.label).toBe('string')
      expect(typeof p.roleId).toBe('string')
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/services/hitl/__tests__/capabilities.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```js
// src/components/HITLVendorWorkflow/governance/capabilities.js
/**
 * Capability tiers — derive sign-off authority from a role's permissions
 * (src/data/rbacModel.js ROLES). Pure; the only import is the role table.
 */
import { ROLES } from '../../../data/rbacModel'

export const TIERS = {
  PUBLISH: 'approve-publish',     // can approve & publish
  APPROVE_OWN: 'approve-own',     // client: approve own org's content
  REVIEW: 'review-comment',       // can review & comment
  SUBMIT: 'submit-only',          // external vendor: submit for internal review
  VIEW: 'view-only',
}

export const TIER_LABELS = {
  [TIERS.PUBLISH]: 'Approve & publish',
  [TIERS.APPROVE_OWN]: 'Approve own content',
  [TIERS.REVIEW]: 'Review & comment',
  [TIERS.SUBMIT]: 'Submit only',
  [TIERS.VIEW]: 'View only',
}

function permsFor(roleId) {
  const r = ROLES.find(x => x.id === roleId)
  return r ? r.permissions : []
}
function hasAny(perms, list) {
  return perms.some(p => p === '*' || list.includes(p))
}

export function tierForRole(roleId) {
  const p = permsFor(roleId)
  if (hasAny(p, ['signoff_output', 'final_validate'])) return TIERS.PUBLISH
  if (hasAny(p, ['client_signoff'])) return TIERS.APPROVE_OWN
  if (hasAny(p, ['submit_assigned_task', 'edit_assigned_segment', 'verify_assigned_segment'])) return TIERS.SUBMIT
  if (hasAny(p, [
    'review_vendor_work', 'verify_segment', 'edit_segment', 'compliance_review',
    'legal_review', 'approve_resource', 'manage_vendor:scope', 'review_recommendation',
    'edit_resource', 'request_changes',
  ])) return TIERS.REVIEW
  return TIERS.VIEW
}

export function canSignOff(roleId) {
  return tierForRole(roleId) === TIERS.PUBLISH
}

export function canManageAutonomy(roleId) {
  return hasAny(permsFor(roleId), ['manage_workflows', 'final_validate'])
}

/**
 * Demo personas for the view-as-role switcher. Each maps to a real role id
 * in rbacModel.js. (Finance has no dedicated role in slice 1; it maps to
 * `auditor` as a view-only stand-in until the money-loop slice adds one.)
 */
export const PERSONAS = [
  { id: 'production',  label: 'Production',         roleId: 'internal-reviewer' },
  { id: 'compliance',  label: 'Compliance (VP)',    roleId: 'final-validator' },
  { id: 'vendor-mgr',  label: 'Vendor Manager',     roleId: 'vendor-manager' },
  { id: 'linguist',    label: 'External Linguist',  roleId: 'vendor-user' },
  { id: 'client',      label: 'Client Editor',      roleId: 'client-reviewer' },
  { id: 'finance',     label: 'Finance',            roleId: 'auditor' },
  { id: 'admin',       label: 'Admin',              roleId: 'arbitr-global-admin' },
]
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/services/hitl/__tests__/capabilities.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/HITLVendorWorkflow/governance/capabilities.js src/services/hitl/__tests__/capabilities.test.js
git commit -m "feat(governance): add capability tiers + demo personas"
```

---

## Task 3: Governance state (`GovernanceStore.jsx`)

**Files:**
- Create: `src/context/GovernanceStore.jsx`

Thin context scoped to the HITL container. Holds current viewed role, system mode, manual override, thresholds, and a `record()` helper that writes to the audit log. No App.jsx changes.

- [ ] **Step 1: Write the provider + hook**

```jsx
// src/context/GovernanceStore.jsx
import { createContext, useContext, useState, useMemo, useCallback } from 'react'
import { getUserRoles } from '../services/hitl/rbac'
import { appendAuditEvent } from '../services/hitl/auditLog'
import { DEFAULT_THRESHOLDS } from '../components/HITLVendorWorkflow/governance/gates'

const GovernanceContext = createContext(null)

export function useGovernance() {
  const ctx = useContext(GovernanceContext)
  if (!ctx) throw new Error('useGovernance must be used within <GovernanceProvider>')
  return ctx
}

export function GovernanceProvider({ currentUserId, children }) {
  const initialRole = getUserRoles(currentUserId)[0]?.id || 'internal-reviewer'
  const [currentRole, setCurrentRoleState] = useState(initialRole)
  const [systemMode, setSystemModeState] = useState('supervised') // 'autonomous' | 'supervised' | 'paused'
  const [manualOverride, setManualOverrideState] = useState(true)
  const [thresholds, setThresholds] = useState({ project: { ...DEFAULT_THRESHOLDS }, domains: {} })

  // Safe audit append (never throws into render).
  const record = useCallback((event) => {
    try { appendAuditEvent({ actorId: currentUserId, actorRole: currentRole, ...event }) } catch { /* demo: swallow */ }
  }, [currentUserId, currentRole])

  const setCurrentRole = useCallback((roleId) => {
    try {
      appendAuditEvent({
        actorId: currentUserId, actorRole: roleId, eventType: 'rbac.view_as',
        reason: `Viewing as ${roleId}`, beforeValue: currentRole, afterValue: roleId,
      })
    } catch { /* swallow */ }
    setCurrentRoleState(roleId)
  }, [currentUserId, currentRole])

  const setSystemMode = useCallback((mode) => {
    record({ eventType: 'mode.change', reason: `System mode → ${mode}`, beforeValue: systemMode, afterValue: mode })
    setSystemModeState(mode)
  }, [record, systemMode])

  const setManualOverride = useCallback((on) => {
    record({ eventType: 'mode.manual_override', reason: `Manual override ${on ? 'ON' : 'OFF'}`, beforeValue: manualOverride, afterValue: on })
    setManualOverrideState(on)
  }, [record, manualOverride])

  const value = useMemo(() => ({
    currentUserId, currentRole, setCurrentRole,
    systemMode, setSystemMode, manualOverride, setManualOverride,
    thresholds, setThresholds, record,
  }), [currentUserId, currentRole, setCurrentRole, systemMode, setSystemMode, manualOverride, setManualOverride, thresholds, record])

  return <GovernanceContext.Provider value={value}>{children}</GovernanceContext.Provider>
}
```

- [ ] **Step 2: Verify it compiles (build, not run yet)**

Run: `npx vite build 2>&1 | tail -5`
Expected: build succeeds (no import errors). The provider isn't mounted yet; this just checks the module resolves.

- [ ] **Step 3: Commit**

```bash
git add src/context/GovernanceStore.jsx
git commit -m "feat(governance): add GovernanceProvider context"
```

---

## Task 4: `GateBadge` component

**Files:**
- Create: `src/components/HITLVendorWorkflow/governance/GateBadge.jsx`

- [ ] **Step 1: Write the component**

```jsx
// src/components/HITLVendorWorkflow/governance/GateBadge.jsx
import { gateFor } from './gates'

/**
 * Live score + the autonomy gate it sits at.
 * @param score number|null  @param thresholds {escalate,review}
 * @param variant 'full' | 'compact'  @param onClick optional (opens explainer)
 */
export default function GateBadge({ score, thresholds, variant = 'compact', onClick, label }) {
  const gate = gateFor(score, thresholds)
  if (!gate) {
    return <span className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] font-semibold bg-cream text-mist border border-rule">— Unscored</span>
  }
  const t = thresholds || { escalate: 75, review: 92 }

  if (variant === 'compact') {
    return (
      <button
        type="button" onClick={onClick}
        className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] font-bold border ${gate.chip} ${onClick ? 'cursor-pointer' : 'cursor-default'}`}
        style={{ fontFamily: "'IBM Plex Mono', monospace" }}
      >
        {Math.round(score)} <span className={`w-1.5 h-1.5 rounded-full ${gate.dot}`} /> {gate.short}
      </button>
    )
  }

  return (
    <button
      type="button" onClick={onClick}
      className={`flex flex-col gap-1.5 rounded-xl px-3 py-2.5 border text-left min-w-[168px] ${gate.chip} ${onClick ? 'cursor-pointer' : 'cursor-default'}`}
    >
      <span className="flex items-baseline gap-2">
        <span className={`text-2xl font-extrabold leading-none ${gate.text}`} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{Math.round(score)}</span>
        <span className={`text-[11px] font-bold uppercase tracking-wide ${gate.text}`}>{label || gate.label}</span>
      </span>
      <span className="relative h-1.5 rounded bg-white/60 overflow-hidden">
        <span className={`absolute left-0 top-0 bottom-0 rounded ${gate.dot}`} style={{ width: `${Math.min(100, Math.max(0, score))}%` }} />
        <span className="absolute top-[-2px] w-0.5 h-2.5 bg-slate/50" style={{ left: `${t.escalate}%` }} />
        <span className="absolute top-[-2px] w-0.5 h-2.5 bg-slate/50" style={{ left: `${t.review}%` }} />
      </span>
      <span className="text-[11px] text-slate/85">{gate.desc}</span>
    </button>
  )
}
```

- [ ] **Step 2: Verify in preview**

Temporarily render `<GateBadge score={84} variant="full" />` and `<GateBadge score={96} />` and `<GateBadge score={61} />` at the top of `WorkflowOverview.jsx`'s returned JSX. Open `http://localhost:5714`, open the HITL workflow (Header → workflow entry), confirm three badges render with correct colors (amber / teal / red) and the full badge shows the threshold ticks. Remove the temporary render after confirming.

- [ ] **Step 3: Commit**

```bash
git add src/components/HITLVendorWorkflow/governance/GateBadge.jsx
git commit -m "feat(governance): add GateBadge component"
```

---

## Task 5: `ModeIndicator` component

**Files:**
- Create: `src/components/HITLVendorWorkflow/governance/ModeIndicator.jsx`

- [ ] **Step 1: Write the component**

```jsx
// src/components/HITLVendorWorkflow/governance/ModeIndicator.jsx
import { Hand } from 'lucide-react'

const MODE_META = {
  autonomous: { label: 'Autonomous', cls: 'bg-ink text-teal border-ink' },
  supervised: { label: 'Supervised', cls: 'bg-teal/15 text-teal border-teal/40' },
  paused:     { label: 'Paused',     cls: 'bg-amber/15 text-amber-deep border-amber/40' },
}

/**
 * Global system-mode pill + manual-override badge.
 * @param mode 'autonomous'|'supervised'|'paused'  @param manualOverride bool
 * @param canControl bool (else read-only)  @param onOpenControl fn
 */
export default function ModeIndicator({ mode, manualOverride, canControl, onOpenControl }) {
  const m = MODE_META[mode] || MODE_META.supervised
  return (
    <div className="flex items-center gap-2">
      <button
        type="button" onClick={canControl ? onOpenControl : undefined}
        className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[12.5px] font-bold border ${m.cls} ${canControl ? 'cursor-pointer' : 'cursor-default opacity-90'}`}
        title={canControl ? 'Open mode control' : 'Mode control requires Admin or Compliance'}
      >
        <span className="w-2 h-2 rounded-full bg-current" /> {m.label}
      </button>
      {manualOverride && (
        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-bold bg-white text-ocean border border-dashed border-ocean">
          <Hand className="w-3 h-3" /> Manual
        </span>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify in preview** — temporarily render all three modes in `WorkflowOverview.jsx`; confirm pills + manual badge. Remove temp render.

- [ ] **Step 3: Commit**

```bash
git add src/components/HITLVendorWorkflow/governance/ModeIndicator.jsx
git commit -m "feat(governance): add ModeIndicator component"
```

---

## Task 6: `SignoffControl` component (with role-blocked state)

**Files:**
- Create: `src/components/HITLVendorWorkflow/governance/SignoffControl.jsx`

- [ ] **Step 1: Write the component**

```jsx
// src/components/HITLVendorWorkflow/governance/SignoffControl.jsx
import { Check, Ban } from 'lucide-react'
import { TIER_LABELS, canSignOff, tierForRole } from './capabilities'

/**
 * Sign-off action with pre-state + role check + designed blocked state.
 * @param resourceLabel string  @param preState string (counts/escalations)
 * @param currentRole roleId  @param requiredRoleLabel string (e.g. 'Compliance')
 * @param onApprove fn  @param onRequest fn (when blocked)
 */
export default function SignoffControl({ resourceLabel, preState, currentRole, requiredRoleLabel = 'Compliance', onApprove, onRequest }) {
  const allowed = canSignOff(currentRole)
  const tierLabel = TIER_LABELS[tierForRole(currentRole)]

  return (
    <div className="rounded-xl border border-rule bg-cream p-3.5 min-w-[280px]">
      <p className="text-[12px] text-slate mb-2.5 leading-relaxed">
        Signing off <span className="font-semibold text-ink">{resourceLabel}</span> — {preState}. This publishes to production.
      </p>
      {allowed ? (
        <>
          <button type="button" onClick={onApprove}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-[13.5px] font-bold bg-teal text-white cursor-pointer">
            <Check className="w-4 h-4" /> Approve &amp; publish
          </button>
          <p className="text-[11px] mt-2 text-mist">Role check: <span className="text-teal font-semibold">{tierLabel} ✓</span></p>
        </>
      ) : (
        <>
          <button type="button" disabled
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-[13.5px] font-bold bg-[#f1ede4] text-mist border border-rule cursor-not-allowed">
            <Check className="w-4 h-4" /> Approve &amp; publish
          </button>
          <div className="mt-2.5 flex gap-2 items-start bg-error/10 border border-error/30 rounded-lg px-2.5 py-2 text-[12px] text-error">
            <Ban className="w-4 h-4 shrink-0 mt-0.5" />
            <span><b>Sign-off requires role: {requiredRoleLabel}.</b> You have &ldquo;{tierLabel}&rdquo;.
              <button type="button" onClick={onRequest} className="underline font-semibold ml-1 cursor-pointer">Request sign-off</button>.</span>
          </div>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify in preview** — temporarily render `<SignoffControl resourceLabel="Q3 Earnings · JA" preState="247 segments, 3 escalated & resolved" currentRole="internal-reviewer" onApprove={()=>{}} onRequest={()=>{}} />` then with `currentRole="final-validator"`. Confirm blocked vs allowed states. Remove temp render.

- [ ] **Step 3: Commit**

```bash
git add src/components/HITLVendorWorkflow/governance/SignoffControl.jsx
git commit -m "feat(governance): add SignoffControl with role-blocked state"
```

---

## Task 7: `AuditEntry` component

**Files:**
- Create: `src/components/HITLVendorWorkflow/governance/AuditEntry.jsx`

Renders one `HITL_AUDIT_LOG` record (shape: `{ id, actorId, actorRole, eventType, reason, beforeValue, afterValue, projectId, sessionMeta, timestamp }`).

- [ ] **Step 1: Write the component**

```jsx
// src/components/HITLVendorWorkflow/governance/AuditEntry.jsx
const TONE = {
  'signoff.approved': 'text-teal', 'signoff.blocked': 'text-error', 'signoff.requested': 'text-ocean',
  'mode.change': 'text-amber-deep', 'mode.manual_override': 'text-amber-deep',
  'rbac.view_as': 'text-slate', 'autonomy.threshold_change': 'text-amber-deep',
  'policy.violation': 'text-error',
}

function fmtTime(ts) {
  try { return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) }
  catch { return ts }
}

export default function AuditEntry({ entry }) {
  const tone = TONE[entry.eventType] || 'text-ink'
  const meta = entry.sessionMeta || {}
  const gateLabel = meta.gate ? `${meta.score ?? ''}→${meta.gate}` : ''
  return (
    <div className="grid items-center gap-3 px-3.5 py-2.5 text-[12.5px] border-t border-rule"
      style={{ gridTemplateColumns: '92px 132px 1fr 110px', fontFamily: "'IBM Plex Mono', monospace" }}>
      <span className="text-mist">{fmtTime(entry.timestamp)}</span>
      <span className="text-slate truncate">
        {entry.actorId || '—'}
        {entry.actorRole && <span className="ml-1.5 inline-block rounded bg-pale text-ocean px-1.5 text-[11px]">{entry.actorRole}</span>}
      </span>
      <span className={`font-semibold ${tone}`}>{entry.reason || entry.eventType}</span>
      <span className="text-mist text-right">{gateLabel}</span>
    </div>
  )
}
```

- [ ] **Step 2: Verify in preview** — temporarily map a couple of `HITL_AUDIT_LOG` entries through `<AuditEntry>` in `AuditLogViewer.jsx`. Confirm rows render. Remove temp render (real adoption is Task 12).

- [ ] **Step 3: Commit**

```bash
git add src/components/HITLVendorWorkflow/governance/AuditEntry.jsx
git commit -m "feat(governance): add AuditEntry row component"
```

---

## Task 8: `ViewAsRoleSwitcher` component

**Files:**
- Create: `src/components/HITLVendorWorkflow/governance/ViewAsRoleSwitcher.jsx`

- [ ] **Step 1: Write the component**

```jsx
// src/components/HITLVendorWorkflow/governance/ViewAsRoleSwitcher.jsx
import { useState } from 'react'
import { ChevronDown, UserCog } from 'lucide-react'
import { PERSONAS, TIER_LABELS, tierForRole } from './capabilities'
import { useGovernance } from '../../../context/GovernanceStore'

export default function ViewAsRoleSwitcher() {
  const { currentRole, setCurrentRole } = useGovernance()
  const [open, setOpen] = useState(false)
  const active = PERSONAS.find(p => p.roleId === currentRole) || PERSONAS[0]

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold bg-pale text-ocean border border-rule cursor-pointer">
        <UserCog className="w-3.5 h-3.5" /> Viewing as: {active.label} <ChevronDown className="w-3.5 h-3.5" />
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-60 bg-white border border-rule rounded-lg shadow-lg z-50 p-1">
          {PERSONAS.map(p => (
            <button key={p.id} type="button"
              onClick={() => { setCurrentRole(p.roleId); setOpen(false) }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-[13px] cursor-pointer ${p.roleId === currentRole ? 'bg-pale text-ocean' : 'hover:bg-cream text-ink'}`}>
              <span>{p.label}</span>
              <span className="text-[10px] text-mist">{TIER_LABELS[tierForRole(p.roleId)]}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit** (verified once mounted in Task 9)

```bash
git add src/components/HITLVendorWorkflow/governance/ViewAsRoleSwitcher.jsx
git commit -m "feat(governance): add ViewAsRoleSwitcher"
```

---

## Task 9: Mount provider + chrome + restructure nav (`index.jsx`)

**Files:**
- Modify: `src/components/HITLVendorWorkflow/index.jsx`

- [ ] **Step 1: Wrap the container in `GovernanceProvider` and split it**

Rename the current default export function to `HITLVendorWorkflowInner` (keep its body identical for now), and add a wrapper default export:

```jsx
// add imports at top of index.jsx:
import { GovernanceProvider, useGovernance } from '../../context/GovernanceStore'
import ModeIndicator from './governance/ModeIndicator'
import ViewAsRoleSwitcher from './governance/ViewAsRoleSwitcher'
import AutonomyAndModes from './AutonomyAndModes'
import { canManageAutonomy } from './governance/capabilities'
import { SlidersHorizontal } from 'lucide-react'

// at the bottom, the new default export:
export default function HITLVendorWorkflow({ currentUserId, onClose }) {
  return (
    <GovernanceProvider currentUserId={currentUserId}>
      <HITLVendorWorkflowInner currentUserId={currentUserId} onClose={onClose} />
    </GovernanceProvider>
  )
}
```

(Change the existing `export default function HITLVendorWorkflow(...)` declaration to `function HITLVendorWorkflowInner(...)`.)

- [ ] **Step 2: Add `autonomy` to NAV, SCREENS, and restructure GROUPS**

Replace the `NAV`, `SCREENS`, and `GROUPS` constants with:

```jsx
const NAV = [
  { id: 'overview', label: 'Workflow Overview', icon: LayoutDashboard, group: 'Operate' },
  { id: 'projects', label: 'Project Cockpit', icon: ClipboardList, group: 'Operate' },
  { id: 'recommendation', label: 'Vendor Recommendation', icon: Workflow, group: 'Operate' },
  { id: 'assignments', label: 'Task Assignment', icon: UsersRound, group: 'Operate' },
  { id: 'workspace', label: 'Review Workspace', icon: CheckSquare, group: 'Operate' },
  { id: 'signoff', label: 'Final Sign-Off', icon: BadgeCheck, group: 'Operate' },
  { id: 'autonomy', label: 'Autonomy & Modes', icon: SlidersHorizontal, group: 'Govern' },
  { id: 'audit', label: 'Audit Log', icon: ScrollText, group: 'Govern' },
  { id: 'retraining', label: 'Retraining Queue', icon: GraduationCap, group: 'Govern' },
  { id: 'trainer', label: 'Trainer Profile', icon: Award, group: 'Govern' },
  { id: 'analytics', label: 'Vendor Analytics', icon: Activity, group: 'Govern' },
  { id: 'engagement', label: 'Engagement Hub', icon: Trophy, group: 'Govern' },
  { id: 'vendors', label: 'Vendor Registry', icon: Users, group: 'Vendors' },
  { id: 'pools', label: 'Vendor Pools', icon: FolderTree, group: 'Vendors' },
  { id: 'policies', label: 'Selection Policies', icon: FileSpreadsheet, group: 'Vendors' },
  { id: 'admin', label: 'Global Admin', icon: ShieldCheck, group: 'Admin' },
]

const SCREENS = {
  overview: WorkflowOverview, projects: ProjectCockpit, recommendation: VendorRecommendationPanel,
  assignments: TaskAssignment, workspace: SecureVendorWorkspace, signoff: FinalSignOff,
  autonomy: AutonomyAndModes, audit: AuditLogViewer, retraining: RetrainingQueue,
  trainer: TrainerProfile, analytics: VendorAnalytics, engagement: EngagementHub,
  vendors: VendorRegistry, pools: VendorPoolManager, policies: SelectionPolicyBuilder,
  admin: GlobalAdminSettings,
}

const GROUPS = ['Operate', 'Govern', 'Vendors', 'Admin']
```

- [ ] **Step 3: Add the chrome (mode indicator + role switcher) to the top bar**

Inside `HITLVendorWorkflowInner`, the existing top-bar `<div className="flex items-center gap-2">` (currently holds only the close button). Add a governance chrome strip just before the close button. First read the system mode/override from context — add this hook near the top of the inner component (after `const Screen = ...`):

```jsx
const { systemMode, manualOverride, currentRole } = useGovernance()
const canCtl = canManageAutonomy(currentRole)
```

Then update the right side of the header:

```jsx
<div className="flex items-center gap-3">
  {!inReviewMode && <ModeIndicator mode={systemMode} manualOverride={manualOverride} canControl={canCtl} onOpenControl={() => setActive('autonomy')} />}
  {!inReviewMode && <ViewAsRoleSwitcher />}
  <button onClick={onClose} className="p-2 rounded-md hover:bg-pale text-slate cursor-pointer" aria-label="Close">
    <X className="w-4 h-4" />
  </button>
</div>
```

- [ ] **Step 4: Verify in preview**

Open `http://localhost:5714` → open HITL workflow. Confirm:
1. Top bar shows the mode pill (Supervised) + Manual badge + "Viewing as: …" switcher.
2. Sidebar groups now read **Operate · Govern · Vendors · Admin**, with **Autonomy & Modes** as the first Govern item.
3. Switching personas in the switcher updates the label; clicking the mode pill as an Admin/Compliance persona navigates to the Autonomy screen (after Task 10), and as Production it is read-only.

- [ ] **Step 5: Commit**

```bash
git add src/components/HITLVendorWorkflow/index.jsx
git commit -m "feat(governance): mount provider, add mode/role chrome, restructure nav"
```

---

## Task 10: Autonomy & Modes screen

**Files:**
- Create: `src/components/HITLVendorWorkflow/AutonomyAndModes.jsx`

Uses existing `shared.jsx` primitives (`SectionHeading`, `Card`, `MonoLabel`, `PrimaryButton`, `SecondaryButton`) — same import style as `AuditLogViewer.jsx` / `SecureVendorWorkspace.jsx`.

- [ ] **Step 1: Write the screen**

```jsx
// src/components/HITLVendorWorkflow/AutonomyAndModes.jsx
import { Lock } from 'lucide-react'
import { SectionHeading, Card, MonoLabel, PrimaryButton, SecondaryButton } from './shared'
import { useGovernance } from '../../context/GovernanceStore'
import { canManageAutonomy } from './governance/capabilities'
import { gateFor } from './governance/gates'

const MODES = [
  { id: 'autonomous', name: 'Autonomous', desc: 'Content at/above the auto-publish gate ships with no human review.' },
  { id: 'supervised', name: 'Supervised', desc: 'Every publish routes through review, regardless of score.' },
  { id: 'paused', name: 'Paused', desc: 'Nothing ships. All output held pending an explicit resume.' },
]

export default function AutonomyAndModes() {
  const { currentRole, systemMode, setSystemMode, manualOverride, setManualOverride, thresholds, setThresholds, record } = useGovernance()
  const canEdit = canManageAutonomy(currentRole)
  const t = thresholds.project

  const setT = (key, value) => {
    if (!canEdit) return
    const next = { ...t, [key]: Number(value) }
    setThresholds(prev => ({ ...prev, project: next }))
    record({ eventType: 'autonomy.threshold_change', reason: `${key} → ${value}`, beforeValue: t[key], afterValue: Number(value) })
  }

  return (
    <div>
      <SectionHeading title="Autonomy & Modes"
        subtitle="Govern · first-class config. Scope: Project — Q3 Earnings Pack. Inherits org defaults unless overridden." />

      {!canEdit && (
        <div className="mb-4 flex items-center gap-2 bg-pale border border-rule rounded-lg px-3 py-2 text-[12.5px] text-ocean">
          <Lock className="w-4 h-4" /> View-only. Changing thresholds or system mode requires Admin or Compliance. Every change is written to the Audit Log.
        </div>
      )}

      {/* System mode */}
      <Card className="mb-4" padding="p-4">
        <MonoLabel>System mode</MonoLabel>
        <div className="grid grid-cols-3 gap-3 mt-3">
          {MODES.map(m => (
            <button key={m.id} type="button" disabled={!canEdit}
              onClick={() => setSystemMode(m.id)}
              className={`text-left rounded-xl p-3 border ${systemMode === m.id ? 'border-teal bg-teal/10' : 'border-rule bg-cream'} ${canEdit ? 'cursor-pointer' : 'cursor-not-allowed opacity-90'}`}>
              <span className="flex items-center gap-2 font-bold text-[14px] text-ink">
                <span className={`w-2.5 h-2.5 rounded-full ${systemMode === m.id ? 'bg-teal' : 'bg-mist'}`} /> {m.name}
              </span>
              <span className="block text-[11.5px] text-slate mt-1.5 leading-snug">{m.desc}</span>
            </button>
          ))}
        </div>
        <label className={`mt-3 flex items-center gap-3 rounded-lg border border-dashed border-ocean px-3 py-2.5 ${canEdit ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
          <input type="checkbox" checked={manualOverride} disabled={!canEdit} onChange={e => setManualOverride(e.target.checked)} />
          <span className="text-[12.5px] text-slate"><b className="text-ink">Manual / HITL override</b> — pin this project to human review even in Autonomous mode.</span>
        </label>
      </Card>

      {/* Thresholds */}
      <Card className="mb-4" padding="p-4">
        <MonoLabel>Confidence-score autonomy thresholds</MonoLabel>
        <div className="grid grid-cols-2 gap-4 mt-3">
          <ThresholdInput label="Escalate to senior — below" value={t.escalate} onChange={v => setT('escalate', v)} disabled={!canEdit} />
          <ThresholdInput label="Reviewer required — below" value={t.review} onChange={v => setT('review', v)} disabled={!canEdit} />
        </div>
        <div className="flex gap-2 mt-4 text-[12px]">
          <Band cls="bg-error/10 border-error/30" title={`Below ${t.escalate} → Escalate`} desc="Second-reviewer escalation fires." />
          <Band cls="bg-amber/15 border-amber/30" title={`${t.escalate}–${t.review} → Review`} desc="Assignment forced before publish." />
          <Band cls="bg-teal/10 border-teal/30" title={`${t.review}+ → Auto-publish`} desc="Ships with no human review." />
        </div>
        <p className="text-[11px] text-mist mt-3">Preview: a score of 88 currently sits at <b>{gateFor(88, t)?.label ?? '—'}</b>.</p>
      </Card>

      {canEdit && (
        <div className="flex gap-3">
          <PrimaryButton onClick={() => record({ eventType: 'autonomy.threshold_change', reason: 'Saved autonomy config', afterValue: JSON.stringify(t) })}>Save &amp; record to audit</PrimaryButton>
          <SecondaryButton onClick={() => { setThresholds(prev => ({ ...prev, project: { escalate: 75, review: 92 } })) }}>Reset to org defaults</SecondaryButton>
        </div>
      )}
    </div>
  )
}

function ThresholdInput({ label, value, onChange, disabled }) {
  return (
    <label className="block">
      <span className="block text-[11px] uppercase tracking-wide text-mist font-semibold mb-1.5">{label}</span>
      <input type="range" min="0" max="100" value={value} disabled={disabled} onChange={e => onChange(e.target.value)} className="w-full" />
      <span className="text-[13px] font-bold text-ink" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{value}</span>
    </label>
  )
}

function Band({ cls, title, desc }) {
  return (
    <div className={`flex-1 rounded-lg px-3 py-2 border ${cls}`}>
      <b className="block text-[12.5px] text-ink mb-0.5">{title}</b>
      <span className="text-slate">{desc}</span>
    </div>
  )
}
```

**Note:** if `shared.jsx` does not export `MonoLabel` or `PrimaryButton` with these exact names, check its exports (it is imported as `import { SectionHeading, Card, MonoLabel, ... } from './shared'` in `AuditLogViewer.jsx` and `SecureVendorWorkspace.jsx`, so these names exist). `Card` accepts a `padding` prop (used as `padding="p-3"` in AuditLogViewer).

- [ ] **Step 2: Verify in preview**

Open HITL → Govern → **Autonomy & Modes**. As **Admin** (switch persona): mode selectable, sliders move, override toggles, bands recompute live, save writes audit. As **Production**: the lock banner shows, controls are disabled. Switch to Audit Log and confirm `mode.change` / `autonomy.threshold_change` rows appear.

- [ ] **Step 3: Commit**

```bash
git add src/components/HITLVendorWorkflow/AutonomyAndModes.jsx
git commit -m "feat(governance): add Autonomy & Modes config screen"
```

---

## Task 11: Instrument the Review Workspace

**Files:**
- Modify: `src/components/HITLVendorWorkflow/SecureVendorWorkspace.jsx`

The workspace already reads `project.requirements.reviewMode` (one of `external-vendor` / `internal-single` / `internal-parallel`) and has `labelForMode` / `shortMode` helpers and a mode chip near lines 458–482. It already imports `segmentPedigree`. Add governance instrumentation **without rewriting** the editor.

> **Before editing:** read `SecureVendorWorkspace.jsx` in full once to locate (a) the top task-bar / `SectionHeading` region (~lines 446–482), (b) the segment list rendering, (c) the active-segment footer / `ConfidenceExplainer` region (~lines 810–825). The inner editing surface is in `QuickReviewWorkspace.jsx`; this task only touches the outer `SecureVendorWorkspace` chrome + rails.

- [ ] **Step 1: Add imports + governance hooks**

Add to the import block:

```jsx
import { documentPedigree } from '../../services/hitl/pedigree'  // segmentPedigree already imported
import { useGovernance } from '../../context/GovernanceStore'
import GateBadge from './governance/GateBadge'
import SignoffControl from './governance/SignoffControl'
import { REVIEW_MODES } from '../../data/hitlVendorWorkflow'
```

Inside the component body (after `const activeSeg = segments[activeIdx]`), add:

```jsx
const { currentRole, thresholds, record } = useGovernance()
const gateThresholds = thresholds.project
// Local mode override so the demo can switch modes without mutating data.
const [reviewModeOverride, setReviewModeOverride] = useState(null)
const reviewMode = reviewModeOverride || project.requirements.reviewMode
const docScore = documentPedigree(project.id)?.composite ?? null
const segScore = activeSeg ? (segmentPedigree(activeSeg.id)?.composite ?? null) : null
```

- [ ] **Step 2: Add the mode switcher + document GateBadge to the task bar**

In the top task-bar region (near the existing mode chip ~line 479), add a 3-way mode switcher and the document gate badge:

```jsx
<div className="flex items-center gap-3">
  <div className="flex bg-cream rounded-lg p-0.5 border border-rule">
    {REVIEW_MODES.map(m => (
      <button key={m} type="button" onClick={() => setReviewModeOverride(m)}
        className={`px-2.5 py-1 rounded-md text-[11.5px] font-semibold cursor-pointer ${reviewMode === m ? 'bg-ocean text-white' : 'text-slate'}`}>
        {m === 'internal-single' ? 'Internal Review 1' : m === 'internal-parallel' ? 'Internal Final' : 'External'}
      </button>
    ))}
  </div>
  <GateBadge score={docScore} thresholds={gateThresholds} variant="compact" label="Doc gate" />
</div>
```

- [ ] **Step 3: Add per-segment gate dots to the segment list**

In the segment-list item render, prefix each item with a gate dot computed from that segment's score:

```jsx
{/* inside the segment list .map((s) => ...) */}
<span className={`w-2 h-2 rounded-full shrink-0 ${(gateFor(segmentPedigree(s.id)?.composite ?? null, gateThresholds)?.dot) || 'bg-mist'}`} />
```

Add `import { gateFor } from './governance/gates'` to the import block for this.

- [ ] **Step 4: Add the per-segment GateBadge near the active segment footer**

In the active-segment region (near `ConfidenceExplainer`, ~line 815), add the full GateBadge wired to open the explainer:

```jsx
<GateBadge score={segScore} thresholds={gateThresholds} variant="full" />
```

- [ ] **Step 5: Add the mode-specific right-rail panel + SignoffControl**

In the right rail, add a mode panel + the sign-off control. Place near the existing `ContextualSideRail` / guardrails:

```jsx
<div className="rounded-lg border border-rule bg-pale p-3 mb-3">
  <p className="text-[12px] font-semibold text-ocean mb-1">
    {reviewMode === 'internal-single' ? 'You own this project'
      : reviewMode === 'internal-parallel' ? 'Parallel review'
      : 'External vendor cockpit'}
  </p>
  <p className="text-[11px] text-slate leading-snug">
    {reviewMode === 'internal-single' ? 'Single-reviewer fast lane. You review all segments, then route to Compliance for sign-off.'
      : reviewMode === 'internal-parallel' ? 'Reviewers work segment ranges in parallel (Task Assignment). Final Validator consolidates → Compliance signs.'
      : 'Source locked, export disabled. Submit for internal review — no publish.'}
  </p>
</div>

{reviewMode === 'external-vendor' ? (
  <button type="button" className="w-full rounded-lg px-4 py-2.5 text-[13px] font-bold bg-ocean text-white cursor-pointer"
    onClick={() => record({ eventType: 'signoff.requested', reason: 'Submitted for internal review', projectId: project.id })}>
    Submit for internal review
  </button>
) : (
  <SignoffControl
    resourceLabel={`${project.name} · ${project.requirements?.targetLocale || ''}`}
    preState={`${segments.length} segments`}
    currentRole={currentRole}
    requiredRoleLabel="Compliance"
    onApprove={() => record({ eventType: 'signoff.approved', reason: `Signed off ${project.name}`, projectId: project.id, sessionMeta: { score: docScore, gate: gateFor(docScore, gateThresholds)?.id } })}
    onRequest={() => record({ eventType: 'signoff.requested', reason: `Requested sign-off for ${project.name}`, projectId: project.id })}
  />
)}
```

- [ ] **Step 6: Verify in preview**

Open HITL → Operate → **Review Workspace**. Confirm:
1. Task bar shows the 3-mode switcher + doc gate badge.
2. Segment list items show gate dots; switching segments updates the full GateBadge.
3. Right rail panel text changes per mode; in **External** mode it shows "Submit for internal review" (no sign-off).
4. As **Production**, sign-off is blocked ("requires role: Compliance"); switch persona to **Compliance**, it unlocks.
5. Approving / requesting / blocked attempts appear in the Audit Log.

- [ ] **Step 7: Commit**

```bash
git add src/components/HITLVendorWorkflow/SecureVendorWorkspace.jsx
git commit -m "feat(governance): instrument Review Workspace with gate + mode + sign-off"
```

---

## Task 12: Audit-native adoption (`AuditLogViewer.jsx`)

**Files:**
- Modify: `src/components/HITLVendorWorkflow/AuditLogViewer.jsx`

- [ ] **Step 1: Render rows via `AuditEntry` and add new event tones**

Add the import:

```jsx
import AuditEntry from './governance/AuditEntry'
```

Extend `EVENT_TYPE_TONE` with the slice-1 event types (append entries):

```jsx
'rbac.view_as': 'bg-slate/10 text-slate',
'mode.change': 'bg-amber/15 text-amber-deep',
'mode.manual_override': 'bg-amber/15 text-amber-deep',
'autonomy.threshold_change': 'bg-amber/15 text-amber-deep',
'signoff.approved': 'bg-teal/10 text-teal',
'signoff.blocked': 'bg-error/15 text-error',
'signoff.requested': 'bg-pale text-ocean',
```

In the list render (the `list.map(...)` that renders each audit row — locate it below line 60), replace the per-row JSX with:

```jsx
{list.map(e => <AuditEntry key={e.id} entry={e} />)}
```

Keep the existing filter UI and `SectionHeading` as-is.

- [ ] **Step 2: Verify in preview**

Open HITL → Govern → **Audit Log**. Confirm rows render via the new monospace `AuditEntry` format, newest first, and that actions taken during this session (role switches, mode changes, sign-offs) appear. Filters still work.

- [ ] **Step 3: Commit**

```bash
git add src/components/HITLVendorWorkflow/AuditLogViewer.jsx
git commit -m "feat(governance): render audit log via shared AuditEntry + new tones"
```

---

## Task 13: Full verification

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: all suites pass, including the new `gates.test.js` and `capabilities.test.js`.

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: build succeeds with no errors.

- [ ] **Step 3: Manual persona walkthrough** (`http://localhost:5714`, open HITL workflow)

Confirm end-to-end:
1. **Production** — Review Workspace shows live gate per segment; sign-off blocked with explainable error; Autonomy & Modes is view-only/locked.
2. **Compliance** — sign-off unlocks with pre-state; can edit Autonomy & Modes.
3. **External Linguist** — workspace External mode shows "Submit for internal review", no publish.
4. **Vendor Manager / Client / Finance / Admin** — switcher updates; Admin can set mode + thresholds.
5. **Mode indicator** reflects the current system mode globally and is read-only for non-admin roles.
6. **Audit Log** captured every governed action via `AuditEntry`.

- [ ] **Step 4: Lint**

Run: `npm run lint`
Expected: no new errors in the files created/modified (fix any unused imports — e.g. ensure `SignoffControl.jsx` imports only `tierForRole`, `TIER_LABELS`, `canSignOff`).

- [ ] **Step 5: Final commit (if lint fixes needed)**

```bash
git add -A
git commit -m "chore(governance): lint + final slice-1 verification"
```

---

## Self-Review Notes (addressed)

- **Spec coverage:** G1 (Tasks 4–8), G2 (Task 10), G3 (Task 11), G4 (Tasks 2, 8, 9, 11), G5 (Tasks 7, 12), G6 (Task 9). All mapped.
- **Capability/role bridge:** the brief's "Compliance has sign-off authority" maps to the data model's `final-validator` permission `signoff_output`; the Compliance persona → `final-validator` (documented in `PERSONAS`). Tiers are permission-driven, not name-driven.
- **Audit shape:** uses the real `createAuditEvent` fields; score/gate context rides in `sessionMeta` (no schema change).
- **No DOM unit tests:** intentional and documented (repo has no jsdom/testing-library); components verified via preview.
- **Identifier consistency:** `gateFor`, `GATES`, `DEFAULT_THRESHOLDS`, `TIERS`, `tierForRole`, `canSignOff`, `canManageAutonomy`, `PERSONAS`, `TIER_LABELS`, `useGovernance`, `GovernanceProvider` are used consistently across all tasks.
