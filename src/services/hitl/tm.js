/**
 * Translation Memory matching.
 *
 * Computes a Jaccard token-set ratio between the active segment's
 * source text and every entry in the TM store (filtered by domain +
 * target language). Returns the top N matches sorted by ratio
 * descending, paired with the prior translation.
 *
 * In production this is replaced by a vector-based TM lookup.
 */

import { TM_ENTRIES } from '../../data/hitlVendorWorkflow';

function tokens(s) {
  return new Set(
    (s || '')
      .toLowerCase()
      .split(/\s+|[、。．,.!?():;–—]/)
      .map(t => t.trim())
      .filter(t => t.length > 1)
  );
}

function jaccard(a, b) {
  if (!a.size && !b.size) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter += 1;
  const union = a.size + b.size - inter;
  return union ? inter / union : 0;
}

export function findTMMatches({ source, project, max = 3, threshold = 0.18 }) {
  if (!source || !project) return [];
  const targetLang = project.requirements?.targetLanguages?.[0];
  const domain = project.requirements?.domain;
  const srcTokens = tokens(source);
  const scored = [];
  for (const e of TM_ENTRIES) {
    if (domain && e.domain !== domain) continue;
    if (targetLang && e.language !== targetLang) continue;
    const ratio = jaccard(srcTokens, tokens(e.source));
    if (ratio < threshold) continue;
    scored.push({ ...e, matchRatio: ratio });
  }
  scored.sort((a, b) => b.matchRatio - a.matchRatio);
  return scored.slice(0, max);
}
