# Straker.AI — Adaptive Command Surface
## 4-Screen Clickable Prototype Specification

**Version:** 1.0
**Date:** 22 March 2026
**Author:** Principal Product Design, Straker.AI
**Scenario Persona:** Elena Vasquez, Enterprise Localization Admin, Acme Corp (Financial Services)
**Context:** Q3 Earnings Report cycle. October. 156 prior projects. 90-day cadence. Target locales: JA, DE, ZH.

---

## Design System Reference

| Token | Value | Usage |
|---|---|---|
| `navy-900` | `#0f1628` | Page background |
| `navy-800` | `#151d35` | Card fill |
| `navy-700` | `#1c2642` | Elevated card / hover |
| `straker-500` | `#5c7cfa` | Primary accent, CTAs |
| `straker-400` | `#748ffc` | Hover states, active rings |
| `emerald-400` | `#34d399` | Success, high scores |
| `amber-400` | `#fbbf24` | Warning, mid scores |
| `red-400` | `#f87171` | Critical, low scores |
| Font sans | Inter | All UI text |
| Font mono | JetBrains Mono | Scores, stats, code |
| Border radius | `rounded-2xl` (16px) | Cards |
| Border | `1px solid rgba(255,255,255,0.06)` | Card edges |
| Motion | Framer Motion spring `{stiffness:300, damping:20}` | All transitions |

---

## Screen 1 — The Intelligent Dashboard (Hero Co-pilot)

### Purpose
Elena opens Straker.AI and is immediately greeted by a system that *already knows what she needs*. The AI co-pilot occupies the hero position — not a sidebar afterthought — making the predicted next project the gravitational center of the experience.

### Layout (1440px viewport)

```
┌─────────────────────────────────────────────────────────────┐
│  TOP BAR  (h-14, navy-800, border-b white/[0.06])          │
│  ┌──────┐                              ┌───┐ ┌───────────┐ │
│  │ Logo │   Straker.AI                 │ ? │ │ E.Vasquez │ │
│  └──────┘                              └───┘ └───────────┘ │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─── LEFT COLUMN (flex-1, max-w-[420px]) ────────────┐    │
│  │                                                     │    │
│  │  GREETING BLOCK                                     │    │
│  │  "Good morning, Elena."              (text-2xl)     │    │
│  │  "156 projects · 2.4M words"         (text-sm,      │    │
│  │                                       slate-400)    │    │
│  │                                                     │    │
│  │  ┌─ RECENT PROJECTS ─────────────────────────┐      │    │
│  │  │  3 cards, stacked                          │      │    │
│  │  │  Q2 Earnings → JA,DE,ZH · 92% · Jul 14    │      │    │
│  │  │  Product Launch → JA,FR · 88% · Sep 3      │      │    │
│  │  │  Employee Handbook → DE,ES · 91% · Sep 28  │      │    │
│  │  └────────────────────────────────────────────┘      │    │
│  │                                                     │    │
│  │  ┌─ YOUR LOCALES ────────────────────────────┐      │    │
│  │  │  6 locale pills: JA DE ZH FR ES KO        │      │    │
│  │  │  Each shows: trending arrow + avg quality  │      │    │
│  │  └────────────────────────────────────────────┘      │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌─── CENTER HERO (flex-[1.6]) ───────────────────────┐    │
│  │                                                     │    │
│  │  ┌─ PREDICTIVE CO-PILOT CARD ─────────────────┐    │    │
│  │  │                                             │    │    │
│  │  │  [Bot icon, straker-400, breathing glow]    │    │    │
│  │  │                                             │    │    │
│  │  │  "It's Q3 Earnings season."       (text-xl) │    │    │
│  │  │                                             │    │    │
│  │  │  "Based on Acme Corp's 90-day cadence,     │    │    │
│  │  │   your Q3 Earnings Report is due for        │    │    │
│  │  │   localization. I've pre-loaded your        │    │    │
│  │  │   J-GAAP glossary (1,247 terms) and         │    │    │
│  │  │   set your usual JA · DE · ZH targets."     │    │    │
│  │  │                         (text-base, slate-300│    │    │
│  │  │                          leading-relaxed)    │    │    │
│  │  │                                             │    │    │
│  │  │  ┌─ PRE-LOADED CONFIG PILLS ─────────────┐ │    │    │
│  │  │  │ [JA] [DE] [ZH]    (straker-500/15 bg)  │ │    │    │
│  │  │  │ [Financial]       (amber-500/15 bg)     │ │    │    │
│  │  │  │ [J-GAAP Glossary] (emerald-500/15 bg)  │ │    │    │
│  │  │  └────────────────────────────────────────┘ │    │    │
│  │  │                                             │    │    │
│  │  │  ┌──────────────────────────────────────┐   │    │    │
│  │  │  │  "Start Q3 Earnings Project"  →      │   │    │    │
│  │  │  │  (straker-600, full-width, h-12)     │   │    │    │
│  │  │  └──────────────────────────────────────┘   │    │    │
│  │  │                                             │    │    │
│  │  │  "or drop any file to start fresh"          │    │    │
│  │  │  (text-xs, slate-500, center)               │    │    │
│  │  │                                             │    │    │
│  │  └─────────────────────────────────────────────┘    │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌─── RIGHT COLUMN (max-w-[260px]) ──────────────────┐     │
│  │                                                    │     │
│  │  ┌─ ORG HEALTH ──────────────────────────────┐    │     │
│  │  │  Avg Quality    91%   ↑ +9pts / 6mo        │    │     │
│  │  │  Terminology    87%   ↑ +12% / 6mo         │    │     │
│  │  │  Compliance     98.5% ↑ +3.2% / 3mo        │    │     │
│  │  │  TM Leverage    34%   ↑ +18% / 6mo         │    │     │
│  │  └────────────────────────────────────────────┘    │     │
│  │                                                    │     │
│  │  ┌─ SMART DEFAULTS ──────────────────────────┐    │     │
│  │  │  Animated border breathing effect          │    │     │
│  │  │  "Your defaults learn from every project"  │    │     │
│  │  │  Vertical: Financial                       │    │     │
│  │  │  Tone: Formal                              │    │     │
│  │  └────────────────────────────────────────────┘    │     │
│  └────────────────────────────────────────────────────┘     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Visual Hierarchy (top-down reading order)

1. **Greeting** — top-left anchor. Elena sees her name. Grounded, personal.
2. **Co-pilot card** — center hero, largest element on screen. Navy-800 card with a subtle `straker-500/10` gradient border that breathes (opacity oscillates 0.08→0.15 over 3s). The `Bot` icon pulses with a soft glow ring (`box-shadow: 0 0 20px rgba(92,124,250,0.3)`).
3. **Config pills** — scannable at a glance. Three locale badges, one vertical badge, one glossary badge. Each uses its semantic color family.
4. **CTA button** — full-width, high-contrast `straker-600` with white text. The only primary-weight action on the page.
5. **Recent projects + locales** — supporting context, left column. Lower visual weight.
6. **Org health** — ambient dashboard stats. Right column, smallest text.

### UI Copy — Exact Strings

| Element | Copy |
|---|---|
| Greeting | `Good morning, Elena.` |
| Subtext | `156 projects · 2.4M words processed` |
| Co-pilot headline | `It's Q3 Earnings season.` |
| Co-pilot body | `Based on Acme Corp's 90-day cadence, your Q3 Earnings Report is due for localization. I've pre-loaded your J-GAAP glossary (1,247 terms) and set your usual JA · DE · ZH targets.` |
| Config pill 1 | `JA · DE · ZH` |
| Config pill 2 | `Financial` |
| Config pill 3 | `J-GAAP Glossary · 1,247 terms` |
| CTA | `Start Q3 Earnings Project →` |
| Escape hatch | `or drop any file to start fresh` |
| Section labels | `RECENT PROJECTS` · `YOUR LOCALES` · `ORG HEALTH` |

