# arbitr RBAC — the model as built

*RBAC alignment, branch `feat/rbac-alignment`, 2026-09-17. This document
describes what the demo actually enforces — every statement here is
backed by a test in `src/services/rbac/__tests__/` or
`src/services/hitl/__tests__/`.*

## The one engine

Every access answer comes from **`can({ principal, permission, nodeId,
tenantId, at, context })`** in `src/services/rbac/engine.js`, returning
`{ allow, reason, grantId, decisivePolicy, role }`. Services enforce
through `authorize()` (same decision + exactly one audit event + a
`lastUsedAt` bump on the decisive grant). UI reads through the engine's
selectors (`effectiveMembers`, `grantsForUser`, `grantsAtNode`,
`staleGrants`). Nothing else may read the grant table to decide anything
— `engine.boundary.test.js` scans the source tree and fails the build of
any file that tries.

`nodeId` is **required**. A scope-blind check throws a developer error,
not a deny — it cannot survive review.

## Access is a grant

```
{ id, principal: { type, id },        // user | agent | vendor-org | support-session
  tenantId, roleId,
  scope: { nodeId, type },
  conditions: { expiresAt, justification, ticketRef, assignedOnly,
                residency: [...], requiresApproval, approval, sodException },
  assignedBy, assignedAt, lastUsedAt }
```

Conditions are evaluated on **every** decision *and* in every member
list, count, and tree badge — the admin screens can never tell a
different story than the enforcement path.

## Resolution order (deterministic)

1. **Explicit deny** (`effect: 'deny'`) beats everything.
2. **Nearest-scope allow** — smallest distance from the grant's scope to
   the target node.
3. **Inherited allow** — ties broken by `assignedAt`, then grant id.
   Never array order.

Denials explain the most informative near-miss, in this order: expiry →
barrier → pending approval → residency → assigned-only → out-of-scope →
no-permission. The `reason` string always names the decisive grant.

## Worked examples (one per tested behaviour)

1. **Scope-blind checks are bugs** — `can({principal:'alex',
   permission:'view_resource'})` throws `nodeId is required`.
2. **Boundary** — grep-level test: only `services/rbac/engine.js` and
   `grants.js` touch `GRANTS`; `checkAccess`/`ROLE_ASSIGNMENTS`/
   `hasPermission(` appear nowhere.
3. **Scope binds services too** — Marcus (org-manager @ Meridian
   Germany) calling `decideSegment` on a Japan project is denied
   `out-of-scope` through `requirePermission`, which resolves the
   project's `clientNodeId` and refuses to run without one.
4. **Viewer means viewer** — Thomas (viewer @ Tax & Audit) is denied
   `view_resource` at Meridian Japan: no covering grant.
5. **Expiry bites** — `ra-10` (support, expired 2026-04-25) denies with
   `Grant ra-10 … expired 2026-04-25` and is absent from every member
   list. *Spec note:* the spec probed expiry at `mc-japan-ma`; once that
   node is barriered the barrier is the decisive denial there (a fresh
   grant would not cross either), so the expiry-reason assertion lives
   on a non-barriered node.
6. **Barriers** — `mc-japan-ma` carries `barrier: true`. Ruled: NOBODY
   inherits through it — not the tenant admin, not the group auditor,
   not the parent BU's approver. Access below the wall is a direct grant
   at/under the node; creating one writes exactly one audit event
   labelled "barrier crossing". James's crossing (`ra-14`) is justified,
   ticketed, and expires 2026-10-15.
7. **SoD at assign time** — approver over an existing contributor at
   overlapping scope returns a conflict; the named-exception path
   (approver + reason) records the override on the grant.
   Conflicting pairs: create+approve, edit+approve, contribute+audit.
