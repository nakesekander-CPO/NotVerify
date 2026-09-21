# RBAC alignment — rule-by-rule status

*Branch `feat/rbac-alignment` · 2026-09-17 · statuses: implemented ·
deferred · needs-Nake.*

| # | Rule (Part 1) | Status | Notes |
|---|---|---|---|
| 1 | One engine, one answer | **implemented** | `can()` in `services/rbac/engine.js`; nodeId required (throws); boundary test blocks any second reader of the grant table. HITL services go through a thin adapter that resolves the project's client node. |
| 2 | Access is a grant, not a role | **implemented** | GRANTS shape as specced (+ `tenantId`); conditions evaluated in decisions AND member lists/counts/tree. Dead `MEMBERSHIPS` deleted. |
| 3 | Deterministic, explainable resolution | **implemented** | deny > nearest > inherited; ties by assignedAt then id; reason names the decisive grant. |
| 4 | Inheritance stops at a barrier | **implemented** | `mc-japan-ma` walled; ruled: nobody pierces without an explicit, expiring, audited crossing. Deliberate call: the granter subtree check is barrier-AGNOSTIC — administration of crossings is the escape hatch and is audited (documented in rbac-model.md). |
| 5 | Principals beyond users | **implemented** | agent / vendor-org / support-session principals with seeds; SecurityPermissions folded into the grant table (old connector matrix, approval toggle, scoping fields deleted — they backed nothing). JIT support approval per ruling. |
| 6 | One catalogue, all real | **implemented (15+2, not ~8+3)** | `hidden` gone; `:org/:scope/:own` suffixes gone; viewer←read-only-observer, org-manager←org-admin, `*_assigned_*`→plain permissions with `assignedOnly` as a grant condition (this also fixed the vendor-plane vocabulary mismatch). **needs-Nake**: shrinking 15 customer roles toward ~8 means merging HITL reviewer roles (compliance/legal/internal reviewer, project-manager, vendor-manager, client-reviewer, final-validator) — a product call on the vendor workflow, not a refactor. |
| 7 | Granting constrained by granter | **implemented** | roles ⊆ granter permissions at the node; scopes ⊆ subtree (manage_members required); level↔scope match; last-admin guard. Found consequence: org-managers cannot grant approver (they hold no approve_resource) — kept, it is the rule working. |
| 8 | SoD at assign time | **implemented** | pairs: create+approve, edit+approve, contribute+audit; inline warning; named exception (approver + reason) recorded on the grant; exception path Enterprise-only per tier ruling; James's double-hat kept as the live trigger. |
| 9 | Nobody signs off their own work | **implemented** | signer ≠ last editor enforced in `signOff()`; skipAuth deleted (source-level test); authority via engine permissions, not role names; delegation = explicit expiring grant. Sarah (final-validator @ Securities) is the seeded lawful signer. |
| 10 | One audit log | **implemented** | `HITL_AUDIT_LOG === AUDIT_LOG` (one array, superset schema with aliases); denials in the customer Audit tab; exactly one event per decision; actorRole = decisive grant everywhere (one pre-gate event attributes via a pure probe). |
| 11 | Tier is a real axis | **implemented** | tier preview writes the tenant plan; Enterprise-only (ruled): barriers, custom roles, access reviews, residency, agent principals, SoD exceptions; Access Explorer + SoD warnings all tiers. Org & Access no longer hidden below Enterprise — locked upsell instead. Custom-roles gating is latent (no create-role UI exists to gate). |
| 12 | Jurisdiction on the node | **implemented** | ruled: hard deny (`residency`) + explicit exception via `conditions.residency`. Even Alex's root grant names JP/EU/NZ; James's audit grant excludes EU on purpose. |

## Part 3 surfaces

| Surface | Status |
|---|---|
| View-as switcher (5 personas, expired chip red) | implemented |
| Access Explorer (forward + reverse, every tier) | implemented |
| Inheritance preview on structure moves (+confirm, audited) | implemented |
| Expiry that bites + lastUsedAt + stale review | implemented — review card counts 4, not the spec's 3: Sofia's never-used vendor grant joined the original three after the vendor plane was seeded |
| SoD warning inline + named exception | implemented |
| Barrier treatment on the tree | implemented |
| Story seeds (double-hat, barrier, vendor org, agent, never-used grant) | implemented |