### Micro-interactions

| Trigger | Animation | Duration |
|---|---|---|
| Page load | Co-pilot card fades up from `y:24, opacity:0` | 600ms, spring |
| Page load | Config pills stagger in left-to-right | 80ms stagger, 400ms each |
| Page load | Bot icon glow ring breathes (opacity 0.15→0.35) | 3s infinite ease-in-out |
| Page load | Border gradient rotates 360deg | 8s infinite linear |
| Hover CTA | `straker-600 → straker-500`, scale 1.01 | 150ms ease |
| Click CTA | Button shrinks to scale 0.97 then springs back | 200ms spring |
| Hover recent project | Card lifts `y:-2`, border brightens to `white/[0.12]` | 200ms ease |
| Click "Re-run" on project | Ripple effect from click point, card glows straker-500/20 | 300ms |
| Hover locale pill | Tooltip: `"Japanese · 42 projects · 94% avg quality"` | 200ms delay |
| Reduced motion | All animations resolve to final state instantly | 0ms |

### Responsive Behavior

| Breakpoint | Behavior |
|---|---|
| `2xl` (≥1536px) | 3-column layout as diagrammed above |
| `xl` (≥1280px) | Right column moves below left column; hero stays center |
| `lg` (≥1024px) | 2-column: left+hero stacked, right becomes horizontal stat bar |
| `md` (≥768px) | Single column, hero card first (priority), then projects, then stats |
| `sm` (<768px) | Mobile blocker (existing behavior) |

---

## Screen 2 — The Command Surface (Smart Upload Zone)

### Purpose
Elena clicks "Start Q3 Earnings Project" (or drags a file). This screen is a *single, unified surface* — not a step in a wizard. The system processes the upload, runs real-time analysis, and presents a projected quality range before she presses "Launch."

### Trigger Transition (Screen 1 → Screen 2)

When Elena clicks the CTA or drops a file:
1. The co-pilot card's border glow intensifies (opacity → 0.5) for 200ms
2. The entire page content cross-fades (`opacity:1→0` over 300ms)
3. Screen 2 fades in from `opacity:0, y:12` over 400ms
4. The file name appears already populated in the header (pre-loaded from co-pilot context, or from the dropped file)

### Layout (1440px viewport)

