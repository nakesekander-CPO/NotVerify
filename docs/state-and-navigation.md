# NotVerify — State Management & Navigation

**File:** `src/App.jsx` (1,032 lines)
**React version:** 19.2.x
**Pattern:** Single god component — all state via `useState`, navigation via `phase` string, no router, no state library.

> **Read this first.** App.jsx is the load-bearing wall of the entire application. Every phase transition, overlay toggle, data pipeline, and callback handler lives here. Understanding this file is a prerequisite for touching any component.

---

## 1. Phase System

The application has exactly **14 named phases**. The `phase` state variable is a plain string. There is no enum, no type guard, and no exhaustive switch — the render tree is a cascade of `if (phase === ...)` conditions.

### Phase Reference

| Phase | Component(s) rendered | Layout |
|---|---|---|
| `onboarding` | `OnboardingFlow` | Full-screen, no Header/Footer |
| `agent-assembly` | `AgentAssemblyTransition` | Full-screen, no Header/Footer |
| `first-campaign` | `CampaignHub` (isFirstRun=true) | Standard with Header, no WorkflowStepper |
| `dashboard` | `ColdStartDashboard` OR `CommandSurface` | Standard with Header + WorkflowStepper |
| `reading` | `MissionControl` | Standard with Header + WorkflowStepper |
| `upload` | `CommandUpload` + `AgentWarRoom` sidebar | Standard — **legacy, unreachable** |
| `processing` | `OperationsControlRoom` OR `LiveTelemetry` + `AgentWarRoom` sidebar | Standard with Header + WorkflowStepper |
| `narrative` | `CampaignResultsView` OR `QualityNarrative` + `AgentWarRoom` sidebar | Standard with Header + WorkflowStepper |
| `time-jump` | `TimeJumpTransition` | Standard with Header |
| `settings` | `Settings` | Standard with Header, no WorkflowStepper |
| `integrations` | `IntegrationsHub` | Standard with Header, no WorkflowStepper |
| `campaign-hub` | `CampaignHub` | Standard with Header, no WorkflowStepper |
| `org-brain` | `OrgBrain` | Standard with Header + WorkflowStepper |
| `human-review` | `HumanReview` | Full-width viewport, overflow-hidden |

### Phase Descriptions

#### `onboarding`
**Description:** Multi-step wizard collecting org setup: username, org name, target locales, industry vertical, tone guidelines, content types. Runs once before the user ever sees the product.

**Entry trigger:** App initial load (`useState('onboarding')` default).

**Exit transitions:**
- `handleOnboardingComplete(config)` → `agent-assembly`

---

#### `agent-assembly`
**Description:** Animated cinematic transition showing the three default agents (JP-FIN-3, MER-DT-1, BV-SENT-1) being assembled into the user's ensemble. Pure theatre — no real configuration happens here.

**Entry trigger:** `handleOnboardingComplete` completes.

**Exit transitions:**
- Animation completes (`onComplete`) → `first-campaign`
- Skip button (`onSkipToDashboard`) → `dashboard`

---

#### `first-campaign`
**Description:** `CampaignHub` rendered with `isFirstRun={true}`. Identical to `campaign-hub` but with a first-run UX treatment (likely a welcome banner or simplified flow — the `isFirstRun` prop is passed but its rendering effect is in `CampaignHub`).

**Entry trigger:** `AgentAssemblyTransition.onComplete` fires.

**Exit transitions:**
- `handleCampaignLaunch(campaign)` → `processing`
- `onBack` → `dashboard`

---

#### `dashboard`
**Description:** The primary hub. Renders one of two variants based on `projectsCompleted`:
- `projectsCompleted === 0 && !onboardingConfig?.skipColdStart` → `ColdStartDashboard` (Day-0 experience with guided prompts and integration setup)
- Otherwise → `CommandSurface` (full intelligent dashboard with prediction co-pilot, recent projects, feed)

**Entry trigger:** Navigation from almost everywhere: agent-assembly skip, campaign-hub back, time-jump complete, reset after project N>1, header home button, settings/integrations/org-brain back.

**Exit transitions:**
- File dropped → `reading` (via `handleFileAccepted`)
- "Start Q3 Earnings" predicted project → `reading` (via `handleStartPredicted`)
- "Start Campaign" → `campaign-hub`
- Header settings → `settings` (saves `previousPhase`)
- ColdStartDashboard "Start First Project" → `time-jump`
- OrgBrain link → `org-brain` (saves `previousPhase`)
- "Open Integrations" → `integrations` (saves `previousPhase`)
- Team directory delegation → `human-review` (via `handleOpenTeamDirectory`)

---

#### `reading`
**Description:** `MissionControl` — the unified document analysis + agent configuration screen. Displays `triageData` (file classification, SourceIQ scores, quality projection, sandbox preview, discovery findings stream) and lets the user configure the agent ensemble before committing to processing.

**Entry trigger:**
- `handleFileAccepted` (file drop anywhere)
- `handleStartPredicted` (predicted project quick-start with simulated file)

**Exit transitions:**
- "Deploy" / `handleReadingComplete(deployConfig)` → `processing`
- File replaced (new file dropped in MissionControl) → re-enters `reading` with new triage data

---

#### `upload`
**Description:** `CommandUpload` + `AgentWarRoom` sidebar. An earlier upload/review screen that pre-dates `MissionControl`. **This phase is never entered in the current code** — `handleFileAccepted` sets phase to `reading`, not `upload`. The component and render code still exist but the navigation path to it has been removed.

**Entry trigger:** None in current code. Dead phase.

**Exit transitions (if reached):**
- `handleLaunch()` → `processing`
- New file dropped → back into `reading` via `handleFileAccepted`

---

#### `processing`
**Description:** Execution visualization. Renders two different components depending on context:
- `activeCampaign` is set → `OperationsControlRoom` (multi-document campaign progress grid)
- `activeCampaign` is null → `LiveTelemetry` (single-document streaming telemetry with agent reasoning logs)

Both are accompanied by the `AgentWarRoom` sidebar (sticky, right column, hidden on mobile).

**Entry trigger:**
- `handleReadingComplete` (single-doc flow from MissionControl)
- `handleLaunch` (legacy upload flow)
- `handleCampaignLaunch` (from CampaignHub or first-campaign)

**Exit transitions:**
- `handleProcessingComplete(completedJobs)` → `narrative`

---

#### `narrative`
**Description:** Results display. Renders one of three variants:
1. `activeCampaign && !triageData` → `CampaignResultsView` (full-width, no sidebar — campaign doc grid with per-locale scores)
2. `triageData` → `QualityNarrative` + `AgentWarRoom` sidebar (single-doc explainable quality breakdown)
3. `!triageData && !activeCampaign` → inline fallback "No project data loaded" message

**Entry trigger:** `handleProcessingComplete` from processing phase.

