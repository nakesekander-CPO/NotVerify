/**
 * Video Dubbing — mock data layer.
 *
 * Governed video localization: one source video, every language — and every
 * frame governed. The pipeline is LipDub-style visual dubbing (translate →
 * voice clone → lip sync → export) run through arbitr gates:
 *   - script & terminology checks happen BEFORE any voice is cloned,
 *   - a likeness & voice consent gate (evidence on file) sits before lip
 *     sync — no consent record, no synthetic likeness,
 *   - human review precedes export.
 * A held language track is the product working, never an error.
 *
 * Lip-sync engine: LipDub (partner; credited in the pipeline detail only).
 */

import { REVIEWERS } from './governanceDashboard'

/* ── The governed pipeline ─────────────────────────────────────── */

// kind: 'agent' | 'gate' (governance checkpoints that can hold a track)
export const DUB_STAGES = [
  { id: 'source', label: 'Source video', kind: 'agent', detail: 'Upload once — every language starts from the same cut' },
  { id: 'script', label: 'Script & terminology checks', kind: 'gate', detail: 'Translation checked against your glossary and brand rules before any voice exists' },
  { id: 'consent', label: 'Likeness & voice consent', kind: 'gate', detail: 'A consent record on file for every on-camera speaker — no consent, no clone' },
  { id: 'clone', label: 'Voice clone & dub', kind: 'agent', detail: 'The speaker’s own voice, in the target language' },
  { id: 'lipsync', label: 'Lip sync', kind: 'agent', detail: 'The face on camera stays', engine: 'Lip-sync engine: LipDub' },
  { id: 'review', label: 'Human review', kind: 'gate', detail: 'Native-speaker spot check per language track' },
  { id: 'export', label: 'Export & publish', kind: 'agent', detail: 'Delivered with its evidence trail' },
]

/* ── Consent registry (the evidence behind the consent gate) ───── */

export const CONSENT_RECORDS = [
  { id: 'cr-01', speaker: 'K. Sato, CEO', scope: 'Investor communications · all languages', doc: 'likeness-consent-sato-2026.pdf', validUntil: 'Mar 2027', status: 'valid' },
  { id: 'cr-02', speaker: 'A. Weber, CFO', scope: 'Earnings materials · EN, DE', doc: 'likeness-consent-weber-2026.pdf', validUntil: 'Dec 2026', status: 'valid' },
  { id: 'cr-03', speaker: 'M. Okada, Head of IR', scope: 'IR videos · all languages', doc: 'likeness-consent-okada-2025.pdf', validUntil: 'Jul 2026', status: 'expired' },
]

/* ── Projects ──────────────────────────────────────────────────── */

// Track status: 'cleared' | 'in-progress' | 'held'
export const DUB_PROJECTS = [
  {
    id: 'VD-2026-012',
    name: 'CEO Message — Q2 Investor Video',
    source: 'JA · 3 min 04 s · 1 speaker (K. Sato)',
    speakers: ['cr-01'],
    tracks: [
      { lang: 'EN', stage: 'export', status: 'cleared', note: 'Delivered with evidence trail' },
      { lang: 'DE', stage: 'lipsync', status: 'in-progress', note: 'Lip sync rendering' },
      { lang: 'ZH', stage: 'script', status: 'held', reason: '通期業績予想 rendered as “full-year forecast” — glossary requires “full-year guidance”', source: 'Meridian IR Glossary v3', reviewer: REVIEWERS.sarah },
      { lang: 'ES', stage: 'review', status: 'in-progress', note: 'Native-speaker spot check' },
    ],
  },
  {
    id: 'VD-2026-015',
    name: 'IR Update — Half-Year Results',
    source: 'JA · 2 min 41 s · 1 speaker (M. Okada)',
    speakers: ['cr-03'],
    tracks: [
      { lang: 'EN', stage: 'consent', status: 'held', reason: 'Likeness consent expired Jul 2026 — no synthetic likeness without a current record', source: 'Consent registry · likeness-consent-okada-2025.pdf', reviewer: REVIEWERS.marcus },
      { lang: 'DE', stage: 'consent', status: 'held', reason: 'Blocked by the same expired consent — renewal requested from IR team', source: 'Consent registry', reviewer: REVIEWERS.marcus },
    ],
  },
  {
    id: 'VD-2026-009',
    name: 'Product Onboarding Series · Ep. 1',
    source: 'EN · 6 min 12 s · 1 speaker (A. Weber)',
    speakers: ['cr-02'],
    tracks: [
      { lang: 'DE', stage: 'export', status: 'cleared', note: 'Delivered' },
      { lang: 'JA', stage: 'clone', status: 'in-progress', note: 'Voice clone in progress' },
      { lang: 'FR', stage: 'script', status: 'in-progress', note: 'Terminology check running' },
    ],
  },
]

/* ── Rollups (dashboard card + page header) ────────────────────── */

export function dubbingSummary() {
  const tracks = DUB_PROJECTS.flatMap(p => p.tracks)
  return {
    projects: DUB_PROJECTS.length,
    tracks: tracks.length,
    held: tracks.filter(t => t.status === 'held').length,
    cleared: tracks.filter(t => t.status === 'cleared').length,
    inProgress: tracks.filter(t => t.status === 'in-progress').length,
  }
}

export function consentFor(project) {
  return project.speakers.map(id => CONSENT_RECORDS.find(c => c.id === id)).filter(Boolean)
}
