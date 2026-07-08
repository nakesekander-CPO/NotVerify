/**
 * Cockpit service helpers — pure functions the redesigned reviewer
 * surfaces call to populate Why-this-segment chips, QA diff, back-
 * translation, agent track records, sparklines, and risk-mitigation
 * summaries.
 *
 * Everything here is a derivation over primary records (segments,
 * decisions, candidates, Cortex entries). No mutation. Cheap.
 */

import {
  HITL_SEGMENTS, REVIEW_DECISIONS, ORG_BRAIN_UPDATES, HITL_PROJECTS,
  FLAG_CATEGORIES, getProjectById,
} from '../../data/hitlVendorWorkflow';
import { segmentPedigree } from './pedigree';

/* ─── Flag-category trigger functions ─────────────────────────────
 *
 * Each trigger is a (segment, project, candidates) → boolean pure
 * function. computeFlagCategories runs them all and returns the
 * matching keys. Run once at extraction; cached on segment.flagCategories.
 * ───────────────────────────────────────────────────────────────── */

const TRIGGERS = {
  'terminology-conflict': (seg, project, cands) => {
    // Token from glossary appears in source AND at least one agent diverges from canonical rendering.
    if (!seg || !cands || cands.length < 1) return false;
    const matches = ORG_BRAIN_UPDATES.filter(o => o.domain === project.requirements.domain
      && seg.source.toLowerCase().includes(o.sourceFragment.toLowerCase().slice(0, 20)));
    if (!matches.length) return false;
    return cands.some(c => !matches.some(m => c.text.includes(m.approvedFragment.slice(0, 8))));
  },
  'regulatory-sensitivity': (seg, project) => {
    const regTags = ['JFSA', 'BaFin', 'MiFID', 'SOX', 'GDPR'];
    const projHasReg = (project.requirements.complianceTags || []).some(t => regTags.some(r => t.includes(r)));
    if (!projHasReg) return false;
    return /forward-looking|may differ materially|subject to risk|regulatory/i.test(seg.source);
  },
  'cultural-nuance': (seg) => /honorif|indirect|culturally|tradition/i.test(seg.source),
  'potential-hallucination': (seg, _project, cands) => {
    // Any candidate contains a number not present in source.
    if (!cands?.length) return false;
    const sourceNums = (seg.source.match(/\d+(?:[.,]\d+)?/g) || []);
    return cands.some(c => {
      const candNums = (c.text.match(/\d+(?:[.,]\d+)?/g) || []);
      return candNums.some(n => !sourceNums.includes(n));
    });
  },
  'numerical-inconsistency': (seg, _project, cands) => {
    if (!cands?.length || cands.length < 2) return false;
    const numsPerCand = cands.map(c => (c.text.match(/\d+(?:[.,]\d+)?/g) || []).sort().join('|'));
    return new Set(numsPerCand).size > 1;
  },
  'brand-voice-drift': (seg, _project, cands) => {
    const bvAgent = cands?.find(c => /brand[\s-]?voice/i.test(c.agentName));
    return !!bvAgent && (bvAgent.confidence ?? 1) < 0.72;
  },
  'missing-org-brain': (seg, project) => {
    const matches = ORG_BRAIN_UPDATES.filter(o => o.domain === project.requirements.domain
      && o.sourceFragment.toLowerCase().slice(0, 20) && seg.source.toLowerCase().includes(o.sourceFragment.toLowerCase().slice(0, 20)));
    return matches.length === 0;
  },
  'agent-disagreement': (seg, _project, cands) => {
    if (!cands || cands.length < 2) return false;
    // Reuse the lightweight divergence proxy.
    const sets = cands.map(c => new Set((c.text || '').split(/(\s+|[、。．,.])/).filter(x => x.trim())));
    let pairs = 0, dist = 0;
    for (let i = 0; i < sets.length; i++) for (let j = i + 1; j < sets.length; j++) {
      const u = new Set([...sets[i], ...sets[j]]);
      const inter = [...sets[i]].filter(x => sets[j].has(x)).length;
      dist += 1 - (u.size ? inter / u.size : 0); pairs++;
    }
    return pairs > 0 && dist / pairs >= 0.4;
  },
  'low-provenance': (seg) => {
    const ped = segmentPedigree(seg.id);
    return ped && ped.composite < 80;
  },
  'length-formatting': (seg, _project, cands) => {
    if (!cands?.length) return false;
    return cands.some(c => {
      const ratio = (c.text || '').length / Math.max(seg.source.length, 1);
      return ratio >= 1.25 || ratio <= 0.75;
    });
  },
};

export function computeFlagCategories(segment, project, candidates) {
  if (!segment || !project) return [];
  const out = [];
  for (const [key, fn] of Object.entries(TRIGGERS)) {
    try { if (fn(segment, project, candidates)) out.push(key); }
    catch { /* triggers are best-effort */ }
  }
  return out;
}

