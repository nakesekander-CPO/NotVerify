/**
 * Gamification engine
 *
 * Turns the vendors' real performance signals (quality, on-time,
 * rework, escalation, validation, cost) into an engagement model:
 * an arbitr Score, tiers, levels, streaks, badges, seasons, team
 * standings, and a customer-value translation.
 *
 * Everything here is PURE and DETERMINISTIC — the same vendor data
 * always yields the same profile, so the UI can present a stable
 * "live" leaderboard without a backend. Movement/deltas are derived
 * from a stable hash of the vendor id, not randomness.
 */

import { VENDORS, HITL_TASKS } from '../../data/hitlVendorWorkflow';

/* ─── Scoring ──────────────────────────────────────────────────── */

const WEIGHTS = {
  quality: 0.30,
  onTime: 0.20,
  validation: 0.20,
  lowRework: 0.15,
  lowEscalation: 0.10,
  cost: 0.05,
};

export const TIERS = [
  { id: 'elite',    label: 'Elite',    min: 930, color: 'ocean' },
  { id: 'platinum', label: 'Platinum', min: 880, color: 'teal' },
  { id: 'gold',     label: 'Gold',     min: 820, color: 'amber' },
  { id: 'silver',   label: 'Silver',   min: 740, color: 'slate' },
  { id: 'bronze',   label: 'Bronze',   min: 0,   color: 'mist' },
];

function tierFor(score) {
  return TIERS.find(t => score >= t.min) || TIERS[TIERS.length - 1];
}

