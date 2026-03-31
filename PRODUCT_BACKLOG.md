# Not Verify — Product Backlog
## UX Audit → Agile Epics & User Stories

> Generated from UX/UI audit findings. Prioritized for maximum user activation impact.
> Codebase: React 19 + Vite 8 + Tailwind CSS v4 + Framer Motion 12

---

## Epic 1: Usability & Conversion — Fix Critical Blockers

**Theme:** Remove friction that prevents users from completing onboarding and starting their first project.

---

### Story 1.1 — Fix Disabled-Looking "Continue" Button in Onboarding

**Priority:** 🔴 Critical

**User Story:**
As a new user going through onboarding, I want the "Continue" button to look clearly clickable, so that I don't abandon the setup flow thinking the button is broken or locked.

**Current State:**
- `OnboardingFlow.jsx` line 134: The enabled state uses `bg-straker-600` with white text, but at the `straker-600` value (`#0084be`) rendered at 14px, the visual weight is low against the white card background.
- The disabled state (`bg-straker-600/50 text-white/50 opacity-50`) is too visually similar to the enabled state, especially on lower-contrast displays.

**Acceptance Criteria:**
- [ ] Enabled button background is darkened to at least `#3b5bdb` (WCAG AA 4.5:1 contrast ratio with white text — verified)
- [ ] Disabled state uses a clearly distinct treatment: `bg-gray-200 text-gray-400 cursor-not-allowed` (no color, no ambiguity)
- [ ] Button has a visible hover state transition (slight darken or scale) when enabled
- [ ] `cursor: pointer` is present on the enabled state; `cursor: not-allowed` on disabled
- [ ] A/B tested or user-tested to confirm 0% "looks broken" feedback

**Affected Files:** `OnboardingFlow.jsx` (ContinueButton component, ~line 127)

---

### Story 1.2 — Unify the "Start Project" CTA and Drop Zone

**Priority:** 🔴 Critical

**User Story:**
As a first-time user on the Intelligence Hub dashboard, I want a single clear action to begin my first project, so that I don't waste time deciding between "Start Your First Project" and "Drop your document here."

**Current State:**
- `ColdStartDashboard.jsx` lines 233–282: Two competing calls-to-action separated by an "OR" pill badge
- The button triggers `onStartFirstProject` while the drop zone triggers `onFileAccepted` — different code paths for the same user intent
- Forces a premature decision: "Should I click or drag?" before the user even understands the workflow

**Acceptance Criteria:**
- [ ] Single primary CTA zone that accepts both click-to-browse AND drag-and-drop
- [ ] The unified zone uses the "Start Your First Project" language as its heading, with "or drag your document here" as supportive secondary text beneath it
- [ ] Clicking anywhere in the zone opens the native file picker (same as current drop zone behavior)
- [ ] Drag-over state provides clear visual feedback (border color change, background tint)
- [ ] The separate "OR" divider and standalone drop zone are removed
- [ ] `onStartFirstProject` and `onFileAccepted` are consolidated or the button simply opens the file picker

**Affected Files:** `ColdStartDashboard.jsx` (center column, lines 232–282)

---

### Story 1.3 — Fix CTA Button Color for WCAG AA Compliance

**Priority:** 🔴 Critical

**User Story:**
As a user with low vision, I want all interactive buttons to meet WCAG AA contrast requirements, so that I can identify and use them without difficulty.

**Current State:**
- ✅ Already fixed in latest code: CTA button darkened from `#5c7cfa` to `#3b5bdb`
- ✅ Section headers changed from `text-gray-400` to `text-gray-600`
- ✅ Status pill text changed from `text-emerald-400` to `text-emerald-700`

**Acceptance Criteria:**
- [ ] Verify all fixes render correctly across Chrome, Safari, Firefox
- [ ] Run automated axe-core or Lighthouse accessibility audit — 0 contrast violations
- [ ] Confirm the onboarding "Continue" button (Story 1.1) is also covered
- [ ] QA sign-off on all text-on-background combinations across the full flow

**Affected Files:** `ColdStartDashboard.jsx`, `StatusPill.jsx`, `WorkflowStepper.jsx` (already updated)

