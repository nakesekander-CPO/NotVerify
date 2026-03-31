import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp,
  Sparkles,
  AlertTriangle,
  Zap,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  Clock,
  UserPlus,
  Check,
  ChevronDown,
  X,
  MoreHorizontal,
} from 'lucide-react';
import useReducedMotion from '../hooks/useReducedMotion';

/* ─── Data ─── */

const FEED_ITEMS = [
  {
    id: 'alert-3',
    icon: AlertTriangle,
    color: 'amber',
    severity: 'urgent',
    title: 'JA quality dropped 6 pts',
    detail: '3 unresolved J-GAAP knowledge gaps across Q2 Earnings and Product Launch.',
    action: { label: 'View Diagnostics', type: 'diagnostics' },
    timestamp: '3d',
  },
  {
    id: 'alert-1',
    icon: TrendingUp,
    color: 'emerald',
    severity: 'urgent',
    title: 'PT-BR volume up 40%',
    detail: 'Deployment requests grew 40% this quarter. Consider training a Custom Tone Agent.',
    action: { label: 'Train Agent', type: 'studio' },
    timestamp: '2h',
  },
  {
    id: 'alert-2',
    icon: Sparkles,
    color: 'violet',
    severity: 'info',
    title: 'New SEC Filing Agent available',
    detail: 'SEC 10-K Filing Agent v2.1 — 94% accuracy on regulatory filings.',
    action: { label: 'View Agent', type: 'marketplace' },
    timestamp: '1d',
  },
  {
    id: 'alert-4',
    icon: Zap,
    color: 'blue',
    severity: 'info',
    title: 'Custom Agents warming up',
    detail: 'Your agents have processed 34% of historical data. Target: 50% by Q4.',
    action: { label: 'View Report', type: 'report' },
    timestamp: '5d',
  },
  {
    id: 'alert-5',
    icon: ShieldCheck,
    color: 'teal',
    severity: 'info',
    title: '12-project compliance streak',
    detail: '98.5% regulatory compliance maintained. J-GAAP Agent performing +14% above avg.',
    action: { label: 'View Log', type: 'report' },
    timestamp: '1w',
  },
];

const DIAGNOSTICS = {
  cause: '3 unresolved J-GAAP knowledge gaps',
  terms: ['のれん', '減損損失', '持分法'],
  projects: [
    { name: 'Q2 Earnings Report', date: 'Jul 14', score: 86, delta: -6 },
    { name: 'Product Launch', date: 'Sep 3', score: 82, delta: -4 },
  ],
  actions: ['Add 3 entries to J-GAAP knowledge base (+6 pts)', 'Re-run with Brand Voice Sentry enabled'],
};

const SNOOZE_OPTIONS = ['1 day', '1 week', 'Until next project'];

const COLOR = {
  amber: { dot: 'bg-amber-500', icon: 'text-amber-600', bg: 'bg-amber-500/8', action: 'text-amber-600', border: 'border-amber-500/30' },
  emerald: { dot: 'bg-emerald-500', icon: 'text-emerald-600', bg: 'bg-emerald-500/8', action: 'text-emerald-600', border: 'border-emerald-500/30' },
  violet: { dot: 'bg-violet-500', icon: 'text-violet-600', bg: 'bg-violet-500/8', action: 'text-violet-600', border: 'border-violet-500/30' },
  blue: { dot: 'bg-blue-500', icon: 'text-blue-600', bg: 'bg-blue-500/8', action: 'text-blue-600', border: 'border-blue-500/30' },
  teal: { dot: 'bg-teal-500', icon: 'text-teal-400', bg: 'bg-teal-500/8', action: 'text-teal-400', border: 'border-teal-500/30' },
};

const spring = { type: 'spring', stiffness: 300, damping: 24 };

/* ─── Diagnostics Panel (for JA Quality) ─── */