export function explainFlagCategory(key, segment, project, candidates) {
  // Short human-readable explanation per category. The chip's hover-card renders this.
  switch (key) {
    case 'terminology-conflict': return 'Detected glossary term in source; one or more agents diverge from canonical rendering.';
    case 'regulatory-sensitivity': return `Project carries ${(project?.requirements?.complianceTags || []).join(', ') || 'regulatory'} tags and segment matches a flagged phrasing rule.`;
    case 'cultural-nuance': return 'Source contains locale-sensitive phrasing; literal renderings risk register or tone drift.';
    case 'potential-hallucination': return 'An agent proposal contains a numeric or proper-noun token absent from source.';
    case 'numerical-inconsistency': return 'Numeric tokens differ between candidate proposals — at least one is wrong.';
    case 'brand-voice-drift': return 'Brand Voice Sentry confidence is below the voice-match threshold for this project.';
    case 'missing-org-brain': return 'No prior canonical rendering exists in Cortex for this concept in this domain.';
    case 'agent-disagreement': return 'Panel divergence is high — agents materially disagree about the right rendering.';
    case 'low-provenance': return 'Composite pedigree falls below the platform floor for high-stakes content.';
    case 'length-formatting': return 'Candidate length differs from source by more than 25%, risking layout or trust signals.';
    default: return 'No explanation available.';
  }
}

/* ─── QA diff ─────────────────────────────────────────────────────
 *
 * Six automated checks between source and target (or staged ruling).
 * Each returns { id, label, ok: boolean, detail: string }.
 * ───────────────────────────────────────────────────────────────── */

function extractNumbers(text) {
  return (text || '').match(/\d+(?:[.,]\d+)?/g) || [];
}
function extractPlaceholders(text) {
  return (text || '').match(/\{[a-zA-Z0-9_]+\}|%[sd]|<\$[a-zA-Z0-9_]+>/g) || [];
}
function extractMarkup(text) {
  return (text || '').match(/<[a-zA-Z\/][^>]*>/g) || [];
}
function extractNamedEntities(text) {
  // Cheap heuristic: capitalised words ≥ 3 chars not at sentence start.
  return (text || '').match(/(?:^|\s)([A-Z][a-zA-Z]{2,}(?:\s+[A-Z][a-zA-Z]{2,})*)/g) || [];
}

export function qaDiff(source, target, opts = {}) {
  const sNums = extractNumbers(source); const tNums = extractNumbers(target);
  const sPh = extractPlaceholders(source); const tPh = extractPlaceholders(target);
  const sMk = extractMarkup(source); const tMk = extractMarkup(target);
  const sNE = extractNamedEntities(source); const tNE = extractNamedEntities(target);
  const lenRatio = (target?.length || 0) / Math.max(source?.length || 1, 1);
  const dntList = opts.dntTerms || [];
  const dntPreserved = dntList.every(t => !source.toLowerCase().includes(t.toLowerCase()) || target.includes(t));

  return [
    { id: 'numbers',     label: 'Numbers',        ok: sNums.length === tNums.length && sNums.every(n => tNums.includes(n)),
      detail: sNums.length === tNums.length && sNums.every(n => tNums.includes(n))
        ? `${sNums.length} numeric tokens preserved`
        : `source: ${sNums.join(', ') || '—'} · target: ${tNums.join(', ') || '—'}` },
    { id: 'placeholders',label: 'Placeholders',   ok: sPh.length === tPh.length && sPh.every(p => tPh.includes(p)),
      detail: sPh.length === 0 ? 'no placeholders in source' : `${sPh.join(', ')} → ${tPh.join(', ') || '—'}` },
    { id: 'entities',    label: 'Named entities', ok: sNE.length === 0 || sNE.length === tNE.length,
      detail: sNE.length === 0 ? 'no entities detected' : `${sNE.length} in source · ${tNE.length} in target` },
    { id: 'length',      label: 'Length',         ok: lenRatio >= 0.7 && lenRatio <= 1.4,
      detail: `${(lenRatio * 100).toFixed(0)}% of source (${target?.length || 0}/${source?.length || 0})` },
    { id: 'dnt',         label: 'Do-not-translate', ok: dntPreserved,
      detail: dntList.length === 0 ? 'no DNT terms configured' : `${dntList.length} DNT term${dntList.length === 1 ? '' : 's'} checked` },
    { id: 'markup',      label: 'Markup tags',    ok: sMk.length === tMk.length,
      detail: sMk.length === 0 ? 'no markup detected' : `${sMk.length} in source · ${tMk.length} in target` },
  ];
}

/* ─── Mocked back-translation ─────────────────────────────────────
 *
 * A real implementation calls a model. The prototype provides a
 * canned back-translation per segment so the UI can render the panel.
 * ───────────────────────────────────────────────────────────────── */