---

## Epic 2: Onboarding Narrative — Bridge the Vocabulary Gap

**Theme:** Ensure the conversational onboarding flow introduces platform-specific terminology naturally, so the dashboard feels familiar rather than alien.

---

### Story 2.1 — Drip-Feed Dashboard Terminology During Onboarding Chat

**Priority:** 🟠 High

**User Story:**
As a new user completing onboarding, I want the assistant to naturally introduce terms like "Org Brain," "Quality Baseline," and "Readiness Core" in conversation, so that these concepts feel familiar when I see them on the dashboard.

**Current State:**
- `OnboardingFlow.jsx`: The 4-stage chat flow (`welcome → work → assets → complete`) introduces "locales," "vertical," "compliance frameworks," and "tone" — but never mentions "Org Brain," "Readiness Core," "Quality Baseline," or "Agent Ensemble"
- `ColdStartDashboard.jsx`: First exposure to "Readiness Core" (line 106), "Org Health" (line 295), "Org Brain" (line 33) — all brand-new jargon with no context
- The completion summary (stage `complete`, ~line 316) lists configuration data but doesn't bridge to what the user will see next

**Acceptance Criteria:**
- [ ] During the `work` stage, after the user selects locales, the bot says something like: _"Great — I'll configure your **Readiness Core** with those markets. That's how we track your setup progress."_
- [ ] During the `assets` stage, when discussing glossary/TMX uploads, the bot introduces the Org Brain: _"These files will seed your **Org Brain** — it's your organization's living knowledge base that improves with every project."_
- [ ] In the `complete` summary, the bot previews the dashboard: _"On your dashboard, you'll see your **Readiness Core** checklist and **Org Health** metrics. Both are empty now — they'll fill in after your first project."_
- [ ] Each introduced term is **bolded** (wrapped in `**term**`) in the chat bubble for visual emphasis
- [ ] No more than 2 new terms introduced per stage to avoid cognitive overload

**Affected Files:** `OnboardingFlow.jsx` (message arrays in stage transition handlers, ~lines 246–379)

---

### Story 2.2 — Clarify the Workflow Stepper Purpose

**Priority:** 🟡 Medium

**User Story:**
As a user seeing the 7-step navigation bar for the first time, I want to understand whether it represents a project workflow or a setup wizard, so that I can orient myself in the product.

**Current State:**
- `WorkflowStepper.jsx` lines 5–13: Steps are `Intelligence Hub → Agent Configuration → Processing → Verification → Governance → Review → Org Brain`
- `aria-label="Workflow progress"` exists but no visible explanatory text
- The stepper appears immediately post-onboarding when the user lands on the dashboard — with no introduction
- Steps like "Governance" and "Verification" are abstract; "Agent Configuration" could be confused with a settings page

**Acceptance Criteria:**
- [ ] On first dashboard visit (Day 0), a subtle tooltip or inline callout appears near the stepper: _"This is your project workflow — each document flows through these steps."_
- [ ] The tooltip auto-dismisses after 5 seconds or on click, and doesn't show again (persisted via `localStorage`)
- [ ] Step labels are reviewed for clarity. Candidates for renaming:
  - "Agent Configuration" → "Agent Selection"
  - "Verification" → "Quality Check"
  - "Governance" → "Compliance Review"
- [ ] The stepper's `aria-label` is updated to match: `"Project workflow — 7 steps from upload to knowledge base"`
- [ ] Future steps (not yet reachable) appear visually distinct (already `opacity-60` — verify this is sufficient)

**Affected Files:** `WorkflowStepper.jsx`, `ColdStartDashboard.jsx` (for first-visit tooltip trigger)

---

### Story 2.3 — Introduce Compliance Frameworks in Context During Onboarding

**Priority:** 🟡 Medium

**User Story:**
As a user in a regulated industry (e.g., Financial Services), I want the onboarding assistant to explain what compliance guardrails are being activated for me, so that I understand the platform's value before I see framework acronyms on the dashboard.

