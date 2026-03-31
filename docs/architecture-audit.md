# NotVerify — Architecture & Codebase Audit

**Date:** 2026-04-01
**Auditor:** Strider
**Scope:** Full repository scan — `/home/josh/str/AIOps/code/NotVerify`

---

## 1. Product Summary

NotVerify (working name "product-x") is a **clickable frontend prototype** for an AI-powered localization quality assurance platform. The product concept — branded "Straker.AI — Adaptive Command Surface" — targets enterprise localization admins who manage document translation workflows across multiple languages and compliance frameworks.

**Core workflows simulated in the prototype:**

1. **Intelligent Dashboard** — Predictive co-pilot recommends next project based on org history
2. **Command Surface** — Document upload, real-time analysis, quality projection
3. **Processing & Security Theatre** — Execution visualization with encryption/compliance narrative
4. **Quality Narrative** — Explainable post-completion scoring with locale breakdowns and actionable diagnostics
5. **Campaign Hub** — Bulk document ingestion with pre-flight validation
6. **Agent Marketplace** — Browse/hire/deploy specialized AI translation agents
7. **Human Review** — In-the-loop review for flagged segments
8. **Org Brain** — Organizational knowledge base (glossaries, patterns, translation memory)
9. **Settings & Integrations** — Credits/billing, workflow builder, security permissions

**Key distinction:** This is a **simulation-only prototype**. All data is generated client-side. No real translation, AI processing, or API calls occur.

---

## 2. Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| UI Framework | React | 19.2.x |
| Bundler | Vite | 8.x |
| Styling | Tailwind CSS | 4.x (via `@tailwindcss/vite`) |
| Animation | Framer Motion | 12.x |
| Icons | lucide-react | 0.577.x |
| Language | JavaScript (JSX) | ES2022+ |
| Linting | ESLint | 9.x (flat config) |
| Fonts | Inter + JetBrains Mono | Via Google Fonts CDN |

**Notable absences:** No TypeScript, no routing library, no state management library, no testing framework, no backend, no database, no Docker, no CI/CD.

---

## 3. Architecture

### 3.1 Application Structure

```
src/
├── App.jsx                     # Central state machine (1032 lines)
├── main.jsx                    # React root + ToastProvider
├── index.css                   # Tailwind imports + theme tokens
├── assets/                     # Static SVGs
├── components/                 # ~70 JSX components (flat + subdirs)
│   ├── CampaignHub/            # Bulk campaign management
│   ├── IntelligenceMarketplace/# Agent catalog + data
│   ├── Integrations/           # Workflow builder, security perms
│   └── Settings/               # Credits, billing, budgets
├── data/                       # Mock data generators
│   ├── campaignModel.js        # Campaign/document factories
│   ├── discoveryFindings.js    # Analysis finding generators
│   ├── localeConstellation.js  # Locale metadata
│   ├── orgIntelligence.js      # Org health metric generators
│   └── qualityNarrative.js     # Quality score narrative builder
├── hooks/                      # Custom React hooks
│   ├── useFocusTrap.js
│   ├── useKnowledgeRules.js
│   ├── useMediaQuery.js
│   ├── useQualityCalculator.js
│   └── useReducedMotion.js
└── utils/
    └── scoreColors.js          # Score → color mapping
```

### 3.2 State Management

All application state lives in `App.jsx` via `useState` hooks — approximately 25 state variables. Navigation is controlled by a `phase` string state variable (not a router). Phases include:

`onboarding` → `agent-assembly` → `first-campaign` → `dashboard` → `reading` → `upload` → `processing` → `narrative` → `time-jump` → `settings` → `integrations` → `campaign-hub` → `org-brain` → `human-review`

**No React Router.** Phase transitions are handled by setter functions passed as props through the entire component tree (props drilling).

### 3.3 Data Flow

All data is **generated client-side** by deterministic factory functions in `src/data/` and inline helpers in `App.jsx`. The generators take file metadata and structured context (locales, vertical, tone) as input and produce mock quality scores, agent recommendations, discovery findings, and quality narratives.

There are no API calls, no `fetch`/`axios` usage, and no server-side processing.

---

## 4. Codebase Metrics

| Metric | Value |
|--------|-------|
| Total source files | 100 |
| Total lines of code | ~35,884 |
| Largest file | `HumanReview.jsx` — 2,027 lines |
| Files over 300 lines | 20+ |
| Files over 1000 lines | 6 |

### Files Exceeding 300-Line Threshold

| File | Lines | Concern |
|------|-------|---------|
| `HumanReview.jsx` | 2,027 | Massive monolith — should be 5-8 smaller components |
| `CustomAgentStudio.jsx` | 1,417 | Complex form/wizard — needs decomposition |
| `QualityNarrative.jsx` | 1,356 | Multiple visualization sections in one file |
| `CommandSurface.jsx` | 1,137 | Dashboard with multiple sub-sections |
| `Settings/CreditsAndBilling.jsx` | 1,062 | Billing UI in a single component |
| `App.jsx` | 1,032 | God component — all state and routing here |
| `IntelligenceMarketplace/data/marketplaceAgents.js` | 1,054 | Large static data file |
| `OrgBrain.jsx` | 1,038 | Knowledge base UI |
| `AgentMarketplace.jsx` | 1,013 | Full marketplace UI |
| `OnboardingFlow.jsx` | 893 | Multi-stage onboarding wizard |

