import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  X,
  ChevronDown,
  ChevronRight,
  Copy,
  Layers,
  AlertTriangle,
  FileText,
  Globe,
  Zap,
  Info,
} from 'lucide-react';
import useReducedMotion from '../hooks/useReducedMotion';

/* ─── Mock cross-document segment patterns ───────────────────── */

/**
 * In a real system, patterns would come from a backend aggregation pass
 * over all flagged segments across the campaign's documents.
 *
 * Here we generate plausible mock patterns from the campaign's documents,
 * reusing the doc file names and locales for believability.
 */
function generatePatterns(campaign) {
  const docs = campaign.documents ?? [];
  const locales = campaign.config?.locales ?? [];
  if (docs.length === 0 || locales.length === 0) return [];

  const docNames = docs.map(d => d.fileName.replace(/\.[^.]+$/, ''));

  return [
    {
      id: 'pattern-1',
      type: 'terminology',
      severity: 'critical',
      instanceCount: docs.length * locales.length,
      docCount: docs.length,
      pattern: 'Fiscal year end → 決算期末',
      issue: 'AI translated "fiscal year end" as 決算期末 but company glossary mandates 事業年度末 throughout all financial documents.',
      suggestedFix: '事業年度末',
      source: 'Fiscal year end',
      affectedDocs: docNames.slice(0, Math.min(3, docs.length)),
      affectedLocales: locales.filter(l => l === 'ja' || locales.indexOf(l) < 2),
      acceptedCount: 0,
    },
    {
      id: 'pattern-2',
      type: 'formatting',
      severity: 'major',
      instanceCount: Math.ceil(docs.length * locales.length * 0.7),
      docCount: Math.ceil(docs.length * 0.8),
      pattern: 'Currency format inconsistency',
      issue: 'Currency amounts formatted as "¥1,234" in some segments and "JPY 1,234" in others. The style guide requires "¥1,234" consistently.',
      suggestedFix: 'Use ¥ symbol with comma-separated thousands',
      source: 'JPY 1,234',
      affectedDocs: docNames.slice(0, Math.min(4, docs.length)),
      affectedLocales: locales.filter(l => l === 'ja' || locales.indexOf(l) < 3),
      acceptedCount: 0,
    },
    {
      id: 'pattern-3',
      type: 'brand',
      severity: 'minor',
      instanceCount: Math.ceil(docs.length * 1.5),
      docCount: docs.length,
      pattern: 'Company name transliteration',
      issue: `Company name "${campaign.name?.split(' ')[0] || 'Meridian'}" appears in translated segments without the approved transliteration. Should be preserved in English or use the registered trademark form.`,
      suggestedFix: 'Preserve original English name',
      source: campaign.name?.split(' ')[0] || 'Meridian',
      affectedDocs: docNames,
      affectedLocales: locales,
      acceptedCount: 0,
    },
    {
      id: 'pattern-4',
      type: 'compliance',
      severity: 'major',
      instanceCount: Math.ceil(docs.length * 0.5),
      docCount: Math.ceil(docs.length * 0.5),
      pattern: 'Regulatory disclaimer omission',
      issue: 'Forward-looking statement disclaimers are present in source but omitted or truncated in translated output. Required for regulatory compliance.',
      suggestedFix: 'Restore full disclaimer text per approved template',
      source: 'Forward-looking statements involve risks…',
      affectedDocs: docNames.slice(0, Math.min(2, docs.length)),
      affectedLocales: locales.slice(0, Math.min(2, locales.length)),
      acceptedCount: 0,
    },
  ].filter(p => p.instanceCount > 0 && p.docCount > 0);
}

/* ─── Severity config ─────────────────────────────────────────── */

const SEVERITY = {
  critical: { label: 'Critical', color: 'text-red-600',    bg: 'bg-red-50',    border: 'border-red-200/60'   },
  major:    { label: 'Major',    color: 'text-amber-600',  bg: 'bg-amber-50',  border: 'border-amber-200/60' },
  minor:    { label: 'Minor',    color: 'text-blue-600',   bg: 'bg-blue-50',   border: 'border-blue-200/60'  },
};

const TYPE_LABELS = {
  terminology: 'Terminology',
  formatting:  'Formatting',
  brand:       'Brand',
  compliance:  'Compliance',
};

/* ─── Pattern card ────────────────────────────────────────────── */