**Current State:**
- `OnboardingFlow.jsx` line 49: `COMPLIANCE_MAP` silently maps verticals to frameworks (`Financial Services → ['GAAP', 'IFRS']`)
- The completion summary (~line 521) shows compliance frameworks as raw acronyms with no explanation
- Dashboard shows "Compliance: No data" (ColdStartDashboard line 45) without context

**Acceptance Criteria:**
- [ ] After content type selection in the `work` stage, the bot explains: _"Since you work with earnings reports, I'll activate **GAAP** and **IFRS** compliance guardrails. These ensure your translations meet regulatory standards."_
- [ ] The completion summary includes a "Compliance" section with human-readable descriptions (e.g., "GAAP — Generally Accepted Accounting Principles")
- [ ] If the user's vertical has no compliance frameworks (e.g., Marketing), the bot says: _"No specific regulatory frameworks needed for your content type — but I'll still monitor general quality standards."_
- [ ] Framework acronyms always appear with their full name on first mention

**Affected Files:** `OnboardingFlow.jsx` (work stage handler, completion summary component)

---

## Epic 3: Dashboard Activation — Transform Empty States

**Theme:** Convert the "waiting for data" dashboard into an active, goal-oriented first-run experience that drives the user toward their first project.

---

### Story 3.1 — Replace Empty Panels with a "First Mission" Checklist

**Priority:** 🟠 High

**User Story:**
As a new user on a dashboard full of zeros and "awaiting baseline" labels, I want an actionable checklist of things to do, so that I feel guided rather than abandoned.

**Current State:**
- `ColdStartDashboard.jsx` lines 42–47: `METRIC_ROWS` shows 4 rows of "Awaiting baseline," "No knowledge base yet," "No data," "0 segments"
- Lines 26–33: `READINESS_ITEMS` shows 6 items, 4 done + 2 pending — but they're passive status labels, not actionable
- The "What happens on your first project" section (lines 35–40) tells the user what *will* happen but doesn't let them *do* anything

**Acceptance Criteria:**
- [ ] The right column replaces static Org Health metrics with a **"First Mission" checklist**:
  1. _"Upload your first document"_ → links to file picker
  2. _"Review your agent ensemble"_ → links to Agent Configuration
  3. _"Explore your Org Brain"_ → links to Org Brain (disabled until post-first-project)
  4. _"Invite a team member"_ → opens invite flow (or placeholder)
- [ ] Each checklist item has: an icon, a clear action label, an arrow affordance (`→`), and a disabled/locked state for items that require a completed first project
- [ ] Completed items show a green checkmark and strikethrough
- [ ] The overall progress is shown as a fraction (e.g., "1 of 4 complete") and/or a progress ring
- [ ] The current "Org Health" section is preserved but moved to a collapsible "Details" section below the checklist

**Affected Files:** `ColdStartDashboard.jsx` (right column, lines 288–364)

---

### Story 3.2 — Animate the "Readiness Core" Into a Living Checklist

**Priority:** 🟡 Medium

**User Story:**
As a new user, I want the Readiness Core panel to feel dynamic and responsive to my actions, so that I understand my progress toward platform readiness.

**Current State:**
- `ColdStartDashboard.jsx` lines 99–154: Static list with green checkmarks (done) and pulsing gray circles (pending)
- Items are purely informational — clicking them does nothing
- The 4 "done" items were completed during onboarding, but there's no celebration or acknowledgment

**Acceptance Criteria:**
- [ ] Each "done" item has a subtle entrance animation (staggered fade-in with check-mark pop) when the dashboard first loads
- [ ] Pending items ("Quality Baseline," "Org Brain") show an actionable hint on hover: _"Complete your first project to unlock"_
- [ ] When the user completes their first project and returns to the dashboard, newly completed items animate from pending → done with a satisfying transition
- [ ] The bottom summary text updates dynamically: "4 of 6 ready" → "6 of 6 — fully operational!" with a congratulatory tone

**Affected Files:** `ColdStartDashboard.jsx` (left column, lines 99–154)

---

### Story 3.3 — Add Skeleton/Progress States for Empty Metrics

**Priority:** 🟢 Low

**User Story:**
As a new user, I want empty metric panels to show subtle placeholder animations, so that I understand these areas will populate with real data over time.

