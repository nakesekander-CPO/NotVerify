# NotVerify Component Catalog

## Summary

| Metric | Value |
|--------|-------|
| Total components | 84 |
| Total lines of code | 32,686 |
| Subdirectory modules | 4 (`IntelligenceMarketplace/`, `CampaignHub/`, `Settings/`, `Integrations/`) |
| Stack | React 19, Vite 8, Tailwind v4, Framer Motion 12, Lucide React |

### Top 10 Largest Files

| File | Lines |
|------|-------|
| `HumanReview.jsx` | 2,027 |
| `CustomAgentStudio.jsx` | 1,417 |
| `QualityNarrative.jsx` | 1,356 |
| `CommandSurface.jsx` | 1,137 |
| `Settings/CreditsAndBilling.jsx` | 1,062 |
| `OrgBrain.jsx` | 1,038 |
| `AgentMarketplace.jsx` | 1,013 |
| `OnboardingFlow.jsx` | 893 |
| `SecurityTheatre.jsx` | 847 |
| `PreFlightSimulator.jsx` | 811 |

---

## 1. Core Layout

Persistent chrome and primitive overlay containers used across every view.

| Component | File | Lines | Description | Key Props |
|-----------|------|-------|-------------|-----------|
| `Header` | `Header.jsx` | 102 | Sticky top bar with logo, optional company name badge, `StatusPill`, and an account dropdown menu. Dropdown items: Settings, Agent Marketplace, Contact Support (mailto), Sign Out (reload). | `companyName`, `onOpenSettings`, `onOpenMarketplace`, `onNavigateHome` |
| `Footer` | `Footer.jsx` | 18 | Minimal bottom bar rendering `TrustBadges` on the left and copyright + Privacy/Terms links on the right. | — |
| `WorkflowStepper` | `WorkflowStepper.jsx` | 132 | Sticky secondary nav showing the 6-step project pipeline (Intelligence Hub → Agent Selection → Processing → Quality Check → Review → Org Brain). Completed steps show a green check; active step pulses. Shows a one-time tooltip hint stored in `localStorage`. | `currentState` (`'dashboard'` \| `'reading'` \| `'processing'` \| `'narrative'` \| `'human-review'` \| `'org-brain'`) |
| `MobileBlocker` | `MobileBlocker.jsx` | 24 | Full-screen interstitial that replaces the app on small viewports, directing users to a desktop screen. No interactive props — purely presentational. | — |
| `Modal` | `Modal.jsx` | 71 | Accessible portal-rendered dialog. Backdrop blur + scale/fade entrance. Locks body scroll, traps focus via `useFocusTrap`, closes on `Escape`. Three size presets. | `isOpen`, `onClose`, `title`, `size` (`'sm'` \| `'md'` \| `'lg'`) |
| `Drawer` | `Drawer.jsx` | 70 | Accessible portal-rendered right-side panel. Spring-animated slide-in from the right. Locks body scroll, traps focus, closes on `Escape`. Two width presets. | `isOpen`, `onClose`, `title`, `width` (`'md'` \| `'lg'`) |

---

## 2. Onboarding

First-run flows and animated transition screens that guide users through initial setup.

| Component | File | Lines | Description | Key Props |
|-----------|------|-------|-------------|-----------|
| `OnboardingFlow` | `OnboardingFlow.jsx` | 893 | Multi-step conversational onboarding wizard guided by an AI assistant named "Sage". Steps collect company name, industry vertical, target languages/locales, primary content types, and optionally a sample document upload. Derives `vertical`, `subVertical`, and `locales` from content-type selections. Ends with a personalisation confirmation screen. | `onComplete(profile)` |
| `AgentAssemblyTransition` | `AgentAssemblyTransition.jsx` | 181 | Full-screen animated transition played between onboarding and the dashboard. Three agent cards fly in sequentially with staggered delays, each accompanied by a circular progress indicator. Shows a "Continue" button after `TOTAL_ANIMATION_TIME` (2500 ms). | `agents[]`, `onContinue`, `reducedMotion` |
| `TimeJumpTransition` | `TimeJumpTransition.jsx` | 233 | "Fast-forward 6 months" animated screen showing animated count-up stats (projects, words processed, agents trained, quality score) and a sparkline chart across 6 months. Uses `requestAnimationFrame` for the count-up with cubic ease-out. | `onContinue`, `reducedMotion` |
| `ColdStartDashboard` | `ColdStartDashboard.jsx` | 615 | Empty-state dashboard shown after onboarding completes. Displays an agent ensemble readiness checklist, a "First Mission" task list (upload, explore Org Brain, invite teammates, connect integrations), and a drag-and-drop `Reorder` ensemble builder using Framer Motion. Handles file upload via a hidden `<input>`. | `profile`, `onStartProject(file)`, `onOpenIntegrations`, `connectedIntegrations[]` |

---

## 3. Dashboard

The main intelligence hub views visible once a project is active.