**Exit transitions:**
- `handleReset()` → `time-jump` (if `projectsCompleted === 0`) OR `dashboard` (if `projectsCompleted > 0`)
- "Compliance required" → `human-review` (via `handleComplianceRequired`)
- Campaign review job → `human-review` (via `handleCampaignReviewJob`)
- OrgBrain → `org-brain` (saves `previousPhase`)

---

#### `time-jump`
**Description:** `TimeJumpTransition` — an animated time-skip sequence that shows the passage of time after the first completed project. Bridges the "Day 0" cold-start experience to the fully populated "Day N" dashboard. Also entered from `ColdStartDashboard.onStartFirstProject` to simulate jumping forward in time.

**Entry trigger:**
- `handleReset()` when `projectsCompleted === 0` (first project completion)
- `ColdStartDashboard.onStartFirstProject` callback

**Exit transitions:**
- Animation complete (`onComplete`) → `dashboard` (sets `projectsCompleted` to 1)

---

#### `settings`
**Description:** Settings page — credits/billing, budget thresholds, workflow rules. Accessed via header gear icon.

**Entry trigger:** Header `onOpenSettings` callback (saves `previousPhase` first).

**Exit transitions:**
- `onBack` → `previousPhase` (default `dashboard`)
- `onOpenIntegrations` → `integrations` (saves `previousPhase = 'settings'`)

---

#### `integrations`
**Description:** `IntegrationsHub` — connect/disconnect third-party integrations (TMS, CAT tools, etc.). Reachable from settings, dashboard, cold-start, and human-review.

**Entry trigger:** Multiple callers, all set `previousPhase` first:
- `Settings.onOpenIntegrations`
- `CommandSurface.onOpenIntegrations`
- `ColdStartDashboard.onOpenIntegrations`
- `HumanReview.onOpenIntegrations`
- `IntelligenceAssistant.onOpenIntegrations`

**Exit transitions:**
- `onBack` → `previousPhase` (default `dashboard`)

---

#### `campaign-hub`
**Description:** `CampaignHub` — bulk document ingestion wizard. Upload multiple documents, configure locales and quality parameters, then launch a campaign.

**Entry trigger:**
- `CommandSurface.onStartCampaign`
- `ColdStartDashboard.onStartCampaign`
- Header `onStartCampaign` (where present)

**Exit transitions:**
- `handleCampaignLaunch(campaign)` → `processing`
- `onBack` → `dashboard`

---

#### `org-brain`
**Description:** `OrgBrain` — organizational knowledge base viewer. Shows translation memory, glossaries, style guides, learned patterns.

**Entry trigger:**
- `CommandSurface.onOpenOrgBrain` (saves `previousPhase = 'dashboard'`)
- `QualityNarrative.onOpenOrgBrain` (saves `previousPhase = 'narrative'`)

**Exit transitions:**
- `onClose` / `onNavigateBack` → `previousPhase` (default `dashboard`)

---

#### `human-review`
**Description:** `HumanReview` — in-the-loop review interface. Has an internal two-step sub-flow controlled by `humanReviewMode`:
- `'assign'` — select a reviewer from the team directory, add a note, submit
- `'review'` — reviewer sees flagged segments with suggested fixes, approves/rejects each

Three different entry paths populate this phase with different data.

**Entry trigger (3 paths):**
1. `handleComplianceRequired()` — trust score fell below threshold in `QualityNarrative`
2. `handleCampaignReviewJob(job)` — per-document review from `CampaignResultsView`
3. `handleOpenTeamDirectory(itemId, itemTitle)` — manual delegation from intelligence feed

All three save `previousPhase` before transitioning.

**Exit transitions:**
- `handleReviewBack()` → `previousPhase`
- `handleReviewSubmitted(results)` → `previousPhase` (default `narrative`)
- `onOpenIntegrations` → `integrations` (saves `previousPhase = 'human-review'`)

---

### ASCII State Diagram

```
                         ┌─────────────────────────────────────────────────┐
                         │                  ONBOARDING                      │
                         │           (full-screen, no header)               │
                         └───────────────────┬─────────────────────────────┘
                                             │ handleOnboardingComplete
                                             ▼
                         ┌─────────────────────────────────────────────────┐
                         │               AGENT-ASSEMBLY                     │
                         │        (cinematic transition, once only)         │
                         └──────┬────────────────────────────┬─────────────┘
                   onComplete   │                            │ onSkipToDashboard
                                ▼                            │
                  ┌─────────────────────────┐               │
                  │      FIRST-CAMPAIGN      │               │
                  │   (CampaignHub first-run)│               │
                  └──────┬──────────────┬───┘               │
         handleCampaign  │              │ onBack             │
              Launch     │              │                    │
                         │              ▼                    ▼
 ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─│─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─
   PRIMARY FLOW           │                                                 │
 │                        │      ┌──────────────────────────────────────┐
                          │      │              DASHBOARD               │  │
 │                        │      │   ColdStartDashboard (Day 0)         │
                          │      │   CommandSurface (Day N)             │  │
 │                        │      └──┬─────┬────────┬──────────┬─────────┘
                          │         │     │        │          │            │
 │          file accepted / predicted │   │        │          │
                          │    ┌────┘     │        │          │            │
 │                        │    ▼          │        │          │
                          │  READING      │ start  │ settings │            │
 │                        │  MissionCtrl  │ campaign│         │
                          │    │          │        │          │            │
 │           handleReading│    │          ▼        ▼          ▼
              Complete    │    │    CAMPAIGN-HUB  SETTINGS  ORG-BRAIN     │
 │                        │    │    (bulk ingest)  │   ↕       │
                          │    │         │        INTEGRATIONS │            │
 │                        │    │         │         │           │
             handleCampaign│   │         │         │           │            │
              Launch       │   │         │         │           │
 │                        └───┼─────────┘◄────────┘◄──────────┘
                              │    │
 │                            │    │ handleProcessingComplete
                              ▼    ▼                                        │
 │               ┌───────────────────────────┐
                 │         PROCESSING        │                              │
 │               │  OperationsControlRoom    │
                 │  (campaign) OR            │                              │
 │               │  LiveTelemetry (single)   │
                 │  + AgentWarRoom sidebar   │                              │
 │               └─────────────┬─────────────┘
                               │ handleProcessingComplete                   │
 │                             ▼
                 ┌───────────────────────────┐                             │
 │               │         NARRATIVE         │
                 │  CampaignResultsView      │                             │
 │               │  (campaign) OR            │◄─────────────────────────────┤
                 │  QualityNarrative (single)│   handleReviewSubmitted /   │
 │               │  + AgentWarRoom sidebar   │   handleReviewBack
                 └──────┬──────────┬─────────┘                             │
 │                      │          │                    ┌──────────────────┐
           handleReset  │          │ compliance /       │   HUMAN-REVIEW   │ │
 │        (first proj.) │          │ campaign review /  │   assign → review│
                        │          │ team directory     │   (full-width)   │ │
 │                      │          └───────────────────►│                  │
                        ▼                               └──────────────────┘ │
 │            ┌──────────────────┐
              │    TIME-JUMP     │                                            │
 │            │  (animation,     │
              │   once only)     │                                            │
 │            └────────┬─────────┘
                       │ onComplete → setProjectsCompleted(1)                │
 │                     └───────────────────────────────────►  DASHBOARD
 └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘


  DEAD PHASE (unreachable in current navigation):
  UPLOAD → PROCESSING  (CommandUpload — never navigated to since MissionControl replaced it)
```