**Current State:**
- ✅ Partially addressed: Org Health `--` dashes already have pulsing opacity animations (lines 306–319)
- However, the animation is on literal `--` text which has been removed in favor of stacked label/value layout

**Acceptance Criteria:**
- [ ] Empty metric values show a skeleton-style animated gradient bar (Tailwind `animate-pulse` on a `bg-gray-200` bar) instead of blank or "No data" text
- [ ] Each skeleton bar is approximately the width of the expected data (e.g., "94%" would be ~3ch wide)
- [ ] A subtle label beneath says "Available after first project" in `text-gray-400`
- [ ] Once data is available, the skeleton transitions to the real value with a fade-in

**Affected Files:** `ColdStartDashboard.jsx` (right column metrics, lines 288–328)

---

## Epic 4: AI & Trust Positioning — Elevate the Agent Narrative

**Theme:** Surface the AI agent ecosystem and security posture early in the user journey to reinforce the platform's differentiators.

---

### Story 4.1 — Show Agent Assignment Animation After Onboarding

**Priority:** 🟠 High

**User Story:**
As a new user, I want to see my specialist AI agents being "assigned" to my workspace after completing onboarding, so that I immediately understand the value of the agent ecosystem.

**Current State:**
- `App.jsx` lines 67–96: Default agents (`JP-FIN-3`, `Meridian Digital Twin`, `Brand Voice Sentry`) are set in state silently
- `handleOnboardingComplete` (line 140) sets the phase to `dashboard` with no intermediate animation
- Agents only become visible later in the "Agent Configuration" step — the user never sees them on Day 0

**Acceptance Criteria:**
- [ ] After onboarding completes and before the dashboard renders, a 3–4 second transition screen shows:
  - The heading: _"Assembling your agent ensemble..."_
  - 3 agent cards animate in sequentially (0.5s stagger), each showing: agent icon, name, specialty, and a brief description
  - Example: 🧠 **JP-FIN-3** — _Japanese Financial Specialist_ — "Trained on J-GAAP terminology with 97% accuracy"
  - A subtle progress ring fills as each agent "connects"
- [ ] The transition uses the existing `TimeJumpTransition.jsx` pattern or a new `AgentAssemblyTransition` component
- [ ] The agents shown match the user's configured vertical and locales (not generic)
- [ ] A "Continue to Dashboard →" button appears after all agents are assigned
- [ ] Users can skip the animation via the existing "Skip" button
- [ ] `prefers-reduced-motion` is respected — skip animation entirely, show static list

**Affected Files:** `App.jsx` (between onboarding and dashboard phase transition), new component `AgentAssemblyTransition.jsx`

---

### Story 4.2 — Give the Intelligence Assistant a Named Persona

**Priority:** 🟡 Medium

**User Story:**
As a user interacting with the floating assistant, I want it to have a consistent name and personality, so that the AI experience feels personal and trustworthy rather than generic.

**Current State:**
- `IntelligenceAssistant.jsx` line 135: Introduces itself as "your Intelligence Assistant" — no name
- `OnboardingFlow.jsx` line 238: "I am your Intelligence Assistant" — same generic title
- Both use the same Bot icon but no avatar differentiation

**Acceptance Criteria:**
- [ ] The assistant introduces itself with a name during onboarding: _"I'm **Sage**, your Intelligence Assistant."_
- [ ] The FAB tooltip (line 228) updates to "Chat with Sage"
- [ ] The chat panel header (line 251) shows "Sage" with "Intelligence Assistant" as subtitle
- [ ] The onboarding greeting uses the same name for continuity: _"Hi! I'm Sage, your Intelligence Assistant at Not Verify."_
- [ ] The avatar differentiates from generic Bot icons — consider a unique color ring or subtle glow
- [ ] The name is configurable via a constant (not hardcoded in 15 places)

**Affected Files:** `IntelligenceAssistant.jsx`, `OnboardingFlow.jsx`

---

### Story 4.3 — Front-Load Trust Signals Into the Onboarding Summary

**Priority:** 🟡 Medium

**User Story:**
As a security-conscious enterprise user, I want to see the platform's security certifications during onboarding (before I upload sensitive documents), so that I feel confident entrusting my data to the system.