| Component | File | Lines | Description | Key Props |
|-----------|------|-------|-------------|-----------|
| `CommandSurface` | `CommandSurface.jsx` | 1,137 | Central document-submission surface. Contains a `LaunchBriefing` sub-component (locale picker, ensemble recommendation, page-count estimate) that appears when a file is dropped. Integrates `IntelligenceFeed`, `Dropzone`, drag-and-drop `Reorder` ensemble builder, and project parameters. Derives document type and recommends an ensemble template automatically. | `profile`, `onStartProcessing(file, locales, ensemble)`, `defaultLocales[]`, `onOpenMarketplace`, `reducedMotion` |
| `IntelligenceFeed` | `IntelligenceFeed.jsx` | 456 | Scrollable activity feed of system alerts, marketplace recommendations, and quality events. Items are color-coded by severity (amber = urgent, violet/blue = info). Each card has a primary CTA that routes to diagnostics, the agent studio, or the marketplace. Supports dismiss (archive) and mark-all-read. | `onNavigate(type)` — `'diagnostics'` \| `'studio'` \| `'marketplace'` \| `'report'` |
| `IntelligenceAssistant` | `IntelligenceAssistant.jsx` | 383 | Floating chat widget (portal-rendered) for the AI assistant "Sage". Triggered via a FAB. Offers quick-action chips (explain score, agent advice, Org Brain, compliance flags, feedback, automation). Responds with canned multi-turn messages. Detects whether integrations are connected and adjusts responses accordingly. | `onNavigate(view)`, `connectedIntegrations[]`, `reducedMotion` |
| `IntelligenceTriage` | `IntelligenceTriage.jsx` | 750 | Three-tier knowledge triage panel (High / Medium / Low confidence) for reviewing and promoting terminology and pattern matches from a processing run. Items can be individually approved, rejected, or bulk-promoted. Supports undo of bulk operations via a toast. Includes a database sync button that simulates committing accepted items to the Org Brain. | `onPromote(items[])`, `onSkip()`, `reducedMotion` |
| `StreamingIntelligence` | `StreamingIntelligence.jsx` | 376 | Animated pre-processing visualisation. Three agent icons fly into orbit around a central document icon. Concurrently, a typewriter-style log stream appears in a terminal pane. After `TOTAL_DURATION_MS` (3000 ms) all agents lock in and the component signals completion. | `file`, `agents[]`, `onComplete`, `reducedMotion` |
| `SemanticSearchPanel` | `SemanticSearchPanel.jsx` | 216 | Semantic search over the project's knowledge rules. Implements stop-word filtering, exact substring matching, partial-word scoring, and Jaccard similarity for fuzzy matching. Results link to specific segments in HumanReview. Toggle between semantic and exact modes. | `rules[]`, `onNavigateToSegment(segId)` |

---

## 4. Document Analysis

Components used during the document-intelligence phase — upload, scan, scoring, and pre-flight review.

| Component | File | Lines | Description | Key Props |
|-----------|------|-------|-------------|-----------|
| `CommandUpload` | `CommandUpload.jsx` | 507 | Full-featured upload + agent configuration screen. Embeds `Dropzone`, shows a drag-and-drop agent roster (toggle active/inactive, live quality-score estimate, time/cost estimates), locale selector, and AI-guardrails toggle. Includes an `AgentLibrarySection` for discovering additional agents. Displays a confidence-score preview ring that updates as agents are toggled. | `profile`, `onStartProcessing(file, locales, agents)`, `onOpenMarketplace`, `reducedMotion` |
| `Dropzone` | `Dropzone.jsx` | 482 | Drag-and-drop + click-to-browse file upload area. Supports single and batch modes. Simulates upload progress with animated bar, live speed (MB/s) and ETA displays, and stall detection. Shows a rejection flash animation for invalid file types. Accepted types: PDF, DOCX, XLSX, PPTX, MP4, MOV, AVI, WEBM, TXT, CSV. | `onFileAccepted(file)`, `compact` |
| `GlassBox` | `GlassBox.jsx` | 532 | Animated document-scanning visualisation. Renders a multi-phase scan (Scanning → Analyzing → Routing → Complete) with category-specific icons (structure, language, terminology, regulatory, complexity, cultural, currency, agent, quality, audio, visual, lipsync). Each phase shows scrolling log lines and severity-coloured finding cards. Animated scan-beam sweeps over a document thumbnail. | `file`, `onComplete(analysisResult)`, `reducedMotion` |
| `ContextPanel` | `ContextPanel.jsx` | 247 | Slide-out sidebar for editing project context (locale, vertical/industry, tone). Uses `SearchableSelect` for locale and vertical pickers. Previews the selected configuration before confirming. Supports an image upload for reference documents. | `context`, `onChange(context)`, `reducedMotion` |
| `SourceIQCard` | `SourceIQCard.jsx` | 112 | Displays Source IQ analysis results — an overall score ring plus per-dimension expandable rows (structure, language, terminology, regulatory, complexity, cultural). Each row shows a progress bar, a severity tag, and expands to reveal detailed finding cards with `source` and `recommendation` fields. | `sourceIQ` (`{ overall, label, summary, dimensions[] }`) |
| `QualityScoreCard` | `QualityScoreCard.jsx` | 118 | Animated SVG ring showing the current confidence score (0–100) with a colour-coded label badge. Below the ring, per-dimension score bars show both current and potential scores side by side. All values animate via Framer Motion springs on change. | `qualityScore` (`{ overall, label, summary, potential, dimensions[] }`) |
| `UpsellCard` | `UpsellCard.jsx` | 54 | List of toggleable quality-improvement options (e.g. knowledge-base enrichment, additional agents). Each card shows impact deltas per dimension, a tag badge (Recommended / Available), and an ARIA-compliant toggle switch. | `options[]`, `enabledUpsells` (Set), `onToggle(id)` |
| `SandboxPreviewCard` | `SandboxPreviewCard.jsx` | 316 | Paginated bilingual preview of processed output. Renders source and translated paragraphs with inline annotation badges (regulatory, terminology, currency, cultural). Clicking a badge shows a popover with rule name, confidence, and agent. Filters by annotation category. Navigates by page. | `preview` (`{ pages[] }`), `totalPages` |
| `DecisionArchitecture` | `DecisionArchitecture.jsx` | 309 | Three-section review screen orchestrated by `DecisionStepper`. **Understand** section renders `SourceIQCard`, `GlassBox`-derived insights, and `LocaleConstellation`. **Decide** section shows `QualityScoreCard`, `UpsellCard`, and `SandboxPreviewCard`. **Confirm** section renders `ProjectMetadata` and a launch CTA. Marks sections complete as the user scrolls. | `file`, `analysisResult`, `onConfirm(config)`, `onBack`, `reducedMotion` |
| `DecisionStepper` | `DecisionStepper.jsx` | 85 | Sticky left-rail vertical stepper with three nodes: Understand, Decide, Confirm. Clicking a node scrolls to that section. Completed sections show a green check icon; the active node uses the section's own icon. | `activeSection`, `completedSections` (Set), `onSectionClick(key)` |