**Flow legend:**
- **Primary (single doc):** `onboarding → agent-assembly → first-campaign → processing → narrative → time-jump → dashboard → reading → processing → narrative`
- **Primary (repeat):** `dashboard → reading → processing → narrative → dashboard`
- **Campaign:** `dashboard → campaign-hub → processing → narrative`
- **Side panels:** `dashboard ↔ settings ↔ integrations`, `dashboard ↔ org-brain`, `narrative ↔ org-brain`
- **Review:** `narrative → human-review → narrative`, `narrative → human-review → narrative` (campaign path)

---

## 2. State Variables

All state lives in `App()`. There are **27 `useState` variables** plus 4 computed values via `useMemo` and 2 from custom hooks.

### useState Variables

| # | Variable | Type | Initial Value | Purpose | Consumers |
|---|---|---|---|---|---|
| 1 | `phase` | `string` | `'onboarding'` | Current navigation phase — the entire routing system | Everywhere (conditional render tree, WorkflowStepper, Header, IntelligenceAssistant) |
| 2 | `onboardingConfig` | `object \| null` | `null` | Org setup from onboarding: `{ userName, orgName, targetLocales, industryVertical, tone, styleGuideUrl, dntTerms, glossaryFile, contentTypes, skipColdStart }` | Header (`companyName`), ColdStartDashboard, CommandSurface, AgentAssemblyTransition, IntelligenceAssistant, CustomAgentStudio, HumanReview (assignedBy), `handleCampaignReviewJob` |
| 3 | `file` | `File \| null` | `null` | Raw File object from drag-and-drop or picker | Referenced in `handleFileAccepted`; cleared on reset |
| 4 | `structuredContext` | `object` | `{ targetLocales: [], industryVertical: '', toneGuidelines: { enabled: false, glossaryFile: null, styleGuideUrl: '', dntTerms: '', tone: '' } }` | Processing configuration (locales, vertical, tone) — drives all triage data generation | MissionControl, CommandUpload, CommandSurface (`defaultLocales`), CampaignHub, IntelligenceMarketplace (`documentProfile`), all `get*` data generators |
| 5 | `projectMeta` | `object` | `{ name: '', poNumber: '', visibility: 'private' }` | Project-level metadata | Cleared on reset. **Not passed to any component** — captured but unused in rendering. |
| 6 | `triageData` | `object \| null` | `null` | Generated document analysis: `{ fileName, fileSize, fileType, classification, intent, agent, plan, sourceIQ, qualityScore, upsellOptions, sandboxPreview }` | MissionControl, CommandUpload, QualityNarrative (as `data`), `qualityNarrative` useMemo, `computedQuality`, safety-net useEffect |
| 7 | `enabledUpsells` | `Set<string>` | `new Set()` | IDs of activated upsell options (glossary, model-pack, human-review) | `computedQuality` hook, `qualityNarrative` useMemo; cleared on reset |
| 8 | `discoveryFindings` | `array` | `[]` | Streaming discovery finding objects from `generateDiscoveryStream` | MissionControl, CommandUpload |
| 9 | `showParametersDrawer` | `boolean` | `false` | Controls `ParametersDrawer` overlay visibility | ParametersDrawer (`isOpen`). **Setter never called in current render** — no trigger in the JSX. |
| 10 | `preloadedConfig` | `object \| null` | `null` | Pre-populated prediction config from "Start Q3 Earnings" quick-start | MissionControl (`preloaded`), CommandUpload (`preloaded`); cleared on reset |
| 11 | `showMarketplace` | `boolean` | `false` | Controls `IntelligenceMarketplace` full-page overlay | IntelligenceMarketplace (`isOpen`) |
| 12 | `showAgentStudio` | `boolean` | `false` | Controls `CustomAgentStudio` modal | CustomAgentStudio (`isOpen`) |
| 13 | `showArbitration` | `boolean` | `false` | Controls `AgentArbitration` fixed overlay | Inline `{showArbitration && ...}` render in JSX |
| 14 | `showAgentProfile` | `boolean` | `false` | Controls `AgentProfile` modal | AgentProfile (`isOpen`) |
| 15 | `selectedAgent` | `object \| null` | `null` | Agent object currently displayed in AgentProfile | AgentProfile (`agent`) |
| 16 | `showTeamDirectory` | `boolean` | `false` | Controls `TeamDirectory` legacy modal | TeamDirectory (`isOpen`). **Legacy** — `handleOpenTeamDirectory` now goes to `human-review` phase instead of opening this modal. |
| 17 | `teamDirectoryContext` | `object` | `{ itemId: null, itemTitle: '' }` | Context passed to TeamDirectory modal (which item triggered delegation) | TeamDirectory (`itemTitle`), `handleDelegationComplete` |
| 18 | `activeAgents` | `array` | `[]` | Active agent objects in current processing run: `{ id, name, version, icon, confidence, status, segmentsProcessed, errorsFound, reasoningLog }` | AgentWarRoom, LiveTelemetry, QualityNarrative, IntelligenceMarketplace |
| 19 | `hiredMarketplaceAgents` | `array` | `[]` | Agents hired from IntelligenceMarketplace (persists across the session) | IntelligenceMarketplace (`hiredAgents`) |
| 20 | `projectsCompleted` | `number` | `0` | Count of completed projects. `0` = Day-0 experience. `> 0` = returning user. | Determines ColdStartDashboard vs CommandSurface; determines time-jump vs dashboard on reset |
| 21 | `activeCampaign` | `object \| null` | `null` | Current campaign object from CampaignHub: `{ name, documents, config, status }` | OperationsControlRoom, CampaignResultsView, QualityNarrative, `handleProcessingComplete`, `handleCampaignReviewJob`, safety-net useEffect, ParametersDrawer threshold |
| 22 | `qualityThreshold` | `number` | `85` | Org-level quality threshold (percentage). Used as fallback when no campaign is active. | ParametersDrawer (`qualityThreshold`) |
| 23 | `humanReviewMode` | `null \| 'assign' \| 'review'` | `null` | Sub-mode within the `human-review` phase. `null` = not in review. `'assign'` = assigning a reviewer. `'review'` = reviewing flagged segments. | HumanReview (as `mode`) |
| 24 | `previousPhase` | `string \| null` | `null` | Phase to return to after leaving a side-phase or overlay-as-phase. Set by any handler that navigates away from the main flow. | `handleReviewBack`, `handleReviewSubmitted`, Settings `onBack`, IntegrationsHub `onBack`, OrgBrain `onClose` |
| 25 | `campaignReviewJob` | `object \| null` | `null` | Raw campaign job that triggered review: `{ docId, fileName, locale, score, detectedType }` | Used inside `handleCampaignReviewJob` to build `campaignReviewRequest`; cleared on submit/back |
| 26 | `campaignReviewRequest` | `object \| null` | `null` | Fully constructed `reviewRequest` object for `HumanReview` component. Built from `campaignReviewJob` with mock segments injected. Spread into HumanReview as `{...campaignReviewRequest ? { reviewRequest: campaignReviewRequest } : {}}` | HumanReview (conditional spread) |
| 27 | `connectedIntegrations` | `array` | `[]` | List of connected integration objects: `{ id, name, ... }`. Persists for session lifetime. | CommandSurface, ColdStartDashboard, IntelligenceMarketplace, IntelligenceAssistant, HumanReview, IntegrationsHub |