```
┌──────────────────────────────────────────────────────────────┐
│  TOP BAR  (same as Screen 1)                                 │
├──────────────────────────────────────────────────────────────┤
│  max-w-[1100px], mx-auto, py-10                              │
│                                                              │
│  ┌─── HEADER ──────────────────────────────────────────────┐ │
│  │  "Q3 Earnings Report"                       (text-2xl)  │ │
│  │  "Q3_Earnings_Final.docx · 23 pages · 14,200 words"     │ │
│  │                                   (text-sm, slate-400)   │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌─── LEFT PANEL (flex-[1.2]) ──────┐ ┌─ RIGHT (flex-1) ─┐ │
│  │                                   │ │                    │ │
│  │  ┌─ INTELLIGENT DROP ZONE ──────┐ │ │ ┌─ LIVE BRIEF ──┐│ │
│  │  │                              │ │ │ │                 ││ │
│  │  │  ┌────────────────────────┐  │ │ │ │ AGENT          ││ │
│  │  │  │   [Animated doc icon]  │  │ │ │ │ JP-FIN-3       ││ │
│  │  │  │   with orbiting dots   │  │ │ │ │ ● Online       ││ │
│  │  │  │                        │  │ │ │ │                 ││ │
│  │  │  │   Q3_Earnings_Final    │  │ │ │ │ LOCALES        ││ │
│  │  │  │   .docx                │  │ │ │ │ JA ● DE ● ZH  ││ │
│  │  │  │                        │  │ │ │ │                 ││ │
│  │  │  │   ✓ Uploaded           │  │ │ │ │ VERTICAL       ││ │
│  │  │  │   ✓ Parsed (23 pages)  │  │ │ │ │ Financial      ││ │
│  │  │  │   ● Analyzing...      │  │ │ │ │                 ││ │
│  │  │  └────────────────────────┘  │ │ │ │ GLOSSARY       ││ │
│  │  │                              │ │ │ │ J-GAAP · 1,247 ││ │
│  │  │  ┌─ FINDINGS FEED ────────┐  │ │ │ │ terms loaded   ││ │
│  │  │  │ ⚡ 47 financial terms   │  │ │ │ │                ││ │
│  │  │  │ ⚠ ASC 606/842 mapping  │  │ │ │ │ GUARDRAILS     ││ │
│  │  │  │ ℹ 3 currency formats   │  │ │ │ │ 6 auto-applied ││ │
│  │  │  │ ℹ Cultural adaptation  │  │ │ │ │ ☐ J-GAAP map   ││ │
│  │  │  └────────────────────────┘  │ │ │ │ ☐ ¥/€/¥ fmt    ││ │
│  │  └──────────────────────────────┘ │ │ │ ☐ TSE terms    ││ │
│  │                                   │ │ │ ☐ Keigo        ││ │
│  │  ┌─ PROJECTED QUALITY ─────────┐ │ │ │ ☐ ASC 606/842  ││ │
│  │  │                              │ │ │ │ ☐ Cultural     ││ │
│  │  │  ┌────┐  89-93%             │ │ │ │                 ││ │
│  │  │  │ 91 │  projected range     │ │ │ │────────────────││ │
│  │  │  └────┘  based on 42 prior   │ │ │ │                ││ │
│  │  │          JA financial jobs    │ │ │ │ [Edit Config]  ││ │
│  │  │                              │ │ │ │ (text-sm link) ││ │
│  │  │  Terminology  ████████░░ 86  │ │ │ │                ││ │
│  │  │  Regulatory   █████████░ 92  │ │ │ └────────────────┘│ │
│  │  │  Cultural     ███████░░░ 78  │ │ │                    │ │
│  │  │  Reading      █████████░ 94  │ │ │ ┌─ LAUNCH ──────┐│ │
│  │  │                              │ │ │ │                 ││ │
│  │  │  "+3% with Premium Glossary" │ │ │ │  [Launch        ││ │
│  │  │  (straker-400, text-xs)      │ │ │ │   Translation]  ││ │
│  │  └──────────────────────────────┘ │ │ │  straker-600    ││ │
│  │                                   │ │ │  h-14, text-lg  ││ │
│  └───────────────────────────────────┘ │ │                 ││ │
│                                        │ │  "Est. 4 min"   ││ │
│                                        │ │  (slate-500)    ││ │
│                                        │ └─────────────────┘│ │
│                                        └────────────────────┘ │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### The Drop Zone — Detailed Behavior

**Before file is present (empty state):**
```
┌───────────────────────────────────────┐
│                                       │
│       ┌──────────────────┐            │
│       │    [Upload icon]  │            │
│       │    dashed border  │            │
│       │    straker-500/20 │            │
│       └──────────────────┘            │
│                                       │
│  "Drop your document here"            │
│  "or click to browse"                 │
│  (slate-400, text-sm)                 │
│                                       │
│  Supported: .docx .pdf .pptx .xlsx    │
│  (slate-500, text-xs)                 │
│                                       │
└───────────────────────────────────────┘
```
- Dashed border: `2px dashed rgba(92,124,250,0.3)`
- On drag hover: border becomes solid straker-400, background pulses to `straker-500/10`, scale 1.02

**The Moment Elena Drops "Q3_Earnings_Final.docx":**

This is a **6-second choreographed sequence**. No page navigation. Everything happens in-place.

| Time | Event | Visual |
|---|---|---|
| 0.0s | File drop detected | Drop zone border flashes white for 150ms |
| 0.0s | Upload icon morphs | Upload arrow icon cross-fades to animated document icon (FileText) |
| 0.2s | File name appears | `Q3_Earnings_Final.docx` fades in below icon (text-base, white) |
| 0.3s | Step 1 check | `✓ Uploaded` appears with emerald checkmark, spring scale |
| 0.8s | Step 2 check | `✓ Parsed · 23 pages · 14,200 words` appears |
| 0.8s | Orbiting dots begin | 3 small dots (straker-400) begin orbiting the document icon on an elliptical path |
| 1.0s | Step 3 active | `● Analyzing...` appears with amber pulsing dot |
| 1.0s | Findings feed starts | First finding slides in from left: `"Detecting document structure..."` |
| 1.5s | Finding 2 | `"47 specialized financial terms detected"` — amber badge (major) |
| 2.5s | Finding 3 (critical) | `"ASC 606/842 regulatory mapping required"` — red flash on drop zone border for 400ms |
| 3.0s | Findings 4-6 | Currency, cultural, agent findings stream in (200ms stagger) |
| 3.5s | Orbiting dots stop | Dots converge to center, merge with icon, flash emerald |
| 3.5s | Step 3 check | `● Analyzing...` becomes `✓ Analysis complete` |
| 3.5s | Quality card appears | Projected quality slides up from `y:20, opacity:0` with spring physics |
| 4.0s | Score ring animates | The `91` score number counts up from 0→91 using spring animation. Ring fills clockwise. |
| 4.0s | Dimension bars | Sub-scores animate width from 0% to final values (200ms stagger) |
| 4.5s | Upsell hint | `"+3% with Premium Glossary"` fades in (straker-400) |
| 5.0s | Right panel populates | Brief card items fade in with 100ms stagger (agent, locales, vertical, glossary, guardrails) |
| 5.5s | Launch button activates | Button transitions from `opacity-50 cursor-not-allowed` to full opacity with a soft bounce |

### The Projected Quality Score — Detail

This is the key "wow" moment. Before Elena clicks Launch, the system tells her what to expect.

**Score Display:**
- Large ring (64×64px SVG) with animated `stroke-dasharray` fill
- Score number in center: `91` in JetBrains Mono, text-3xl, emerald-400
- Range label: `89-93% projected` in slate-300, text-sm
- Basis label: `based on 42 prior JA financial projects` in slate-500, text-xs

**How the range is calculated (UX explanation, shown on hover):**
Tooltip: `"Projected from your organization's 42 previous Japanese financial translations, weighted by document similarity and glossary coverage."`

**Dimension Breakdown (below ring):**
- 4 horizontal bars, each with label (left) and score (right)
- Bar fill uses `getScoreColor()` — emerald ≥85, amber 70-84, red <70
- Cultural score (78) renders in amber, all others in emerald
- Each bar has a subtle shimmer animation on initial render (gradient sweep left-to-right, 800ms)

**Upsell Nudge:**
- Below dimensions: `"+3% with Premium Glossary Enhancement"` in straker-400
- Small sparkle icon (Zap, 14px) before text
- On click: opens a tooltip with enhancement details and "Add to project" button

### Right Panel — Live Brief

The right panel is a **sticky sidebar** (position: sticky, top: 6rem) that summarizes the complete project configuration. It's the "at-a-glance confirmation" that lets Elena scan everything before launching.

**Agent Card:**
- Icon: Bot (straker-400)
- Name: `JP-FIN-3` in text-base, white
- Status: `● Online` — green dot with pulse, text-xs emerald-400
- Subtitle: `Specialized: Japanese Financial Compliance` in slate-400, text-xs

**Locale Tags:**
- 3 pill badges: `JA` `DE` `ZH`
- Each pill: navy-700 bg, white text, rounded-full
- Small dot in each: emerald (indicating glossary loaded for that locale)

**Guardrails Checklist:**
- 6 items with checkbox icons (pre-checked, emerald)
- Each line: guardrail name in text-sm, slate-300
- Example: `☑ J-GAAP compliance mapping`

**Edit Config Link:**
- `"Edit configuration →"` in straker-400, text-sm
- On click: smoothly expands the brief into a full configuration panel (the existing DecisionArchitecture, compressed)

### UI Copy — Exact Strings

| Element | Copy |
|---|---|
| Header title | `Q3 Earnings Report` |
| Header subtitle | `Q3_Earnings_Final.docx · 23 pages · 14,200 words` |
| Upload step 1 | `✓ Uploaded` |
| Upload step 2 | `✓ Parsed · 23 pages · 14,200 words` |
| Upload step 3a | `● Analyzing document...` |
| Upload step 3b | `✓ Analysis complete · 6 guardrails applied` |
| Quality headline | `89-93%` |
| Quality subtext | `projected quality range` |
| Quality basis | `Based on 42 prior JA financial projects` |
| Upsell hint | `+3% with Premium Glossary Enhancement` |
| Agent name | `JP-FIN-3` |
| Agent status | `● Online · Specialized: Japanese Financial Compliance` |
| Launch button | `Launch Translation` |
| Launch estimate | `Estimated completion: ~4 minutes` |
| Launch disabled | `Analyzing document...` (shown while analysis runs) |

### Micro-interactions

| Trigger | Animation |
|---|---|
| File drag enter | Border `dashed straker-500/30` → `solid straker-400`, bg `straker-500/10`, scale 1.02 |
| File drop | White flash (150ms), border solid emerald-400 (300ms), then settles |
| Finding appears (critical) | Border flashes red for 400ms, finding pill has `animate-pulse` |
| Score count-up | Spring physics: stiffness 120, damping 20. Number scales 1.3→1.0 |
| Dimension bar fill | Width animates from 0% with spring, 200ms stagger between bars |
| Launch button activate | `opacity-50 → opacity-100`, subtle bounce (scale 1.02→1.0) |
| Launch button click | Scale 0.96 → 1.0 (spring), triggers Screen 3 transition |
| Hover guardrail item | Row highlights `white/[0.04]`, tooltip shows guardrail description |

---

## Screen 3 — Processing & Security State (Execution Theatre)

### Purpose
Elena clicks "Launch Translation." This is not a loading spinner. This is a **Security Theatre** — a choreographed visualization that makes enterprise-grade security *tangible and visceral*. Every second of processing time is used to build trust.

### Transition (Screen 2 → Screen 3)

1. Launch button pulses with straker glow (200ms)
2. The left panel (drop zone + quality) and right panel (brief) slide toward center and merge
3. Content crossfades to Screen 3 layout over 400ms
4. The file icon from the drop zone persists — it becomes the central element of the security visualization

### Layout (1440px viewport)

```
┌──────────────────────────────────────────────────────────────┐
│  TOP BAR                                                     │
├──────────────────────────────────────────────────────────────┤
│  max-w-[800px], mx-auto, py-10                               │
│                                                              │
│  ┌─── HEADER ──────────────────────────────────────────────┐ │
│  │  "Executing Translation"                     (text-2xl)  │ │
│  │  "Q3_Earnings_Final.docx → JA · DE · ZH"    (slate-400) │ │
│  │  Agent: JP-FIN-3 · ● Active         (emerald dot pulse) │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌─── SECURITY CORE (center, h-[280px]) ───────────────────┐│
│  │                                                          ││
│  │              ┌──────────────────┐                        ││
│  │         ╱    │                  │    ╲                    ││
│  │        ╱     │   [Document      │     ╲                  ││
│  │   ┌───╱──┐   │    Icon +        │   ┌──╲───┐            ││
│  │   │ Lock │   │    Lock Shield   │   │ Lock │            ││
│  │   │ Ring │   │    Overlay]      │   │ Ring │            ││
│  │   └───╲──┘   │                  │   └──╱───┘            ││
│  │        ╲     │   AES-256        │     ╱                  ││
│  │         ╲    │   ENCRYPTED      │    ╱                   ││
│  │              └──────────────────┘                        ││
│  │                                                          ││
│  │  ┌─ SECURITY TICKER ───────────────────────────────┐    ││
│  │  │  ✓ AES-256 encryption handshake established     │    ││
│  │  │  ✓ Processing in ap-northeast-1 (Tokyo)         │    ││
│  │  │  ✓ Zero-retention pipeline active               │    ││
│  │  │  ● Auto-delete: 23:59:42 remaining              │    ││
│  │  └─────────────────────────────────────────────────┘    ││
│  └──────────────────────────────────────────────────────────┘│
│                                                              │
│  ┌─── PROCESSING PHASES (3-row) ───────────────────────────┐│
│  │                                                          ││
│  │  ┌─ PHASE 1: SCANNING ─────────────────────────────┐   ││
│  │  │  ✓ Complete · 1.2s                                │   ││
│  │  │  "47 terms matched to J-GAAP glossary"            │   ││
│  │  └───────────────────────────────────────────────────┘   ││
│  │                                                          ││
│  │  ┌─ PHASE 2: TRANSLATING ──────────────────────────┐   ││
│  │  │  ● Active · 2 of 3 locales                        │   ││
│  │  │  JA ████████████████░░░░ 84%                      │   ││
│  │  │  DE ████████████░░░░░░░░ 62%                      │   ││
│  │  │  ZH ████░░░░░░░░░░░░░░░░ 21%                     │   ││
│  │  └───────────────────────────────────────────────────┘   ││
│  │                                                          ││
│  │  ┌─ PHASE 3: QUALITY ASSURANCE ────────────────────┐   ││
│  │  │  ○ Pending                                        │   ││
│  │  │  "Guardrail validation queued (6 rules)"          │   ││
│  │  └───────────────────────────────────────────────────┘   ││
│  │                                                          ││
│  └──────────────────────────────────────────────────────────┘│
│                                                              │
│  ┌─── MASTER PROGRESS ─────────────────────────────────────┐│
│  │  ████████████████████░░░░░░░░░░  56%                     ││
│  │  Gradient: straker-500 → emerald-400                     ││
│  │  "~1:42 remaining"                          (slate-500)  ││
│  └──────────────────────────────────────────────────────────┘│
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### The Security Core — Detailed Visualization