function DiagnosticsPanel({ onActionClick }) {
  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="overflow-hidden"
    >
      <div className="mt-3 rounded-lg border border-amber-500/15 bg-amber-500/[0.04] px-3.5 py-3">
        <div className="text-[11px] uppercase tracking-wider text-amber-600/70 font-bold mb-2">Root Cause</div>
        <p className="text-gray-700 text-[12.5px] leading-relaxed mb-2">
          {DIAGNOSTICS.cause}:{' '}
          {DIAGNOSTICS.terms.map((t, i) => (
            <span key={t}>
              <span className="text-amber-600/80 font-mono text-[11px]">{t}</span>
              {i < DIAGNOSTICS.terms.length - 1 && ', '}
            </span>
          ))}
        </p>
        <div className="space-y-1 mb-3">
          {DIAGNOSTICS.projects.map((p) => (
            <div key={p.name} className="flex items-center justify-between text-[11.5px]">
              <span className="text-gray-500">{p.name}</span>
              <span className="font-mono text-red-600">{p.delta} pts</span>
            </div>
          ))}
        </div>
        <div className="text-[11px] uppercase tracking-wider text-gray-400 font-bold mb-1.5">Fix</div>
        <ol className="space-y-1 mb-3">
          {DIAGNOSTICS.actions.map((a, i) => (
            <li key={i} className="flex items-start gap-1.5 text-[12px] text-gray-700">
              <span className="text-gray-400 font-mono text-[10px] mt-px">{i + 1}.</span>
              {a}
            </li>
          ))}
        </ol>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onActionClick?.({ label: 'Add Terms to Glossary', type: 'glossary' })}
            className="text-[11px] font-medium text-amber-600 hover:text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-md px-2.5 py-1 border border-amber-500/20 transition-colors cursor-pointer"
          >
            Add to Knowledge Base
          </button>
          <button
            onClick={() => onActionClick?.({ label: 'Schedule Re-run', type: 'rerun' })}
            className="text-[11px] font-medium text-gray-500 hover:text-gray-700 bg-black/[0.03] hover:bg-black/[0.06] rounded-md px-2.5 py-1 border border-black/[0.12] transition-colors cursor-pointer"
          >
            Schedule Re-run
          </button>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Overflow Menu (Snooze / Delegate / Resolve) ─── */