---

## 5. Agent System

Components for discovering, configuring, and managing AI agents.

| Component | File | Lines | Description | Key Props |
|-----------|------|-------|-------------|-----------|
| `AgentWarRoom` | `AgentWarRoom.jsx` | 429 | Real-time agent performance dashboard. Shows active agents with animated count-up stats (segments handled, errors found). Each agent card expands to list top contributions categorised by type (regulatory, terminology, formatting). Includes a conflict-detection summary and a shortcut to `AgentArbitration`. | `agents[]`, `onOpenArbitration`, `reducedMotion` |
| `AgentProfile` | `AgentProfile.jsx` | 519 | Deep-dive modal/panel for a single agent. Sections: knowledge entries table (searchable, paginated), divergence table (baseline vs agent override with impact deltas), accuracy sparkline, preserved terms list (terms never translated). Includes a download button for knowledge export. | `agent`, `onClose`, `reducedMotion` |
| `AgentAssignDrawer` | `AgentAssignDrawer.jsx` | 154 | Right-side drawer for assigning an agent to the current project. Shows agent icon, name, tier badge, term count, supported languages (first 5), top compliance certifications, and a TrustScoreBadge. Primary CTA assigns or un-assigns the agent. | `agent`, `isOpen`, `onClose`, `onAssign(agent)`, `isAlreadyAssigned` |
| `AgentLibrarySection` | `AgentLibrarySection.jsx` | 64 | Collapsible section header wrapping a 2-column grid of `AgentLibraryCard` components. Header shows active agent count; body animates open/close via Framer Motion height transition. | `agents[]`, `agentStates`, `onSelectAgent(agent)`, `reducedMotion` |
| `AgentLibraryCard` | `AgentLibraryCard.jsx` | 131 | Compact card for a single agent in the library grid. Displays icon, name, category, tier badge, "System Verified" label, term count, language codes, compliance certification pills, and a `TrustScoreBadge` with a "View Details" CTA. Coming-soon agents render locked and non-interactive. | `agent`, `index`, `isAssigned`, `onSelect(agent)`, `reducedMotion` |
| `AgentMarketplace` | `AgentMarketplace.jsx` | 1,013 | Legacy full-page marketplace modal (pre-`IntelligenceMarketplace` refactor). Contains category filter tabs (Financial, Legal, Marketing, Technical, Medical, Regional), a test-drive panel showing before/after content with animated score bars, and agent cards with deploy/wishlist/view-profile actions. | `isOpen`, `onClose`, `hiredAgents[]`, `onDeployAgent(agent)`, `onRemoveAgent(id)` |
| `AgentArbitration` | `AgentArbitration.jsx` | 400 | Conflict resolution panel. Displays pairs of conflicting agent outputs (A vs B) for specific segments. User chooses the winning output, or manually edits a combined result. Shows each agent's reasoning and confidence. Tracks resolution stats (resolved/pending/manual). | `conflicts[]`, `onResolve(conflictId, choice)`, `reducedMotion` |
| `CustomAgentStudio` | `CustomAgentStudio.jsx` | 1,417 | Five-phase wizard for training a custom agent: Configure (name, base model selection, focus areas), Upload (training data files), Training (animated progress with ETA), Validate (accuracy metrics per locale), Deploy (completion summary with version tag). Uses a horizontal step bar for phase navigation. Supports agent rename and restart. | `onComplete(agentConfig)`, `onClose`, `reducedMotion` |

### IntelligenceMarketplace/ Subdirectory

Full-screen overlay marketplace for agents, models, and integrations.

