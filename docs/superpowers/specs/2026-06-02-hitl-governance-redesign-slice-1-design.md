# arbitr — Governed HITL Redesign · Slice 1 Design

**Date:** 2026-06-02
**Status:** Approved (visual brainstorm complete) — pending written-spec review
**Slice:** 1 of 6 — *Governance foundation + Review Workspace across all 3 modes*
**Output:** Working React screens, evolving the in-repo `HITLVendorWorkflow` module (prototype stays clickable)

---

## 1. Context & Goal

`arbitr` is an enterprise AI-translation/localization platform whose promise is a **governed human-in-the-loop (HITL) control plane**: every AI recommendation, edit, and sign-off is auditable, explainable, and RBAC-scoped. The redesign reframes the product as a **trust/intelligence layer where humans approve, correct, and train AI** — not a CAT tool with AI bolted on.

A substantial HITL module already exists (`src/components/HITLVendorWorkflow/`, 15 screens + `cockpit/`, plus `src/services/hitl/*`, `src/data/rbacModel.js`, `src/data/hitlVendorWorkflow.js`). This is an **evolution**, not a greenfield build: we elevate governance to first-class, redesign the surfaces, and reuse the existing pedigree/RBAC/audit engines.

The full redesign is decomposed into **6 sequential slices** (each its own design→build cycle):

1. **Governance foundation + Review Workspace (all 3 modes)** ← *this spec*
2. (folded into slice 1) review-mode switch
3. Continuous HITL→retraining loop wired into review
4. Vendor trust system (Registry/Pools/Trust Score → auto-assignment)
5. The money loop (POs / invoicing / budgets — Finance persona home)
6. Command Centre exceptions + on-demand intake

### Slice 1 goal
Make the **governance model glanceable and enforced** across the review experience: live confidence score + autonomy gate everywhere content appears, an unmistakable system-mode indicator, a configurable autonomy-threshold surface, RBAC-tiered sign-off with a designed *blocked* state, audit-native by default, and a single Review Workspace shell that adapts across the three review modes — all demoable via a persistent **view-as-role** switcher.

---

## 2. Scope

### In scope (Slice 1)
- **G1. Governance primitives (4 reusable components):** confidence/gate badge, system-mode indicator, RBAC sign-off control (incl. role-blocked state), audit entry.
- **G2. Autonomy & Modes config screen:** three thresholds (auto-publish ≥, reviewer-required <, escalate-to-senior <) on one track, project scope inheriting org defaults, per-domain overrides, system-mode control (Autonomous / Supervised / Paused + Manual override), role-gated with view-only/locked state, writes to audit.
- **G3. Review Workspace — one shell, three modes:** Internal Review 1 (single owner), Internal Final (parallel reviewers via Task Assignment), External (vendor cockpit, source-locked, submit-only). Live per-segment gate dot + per-segment gate badge + document-level gate badge; mode switcher in chrome; mode-specific right rail.
- **G4. RBAC capability tiers + view-as-role switcher:** persistent global control to act as any role; the whole surface re-scopes (sign-off enable/block, mode-control lock, audit attribution). Tiers: *Approve & publish* / *Review & comment* / *View only* / *Submit only*.
- **G5. Audit-native treatment:** the audit entry pattern renders both in the Audit Log and inline where actions happen; every sign-off, blocked attempt, role change, threshold change, mode switch, and assignment is recorded.
- **G6. IA / nav restructure (foundational subset):** introduce the six-group nav (Operate · Govern · Vendors · Agents · Finance · Settings) at least for the **Govern** group + Review Workspace + Task Assignment, and the persistent global bar (mode indicator + role switcher + Sage). Other groups can keep existing screens until their slice.

### Out of scope (later slices — do NOT build now)
- Retraining-queue UI wiring of corrections (slice 3) — but the review screen DOES emit rationale chips as the training signal hook.
- Vendor trust score driving auto-assignment (slice 4).
- Money loop: POs, invoicing, budgets, Finance home (slice 5).
- Command Centre / exception flows / on-demand intake (slice 6).
- Real auth, routing, persistence, multi-tenant backend (prototype remains in-memory).

### Non-goals
- No backend/API. State stays client-side, seeded from existing `src/data/*`.
- No replacement of the App.jsx phase system; slice 1 lives inside the HITL module + a thin governance context.

---

## 3. The Governance Model (authoritative definitions)

### 3.1 Confidence score
Reuse the existing **4-axis pedigree composite** (`src/services/hitl/pedigree.js`): model confidence (25%), verification depth (40%), domain pedigree (20%), provenance (15%) → 0–100. This composite **is** "the score" shown in every gate badge. The "why" explainer (`cockpit/ConfidenceExplainer.jsx`) is the existing 4-axis breakdown.

### 3.2 Autonomy gates (thresholds)
Per project, with per-domain overrides. Default project thresholds:
- **Auto-publish ≥ 92** — ships with no human review (only effective in Autonomous mode).
- **Reviewer required, 75–92** — assignment forced before publish.
- **Escalate to senior, < 75** — second-reviewer escalation fires automatically.

