# NotVerify — Straker.AI Adaptive Command Surface

> **Clickable frontend prototype** for an AI-powered enterprise localization quality assurance platform.

> [!WARNING]
> **Simulation Only.** This is a non-functional prototype. All data is generated client-side. No real translation, AI processing, or API calls occur. There is no backend, no authentication, and no persistent storage beyond `localStorage`.

---

## Table of Contents

- [Quick Start](#quick-start)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Application Flow](#application-flow)
- [Design System](#design-system)
- [Key Components](#key-components)
- [Data Layer](#data-layer)
- [Custom Hooks](#custom-hooks)
- [Known Limitations](#known-limitations)
- [Documentation](#documentation)
- [Scripts](#scripts)
- [License](#license)

---

## Quick Start

**Prerequisites:** Node.js 18+

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in a desktop browser (≥1024px wide). Mobile viewports are blocked by design.

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| UI Framework | React | 19.2.x |
| Bundler | Vite | 8.x |
| Styling | Tailwind CSS | 4.x (via `@tailwindcss/vite`) |
| Animation | Framer Motion | 12.x |
| Icons | lucide-react | 0.577.x |
| Language | JavaScript (JSX) | ES2022+ |
| Linting | ESLint | 9.x (flat config) |
| Fonts | Inter + JetBrains Mono | Google Fonts CDN |

**Notable absences:** No TypeScript, no routing library, no state management library, no test framework, no backend, no database, no CI/CD.

---

## Project Structure

```
src/
├── App.jsx                           # Central state machine (~25 state vars, all routing)
├── main.jsx                          # React root + ToastProvider
├── index.css                         # Tailwind v4 @theme tokens + base layer
│
├── components/                       # ~70 JSX components
│   ├── Header.jsx                    # Top navigation bar
│   ├── Footer.jsx                    # Global footer
│   ├── MobileBlocker.jsx             # Blocks sub-1024px viewports
│   ├── WorkflowStepper.jsx           # Phase progress indicator
│   ├── OnboardingFlow.jsx            # Multi-step onboarding wizard
│   ├── GovernanceDashboard.jsx        # First-time user / predictive co-pilot dashboard
│   ├── GovernanceDashboard.jsx            # Main dashboard + mission control surface
│   ├── CommandUpload.jsx             # Document upload + drag-and-drop
│   ├── Dropzone.jsx                  # Reusable file drop target
│   ├── ParametersDrawer.jsx          # Locale/context parameter configuration drawer
│   ├── MissionControl.jsx            # Real-time processing overview
│   ├── AgentWarRoom.jsx              # Agent assembly + orchestration view
│   ├── AgentAssemblyTransition.jsx   # Animated transition into agent assembly
│   ├── TimeJumpTransition.jsx        # Cinematic time-skip animation
│   ├── SecurityTheatre.jsx           # Encryption/compliance processing visualisation
│   ├── PreFlightSimulator.jsx        # Pre-flight validation + confidence scoring
│   ├── LiveTelemetry.jsx             # Live processing telemetry feed
│   ├── GlassBox.jsx                  # Explainability / glass-box processing view
│   ├── QualityNarrative.jsx          # Post-processing quality report + locale breakdowns
│   ├── LocaleConstellation.jsx       # Locale quality map visualisation
│   ├── IntelligenceTriage.jsx        # AI-generated triage + issue prioritisation
│   ├── IntelligenceAssistant.jsx     # Contextual AI assistant overlay
│   ├── ComplianceOfficerView.jsx     # Compliance framework detail view
│   ├── ComplianceGate.jsx            # Gate component for compliance check outcomes
│   ├── HumanReview.jsx               # In-the-loop segment review interface
│   ├── AgentMarketplace.jsx          # Legacy agent marketplace view
│   ├── AgentProfile.jsx              # Individual agent detail card/overlay
│   ├── AgentArbitration.jsx          # Agent conflict arbitration overlay
│   ├── Cortex.jsx                  # Org knowledge base (glossaries, TM, patterns)
│   ├── TeamDirectory.jsx             # Team members + permissions directory
│   ├── OperationsControlRoom.jsx     # Campaign batch operations overview
│   ├── CampaignResultsView.jsx       # Campaign post-run results summary
│   ├── Settings.jsx                  # Settings shell / tab router
│   ├── IntegrationsHub.jsx           # Integrations shell / tab router
│   │
│   ├── CampaignHub/                  # Bulk campaign management
│   │   ├── index.jsx                 # Hub entry point + layout
│   │   ├── CampaignList.jsx          # Paginated campaign list
│   │   ├── CampaignDetail.jsx        # Campaign detail + document list
│   │   └── NewCampaignWizard.jsx     # Campaign creation wizard
│   │
│   ├── IntelligenceMarketplace/      # Agent catalog (new marketplace)
│   │   ├── index.jsx                 # Marketplace entry point
│   │   ├── AgentCard.jsx             # Individual agent tile
│   │   ├── AgentDetailView.jsx       # Full agent detail + hire flow
│   │   ├── FilterPanel.jsx           # Faceted filter sidebar
│   │   ├── SearchBar.jsx             # Marketplace search
│   │   ├── CategoryNav.jsx           # Category navigation
│   │   ├── CustomAgentStudio.jsx     # Build-your-own agent wizard
│   │   └── data/
│   │       └── marketplaceAgents.js  # Static agent catalog (1,054 lines)
│   │
│   ├── Integrations/                 # Workflow + security integrations
│   │   ├── WorkflowBuilder.jsx       # Visual workflow builder
│   │   ├── SecurityPermissions.jsx   # Role-based permission configuration
│   │   ├── ConnectorCard.jsx         # Integration connector tile
│   │   └── index.jsx                 # Integrations tab shell
│   │
│   └── Settings/                     # Credits, billing, and budget management
│       ├── CreditsAndBilling.jsx     # Billing, credit balance, usage history
│       ├── BudgetAlerts.jsx          # Budget threshold configuration
│       ├── UsageChart.jsx            # Credit usage visualisation
│       └── index.jsx                 # Settings tab shell
│
├── data/                             # Client-side mock data generators
│   ├── campaignModel.js              # Campaign + document object factories
│   ├── discoveryFindings.js          # Document analysis finding generators
│   ├── localeConstellation.js        # Locale metadata (flags, names, compliance)
│   ├── orgIntelligence.js            # Org health metric generators
│   └── qualityNarrative.js           # Quality score narrative builder
│
├── hooks/                            # Custom React hooks
│   ├── useFocusTrap.js               # Modal focus trap (accessibility)
│   ├── useKnowledgeRules.js          # Knowledge rule config + localStorage
│   ├── useMediaQuery.js              # CSS media query matcher
│   ├── useQualityCalculator.js       # Locale/context → quality score derivation
│   └── useReducedMotion.js           # prefers-reduced-motion reader
│
└── utils/
    └── scoreColors.js                # Numeric score → Tailwind colour class mapping
```

---

## Application Flow

Navigation is controlled by a `phase` string in `App.jsx` — no routing library. Transitions are triggered by user interaction and prop-drilled setter functions.

### Primary Journey

```
onboarding
    │  User completes org setup (name, vertical, locales, tone)
    ▼
agent-assembly
    │  AI agents are selected and assembled for the org profile
    ▼
first-campaign / dashboard
    │  Predictive co-pilot recommends next project (Q3 Earnings etc.)
    ▼
reading  (MissionControl)
    │  Document uploaded; source analysis, IQ scoring, intent detection
    ▼
processing  (SecurityTheatre → LiveTelemetry → GlassBox)
    │  Simulated translation pipeline with encryption/compliance theatre
    ▼
narrative  (QualityNarrative)
    │  Post-completion quality report, locale breakdowns, diagnostics
    ▼
time-jump
    │  Cinematic time-skip to a "mature" account state (156 projects)
    ▼
dashboard  (GovernanceDashboard)
    │  Full dashboard with org intelligence and history
```

### Side Routes

| Phase | Entry Point | Description |
|---|---|---|
| `settings` | Header nav | Credits, billing, budget alerts |
| `integrations` | Header nav | Workflow builder, security permissions |
| `campaign-hub` | Header nav | Bulk campaign management |
| `org-brain` | Header nav | Org knowledge base, glossaries, TM |
| `human-review` | Quality narrative CTA | In-the-loop segment review |

### Overlays (render on top of current phase)

| Overlay | Trigger | Description |
|---|---|---|
| Intelligence Marketplace | Header button | Agent catalog — browse, hire, deploy |
| Custom Agent Studio | Marketplace CTA | Build-your-own agent wizard |
| Agent Arbitration | Dashboard CTA | Resolve conflicting agent recommendations |
| Team Directory | Header avatar | Team member directory + permissions |

---

## Design System

### Theme

The prototype uses **Tailwind CSS v4** with a fully custom `@theme` block in `index.css`. All design tokens are CSS custom properties.

**Color palette — Straker brand blue:**

| Token | Hex | Usage |
|---|---|---|
| `straker-50` | `#e4f1fc` | Tinted backgrounds |
| `straker-100` | `#b3ddf5` | Light fills |
| `straker-400` | `#26a3e0` | Hover states, focus rings |
| `straker-500` | `#009eda` | Interactive accents |
| `straker-600` | `#0084be` | **Primary CTAs** |
| `straker-700` | `#007aa9` | Pressed states |
| `straker-950` | `#004461` | Deep brand fill |

**Surface tokens (white/light theme):**

| Token | Hex | Usage |
|---|---|---|
| `navy-900` | `#ffffff` | Page background |
| `navy-800` | `#ffffff` | Card fill |
| `navy-700` | `#f5f5f5` | Elevated card / hover |
| `navy-600` | `#eeeeee` | Dividers, secondary surface |

**Semantic tokens:**

| Token | Hex | Usage |
|---|---|---|
| `success` | `#4caf50` | High quality scores, pass states |
| `warning` | `#fb8c00` | Mid-range scores, caution |
| `error` | `#b00020` | Low scores, critical flags |
| `info` | `#2196f3` | Informational callouts |

**Text + border:**

| Token | Value | Usage |
|---|---|---|
| `text-primary` | `rgba(0,0,0,0.87)` | Body copy |
| `text-secondary` | `rgba(0,0,0,0.6)` | Supporting text |
| `text-disabled` | `rgb(117,117,117)` | Disabled states |
| `border` | `rgba(0,0,0,0.12)` | Default borders |
| `border-strong` | `rgba(0,0,0,0.38)` | Emphasis borders |
| `hover` | `rgba(0,0,0,0.04)` | Hover overlay |

### Typography

| Role | Font | Application |
|---|---|---|
| UI text | Inter | All labels, body, headings |
| Scores / stats / code | JetBrains Mono | Quality scores, metrics, config values |

### Motion

All animations use **Framer Motion 12**. Default spring configuration: `{ stiffness: 300, damping: 20 }`.

- `useReducedMotion` hook reads `prefers-reduced-motion` and suppresses animations globally when set
- CSS layer also enforces `animation-duration: 0.01ms` as a hard fallback for reduced-motion
- Transitions: page-level `AnimatePresence` + per-component `motion.div` variants
- Signature effects: breathing glow on co-pilot card, staggered list entrances, progress bar fills

### Focus & Accessibility

- `:focus-visible` ring: 2px solid `straker-400`, 2px offset
- Skip-to-content links present
- `aria-label` on navigation and icon-only buttons
- Focus trap hook available for modals and overlays
- `useFocusTrap` applied to full-screen overlay components

---

## Key Components

Ranked by file size (lines of code):

| Component | Lines | Description |
|---|---|---|
| `HumanReview.jsx` | 2,027 | Full in-the-loop review interface — segment list, translation editor, QA flags, approval workflow |
| `CustomAgentStudio.jsx` | 1,417 | Multi-step wizard for building custom AI agents — capability selection, tuning, deployment |
| `QualityNarrative.jsx` | 1,356 | Post-processing quality report — locale breakdowns, score visualisations, actionable diagnostics |
| `GovernanceDashboard.jsx` | 1,137 | Main dashboard — org intelligence panel, recent projects, co-pilot recommendations, quick actions |
| `Settings/CreditsAndBilling.jsx` | 1,062 | Credits balance, billing history, plan management, invoice download |
| `Cortex.jsx` | 1,038 | Org knowledge base — glossary management, translation memory, pattern library |
| `App.jsx` | 1,032 | Central state machine — all `useState`, phase routing, inline data generators, prop dispatch |
| `AgentMarketplace.jsx` | 1,013 | Agent discovery — browse by category, agent cards, hire/deploy flow |
| `OnboardingFlow.jsx` | 893 | Multi-stage onboarding wizard — org name, vertical, locale selection, tone, agent assembly |
| `SecurityTheatre.jsx` | 847 | Processing visualisation — encryption animation, compliance check sequence, audit trail simulation |
| `PreFlightSimulator.jsx` | 811 | Pre-flight validation — document analysis, confidence scoring, risk identification |
| `MissionControl.jsx` | 776 | Real-time processing overview — agent activity feed, progress meters, ETA projection |
| `LocaleConstellation.jsx` | 770 | Locale quality constellation — radial score map, per-locale trend indicators |
| `ComplianceOfficerView.jsx` | 756 | Compliance framework detail — framework applicability, control mapping, pass/fail breakdown |
| `IntelligenceTriage.jsx` | 750 | AI triage panel — auto-prioritised issues, severity classification, recommended actions |

---

## Data Layer

All data is generated deterministically on the client. There are no API calls anywhere in the codebase.

### Generators in `src/data/`

| File | Exports | Description |
|---|---|---|
| `campaignModel.js` | `generateCampaign`, `generateDocument` | Factory functions for campaign and document objects with realistic metadata |
| `discoveryFindings.js` | `generateDiscoveryStream` | Produces document analysis findings — complexity flags, terminology gaps, compliance notes |
| `localeConstellation.js` | `locales`, `getLocaleMetadata` | Locale registry — language codes, display names, flag emojis, associated compliance frameworks |
| `orgIntelligence.js` | `generateOrgIntelligence` | Generates org health metrics — project history, quality trends, agent performance, budget utilisation |
| `qualityNarrative.js` | `generateQualityNarrative` | Builds per-locale quality score breakdowns with human-readable diagnostic copy |

### Inline Generators in `App.jsx`

`App.jsx` also contains ~200 lines of inline generator functions used directly in phase transition handlers:

| Function | Output |
|---|---|
| `getClassification()` | Document type and domain classification |
| `getIntent()` | Detected translation intent and formality |
| `getAgent()` | Recommended primary agent selection |
| `getPlan()` | Execution plan with step breakdown and ETA |
| `getSourceIQ()` | Source document IQ score (readability, consistency, complexity) |
| `getQualityScore()` | Final composite quality score per locale |
| `getUpsellOptions()` | Post-completion upsell/upgrade recommendations |
| `getSandboxPreview()` | Sandbox translation preview snippet |

---

## Custom Hooks

| Hook | Description |
|---|---|
| `useFocusTrap(ref, active)` | Traps keyboard focus within a container element (overlays, modals). Activates/deactivates based on the `active` flag. |
| `useKnowledgeRules()` | Manages knowledge rule configuration — CRUD operations with `localStorage` persistence. |
| `useMediaQuery(query)` | Evaluates a CSS media query string and returns a boolean. Used for mobile detection and viewport conditionals. |
| `useQualityCalculator(locales, context)` | Derives quality score projections from locale list and structured context (vertical, tone, document type). |
| `useReducedMotion()` | Returns `true` when the user has `prefers-reduced-motion: reduce` set. Used to gate Framer Motion animations. |

---

## Known Limitations

These are intentional prototype constraints — not bugs to fix in this repo.

| Limitation | Detail |
|---|---|
| **No backend** | Zero server-side code. All state is in-memory or `localStorage`. |
| **No authentication** | No login, sessions, tokens, or RBAC. Any visitor accesses all screens. |
| **No tests** | No test framework installed. No unit, integration, or e2e tests. |
| **No router** | Phase-based navigation via string state — no deep links, no browser back/forward, no URL sharing. |
| **No TypeScript** | 100 source files in plain JSX. No compile-time type safety. |
| **GDPR — Google Fonts CDN** | `index.html` loads Inter and JetBrains Mono from `fonts.googleapis.com`, sending user IPs to Google on every load. Fix: self-host font files under `public/fonts/`. |
| **Debug hooks on `window`** | `App.jsx` exposes `window.__setPhase`, `window.__setShowMarketplace`, and `window.__setHumanReviewMode` in all environments. Any user can manipulate state from the browser console. Fix: gate behind `import.meta.env.DEV`. |
| **Props drilling** | No Context API or state library — all state is passed as props 3–4 levels deep from `App.jsx`. |
| **No error boundaries** | A runtime crash in any component unmounts the entire app. |
| **`console.log` in production** | `App.jsx` has 5 `console.log` statements in callback handlers. |
| **`localStorage` for user data** | Six components persist UI state to `localStorage` without encryption, expiry, or size management. Not suitable for production multi-tenant use. |
| **Package name mismatch** | `package.json` names the project `"product-x"`, not `"not-verify"` or `"straker-ai"`. |

---

## Documentation

| Document | Description |
|---|---|
| [`docs/overview.md`](docs/overview.md) | Product overview — vision, persona, core workflows |
| [`docs/architecture-audit.md`](docs/architecture-audit.md) | Full codebase audit — metrics, issues, assessment |
| [`docs/PROTOTYPE_SPEC.md`](docs/PROTOTYPE_SPEC.md) | Original 4-screen prototype spec with layout wireframes and interaction notes |
| [`docs/changelog.md`](docs/changelog.md) | Change log — feature additions, fixes, design iterations |

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server at `http://localhost:5173` with HMR |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serve the `dist/` build locally for pre-deploy verification |
| `npm run lint` | Run ESLint across all source files (flat config, `eslint.config.js`) |

---

## License

Proprietary. Copyright © Straker Translations Ltd. All rights reserved.

This repository contains pre-release prototype software. Not for distribution.