### Computed Values (useMemo / Custom Hooks)

| Variable | Source | Dependencies | Purpose |
|---|---|---|---|
| `isMobile` | `useMediaQuery` hook | media query string | Renders `MobileBlocker` instead of app if true |
| `orgIntelligence` | `generateOrgIntelligence()` | `[]` (once) | Simulated org health data — quality trends, volume, locale stats. Passed to CommandSurface and QualityNarrative. |
| `defaultAgents` | `useMemo` | `[]` (once) | The three hardcoded default agents (JP-FIN-3, MER-DT-1, BV-SENT-1). Passed to AgentAssemblyTransition and used as fallback in `handleReadingComplete`. |
| `computedQuality` | `useQualityCalculator` hook | `triageData?.qualityScore`, `triageData?.upsellOptions`, `enabledUpsells` | Calculates adjusted quality score based on which upsells are enabled |
| `qualityNarrative` | `generateQualityNarrative()` | `triageData`, `enabledUpsells`, `orgIntelligence` | Full narrative data structure for QualityNarrative component. Null if no triageData. |

---

## 3. Callback Handlers

All handlers are defined with `useCallback`. Dependency arrays are documented where they affect stale closure risk.

### Integration Handlers

#### `handleConnectIntegration(integration)`
- **Trigger:** IntegrationsHub connect button, IntelligenceMarketplace connect flow
- **Does:** Adds `integration` to `connectedIntegrations` if not already present (deduped by `id`)
- **State changes:** `connectedIntegrations ← [...prev, integration]`
- **Phase transition:** None
- **Deps:** `[]`

#### `handleDisconnectIntegration(integrationId)`
- **Trigger:** IntegrationsHub disconnect button
- **Does:** Removes integration with matching `id` from `connectedIntegrations`
- **State changes:** `connectedIntegrations ← prev.filter(i => i.id !== integrationId)`
- **Phase transition:** None
- **Deps:** `[]`

---

### Campaign Handlers

#### `handleCampaignLaunch(campaign)`
- **Trigger:** `CampaignHub.onLaunch` (from both `campaign-hub` and `first-campaign` phases)
- **Does:** Stores the campaign object and jumps to processing
- **State changes:** `activeCampaign ← campaign`
- **Phase transition:** → `processing`
- **Deps:** `[]`

---

### Document Processing Handlers

#### `handleFileAccepted(acceptedFile)`
- **Trigger:** File drop/pick in CommandSurface, ColdStartDashboard, MissionControl, or via `onFileWithLocales` wrapper
- **Does:** Generates all triage data client-side, generates discovery stream, clears any active campaign (single-doc flow takes precedence)
- **State changes:**
  - `file ← acceptedFile`
  - `activeCampaign ← null`
  - `triageData ← { fileName, fileSize, fileType, classification, intent, agent, plan, sourceIQ, qualityScore, upsellOptions, sandboxPreview }` (all from inline generators)
  - `discoveryFindings ← generateDiscoveryStream(acceptedFile, structuredContext)`
- **Phase transition:** → `reading`
- **Deps:** `[structuredContext]` ⚠️ stale closure risk if structuredContext changes after handler is memoized

#### `handleStartPredicted(prediction)`
- **Trigger:** `CommandSurface.onStartPredicted` (predicted project card click)
- **Does:** Pre-populates context from prediction, creates a simulated File object, generates triage data as if the file were real
- **State changes:**
  - `structuredContext ← { targetLocales, industryVertical, toneGuidelines: reset }`
  - `preloadedConfig ← prediction`
  - `triageData ← { ... }` (from simulated file using prediction.fileName)
  - `discoveryFindings ← generateDiscoveryStream(simulatedFile, newContext)`
- **Phase transition:** → `reading`
- **Deps:** `[]` ⚠️ Does NOT depend on `[structuredContext]` — captures a new context inline instead

#### `handleRerun(project)`
- **Trigger:** `CommandSurface.onRerun` (recent project re-run button)
- **Does:** Updates structuredContext with previous project's locales and industry — but does **not** navigate or generate triage data. Re-run is incomplete: no phase transition occurs.
- **State changes:** `structuredContext ← { ...prev, targetLocales: project.locales, industryVertical: project.industry }`
- **Phase transition:** None ⚠️ User has to separately drop a file to continue
- **Deps:** `[]`

#### `handleReadingComplete(deployConfig)`
- **Trigger:** `MissionControl.onDeploy` ("Deploy" button after agent configuration)
- **Does:** Sets the active agent ensemble — either from the config the user assembled in MissionControl, or falls back to `defaultAgents`
- **State changes:** `activeAgents ← mapped agents from deployConfig.agents OR defaultAgents`
- **Phase transition:** → `processing`
- **Deps:** `[defaultAgents]`

#### `handleLaunch()`
- **Trigger:** `CommandUpload.onLaunch` (legacy upload screen deploy button)
- **Does:** Transitions to processing with no additional state changes
- **State changes:** None
- **Phase transition:** → `processing`
- **Deps:** `[]`
- **Note:** Dead path — `upload` phase is unreachable in current navigation

#### `handleProcessingComplete(completedJobs)`
- **Trigger:** `OperationsControlRoom.onComplete` or `LiveTelemetry.onComplete`
- **Does:** For campaign flow, merges job results (qualityScore, status, localeResults) back into `activeCampaign.documents`. For single-doc flow, `completedJobs` is empty/ignored and the state update is a no-op.
- **State changes:** `activeCampaign ← updated with localeResults on each document` (if completedJobs present)
- **Phase transition:** → `narrative`
- **Deps:** `[]`

---

### Agent Management Handlers