This is a **living, animated security badge** centered on the page. It communicates "your data is locked down" through motion, not just text.

**Central Element: Document + Shield**
- The file icon (FileText, 48px) sits at center
- A translucent shield overlay (Shield icon, straker-400/30) composites on top
- Below the icon: `AES-256 ENCRYPTED` in JetBrains Mono, text-xs, straker-300, letter-spacing: 0.15em

**Orbiting Lock Rings (the "Encryption Handshake"):**
- 2 concentric rings orbit the central document
- **Inner ring** (r=60px): Rotates clockwise at 8s/revolution, has 3 small Lock icons (12px) evenly spaced
- **Outer ring** (r=90px): Rotates counter-clockwise at 12s/revolution, has 4 small Shield icons (10px)
- Ring stroke: `straker-500/20`, dashed `stroke-dasharray: 4 8`
- Lock icons: `straker-400/60`

**The Handshake Animation (first 2 seconds):**

| Time | Event |
|---|---|
| 0.0s | Single Lock icon appears at center, large (32px) |
| 0.3s | Lock icon splits into 2 — one moves to inner ring, one to outer ring |
| 0.6s | Each spawns additional icons around their ring (spring: scale 0→1) |
| 0.8s | Rings begin rotating |
| 1.0s | Connection lines briefly flash between inner and outer ring icons (like handshake pulses) |
| 1.2s | `"AES-256 ENCRYPTED"` types in character-by-character (typewriter, 40ms/char) |
| 1.5s | Green flash on central shield (`emerald-400/20` overlay, 300ms fade) |
| 2.0s | Steady state: rings orbit, everything settled |