| Component | File | Lines | Description | Key Props |
|-----------|------|-------|-------------|-----------|
| `IntelligenceMarketplace` | `IntelligenceMarketplace/index.jsx` | 225 | Root orchestrator for the marketplace overlay. Portal-rendered full-screen panel with focus trap. Manages search query, filter state, selected agent detail view, and a tab toggle between "Agents & Models" and "Integrations" (renders `IntegrationsHub` for the latter). Filters and sorts the `MARKETPLACE_AGENTS` dataset client-side. | `isOpen`, `onClose`, `onDeployAgent(agent)`, `hiredAgents[]`, `onRemoveAgent(id)`, `documentProfile`, `connectedIntegrations[]`, `onConnectIntegration`, `onDisconnectIntegration` |
| `MarketplaceHero` | `IntelligenceMarketplace/MarketplaceHero.jsx` | 82 | Header section of the marketplace. Contains the title/subtitle, an "Agents & Models / Integrations" tab toggle, a search input (agents tab only), and summary stats (agent count, categories, deployment count). | `searchQuery`, `onSearchChange`, `agentCount`, `onClose`, `activeTab`, `onTabChange`, `connectedCount` |
| `FilterBar` | `IntelligenceMarketplace/FilterBar.jsx` | 124 | Sticky filter toolbar with pill-group type filter, industry/language/compliance selects, sort dropdown, and an active-filter count badge with "Clear all". | `filters`, `onFilterChange(filters)` |
| `AgentCatalog` | `IntelligenceMarketplace/AgentCatalog.jsx` | 36 | Responsive 1-2-3 column grid of `AgentCard` components. Shows a "no results" empty state with a search icon when the filtered list is empty. Uses `AnimatePresence mode="popLayout"` for smooth add/remove animations. | `agents[]`, `reducedMotion`, `onSelect`, `onTestDrive`, `onDeploy` |
| `AgentCard` | `IntelligenceMarketplace/AgentCard.jsx` | 130 | Marketplace listing card. Shows provider label, type/rating badges, icon, name, specialty, `TrustScoreBadge`, tags (first 3 + overflow count), description, usage stats (orgs, avg quality lift), tier badge, and two action buttons (Test, Deploy). | `agent`, `index`, `reducedMotion`, `onSelect(agent)`, `onTestDrive(agent)`, `onDeploy(agent)` |
| `AgentDetailView` | `IntelligenceMarketplace/AgentDetailView.jsx` | 538 | Full-detail slide-over for a single marketplace agent. Tabs: Overview (description, metrics), Capabilities (feature list, performance radar chart with SVG axes for accuracy/speed/tone/regulatory), Trust & Safety (certifications, audit history), Integration (compatible tools, setup requirements), Reviews (star ratings + user comments). | `agent`, `onClose`, `onDeploy(agent)`, `onTestDrive(agent)`, `isHired`, `reducedMotion` |
| `RecommendedSection` | `IntelligenceMarketplace/RecommendedSection.jsx` | 39 | Horizontally scrollable row of recommended `AgentCard` components. Only renders when a `documentProfile` is present and there are matching agents. Derives recommendation context string from `vertical`, `contentTypes`, and `locales`. | `agents[]`, `documentProfile`, `reducedMotion`, `onSelect`, `onTestDrive`, `onDeploy` |
| `TrustScoreBadge` | `IntelligenceMarketplace/TrustScoreBadge.jsx` | 41 | Animated circular SVG gauge showing a trust score (0–100). Three sizes (sm/md/lg). Score-to-colour mapping: ≥85 = emerald, ≥70 = amber, <70 = red. Animates dash offset via Framer Motion spring. | `score`, `size` (`'sm'` \| `'md'` \| `'lg'`), `reducedMotion` |

---

## 6. Processing

Screens and indicators rendered while documents are being processed by the agent pipeline.

| Component | File | Lines | Description | Key Props |
|-----------|------|-------|-------------|-----------|
| `LiveTelemetry` | `LiveTelemetry.jsx` | 576 | Real-time processing dashboard. Left panel: animated terminal log stream with colour-coded event types (success / info / warning / conflict / complete). Right panel: per-locale progress bars (each with flag, AWS region, and animated percentage), per-agent activity pulses, and a processing-time clock. Driven by a scripted log timeline keyed to elapsed seconds. | `file`, `agents[]`, `locales[]`, `totalSegments`, `onComplete`, `reducedMotion` |
| `SecurityTheatre` | `SecurityTheatre.jsx` | 847 | Cinematic processing screen emphasising security and compliance. Shows a typewriter-encrypted filename, security status log (AES-256 handshake, zero-retention pipeline, countdown timer), animated compliance guardrails checklist (J-GAAP mapping, currency validation, TSE check, keigo verification, ASC 606 alignment, cultural review), and a phase-based progress arc. Transitions through Scanning → Translating → QA phases over a 12-second scripted timeline. | `file`, `agents[]`, `locales[]`, `onComplete`, `reducedMotion` |
| `OperationsControlRoom` | `OperationsControlRoom.jsx` | 567 | Multi-document campaign processing monitor. Renders a job list (one row per document × locale combination), each with status badge (queued/processing/complete/failed/review), animated progress bar, and quality score on completion. Filter bar for status/type/locale. Summary stats header (total jobs, pass rate, avg score, failed count). Driven by a simulated job-runner that processes jobs sequentially with configurable delays. | `campaign`, `onComplete`, `reducedMotion` |
| `RealignmentProgressBar` | `RealignmentProgressBar.jsx` | 51 | Slim banner shown during an AI realignment pass. Displays "Sage is realigning X of Y segments…" with an animated progress bar and a cancel button. Renders nothing when `isRunning` is false. | `isRunning`, `processed`, `total`, `onCancel`, `reduced` |

---

## 7. Quality & Results

Post-processing analysis views presenting scores, trends, compliance, and governance data.