#### `handleOpenMarketplace()`
- **Trigger:** AgentWarRoom "Hire Agent" button, CommandSurface marketplace link
- **Does:** Opens the IntelligenceMarketplace overlay
- **State changes:** `showMarketplace ← true`
- **Phase transition:** None
- **Deps:** `[]`

#### `handleHireAgent(agent)`
- **Trigger:** `IntelligenceMarketplace.onDeployAgent` (hire button on agent card)
- **Does:** Adds agent to both the persistent hired list and the active processing ensemble
- **State changes:**
  - `hiredMarketplaceAgents ← [...prev, agent]`
  - `activeAgents ← [...prev, { id, name, version: 'v1.0', icon: 'Star', confidence, ... }]`
  - `showMarketplace ← false`
- **Phase transition:** None
- **Deps:** `[]`

#### `handleAgentCreated(agent)`
- **Trigger:** `CustomAgentStudio.onAgentCreated`
- **Does:** Adds the custom-trained agent to activeAgents, closes studio
- **State changes:**
  - `activeAgents ← [...prev, { id: 'CUSTOM-1', name: agent.name, ... }]`
  - `showAgentStudio ← false`
- **Phase transition:** None
- **Deps:** `[]`

#### `handleRemoveAgent(agentId)`
- **Trigger:** `IntelligenceMarketplace.onRemoveAgent` (remove hired agent)
- **Does:** Removes agent from both lists simultaneously
- **State changes:**
  - `hiredMarketplaceAgents ← prev.filter(a => a.id !== agentId)`
  - `activeAgents ← prev.filter(a => a.id !== agentId)`
- **Phase transition:** None
- **Deps:** `[]`

#### `handleOpenAgentProfile(agent)`
- **Trigger:** `AgentWarRoom.onViewAgentProfile`
- **Does:** Sets the selected agent and opens the profile modal
- **State changes:** `selectedAgent ← agent`, `showAgentProfile ← true`
- **Phase transition:** None
- **Deps:** `[]`

#### `handleArbitrationResolved(resolutions)`
- **Trigger:** `AgentArbitration.onResolveAll`
- **Does:** Logs resolutions, closes arbitration overlay
- **State changes:** `showArbitration ← false`
- **Phase transition:** None
- **Deps:** `[]`

---

### Human Review Handlers

#### `handleComplianceRequired()`
- **Trigger:** `QualityNarrative.onComplianceRequired` (trust score below threshold badge)
- **Does:** Saves current phase, enters human review in assignment mode
- **State changes:** `previousPhase ← phase`, `humanReviewMode ← 'assign'`
- **Phase transition:** → `human-review`
- **Deps:** `[phase]` — captures current phase at call time

#### `handleCampaignReviewJob(job)`
- **Trigger:** `CampaignResultsView.onReviewJob` (per-document review button in campaign results)
- **Does:** Builds a full `reviewRequest` object with 7 mock segments (2 flagged as major+critical, 1 as minor), stores both the raw job and the constructed request
- **State changes:**
  - `campaignReviewJob ← job`
  - `campaignReviewRequest ← { id, projectName, fileName, trustScore, threshold, locale, allSegments, flaggedSegments, ... }`
  - `previousPhase ← phase`
  - `humanReviewMode ← 'assign'`
- **Phase transition:** → `human-review`
- **Deps:** `[phase, activeCampaign, onboardingConfig]`

#### `handleOpenTeamDirectory(itemId, itemTitle)`
- **Trigger:** `CommandSurface.onOpenTeamDirectory` (delegate button in intelligence feed)
- **Does:** Sets team directory context, saves phase, enters human review in assignment mode. Note: despite the name, this **does not open the TeamDirectory modal** — it transitions to the `human-review` phase.
- **State changes:** `teamDirectoryContext ← { itemId, itemTitle }`, `previousPhase ← phase`, `humanReviewMode ← 'assign'`
- **Phase transition:** → `human-review`
- **Deps:** `[phase]`

#### `handleReviewAssigned(reviewerId, note)`
- **Trigger:** `HumanReview.onAssign` (assignment form submit)
- **Does:** Advances the internal sub-mode from assignment view to reviewer view. Only logs — no meaningful state is stored about who was assigned.
- **State changes:** `humanReviewMode ← 'review'`
- **Phase transition:** None (stays in `human-review` phase)
- **Deps:** `[]`

#### `handleReviewSubmitted(results)`
- **Trigger:** `HumanReview.onSubmitReview` (reviewer submits approved/rejected segments)
- **Does:** Clears all review state and returns to origin phase
- **State changes:** `humanReviewMode ← null`, `campaignReviewJob ← null`, `campaignReviewRequest ← null`
- **Phase transition:** → `previousPhase` (default `narrative`)
- **Deps:** `[previousPhase]`

#### `handleReviewBack()`
- **Trigger:** `HumanReview.onBack` (back/cancel button)
- **Does:** Clears review mode and returns to origin phase
- **State changes:** `humanReviewMode ← null`
- **Phase transition:** → `previousPhase` (default `narrative`)
- **Note:** The inline onBack prop also clears `campaignReviewJob` and `campaignReviewRequest` separately at the call site
- **Deps:** `[previousPhase]`

---

### Team Directory Handler (Legacy)

#### `handleDelegationComplete(member, note)`
- **Trigger:** `TeamDirectory.onDelegate`
- **Does:** Logs delegation, closes the TeamDirectory modal
- **State changes:** `showTeamDirectory ← false`
- **Phase transition:** None
- **Deps:** `[teamDirectoryContext]`
- **Note:** The TeamDirectory modal (`showTeamDirectory`) is never opened in the current code. `handleOpenTeamDirectory` goes to `human-review` phase instead.

---

### Onboarding Handler

#### `handleOnboardingComplete(config)`
- **Trigger:** `OnboardingFlow.onComplete`
- **Does:** Stores onboarding config, pre-populates structuredContext from it (locales, vertical, tone, styleGuideUrl, dntTerms, glossaryFile)
- **State changes:**
  - `onboardingConfig ← config`
  - `structuredContext ← { ...prev, targetLocales, industryVertical, toneGuidelines: { ...prev, tone, styleGuideUrl, dntTerms, glossaryFile } }` (only if `config.targetLocales?.length > 0`)
- **Phase transition:** → `agent-assembly`
- **Deps:** `[]`

---

### Reset Handler

#### `handleReset()`
- **Trigger:** `QualityNarrative.onReset` / `CampaignResultsView.onReset` ("Start New Project" button)
- **Does:** Clears all project-scoped state and determines next phase based on whether this is the first completed project
- **State changes:**
  - `file ← null`
  - `activeCampaign ← null`
  - `structuredContext ← { reset to defaults }`
  - `projectMeta ← { reset to defaults }`
  - `triageData ← null`
  - `enabledUpsells ← new Set()`
  - `discoveryFindings ← []`
  - `preloadedConfig ← null`
  - `activeAgents ← []`
  - `hiredMarketplaceAgents ← []`
  - `projectsCompleted ← prev + 1`
