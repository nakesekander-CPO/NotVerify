import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  ChevronDown,
  X,
  Activity,
  FileText,
  Globe,
  Zap,
  BarChart2,
  Filter,
} from 'lucide-react';
import useReducedMotion from '../hooks/useReducedMotion';
import { ENSEMBLE_TEMPLATES } from '../data/campaignModel';

/* ─── Helpers ─────────────────────────────────────────────────── */

const STATUS_CONFIG = {
  queued:     { label: 'Queued',     icon: Clock,        color: 'text-gray-400',   bg: 'bg-gray-50',    border: 'border-gray-200/60'  },
  processing: { label: 'Processing', icon: Loader2,      color: 'text-[#3D16FA]',  bg: 'bg-[#3D16FA]/[0.06]', border: 'border-[#3D16FA]/20' },
  complete:   { label: 'Complete',   icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200/60' },
  failed:     { label: 'Failed',     icon: AlertCircle,  color: 'text-red-500',    bg: 'bg-red-50',     border: 'border-red-200/60'   },
  review:     { label: 'In Review',  icon: Activity,     color: 'text-amber-600',  bg: 'bg-amber-50',   border: 'border-amber-200/60' },
};

const TYPE_COLORS = {
  Financial: 'bg-blue-50 text-blue-700',
  Legal:     'bg-violet-50 text-violet-700',
  Marketing: 'bg-amber-50 text-amber-700',
  Technical: 'bg-teal-50 text-teal-700',
  General:   'bg-gray-50 text-gray-600',
};

function getLocaleLabel(locale) {
  const map = { ja: 'Japanese', de: 'German', zh: 'Chinese', fr: 'French', es: 'Spanish', ko: 'Korean', pt: 'Portuguese', it: 'Italian', nl: 'Dutch', ru: 'Russian' };
  return map[locale] ?? locale.toUpperCase();
}

/* ─── Job row data generator ──────────────────────────────────── */

function buildJobList(campaign) {
  const jobs = [];
  for (const doc of (campaign.documents ?? [])) {
    const locales = doc.localeOverride ?? campaign.config.locales ?? [];
    for (const locale of locales) {
      jobs.push({
        id: `${doc.id}-${locale}`,
        docId: doc.id,
        fileName: doc.fileName,
        detectedType: doc.detectedType,
        pageCount: doc.pageCount,
        ensembleId: doc.ensembleId,
        locale,
        status: 'queued',
        progress: 0,          // 0–100
        qualityScore: null,
        agentBottleneck: null,
      });
    }
  }
  return jobs;
}

/* ─── Status Badge ────────────────────────────────────────────── */

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.queued;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
      <Icon size={10} className={status === 'processing' ? 'animate-spin' : ''} />
      {cfg.label}
    </span>
  );
}

/* ─── Metric card ─────────────────────────────────────────────── */

function MetricCard({ label, value, icon: Icon, color, subtext }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-black/[0.08] bg-white px-5 py-4">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${color}`}>
        <Icon size={18} />
      </div>
      <div>
        <p className="text-[22px] font-bold text-gray-900 leading-none tabular-nums">{value}</p>
        <p className="text-[11px] text-gray-500 mt-0.5">{label}</p>
        {subtext && <p className="text-[10px] text-gray-400">{subtext}</p>}
      </div>
    </div>
  );
}

/* ─── Progress mini bar ───────────────────────────────────────── */

function MiniProgress({ value }) {
  return (
    <div className="h-1.5 w-20 rounded-full bg-gray-100 overflow-hidden">
      <motion.div
        className="h-full rounded-full bg-[#3D16FA]"
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      />
    </div>
  );
}

/* ─── Slide-over panel: per-job live detail ───────────────────── */