| Component | File | Lines | Description | Key Props |
|-----------|------|-------|-------------|-----------|
| `QualityNarrative` | `QualityNarrative.jsx` | 1,356 | Main results screen for a completed single-document project. Tabs: Overview (summary, `GovernanceScorecard`, `ValueCreationEngine`, `AnomalyTrendChart`), Triage (`IntelligenceTriage` for knowledge review), Heatmap (`QualityHeatmap` for multi-locale view). Also includes a `CampaignExportWizard` sub-component (3-step: format → folder structure → confirm). Computes pass/fail status and recommended next actions. | `campaign`, `onContinueToReview`, `onReturnToDashboard`, `reducedMotion` |
| `QualityHeatmap` | `QualityHeatmap.jsx` | 369 | Document × locale matrix heatmap. Each cell shows a score-coloured circle; click opens a popover with document name, locale, score, and status. Rows sortable by risk. Column headers show locale codes. Rows optionally sorted by lowest average score. Exports a `scoreTier(score)` utility used by `CampaignResultsView`. | `campaign`, `reducedMotion` |
| `CampaignResultsView` | `CampaignResultsView.jsx` | 662 | Campaign-level results dashboard. Summary header with an animated `ScoreRing`, pass rate, total jobs, and locale counts. Per-locale accordion rows expand to list document scores. Deployment actions (mark ready, send for review, download) per locale. Integrates `PatternTriagePanel` for cross-document pattern review and an inline export wizard (format/folder-structure/confirm). | `campaign`, `onReturnToDashboard`, `onNavigateToReview(docId, locale)`, `reducedMotion` |
| `AnomalyTrendChart` | `AnomalyTrendChart.jsx` | 426 | SVG line chart of quality scores over 8 months with industry-average reference line. Anomaly months (score drops) render a highlighted diamond marker. Clicking an anomaly expands a root-cause panel showing impact breakdown by dimension, a "similar pattern" callout, and a recovery action button. | `currentProjectScore`, `industryAvg` |
| `ComplianceGate` | `ComplianceGate.jsx` | 689 | Pre-publish compliance review queue. Lists flagged segments with severity levels (critical/major/minor), showing source + translated text, the compliance issue, and a suggested fix. Reviewer can approve a suggested fix, write a custom override, or reject it. Supports inline commenting and assignment to external reviewers. Shows a locked publication gate until all criticals are resolved. | `flaggedSegments[]`, `onResolveAll`, `onClose`, `reducedMotion` |
| `ComplianceOfficerView` | `ComplianceOfficerView.jsx` | 756 | Dedicated compliance officer workflow. Same flagged-segment data as `ComplianceGate` but with a two-panel layout: left list + right detail pane. Detail pane shows full segment context, severity badge, flagging agent, suggested fix, and resolution history timeline. Supports approve/reject/manual-edit workflows with audit-trail comments. Includes a download-report button. | `flaggedSegments[]`, `onComplete`, `reducedMotion` |
| `GovernanceScorecard` | `GovernanceScorecard.jsx` | 383 | Per-agent contribution scorecard. Renders bar charts of segments handled, errors found, and quality lift for each agent (JP-FIN-3, MER-DT-1, BV-SENT-1). Lists top contributions per agent with type badges (regulatory/terminology/brand/tone/formatting). Includes context badges for TSE Compliance, J-GAAP, and Auto-Publish readiness. | `agents[]`, `contextBadges[]`, `reducedMotion` |

---

## 8. Mission Control

Pre-flight configuration and locale management tools used before launching a multi-locale campaign.

| Component | File | Lines | Description | Key Props |
|-----------|------|-------|-------------|-----------|
| `MissionControl` | `MissionControl.jsx` | 776 | Single-document pre-launch configuration hub. Left rail: `LocaleConstellation` + agent ensemble summary. Right panel: animated credit-cost/time estimator (updates live as agents are toggled), quality-score projector, an editable agent list with drag-to-reorder, and guardrail toggles. Launch CTA transitions to the processing screen. | `file`, `profile`, `agents[]`, `onLaunch(config)`, `onBack`, `reducedMotion` |
| `PreFlightSimulator` | `PreFlightSimulator.jsx` | 811 | Interactive what-if simulator. Left panel: agent roster toggle (active/inactive), locale selector, and quality estimator. Right panel: animated agent-contribution bars showing quality lift per agent, a cost/time breakdown, and a readiness summary. "Simulate" button plays a 3-step scan animation before revealing the estimate result. | `profile`, `onLaunch(config)`, `onBack`, `reducedMotion` |
| `LocaleConstellation` | `LocaleConstellation.jsx` | 770 | Interactive SVG world-map / constellation visualisation. Locale nodes pulse when selected; connection lines animate between active locales. Three view modes: **Map** (geographic bubble chart), **Network** (constellation with animated dashed connection lines), **List** (scrollable locale checklist). Document-aware: highlights CJK locales for financial content, Romance-language locales for legal content. Injects CSS keyframes once via `ensurePulseStyles()`. | `selectedLocales[]`, `onToggleLocale(code)`, `documentContext` |

---

## 9. Human Review

The segment-by-segment editor for reviewing and approving AI-processed content.

