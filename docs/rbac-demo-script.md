# RBAC demo — 10 clicks for a security reviewer

*Prereqs: Enterprise tier (Settings → Preview tier), viewing as Alex
Chen. Everything below is live engine behavior — no staged screenshots.*

1. **Account menu → View as → Thomas Park (Viewer).** The navigation
   collapses to Dashboard and Governance. The nav a person sees IS their
   role — module access is part of a grant, never a default.

2. **Still as Thomas: Settings → Billing.** Locked, with the reason.
   Billing is a governed surface like any module.

3. **View as → Alex. Settings → Organization & Access → Structure.**
   Four-level tree; M&A Advisory wears its Barrier chip and holds 2
   members while its parent BU holds more — nobody inherits through a
   wall, not even the tenant admin. Click M&A Advisory to read the
   barrier reason and the shortened member list.

4. **Structure → click Financial Reporting.** Direct (0) / Inherited —
   every access is named with the grant it flows from. Point at the
   API key and the Group Risk & Compliance rows: agents, keys, and
   groups are principals with the same scoped, expiring grants.

5. **Members.** The JIT card: arbitr support access sits INERT until a
   customer admin approves it — click Approve and it activates,
   time-boxed, audit-logged. Below it, the access review: grants unused
   90+ days with one-click revoke.

6. **Members → a member → Add role.** Pick Approver at Wealth
   Management for Priya: the SoD warning fires inline (she contributes
   there) and the only way through is a named exception with an
   approver — which is then recorded on the grant. Note the pickers
   never offered Tenant Admin below the root: the form can only ask for
   what the engine would allow.

7. **Roles.** The Separation of Duties panel: standing conflicts are
   continuously detected, each covered by a recorded exception — or
   flagged red. Below, the catalogue: every role visible, every role
   enforceable, no scope suffixes, one verb per meaning.

8. **Audit Log.** "Showing N of M" — switch View-as to Kenji and watch
   the log shrink to Japan plus his own events. Denials appear here too:
   a log that records only successes is not an audit log.

9. **Access Explorer → James Liu.** One screen shows scope, barriers,
   and residency at once: Japan allowed, M&A Advisory allowed via his
   explicit expiring crossing (lock icon), the entire German subtree
   denied with `residency`, NZ allowed. Click any row for the engine's
   full reason. Flip to "By node" on M&A Advisory for the reverse
   question: who can reach the deal room, and why.

10. **Preview tier → Standard, then Pro/Team.** On Standard the org
    capability shows as a locked upsell (never a missing menu); on Team,
    Members becomes flat Admin/Member/Viewer through the same engine.
    Back on Enterprise, everything above returns. Tier is a real axis:
    the engine denies plan-gated capabilities with reason `plan`.

*Bonus beat for a technical audience: open the HITL workflow as Alex
and try to sign off a project — the tenant admin is refused: "Full
Access covers administration, not business decisions." Switch to Sarah
(who edited nothing) to sign. Admins administer; named humans decide.*

## The governed change beat (2026-09-21) — versioned claims

1. **Dashboard, as Alex** — the queue holds `GOV-CHG-041 · Group
   glossary update · Goodwill v3.0`. Open it: "sign-off happens in
   Cortex" → **Review in Cortex**.
2. **The claim** — scope Global Company, v2.0 → v3.0, three evidence
   items, and the impact map: every country, BU and department with
   per-node people counts. Germany has already signed (Priya).
3. **Try to sign Japan as Alex** — refused inline: "Full Access covers
   administration, not business decisions." The admin/business split,
   on screen.
4. **View-as Sarah → Sign for Japan.** One country down, claim still
   pending — federation means no single signer publishes a Global change.
5. **View-as Lena → Sign for New Zealand** — the publish moment: the
   term's version chain advances to v3.0 Current, and BOTH local
   exceptions (Japan Securities, Germany Private Banking) flip to
   "Re-affirmation required — approval predates v3.0", owners named.
   Nothing silently broke.
6. **Re-affirm as Lena** on the Japan exception — refused: her NZ seat
   "does not cover Securities". **View-as Sarah → Re-affirm** — recorded.
7. **Back on the dashboard** — the hold resolved itself: "Published as
   v3.0 via governed change", and the stat chips moved one-for-one.
8. *Contrast:* open the pending **Model change** chip (Meridian JA
   Disclosure v1.0 → v1.1) — BU scope, one sign-off slot, a three-node
   impact map. Altitude is the blast radius.

Reload restores the seeds — the beat is repeatable.