function PatternCard({ pattern, onAcceptAll, onDismiss, prefersReduced }) {
  const [expanded, setExpanded] = useState(false);
  const [accepted, setAccepted] = useState(pattern.acceptedCount > 0);
  const sev = SEVERITY[pattern.severity] ?? SEVERITY.minor;

  const handleAcceptAll = () => {
    setAccepted(true);
    onAcceptAll(pattern.id);
  };

  return (
    <motion.div
      layout={!prefersReduced}
      initial={prefersReduced ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.18 }}
      className={`rounded-xl border overflow-hidden transition-all ${accepted ? 'border-emerald-200/60 bg-emerald-50/30' : 'border-black/[0.10] bg-white'}`}
    >
      {/* Card header */}
      <div
        className="flex items-start gap-3 px-4 py-3.5 cursor-pointer"
        onClick={() => setExpanded(v => !v)}
      >
        {/* Severity badge */}
        <span className={`mt-0.5 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border shrink-0 ${sev.bg} ${sev.color} ${sev.border}`}>
          {sev.label}
        </span>

        {/* Pattern label */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className={`text-[13px] font-semibold ${accepted ? 'text-emerald-700' : 'text-gray-900'}`}>
              {pattern.pattern}
            </p>
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded bg-gray-100 text-gray-500`}>
              {TYPE_LABELS[pattern.type] ?? pattern.type}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-[11px] text-gray-400">
            <span className="flex items-center gap-1">
              <Copy size={10} /> {pattern.instanceCount} instance{pattern.instanceCount !== 1 ? 's' : ''}
            </span>
            <span className="flex items-center gap-1">
              <FileText size={10} /> {pattern.docCount} doc{pattern.docCount !== 1 ? 's' : ''}
            </span>
            <span className="flex items-center gap-1">
              <Globe size={10} /> {pattern.affectedLocales.map(l => l.toUpperCase()).join(', ')}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
          {accepted ? (
            <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
              <CheckCircle2 size={13} /> Applied
            </span>
          ) : (
            <button
              type="button"
              onClick={handleAcceptAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-900 text-white text-[12px] font-semibold hover:bg-gray-800 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Zap size={11} /> Accept all {pattern.instanceCount}
            </button>
          )}
          <button
            type="button"
            onClick={() => onDismiss(pattern.id)}
            className="p-1 text-gray-300 hover:text-gray-500 transition-colors cursor-pointer"
            aria-label="Dismiss pattern"
          >
            <X size={13} />
          </button>
          <ChevronDown
            size={14}
            className={`text-gray-300 transition-transform ${expanded ? 'rotate-180' : ''}`}
          />
        </div>
      </div>

      {/* Expanded detail */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 space-y-3 border-t border-black/[0.06]">
              {/* Issue */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">Issue</p>
                <p className="text-[12px] text-gray-600 leading-relaxed">{pattern.issue}</p>
              </div>

              {/* Fix */}
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">Current</p>
                  <code className="text-[12px] text-red-600 bg-red-50 px-2 py-1 rounded">{pattern.source}</code>
                </div>
                <ChevronRight size={13} className="text-gray-300 mt-5 shrink-0" />
                <div className="flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">Suggested fix</p>
                  <code className="text-[12px] text-emerald-700 bg-emerald-50 px-2 py-1 rounded">{pattern.suggestedFix}</code>
                </div>
              </div>

              {/* Affected docs */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1.5">Affected documents</p>
                <div className="flex flex-wrap gap-1.5">
                  {pattern.affectedDocs.map(d => (
                    <span key={d} className="inline-flex items-center gap-1 rounded-md bg-gray-50 border border-black/[0.06] px-2 py-0.5 text-[11px] text-gray-600">
                      <FileText size={10} className="text-gray-400" /> {d}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ─── Main component ──────────────────────────────────────────── */

/**
 * Cross-document pattern-based triage panel.
 * Groups identical/near-identical flagged segments across all campaign documents.
 * Allows "Accept all" cascade to fix every instance in one action.
 *
 * @param {Object} props
 * @param {import('../data/campaignModel').Campaign} props.campaign
 * @param {function} [props.onAllResolved]  — called when no patterns remain
 */
export default function PatternTriagePanel({ campaign, onAllResolved }) {
  const prefersReduced = useReducedMotion();
  const [patterns, setPatterns] = useState(() => generatePatterns(campaign));
  const [dismissedIds, setDismissedIds] = useState(new Set());
  const [acceptedIds, setAcceptedIds] = useState(new Set());

  const activePatterns = patterns.filter(p => !dismissedIds.has(p.id));

  const criticalCount = activePatterns.filter(p => p.severity === 'critical').length;
  const majorCount    = activePatterns.filter(p => p.severity === 'major').length;
  const totalInstances = activePatterns.reduce((sum, p) => sum + p.instanceCount, 0);
  const resolvedCount = acceptedIds.size + dismissedIds.size;

  const handleAcceptAll = (patternId) => {
    setAcceptedIds(prev => new Set([...prev, patternId]));
  };

  const handleDismiss = (patternId) => {
    setDismissedIds(prev => new Set([...prev, patternId]));
  };

  // Filter controls
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterType, setFilterType] = useState('all');

  const displayed = activePatterns.filter(p => {
    if (filterSeverity !== 'all' && p.severity !== filterSeverity) return false;
    if (filterType !== 'all' && p.type !== filterType) return false;
    return true;
  });

  if (activePatterns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-black/[0.08] bg-gray-50 py-12 gap-3">
        <CheckCircle2 size={24} className="text-emerald-500" />
        <p className="text-[14px] font-semibold text-gray-800">All patterns resolved</p>
        <p className="text-[12px] text-gray-400">No cross-document issues remain.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[15px] font-semibold text-gray-900 mb-0.5 flex items-center gap-2">
            <Layers size={16} className="text-[#009eda]" />
            Pattern-Based Triage
          </h2>
          <p className="text-[12px] text-gray-500">
            {activePatterns.length} pattern{activePatterns.length !== 1 ? 's' : ''} · {totalInstances.toLocaleString()} total instance{totalInstances !== 1 ? 's' : ''}
            {' '}across {campaign.documents?.length ?? 0} documents
            {resolvedCount > 0 && <span className="ml-2 text-emerald-600">· {resolvedCount} resolved</span>}
          </p>
        </div>

        {/* Severity summary chips */}
        <div className="flex items-center gap-2 shrink-0">
          {criticalCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold bg-red-50 text-red-600 border border-red-200/60">
              <AlertTriangle size={10} /> {criticalCount} critical
            </span>
          )}
          {majorCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold bg-amber-50 text-amber-600 border border-amber-200/60">
              {majorCount} major
            </span>
          )}
        </div>
      </div>

      {/* Info callout */}
      <div className="flex items-start gap-2 rounded-lg bg-[#009eda]/[0.04] border border-[#009eda]/20 px-3 py-2.5">
        <Info size={13} className="text-[#009eda] shrink-0 mt-0.5" />
        <p className="text-[11px] text-[#009eda]/80 leading-snug">
          Accepting a fix cascades it across <strong>all matching instances</strong> in every document and locale. You can expand each pattern to review affected files before accepting.
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <FilterToggle label="All" active={filterSeverity === 'all'} onClick={() => setFilterSeverity('all')} />
        <FilterToggle label="Critical" active={filterSeverity === 'critical'} onClick={() => setFilterSeverity('critical')} color="text-red-600" />
        <FilterToggle label="Major" active={filterSeverity === 'major'} onClick={() => setFilterSeverity('major')} color="text-amber-600" />
        <FilterToggle label="Minor" active={filterSeverity === 'minor'} onClick={() => setFilterSeverity('minor')} />
        <span className="text-gray-200 text-[12px] mx-1">|</span>
        {Object.entries(TYPE_LABELS).map(([key, label]) => (
          <FilterToggle key={key} label={label} active={filterType === key} onClick={() => setFilterType(filterType === key ? 'all' : key)} />
        ))}
      </div>

      {/* Pattern list */}
      <div className="space-y-2">
        <AnimatePresence>
          {displayed.map(pattern => (
            <PatternCard
              key={pattern.id}
              pattern={{ ...pattern, acceptedCount: acceptedIds.has(pattern.id) ? pattern.instanceCount : 0 }}
              onAcceptAll={handleAcceptAll}
              onDismiss={handleDismiss}
              prefersReduced={prefersReduced}
            />
          ))}
        </AnimatePresence>
        {displayed.length === 0 && (
          <div className="rounded-xl border border-dashed border-black/[0.08] py-8 text-center">
            <p className="text-[13px] text-gray-400">No patterns match current filters.</p>
          </div>
        )}
      </div>

      {/* Accept all remaining */}
      {displayed.filter(p => !acceptedIds.has(p.id)).length > 1 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex justify-end"
        >
          <button
            type="button"
            onClick={() => {
              displayed.forEach(p => {
                if (!acceptedIds.has(p.id)) handleAcceptAll(p.id);
              });
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-black/[0.10] text-[12px] font-medium text-gray-600 hover:bg-gray-50 cursor-pointer transition-colors"
          >
            <Zap size={12} className="text-[#009eda]" />
            Accept all remaining patterns
          </button>
        </motion.div>
      )}
    </div>
  );
}

/* ─── Filter toggle ───────────────────────────────────────────── */

function FilterToggle({ label, active, onClick, color }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-[11px] px-2.5 py-1 rounded-full border transition-all cursor-pointer font-medium ${
        active
          ? 'border-gray-900 bg-gray-900 text-white'
          : `border-black/[0.10] bg-white hover:border-gray-300 ${color ?? 'text-gray-500'}`
      }`}
    >
      {label}
    </button>
  );
}