function JobDetailPanel({ job, onClose }) {
  const [progress, setProgress] = useState(job.progress);

  useEffect(() => {
    if (job.status === 'complete') { setProgress(100); return; }
    if (job.status !== 'processing') return;
    const id = setInterval(() => {
      setProgress(p => {
        const next = Math.min(100, p + Math.random() * 4 + 1);
        return next;
      });
    }, 300);
    return () => clearInterval(id);
  }, [job.status, job.progress]);

  const ensemble = ENSEMBLE_TEMPLATES.find(t => t.id === job.ensembleId);

  return (
    <motion.div
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ type: 'spring', stiffness: 320, damping: 30 }}
      className="fixed right-0 top-0 bottom-0 w-[420px] bg-white border-l border-black/[0.10] shadow-2xl z-40 flex flex-col"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 p-5 border-b border-black/[0.08]">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-gray-900 truncate">{job.fileName}</p>
          <p className="text-[12px] text-gray-500 mt-0.5">{getLocaleLabel(job.locale)} · {job.detectedType}</p>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer shrink-0">
          <X size={15} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Status + progress */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <StatusBadge status={job.status} />
            <span className="text-[12px] font-medium text-gray-700 tabular-nums">{Math.round(progress)}%</span>
          </div>
          <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-[#3D16FA]"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
        </div>

        {/* Job meta */}
        <div className="rounded-lg border border-black/[0.08] divide-y divide-black/[0.04] text-[12px]">
          {[
            { label: 'Document',  value: job.fileName },
            { label: 'Locale',    value: getLocaleLabel(job.locale) },
            { label: 'Type',      value: job.detectedType },
            { label: 'Pages',     value: job.pageCount },
            { label: 'Ensemble',  value: ensemble?.name ?? job.ensembleId },
          ].map(row => (
            <div key={row.label} className="flex justify-between px-3 py-2">
              <span className="text-gray-500">{row.label}</span>
              <span className="text-gray-800 font-medium truncate ml-4 max-w-[200px]">{row.value}</span>
            </div>
          ))}
        </div>

        {/* Agent activity */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-2">Agent Activity</p>
          <div className="space-y-2">
            {(ensemble?.agentIds ?? ['agent-1', 'agent-2']).map((agentId, i) => {
              const agentProgress = job.status === 'complete' ? 100 : Math.min(100, progress - i * 15);
              return (
                <div key={agentId} className="flex items-center gap-3">
                  <div className="h-6 w-6 rounded-md bg-gray-100 flex items-center justify-center shrink-0">
                    <Zap size={11} className="text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between mb-0.5">
                      <span className="text-[11px] text-gray-700 truncate">{agentId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</span>
                      <span className="text-[11px] text-gray-400 tabular-nums ml-2">{Math.max(0, Math.round(agentProgress))}%</span>
                    </div>
                    <div className="h-1 rounded-full bg-gray-100 overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-[#3D16FA]/60"
                        animate={{ width: `${Math.max(0, agentProgress)}%` }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quality score if complete */}
        {job.status === 'complete' && job.qualityScore != null && (
          <div className="rounded-lg border border-emerald-200/60 bg-emerald-50 p-4 text-center">
            <p className="text-[11px] text-emerald-600 font-medium uppercase tracking-widest mb-1">Quality Score</p>
            <p className="text-[32px] font-bold text-emerald-700 tabular-nums">{job.qualityScore}</p>
            <p className="text-[11px] text-emerald-600/70">out of 100</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ─── Main component ──────────────────────────────────────────── */

export default function OperationsControlRoom({ onCancel, campaign, onComplete }) {
  const prefersReduced = useReducedMotion();
  const [jobs, setJobs] = useState(() => buildJobList(campaign));
  const [filterLocale, setFilterLocale] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedJob, setSelectedJob] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const completedRef = useRef(false);

  /* ── Simulate job progression ── */
  useEffect(() => {
    if (completedRef.current) return;

    const TOTAL_DURATION = 18000; // 18s total for all jobs
    const jobCount = jobs.length;
    if (jobCount === 0) { onComplete?.([]); return; }

    // Stagger start times across the duration
    const startTimers = jobs.map((job, i) => {
      const startDelay = (i / jobCount) * TOTAL_DURATION * 0.6;
      const processDuration = 3000 + Math.random() * 4000;

      return setTimeout(() => {
        // Start processing
        setJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: 'processing' } : j));

        // Animate progress
        let p = 0;
        const tick = setInterval(() => {
          p = Math.min(100, p + (100 / (processDuration / 150)) * (0.8 + Math.random() * 0.4));
          setJobs(prev => prev.map(j => j.id === job.id ? { ...j, progress: Math.round(p) } : j));
          if (p >= 100) clearInterval(tick);
        }, 150);

        // Complete
        setTimeout(() => {
          const qualityScore = Math.round(72 + Math.random() * 26);
          const threshold = campaign.config?.qualityThreshold ?? 85;
          const status = qualityScore < threshold ? 'review' : 'complete';
          setJobs(prev => prev.map(j => j.id === job.id ? { ...j, status, progress: 100, qualityScore } : j));
        }, processDuration);
      }, startDelay);
    });

    // Final completion
    const finalTimer = setTimeout(() => {
      if (completedRef.current) return;
      completedRef.current = true;
      // Ensure all jobs are resolved
      setJobs(prev => {
        const resolved = prev.map(j => {
          if (j.status === 'queued' || j.status === 'processing') {
            const score = Math.round(72 + Math.random() * 26);
            const threshold = campaign.config?.qualityThreshold ?? 85;
            return { ...j, status: score < threshold ? 'review' : 'complete', progress: 100, qualityScore: score };
          }
          return j;
        });
        setTimeout(() => onComplete?.(resolved), 1200);
        return resolved;
      });
    }, TOTAL_DURATION + 2000);

    return () => {
      startTimers.forEach(clearTimeout);
      clearTimeout(finalTimer);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Filter options ── */
  const allLocales = [...new Set(jobs.map(j => j.locale))];
  const allTypes   = [...new Set(jobs.map(j => j.detectedType))];

  const filtered = jobs.filter(j => {
    if (filterLocale !== 'all' && j.locale !== filterLocale) return false;
    if (filterType !== 'all' && j.detectedType !== filterType) return false;
    if (filterStatus !== 'all' && j.status !== filterStatus) return false;
    return true;
  });

  /* ── Metrics ── */
  const total      = jobs.length;
  const inProgress = jobs.filter(j => j.status === 'processing').length;
  const complete   = jobs.filter(j => j.status === 'complete').length;
  const blocked    = jobs.filter(j => j.status === 'failed' || j.status === 'review').length;
  const queued     = jobs.filter(j => j.status === 'queued').length;
  const overallPct = total > 0 ? Math.round(((complete + blocked) / total) * 100) : 0;

  return (
    <div className="w-full p-6 xl:p-8 2xl:p-10">
      {/* Header */}
      <motion.div
        initial={prefersReduced ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[20px] font-bold text-gray-900 mb-0.5">Operations Control Room</h1>
          {onCancel && <button onClick={onCancel} className="text-[11.5px] text-gray-400 hover:text-gray-600 cursor-pointer mt-1">Cancel run and return to dashboard</button>}
            <p className="text-[13px] text-gray-500">
              Campaign: <span className="font-medium text-gray-700">{campaign.name}</span>
              {' '}· {overallPct}% complete
            </p>
          </div>
          {/* Overall progress ring */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="relative h-10 w-10">
              <svg viewBox="0 0 36 36" className="h-10 w-10 -rotate-90">
                <circle cx="18" cy="18" r="14" fill="none" stroke="currentColor" strokeWidth="3" className="text-gray-100" />
                <motion.circle
                  cx="18" cy="18" r="14" fill="none"
                  stroke="#3D16FA" strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={`${overallPct * 0.88} 88`}
                  initial={{ strokeDasharray: '0 88' }}
                  animate={{ strokeDasharray: `${overallPct * 0.88} 88` }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-gray-700 tabular-nums">{overallPct}%</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Metric cards */}
      <motion.div
        initial={prefersReduced ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
        className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-6"
      >
        <MetricCard label="Total Jobs"  value={total}      icon={BarChart2}    color="bg-gray-100 text-gray-600"      />
        <MetricCard label="In Progress" value={inProgress} icon={Loader2}      color="bg-[#3D16FA]/10 text-[#3D16FA]" subtext={queued > 0 ? `${queued} queued` : undefined} />
        <MetricCard label="Complete"    value={complete}   icon={CheckCircle2} color="bg-emerald-50 text-emerald-600" />
        <MetricCard label="Needs Review" value={blocked}   icon={AlertCircle}  color="bg-amber-50 text-amber-600"     />
      </motion.div>

      {/* Filter bar */}
      <motion.div
        initial={prefersReduced ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="flex items-center gap-2 mb-4 flex-wrap"
      >
        <button
          type="button"
          onClick={() => setShowFilters(v => !v)}
          className={`flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-lg border transition-colors cursor-pointer ${showFilters ? 'border-[#3D16FA]/40 bg-[#3D16FA]/[0.04] text-[#3D16FA]' : 'border-black/[0.10] bg-white text-gray-500 hover:text-gray-800'}`}
        >
          <Filter size={12} /> Filters {(filterLocale !== 'all' || filterType !== 'all' || filterStatus !== 'all') && <span className="ml-0.5 text-[#3D16FA] font-bold">·</span>}
        </button>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              className="flex items-center gap-2 overflow-hidden"
            >
              {/* Status filter */}
              <FilterPill label="Status" value={filterStatus} onChange={setFilterStatus}
                options={[{ value: 'all', label: 'All statuses' }, ...Object.entries(STATUS_CONFIG).map(([k, v]) => ({ value: k, label: v.label }))]}
              />
              {/* Locale filter */}
              <FilterPill label="Locale" value={filterLocale} onChange={setFilterLocale}
                options={[{ value: 'all', label: 'All locales' }, ...allLocales.map(l => ({ value: l, label: l.toUpperCase() }))]}
              />
              {/* Doc type filter */}
              <FilterPill label="Type" value={filterType} onChange={setFilterType}
                options={[{ value: 'all', label: 'All types' }, ...allTypes.map(t => ({ value: t, label: t }))]}
              />
              {(filterLocale !== 'all' || filterType !== 'all' || filterStatus !== 'all') && (
                <button
                  type="button"
                  onClick={() => { setFilterLocale('all'); setFilterType('all'); setFilterStatus('all'); }}
                  className="text-[11px] text-gray-400 hover:text-gray-600 cursor-pointer transition-colors"
                >
                  Clear
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <span className="ml-auto text-[12px] text-gray-400">{filtered.length} of {total} jobs</span>
      </motion.div>

      {/* Job grid */}
      <motion.div
        initial={prefersReduced ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
        className="rounded-xl border border-black/[0.10] overflow-hidden bg-white"
      >
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-black/[0.08] bg-gray-50/60">
              <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-gray-500">File</th>
              <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-gray-500">Type</th>
              <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-gray-500">Locale</th>
              <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-gray-500">Status</th>
              <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-gray-500">Progress</th>
              <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-gray-500 text-right">Score</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence initial={false}>
              {filtered.map(job => (
                <motion.tr
                  key={job.id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setSelectedJob(selectedJob?.id === job.id ? null : job)}
                  className={`border-b border-black/[0.05] last:border-0 cursor-pointer transition-colors ${selectedJob?.id === job.id ? 'bg-[#3D16FA]/[0.04]' : 'hover:bg-black/[0.015]'}`}
                >
                  {/* File */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <FileText size={13} className="text-gray-400 shrink-0" />
                      <span className="text-[13px] text-gray-800 font-medium truncate max-w-[200px]" title={job.fileName}>
                        {job.fileName}
                      </span>
                    </div>
                  </td>
                  {/* Type */}
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium ${TYPE_COLORS[job.detectedType] ?? TYPE_COLORS.General}`}>
                      {job.detectedType}
                    </span>
                  </td>
                  {/* Locale */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <Globe size={11} className="text-gray-400 shrink-0" />
                      <span className="text-[12px] text-gray-700">{getLocaleLabel(job.locale)}</span>
                    </div>
                  </td>
                  {/* Status */}
                  <td className="px-4 py-3">
                    <StatusBadge status={job.status} />
                  </td>
                  {/* Progress */}
                  <td className="px-4 py-3">
                    {job.status === 'queued'
                      ? <span className="text-[11px] text-gray-300">—</span>
                      : <MiniProgress value={job.progress} />
                    }
                  </td>
                  {/* Score */}
                  <td className="px-4 py-3 text-right">
                    {job.qualityScore != null
                      ? <ScoreChip score={job.qualityScore} />
                      : <span className="text-[11px] text-gray-300">—</span>
                    }
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-[13px] text-gray-400">No jobs match current filters.</td>
              </tr>
            )}
          </tbody>
        </table>
      </motion.div>

      {/* Job detail slide-over */}
      <AnimatePresence>
        {selectedJob && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/10 z-30"
              onClick={() => setSelectedJob(null)}
            />
            <JobDetailPanel
              job={jobs.find(j => j.id === selectedJob.id) ?? selectedJob}
              onClose={() => setSelectedJob(null)}
            />
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Filter pill ─────────────────────────────────────────────── */

function FilterPill({ label, value, onChange, options }) {
  const [open, setOpen] = useState(false);
  const current = options.find(o => o.value === value)?.label ?? label;
  const isActive = value !== 'all';
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-1 text-[12px] px-3 py-1.5 rounded-lg border transition-colors cursor-pointer ${isActive ? 'border-[#3D16FA]/40 bg-[#3D16FA]/[0.04] text-[#3D16FA]' : 'border-black/[0.10] bg-white text-gray-600 hover:text-gray-800'}`}
      >
        {current}
        <ChevronDown size={11} className="text-gray-400" />
      </button>
      {open && (
        <div className="absolute top-full mt-1 left-0 z-20 w-40 bg-white border border-black/[0.10] rounded-xl shadow-lg overflow-hidden">
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-[12px] transition-colors cursor-pointer ${value === opt.value ? 'bg-[#3D16FA]/[0.06] text-[#3D16FA] font-medium' : 'text-gray-700 hover:bg-black/[0.03]'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Score chip ──────────────────────────────────────────────── */

function ScoreChip({ score }) {
  const color = score >= 90 ? 'text-emerald-600 bg-emerald-50' : score >= 75 ? 'text-amber-600 bg-amber-50' : 'text-red-600 bg-red-50';
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[12px] font-bold tabular-nums ${color}`}>
      {score}
    </span>
  );
}