Gate vocabulary + colors (token-aligned): `auto-publish` = sage/green, `review` = amber, `escalate` = error/red.

### 3.3 System modes
Global, per-project, unmistakable via the indicator:
- **Autonomous** — content at/above auto-publish gate ships unattended.
- **Supervised** — every publish routes to review regardless of score.
- **Paused** — nothing ships; output held pending explicit resume.
- **Manual / HITL override** (persistent, orthogonal) — pins a project (or piece) to human review even in Autonomous mode.

### 3.4 RBAC capability tiers
Map the 17 existing roles (`src/data/rbacModel.js`) onto four sign-off capability tiers:
- **Approve & publish** — Compliance, tenant-admin (and Final Validator within project scope).
- **Review & comment** — Production, Vendor Manager, internal reviewers.
- **View only** — viewers; Client Editor is *view + approve-own-content* (scoped to their org).
- **Submit only** — external vendors/linguists (vendor cockpit; cannot publish, cannot see audit).

**Blocked state is a designed first-class state:** a role-mismatched sign-off attempt is *blocked* with an explainable error ("Sign-off requires role: Compliance"), the action routes to the right role, and the blocked attempt is itself audited.

### 3.5 Audit
Every governed action is recorded via `src/services/hitl/auditLog.js` into `AUDIT_LOG` with `{ timestamp, actor, role, action, resource, scoreAtAction, gateAtAction }`. Audit feels native: the same row component appears in the Audit Log viewer and inline at the point of action.

---

## 4. Component Patterns (G1) — `src/components/HITLVendorWorkflow/governance/`

New shared, presentational components (one responsibility each; driven entirely by props):

1. **`GateBadge.jsx`** — props: `score`, `thresholds {escalate, review}`, `variant: 'full' | 'compact'`. Renders score, gate label, and (full) a mini threshold track. Maps score→gate→color via a shared `gateFor(score, thresholds)` helper in `governance/gates.js`. Click → opens existing `ConfidenceExplainer`.
2. **`ModeIndicator.jsx`** — props: `mode`, `manualOverride`, `onOpenControl`, `canControl`. Pill reflecting Autonomous/Supervised/Paused + override badge. Click opens the mode-control panel (if `canControl`, else read-only).
3. **`SignoffControl.jsx`** — props: `resourceLabel`, `preState` (counts/escalations), `requiredTier`, `currentTier`, `onApprove`, `onRequest`. Renders the happy path OR the blocked state (explainable error + route action). Always writes an audit entry on approve, request, or blocked attempt.
4. **`AuditEntry.jsx`** — props: `entry`. Monospace row: time · actor+role · action · score→gate. Used by `AuditLogViewer` and inline surfaces.

Shared helper: **`governance/gates.js`** (`gateFor`, gate→color/label, threshold defaults) and **`governance/capabilities.js`** (`tierForRole`, `canSignOff(role, scope)`), layering over existing `services/hitl/rbac.js`.

---

## 5. Governance State (G4) — `src/context/GovernanceStore.jsx`

A new lightweight React context provider wrapping the HITL module (and the header bits that need it). This is the *minimal* state addition; it does not touch App.jsx's phase system.

```
GovernanceContext = {
  currentRole, setCurrentRole,        // view-as-role switcher
  systemMode, setSystemMode,          // 'autonomous' | 'supervised' | 'paused'
  manualOverride, setManualOverride,  // boolean
  thresholds,                         // { project: {...}, domains: { financial: {...}, legal: {...}, ... } }
  setThresholds,
  audit: { entries, record(entry) },  // wraps services/hitl/auditLog.js
}
```

- Seeded from `src/data/rbacModel.js` (roles/users) and `src/data/hitlVendorWorkflow.js`.
- `setSystemMode` / `setThresholds` / sign-off / role changes all call `audit.record(...)`.
- Capability checks resolve through `governance/capabilities.js` → `services/hitl/rbac.js`.

The **view-as-role switcher** and **mode indicator** mount in the HITL module's top chrome (`HITLVendorWorkflow/index.jsx`) — and, where feasible, the global `Header.jsx` when inside the workflow.

---

## 6. Screens

### 6.1 Autonomy & Modes (G2) — `HITLVendorWorkflow/AutonomyAndModes.jsx`
New screen under the **Govern** nav group (supersedes the threshold bits currently in `GlobalAdminSettings.jsx` / `cockpit/ConfidenceThresholdEditor.jsx`, which it reuses internally).
Sections: System mode selector + Manual override → Threshold track (3 gates, draggable) → Per-domain overrides table → role-gated save (Admin/Compliance) with view-only/locked state for others → audit line of last change. Saving records to audit.

### 6.2 Review Workspace (G3) — refactor of `SecureVendorWorkspace.jsx` / `QuickReviewWorkspace.jsx`
**One shell, three modes.** Mode drives chrome + right rail + sign-off path; the bilingual segment editor is shared.