| Component | File | Lines | Description | Key Props |
|-----------|------|-------|-------------|-----------|
| `HumanReview` | `HumanReview.jsx` | 2,027 | The largest component. Full translation review editor. Left rail: filter controls, `SmartHighlightFilter`, `PropagationSettings`, `ActiveEntitySurface`, `SemanticSearchPanel`. Centre: scrollable segment list with source/translation, inline edit, diff highlighting (original → suggested fix), severity badge, flagging agent, approve/reject actions, and keyboard shortcut `Shift+V` to verify. Right panel: segment-level metadata, `KnowledgeRuleModal` trigger, `FindReplaceDrawer` trigger, `ConcordanceOverlay` trigger. Integrates with `useKnowledgeRules` hook and supports AI realignment via `RealignmentProgressBar`. | `project` (file + analysisResult), `onComplete`, `onBack`, `reducedMotion` |
| `FindReplaceDrawer` | `FindReplaceDrawer.jsx` | 188 | Drawer-based find-and-replace tool. Supports case-sensitive and whole-word matching, document or selection scope, and an "overwrite verified" toggle. Previews match count before replacing. Returns an array of `{ segId, previousTranslation, newTranslation, deterministic }` replacement objects. | `isOpen`, `onClose`, `segments[]`, `lockedSegmentIds` (Set), `onReplace(replacements[])` |
| `ConcordanceOverlay` | `ConcordanceOverlay.jsx` | 209 | Portal-rendered concordance search overlay. Searches both source and translation fields of all segments for a query string. Displays results grouped by field (source/translation) with context snippet highlighting. Clicking a result calls `onNavigateToSegment`. | `isOpen`, `onClose`, `segments[]`, `searchText`, `onNavigateToSegment(segId)` |
| `SmartHighlightFilter` | `SmartHighlightFilter.jsx` | 45 | Compact utility panel showing when there are AI-realigned segments. Renders a count badge, a filter toggle ("Filter" / "Show All"), and a "Verify All" button. Includes a keyboard shortcut hint. Returns `null` when `realignedCount === 0`. | `realignedCount`, `filterActive`, `onToggleFilter`, `onVerifyAll` |

---

## 10. Campaign Management

Multi-document batch workflow creation and pre-flight configuration.

| Component | File | Lines | Description | Key Props |
|-----------|------|-------|-------------|-----------|
| `CampaignHub` | `CampaignHub/index.jsx` | 497 | Two-step campaign creation wizard. **Step 1 – Upload**: multi-file dropzone (`.docx/.pdf/.pptx/.xlsx/.mp4` etc.), `EnsembleTemplateCard` selector, locale picker, campaign name field, and a "Use sample data" shortcut. **Step 2 – Pre-flight**: renders `PreflightTable` + `BulkEditBar`. Generates a `campaign` model object via `createCampaign()` and `createDocumentRecord()`. | `profile`, `onLaunch(campaign)`, `reducedMotion` |
| `PreflightTable` | `CampaignHub/PreflightTable.jsx` | 196 | Per-document pre-flight review table. Each row shows file name, detected type badge, page count, ensemble dropdown (per-document override), locale chips (with overflow), and an ensemble-mismatch warning icon. Supports row selection (checkbox) to enable `BulkEditBar`. | `campaign`, `selectedDocIds` (Set), `onToggleDoc(id)`, `onSelectAll`, `onUpdateDoc(id, patch)` |
| `BulkEditBar` | `CampaignHub/BulkEditBar.jsx` | 114 | Floating bottom action bar (dark pill style) for bulk operations on selected pre-flight rows. Ensemble picker dropdown and locale override multi-select. Apply and dismiss buttons. Appears fixed at bottom-centre of screen when items are selected. | `selectedCount`, `campaignLocales[]`, `onApply({ ensembleId, localeOverride })`, `onDismiss` |
| `EnsembleTemplateCard` | `CampaignHub/EnsembleTemplateCard.jsx` | 31 | Selectable card for choosing a processing ensemble template (Financial, Legal, Marketing, General). Shows icon, name, and "best for" subtitle. Selected state uses a blue ring + check icon. | `template`, `selected`, `onSelect(templateId)` |

---

## 11. Knowledge & Org Brain

Components for managing the organisation's accumulated terminology, patterns, and domain intelligence.

| Component | File | Lines | Description | Key Props |
|-----------|------|-------|-------------|-----------|
| `OrgBrain` | `OrgBrain.jsx` | 1,038 | Org Brain knowledge base viewer. Sections: **Overview** (stat pills: entries, patterns, segments, hours saved; interactive SVG domain-model graph with force-layout nodes and edges; growth sparkline; recent activity timeline); **Domain Models** (per-model cards with entries, accuracy, last-trained); **Knowledge Entries** (searchable, filterable table with source→target and context columns); **Sage Walkthrough** (step-by-step explainer guided by the AI assistant). | `onBack`, `reducedMotion` |
| `KnowledgeRuleModal` | `KnowledgeRuleModal.jsx` | 111 | Modal form for saving a source→target terminology pair as a knowledge rule. Fields: source term, target term, optional context note. Wraps `Modal`. On save, calls `onSave({ sourceTerm, targetTerm, contextNote, createdFrom })`. Resets fields whenever `isOpen` transitions to `true`. | `isOpen`, `onClose`, `onSave(rule)`, `initialSourceTerm`, `initialTargetTerm`, `segmentId` |
| `ActiveEntitySurface` | `ActiveEntitySurface.jsx` | 97 | Contextual sidebar widget showing which knowledge rules are active for the currently selected segment. For each matching rule checks whether the translation is compliant (target term present) or in violation (source term present but target absent). Animates rule entries in/out with Framer Motion. Returns `null` when no segment is selected or no rules match. | `segment`, `rules[]` |
| `PatternTriagePanel` | `PatternTriagePanel.jsx` | 406 | Cross-document pattern review panel for campaigns. Generates patterns from campaign data (terminology inconsistencies, currency format issues, etc.), shows instance counts, affected documents/locales, and severity. Each pattern can be accepted (apply fix across all instances) or dismissed. Shows an acceptance progress counter. | `campaign`, `reducedMotion` |