- **Phase transition:** → `time-jump` if `projectsCompleted === 0`, else → `dashboard`
- **Deps:** `[projectsCompleted]`

---

## 4. Overlay and Modal State

Six boolean state variables control persistent UI layers rendered at the bottom of the JSX tree, independent of the current phase.

| State Variable | Component | Type | Opened by | Closed by |
|---|---|---|---|---|
| `showMarketplace` | `IntelligenceMarketplace` | Full-page overlay (renders over everything) | `handleOpenMarketplace`, AgentWarRoom hire button, CommandSurface, Header | `handleHireAgent`, IntelligenceMarketplace close button |
| `showAgentStudio` | `CustomAgentStudio` | Modal dialog | AgentWarRoom "Train Agent", CommandSurface, `handleAgentCreated` does not open it | `handleAgentCreated`, CustomAgentStudio close button |
| `showArbitration` | `AgentArbitration` | Fixed inset overlay with backdrop | AgentWarRoom "Resolve Conflicts" button | `handleArbitrationResolved`, inline close button `✕` |
| `showAgentProfile` | `AgentProfile` | Modal dialog | `handleOpenAgentProfile` (from AgentWarRoom) | AgentProfile close button (clears `selectedAgent` too), "Continue Training" (opens AgentStudio) |
| `showTeamDirectory` | `TeamDirectory` | Modal dialog | **Never opened** (dead state — see §3) | `handleDelegationComplete` |
| `showParametersDrawer` | `ParametersDrawer` | Slide-in drawer | **Never opened** (no `setShowParametersDrawer(true)` call in JSX) | ParametersDrawer close button |

### Architectural note on overlays vs phases
`org-brain`, `settings`, `integrations`, and `human-review` are **full phases** (they replace the main content area). `showMarketplace`, `showAgentStudio`, `showArbitration`, and `showAgentProfile` are **overlay layers** rendered on top of whatever phase is active. This means the marketplace or agent studio can be open while any phase is displayed — there is no guard preventing `showMarketplace=true` while in `onboarding`.

---

## 5. Props Drilling

State flows from App.jsx through up to 4 levels. There is no Context API — every prop is explicitly threaded.

```
App.jsx (all state)
│
├── Header
│   ├── companyName ← onboardingConfig?.orgName
│   ├── onOpenSettings → setPreviousPhase + setPhase('settings')
│   ├── onOpenMarketplace → setShowMarketplace(true)
│   └── onNavigateHome → setPhase('dashboard')
│
├── WorkflowStepper
│   └── currentState ← phase
│
├── [phase === 'onboarding'] OnboardingFlow
│   └── onComplete → handleOnboardingComplete
│
├── [phase === 'agent-assembly'] AgentAssemblyTransition
│   ├── agents ← defaultAgents
│   ├── userName ← onboardingConfig?.userName
│   ├── onComplete → setPhase('first-campaign')
│   └── onSkipToDashboard → setPhase('dashboard')
│
├── [phase === 'settings'] Settings
│   ├── onBack → setPhase(previousPhase)
│   └── onOpenIntegrations → setPreviousPhase('settings') + setPhase('integrations')
│
├── [phase === 'integrations'] IntegrationsHub
│   ├── onBack → setPhase(previousPhase)
│   ├── connectedIntegrations ← connectedIntegrations
│   ├── onConnectIntegration → handleConnectIntegration
│   └── onDisconnectIntegration → handleDisconnectIntegration
│
├── [phase === 'campaign-hub' | 'first-campaign'] CampaignHub
│   ├── structuredContext ← structuredContext
│   ├── onLaunch → handleCampaignLaunch
│   ├── onBack → setPhase('dashboard')
│   └── isFirstRun ← (phase === 'first-campaign')
│
├── [phase === 'dashboard', Day 0] ColdStartDashboard
│   ├── userName ← onboardingConfig?.userName
│   ├── companyName ← onboardingConfig?.orgName
│   ├── configuredLocales ← structuredContext.targetLocales
│   ├── configuredVertical ← structuredContext.industryVertical
│   ├── onStartFirstProject → setPhase('time-jump')
│   ├── onStartCampaign → setPhase('campaign-hub')
│   ├── onFileAccepted → handleFileAccepted
│   ├── connectedIntegrations ← connectedIntegrations
│   └── onOpenIntegrations → setPreviousPhase + setPhase('integrations')
│
├── [phase === 'dashboard', Day N] CommandSurface
│   ├── onFileAccepted → handleFileAccepted
│   ├── onFileWithLocales → setStructuredContext + handleFileAccepted
│   ├── defaultLocales ← structuredContext.targetLocales
│   ├── orgIntelligence ← orgIntelligence
│   ├── onRerun → handleRerun
│   ├── onStartPredicted → handleStartPredicted
│   ├── onOpenTeamDirectory → handleOpenTeamDirectory
│   ├── onOpenOrgBrain → setPreviousPhase + setPhase('org-brain')
│   ├── onOpenMarketplace → setShowMarketplace(true)
│   ├── onOpenAgentStudio → setShowAgentStudio(true)
│   ├── userName ← onboardingConfig?.userName
│   ├── companyName ← onboardingConfig?.orgName
│   ├── connectedIntegrations ← connectedIntegrations
│   ├── onOpenIntegrations → setPreviousPhase + setPhase('integrations')
│   └── onStartCampaign → setPhase('campaign-hub')
│
├── [phase === 'time-jump'] TimeJumpTransition
│   └── onComplete → setProjectsCompleted(1) + setPhase('dashboard')
│
├── [phase === 'reading'] MissionControl
│   ├── triageData ← triageData
│   ├── discoveryFindings ← discoveryFindings
│   ├── structuredContext ← structuredContext
│   ├── documentProfile ← { vertical, contentTypes, locales }
│   ├── onDeploy → handleReadingComplete
│   ├── onFileAccepted → handleFileAccepted
│   └── preloaded ← preloadedConfig
│
├── [phase === 'human-review'] HumanReview
│   ├── mode ← humanReviewMode
│   ├── onAssign → handleReviewAssigned
│   ├── onSubmitReview → handleReviewSubmitted
│   ├── onBack → handleReviewBack + clear campaign review state
│   ├── connectedIntegrations ← connectedIntegrations
│   ├── onOpenIntegrations → setPreviousPhase + setPhase('integrations')
│   └── reviewRequest ← campaignReviewRequest (spread, conditional)
│
├── [phase === 'org-brain'] OrgBrain
│   ├── onClose → setPhase(previousPhase)
│   └── onNavigateBack → setPhase(previousPhase)
│
├── [phase === 'narrative', campaign] CampaignResultsView
│   ├── campaign ← activeCampaign
│   ├── threshold ← activeCampaign.config?.qualityThreshold ?? 85
│   ├── onReset → handleReset
│   └── onReviewJob → handleCampaignReviewJob
│
├── [needsWarRoom] AgentWarRoom (sidebar)
│   ├── agents ← activeAgents
│   ├── onHireAgent → handleOpenMarketplace
│   ├── onTrainAgent → setShowAgentStudio(true)
│   ├── onResolveConflicts → setShowArbitration(true)
│   ├── onViewAgentProfile → handleOpenAgentProfile
│   └── isProcessing ← (phase === 'processing')
│
├── [phase === 'processing', campaign] OperationsControlRoom
│   ├── campaign ← activeCampaign
│   └── onComplete → handleProcessingComplete
│
├── [phase === 'processing', single] LiveTelemetry
│   ├── fileName ← triageData?.fileName
│   ├── totalSegments ← 247 (hardcoded)
│   ├── locales ← structuredContext.targetLocales
│   ├── agents ← activeAgents
│   ├── onComplete → handleProcessingComplete
│   └── duration ← 15000 (hardcoded)
│
├── [phase === 'narrative', single] QualityNarrative
│   ├── data ← triageData
│   ├── computedQuality ← computedQuality
│   ├── enabledUpsells ← enabledUpsells
│   ├── qualityNarrative ← qualityNarrative
│   ├── orgIntelligence ← orgIntelligence
│   ├── onReset → handleReset
│   ├── activeAgents ← activeAgents
│   ├── onComplianceRequired → handleComplianceRequired
│   ├── onOpenOrgBrain → setPreviousPhase + setPhase('org-brain')
│   └── activeCampaign ← activeCampaign
│
├── [phase === 'upload'] CommandUpload (dead path)
│   ├── onFileAccepted → handleFileAccepted
│   ├── onLaunch → handleLaunch
│   ├── triageData ← triageData
│   ├── discoveryFindings ← discoveryFindings
│   ├── structuredContext ← structuredContext
│   └── preloaded ← preloadedConfig
│
├── IntelligenceAssistant (persistent, all post-onboarding phases)
│   ├── userName ← onboardingConfig?.userName
│   ├── companyName ← onboardingConfig?.orgName
│   ├── currentPhase ← phase
│   ├── connectedIntegrations ← connectedIntegrations
│   └── onOpenIntegrations → setPreviousPhase(phase) + setPhase('integrations')
│
├── IntelligenceMarketplace (overlay, always mounted)
│   ├── isOpen ← showMarketplace
│   ├── onClose → setShowMarketplace(false)
│   ├── onDeployAgent → handleHireAgent
│   ├── hiredAgents ← hiredMarketplaceAgents
│   ├── onRemoveAgent → handleRemoveAgent
│   ├── documentProfile ← { vertical, contentTypes, locales }
│   ├── connectedIntegrations ← connectedIntegrations
│   ├── onConnectIntegration → handleConnectIntegration
│   └── onDisconnectIntegration → handleDisconnectIntegration
│
├── CustomAgentStudio (overlay, always mounted)
│   ├── isOpen ← showAgentStudio
│   ├── onClose → setShowAgentStudio(false)
│   ├── onAgentCreated → handleAgentCreated
│   └── orgName ← onboardingConfig?.orgName
│
├── AgentProfile (overlay, always mounted)
│   ├── isOpen ← showAgentProfile
│   ├── onClose → setShowAgentProfile(false) + setSelectedAgent(null)
│   ├── agent ← selectedAgent
│   └── onContinueTraining → setShowAgentProfile(false) + setShowAgentStudio(true)
│
├── ParametersDrawer (overlay, always mounted)
│   ├── isOpen ← showParametersDrawer
│   ├── onClose → setShowParametersDrawer(false)
│   ├── qualityThreshold ← activeCampaign?.config?.qualityThreshold ?? qualityThreshold
│   └── onThresholdChange → setQualityThreshold + update activeCampaign.config
│
├── TeamDirectory (overlay, always mounted — dead state)
│   ├── isOpen ← showTeamDirectory
│   ├── onClose → setShowTeamDirectory(false)
│   ├── onDelegate → handleDelegationComplete
│   └── itemTitle ← teamDirectoryContext.itemTitle
│
└── AgentArbitration (conditionally mounted when showArbitration)
    ├── onResolve → console.log (no state change)
    └── onResolveAll → handleArbitrationResolved
```