**Regional Processing Indicator:**
- Small flag icon (🇯🇵) appears near the outer ring at the 2 o'clock position
- Label: `ap-northeast-1` in JetBrains Mono, text-[10px], slate-500
- Tooltip on hover: `"Your data is processed in the Tokyo region and never leaves the Asia-Pacific zone"`

### Security Ticker — Line-by-Line Reveal

A vertical feed below the Security Core. Each line appears sequentially with a typewriter effect.

| Time | Line | Style |
|---|---|---|
| 1.0s | `✓ AES-256 encryption handshake established` | emerald-400 check, white text |
| 2.0s | `✓ Processing in ap-northeast-1 (Tokyo)` | emerald-400 check, white text |
| 3.0s | `✓ Zero-retention pipeline active` | emerald-400 check, white text |
| 4.0s | `● Auto-delete countdown: 23:59:58` | amber-400 dot (pulse), amber text |

**Auto-Delete Countdown:**
- The countdown timer is **live** — it ticks down every second in real time
- Format: `HH:MM:SS` in JetBrains Mono
- Color shifts: >12h = amber-400, <1h = red-400
- Tooltip: `"All source material and intermediate data will be permanently deleted in 24 hours. No data is retained."`

### Processing Phases — Detailed Behavior

Three collapsible phase cards, vertically stacked. Only one is expanded (active) at a time.

**Phase 1: Document Scanning** (0-30s)
- Header: `SCANNING` badge (straker-500/15), phase name, duration counter
- Expanded content: Finding feed (reuses GlassBox findings stream)
- On complete: collapses to single line `✓ Complete · 1.2s · 47 terms, 6 guardrails`

**Phase 2: Translation** (30s-3min)
- Header: `TRANSLATING` badge (straker-500/15), `2 of 3 locales`
- Expanded content: Per-locale progress bars
  - Each bar: flag emoji + locale code + animated fill bar + percentage
  - Bar fill: gradient `straker-500 → emerald-400`
  - Active locale bar has a shimmer effect (gradient sweep)
  - Completed locale: bar turns solid emerald-400, checkmark appears
- Locale completion order: JA (highest priority, most glossary coverage) → DE → ZH

**Phase 3: Quality Assurance** (3min-4min)
- Header: `QUALITY CHECK` badge, `6 guardrails`
- Expanded content: Guardrail checklist
  - Each guardrail ticks from `○ Pending` → `● Validating...` → `✓ Passed`
  - J-GAAP compliance (the critical one) gets a brief amber flash before passing (building tension)
  - On all passed: header turns emerald, `"All 6 guardrails passed"`

### Master Progress Bar

- Full-width bar at bottom of content area
- Height: 6px, rounded-full
- Fill gradient: `straker-500 → straker-400 → emerald-400` (shifts right as progress increases)
- Above bar: percentage in JetBrains Mono, text-lg
- Below bar: `"~1:42 remaining"` → `"~0:30 remaining"` → `"Finalizing..."` → `"Complete"`
- On completion: bar flashes emerald, triggers transition to Screen 4

### UI Copy — Exact Strings

| Element | Copy |
|---|---|
| Header title | `Executing Translation` |
| Header subtitle | `Q3_Earnings_Final.docx → JA · DE · ZH` |
| Agent line | `Agent JP-FIN-3 · ● Active` |
| Encryption label | `AES-256 ENCRYPTED` |
| Security line 1 | `✓ AES-256 encryption handshake established` |
| Security line 2 | `✓ Processing in ap-northeast-1 (Tokyo)` |
| Security line 3 | `✓ Zero-retention pipeline active` |
| Security line 4 | `● Auto-delete: 23:59:42 remaining` |
| Phase 1 complete | `✓ Complete · 1.2s · 47 terms matched, 6 guardrails applied` |
| Phase 2 active | `Translating · 2 of 3 locales complete` |
| Phase 3 pending | `Quality assurance · 6 guardrails queued` |
| Completion | `Finalizing quality report...` |

### Micro-interactions

| Trigger | Animation |
|---|---|
| Lock handshake | Lock splits → rings spawn → rotation begins (see timeline above) |
| Security line appear | Each line slides in from `x:-8, opacity:0`, emerald check scales in |
| Countdown tick | Number flips with a subtle `rotateX` 3D effect per digit change |
| Locale bar progress | Width increases smoothly (CSS transition 1s ease), shimmer overlay |
| Locale complete | Bar fill → emerald, checkmark scales in (spring), locale fades slightly |
| Guardrail pass | Checkbox morphs ○→✓ with rotation, row briefly glows emerald/10 |
| Critical guardrail | Brief amber glow (600ms) before emerald pass — builds narrative tension |
| Phase collapse | Height animates to 0 with spring, content fades, summary line replaces |
| Master bar complete | Gradient shifts fully emerald, 2px glow shadow, pulse once |
| Transition to Screen 4 | Master bar expands vertically to fill viewport with emerald, then crossfade |

---

## Screen 4 — The Explainable Quality Narrative (Post-Completion)

### Purpose
The translation is complete. Score: **88%**. This screen doesn't just show a number — it *explains why*, *compares to peers*, and *prescribes exactly what to do next*. Every metric is actionable. This is where Straker.AI earns long-term trust.

### Transition (Screen 3 → Screen 4)