/* Stable small hash so "weekly movement" is deterministic. */
function hashId(id = '') {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/* ─── Badges ───────────────────────────────────────────────────── */

export const BADGES = [
  { id: 'zero-rework',     name: 'Zero-Rework',        icon: 'ShieldCheck', desc: 'Rework rate at or below 3%.',                test: v => (v.reworkRate ?? 1) <= 0.03 },
  { id: 'on-time-sentinel',name: 'On-Time Sentinel',   icon: 'Clock',       desc: 'On-time delivery score 95+.',                test: v => (v.onTimeDeliveryScore ?? 0) >= 95 },
  { id: 'quality-anchor',  name: 'Quality Anchor',     icon: 'Anchor',      desc: 'Quality score 92+.',                         test: v => (v.qualityScore ?? 0) >= 92 },
  { id: 'validation-ace',  name: 'Validation Ace',     icon: 'Target',      desc: 'Average validation score 90+.',              test: v => (v.avgValidationScore ?? 0) >= 90 },
  { id: 'escalation-free', name: 'Escalation-Free',    icon: 'ShieldOff',   desc: 'Escalation rate at or below 2%.',            test: v => (v.escalationRate ?? 1) <= 0.02 },
  { id: 'compliance-guard',name: 'Compliance Guardian',icon: 'BadgeCheck',  desc: 'Holds 2+ compliance certifications.',        test: v => (v.certifications || []).length >= 2 },
  { id: 'cost-champion',   name: 'Cost Champion',      icon: 'PiggyBank',   desc: 'Cost-performance index 0.90+.',              test: v => (v.costPerformance ?? 0) >= 0.90 },
  { id: 'high-capacity',   name: 'Throughput Titan',   icon: 'Gauge',       desc: 'Capacity 60k+ words/week.',                  test: v => (v.capacityWordsPerWeek ?? 0) >= 60000 },
];

function badgesFor(v) {
  return BADGES.filter(b => {
    try { return b.test(v) } catch { return false }
  }).map(b => ({ id: b.id, name: b.name, icon: b.icon, desc: b.desc }));
}

/* ─── Player profile ───────────────────────────────────────────── */

export function playerProfile(v) {
  if (!v) return null;
  const q   = v.qualityScore ?? 0;
  const ot  = v.onTimeDeliveryScore ?? 0;
  const val = v.avgValidationScore ?? 0;
  const rw  = (1 - (v.reworkRate ?? 0)) * 100;
  const esc = (1 - (v.escalationRate ?? 0)) * 100;
  const cost = (v.costPerformance ?? 0) * 100;

  const composite =
    q * WEIGHTS.quality +
    ot * WEIGHTS.onTime +
    val * WEIGHTS.validation +
    rw * WEIGHTS.lowRework +
    esc * WEIGHTS.lowEscalation +
    cost * WEIGHTS.cost;

  const score = Math.round(composite * 10); // 0–1000
  const tier = tierFor(score);
  const level = Math.max(1, Math.floor(score / 50));
  const xpInLevel = score % 50;
  const xpPct = Math.round((xpInLevel / 50) * 100);

  const streak = Math.max(
    0,
    Math.round((ot - (v.reworkRate ?? 0) * 100) / 4)
  );

  // Deterministic weekly rank movement: −2 … +3
  const delta = (hashId(v.id) % 6) - 2;

  // Tasks this vendor is on (volume signal).
  const taskCount = HITL_TASKS.filter(t => t.assignedVendorId === v.id).length;

  return {
    vendorId: v.id,
    name: v.name,
    region: v.region || '—',
    type: v.type || 'vendor',
    score,
    tier,
    level,
    xpInLevel,
    xpPct,
    streak,
    delta,
    taskCount,
    badges: badgesFor(v),
    metrics: { quality: q, onTime: ot, validation: val, reworkRate: v.reworkRate ?? 0, escalationRate: v.escalationRate ?? 0 },
  };
}

const playablesCache = () =>
  VENDORS.filter(v => v.qualityScore != null).map(playerProfile).filter(Boolean);

/* ─── Leaderboard ──────────────────────────────────────────────── */

export function leaderboard() {
  const rows = playablesCache().sort((a, b) => b.score - a.score);
  return rows.map((p, i) => ({ ...p, rank: i + 1 }));
}

/* ─── Tier distribution ────────────────────────────────────────── */

export function tierDistribution() {
  const players = playablesCache();
  return TIERS.map(t => ({
    ...t,
    count: players.filter(p => p.tier.id === t.id).length,
  }));
}

/* ─── Badge gallery (with earn counts) ─────────────────────────── */

export function badgeGallery() {
  const players = playablesCache();
  return BADGES.map(b => {
    const earners = players.filter(p => p.badges.some(x => x.id === b.id));
    return {
      id: b.id, name: b.name, icon: b.icon, desc: b.desc,
      earnedCount: earners.length,
      earners: earners.map(e => ({ vendorId: e.vendorId, name: e.name })),
    };
  });
}

/* ─── Season ───────────────────────────────────────────────────── */

export function seasonInfo(now = new Date()) {
  const month = now.toLocaleString('en-US', { month: 'long' });
  const year = now.getFullYear();
  const endOfMonth = new Date(year, now.getMonth() + 1, 0);
  const daysLeft = Math.max(0, Math.ceil((endOfMonth - now) / 86400000));
  const themes = [
    'Quality Sprint', 'Zero-Rework Drive', 'On-Time Challenge',
    'Compliance Cup', 'First-Pass Marathon', 'Validation Ladder',
  ];
  const theme = themes[now.getMonth() % themes.length];
  return {
    id: `${year}-${now.getMonth() + 1}`,
    name: `${month} ${year} · ${theme}`,
    theme,
    daysLeft,
    goal: 'Lift pool-wide first-pass validation by 3 points and keep escalations under 2%.',
    rewardPool: 5000, // points
  };
}

/* ─── Active challenges ────────────────────────────────────────── */

export function activeChallenges() {
  const players = playablesCache();
  const avg = (sel) => players.length ? players.reduce((s, p) => s + sel(p), 0) / players.length : 0;
  return [
    {
      id: 'zero-rework-week',
      name: 'Zero-Rework Week',
      desc: 'Keep rework at or below 3% across all assigned work.',
      reward: 750,
      progress: Math.round((players.filter(p => p.metrics.reworkRate <= 0.03).length / Math.max(1, players.length)) * 100),
      metric: 'players at target',
    },
    {
      id: 'validation-ladder',
      name: 'Validation Ladder',
      desc: 'Pool-average validation score climbs toward 92.',
      reward: 1000,
      progress: Math.min(100, Math.round((avg(p => p.metrics.validation) / 92) * 100)),
      metric: 'of 92 target',
    },
    {
      id: 'on-time-streak',
      name: 'On-Time Streak Relay',
      desc: 'Team-wide consecutive on-time deliveries.',
      reward: 600,
      progress: Math.min(100, Math.round((avg(p => p.streak) / 20) * 100)),
      metric: 'toward 20-streak',
    },
    {
      id: 'compliance-cup',
      name: 'Compliance Cup',
      desc: 'Every active vendor carries 2+ live compliance certs.',
      reward: 800,
      progress: Math.round((players.filter(p => p.badges.some(b => b.id === 'compliance-guard')).length / Math.max(1, players.length)) * 100),
      metric: 'fully certified',
    },
  ];
}

/* ─── Team standings (by region) ───────────────────────────────── */

export function teamStandings() {
  const players = playablesCache();
  const groups = {};
  for (const p of players) {
    (groups[p.region] ||= []).push(p);
  }
  return Object.entries(groups)
    .map(([region, ps]) => ({
      region,
      members: ps.length,
      avgScore: Math.round(ps.reduce((s, p) => s + p.score, 0) / ps.length),
      topPlayer: ps.slice().sort((a, b) => b.score - a.score)[0]?.name,
    }))
    .sort((a, b) => b.avgScore - a.avgScore);
}

/* ─── Customer-value translation ───────────────────────────────── */

export function customerValueSummary() {
  const vs = VENDORS.filter(v => v.qualityScore != null);
  if (!vs.length) return null;
  const avg = (sel) => vs.reduce((s, v) => s + sel(v), 0) / vs.length;

  const turnaroundSavedHrs = Math.round(
    vs.reduce((s, v) => s + Math.max(0, (v.slaCommitmentHours ?? 0) - (v.avgTurnaroundHours ?? 0)), 0)
  );
  const escalationsAvoided = Math.round(
    vs.reduce((s, v) => s + Math.max(0, (0.1 - (v.escalationRate ?? 0)) * ((v.capacityWordsPerWeek ?? 0) / 1000)), 0)
  );
  const firstPassRate = Math.round(avg(v => 100 - (v.reworkRate ?? 0) * 100));
  const validationLift = Math.round(avg(v => (v.avgValidationScore ?? 0)) - 80);

  return [
    { id: 'first-pass', label: 'First-pass acceptance', value: `${firstPassRate}%`, sub: 'Fewer review cycles for the client', tone: 'teal' },
    { id: 'turnaround', label: 'Turnaround banked', value: `${turnaroundSavedHrs}h`, sub: 'Delivered ahead of SLA commitments', tone: 'ocean' },
    { id: 'escalations', label: 'Escalations avoided', value: `~${escalationsAvoided}`, sub: 'Issues caught before reaching the customer', tone: 'amber' },
    { id: 'validation', label: 'Validation lift', value: `+${validationLift}`, sub: 'Above the 80-point quality floor', tone: 'teal' },
  ];
}

/* ─── Reward mechanics (the "how we gamify" catalogue) ─────────── */

export const REWARD_MECHANICS = [
  { id: 'priority-routing', name: 'Priority routing', desc: 'Top-tier vendors are surfaced first by the selection engine for premium projects.', valueToCustomer: 'Best-matched talent on high-stakes work.' },
  { id: 'rate-tier', name: 'Performance rate tier', desc: 'Sustained Gold+ unlocks a preferred commercial rate band.', valueToCustomer: 'Quality is rewarded, not just lowest cost.' },
  { id: 'recognition', name: 'Public recognition', desc: 'Monthly leaderboard + badges visible across the network.', valueToCustomer: 'Transparent, accountable supplier quality.' },
  { id: 'auto-trust', name: 'Trust acceleration', desc: 'Streaks raise auto-publish thresholds, reducing manual gating.', valueToCustomer: 'Faster delivery with maintained guardrails.' },
  { id: 'season-prize', name: 'Season prize pool', desc: 'Points convert to a quarterly recognition award.', valueToCustomer: 'Engaged, motivated reviewers = consistent output.' },
];