---

## 5. Issues Found

### 5.1 Critical Issues

#### GDPR Violation: Google Fonts CDN
- **Location:** `index.html:8-10`
- **Issue:** Inter and JetBrains Mono loaded from `fonts.googleapis.com`. This sends user IP addresses to Google on every page load — a GDPR violation for EU users.
- **Fix:** Self-host the fonts. Download woff2 files, place in `public/fonts/`, reference via `@font-face` in CSS.

#### Debug Hooks Exposed on `window`
- **Location:** `App.jsx:46, 61, 74`
- **Issue:** `window.__setPhase`, `window.__setShowMarketplace`, `window.__setHumanReviewMode` are exposed in all environments. Any user can manipulate application state from the browser console.
- **Fix:** Gate behind `import.meta.env.DEV` check, or remove entirely.

#### No Authentication or Authorization
- **Issue:** The prototype has zero auth. No login, sessions, tokens, or RBAC. When building the real product, this is the #1 architectural requirement.

#### No Input Validation
- **Issue:** File uploads, onboarding forms, and configuration inputs have no server-side validation (there is no server). Client-side validation is minimal.

### 5.2 Architectural Issues

#### God Component (`App.jsx`)
- 1,032 lines with 25+ state variables, 15+ callback handlers, and 6+ inline data generator functions
- All routing, state management, and business logic in a single component
- Props drilling through 3-4 levels for every piece of state

#### No Routing Library
- Phase-based navigation via string state prevents deep linking, browser back/forward, URL sharing, and analytics tracking
- Makes code splitting impossible

#### No State Management
- No Context API, Redux, Zustand, or similar — everything is `useState` in `App.jsx`
- Will not scale to multi-tenant, multi-user state requirements

#### Mock Data Mixed with UI Logic
- `App.jsx` contains 200+ lines of data generator functions (`getClassification`, `getIntent`, `getAgent`, `getPlan`, `getSourceIQ`, `getQualityScore`, `getUpsellOptions`, `getSandboxPreview`)
- These should be in `src/data/` or eventually replaced by API calls

### 5.3 Quality Issues

#### No Tests
- No test framework installed (no Vitest, Jest, Cypress, or Playwright)
- No test files in the repository
- No `test` script in `package.json`

#### No TypeScript
- 100 source files in plain JavaScript/JSX
- No type safety, no IDE autocompletion for props, no compile-time error detection
- The `@types/react` devDep suggests TS was considered but not adopted

#### No Error Boundaries
- No React error boundaries — a crash in any component brings down the entire app

#### Console.log Statements in Production Code
- `App.jsx` has 5 `console.log` statements in callback handlers that would leak data in production

#### No Environment Configuration
- No `.env` or `.env.example` file
- No `import.meta.env` usage anywhere in the codebase
- All configuration is hardcoded

#### README is Default Template
- The README.md is the stock Vite React template text — provides zero product context

### 5.4 Deployment Issues

#### No Docker Configuration
- No Dockerfile, docker-compose, or container configuration
- No deployment story beyond `vite build`

#### No CI/CD
- No GitHub Actions, GitLab CI, or any CI/CD pipeline
- No pre-commit hooks

#### Package Name Mismatch
- `package.json` names the project `"product-x"`, not `"not-verify"` or `"straker-ai"`

---

## 6. Accessibility

**Positive findings:**
- Skip-to-content links present
- `aria-label` attributes on navigation elements
- `prefers-reduced-motion` respected via `useReducedMotion` hook
- Focus trap hook available (`useFocusTrap`)
- Keyboard navigation documented in the prototype spec

**Gaps:**
- WCAG contrast issues identified in the product backlog (some already fixed)
- No automated accessibility testing (no axe-core, pa11y, or Lighthouse CI)

---

## 7. localStorage Usage

Six files use `localStorage` for persisting UI state:
- `useKnowledgeRules.js` — Knowledge rule configuration
- `WorkflowStepper.jsx` — Tooltip dismissal, stepper state
- `PropagationSettings.jsx` — Propagation preferences
- `HumanReview.jsx` — Review state
- `CommandSurface.jsx` — Surface preferences
- `ColdStartDashboard.jsx` — Cold-start configuration

**Risk:** No encryption, no expiry, no size management. In a multi-tenant production app, localStorage is not suitable for user data — needs server-side persistence.

---

## 8. Summary Assessment

| Dimension | Status | Notes |
|-----------|--------|-------|
| **Product Vision** | Strong | Detailed spec, clear persona, compelling UX narrative |
| **UI/UX Quality** | High | Polished animations, accessibility hooks, design system |
| **Architecture** | Prototype-grade | God component, no routing, no state management |
| **Backend** | Non-existent | Zero server-side code |
| **Security** | Non-existent | No auth, no input validation, debug hooks exposed |
| **GDPR Compliance** | Failing | Google Fonts CDN, localStorage for user data |
| **Testing** | Non-existent | Zero test coverage |
| **Deployment** | Non-existent | No Docker, no CI/CD |
| **Scalability** | N/A | No backend to scale |

**Bottom line:** NotVerify has a strong product vision and polished UI prototype, but it is purely a demonstration tool. Building a production backend for 1000s of customers requires starting from scratch on the server side, while significantly refactoring the frontend architecture.