1. Master progress bar fills to 100%, turns emerald
2. The progress bar expands as a horizontal wipe (emerald) across the viewport (300ms)
3. Large checkmark icon appears center-screen, scales from 0→1 with spring (overshoot 1.2)
4. `"Translation Complete"` fades in below (200ms delay)
5. After 1.5s pause, checkmark and text slide up, Screen 4 content fades in from below

### Layout (1440px viewport)

```
┌──────────────────────────────────────────────────────────────┐
│  TOP BAR                                                     │
├──────────────────────────────────────────────────────────────┤
│  max-w-[1100px], mx-auto, py-8                               │
│                                                              │
│  ┌─── COMPLETION HEADER ───────────────────────────────────┐ │
│  │  ✓ Translation Complete                      (text-2xl) │ │
│  │  Q3_Earnings_Final.docx · JA · DE · ZH · 4m 12s         │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌─── SCORE HERO (center, full-width) ─────────────────────┐│
│  │                                                          ││
│  │    ┌──────────┐                                          ││
│  │    │   ╭───╮  │  "88% Overall Quality"                   ││
│  │    │   │ 88│  │  "Your Q2 report scored 92%. Korean       ││
│  │    │   ╰───╯  │   terminology drove the 4-point delta."   ││
│  │    │  (ring)  │                                          ││
│  │    └──────────┘                                          ││
│  │                                                          ││
│  └──────────────────────────────────────────────────────────┘│
│                                                              │
│  ┌─── LOCALE HEALTH CARDS (3-column grid) ─────────────────┐│
│  │                                                          ││
│  │  ┌─ JA ────────┐ ┌─ DE ────────┐ ┌─ ZH ────────┐      ││
│  │  │ 🇯🇵 Japanese  │ │ 🇩🇪 German   │ │ 🇨🇳 Chinese  │      ││
│  │  │              │ │              │ │              │      ││
│  │  │  Score: 84   │ │  Score: 91   │ │  Score: 89   │      ││
│  │  │  (amber)     │ │  (emerald)   │ │  (emerald)   │      ││
│  │  │              │ │              │ │              │      ││
│  │  │  Term:  78%  │ │  Term:  94%  │ │  Term:  88%  │      ││
│  │  │  Reg:   92%  │ │  Reg:   90%  │ │  Reg:   91%  │      ││
│  │  │  Cult:  74%  │ │  Cult:  88%  │ │  Cult:  85%  │      ││
│  │  │  Read:  92%  │ │  Read:  93%  │ │  Read:  92%  │      ││
│  │  │              │ │              │ │              │      ││
│  │  │ ⚠ 3 terms   │ │ ✓ All clear  │ │ ✓ All clear  │      ││
│  │  │   missing    │ │              │ │              │      ││
│  │  │              │ │              │ │              │      ││
│  │  │ [Diagnose →] │ │ [Details →]  │ │ [Details →]  │      ││
│  │  └──────────────┘ └──────────────┘ └──────────────┘      ││
│  │                                                          ││
│  └──────────────────────────────────────────────────────────┘│
│                                                              │
│  ┌─── QUALITY WATERFALL (full-width) ──────────────────────┐│
│  │                                                          ││
│  │   Baseline  AI Guard  Glossary  Reg.Map   Final          ││
│  │                                                          ││
│  │     ┌──┐                                  ┌──┐          ││
│  │     │  │     ┌──┐                         │  │          ││
│  │     │  │     │+3│    ┌──┐                 │  │          ││
│  │     │  │     │  │    │+2│    ┌──┐         │  │          ││
│  │     │81│     │  │    │  │    │+2│         │88│          ││
│  │     │  │     │  │    │  │    │  │         │  │          ││
│  │     │  │- - -│  │- - │  │- - │  │- - - - │  │          ││
│  │     └──┘     └──┘    └──┘    └──┘         └──┘          ││
│  │   (slate)  (indigo) (violet) (teal)     (emerald)       ││
│  │                                                          ││
│  │   "Each enhancement contributed to a +7 point lift       ││
│  │    from baseline."                                       ││
│  │                                                          ││
│  └──────────────────────────────────────────────────────────┘│
│                                                              │
│  ┌─── DIAGNOSTIC MODAL (triggered by "Diagnose →") ───────┐│
│  │  (Overlay, appears when clicking JA "Diagnose" button)   ││
│  │                                                          ││
│  │  See detailed spec below.                                ││
│  └──────────────────────────────────────────────────────────┘│
│                                                              │
│  ┌─── TREND + INTELLIGENCE (2-column) ─────────────────────┐│
│  │  ┌─ QUALITY TREND ───────┐ ┌─ CUMULATIVE INTEL ───────┐ ││
│  │  │ SVG line chart         │ │ Glossary: 1,247 terms     │ ││
│  │  │ 6-month history        │ │ ████████████████░░ 87%    │ ││
│  │  │ --- Industry avg: 83   │ │                           │ ││
│  │  │ Your avg: 89.3         │ │ +23 new terms this project│ ││
│  │  │ "+7.6% above industry" │ │ 847 patterns captured     │ ││
│  │  └────────────────────────┘ │ 12.4 hrs saved            │ ││
│  │                             └───────────────────────────┘ ││
│  └──────────────────────────────────────────────────────────┘│
│                                                              │
│  ┌─── OUTPUT FILES ────────────────────────────────────────┐ │
│  │  📄 Translated Document (JA, DE, ZH)    [Download]       │ │
│  │  📊 Quality Report                       [Download]       │ │
│  │  🧠 Translation Memory Update            [Download]       │ │
│  │  📈 Org Intelligence Update              [Download]       │ │
│  │                                                          │ │
│  │  [Download All Files]          [Start New Project]       │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Score Hero — Detail

**Layout:** Horizontal, left-aligned. Ring on left, text on right.
- Ring: 80×80px SVG, animated `stroke-dasharray` fill to 88%
- Ring color: `amber-400` (since 88 is between 85-threshold boundary — in this scenario we use amber to create the narrative tension that drives action)
- Score: `88` in JetBrains Mono, text-4xl, white
- Headline: `88% Overall Quality` in text-xl, white
- Narrative: `"Your Q2 report scored 92%. Korean terminology drove the 4-point delta. See JA diagnostics below."` in slate-300, text-sm, leading-relaxed

**Score animation:**
- Ring fills clockwise from 12 o'clock over 1.2s (spring stiffness: 80, damping: 15)
- Number counts up 0→88 synchronized with ring fill
- At rest, ring has a subtle breathing glow (`box-shadow` opacity 0.1→0.2, 3s cycle)

### Locale Health Cards — Detail

Three cards in a responsive grid (`grid-cols-3` on lg, `grid-cols-1` on md).

**Card Anatomy (using JA as example):**

```
┌──────────────────────────────────────┐
│  🇯🇵  Japanese                        │
│  Agent: JP-FIN-3                     │
│                                      │
│  ┌──────────┐                        │
│  │    84     │  (amber ring, 56px)   │
│  │  (ring)   │                       │
│  └──────────┘                        │
│                                      │
│  Terminology   ██████████░░░░  78%   │  ← amber (below 85)
│  Regulatory    █████████████░  92%   │  ← emerald
│  Cultural      █████████░░░░░  74%   │  ← amber
│  Reading Level █████████████░  92%   │  ← emerald
│                                      │
│  ┌─ ALERT ──────────────────────┐    │
│  │  ⚠ 3 financial terms missing │    │
│  │    from J-GAAP glossary       │    │
│  └───────────────────────────────┘    │
│                                      │
│  [Diagnose →]                        │
│  (straker-400, text-sm, underline)   │
└──────────────────────────────────────┘
```

**Card Colors:**
- Card with issues (JA, score <85): Left border `amber-400` (4px solid)
- Card passing (DE, ZH): Left border `emerald-400`
- Alert box: `amber-500/10` bg, `amber-500/20` border, amber-400 icon

**Card Micro-interactions:**
- On hover: card lifts (`y:-4`), border brightens, subtle shadow
- "Diagnose →" link: on hover, arrow slides right 4px
- Alert box: on load, fades in with a 600ms delay after card appears (drawing attention last)

### The Diagnostic Breakdown Modal — Detail

Triggered by clicking `[Diagnose →]` on the JA Locale Health Card.

```
┌──────────────────────────────────────────────────────────────┐
│  DIAGNOSTIC MODAL (centered, max-w-[640px], rounded-2xl)     │
│  Overlay: navy-900/80 backdrop-blur                          │
│                                                              │
│  ┌─ HEADER ────────────────────────────────────────────────┐ │
│  │  🇯🇵 Japanese Quality Diagnostic            [✕ Close]   │ │
│  │  Score: 84/100 · Agent: JP-FIN-3                        │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌─ DIMENSION DEEP DIVE ──────────────────────────────────┐ │
│  │                                                         │ │
│  │  TERMINOLOGY MATCH — 78%                                │ │
│  │  ████████████████░░░░░░  (amber bar, animated)          │ │
│  │                                                         │ │
│  │  Root Cause:                                            │ │
│  │  "3 financial terms were not found in your J-GAAP       │ │
│  │   glossary and fell back to general translation:        │ │
│  │                                                         │ │
│  │   ┌──────────────────────────────────────────────┐      │ │
│  │   │  "減損損失" (impairment loss)                  │      │ │
│  │   │  Used: generic translation                    │      │ │
│  │   │  Expected: TSE-approved term                  │      │ │
│  │   │  Impact: -4 points on terminology score       │      │ │
│  │   ├──────────────────────────────────────────────┤      │ │
│  │   │  "のれん" (goodwill)                           │      │ │
│  │   │  Used: literal translation                    │      │ │
│  │   │  Expected: J-GAAP standard phrasing           │      │ │
│  │   │  Impact: -2 points                            │      │ │
│  │   ├──────────────────────────────────────────────┤      │ │
│  │   │  "持分法" (equity method)                      │      │ │
│  │   │  Used: generic financial term                 │      │ │
│  │   │  Expected: ASBJ-prescribed terminology        │      │ │
│  │   │  Impact: -2 points                            │      │ │
│  │   └──────────────────────────────────────────────┘      │ │
│  │                                                         │ │
│  │  CULTURAL ADAPTATION — 74%                              │ │
│  │  ██████████████░░░░░░░░  (amber bar)                    │ │
│  │                                                         │ │
│  │  Root Cause:                                            │ │
│  │  "2 passages used Western fiscal year references        │ │
│  │   (Q3 / October) without mapping to Japanese            │ │
│  │   fiscal calendar conventions (上半期/下半期)."            │ │
│  │                                                         │ │
│  │  REGULATORY — 92% ✓                                     │ │
│  │  READING LEVEL — 92% ✓                                  │ │
│  │  (Collapsed, green, no action needed)                   │ │
│  │                                                         │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌─ PRESCRIBED ACTIONS ───────────────────────────────────┐ │
│  │                                                         │ │
│  │  "To improve future JA financial scores:"               │ │
│  │                                                         │ │
│  │  1. Add 3 missing terms to your J-GAAP glossary         │ │
│  │     [Add to Glossary →]                                 │ │
│  │     (straker-600 button, primary)                       │ │
│  │     Impact: "+6 points on terminology (78% → 84%)"      │ │
│  │                                                         │ │
│  │  2. Enable "Cultural Calendar Mapping" enhancement      │ │
│  │     [Enable Enhancement →]                              │ │
│  │     (straker-500/15 bg button, secondary)               │ │
│  │     Impact: "+4 points on cultural (74% → 78%)"         │ │
│  │                                                         │ │
│  │  3. Review 2 fiscal year passages manually              │ │
│  │     [Open in Editor →]                                  │ │
│  │     (text link, straker-400)                            │ │
│  │     Impact: "Full cultural compliance"                   │ │
│  │                                                         │ │
│  │  ┌─ PROJECTED NEXT SCORE ─────────────────────────┐    │ │
│  │  │  "If all 3 actions are taken, your next JA      │    │ │
│  │  │   financial project is projected to score:       │    │ │
│  │  │                                                  │    │ │
│  │  │   84 ──────→ 92  (+8 points)                    │    │ │
│  │  │   (amber)          (emerald)                     │    │ │
│  │  │                                                  │    │ │
│  │  │   Arrow animation: score slides from 84→92      │    │ │
│  │  └──────────────────────────────────────────────────┘    │ │
│  │                                                         │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Diagnostic Modal — Copy & Interaction