---

## 12. Settings & Integrations

### Settings/ Subdirectory

| Component | File | Lines | Description | Key Props |
|-----------|------|-------|-------------|-----------|
| `Settings` | `Settings/index.jsx` | 110 | Settings shell. Left sidebar navigation with sections: Credits & Billing, Billing Entities (enterprise only), Budgets & Allocations (enterprise only), API & Integrations. Includes a prototype tier-switcher (Standard / Pro / Enterprise) to preview tier-specific UI. Routes to `CreditsAndBilling`, `BillingEntities`, and `BudgetsAndAllocations`. Clicking "Integrations" nav item calls `onOpenIntegrations`. | `onBack`, `onOpenIntegrations` |
| `CreditsAndBilling` | `Settings/CreditsAndBilling.jsx` | 1,062 | Full billing management page. Shows: current plan card (Pro tier), IC/TC credit balance gauges with burn-rate projections, a Pro-tier upgrade selector (tier 1/2/3 with IC/TC quantities), auto-top-up configuration (threshold + top-up amount for IC and TC separately), invoice history table with status badges, and add-payment-method form. Enterprise section adds seat management and invoicing settings. | `tier` (`'standard'` \| `'pro'` \| `'enterprise'`) |
| `BillingEntities` | `Settings/BillingEntities.jsx` | 241 | Enterprise-only billing entity manager. Lists legal entities (name, address, tax ID, currency, payment method, invoice count). Supports inline edit, add new entity, and archive. Renders a primary-entity badge. | — |
| `BudgetsAndAllocations` | `Settings/BudgetsAndAllocations.jsx` | 357 | Enterprise-only credit budget manager. Shows per-team budget cards with IC/TC allocated vs. used gauges and alert-threshold settings. Create-budget form (name, entity, IC/TC allocation, alert percentage). Displays total allocated across all budgets. | — |

### Integrations/ Subdirectory

| Component | File | Lines | Description | Key Props |
|-----------|------|-------|-------------|-----------|
| `Integrations` | `Integrations/index.jsx` | 478 | Integration hub showing a grid of available connectors (Slack, Jira, Google Drive, Salesforce, Confluence, Notion, etc.) organised by category (Communication, Project Management, Storage, CRM). Connected integrations show a green check and last-sync time. Clicking an unconnected tool opens a `MergeLinkModal` simulation (OAuth flow: select workspace → authorise → done). Tabs within the connected-tool detail panel: Overview, `WorkflowBuilder`, `SecurityPermissions`. | `connectedIntegrations[]`, `onConnect(integration)`, `onDisconnect(id)`, `reducedMotion` |
| `WorkflowBuilder` | `Integrations/WorkflowBuilder.jsx` | 653 | No-code automation workflow builder. Manages a list of workflows each with: name, trigger (13 event types), optional condition filter (quality score threshold, locale, document type), and one or more connector actions (send Slack message, create Jira ticket, upload to Drive, etc.). Inline editor: name field, trigger picker, condition builder, action chain. Execution log table with timestamps, status badges, and duration. Includes pre-built workflow templates. | `connectedIntegrations[]` |
| `SecurityPermissions` | `Integrations/SecurityPermissions.jsx` | 270 | Permission matrix table mapping agents (rows) to connected integrations (columns). Each cell is a toggle checkbox granting/revoking that agent's access to that tool. Global "require human approval" switch. Scope field per integration (read/write scopes as free text). Full audit log table showing who (user/agent/workflow) performed what action on which tool. | `connectedIntegrations[]` |

---

## 13. Shared UI

Reusable primitives and providers consumed throughout the application.

| Component | File | Lines | Description | Key Props |
|-----------|------|-------|-------------|-----------|
| `StatusPill` | `StatusPill.jsx` | 68 | Green pulsing pill button in the header showing "All Systems Operational". Clicking opens a popover listing the 4 system services (Deployment API, Agent Orchestrator, Document Parser, Quality Engine) with their operational status and latency. Closes on outside click or `Escape`. | — |
| `TrustBadges` | `TrustBadges.jsx` | 114 | Row of three security badges in the footer (SOC 2 Type II, AES-256, In-Region). The SOC 2 badge opens a `Modal` with certification details and a simulated audit-report download. AES-256 and In-Region show tooltip popovers on hover. | — |
| `SearchableSelect` | `SearchableSelect.jsx` | 218 | Accessible combobox with live search filtering, keyboard navigation (↑↓ highlight, Enter select), and optional multi-select mode. Supports an "Other" free-text option via `allowOther`. Scrolls highlighted option into view in the list. Closes on outside click or `Escape`. | `id`, `options[]`, `value`, `onChange`, `placeholder`, `multiple`, `allowOther`, `otherPlaceholder` |
| `ToastProvider` | `ToastProvider.jsx` | 90 | Context provider + toast renderer. Stacks notifications bottom-right at z-80. Toast types: `success` (emerald), `error` (red), `info` (straker blue). Auto-dismisses after configurable duration. Exposes `useToast()` hook returning `addToast(message, type, duration)`. Uses `aria-live="polite"` for accessibility. | `children` — wraps the app tree |

---

## 14. Specialized

Standalone components that don't fit cleanly into the above categories.