8. **Granter constraints** — Kenji (org-manager, Japan) cannot grant
   tenant-admin (permissions he doesn't hold) nor anything in Germany
   (outside his subtree). Found consequence: org-managers cannot grant
   `approver` at all — they hold no `approve_resource` themselves.
9. **Level ⊆ scope** — a tenant-level role binds only at the tenant
   root; granting it at a department is refused with the reason shown.
10. **Last-admin guard** — the only tenant-admin grant cannot be
    removed, singly or via remove-member.
11. **Attribution** — `actorRole` on every audit event is the DECISIVE
    grant's role: Yuki logs `compliance-reviewer` at Japan Compliance
    (not her older approver grant); James logs `auditor` inside the M&A
    wall via `ra-14`.
12. **Nobody signs off their own work** — `signOff()` takes authority
    from the engine (`client_signoff` or `signoff_output` at the
    project's node), rejects any signer who last-edited a segment in the
    project (`SOD_REJECTED`, audited, rendered inline in Final
    Sign-Off), and the `skipAuth` bypass no longer exists (source-level
    test). Delegation is an explicit expiring grant — never inferred
    from decision history.
13. **One audit log** — `HITL_AUDIT_LOG === AUDIT_LOG` (same array).
    Every denial appends exactly one event, key-for-key the same schema
    as an allow, and denials render in the customer-facing Audit tab.
14. **People, not grants** — effective members at NZ Legal: 3 people
    today (Alex, Lena with both her grants listed, James), 4 before the
    support grant expired. *Spec note:* the spec said 4 — the fourth was
    the expired support operator, which behaviour 5 removes.
15. **Agents are principals** — the Meridian JA Reviewer agent holds a
    narrow internal-reviewer grant at Financial Reporting; an agent with
    no grant is denied `no-grant`. Vendor people hold assigned-only
    engagement grants; the vendor org holds its own.
16. **Tier is real** — creating a barrier on the Standard plan is
    refused with `reason: 'plan'`; an agent principal below Enterprise
    is denied `decisivePolicy: 'plan'`; the SoD *warning* fires on every
    plan while the exception path is Enterprise-only.

## Deliberate design calls

- **Barriers bind access, not administration.** The granter subtree
  check ignores barriers: the audited act of granting into a walled node
  IS the crossing mechanism. If administration were walled too, no
  crossing could ever exist.
- **`can()` is pure; `authorize()` logs.** UI rendering probes access
  thousands of times; only enforcement writes audit events, exactly one
  per decision.
- **Residency (ruled: hard deny + exception).** Country Business nodes
  carry `residency` + `classification`. A grant reaches a jurisdiction
  only if its scope lives there or `conditions.residency` names it —
  even the tenant admin's cross-border reach is an explicit, visible
  condition on `ra-1`. Enterprise-only.
- **JIT support (ruled).** A `requiresApproval` grant is inert
  (`pending-approval`) until a customer holding `manage_members` at its
  scope approves it; then it works until its own expiry kills it.

## What a person can do in the demo

- **View as** (account menu): Alex, Kenji, Thomas, Yuki, arbitr Support
  (chips red — every grant expired). All admin surfaces act as the
  chosen identity; refusals are the feature.
- **Access Explorer** (Settings → Organization & Access, every tier):
  forward principal×node map with the decisive policy per node; reverse
  "who can reach this node and why".
- **Structure**: barrier chips, residency/classification, people-counted
  badges, and move-with-preview ("+N gains, −M losses, barrier note",
  confirm required, one audit event).
- **Members**: JIT approval card, stale-grant review (90+ days), grant
  cards with expiry/last-used/SoD-exception, inline refusals on invite
  and add-role, the SoD named-exception form.
- **Integrations → Security & Permissions**: the agent grant table
  (grant/revoke, live allow/deny probe, plan-gate notice) and the agent
  slice of the single audit log.

## Addendum — 2026-09-21 alignment

**Admin ≠ business sign-off.** The wildcard covers administration only.
`BUSINESS_DECISION_PERMISSIONS` (approve/reject resource, client
sign-off, final validation, compliance review, legal review, retraining
and Cortex approvals) never ride `*` — the engine refuses with
`admin-business-split`. Alex administers; Sarah, Yuki, and Kenji decide.

**The review ladder** (one vocabulary, ordered):
1. `verify_segment` / `edit_segment` — first-line reviewer work
2. `compliance_review` / `legal_review` — second-line, independent
   (holders must not hold edit rights on the same scope; SoD pair)
3. `approve_resource` / `reject_resource` / `request_changes` — business
   approval
4. `final_validate` → `signoff_output` / `client_signoff` — sign-off;
   the signer is never the last editor (runtime rule)

**Granting** adds: four-eyes (no self-grants), second-line seats
appointed by the tenant admin or the same function, platform roles
(support-operator, arbitr-global-admin) grantable only JIT
(approval + expiry). Pickers offer exactly what the actor may grant.

**Surfaces are permissions.** `access_*` per module, `view_billing` /
`manage_billing`, `manage_integrations`. Navigation and module entry use
held-anywhere semantics (`holdsPermissionAnywhere` — same condition
evaluation as decisions); content inside stays node-scoped via `can()`.
A Viewer's app is Dashboard + Governance. API keys are service-account
principals with expiring, residency-scoped grants.

**Groups.** Cross-cutting functions hold per-scope grants through a
group principal (IdP/SCIM-mappable); members inherit via `can()` and the
decision reason names the group. No tenant-root grants for reach.

**Audit.** Approvals, creations, invites, access approvals, and exports
have first-class event types; every export writes an event; visibility
is the viewer's `view_audit` subtree plus events about themselves,
always with a "Showing N of M" disclosure.

**SoD findings.** `standingSodFindings()` sweeps overlapping holdings
against the conflict pairs continuously; the Roles tab renders each
finding with its covering named exception or a red violation. Conflicts
are governed, never silently tolerated.