**Exact Copy:**

| Element | Copy |
|---|---|
| Modal title | `Japanese Quality Diagnostic` |
| Subtitle | `Score: 84/100 · Agent: JP-FIN-3` |
| Terminology header | `Terminology Match — 78%` |
| Root cause intro | `3 financial terms were not found in your J-GAAP glossary and fell back to general translation:` |
| Term 1 | `"減損損失" (impairment loss) · Used: generic translation · Expected: TSE-approved term · Impact: -4 points` |
| Term 2 | `"のれん" (goodwill) · Used: literal translation · Expected: J-GAAP standard phrasing · Impact: -2 points` |
| Term 3 | `"持分法" (equity method) · Used: generic financial term · Expected: ASBJ-prescribed terminology · Impact: -2 points` |
| Cultural header | `Cultural Adaptation — 74%` |
| Cultural cause | `2 passages used Western fiscal year references (Q3 / October) without mapping to Japanese fiscal calendar conventions (上半期/下半期).` |
| Action intro | `To improve future JA financial scores:` |
| Action 1 | `Add 3 missing terms to your J-GAAP glossary` |
| Action 1 impact | `+6 points on terminology (78% → 84%)` |
| Action 2 | `Enable "Cultural Calendar Mapping" enhancement` |
| Action 2 impact | `+4 points on cultural (74% → 78%)` |
| Action 3 | `Review 2 fiscal year passages manually` |
| Action 3 impact | `Full cultural compliance` |
| Projection | `If all 3 actions are taken, your next JA financial project is projected to score: 84 → 92 (+8 points)` |