| Component | File | Lines | Description | Key Props |
|-----------|------|-------|-------------|-----------|
| `TeamDirectory` | `TeamDirectory.jsx` | 521 | Portal-rendered full-screen team directory overlay. Lists team members grouped by department (Leadership, Regional Leads, Linguists, Reviewers) with avatar, name, role, region, online status, and permission level badge. Includes a search filter, a "Permissions" tab showing a per-member permission matrix, and an "Invite Member" form (email, role, locale assignment). | `isOpen`, `onClose`, `reducedMotion` |
| `ValueCreationEngine` | `ValueCreationEngine.jsx` | 372 | ROI and value-creation summary component. Shows per-agent contribution rings (animated SVG, colour-coded), a total quality lift score, error-prevention count, and "what generic AI would have missed" callout. Lists guardrail contributions. Shows three context status badges (TSE Compliance, J-GAAP, Auto-Publish). | `agents[]`, `contextBadges[]`, `reducedMotion` |
| `PropagationSettings` | `PropagationSettings.jsx` | 163 | Popover-based configuration for how knowledge-rule propagation works. Four toggles: propagate exact matches, allow high-confidence auto-apply, high-confidence threshold slider (0–100), overwrite verified segments. Settings persisted to `localStorage` under key `nv-propagation-settings`. Exports `usePropagationSettings()` hook for reading/writing settings. | `settings`, `onUpdate(patch)` |
| `ProjectMetadata` | `ProjectMetadata.jsx` | 85 | Controlled form for project-level metadata fields: project name (required, validated on blur), PO number, and team visibility (private / team / org). Renders inline validation error for empty name. | `meta`, `onChange(meta)` |
| `ParametersDrawer` | `ParametersDrawer.jsx` | 125 | Drawer for adjusting processing parameters: quality threshold slider (60–100, with label: Draft / Permissive / Standard / High confidence / Manual only), processing priority radio group (Standard / Priority / Rush), and output format checkboxes (PDF, XLIFF, TMX, bilingual review). Applies changes and fires a success toast. | `isOpen`, `onClose`, `qualityThreshold`, `onThresholdChange(value)` |

---

## Component Dependency Map (High Level)

```
App
├── ToastProvider                      (wraps everything)
├── Header
│   └── StatusPill
├── WorkflowStepper
├── MobileBlocker                      (replaces layout on mobile)
│
├── OnboardingFlow                     (first run)
│   └── SearchableSelect
├── AgentAssemblyTransition
├── TimeJumpTransition
├── ColdStartDashboard
│
├── CommandSurface / CommandUpload     (doc submission)
│   ├── Dropzone
│   ├── IntelligenceFeed
│   ├── AgentLibrarySection
│   │   └── AgentLibraryCard
│   │       └── TrustScoreBadge
│   └── ContextPanel
│       └── SearchableSelect
│
├── GlassBox                           (document scan)
│
├── DecisionArchitecture               (review + configure)
│   ├── DecisionStepper
│   ├── SourceIQCard
│   ├── QualityScoreCard
│   ├── UpsellCard
│   ├── SandboxPreviewCard
│   ├── LocaleConstellation
│   ├── ContextPanel
│   └── ProjectMetadata
│
├── StreamingIntelligence              (agent assembly)
├── SecurityTheatre / LiveTelemetry    (processing)
├── OperationsControlRoom              (campaign processing)
│   └── RealignmentProgressBar
│
├── MissionControl / PreFlightSimulator
│   └── LocaleConstellation
│
├── QualityNarrative                   (results — single doc)
│   ├── GovernanceScorecard
│   ├── ValueCreationEngine
│   ├── AnomalyTrendChart
│   ├── IntelligenceTriage
│   └── QualityHeatmap
│
├── CampaignResultsView                (results — campaign)
│   ├── QualityHeatmap
│   └── PatternTriagePanel
│
├── HumanReview                        (segment editor)
│   ├── KnowledgeRuleModal
│   │   └── Modal
│   ├── FindReplaceDrawer
│   │   └── Drawer
│   ├── ConcordanceOverlay
│   ├── SmartHighlightFilter
│   ├── PropagationSettings
│   ├── ActiveEntitySurface
│   ├── SemanticSearchPanel
│   └── RealignmentProgressBar
│
├── ComplianceGate / ComplianceOfficerView
│
├── AgentWarRoom
│   └── AgentArbitration
├── AgentProfile
├── AgentAssignDrawer
│   └── Drawer
│
├── CampaignHub
│   ├── EnsembleTemplateCard
│   ├── PreflightTable
│   └── BulkEditBar
│
├── OrgBrain
│
├── IntelligenceMarketplace (overlay)
│   ├── MarketplaceHero
│   ├── FilterBar
│   ├── RecommendedSection
│   │   └── AgentCard
│   ├── AgentCatalog
│   │   └── AgentCard
│   │       └── TrustScoreBadge
│   └── AgentDetailView
│
├── AgentMarketplace (legacy overlay)
├── CustomAgentStudio
│
├── TeamDirectory
├── Settings
│   ├── CreditsAndBilling
│   ├── BillingEntities
│   └── BudgetsAndAllocations
│
├── Integrations
│   ├── WorkflowBuilder
│   └── SecurityPermissions
│
├── IntelligenceAssistant (FAB overlay)
├── ParametersDrawer
│   └── Drawer
├── Modal                              (primitive)
├── Drawer                             (primitive)
├── TrustBadges
│   └── Modal
└── Footer
    └── TrustBadges
```

---

*Generated 2026-03-31 — read from source, not guessed.*