function OverflowMenu({ onSnooze, onDelegate, onResolve, onOpenDirectory }) {
  const [open, setOpen] = useState(false);
  const [subMenu, setSubMenu] = useState(null); // 'snooze'

  return (
    <div className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); setSubMenu(null); }}
        className="p-1 rounded-md text-gray-400 hover:text-gray-700 hover:bg-black/[0.06] transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
        style={{ transition: 'opacity 150ms' }}
      >
        <MoreHorizontal size={14} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 top-full mt-1 z-40 bg-white border border-black/[0.12] rounded-lg  overflow-hidden min-w-[150px]"
            onClick={(e) => e.stopPropagation()}
          >
            {subMenu === 'snooze' ? (
              <>
                <button
                  onClick={() => setSubMenu(null)}
                  className="flex items-center gap-2 w-full text-left text-[11px] text-gray-500 hover:text-gray-900 hover:bg-black/[0.06] px-3 py-2 transition-colors cursor-pointer bg-transparent border-none"
                >
                  ← Back
                </button>
                {SNOOZE_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => { onSnooze(opt); setOpen(false); setSubMenu(null); }}
                    className="block w-full text-left text-[11px] text-gray-700 hover:text-gray-900 hover:bg-black/[0.06] px-3 py-2 transition-colors cursor-pointer bg-transparent border-none"
                  >
                    {opt}
                  </button>
                ))}
              </>
            ) : (
              <>
                <button
                  onClick={() => setSubMenu('snooze')}
                  className="flex items-center gap-2 w-full text-left text-[11px] text-gray-700 hover:text-gray-900 hover:bg-black/[0.06] px-3 py-2 transition-colors cursor-pointer bg-transparent border-none"
                >
                  <Clock size={12} /> Snooze
                  <ChevronDown size={10} className="ml-auto -rotate-90" />
                </button>
                <button
                  onClick={() => { onOpenDirectory ? onOpenDirectory() : onDelegate(''); setOpen(false); }}
                  className="flex items-center gap-2 w-full text-left text-[11px] text-gray-700 hover:text-gray-900 hover:bg-black/[0.06] px-3 py-2 transition-colors cursor-pointer bg-transparent border-none"
                >
                  <UserPlus size={12} /> Delegate
                </button>
                <button
                  onClick={() => { onResolve(); setOpen(false); }}
                  className="flex items-center gap-2 w-full text-left text-[11px] text-emerald-600 hover:text-emerald-300 hover:bg-emerald-500/[0.06] px-3 py-2 transition-colors cursor-pointer bg-transparent border-none"
                >
                  <Check size={12} /> Resolve
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Single Feed Row ─── */

function FeedRow({
  item,
  index,
  expanded,
  onToggle,
  onActionClick,
  reducedMotion,
  isSnoozed,
  delegatedTo,
  isResolved,
  onSnooze,
  onDelegate,
  onResolve,
  onOpenDirectory,
}) {
  const Icon = item.icon;
  const c = COLOR[item.color];

  if (isResolved) return null;

  return (
    <motion.div
      layout
      initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 6 }}
      animate={{ opacity: isSnoozed ? 0.45 : 1, y: 0 }}
      exit={reducedMotion ? { opacity: 0 } : { opacity: 0, x: 30, height: 0 }}
      transition={reducedMotion ? { duration: 0 } : { ...spring, delay: index * 0.04 }}
      className="group"
    >
      {/* Compact row */}
      <div
        onClick={onToggle}
        className={`
          flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer
          transition-colors duration-150
          ${expanded ? 'bg-black/[0.04]' : 'hover:bg-black/[0.04]'}
        `}
      >
        {/* Severity dot */}
        <div className="relative flex-shrink-0">
          <div className={`w-7 h-7 rounded-lg ${c.bg} flex items-center justify-center`}>
            <Icon size={14} className={c.icon} />
          </div>
          {item.severity === 'urgent' && (
            <span className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-[#ffffff]`} />
          )}
        </div>

        {/* Title */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-gray-900 text-[13px] font-medium truncate">{item.title}</span>
            {delegatedTo && (
              <span className="flex-shrink-0 text-[9px] font-semibold uppercase tracking-wider text-blue-600 bg-blue-500/10 rounded px-1.5 py-0.5 border border-blue-500/15">
                Delegated
              </span>
            )}
            {isSnoozed && (
              <span className="flex-shrink-0 text-[9px] font-semibold uppercase tracking-wider text-gray-400 bg-black/[0.03] rounded px-1.5 py-0.5 border border-black/[0.12]">
                Snoozed
              </span>
            )}
          </div>
        </div>

        {/* Timestamp */}
        <span className="flex-shrink-0 text-gray-300 text-[11px] font-mono tabular-nums">{item.timestamp}</span>

        {/* Overflow menu (visible on hover) */}
        <OverflowMenu
          onSnooze={onSnooze}
          onDelegate={onDelegate}
          onResolve={onResolve}
          onOpenDirectory={onOpenDirectory}
        />
      </div>

      {/* Expanded detail */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pl-[52px] pr-3 pb-3 pt-1">
              <p className="text-gray-500 text-[12.5px] leading-relaxed mb-2">{item.detail}</p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (item.action.type === 'diagnostics') {
                    // handled below
                  } else {
                    onActionClick?.(item.action);
                  }
                }}
                className={`
                  inline-flex items-center gap-1 text-[12px] font-medium
                  ${c.action} hover:brightness-125
                  transition-colors bg-transparent border-none cursor-pointer p-0
                `}
              >
                {item.action.label}
                <ArrowRight size={11} />
              </button>

              {/* Diagnostics for JA quality card */}
              {item.action.type === 'diagnostics' && (
                <DiagnosticsPanel onActionClick={onActionClick} />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ─── Main Component ─── */

export default function IntelligenceFeed({ orgIntelligence, onActionClick, onOpenTeamDirectory, hideHeader = false }) {
  const reducedMotion = useReducedMotion();
  const [expandedId, setExpandedId] = useState(null);
  const [snoozedItems, setSnoozedItems] = useState(new Set());
  const [resolvedItems, setResolvedItems] = useState(new Set());
  const [delegatedItems, setDelegatedItems] = useState(new Map());
  const [resolvedToast, setResolvedToast] = useState(null);

  const handleToggle = (id) => () => setExpandedId(expandedId === id ? null : id);

  const handleSnooze = (id) => (duration) => {
    setSnoozedItems((prev) => new Set(prev).add(id));
  };

  const handleDelegate = (id) => (name) => {
    setDelegatedItems((prev) => { const n = new Map(prev); n.set(id, name || 'Team'); return n; });
  };

  const handleOpenDirectory = (id) => () => {
    const item = FEED_ITEMS.find((i) => i.id === id);
    onOpenTeamDirectory?.(id, item?.title || 'Item');
  };

  const handleResolve = (id) => () => {
    setResolvedToast(id);
    setTimeout(() => { setResolvedItems((prev) => new Set(prev).add(id)); setResolvedToast(null); }, 500);
  };

  // Sort: urgent first, snoozed last
  const sorted = [...FEED_ITEMS].sort((a, b) => {
    const aS = snoozedItems.has(a.id) ? 1 : 0;
    const bS = snoozedItems.has(b.id) ? 1 : 0;
    if (aS !== bS) return aS - bS;
    if (a.severity === 'urgent' && b.severity !== 'urgent') return -1;
    if (b.severity === 'urgent' && a.severity !== 'urgent') return 1;
    return 0;
  });

  const unresolvedCount = FEED_ITEMS.filter((i) => !resolvedItems.has(i.id)).length;
  const urgentCount = FEED_ITEMS.filter((i) => i.severity === 'urgent' && !resolvedItems.has(i.id)).length;

  return (
    <div className="w-full">
      {/* Header — hidden when embedded in a WidgetCard */}
      {!hideHeader && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Zap size={14} className="text-straker-500" />
            <span className="text-[12px] font-bold uppercase tracking-wider text-gray-500">
              Intelligence
            </span>
            <span className="text-[11px] font-mono text-gray-300">{unresolvedCount}</span>
          </div>
          {urgentCount > 0 && (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-red-600">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
              </span>
              {urgentCount} urgent
            </span>
          )}
        </div>
      )}

      {/* Resolved toast */}
      <AnimatePresence>
        {resolvedToast && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="mb-2 flex items-center gap-2 text-[11px] font-medium text-emerald-600 bg-emerald-500/8 border border-emerald-500/15 rounded-lg px-3 py-1.5"
          >
            <CheckCircle2 size={12} /> Resolved
          </motion.div>
        )}
      </AnimatePresence>

      {/* Feed rows */}
      <div className="flex flex-col gap-0.5">
        <AnimatePresence mode="popLayout">
          {sorted.map((item, index) => (
            <FeedRow
              key={item.id}
              item={item}
              index={index}
              expanded={expandedId === item.id}
              onToggle={handleToggle(item.id)}
              onActionClick={onActionClick}
              reducedMotion={reducedMotion}
              isSnoozed={snoozedItems.has(item.id)}
              delegatedTo={delegatedItems.get(item.id) || null}
              isResolved={resolvedItems.has(item.id)}
              onSnooze={handleSnooze(item.id)}
              onDelegate={handleDelegate(item.id)}
              onResolve={handleResolve(item.id)}
              onOpenDirectory={onOpenTeamDirectory ? handleOpenDirectory(item.id) : null}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
