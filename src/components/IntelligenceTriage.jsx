import { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  CheckCircle2,
  X,
  Loader2,
  BookOpen,
  GitBranch,
  Sparkles,
  ArrowRight,
  Shield,
  ChevronRight,
  ChevronDown,
  Settings,
  Undo2,
  Database,
} from 'lucide-react';
import useReducedMotion from '../hooks/useReducedMotion';
import { useToast } from './ToastProvider';

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const TRIAGE_ITEMS = {
  highConfidence: {
    label: 'High Confidence',
    description: 'Agent consensus \u2265 95%. Safe to auto-promote.',
    color: 'emerald',
    items: [
      { id: 't1', type: 'terminology', source: 'Goodwill', target: '\u306e\u308c\u3093', context: 'J-GAAP financial reporting', agent: 'JP-FIN-3', confidence: 98 },
      { id: 't2', type: 'terminology', source: 'Revenue Recognition', target: '\u53ce\u76ca\u8a8d\u8b58', context: 'ASC 606 / ASBJ 29', agent: 'JP-FIN-3', confidence: 97 },
      { id: 't3', type: 'terminology', source: 'Impairment Loss', target: '\u6e1b\u640d\u640d\u5931', context: 'Asset valuation', agent: 'JP-FIN-3', confidence: 96 },
      { id: 't4', type: 'terminology', source: 'Our company', target: '\u5f53\u793e', context: 'Formal self-reference', agent: 'MER-DT-1', confidence: 99 },
      { id: 'p1', type: 'pattern', source: '$X million \u2192 \u00a5X\u767e\u4e07', target: 'Currency conversion pattern', context: 'Financial amounts', agent: 'JP-FIN-3', confidence: 95 },
      { id: 'p2', type: 'pattern', source: 'Q[N] \u2192 \u7b2c[N]\u56db\u534a\u671f', target: 'Quarter reference pattern', context: 'Fiscal calendar', agent: 'JP-FIN-3', confidence: 96 },
    ],
  },
  mediumConfidence: {
    label: 'Medium Confidence',
    description: 'Agent consensus 80-94%. Review recommended.',
    color: 'amber',
    items: [
      { id: 't5', type: 'terminology', source: 'Operating Income', target: '\u55b6\u696d\u5229\u76ca', context: 'Income statement', agent: 'JP-FIN-3', confidence: 88 },
      { id: 't6', type: 'terminology', source: 'Cash Flow Statement', target: '\u30ad\u30e3\u30c3\u30b7\u30e5\u30fb\u30d5\u30ed\u30fc\u8a08\u7b97\u66f8', context: 'Financial statements', agent: 'JP-FIN-3', confidence: 85 },
      { id: 'p3', type: 'pattern', source: 'we believe \u2192 \u5f53\u793e\u306f\u8a8d\u8b58\u3057\u3066\u304a\u308a\u307e\u3059', target: 'Formal register pattern', context: 'Corporate tone', agent: 'BV-SENT-1', confidence: 82 },
    ],
  },
  lowConfidence: {
    label: 'Low Confidence',
    description: 'Agent consensus < 80%. Manual review required.',
    color: 'red',
    items: [
      { id: 't7', type: 'terminology', source: 'Equity Method', target: '\u6301\u5206\u6cd5', context: 'Investment accounting', agent: 'JP-FIN-3', confidence: 72 },
      { id: 'p4', type: 'pattern', source: 'FY[YYYY] \u2192 [YYYY]\u5e74\u5ea6', target: 'Fiscal year format', context: 'Date formatting', agent: 'JP-FIN-3', confidence: 68 },
    ],
  },
};

const TIER_ORDER = ['highConfidence', 'mediumConfidence', 'lowConfidence'];