---

## 6. Debug Hooks

Three `window` properties are unconditionally assigned in `App.jsx`. They expose raw React state setters to anyone with browser console access.

```javascript
// App.jsx line 46
if (typeof window !== 'undefined') { window.__setPhase = setPhase }

// App.jsx line 61
if (typeof window !== 'undefined') { window.__setShowMarketplace = setShowMarketplace }

// App.jsx line 74
if (typeof window !== 'undefined') { window.__setHumanReviewMode = setHumanReviewMode }
```

### What they expose

| Hook | Effect |
|---|---|
| `window.__setPhase('narrative')` | Teleports to any phase instantly, bypassing all guards. Can reach `human-review` without review data, `narrative` without triage data (safety net will immediately redirect to `dashboard`), or `onboarding` to re-run setup. |
| `window.__setShowMarketplace(true)` | Opens the marketplace from any phase, including `onboarding` (before the main layout is mounted), which could cause render errors depending on marketplace internals. |
| `window.__setHumanReviewMode('review')` | Skips the assignment step and jumps directly to the reviewer view, which may render without a valid `reviewRequest` if no campaign job was set. |

### Security implications

1. **No authentication exists** in this prototype, so these hooks compound an already open system — but they establish a pattern that must not survive into production code.
2. `window.__setPhase` bypasses the `previousPhase` bookkeeping. Using it to enter `settings` or `human-review` leaves `previousPhase` stale, so the "Back" button returns to wherever the user last legitimately navigated from, not where they invoked the hook.
3. The `typeof window !== 'undefined'` guard is an SSR guard — it provides zero security protection. The hooks are always exposed in browser environments.
4. **Fix:** Gate behind `import.meta.env.DEV`:
   ```javascript
   if (import.meta.env.DEV) { window.__setPhase = setPhase }
   ```
   Or remove entirely — these phases can be tested by navigating through the normal flow.

---

## 7. Safety Net — Data-Dependent Phase Redirect

A single `useEffect` guards against accessing data-dependent phases without the required data:

```javascript
// App.jsx — after all state declarations
useEffect(() => {
  const dataRequiredPhases = ['upload', 'reading', 'processing', 'narrative']
  // Campaign processing doesn't require triageData — skip redirect
  if (dataRequiredPhases.includes(phase) && !triageData && !activeCampaign) {
    setPhase('dashboard')
  }
}, [phase, triageData, activeCampaign])
```

### What it guards