- **Chrome:** project + locale · **mode switcher** (Internal Review 1 / Internal Final / External) · **document-level `GateBadge`** · role pill · sign-off action (label depends on tier: "Approve & publish" vs "Request sign-off").
- **Left rail:** segment list with per-segment **gate dots** + jump-to-flagged (reuse `cockpit/JumpToFlagControl.jsx`).
- **Center:** source (glossary highlights) ↔ candidate(s) with confidence + diff; footer = per-segment `GateBadge` + "why this segment" (reuse `cockpit/WhyThisSegmentChips.jsx`) + Accept/Refine/Reject (existing keyboard model) + flag chips + **rationale chips on accept** (the retraining signal hook — emit only, wiring is slice 3).
- **Right rail (mode-specific):**
  - *Internal Review 1:* "You own this project" + sign-off path (you → Compliance).
  - *Internal Final:* co-reviewers (parallel), your assigned range (from `TaskAssignment.jsx`), Final Validator consolidates → Compliance.
  - *External:* vendor identity + trust score, source locked, glossary export disabled, **"Submit for internal review"** (no publish), no audit access.
- Reuse `ReviewerModeToggle.jsx`, `LocalizationGuardrails.jsx`, `EdgeCasesPanel.jsx`, `RiskMitigationSummary.jsx`, `pedigree.js`, `signOff.js`.

### 6.3 Task Assignment — light touch
Ensure `TaskAssignment.jsx` feeds the Internal Final right rail (assigned ranges, co-reviewers). No redesign beyond what the workspace needs.

### 6.4 Audit Log (G5) — `AuditLogViewer.jsx`
Adopt the `AuditEntry` row; surface prominently in the **Govern** group; ensure all slice-1 actions write entries.

---

## 7. Persona Behavior (G4)

| Persona | Tier | Home (slice 1) | Workspace behavior | Locked |
|---|---|---|---|---|
| Production | Review & comment | Review queue | Edit, accept/refine, add rationale; **request** sign-off | Publish |
| Compliance (VP) | Approve & publish | Sign-off queue + Audit Log | Pre-state, resolve escalations, **approve & publish** | — |
| Vendor Manager | Review & comment | Task board + Vendor Pools | Split ranges, monitor | (auto-assign = slice 4) |
| External Linguist | Submit only | Their tasks (watermarked) | External mode; source/export locked; **submit only** | Publish, audit, other projects |
| Client Editor | View + approve-own | Their org content | Read-only + approve-own | Agent config, vendor data, thresholds |
| Finance | View + approve $ | (slice 5) | Cost/budget view only | Linguistic content |

**Sage** is present for every persona, context-aware to role (escalations / sign-offs / capacity / budget). Slice 1: ensure the existing `IntelligenceAssistant` is role-aware in copy; no new Sage capabilities.

---

## 8. Visual / Design System
Reuse existing tokens (`src/index.css`): Ocean primary, Inter / Plus Jakarta Sans / IBM Plex Mono, sage/amber/error semantics, `src/utils/scoreColors.js` for score coloring. Tone: enterprise, calm, dense-but-legible, RTL-aware. No new color system.

---

## 9. Build Plan (high level — full plan in writing-plans step)
1. `governance/gates.js` + `capabilities.js` helpers (pure, unit-tested).
2. The 4 `governance/*` components (presentational, prop-driven).
3. `GovernanceStore.jsx` context + seed wiring; mount mode indicator + role switcher in HITL chrome.
4. `AutonomyAndModes.jsx` screen + Govern nav entry.
5. Review Workspace refactor to one-shell/three-mode + gate instrumentation + sign-off control.
6. Audit wiring across all slice-1 actions; `AuditEntry` adoption.
7. Nav restructure (six groups; Govern group live).

## 10. Testing
- **Unit:** `gateFor` thresholds (boundary cases at 75/92 + per-domain), `tierForRole`, `canSignOff`. Extend `src/services/hitl/__tests__/`.
- **Component:** GateBadge variants; SignoffControl allowed vs blocked; ModeIndicator states.
- **Behavioral (manual via preview):** flip view-as-role → sign-off enables/blocks; change mode → indicator + publish behavior change; every action appears in Audit Log.
- Run `npm test` + `npm run build` before completion.

## 11. Risks
- **Review Workspace refactor scope** is the largest item; the existing `SecureVendorWorkspace` is feature-rich. Mitigation: wrap, don't rewrite — introduce mode + gate instrumentation around the existing editor.
- **Global vs module-scoped governance state:** App.jsx is a god component. Mitigation: scope `GovernanceStore` to the HITL module; expose mode indicator/role switcher in the module chrome rather than refactoring Header globally.
- **One-shell/three-mode** could leak mode logic into the editor. Mitigation: keep mode differences in chrome + right rail + sign-off path; editor stays mode-agnostic.

## 12. Definition of Done
- View-as-role switcher + mode indicator persistent in HITL chrome; both audited.
- Autonomy & Modes screen sets project + per-domain thresholds and system mode, role-gated, audited.
- Review Workspace shows live per-segment + document gate state, adapts across all 3 modes, and enforces RBAC sign-off with a designed blocked state.
- Audit Log captures every slice-1 governed action via the shared `AuditEntry`.
- `npm test` + `npm run build` green; prototype clickable end-to-end as each persona.