const AUDIT_TRAILS = {
  t1: { agents: ['JP-FIN-3', 'MER-DT-1', 'BV-SENT-1'], votes: [99, 97, 98], kbMatches: 12, kbSource: 'J-GAAP Knowledge Base v2.4', lastSeen: '2024-11-15', frequency: 47 },
  t2: { agents: ['JP-FIN-3', 'MER-DT-1'], votes: [97, 96], kbMatches: 8, kbSource: 'ASBJ Standard Terms', lastSeen: '2024-12-01', frequency: 31 },
  t3: { agents: ['JP-FIN-3', 'MER-DT-1', 'BV-SENT-1'], votes: [96, 95, 97], kbMatches: 5, kbSource: 'J-GAAP Knowledge Base v2.4', lastSeen: '2024-10-22', frequency: 23 },
  t4: { agents: ['MER-DT-1', 'BV-SENT-1'], votes: [99, 99], kbMatches: 156, kbSource: 'Meridian Brand Guidelines', lastSeen: '2024-12-10', frequency: 891 },
  p1: { agents: ['JP-FIN-3', 'MER-DT-1'], votes: [95, 94], kbMatches: 34, kbSource: 'Currency Conversion Patterns', lastSeen: '2024-11-28', frequency: 67 },
  p2: { agents: ['JP-FIN-3'], votes: [96], kbMatches: 18, kbSource: 'Fiscal Calendar Patterns', lastSeen: '2024-11-30', frequency: 42 },
};

const THRESHOLD_OPTIONS = [
  { value: 90, label: '90%' },
  { value: 92, label: '92%' },
  { value: 95, label: '95%' },
  { value: 98, label: '98%' },
  { value: 100, label: '100% (manual only)' },
];

/* ------------------------------------------------------------------ */
/*  Color maps                                                         */
/* ------------------------------------------------------------------ */

const TIER_COLORS = {
  emerald: {
    border: 'border-emerald-500',
    bg: 'bg-emerald-50',
    text: 'text-emerald-600',
    badge: 'bg-emerald-500/20 text-emerald-600',
    button: 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-600',
    dot: 'bg-emerald-400',
  },
  amber: {
    border: 'border-amber-500',
    bg: 'bg-amber-50',
    text: 'text-amber-600',
    badge: 'bg-amber-500/20 text-amber-600',
    button: 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-600',
    dot: 'bg-amber-400',
  },
  red: {
    border: 'border-red-500',
    bg: 'bg-red-50',
    text: 'text-red-600',
    badge: 'bg-red-500/20 text-red-600',
    button: 'bg-red-500/20 hover:bg-red-500/30 text-red-600',
    dot: 'bg-red-400',
  },
};

/* ------------------------------------------------------------------ */
/*  Spring config                                                      */
/* ------------------------------------------------------------------ */

const SPRING = { type: 'spring', stiffness: 300, damping: 20 };

/* ------------------------------------------------------------------ */
/*  Helper: compute summary counts from actual data                    */
/* ------------------------------------------------------------------ */

function computeCounts() {
  let terms = 0;
  let patterns = 0;
  const agents = new Set();

  for (const tier of Object.values(TRIAGE_ITEMS)) {
    for (const item of tier.items) {
      if (item.type === 'terminology') terms++;
      if (item.type === 'pattern') patterns++;
      agents.add(item.agent);
    }
  }

  return { terms, patterns, agents: agents.size };
}

/* ------------------------------------------------------------------ */
/*  Helper: get all item IDs that meet a given threshold               */
/* ------------------------------------------------------------------ */

function getAutoCommitIds(threshold) {
  if (threshold >= 100) return new Set();
  const ids = new Set();
  for (const tier of Object.values(TRIAGE_ITEMS)) {
    for (const item of tier.items) {
      if (item.confidence >= threshold) {
        ids.add(item.id);
      }
    }
  }
  return ids;
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function StatCard({ icon: Icon, value, label, colorClass, index, reduced }) {
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduced ? { duration: 0 } : { ...SPRING, delay: index * 0.08 }}
      className="flex-1 rounded-lg border border-black/[0.12] bg-[#EDEFFB] p-4"
    >
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${colorClass}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="font-mono text-xl font-semibold text-gray-900">{value}</p>
          <p className="text-xs text-gray-500">{label}</p>
        </div>
      </div>
    </motion.div>
  );
}