**Modal Micro-interactions:**

| Trigger | Animation |
|---|---|
| Modal open | Backdrop fades in (300ms), modal scales from 0.95→1.0 + fades in (spring) |
| Dimension bars | Width animates from 0% on modal open (400ms stagger between dimensions) |
| Term rows | Stagger in with 100ms delay each, slide from `y:8, opacity:0` |
| Hover term row | Row bg highlights to `white/[0.04]`, left border appears (amber, 3px) |
| Click "Add to Glossary" | Button → loading state (spinner, 800ms) → success state (emerald, checkmark) |
| After glossary add | Terminology bar animates from 78%→84%, score ring updates 84→86 |
| Hover action button | Standard hover lift, arrow slides right 4px |
| Projection arrow | Animated: score number morphs 84→92, color transitions amber→emerald (1.5s spring) |
| Modal close | Modal scales 1.0→0.95 + fades out, backdrop fades (200ms) |

### Quality Waterfall Chart — Detail

Full-width SVG chart showing how each enhancement contributed to the final score.

**Bars (left to right):**

| Bar | Value | Color | Label |
|---|---|---|---|
| Baseline | 81 | `slate-500` | `Baseline` |
| AI Guardrails | +3 | `#818cf8` (indigo) | `AI Guard` |
| Glossary Enhancement | +2 | `#a78bfa` (violet) | `Glossary` |
| Regulatory Mapping | +2 | `#2dd4bf` (teal) | `Reg. Map` |
| Final Score | 88 | `emerald-400` | `Final` |

**Chart Details:**
- Bars are vertically positioned so enhancement bars "stack" above the baseline level
- Dashed connector lines between bar tops show the running total
- Value labels above each bar in JetBrains Mono, text-sm
- Category labels below in Inter, text-xs, slate-400
- Caption below chart: `"Each enhancement contributed to a +7 point lift from baseline."`

**Waterfall Animation:**
- Baseline bar draws up from bottom (400ms spring)
- Enhancement bars appear left-to-right (200ms stagger), each growing upward from the connector line
- Final bar appears last with a subtle emerald glow
- All bars have a 1px white/[0.06] stroke

### Quality Trend Chart — Detail

SVG line chart, 6 months of history.

**Data Points:**
| Month | Score |
|---|---|
| May | 82 |
| Jun | 85 |
| Jul | 92 (Q2 Earnings) |
| Aug | 87 |
| Sep | 91 |
| Oct | 88 (Current — highlighted) |

**Chart Elements:**
- Area fill: `straker-500/10` gradient to transparent
- Line stroke: `straker-400`, 2px
- Data points: 6px circles, `straker-500` fill, white 2px stroke
- Current point (Oct): 10px circle, `straker-400` fill, animated pulse ring
- Industry benchmark: dashed horizontal line at y=83, `amber-400/45`, label `"Industry Avg: 83"` right-aligned
- Y-axis: 75, 80, 85, 90, 95 grid lines in `white/[0.04]`
- Below chart callout: `"Your consistency is 7.6% above the Financial Sector average"` in emerald-400

### Cumulative Intelligence — Detail

**Content:**
- Header: `Cumulative Intelligence` with `+23 new terms` badge (spring bounce on load, Sparkles icon)
- Glossary bar: `1,247 terms · 87% coverage` — progress bar, emerald fill
- Project contribution card: `"This project added 23 terms, 12 patterns, and 847 reusable segments to Acme Corp's translation brain."`
- Stats grid (3-col): `847 Patterns` · `1,240 Segments` · `12.4 hrs Saved`

### Output Files — Detail

Four file rows in a card. Each row:
- Left: file type icon (colored per type)
- Center: file name + format badge
- Right: `[Download]` button (text link, straker-400)

Footer: Two buttons side by side
- `[Download All Files]` — straker-600, primary
- `[Start New Project]` — navy-700, secondary, white text

### Responsive Behavior (Screen 4)

| Breakpoint | Behavior |
|---|---|
| `2xl` | Full layout as diagrammed |
| `xl` | Locale cards remain 3-col, waterfall chart full-width |
| `lg` | Locale cards 3-col, trend/intelligence stack vertically |
| `md` | Locale cards stack to 1-col with horizontal scroll option |
| `sm` | Waterfall chart folds to vertical list view: `"AI Guardrails: +3 pts"` per row |

---

## Keyboard Accessibility

All screens support full keyboard navigation:

| Key | Action |
|---|---|
| `Tab` | Move focus through interactive elements in reading order |
| `Enter` / `Space` | Activate buttons, toggle selections |
| `Escape` | Close modals, dismiss tooltips, cancel edits |
| `Arrow Left/Right` | Navigate between locale pills, filter pills |
| `Arrow Up/Down` | Navigate between findings in feed, file list rows |

Focus indicators: `2px solid straker-400`, `2px offset`, visible on all interactive elements. All animations respect `prefers-reduced-motion: reduce`.

---

## Prototype Navigation Summary

```
Screen 1: Intelligent Dashboard
    │
    ├── Click "Start Q3 Earnings Project" ──→ Screen 2 (pre-loaded)
    │
    └── Drop file ──→ Screen 2 (fresh analysis)
              │
              └── Click "Launch Translation" ──→ Screen 3
                        │
                        └── Processing completes ──→ Screen 4
                                  │
                                  ├── Click "Diagnose →" ──→ Modal overlay
                                  │
                                  ├── Click "Add to Glossary →" ──→ Inline success
                                  │
                                  └── Click "Start New Project" ──→ Screen 1
```

---

*End of Specification*