## Spec corrections taken (Part 2 / Part 4)

- **Test 5 vs 6**: expiry probed at `mc-japan-ma` becomes a *barrier*
  denial once the wall exists (a fresh grant would not cross either);
  expiry assertions moved to a non-barriered node, absence from the
  walled member list still asserted.
- **Test 14**: "4 people at mc-nz-legal" counted the expired support
  operator; the honest number at the frozen clock is 3 (asserted), and 4
  before expiry (also asserted).
- **Test 11 vs 6**: James reaches M&A only through his explicit crossing
  grant (option (c) of the contradiction I flagged) — resolved by the
  barrier ruling plus the seeded crossing.

## Standing caveats

- `npm run lint` was already red with 228 pre-existing errors before
  this branch. Working rule applied: every file this branch touches
  lints clean (two known false positives remain: `motion`/`Icon`
  unused-var misfires on indirect JSX usage, present before this work),
  and the repo-wide count only went down. Build and tests are green at
  every commit.
- Demo-only: state is in-memory; a reload restores seeds. No backend,
  no IdP, no persistence — groups/IdP mapping from rule 9's lifecycle
  list remain **deferred** (no surface claims them).

## 2026-09-21 review — the nine points

| # | Point | Status | Notes |
|---|---|---|---|
| 1 | SoD per user, admin ≠ business | **implemented** | Wildcard refuses the full second-line set (approve/reject, sign-offs, final validation, compliance/legal review, retraining/Cortex approvals) with `admin-business-split` named; new pairs edit+compliance_review and edit+legal_review; `standingSodFindings()` + the Roles-tab panel; James and Lena carry recorded named exceptions; runtime signer≠last-editor was already live (rule 9). |
| 2 | Grant limits | **implemented** | Four-eyes (no self-grants); second-line seats appointed only by tenant admin or the same function; pickers feed from `grantOptions(actor)` so Tenant Admin is offered at the root or not at all; the Kenji-appoints-compliance seed corrected to Alex. Roles ⊆ granter permissions and subtree bounds were already live. |
| 3 | Barriers | **already done** (2026-09-17) | mc-japan-ma walled; nobody inherits through; crossings explicit/expiring/audited. |
| 4 | Expiry, impersonation, JIT | **implemented** | Expiry was already enforced everywhere; NEW: support-operator and arbitr-global-admin are grantable ONLY approval-gated + time-boxed (never standing); the support role is read-only by construction (test-pinned). Impersonation TARGETING rules (read-only default, never admins) have no surface to bind to — deferred with the no-unbacked-claims rule. |
| 5 | Surface permissions + non-human principals | **implemented (full taxonomy, as ruled)** | `access_cortex/agent_studio/analytics/governance/ai_visibility` per role; GlobalNav + AccessGate render only held surfaces (held-anywhere semantics; in-module content stays scope-checked); `view_billing`/`manage_billing` bridge the billing island; integrations connect/disconnect are `authorize()` calls; a service-account API key holds an expiring, residency-scoped grant. Deeper in-page action gating (e.g. governance triage approve via engine) is the named follow-on. |
| 6 | Vocabulary | **implemented** | request_rework → request_changes (test-guarded); suffixes and org-admin were already gone. Review ladder documented in rbac-model.md. |
| 7 | Audit types + visibility | **implemented** | resource.approved / resource.created / member.invited / data.exported event types; exports log before the file leaves; `visibleAuditEvents()` scopes both audit surfaces to the viewer's view_audit subtree + events about themselves, with an explicit "Showing N of M" line. |
| 8 | Groups | **implemented** | Group Risk & Compliance: group principal, per-country compliance grants (no root grant, no residency exceptions needed), members inherit via `can()` with "via group" named in the reason; IdP/SCIM mapping recorded. Standing-SoD sweep does not yet expand group-derived holdings (noted limitation). |
| 9 | Team-tier roles | **implemented** | Pro/Team Members tab = flat Admin/Member/Viewer at the tenant root through the same engine (four-eyes applies); hierarchy/barriers stay Enterprise. |

Additional judgment calls: surface visibility is held-ANYWHERE (a Japan org manager sees the Cortex module; what's inside is scope-checked per node); barrier-agnostic audit visibility (the record of who touched what is oversight, not resource access); `assignedAt` is informational — time-travel evaluation covers expiry only.