const CANNED_BACKTRANSLATIONS = {
  'seg-q3ja-1': 'Q3 2026 net revenue rose 12.4% year-on-year, mainly led by strong APAC investment banking performance.',
  'seg-q3ja-2': 'European wealth management segment recorded a $42m goodwill impairment loss.',
  'seg-q3ja-3': 'The Board approved a quarterly dividend of $0.85 per share, payable June 15, 2026.',
  'seg-q3ja-4': 'Forward-looking statements in this report are subject to risks and uncertainties that may cause results to differ materially.',
  'seg-q3ja-5': 'EBITDA margin expanded by 220 basis points year-on-year.',
};

export function backTranslate(segmentId, target) {
  const canned = CANNED_BACKTRANSLATIONS[segmentId];
  if (canned) return { text: canned, provider: 'back-translation-agent v1.0' };
  // Fallback for segments without canned data.
  return { text: `[back-translation of ${(target || '').slice(0, 40)}…]`, provider: 'back-translation-agent v1.0' };
}

export function backTranslationDrift(segmentId, source, target) {
  const bt = backTranslate(segmentId, target).text;
  const srcTokens = new Set(source.toLowerCase().split(/\s+/).filter(Boolean));
  const btTokens = new Set(bt.toLowerCase().split(/\s+/).filter(Boolean));
  const inter = [...srcTokens].filter(t => btTokens.has(t)).length;
  return srcTokens.size ? 1 - inter / srcTokens.size : 0;
}

/* ─── Agent track-record (override / false-positive rates) ─────── */

export function agentTrackRecord(agentId, domain, windowDays = 90) {
  const since = Date.now() - windowDays * 24 * 3600 * 1000;
  // Look across all decisions in the window for segments with this agent.
  let appearances = 0, picked = 0, demoted = 0;
  for (const d of REVIEW_DECISIONS) {
    if (Date.parse(d.timestamp) < since) continue;
    const seg = HITL_SEGMENTS.find(s => s.id === d.segmentId);
    if (!seg) continue;
    const proj = HITL_PROJECTS.find(p => p.id === seg.projectId);
    if (domain && proj?.requirements?.domain !== domain) continue;
    const inPanel = (seg.agentCandidates || []).some(c => c.agentId === agentId);
    if (!inPanel) continue;
    appearances += 1;
    const chosenCand = (seg.agentCandidates || []).find(c => c.id === d.chosenCandidateId);
    if (chosenCand?.agentId === agentId) picked += 1;
    if (d.action === 'needs-rework' || d.validationStatus === 'demoted') demoted += 1;
  }
  return {
    agentId, domain, windowDays,
    appearances,
    pickRate:     appearances ? picked / appearances : null,
    overrideRate: appearances ? 1 - picked / appearances : null,
    fpRate:       picked     ? demoted / picked       : null,
  };
}

/* ─── Document-level helpers ───────────────────────────────────── */

export function documentRiskSummary(projectId) {
  const segs = HITL_SEGMENTS.filter(s => s.projectId === projectId);
  if (!segs.length) return null;
  const tally = {};
  for (const k of Object.keys(FLAG_CATEGORIES)) tally[k] = 0;
  for (const seg of segs) {
    for (const k of (seg.flagCategories || [])) tally[k] = (tally[k] || 0) + 1;
  }
  // Caught vs. open. A category is "caught" if every segment flagged with it has a non-pending decision.
  const caught = {}, open = {};
  for (const k of Object.keys(tally)) {
    if (!tally[k]) continue;
    const flagged = segs.filter(s => (s.flagCategories || []).includes(k));
    const resolved = flagged.filter(s => s.decision && s.decision !== 'pending');
    caught[k] = resolved.length;
    open[k]   = flagged.length - resolved.length;
  }
  return { total: segs.length, tally, caught, open };
}

export function documentPedigreeSeries(projectId) {
  const segs = HITL_SEGMENTS.filter(s => s.projectId === projectId).sort((a, b) => a.segmentNumber - b.segmentNumber);
  const out = { modelConfidence: [], depthScore: [], composite: [], humanConfidence: [] };
  for (const s of segs) {
    const p = segmentPedigree(s.id);
    if (!p) continue;
    out.modelConfidence.push(p.modelConfidence);
    out.depthScore.push(p.depthScore);
    out.composite.push(p.composite);
    out.humanConfidence.push(p.humanConfidence ?? 0);
  }
  return out;
}

/* ─── Threshold lookup ─────────────────────────────────────────── */

export function thresholdsFor(project, policy) {
  const t = policy?.confidenceThresholds || { autoPublishAt: 0.95, flagAt: 0.9, escalateAt: 0.75, perDomain: {} };
  const dom = project?.requirements?.domain;
  const override = dom ? (t.perDomain || {})[dom] : null;
  return {
    autoPublishAt: override?.autoPublishAt ?? t.autoPublishAt,
    flagAt:        override?.flagAt        ?? t.flagAt,
    escalateAt:    override?.escalateAt    ?? t.escalateAt,
  };
}