function TypeBadge({ type }) {
  const isPattern = type === 'pattern';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider ${
        isPattern
          ? 'bg-violet-500/20 text-violet-600'
          : 'bg-sky-500/20 text-sky-600'
      }`}
    >
      {isPattern ? <GitBranch className="h-3 w-3" /> : <BookOpen className="h-3 w-3" />}
      {type}
    </span>
  );
}

function AuditTrailPanel({ item, audit }) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className="overflow-hidden"
    >
      <div className="bg-[#ffffff]/60 border border-black/[0.12] rounded-lg mx-6 mb-2 p-4 space-y-4">
        {/* Agent Consensus */}
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Agent Consensus</h4>
          <div className="space-y-1.5">
            {audit.agents.map((agent, idx) => {
              const vote = audit.votes[idx];
              const barColor = vote >= 95 ? 'bg-emerald-400' : 'bg-amber-400';
              return (
                <div key={agent} className="flex items-center gap-3">
                  <span className="w-24 shrink-0 font-mono text-[11px] text-gray-500">{agent}</span>
                  <div className="flex-1 h-2 rounded-full bg-black/[0.04] overflow-hidden">
                    <div className={`h-full rounded-full ${barColor}`} style={{ width: `${vote}%` }} />
                  </div>
                  <span className="w-10 shrink-0 text-right font-mono text-[11px] text-gray-700">{vote}%</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Knowledge Base Evidence */}
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Knowledge Base Evidence</h4>
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <Database className="h-4 w-4 text-[#3D16FA] shrink-0" />
            <span>
              Matched against <span className="font-mono text-gray-900">{audit.kbMatches}</span> entries in <span className="text-[#3D16FA]">{audit.kbSource}</span>
            </span>
          </div>
        </div>

        {/* Provenance */}
        <p className="text-xs text-gray-400">
          First seen <span className="font-mono text-gray-500">{audit.frequency}</span> times across <span className="font-mono text-gray-500">{audit.agents.length}</span> projects. Last matched: <span className="font-mono text-gray-500">{audit.lastSeen}</span>
        </p>
      </div>
    </motion.div>
  );
}

function TriageRow({ item, isApproved, isAutoCommitted, isDiscarded, onApprove, onDiscard, onUndo, delay, reduced }) {
  return (
    <motion.div
      layout={!reduced}
      initial={reduced ? false : { opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={reduced ? { opacity: 0 } : { opacity: 0, x: 120 }}
      transition={reduced ? { duration: 0 } : { ...SPRING, delay }}
      className={`group flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
        isAutoCommitted
          ? 'border-emerald-500/30 bg-emerald-500/5 border-l-2 border-l-emerald-400 shadow-[inset_2px_0_8px_-2px_rgba(0,184,135,0.2)]'
          : isApproved
            ? 'border-emerald-500/20 bg-emerald-500/5'
            : 'border-black/[0.06] bg-black/[0.02] hover:bg-black/[0.04]'
      }`}
    >
      {/* Approved checkmark / Auto-committed badge */}
      <div className="flex h-5 w-5 shrink-0 items-center justify-center">
        {isAutoCommitted ? (
          <motion.div
            initial={reduced ? false : { scale: 0 }}
            animate={{ scale: 1 }}
            transition={reduced ? { duration: 0 } : SPRING}
          >
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          </motion.div>
        ) : isApproved ? (
          <motion.div
            initial={reduced ? false : { scale: 0 }}
            animate={{ scale: 1 }}
            transition={reduced ? { duration: 0 } : SPRING}
          >
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          </motion.div>
        ) : (
          <button
            onClick={() => onApprove(item.id)}
            className="flex h-5 w-5 items-center justify-center rounded border border-black/[0.12] text-gray-400 transition-colors hover:border-emerald-500/40 hover:text-emerald-600"
            aria-label={`Approve ${item.source}`}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Auto-committed pill */}
      {isAutoCommitted && (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-medium text-emerald-600">
          Auto-committed
        </span>
      )}

      {/* Type */}
      <TypeBadge type={item.type} />

      {/* Source -> Target */}
      <div className={`flex min-w-0 flex-1 items-center gap-2 ${isApproved || isAutoCommitted ? 'opacity-50' : ''}`}>
        <span className="truncate font-medium text-gray-900 text-sm">{item.source}</span>
        <ArrowRight className="h-3 w-3 shrink-0 text-gray-400" />
        <span className="truncate text-sm text-gray-700">{item.target}</span>
      </div>

      {/* Context */}
      <span className={`hidden text-xs text-gray-400 lg:inline ${isApproved || isAutoCommitted ? 'opacity-50' : ''}`}>
        {item.context}
      </span>

      {/* Agent badge */}
      <span
        className={`hidden shrink-0 rounded bg-[#ffffff] px-1.5 py-0.5 font-mono text-[10px] text-gray-500 md:inline ${
          isApproved || isAutoCommitted ? 'opacity-50' : ''
        }`}
      >
        {item.agent}
      </span>

      {/* Confidence */}
      <span
        className={`shrink-0 font-mono text-xs ${
          isApproved || isAutoCommitted ? 'text-gray-400' : 'text-gray-700'
        }`}
      >
        {item.confidence}%
      </span>

      {/* Undo for auto-committed, Discard for others */}
      {isAutoCommitted ? (
        <button
          onClick={() => onUndo(item.id)}
          className="flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-gray-400 opacity-0 transition-all hover:bg-black/[0.06] hover:text-gray-700 group-hover:opacity-100"
          aria-label={`Undo auto-commit for ${item.source}`}
        >
          <Undo2 className="h-3 w-3" />
          Undo
        </button>
      ) : !isApproved ? (
        <button
          onClick={() => onDiscard(item.id)}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-gray-300 opacity-0 transition-all hover:bg-red-500/20 hover:text-red-600 group-hover:opacity-100"
          aria-label={`Discard ${item.source}`}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export default function IntelligenceTriage({ onApprove }) {
  const reduced = useReducedMotion();
  const { addToast } = useToast();

  const [autoThreshold, setAutoThreshold] = useState(95);
  const [autoCommittedIds, setAutoCommittedIds] = useState(() => getAutoCommitIds(95));
  const [approvedIds, setApprovedIds] = useState(new Set());
  const [discardedIds, setDiscardedIds] = useState(new Set());
  const [committed, setCommitted] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [expandedAuditId, setExpandedAuditId] = useState(null);

  const counts = useMemo(computeCounts, []);

  /* -- Recompute auto-committed items when threshold changes -------- */
  useEffect(() => {
    const newAutoIds = getAutoCommitIds(autoThreshold);
    setAutoCommittedIds(newAutoIds);
    // Remove any items from manual approvedIds that are now auto-committed
    setApprovedIds((prev) => {
      const next = new Set(prev);
      for (const id of newAutoIds) {
        next.delete(id);
      }
      return next;
    });
  }, [autoThreshold]);

  /* -- all item ids ------------------------------------------------ */
  const allIds = useMemo(() => {
    const ids = [];
    for (const tier of Object.values(TRIAGE_ITEMS)) {
      for (const item of tier.items) ids.push(item.id);
    }
    return ids;
  }, []);

  const totalItems = allIds.length;
  const autoCommittedCount = autoCommittedIds.size;
  const manuallyApprovedCount = approvedIds.size;
  const approvedCount = autoCommittedCount + manuallyApprovedCount;
  const discardedCount = discardedIds.size;
  const remainingCount = totalItems - approvedCount - discardedCount;
  const allResolved = remainingCount === 0;

  /* -- Derived summary counts by category -------------------------- */
  const pendingReviewCount = useMemo(() => {
    let count = 0;
    for (const tier of Object.values(TRIAGE_ITEMS)) {
      for (const item of tier.items) {
        if (
          !autoCommittedIds.has(item.id) &&
          !approvedIds.has(item.id) &&
          !discardedIds.has(item.id) &&
          item.confidence >= 80
        ) {
          count++;
        }
      }
    }
    return count;
  }, [autoCommittedIds, approvedIds, discardedIds]);

  const manualRequiredCount = useMemo(() => {
    let count = 0;
    for (const tier of Object.values(TRIAGE_ITEMS)) {
      for (const item of tier.items) {
        if (
          !autoCommittedIds.has(item.id) &&
          !approvedIds.has(item.id) &&
          !discardedIds.has(item.id) &&
          item.confidence < 80
        ) {
          count++;
        }
      }
    }
    return count;
  }, [autoCommittedIds, approvedIds, discardedIds]);

  /* -- handlers ---------------------------------------------------- */
  const handleApproveOne = useCallback((id) => {
    setApprovedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    addToast('\u2713 Approved & queued for Cortex', 'success', 2500);
  }, [addToast]);

  const handleDiscardOne = useCallback((id) => {
    setDiscardedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const handleUndoAutoCommit = useCallback((id) => {
    setAutoCommittedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const handleApproveAll = useCallback(
    (tierKey) => {
      const tierItems = TRIAGE_ITEMS[tierKey].items;
      setApprovedIds((prev) => {
        const next = new Set(prev);
        for (const item of tierItems) {
          if (!discardedIds.has(item.id) && !autoCommittedIds.has(item.id)) next.add(item.id);
        }
        return next;
      });
    },
    [discardedIds, autoCommittedIds],
  );

  const handleThresholdChange = useCallback((e) => {
    setAutoThreshold(Number(e.target.value));
  }, []);

  const handleCommit = useCallback(() => {
    if (!allResolved || committing || committed) return;
    setCommitting(true);

    setTimeout(() => {
      setCommitting(false);
      setCommitted(true);

      if (onApprove) {
        const approved = [];
        for (const tier of Object.values(TRIAGE_ITEMS)) {
          for (const item of tier.items) {
            if (approvedIds.has(item.id) || autoCommittedIds.has(item.id)) approved.push(item);
          }
        }
        onApprove(approved);
      }
      addToast('\u2713 All intelligence committed to Cortex \u2014 Models will retrain on next cycle', 'success', 3000);
    }, 1500);
  }, [allResolved, committing, committed, approvedIds, autoCommittedIds, onApprove, addToast]);

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */
  return (
    <section className="space-y-6">
      {/* ---- Section Header ---- */}
      <motion.div
        initial={reduced ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reduced ? { duration: 0 } : SPRING}
      >
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-[#3D16FA]" />
          <h2 className="text-lg font-semibold text-gray-900">Cumulative Intelligence Triage</h2>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          Review and govern what your agents learned from this project
        </p>
      </motion.div>

      {/* ---- Autonomous Governance Settings ---- */}
      <motion.div
        initial={reduced ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reduced ? { duration: 0 } : { ...SPRING, delay: 0.05 }}
        className="rounded-lg border border-black/[0.12] bg-[#EDEFFB] p-4"
      >
        <div className="flex items-center gap-2 mb-3">
          <Settings className="h-4 w-4 text-gray-500" />
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-700">
            Autonomous Governance
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-700">Auto-commit consensus above:</span>
          <select
            value={autoThreshold}
            onChange={handleThresholdChange}
            className="rounded-lg border border-black/[0.12] bg-[#ffffff] px-3 py-1.5 text-sm font-medium text-gray-900 outline-none transition-colors hover:border-black/[0.20] focus:border-[#3D16FA]/50"
          >
            {THRESHOLD_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <span className="text-sm text-gray-500">to Cortex</span>
        </div>
        <p className="mt-2 text-xs text-gray-400">
          Items exceeding this threshold are automatically committed. You can undo any auto-committed item within 48 hours.
        </p>
      </motion.div>

      {/* ---- Summary Bar ---- */}
      <div className="flex gap-3">
        <StatCard
          icon={CheckCircle2}
          value={`${autoCommittedCount} Auto-committed`}
          label="Above threshold"
          colorClass="bg-emerald-500/20 text-emerald-600"
          index={0}
          reduced={reduced}
        />
        <StatCard
          icon={Sparkles}
          value={`${pendingReviewCount} Pending Review`}
          label="Needs approval"
          colorClass="bg-amber-500/20 text-amber-600"
          index={1}
          reduced={reduced}
        />
        <StatCard
          icon={Shield}
          value={`${manualRequiredCount} Manual Required`}
          label="Low confidence"
          colorClass="bg-red-500/20 text-red-600"
          index={2}
          reduced={reduced}
        />
      </div>

      {/* ---- Confidence Tiers ---- */}
      <div className="space-y-4">
        {TIER_ORDER.map((tierKey, tierIdx) => {
          const tier = TRIAGE_ITEMS[tierKey];
          const colors = TIER_COLORS[tier.color];
          const visibleItems = tier.items.filter((i) => !discardedIds.has(i.id));
          const allTierResolved = tier.items.every(
            (i) => approvedIds.has(i.id) || discardedIds.has(i.id) || autoCommittedIds.has(i.id),
          );
          const allTierAutoCommitted = tier.items.every(
            (i) => autoCommittedIds.has(i.id) || discardedIds.has(i.id),
          );

          return (
            <motion.div
              key={tierKey}
              initial={reduced ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={
                reduced ? { duration: 0 } : { ...SPRING, delay: 0.15 + tierIdx * 0.1 }
              }
              className={`rounded-lg border-l-2 ${colors.border} border border-l-2 border-black/[0.06] bg-[#ffffff] p-4`}
            >
              {/* Tier header */}
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`h-2 w-2 rounded-full ${colors.dot}`} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-semibold ${colors.text}`}>{tier.label}</span>
                      <span className="rounded bg-black/[0.04] px-1.5 py-0.5 font-mono text-[10px] text-gray-500">
                        {tier.items.length}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">{tier.description}</p>
                  </div>
                </div>

                {allTierAutoCommitted ? (
                  <span className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium bg-emerald-50 text-emerald-600">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Auto-committed
                  </span>
                ) : !allTierResolved ? (
                  <button
                    onClick={() => handleApproveAll(tierKey)}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${colors.button}`}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Approve All
                  </button>
                ) : null}
              </div>

              {/* Item list */}
              <div className="space-y-1.5">
                <AnimatePresence mode="popLayout">
                  {visibleItems.map((item, itemIdx) => {
                    const isAuto = autoCommittedIds.has(item.id);
                    const auditExpanded = isAuto && expandedAuditId === item.id;
                    return (
                      <div
                        key={item.id}
                        className={isAuto ? 'cursor-pointer' : ''}
                        onClick={isAuto ? () => setExpandedAuditId(auditExpanded ? null : item.id) : undefined}
                      >
                        <div className="relative">
                          <TriageRow
                            item={item}
                            isApproved={approvedIds.has(item.id)}
                            isAutoCommitted={isAuto}
                            isDiscarded={false}
                            onApprove={handleApproveOne}
                            onDiscard={handleDiscardOne}
                            onUndo={handleUndoAutoCommit}
                            delay={0.02 * itemIdx}
                            reduced={reduced}
                          />
                          {isAuto && (
                            <div className="absolute right-12 top-1/2 -translate-y-1/2 pointer-events-none">
                              <ChevronDown
                                className={`h-3.5 w-3.5 text-gray-400 transition-transform duration-200 ${auditExpanded ? 'rotate-180' : ''}`}
                              />
                            </div>
                          )}
                        </div>
                        {tierKey === 'mediumConfidence' && item.source === 'Operating Income' && (
                          <p className="text-[11px] text-emerald-600/80 mt-1 flex items-center gap-1">
                            <Sparkles size={10} />
                            Recommended: Matches 12 previous Cortex patterns
                          </p>
                        )}
                        {tierKey === 'mediumConfidence' && item.source === 'Cash Flow Statement' && (
                          <p className="text-[11px] text-emerald-600/80 mt-1 flex items-center gap-1">
                            <Sparkles size={10} />
                            Recommended: 94% confidence — agent consensus from JP-FIN-3 + MER-DT-1
                          </p>
                        )}
                        <AnimatePresence>
                          {auditExpanded && AUDIT_TRAILS[item.id] && (
                            <AuditTrailPanel item={item} audit={AUDIT_TRAILS[item.id]} />
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </AnimatePresence>

                {visibleItems.length === 0 && (
                  <p className="py-3 text-center text-xs text-gray-300">
                    All items discarded
                  </p>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ---- Bottom Action Bar ---- */}
      <motion.div
        initial={reduced ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reduced ? { duration: 0 } : { ...SPRING, delay: 0.4 }}
        className="flex items-center justify-between rounded-lg border border-black/[0.12] bg-[#EDEFFB] px-5 py-3"
      >
        <p className="text-sm text-gray-500">
          <span className="font-medium text-emerald-600">{autoCommittedCount}</span> auto-committed
          <span className="mx-1.5 text-gray-300">&middot;</span>
          <span className="font-medium text-emerald-600">{manuallyApprovedCount}</span> manually approved
          <span className="mx-1.5 text-gray-300">&middot;</span>
          <span className="font-medium text-red-600">{discardedCount}</span> discarded
          <span className="mx-1.5 text-gray-300">&middot;</span>
          <span className="font-medium text-gray-700">{remainingCount}</span> remaining
        </p>

        <button
          disabled={!allResolved || committing}
          onClick={handleCommit}
          className={`flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold transition-all ${
            committed
              ? 'bg-emerald-500/20 text-emerald-600'
              : allResolved && !committing
                ? 'bg-amber text-white hover:bg-amber-deep'
                : 'cursor-not-allowed bg-black/[0.03] text-gray-300'
          }`}
        >
          {committing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Committing...
            </>
          ) : committed ? (
            <>
              <CheckCircle2 className="h-4 w-4" />
              Committed
            </>
          ) : (
            <>
              <Shield className="h-4 w-4" />
              Confirm & Commit to Cortex
            </>
          )}
        </button>
      </motion.div>
    </section>
  );
}