| Scenario | Without guard | With guard |
|---|---|---|
| User refreshes browser mid-flow | React state is reset to defaults; `phase` is `'onboarding'` (not affected here, but `triageData` is gone) | Redirects to `dashboard` if phase was `reading/processing/narrative` |
| `window.__setPhase('narrative')` called from console | QualityNarrative renders with null `triageData`, crashes or shows empty state | Immediately redirects to `dashboard` |
| `window.__setPhase('processing')` called | LiveTelemetry attempts to process with no file data | Immediately redirects to `dashboard` |
| `handleReset()` clears `triageData` while in `narrative` | Brief flash of null-data state | Redirect fires synchronously with state batch |

### Limitations

1. **Doesn't guard campaign-only phases.** The condition `!triageData && !activeCampaign` means a campaign in `processing` is safe, but it also means `narrative` with a completed campaign (where `triageData` was never set) is explicitly **excluded** from the redirect — this is intentional and correct.
2. **Browser refresh is not survivable.** There is no persistence (no `localStorage`, no session storage). A refresh always lands on `onboarding`. The safety net only catches in-session navigation errors.
3. **`upload` phase is never reached** (dead navigation path), but it's included in `dataRequiredPhases` defensively.
4. **No guard for `human-review` without review data.** If `window.__setHumanReviewMode('review')` is called while `campaignReviewRequest` is null, `HumanReview` will receive `reviewRequest={undefined}` — unguarded.

---

## 8. Architectural Issues

### 8.1 God Component

`App.jsx` is 1,032 lines serving six distinct responsibilities:

| Responsibility | Lines (approx.) |
|---|---|
| State declarations | ~80 |
| Callback handlers | ~200 |
| Client-side data generators (`getClassification`, `getIntent`, `getAgent`, `getPlan`, `getSourceIQ`, `getQualityScore`, `getUpsellOptions`, `getSandboxPreview`) | ~300 |
| Conditional render tree | ~250 |
| Overlay/modal rendering | ~100 |
| Layout/container logic | ~50 |

This violates the single-responsibility principle and creates practical problems:
- Any developer touching a component must read and understand the full 1,032 lines to understand what props it receives
- Adding a new phase requires modifying the same file as adding a new data generator
- The data generators at the bottom of the file (`getClassification`, etc.) should live in `src/data/` alongside `discoveryFindings.js` and `qualityNarrative.js`

**Refactor target:** Extract data generators to `src/data/triageGenerators.js`. Extract the overlay block to a `<AppOverlays>` component. Extract phase rendering to `<PhaseRouter>`.

---

### 8.2 No Router — No URL-Based Navigation

The phase string is entirely in memory. Consequences:

| Capability | Status |
|---|---|
| Deep linking (share a link to a specific screen) | ❌ Impossible |
| Browser back/forward buttons | ❌ Non-functional — back button exits the app |
| URL-based analytics (track which screens users visit) | ❌ Impossible |
| Code splitting per route | ❌ Impossible |
| Page reload survivability | ❌ Always resets to `onboarding` |
| Server-side rendering of specific pages | ❌ Impossible |
| Bookmarking a workflow step | ❌ Impossible |

**Fix:** Replace phase string with React Router v7 or TanStack Router. Each phase maps to a URL segment. State that must survive navigation (onboardingConfig, structuredContext) moves to a persistent store or URL search params.

---

### 8.3 No State Management Library

All state is `useState` in `App.jsx`. Consequences:

| Problem | Impact |
|---|---|
| Props drilling 3-4 levels deep | Every prop change requires updating every intermediate component, even those that just forward it |
| No derived state abstraction | `computedQuality` and `qualityNarrative` are computed inside App, not near the components that use them |
| No state isolation | A bug in any handler can corrupt the entire app state |
| Multi-user / multi-tenant state | Impossible without a complete rewrite |
| Persistence across sessions | Requires threading `localStorage` through App.jsx |
| Time-travel debugging | Not available |

**Fix for prototype:** React Context for `onboardingConfig`, `connectedIntegrations`, and `activeAgents` — the most widely consumed state.

**Fix for production:** Zustand (lightweight) or Redux Toolkit (full audit trail) for document workflow state; React Query for server state once an API exists.

---

### 8.4 Dead Code and Orphaned State

| Item | Type | Evidence |
|---|---|---|
| `upload` phase | Dead phase | Never navigated to; `handleFileAccepted` sends directly to `reading` |
| `showTeamDirectory` | Dead state | `setShowTeamDirectory(true)` is never called in the codebase |
| `showParametersDrawer` | Dead state | `setShowParametersDrawer(true)` is never called in the codebase |
| `handleLaunch` | Dead handler | Only called from `CommandUpload`, which is in the dead `upload` phase |
| `projectMeta` | Unused state | Declared, cleared on reset, never read by any component |
| `handleRerun` | Incomplete handler | Updates structuredContext but no phase transition — user still has to drop a file manually |
| `campaignReviewJob` | Redundant state | Stored separately from `campaignReviewRequest` but only used in `handleCampaignReviewJob` build step; could be local |

---

### 8.5 Console Leaks in Production

Five `console.log` statements in callback handlers that would log sensitive data in production:

```javascript
handleReviewAssigned  → console.log('Review assigned to:', reviewerId, 'Note:', note)
handleReviewSubmitted → console.log('Review submitted. Retraining data:', results)
handleDelegationComplete → console.log('Delegated to:', member.name, 'Note:', note, ...)
handleArbitrationResolved → console.log('Arbitration resolved:', resolutions)
AgentArbitration onResolve → console.log('Resolved:', id, resolution)
```

All five are in handlers that touch PII-adjacent data (reviewer names, review decisions, arbitration resolutions). Gate behind `import.meta.env.DEV` or remove.

---

### 8.6 `previousPhase` Bookmark Pattern — Fragility

`previousPhase` is a single-slot register. Every navigation to a side-phase overwrites it. This means:

```
dashboard → settings → integrations
```
…sets `previousPhase = 'settings'` on the integrations entry, then back from integrations correctly returns to settings. But:

```
dashboard → settings → (header home click) → narrative → human-review
```
…the header home sets no `previousPhase`; human-review's back returns to whatever `previousPhase` was set before (potentially `dashboard` from the narrative→org-brain navigation if that occurred first). The pattern works for one level of nesting but becomes unpredictable with two or more.

**Fix:** Replace with a navigation stack (`previousPhases: string[]`, push/pop) or a router with real history.

---

## Summary

`App.jsx` is the entire routing system, state store, and data pipeline of this application — a deliberate choice for a prototype where speed of development trumped architectural purity. The patterns here are intentional for a clickable demo but would be active liabilities in a shipped product:

- **Phase system:** Works reliably for linear flows; brittle for nested navigation
- **State variables:** 27 is manageable but will not scale; several are already dead or redundant
- **Callback handlers:** Well-named and individually simple; the god-component anti-pattern makes them hard to find and test
- **Debug hooks:** Must be gated or removed before any real user sees the product
- **Safety net:** Adequate for in-session errors; no persistence means browser refresh is always fatal to workflow state