**Current State:**
- `TrustBadges.jsx` lines 6–31: SOC 2 Type II, AES-256, and In-Region badges exist but are only displayed in the `Footer.jsx` component
- `Footer.jsx` line 7: `<TrustBadges />` rendered at the very bottom of every page — easy to miss
- The onboarding completion summary (`OnboardingFlow.jsx` ~line 316) shows configuration data but zero security information
- The drop zone in `Dropzone.jsx` (line 469) mentions "AES-256 encrypted" in tiny text, but this is after the user has already decided to upload

**Acceptance Criteria:**
- [ ] The onboarding `complete` stage summary includes a "Security & Compliance" section showing all 3 trust badges inline
- [ ] Each badge shows its icon + label + a one-line description (pulled from `TrustBadges.jsx` tooltip text)
- [ ] The section header reads: _"Your data is protected"_
- [ ] The SOC 2 badge is still clickable, opening the existing verification modal
- [ ] Badges use the same visual style as the footer badges (neutral gray, consistent `border-black/[0.12]`)
- [ ] The footer badges remain in place (they serve as persistent reassurance)

**Affected Files:** `OnboardingFlow.jsx` (completion stage), `TrustBadges.jsx` (may need to export badge data separately for reuse)

---

### Story 4.4 — Ensure Intelligence Assistant Persists Across All Post-Onboarding Phases

**Priority:** 🟢 Low

**User Story:**
As a user navigating through different project phases, I want the Intelligence Assistant to remain available and contextually aware, so that I always have help at hand.

**Current State:**
- ✅ Already implemented: `App.jsx` lines 536–540 render `<IntelligenceAssistant />` outside the phase conditional, visible on all post-onboarding screens
- The assistant's quick actions and canned responses are static — not phase-aware

**Acceptance Criteria:**
- [ ] Verify the FAB is visible and functional on all 7 workflow phases (not just dashboard)
- [ ] The assistant's welcome message adapts to the current phase: _"I see you're on the Review step. Need help understanding any flagged segments?"_
- [ ] Quick actions update based on phase context (e.g., during "Governance" show compliance-specific actions; during "Review" show segment-related actions)
- [ ] The chat history persists across phase transitions (already does via state — verify)
- [ ] The FAB does not obstruct critical UI elements on any phase (footer padding already addressed)

**Affected Files:** `IntelligenceAssistant.jsx` (add `currentPhase` prop), `App.jsx` (pass phase to assistant)

---

## Priority Matrix

| Priority | Stories | Effort Estimate |
|----------|---------|-----------------|
| 🔴 **Critical** | 1.1 (Continue button), 1.2 (Unified CTA), 1.3 (Contrast audit) | 3–5 days |
| 🟠 **High** | 2.1 (Terminology drip-feed), 3.1 (First Mission checklist), 4.1 (Agent assignment animation) | 5–8 days |
| 🟡 **Medium** | 2.2 (Stepper clarity), 2.3 (Compliance context), 4.2 (Named persona), 4.3 (Trust signals in onboarding) | 5–7 days |
| 🟢 **Low** | 3.2 (Readiness animation), 3.3 (Skeleton states), 4.4 (Phase-aware assistant) | 3–4 days |

**Total estimated sprint capacity:** 16–24 days (2–3 sprints for a 2-person team)

---

## Sprint Recommendation

### Sprint 1 (Critical + Quick Wins)
- Story 1.1 — Fix Continue button appearance
- Story 1.2 — Unify Start Project + Drop Zone
- Story 1.3 — Verify contrast fixes
- Story 4.2 — Name the assistant (low effort, high brand impact)

### Sprint 2 (Narrative & Activation)
- Story 2.1 — Drip-feed terminology
- Story 3.1 — First Mission checklist
- Story 4.3 — Trust signals in onboarding

### Sprint 3 (Polish & Delight)
- Story 4.1 — Agent assignment animation
- Story 2.2 — Stepper clarity
- Story 2.3 — Compliance context
- Story 3.2 — Readiness animations
- Story 3.3 — Skeleton states
- Story 4.4 — Phase-aware assistant
