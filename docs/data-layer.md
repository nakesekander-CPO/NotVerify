# NotVerify — Data Layer & Hooks Reference

> **Scope:** All client-side data generation, custom hooks, and utility functions.
> There is no backend, no API calls, and no network I/O — every value rendered in the UI is produced locally.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Data Modules (`src/data/`)](#2-data-modules-srcdata)
   - [campaignModel.js](#21-campaignmodeljs)
   - [discoveryFindings.js](#22-discoveryfindingsjs)
   - [localeConstellation.js](#23-localeconstellationjs)
   - [orgIntelligence.js](#24-orgintelligencejs)
   - [qualityNarrative.js](#25-qualitynarrativejs)
3. [Inline Generators (`App.jsx`)](#3-inline-generators-appjsx)
4. [Component-Local Data](#4-component-local-data)
   - [Integrations/data.js](#41-integrationsdatajs)
   - [IntelligenceMarketplace/data/](#42-intelligencemarketplacedata)
5. [Custom Hooks (`src/hooks/`)](#5-custom-hooks-srchooks)
   - [useQualityCalculator](#51-usequalitycalculator)
   - [useKnowledgeRules](#52-useknowledgerules)
   - [useFocusTrap](#53-usefocustrap)
   - [useMediaQuery](#54-usemediaquery)
   - [useReducedMotion](#55-usereducedmotion)
6. [Utility Functions (`src/utils/scoreColors.js`)](#6-utility-functions-srcutilsscorecolorsjs)
7. [localStorage Usage](#7-localstorage-usage)
8. [Refactoring Recommendations](#8-refactoring-recommendations)

---

## 1. Overview

NotVerify is a **React 19 prototype with no backend**. All data flows client-side:

```
User action (file drop / onboarding answers)
         │
         ▼
structuredContext  ◄── onboarding answers (locale, vertical, tone)
         │
         ├──► App.jsx inline generators (classification, quality score, upsells, etc.)
         │         driven by: file.extension + primaryLocale(structuredContext)
         │
         ├──► src/data/ module calls (discovery stream, org intelligence, narrative)
         │         driven by: same structured context object
         │
         └──► Component-local static data (marketplace agents, integrations catalogue)
                   pure static arrays — no runtime parameters
```

**Key design rules in the current prototype:**

- **Determinism by extension + primary locale.** All generators branch on `file.name.split('.').pop()` and `structuredContext.targetLocales[0]`. Same inputs always produce the same mock data.
- **No async.** Every generator is synchronous and returns a plain JS object or array immediately. Simulated async behaviour (discovery stream, processing) is provided via `delay` fields that consuming components feed into `setTimeout`/`setInterval`.
- **No imports between generators.** The eight functions at the bottom of `App.jsx` are module-private and reference each other only through `primaryLocale()`. There is no shared singleton state.
- **One `localStorage` consumer.** Only `useKnowledgeRules` reads/writes `localStorage`, under the key `nv-knowledge-rules`.

---

## 2. Data Modules (`src/data/`)

### 2.1 `campaignModel.js`

**Purpose:** Factory functions, type definitions, ensemble templates, document-type detection, and naming/export configuration for the Campaign domain model. This is the most complete domain module — it defines the full object hierarchy used by `CampaignHub` and `OperationsControlRoom`.

**Exports:**

| Export | Kind | Description |
|--------|------|-------------|
| `ENSEMBLE_TEMPLATES` | `EnsembleTemplate[]` | 4 pre-built agent ensemble configurations |
| `DEFAULT_ENSEMBLE_ID` | `string` | `'general'` |
| `detectDocumentType(file)` | function | Heuristic type detection from filename keywords + MIME |
| `recommendedEnsembleForType(docType)` | function | Maps `DocumentType` → ensemble ID |
| `checkEnsembleMismatch(ensembleId, docType)` | function | Returns a warning string or `null` |
| `estimatePageCount(file)` | function | Rough page count from file size × extension coefficient |
| `createDocumentRecord(file, campaignConfig)` | function | Creates a `DocumentRecord` |
| `createCampaign(options)` | function | Creates an empty `Campaign` shell |
| `resolveDocumentLocales(doc, campaign)` | function | Returns override locales or campaign defaults |
| `resolveDocumentEnsemble(doc, campaign)` | function | Returns override ensemble or campaign default |
| `simulateCampaignResults(campaign)` | function | Fills all `localeResults` with random scores 72–98 |
| `createSampleCampaign(structuredContext)` | function | Builds demo campaign for "Try with samples" CTA |
| `FOLDER_STRUCTURE_TEMPLATES` | array | 3 output folder layout options |
| `NAMING_TOKENS` | array | 5 template tokens for file naming (`{locale}`, `{doctype}`, etc.) |
| `EXPORT_FORMATS` | array | 4 export format descriptors (XLIFF, TMX, PDF, DOCX) |

**Core type shapes:**

```js
// EnsembleTemplate
{
  id: 'financial',            // string key
  name: 'Financial Reporting',
  description: 'J-GAAP compliance, regulatory terminology, currency formatting',
  agentIds: ['jp-fin-3', 'mer-dt-1', 'bv-sent-1'], // map to marketplace agent IDs
  icon: 'TrendingUp',          // lucide icon name (string)
  bestFor: 'Earnings reports, filings, investor comms',
}

// DocumentRecord
{
  id: 'doc-1712345678-1',
  file: File,                  // the real browser File object
  fileName: 'Q3_Report.pdf',
  detectedType: 'Financial',   // 'Legal' | 'Financial' | 'Marketing' | 'Technical' | 'General'
  pageCount: 19,
  ensembleId: 'financial',     // inherited from campaign or per-doc override
  localeOverride: null,        // string[] | null — null = inherit campaign locales
  thresholdOverride: null,     // number | null
  status: 'pending',           // 'pending' | 'processing' | 'complete' | 'failed' | 'review'
  localeResults: [
    {
      locale: 'ja',
      qualityScore: null,      // null until processing completes
      status: 'queued',        // 'queued' | 'processing' | 'complete' | 'failed' | 'review'
      segments: [],
    }
  ],
}

// CampaignConfig
{
  locales: ['ja', 'de', 'zh'],
  vertical: 'Financial Services',
  tone: 'Formal',
  ensembleId: 'financial',
  qualityThreshold: 85,        // 0–100
  autoPublish: false,
}

// Campaign
{
  id: 'campaign-1712345678-1',
  name: 'Sample — Q3 Financial Package',
  createdAt: '2026-03-31T10:00:00.000Z',  // ISO 8601
  config: CampaignConfig,
  documents: DocumentRecord[],
  status: 'preflight',         // 'preflight' | 'running' | 'complete' | 'partial'
  poNumber: '',
}
```

**Document type detection logic:**

`detectDocumentType` checks filename keywords in priority order:
1. Financial keywords → `'Financial'`
2. Legal keywords → `'Legal'`
3. Marketing keywords → `'Marketing'`
4. Technical keywords → `'Technical'`
5. Spreadsheet MIME/extension → `'Financial'`
6. Presentation MIME/extension → `'Marketing'`
7. Default → `'General'`

No content is read — detection is filename-only.

**Ensemble mismatch detection:**

`checkEnsembleMismatch` covers 5 explicit cross-type pairings (e.g. `'marketing-on-Financial'`). Any other combination returns `null` (no warning). Used to surface ⚠ flags in the preflight table.

**Consuming components:** `CampaignHub`, `OperationsControlRoom`, `CampaignResultsView`, `CommandUpload` (via `App.jsx`).

---

### 2.2 `discoveryFindings.js`

**Purpose:** Generates the timed discovery stream shown during the "reading" phase. Returns an array of finding objects, each with a `delay` so consuming components can schedule them as progressive reveals.

**Exports:**

| Export | Kind | Description |
|--------|------|-------------|
| `generateDiscoveryStream(file, structuredContext)` | function | Returns `DiscoveryFinding[]` |

**Parameters:**
- `file` — browser `File` object (only `file.name` is read for extension)
- `structuredContext` — `{ locales: string[], vertical?: string, industryVertical?: string }`

**Return type:**

```js
// DiscoveryFinding
{
  delay: 400,            // ms before this finding should appear (cumulative from 0)
  category: 'structure', // 'structure'|'language'|'terminology'|'regulatory'|'complexity'
                         // |'currency'|'cultural'|'agent'|'quality'|'audio'|'visual'|'lipsync'
  text: 'Document structure detected: hierarchical sections with embedded tables',
  severity: 'info',      // 'info' | 'minor' | 'major' | 'critical'
  scanLabel: 'Scanning document architecture...',
}
```

**Branching logic (3 paths):**

| Condition | Stream variant | Findings count |
|-----------|----------------|----------------|
| `ext === 'pdf'` AND `locale === 'ja'` AND vertical contains `'financial'` | JP Financial | 9 findings, includes J-GAAP, ASBJ, currency, critical regulatory flag |
| `ext` is video (`mp4`, `mov`, `avi`, `mkv`, `webm`) | Video | 8 findings, includes lip-sync, visual text, audio overlap |
| Everything else | Generic doc | 8 findings, moderate severity throughout |

The `primaryLocale` helper used here reads `structuredContext.locales[0]` (note: different property path from the one in `App.jsx` which reads `structuredContext.targetLocales[0]` — see §8 for the inconsistency).

**Consuming components:** `CommandUpload` (drives the animated scan feed during triage).

---

### 2.3 `localeConstellation.js`

**Purpose:** Pure static configuration for all supported locale nodes and their language family groupings. Used by the visual "Locale Constellation" selector.

**Exports:**

| Export | Kind | Description |
|--------|------|-------------|
| `localeConstellationData` | object | `{ locales: LocaleNode[], families: Family[] }` |

**Type shapes:**

```js
// LocaleNode
{
  code: 'ja',
  name: 'Japanese',
  family: 'CJK',              // 'CJK' | 'romance' | 'germanic' | 'other'
  complexity: 0.85,            // 0–1 — used to weight visual node size
  x: 78,                       // % position in the constellation SVG
  y: 22,
  relatedTo: ['ko', 'zh', 'zh-tw'],  // codes of visually connected nodes
  flags: ['formal-register', 'right-context-heavy'],  // UI tooltip flags
  qualityPrediction: {
    base: 76,                  // expected score without enhancements
    withEnhancements: 89,      // expected score with full agent stack
  },
}

// Family
{
  id: 'CJK',
  label: 'CJK Languages',
  color: '#f59e0b',            // hex — used for edge/node highlight
  members: ['ja', 'ko', 'zh', 'zh-tw'],
}
```

**Coverage:** 23 locales across 4 families:
- **CJK:** ja, ko, zh, zh-tw
- **Romance:** fr, es, it, pt, pt-br
- **Germanic:** de, nl, sv, no, da
- **Other:** fi, ar, ru, pl, tr, th, vi, id, hi

**Consuming components:** `LocaleConstellation` (the interactive locale picker in `CommandSurface`/`CommandUpload`).

---

### 2.4 `orgIntelligence.js`

**Purpose:** Generates a fixed snapshot of simulated organizational history — past projects, locale usage patterns, smart defaults, and a predictive suggestion. Called once in `App.jsx` via `useMemo` and passed down as a prop.

**Exports:**

| Export | Kind | Description |
|--------|------|-------------|
| `generateOrgIntelligence()` | function | Returns `OrgIntelligence` object |

**Parameters:** None. Returns a static object on every call (no randomness).

**Return type:**

```js
{
  recentProjects: [
    {
      id: 'proj-001',
      name: 'Q2 Earnings Report',
      fileName: 'Q2_Earnings_Final.docx',
      locales: ['ja', 'de', 'zh'],
      industry: 'Financial',
      qualityScore: 92,
      date: 'Jul 14',
      status: 'completed',
      fileType: 'docx',       // used for file icon rendering
    },
    // ...2 more
  ],

  localeProfiles: [
    {
      locale: 'ja',
      name: 'Japanese',
      projectCount: 47,
      avgQuality: 89,
      lastUsed: '2026-02-22', // ISO date
      trending: 'up',          // 'up' | 'stable' | 'down'
    },
    // ...5 more locales
  ],

  orgPatterns: {
    mostUsedVertical: 'Financial Services',
    avgProjectsPerWeek: 4.2,
    terminologyConsistency: { current: 87, previous: 75, delta: 12 },
    avgQualityTrend: [82, 84, 86, 87, 89, 91],  // last 6 months
    totalProjectsCompleted: 156,
    totalWordsProcessed: '2.4M',  // display string
    glossaryTerms: 1247,          // stored as 'glossaryTerms'; UI shows as "knowledge entries"
  },

  smartDefaults: {
    suggestedLocales: ['ja', 'de', 'zh'],
    suggestedVertical: 'Financial Services',
    suggestedTone: 'Formal',
  },

  predictiveSuggestion: {
    projectName: 'Q3 Earnings Report',
    fileName: 'Q3_Earnings_Final.docx',
    daysSinceLastRun: 90,
    lastRunName: 'Q2 Earnings Report',
    headline: "It's Q3 Earnings season.",
    preloadedConfig: {
      locales: ['ja', 'de', 'zh'],
      vertical: 'Financial Services',
      glossary: 'J-GAAP Financial Knowledge Base v3.2',
      modelPack: 'Financial Regulatory Model Pack',
    },
    prompt: "Based on Meridian Capital's 90-day cadence...",
  },
}
```

**Note on `glossaryTerms`:** The field is named `glossaryTerms` in code but the `QualityNarrative` component exposes it to users as "knowledge entries" to avoid internal nomenclature leaking into the UI.

**Consuming components:** `ColdStartDashboard` (smart defaults, predictive suggestion), `QualityNarrative` (org improvement metrics, trend chart), `App.jsx` (`useMemo` call at top level).

---

### 2.5 `qualityNarrative.js`

**Purpose:** Computes the before/after quality story shown on Screen 4 (Quality Narrative). Unlike the other data modules, this one actually **derives values** — it applies enabled upsell deltas to dimension scores to produce the "after" state.

**Exports:**

| Export | Kind | Description |
|--------|------|-------------|
| `generateQualityNarrative(triageData, enabledUpsells, orgIntelligence)` | function | Returns narrative object |

**Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `triageData` | object | The triage output from `App.jsx` (contains `qualityScore` and `upsellOptions`) |
| `enabledUpsells` | `Set<string>` | IDs of upsell options the user has toggled on |
| `orgIntelligence` | object | Return value of `generateOrgIntelligence()` |

**Computation logic:**
1. Reads `triageData.qualityScore.overall` as the `before` score.
2. Iterates `triageData.upsellOptions` — for each enabled upsell, accumulates per-dimension delta boosts.
3. Applies boosts to each dimension, capped at 100.
4. Computes `afterScore` as the average of boosted dimension scores.
5. Projects the `afterScore` onto the March data point in `qualityTrend`.

**Return type:**

```js
{
  beforeAfter: {
    before: 76,               // overall score before upsells
    after: 87,                // overall score after enabled upsells
    dimensions: [
      { name: 'Terminology Accuracy', before: 68, after: 76 },
      { name: 'Fluency & Register',   before: 82, after: 86 },
      // ...
    ],
  },

  orgImprovements: [
    { metric: 'Domain Precision', value: '87%', delta: '+12%', period: '6 months', icon: 'terminology' },
    { metric: 'Avg. Quality Score', value: '91',  delta: '+9 pts', period: '6 months', icon: 'target' },
    // ...2 more (Regulatory Compliance Rate, Agent Memory Leverage)
  ],

  qualityTrend: [
    { month: 'Oct', score: 82, projects: 18 },
    // ...through Mar with score = computed afterScore
  ],

  cumulativeIntelligence: {
    glossaryTermsLearned: 1247,   // from orgIntelligence.orgPatterns.glossaryTerms
    glossaryTermsThisProject: 23,
    patternsCaptured: 342,
    reusableSegments: 1893,
    timeSavedHours: 47,
  },
}
```

**Important:** `orgImprovements` and `cumulativeIntelligence` are **static**. Only `beforeAfter` and the March entry in `qualityTrend` change based on inputs. This means the "improvement story" is fixed narrative copy regardless of which file was uploaded.

**Consuming components:** `QualityNarrative` (Screen 4).

---

## 3. Inline Generators (`App.jsx`)

Eight private functions live at the bottom of `App.jsx` (lines ~830–1033). They are not exported, not importable, and are called only inside `handleFileAccepted`. **All eight should be extracted to `src/data/`** (see §8).

### Shared helper

```js
// Private to App.jsx
function primaryLocale(sc) {
  const locales = sc.targetLocales || (sc.targetLocale ? [sc.targetLocale] : [])
  return locales[0] || ''
}
```

Note: `discoveryFindings.js` has a different `primaryLocale` that reads `sc.locales[0]` — these two helpers are **not the same function** and read different property names from the structured context object.

### Decision matrix

All 8 functions share the same branching strategy:

```
file.extension → isVideo? isJapan? isFinancial?
         ├── ja + financial/pdf  →  JP Financial path
         ├── video extension     →  Video path
         └── everything else     →  Generic path
```

`isFinancial` = `ext === 'pdf'` OR `sc.industryVertical?.toLowerCase().includes('financial')`

---

### `getClassification(file)`

Returns a human-readable file description string. No structured context needed.

```js
// Examples by extension:
'mp4' → '3-minute MP4 Video, English Audio Detected'
'pdf' → '19-page PDF, English Earnings Report'
'docx' → '12-page Word Document, English'
'xlsx' → 'Multi-sheet Excel Workbook (2.4 MB)'
'pptx' → '15-slide Presentation Deck'
```

Page count is derived from `Math.max(1, Math.round(file.size / 25000))`. Video duration is `Math.max(1, Math.round(file.size / (5 * 1024 * 1024)))` minutes.

---

### `getIntent(file, sc)`

Returns the processing intent label string shown in the triage header. Primary locale drives the output; extension is used to distinguish video paths.

```js
// Examples:
locale='ja', non-video  →  'Japanese Financial Processing (J-GAAP Compliance)'
locale='ja', video      →  'Japanese Video Processing with Lip-Sync'
locale='de'             →  'EU Regulatory Processing (IFRS Compliance)'
locale='zh'             →  'Mandarin Financial Processing (CAS Compliance)'
locale='fr'             →  'French Market Processing (EU Compliance)'
locale='ko'             →  'Korean Market Processing (K-IFRS Compliance)'
locale='ar'             →  'Arabic Market Processing (RTL Adaptation)'
video, any other locale →  'Multi-Market Video Processing'
pdf, any other locale   →  'Financial Processing'
default                 →  'Document Processing & Compliance Review'
```

---

### `getAgent(file, sc)`

Returns the primary agent descriptor. Used to populate the "specialist agent selected" field in triage.

```js
// Return type:
{ name: string, id: string }

// Examples:
locale='ja', non-video  →  { name: 'Japan Financial Regulatory Agent', id: 'JP-FIN-3' }
locale='ja', video      →  { name: 'Japan Media Processing Agent', id: 'JP-MEDIA-7' }
locale='de'             →  { name: 'EU Regulatory Compliance Agent', id: 'EU-REG-5' }
locale='zh'             →  { name: 'China Financial Standards Agent', id: 'CN-FIN-2' }
locale='ko'             →  { name: 'Korea Financial Regulatory Agent', id: 'KR-FIN-1' }
locale='ar'             →  { name: 'Arabic Processing & RTL Agent', id: 'AR-LOC-3' }
video, other locale     →  { name: 'Global Media Processing Agent', id: 'GL-MEDIA-1' }
default                 →  { name: 'Enterprise Document Agent', id: 'EN-DOC-4' }
```

Note: `JP-MEDIA-7`, `CN-FIN-2`, `GL-MEDIA-1`, and `EN-DOC-4` are referenced here but **do not appear in `marketplaceAgents.js`** — they are orphaned IDs.

---

### `getPlan(file, sc)`

Returns the processing plan object, which today only contains guardrails. Stub for a fuller plan structure.

```js
// Return type:
{ guardrails: string[] }

// JP Financial (5 guardrails):
[
  'GAAP to J-GAAP terminology mapping',
  'Yen denomination & fiscal calendar alignment',
  'TSE disclosure format compliance',
  'Keigo (formal register) enforcement',
  'Hankaku/Zenkaku number standardization',
]

// Video (5 guardrails):
[
  'Phoneme-level lip-sync alignment',
  'Cultural gesture & visual compliance',
  'Audio waveform quality assurance',
  'Subtitle timing & positioning',
  'Brand voice consistency check',
]

// Generic (5 guardrails):
[
  'Regulatory terminology verification',
  'Numerical precision & currency formatting',
  'Legal disclaimer processing',
  'Brand guideline compliance',
  'Cultural sensitivity review',
]
```

---

### `getSourceIQ(file, sc)`

Returns the Source IQ analysis object — complexity dimensions with benchmark comparisons and per-dimension findings.

```js
// Return type:
{
  overall: number,    // 0–100
  label: string,      // 'High Complexity' | 'Moderate Complexity'
  summary: string,
  dimensions: [
    {
      name: string,   // 'Terminology Density' | 'Reading Level' | 'Regulatory Complexity' | 'Cultural Adaptation'
                      //  (video: 'Audio Complexity' | 'Visual Text' | 'Lip-Sync Difficulty' | 'Cultural Adaptation')
      score: number,
      icon: string,   // 'terminology' | 'reading' | 'regulatory' | 'cultural'
      benchmark: {
        average: number,
        context: string,  // human-readable delta description
      },
      findings: [
        {
          severity: 'critical' | 'major' | 'minor',
          delta: number,  // negative — score penalty
          text: string,
        }
      ],
    }
  ],
}
```

**Path scores:**

| Path | overall | dim scores |
|------|---------|------------|
| JP Financial | 73 | 68, 82, 61, 77 |
| Video | 65 | 58, 72, 61, 80 |
| Generic | 82 | 85, 88, 79, 90 |

---

### `getQualityScore(file, sc)`

Returns the quality score projection object — the baseline estimate and per-dimension potential scores shown on Screen 2/3 and consumed by `useQualityCalculator`.

```js
// Return type:
{
  overall: number,     // baseline overall score
  potential: number,   // achievable with full upsells
  label: 'Baseline Estimate',
  summary: string,
  dimensions: [
    {
      name: string,    // e.g. 'Terminology Accuracy', 'Fluency & Register', etc.
      score: number,   // baseline
      potential: number,
      icon: string,    // 'terminology' | 'reading' | 'regulatory' | 'cultural'
    }
  ],
}
```

**Path scores:**

| Path | overall / potential | dim names |
|------|--------------------|----|
| JP Financial | 76 / 89 | Terminology Accuracy, Fluency & Register, Regulatory Compliance, Cultural Adaptation |
| Video | 71 / 86 | Output Accuracy, Lip-Sync Precision, Audio Quality, Cultural Adaptation |
| Generic | 84 / 93 | Terminology Accuracy, Fluency & Register, Regulatory Compliance, Cultural Adaptation |

This object is stored in `triageData.qualityScore` and passed to `useQualityCalculator` as `baseScore`.

---

### `getUpsellOptions(file, sc)`

Returns the 3 upsell cards for the triage/quality screen. Each option carries an `impact` array that maps dimension names to score deltas — these are consumed directly by `useQualityCalculator` and `generateQualityNarrative`.

```js
// Return type: UpsellOption[]
{
  id: string,          // 'glossary' | 'model-pack' | 'human-review'
  icon: string,        // 'bookOpen' | 'cpu' | 'userCheck'
  title: string,
  description: string,
  impact: [
    { dimension: string, delta: string }  // delta is a string like '+8' (parsed with parseInt)
  ],
  tag: 'Recommended' | 'Premium' | 'Enterprise',
}
```

**Delta values by path:**

| Path | glossary | model-pack | human-review |
|------|----------|------------|--------------|
| JP Financial | Terminology +8 | Terminology +4, Regulatory +6 | Regulatory +6, Cultural +3 |
| Video | Lip-Sync +10 | Output +5, Audio +4 | Cultural +5, Output +3 |
| Generic | Terminology +6 | Terminology +4, Regulatory +6 | Regulatory +4, Cultural +4 |

**Critical coupling:** The `dimension` strings in `impact` must exactly match the `name` strings in `getQualityScore`'s `dimensions` array. A mismatch silently produces no boost. See §8.

---

### `getSandboxPreview(file, sc)`

Returns the translation sandbox preview shown at the bottom of the triage panel.

```js
// Return type:
{
  type: 'document',
  scope: 'First 2 pages',
  segments: [
    {
      source: string,
      target: string,
      annotations: [
        { type: 'regulatory' | 'terminology' | 'currency' | 'cultural', label: string }
      ],
    }
  ],
  stats: {
    segmentsProcessed: number,
    terminologyMatches: number,
    guardrailsApplied: number,
  },
}
```

**JP Financial path** returns 2 segments with regulatory, terminology, and currency annotations (real JP financial translation examples). **Generic path** returns 1 segment (a French legal placeholder). There is no video-specific sandbox path — videos fall through to the generic branch.

---

## 4. Component-Local Data

These files live inside component directories and contain pure static arrays. They have no dependency on `structuredContext` and are not parametric.

### 4.1 `Integrations/data.js`

**Path:** `src/components/Integrations/data.js`

**Purpose:** All static configuration for the IntegrationsHub — connectors catalogue, workflow trigger types, condition types, per-connector actions, and workflow templates.

**Exports:**

| Export | Type | Contents |
|--------|------|----------|
| `CONNECTORS` | `Connector[]` | 26 integration connectors across 9 categories |
| `CATEGORIES` | `string[]` | 10 category filter labels including `'All'` |
| `TRIGGERS` | `Trigger[]` | 12 workflow trigger events tied to pipeline steps |
| `CONDITION_TYPES` | `ConditionType[]` | 6 conditional filter types with option arrays |
| `CONNECTOR_ACTIONS` | `Record<string, ConnectorAction[]>` | Per-connector action definitions with field lists |
| `WORKFLOW_TEMPLATES` | `WorkflowTemplate[]` | 6 pre-built workflow automations |

**Connector shape:**

```js
{
  id: 'google-drive',
  name: 'Google Drive',
  category: 'File Storage',   // matches CATEGORIES entries
  color: '#4285F4',            // hex — used for avatar background
  letter: 'G',                 // avatar letter when no icon available
}
```

**Workflow template shape:**

```js
{
  id: 't1',
  name: 'Notify team on completion',
  description: 'Send a Slack message when a document is approved.',
  trigger: 'review-approved',  // matches a TRIGGERS[n].id
  condition: null,              // or { type: string, value: string }
  actions: [
    {
      connectorId: 'slack',
      actionId: 'slack-message',
      config: { channel: '#deliveries', message: '✅ {{document.name}} has been approved.' }
    }
  ],
}
```

Template variables in `config` values (`{{document.name}}`, `{{quality.score}}`, etc.) are display placeholders — no substitution engine exists in the prototype.

**Consuming components:** `IntegrationsHub` and all its sub-panels.

---

### 4.2 `IntelligenceMarketplace/data/`

Two files:

#### `marketplaceAgents.js`

**Path:** `src/components/IntelligenceMarketplace/data/marketplaceAgents.js`

**Purpose:** Full catalogue of marketplace agents with deep metadata for the agent detail drawer.

**Exports:**

| Export | Type | Description |
|--------|------|-------------|
| `MARKETPLACE_AGENTS` (default) | `MarketplaceAgent[]` | 16 agents/models (13 active, 3 `coming_soon`) |
| `LIBRARY_AGENTS` | `MarketplaceAgent[]` | 5-agent curated subset shown in the "Library" tab |
| `MOCK_REVIEWS` | `Review[]` | 5 static review objects for detail panel |

**Agent shape (abbreviated):**

```js
{
  id: 'JP-FIN-3',
  name: 'J-GAAP Specialist',
  status: 'active',           // 'active' | 'coming_soon'
  type: 'Agent',              // 'Agent' | 'Base Model' | 'Fine-Tuned Model'
  icon: 'Shield',             // lucide icon name
  provider: 'Straker',        // 'Straker' | 'Meridian Capital' (the org's own digital twin)
  category: 'Financial',
  industry: ['financial'],
  languages: ['en', 'ja'],
  contentTypes: ['earnings reports', ...],
  tags: ['J-GAAP', 'ASBJ', 'TSE Compliance', 'Keigo'],
  scores: { accuracy: 94, speed: 85, tone: 88, regulatory: 96 },  // 0–100
  trustScore: 95,
  termCount: '1,250+',
  termSource: 'GAAP / ASBJ',
  capabilityBullets: string[],
  sampleTerms: [
    { term: 'Revenue Recognition', baseline: '収益認識', agentOutput: '収益認識（ASBJ第29号）' }
  ],
  usedBy: 312,
  rating: 4.9,
  reviewCount: 247,
  description: string,         // short (1-2 sentence)
  longDescription: string,     // paragraph for detail drawer
  compliance: {
    certifications: ['SOC 2 Type II', 'ISO 27001', 'GDPR'],
    dataResidency: ['US', 'JP', 'EU'],
    privacyRating: 5,          // 1–5
    biasAuditScore: 96,
    trainingDataProvenance: string,
    lastAuditDate: '2026-02-15',
  },
  technical: {
    baseModel: 'Claude 3.5 Sonnet',
    version: 'v4.2',
    versionHistory: [
      { version: 'v4.2', date: '2026-02-01', notes: 'Added ASC 842 lease standard mapping' },
    ],
    contextWindow: '200K tokens',
    avgLatency: '0.8s/segment',
  },
  integration: {
    deploymentOptions: ['on-demand', 'always-on'],
    apiEndpoint: '/api/v2/agents/JP-FIN-3/process',
    configExample: { agent_id: 'JP-FIN-3', mode: 'compliance', ... },
  },
  roi: { avgQualityLift: 18, avgTimeSaved: '3.1 hours/project', tier: 'Premium' },
  testDrive: {
    before: string,
    after: string,
    baselineScore: 72,
    boostedScore: 96,
  },
  featured: true,
  recommendedFor: ['financial'],
}
```

**Catalogue breakdown:**

| Category | IDs |
|----------|-----|
| Financial | JP-FIN-3, EU-REG-5, KR-FIN-1, BASE-FIN-1 |
| Legal | LEGAL-2, BIAS-DET-1, PAT-1 |
| Marketing | MKT-SPEC-1, BV-SENT-1, SENT-RT-1, ECOM-1 |
| Medical | MED-1, DE-MED-1 |
| Technical | TECH-DOC-2, BASE-GEN-1 |
| Regional | AR-LOC-3 |
| Coming soon | HC-CLIN-1, LEGAL-CS-1, ENG-TECH-1 |

**Note:** The Digital Twin agent `MER-DT-1` has `provider: 'Meridian Capital'` and `usedBy: 1` — it represents the demo org's custom-trained model, not a Straker product.

`LIBRARY_AGENTS` is a filtered subset: `['JP-FIN-3', 'EU-REG-5', 'HC-CLIN-1', 'LEGAL-CS-1', 'ENG-TECH-1']` — it includes two `coming_soon` agents, so any consumer rendering LIBRARY_AGENTS must handle the `status` field.

---

#### `marketplaceCategories.js`

**Path:** `src/components/IntelligenceMarketplace/data/marketplaceCategories.js`

**Purpose:** Filter/sort configuration for the marketplace UI.

**Exports:**

| Export | Type | Description |
|--------|------|-------------|
| `AGENT_TYPES` | `string[]` | `['All', 'Agent', 'Base Model', 'Fine-Tuned Model']` |
| `INDUSTRIES` | `{ value, label }[]` | 7 industry filter options |
| `LANGUAGES` | `{ value, label }[]` | 11 language filter options |
| `COMPLIANCE_FILTERS` | `string[]` | `['Any', 'SOC 2', 'HIPAA', 'GDPR', 'ISO 27001']` |
| `SORT_OPTIONS` | `{ value, label }[]` | 5 sort modes |
| `TYPE_COLORS` | `Record<string, { bg, text }>` | Tailwind class maps for type badges |
| `ICON_COLOR_MAP` | `Record<string, string>` | Lucide icon name → hex colour for agent card icons |

**Consuming components:** `IntelligenceMarketplace` filter bar and card rendering.

---

## 5. Custom Hooks (`src/hooks/`)

### 5.1 `useQualityCalculator`

**File:** `src/hooks/useQualityCalculator.js`

**Purpose:** Reactively recomputes the quality score object whenever the user toggles upsell options. Wraps the dimension boost logic in `useMemo` so components don't have to manage the derivation themselves.

**Signature:**

```js
function useQualityCalculator(
  baseScore,      // object | null — from getQualityScore()
  upsellOptions,  // UpsellOption[] — from getUpsellOptions()
  enabledUpsells  // Set<string> — IDs of toggled upsells
): ComputedQualityScore | null
```

**Returns:** A new quality score object with the same shape as `baseScore` but with dimension scores and `overall` updated, or `null`/the original if `baseScore` is falsy.

**Logic:**
1. Clones all dimension objects (avoids mutating the original).
2. For each `opt` in `upsellOptions` where `enabledUpsells.has(opt.id)`, iterates `opt.impact` and adds each delta (parsed as int) to the matching dimension, capped at 100.
3. Recalculates `overall` as `Math.round(average of all dimension scores)`.

**Dependencies:** `[baseScore, upsellOptions, enabledUpsells]` — re-runs on any change to any of the three. `Set` identity must be stable (use `useState` or `useMemo` for `enabledUpsells`).

**Consuming components:** `App.jsx` (result stored as `computedQuality` state, passed to `QualityNarrative` and `CommandUpload`).

---

### 5.2 `useKnowledgeRules`

**File:** `src/hooks/useKnowledgeRules.js`

**Purpose:** Manages the user's knowledge rules (terminology overrides) with localStorage persistence. Provides CRUD operations and a simulated AI-driven bulk realignment engine.

**Signature:**

```js
function useKnowledgeRules(): {
  rules: KnowledgeRule[],
  addRule: (rule: Partial<KnowledgeRule>) => KnowledgeRule,
  removeRule: (id: string) => void,
  createRealignment: (rule, segments, lockedIds, callbacks) => { start, cancel, total },
}
```

**`KnowledgeRule` shape:**

```js
{
  id: 'kr-seed-001',           // 'kr-seed-NNN' for seeds, 'kr-{Date.now()}' for user-created
  sourceTerm: 'ASC 350',
  targetTerm: '企業会計基準第10号',
  contextNote: 'TSE filing context — always use ASBJ standard reference',
  createdFrom: 'seg-042',      // segment ID the rule was derived from
  createdAt: '2025-11-15T09:23:00.000Z',
  verifiedBy: 'Kenji Tanaka',  // name shown in rule cards
}
```

**Seed rules:** 5 pre-loaded EN→JA accounting term mappings (ASC 350, ASC 606, goodwill impairment, forward-looking statements, operating expenses). Seeded to `localStorage` on first load if the key is missing or empty.

**`createRealignment(rule, segments, lockedIds, { onProgress, onComplete })`:**

Returns a control object `{ start, cancel, total }`. Calling `start()` begins a `setInterval` (500ms tick) that processes one candidate segment per tick:

- **Candidates:** segments not in `lockedIds` whose `translation` contains `rule.sourceTerm`
- **Realignment probability:** 80% per candidate (simulates AI contextual judgment)
- **`onProgress({ processed, total, realigned })`** called each tick
- **`onComplete(realigned)`** called when all candidates are processed or `cancel()` is called

This is the only hook that uses `setInterval` internally (tracked via `intervalRef`).

**localStorage:** Key `nv-knowledge-rules`. Reads on mount, writes on every `addRule`/`removeRule`. Falls back to seed rules on parse error.

**Consuming components:** `OrgBrain`, `HumanReview` (knowledge rule creation from segments), `QualityNarrative` (rule count display).

---

### 5.3 `useFocusTrap`

**File:** `src/hooks/useFocusTrap.js`

**Purpose:** Accessibility utility — traps keyboard focus within a modal/drawer while it is active, and restores focus to the previously focused element on deactivation. WCAG 2.1 §2.1.2 compliance.

**Signature:**

```js
function useFocusTrap(
  ref: React.RefObject<HTMLElement>,
  isActive: boolean
): void
```

**Parameters:**

| Param | Description |
|-------|-------------|
| `ref` | Ref to the container element that should trap focus |
| `isActive` | Whether the trap is currently active (typically matches `isOpen` for modals) |

**Behaviour:**
- When `isActive` becomes `true`: queries all focusable elements using `FOCUSABLE` selector (anchors, enabled buttons/inputs/selects/textareas, positive tabindex elements), focuses the first one via `requestAnimationFrame`, and intercepts `Tab`/`Shift+Tab` to cycle within the set.
- When `isActive` becomes `false` (cleanup): removes the keydown listener and calls `.focus()` on the element that was focused before the trap activated.

**No return value.** Side-effects only.

**Consuming components:** All full-screen overlays and drawers that have `isOpen` props: `IntelligenceMarketplace`, `CustomAgentStudio`, `AgentProfile`, `ParametersDrawer`, `TeamDirectory`.

---

### 5.4 `useMediaQuery`

**File:** `src/hooks/useMediaQuery.js`

**Purpose:** Reactive wrapper around `window.matchMedia`. Returns a boolean that updates whenever the media query result changes.

**Signature:**

```js
function useMediaQuery(query: string): boolean
```

**Parameters:**

| Param | Description |
|-------|-------------|
| `query` | CSS media query string, e.g. `'(max-width: 767px)'` |

**Returns:** `true` if the query currently matches, `false` otherwise. SSR-safe — returns `false` if `window` is not defined on first render.

**Implementation:** Initialises from `window.matchMedia(query).matches`, then attaches a `change` event listener to the `MediaQueryList` for reactive updates.

**Consuming hooks/components:**
- `useReducedMotion` (see §5.5)
- `App.jsx` — `const isMobile = useMediaQuery('(max-width: 767px), (max-width: 1024px) and (max-height: 500px)')` — controls whether `MobileBlocker` is shown

---

### 5.5 `useReducedMotion`

**File:** `src/hooks/useReducedMotion.js`

**Purpose:** Convenience hook — returns `true` when the OS/browser has requested reduced motion. Used to disable or simplify CSS animations and JS-driven transitions throughout the app.

**Signature:**

```js
function useReducedMotion(): boolean
```

**Implementation:** Thin wrapper — calls `useMediaQuery('(prefers-reduced-motion: reduce)')`.

**Consuming components:** Animation-heavy components such as `AgentAssemblyTransition`, `TimeJumpTransition`, `LiveTelemetry`, and any component using Framer Motion or CSS keyframe animations.

---

## 6. Utility Functions (`src/utils/scoreColors.js`)

This module exports display helpers and Tailwind class maps used throughout the scoring UI. No computation — all functions are pure mappings from score numbers to CSS class strings.

**Exports:**

### Constants

| Export | Type | Description |
|--------|------|-------------|
| `dimensionIcons` | `Record<string, LucideIcon>` | Maps dimension key → Lucide React icon component: `{ terminology: Brain, reading: BookOpen, regulatory: Scale, cultural: Globe }` |
| `severityConfig` | `Record<string, SeverityStyle>` | Tailwind classes for `critical`, `major`, `minor` severity levels |
| `annotationColors` | `Record<string, AnnotationStyle>` | Tailwind classes for 4 annotation types: `regulatory`, `terminology`, `currency`, `cultural` |
| `tagColors` | `Record<string, string>` | Tailwind classes for upsell tier badges: `Recommended`, `Premium`, `Enterprise` |

**Shape examples:**

```js
severityConfig.critical = {
  color:   'text-red-400',
  bg:      'bg-red-500/10',
  border:  'border-red-500/20',
  label:   'critical',
  tooltip: 'Critical Issue',
}

annotationColors.regulatory = {
  bg:     'bg-teal-500/10',
  text:   'text-teal-400',
  border: 'border-teal-500/20',
}

tagColors.Premium = 'text-violet-400 bg-violet-500/10'
```

### Functions

#### `getScoreColor(score: number): { text: string, bar: string }`

Maps a 0–100 score to text and progress bar Tailwind classes.

```
score >= 85  →  { text: 'text-emerald-400', bar: 'bg-emerald-400' }  // green
score >= 70  →  { text: 'text-amber-400',   bar: 'bg-amber-400'   }  // amber
score < 70   →  { text: 'text-red-400',     bar: 'bg-red-400'     }  // red
```

#### `getOverallColor(score: number): { ring: string, text: string, badge: string }`

Maps a score to ring border, text, and badge Tailwind classes. Same thresholds as `getScoreColor` (85 / 70).

```
score >= 85  →  { ring: 'border-emerald-400/30', text: 'text-emerald-400', badge: 'text-emerald-400 bg-emerald-500/10' }
```

#### `getQualityColor(score: number): { ring: string, text: string, badge: string, stroke: string }`

Same as `getOverallColor` but includes a `stroke` class for SVG elements, and uses a different mid-range threshold:

```
score >= 85  →  emerald
score >= 65  →  straker (brand blue-green: 'text-straker-400')  ← different from getOverallColor's 70
score < 65   →  red
```

**Note:** `getOverallColor` and `getQualityColor` have different mid-range thresholds (70 vs 65) and `getQualityColor` uses the brand `straker-*` colour scale for the mid range rather than amber. This is intentional — the quality ring uses brand colour; the SourceIQ dimensions use amber.

#### `formatSize(bytes: number): string`

Formats byte counts to human-readable strings.

```
< 1024         →  '512 B'
< 1,048,576    →  '24.3 KB'
≥ 1,048,576    →  '2.4 MB'
```

**Consuming components:** All score-displaying components — `CommandUpload`, `QualityNarrative`, `HumanReview`, `CampaignResultsView`, `AgentWarRoom`.

---

## 7. localStorage Usage

Only one hook uses `localStorage`. No component writes directly.

| Key | Hook | Schema | Behaviour |
|-----|------|--------|-----------|
| `nv-knowledge-rules` | `useKnowledgeRules` | `KnowledgeRule[]` (JSON array) | Read on mount; write on every `addRule`/`removeRule`. Seeded with 5 JP financial rules on first load (missing key or empty array). Falls back to seed rules on `JSON.parse` error. |

**No TTL or migration logic.** If the schema changes in a future iteration, stale data in `localStorage` will be silently replaced with seeds (because a schema mismatch would likely cause the rules array to be empty or throw on access, triggering the fallback).

---

## 8. Refactoring Recommendations

### 8.1 Extract inline generators from `App.jsx`

The eight functions (`getClassification`, `getIntent`, `getAgent`, `getPlan`, `getSourceIQ`, `getQualityScore`, `getUpsellOptions`, `getSandboxPreview`) should move to `src/data/triageGenerators.js`. They share a single branching strategy and could expose a single entry point:

```js
// Proposed: src/data/triageGenerators.js
export function generateTriageData(file, structuredContext) {
  return {
    classification: getClassification(file),
    intent:         getIntent(file, structuredContext),
    agent:          getAgent(file, structuredContext),
    plan:           getPlan(file, structuredContext),
    sourceIQ:       getSourceIQ(file, structuredContext),
    qualityScore:   getQualityScore(file, structuredContext),
    upsellOptions:  getUpsellOptions(file, structuredContext),
    sandboxPreview: getSandboxPreview(file, structuredContext),
  }
}
```

This would make `handleFileAccepted` in `App.jsx` a one-liner and make the generators independently testable.

### 8.2 Reconcile the two `primaryLocale` helpers

`discoveryFindings.js` reads `structuredContext.locales[0]`, while `App.jsx` reads `structuredContext.targetLocales[0]`. These are different property names on the same conceptual object. Both should read the same property. One approach:

```js
// src/data/utils.js
export function primaryLocale(sc) {
  const locales = sc?.targetLocales ?? sc?.locales ?? []
  return locales[0] || ''
}
```

Export it, import it in both places. The inconsistency currently means the discovery stream in `discoveryFindings.js` never takes the JP Financial branch when called from the real app flow (because `structuredContext.locales` is always undefined — the real property is `targetLocales`).

### 8.3 Fix orphaned agent IDs in `getAgent`

The IDs `JP-MEDIA-7`, `CN-FIN-2`, `GL-MEDIA-1`, and `EN-DOC-4` appear in `getAgent()` but have no corresponding entries in `MARKETPLACE_AGENTS`. Any component that tries to look up agent details by these IDs will get `undefined`. Either:
- Add stub entries to `marketplaceAgents.js`, or
- Map these IDs to the closest existing agents (`JP-MEDIA-7` → `JP-FIN-3`, `GL-MEDIA-1` → `MKT-SPEC-1`, etc.)

### 8.4 Harden the upsell dimension name coupling

The `impact[].dimension` strings in `getUpsellOptions` must exactly match the `dimensions[].name` strings in `getQualityScore`. A typo silently produces zero boost with no error. Options:

```js
// Option A: shared constants
export const DIMENSIONS = {
  TERMINOLOGY: 'Terminology Accuracy',
  FLUENCY:     'Fluency & Register',
  REGULATORY:  'Regulatory Compliance',
  CULTURAL:    'Cultural Adaptation',
}

// Option B: validate in useQualityCalculator (dev-mode warning)
if (dim === undefined && process.env.NODE_ENV === 'development') {
  console.warn(`[useQualityCalculator] Unknown dimension: "${impact.dimension}"`)
}
```

### 8.5 Extract component-local data if reused across boundaries

`Integrations/data.js` and `IntelligenceMarketplace/data/` are currently private to their component trees. If the `connectedIntegrations` state in `App.jsx` needs richer connector metadata, the connector list should move to `src/data/integrations.js`. Same principle applies to agent data if the Agent War Room or triage screens start referencing marketplace agent IDs.

### 8.6 Add a localStorage migration guard to `useKnowledgeRules`

The current fallback on parse error is silent. A version field would allow safe schema migration without wiping user data:

```js
const STORAGE_VERSION = 1

function loadRules() {
  const raw = localStorage.getItem(STORAGE_KEY)
  const stored = raw ? JSON.parse(raw) : null
  if (!stored || stored.version !== STORAGE_VERSION || !stored.rules?.length) {
    saveRules(SEED_RULES)
    return SEED_RULES
  }
  return stored.rules
}
```

### 8.7 Consider a data context instead of prop-drilling `orgIntelligence`

`orgIntelligence` is instantiated once in `App.jsx` and threaded through multiple layers: `App` → `QualityNarrative` → `generateQualityNarrative`. Given it never changes at runtime, a React context (or a module-level singleton) would eliminate the prop chain without adding complexity.
