import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  Clock,
  ChevronRight,
  AlertTriangle,
  ShieldAlert,
  Info,
  Check,
  X,
  RotateCcw,
  MessageSquarePlus,
  FileText,
  ArrowLeft,
  Download,
} from 'lucide-react';
import useReducedMotion from '../hooks/useReducedMotion';

const spring = { type: 'spring', stiffness: 300, damping: 20 };

/* ─── Severity Configuration ─── */
const SEVERITY_CONFIG = {
  critical: {
    border: 'border-l-red-500',
    activeBorder: 'border-l-red-500',
    badge: 'bg-red-50 text-red-600 ring-1 ring-red-500/30',
    pill: 'bg-red-50 text-red-600',
    issueBg: 'bg-red-50 border border-red-500/20',
    label: 'CRITICAL',
    icon: ShieldAlert,
  },
  major: {
    border: 'border-l-amber-500',
    activeBorder: 'border-l-amber-500',
    badge: 'bg-amber-50 text-amber-600 ring-1 ring-amber-500/30',
    pill: 'bg-amber-50 text-amber-600',
    issueBg: 'bg-amber-50 border border-amber-500/20',
    label: 'MAJOR',
    icon: AlertTriangle,
  },
  minor: {
    border: 'border-l-blue-500',
    activeBorder: 'border-l-blue-500',
    badge: 'bg-blue-500/15 text-blue-600 ring-1 ring-blue-500/30',
    pill: 'bg-blue-500/15 text-blue-600',
    issueBg: 'bg-blue-50 border border-blue-500/20',
    label: 'MINOR',
    icon: Info,
  },
};

/* ─── Resolution border & badge configs ─── */
const RESOLUTION_STYLES = {
  approved: {
    border: 'border-l-emerald-500',
    badge: 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-500/30',
    label: 'Approved',
    icon: Check,
  },
  retranslation: {
    border: 'border-l-red-500',
    badge: 'bg-red-50 text-red-600 ring-1 ring-red-500/30',
    label: 'Re-processing Required',
    icon: RotateCcw,
  },
  annotated: {
    border: 'border-l-blue-500',
    badge: 'bg-blue-500/15 text-blue-600 ring-1 ring-blue-500/30',
    label: 'Annotated',
    icon: MessageSquarePlus,
  },
};

/* ─── Mock Flagged Segments ─── */
const FLAGGED_SEGMENTS = [
  {
    id: 'seg-042',
    ref: 'SEG-042',
    segmentNumber: 42,
    severity: 'critical',
    flaggedBy: 'J-GAAP Specialist (JP-FIN-3)',
    source:
      'Total goodwill impairment charges of $4.2 million were recorded in accordance with ASC 350.',
    translation:
      '\u306e\u308c\u3093\u306e\u6e1b\u640d\u640d\u5931\u5408\u8a08\u984d \u00a5630\u767e\u4e07\u3092ASC 350\u306b\u57fa\u3065\u304d\u8a08\u4e0a\u3057\u307e\u3057\u305f\u3002',
    issue:
      'TSE filing requires ASBJ standard reference, not US GAAP. ASC 350 \u2192 \u4f01\u696d\u4f1a\u8a08\u57fa\u6e96\u7b2c10\u53f7',
    suggested:
      '\u306e\u308c\u3093\u306e\u6e1b\u640d\u640d\u5931\u5408\u8a08\u984d \u00a5630\u767e\u4e07\u3092\u4f01\u696d\u4f1a\u8a08\u57fa\u6e96\u7b2c10\u53f7\u306b\u57fa\u3065\u304d\u8a08\u4e0a\u3057\u307e\u3057\u305f\u3002',
  },
  {
    id: 'seg-018',
    ref: 'SEG-018',
    segmentNumber: 18,
    severity: 'major',
    flaggedBy: 'J-GAAP Specialist (JP-FIN-3)',
    source: 'Revenue was recognized in accordance with ASC 606.',
    translation:
      '\u53ce\u76ca\u306fASC 606\u306b\u57fa\u3065\u304d\u8a8d\u8b58\u3055\u308c\u307e\u3057\u305f\u3002',
    issue:
      'ASC 606 must be mapped to ASBJ 29 for Japanese market compliance',
    suggested:
      '\u53ce\u76ca\u306fASBJ\u7b2c29\u53f7\u306b\u57fa\u3065\u304d\u8a8d\u8b58\u3055\u308c\u307e\u3057\u305f\u3002',
  },
  {
    id: 'seg-007',
    ref: 'SEG-007',
    segmentNumber: 7,
    severity: 'major',
    flaggedBy: 'J-GAAP Specialist (JP-FIN-3)',
    source:
      'Operating expenses totaled $12.8 million for the quarter.',
    translation:
      '\u56db\u534a\u671f\u306e\u55b6\u696d\u8cbb\u7528\u306f$12.8 million\u3067\u3057\u305f\u3002',
    issue:
      'Currency must use Japanese denomination format for TSE filing',
    suggested:
      '\u56db\u534a\u671f\u306e\u55b6\u696d\u8cbb\u7528\u306f\u00a51,920\u767e\u4e07\u3067\u3057\u305f\u3002',
  },
  {
    id: 'seg-031',
    ref: 'SEG-031',
    segmentNumber: 31,
    severity: 'minor',
    flaggedBy: 'J-GAAP Specialist (JP-FIN-3)',
    source:
      'We believe our investment strategy will yield positive results.',
    translation:
      '\u79c1\u305f\u3061\u306e\u6295\u8cc7\u6226\u7565\u306f\u826f\u3044\u7d50\u679c\u3092\u3082\u305f\u3089\u3059\u3068\u601d\u3044\u307e\u3059\u3002',
    issue:
      'Register too informal for TSE disclosure. Should use \u5f53\u793e\u306f...\u8a8d\u8b58\u3057\u3066\u304a\u308a\u307e\u3059 pattern',
    suggested:
      '\u5f53\u793e\u306e\u6295\u8cc7\u6226\u7565\u306f\u826f\u597d\u306a\u6210\u679c\u3092\u3082\u305f\u3089\u3059\u3082\u306e\u3068\u8a8d\u8b58\u3057\u3066\u304a\u308a\u307e\u3059\u3002',
  },
];

/* ─── Timestamp helper ─── */
function timestamp() {
  return new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Tokyo',
    timeZoneName: 'short',
  });
}

/* ─── Segment Audit Card ─── */
function SegmentAuditCard({
  segment,
  resolution,
  onApprove,
  onRetranslate,
  onAnnotate,
  prefersReducedMotion,
}) {
  const [activeAction, setActiveAction] = useState(null); // 'retranslation' | 'annotate'
  const [inputText, setInputText] = useState('');
  const sev = SEVERITY_CONFIG[segment.severity];
  const SevIcon = sev.icon;
  const isResolved = !!resolution;
  const resStyle = resolution ? RESOLUTION_STYLES[resolution.type] : null;

  const borderClass = isResolved ? resStyle.border : sev.border;

  const handleRetranslationSubmit = () => {
    if (!inputText.trim()) return;
    onRetranslate(segment.id, inputText.trim());
    setActiveAction(null);
    setInputText('');
  };

  const handleAnnotationSubmit = () => {
    if (!inputText.trim()) return;
    onAnnotate(segment.id, inputText.trim());
    setActiveAction(null);
    setInputText('');
  };

  const cancelAction = () => {
    setActiveAction(null);
    setInputText('');
  };

  return (
    <motion.div
      layout={!prefersReducedMotion}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.3 }}
      className={`border-l-4 ${borderClass} rounded-lg bg-white shadow-sm overflow-hidden`}
    >
      {/* Card Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm font-semibold text-gray-900">
            {segment.ref}
          </span>
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${sev.badge}`}
          >
            <SevIcon className="w-3 h-3" />
            {sev.label}
          </span>
          {isResolved && (
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${resStyle.badge}`}
            >
              <resStyle.icon className="w-3 h-3" />
              {resStyle.label}
            </span>
          )}
        </div>
        <span className="text-xs text-gray-500">
          Flagged by: {segment.flaggedBy}
        </span>
      </div>

      {/* Card Body */}
      <div className="px-6 py-5 space-y-4">
        {/* Source */}
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-widest text-gray-500 mb-1.5">
            Source Text
          </label>
          <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-gray-900 leading-relaxed">
            {segment.source}
          </div>
        </div>

        {/* Current Output */}
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-widest text-gray-500 mb-1.5">
            Current Output
          </label>
          <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-mono text-gray-900 leading-relaxed">
            {segment.translation}
          </div>
        </div>

        {/* Compliance Issue */}
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-widest text-gray-500 mb-1.5">
            Compliance Issue
          </label>
          <div
            className={`rounded-md px-4 py-3 text-sm leading-relaxed ${sev.issueBg} ${
              segment.severity === 'critical'
                ? 'text-red-700'
                : segment.severity === 'major'
                ? 'text-amber-700'
                : 'text-blue-700'
            }`}
          >
            {segment.issue}
          </div>
        </div>

        {/* Suggested Fix */}
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-widest text-gray-500 mb-1.5">
            Suggested Fix
          </label>
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-mono text-emerald-800 leading-relaxed">
            {segment.suggested}
          </div>
        </div>

        {/* Resolution info */}
        {isResolved && resolution.timestamp && (
          <div className="text-xs text-gray-500 italic">
            {resolution.type === 'approved' && `Approved by Compliance Officer at ${resolution.timestamp}`}
            {resolution.type === 'retranslation' && `Re-processing required \u2014 sent back at ${resolution.timestamp}`}
            {resolution.type === 'annotated' && `Annotated by Compliance Officer at ${resolution.timestamp}`}
          </div>
        )}

        {/* Annotation display */}
        {resolution?.type === 'annotated' && resolution.note && (
          <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            <span className="font-semibold text-xs uppercase tracking-widest text-blue-500 block mb-1">
              Annotation
            </span>
            {resolution.note}
          </div>
        )}

        {/* Re-processing note display */}
        {resolution?.type === 'retranslation' && resolution.note && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <span className="font-semibold text-xs uppercase tracking-widest text-red-500 block mb-1">
              Re-processing Instructions
            </span>
            {resolution.note}
          </div>
        )}
      </div>

      {/* Action Row */}
      {!isResolved && (
        <div className="px-6 pb-5">
          <AnimatePresence mode="wait">
            {activeAction === null && (
              <motion.div
                key="buttons"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.15 }}
                className="flex items-center gap-3"
              >
                <button
                  onClick={() => onApprove(segment.id)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                >
                  <Check className="w-4 h-4" />
                  Approve Override
                </button>
                <button
                  onClick={() => setActiveAction('retranslation')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  Require Re-processing
                </button>
                <button
                  onClick={() => setActiveAction('annotate')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium bg-amber text-white hover:bg-amber-deep transition-colors"
                >
                  <MessageSquarePlus className="w-4 h-4" />
                  Comment / Annotate
                </button>
              </motion.div>
            )}

            {activeAction === 'retranslation' && (
              <motion.div
                key="retranslation"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.2 }}
                className="space-y-3"
              >
                <label className="block text-xs font-semibold text-gray-400">
                  Re-processing instructions (required)
                </label>
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Describe the required changes..."
                  rows={3}
                  className="w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:border-red-500 resize-none"
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleRetranslationSubmit}
                    disabled={!inputText.trim()}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Confirm Re-processing
                  </button>
                  <button
                    onClick={cancelAction}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            )}

            {activeAction === 'annotate' && (
              <motion.div
                key="annotate"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.2 }}
                className="space-y-3"
              >
                <label className="block text-xs font-semibold text-gray-400">
                  Compliance annotation
                </label>
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Enter your compliance note..."
                  rows={3}
                  className="w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#3D16FA]/40 focus:border-[#3D16FA] resize-none"
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleAnnotationSubmit}
                    disabled={!inputText.trim()}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium bg-amber text-white hover:bg-amber-deep disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Save Annotation
                  </button>
                  <button
                    onClick={cancelAction}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}

/* ─── Main Component ─── */
export default function ComplianceOfficerView({ onSubmitReview, onBack }) {
  const prefersReducedMotion = useReducedMotion();
  const [resolutions, setResolutions] = useState({});
  const [auditLog, setAuditLog] = useState([]);

  /* ─── Resolution handlers ─── */
  const addLogEntry = useCallback((segRef, action) => {
    setAuditLog((prev) => [
      ...prev,
      {
        id: Date.now(),
        segRef,
        action,
        timestamp: timestamp(),
      },
    ]);
  }, []);

  const handleApprove = useCallback(
    (segId) => {
      const seg = FLAGGED_SEGMENTS.find((s) => s.id === segId);
      const ts = timestamp();
      setResolutions((prev) => ({
        ...prev,
        [segId]: { type: 'approved', timestamp: ts },
      }));
      addLogEntry(seg.ref, `Approved Override by Compliance Officer at ${ts}`);
    },
    [addLogEntry]
  );

  const handleRetranslate = useCallback(
    (segId, note) => {
      const seg = FLAGGED_SEGMENTS.find((s) => s.id === segId);
      const ts = timestamp();
      setResolutions((prev) => ({
        ...prev,
        [segId]: { type: 'retranslation', note, timestamp: ts },
      }));
      addLogEntry(seg.ref, `Re-processing Required by Compliance Officer at ${ts}`);
    },
    [addLogEntry]
  );

  const handleAnnotate = useCallback(
    (segId, note) => {
      const seg = FLAGGED_SEGMENTS.find((s) => s.id === segId);
      const ts = timestamp();
      setResolutions((prev) => ({
        ...prev,
        [segId]: { type: 'annotated', note, timestamp: ts },
      }));
      addLogEntry(seg.ref, `Annotated by Compliance Officer at ${ts}`);
    },
    [addLogEntry]
  );

  /* ─── Progress calculation ─── */
  const reviewedCount = Object.keys(resolutions).length;
  const totalCount = FLAGGED_SEGMENTS.length;

  const criticalAndMajorResolved = useMemo(() => {
    return FLAGGED_SEGMENTS.filter(
      (s) => s.severity === 'critical' || s.severity === 'major'
    ).every((s) => !!resolutions[s.id]);
  }, [resolutions]);

  const canSubmit = criticalAndMajorResolved;

  /* ─── Severity breakdown ─── */
  const severityCounts = useMemo(() => {
    const counts = { critical: 0, major: 0, minor: 0 };
    FLAGGED_SEGMENTS.forEach((s) => {
      counts[s.severity]++;
    });
    return counts;
  }, []);

  /* ─── Deadline countdown ─── */
  const deadlineDate = new Date('2026-03-25T23:59:59+09:00');
  const now = new Date();
  const daysRemaining = Math.max(
    0,
    Math.ceil((deadlineDate - now) / (1000 * 60 * 60 * 24))
  );

  const handleSubmit = () => {
    if (onSubmitReview) {
      onSubmitReview({
        resolutions,
        auditLog,
        submittedAt: new Date().toISOString(),
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ─── Header: Audit Context Bar ─── */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left */}
            <div className="flex items-center gap-3">
              {onBack && (
                <button
                  onClick={onBack}
                  className="p-1.5 rounded-md text-gray-500 hover:text-gray-900 hover:bg-slate-100 transition-colors mr-1"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
              )}
              <Shield className="w-5 h-5 text-[#3D16FA]" />
              <h1 className="text-base font-semibold text-gray-900 tracking-tight">
                Compliance Review Queue
              </h1>
            </div>

            {/* Center */}
            <div className="text-sm text-gray-500">
              Routed by Alex Chen{' '}
              <span className="text-gray-400">&middot;</span> 2 hours ago
            </div>

            {/* Right */}
            <div className="flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-700">
                Review Deadline: Mar 25, 2026
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono font-semibold bg-amber-50 text-amber-600">
                {daysRemaining}d remaining
              </span>
            </div>
          </div>

          {/* Breadcrumb */}
          <nav className="mt-3 flex items-center gap-1.5 text-xs text-gray-400">
            <span className="hover:text-gray-700 cursor-pointer transition-colors">
              Dashboard
            </span>
            <ChevronRight className="w-3 h-3" />
            <span className="hover:text-gray-700 cursor-pointer transition-colors">
              Q3 Earnings JA
            </span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-[#3D16FA] font-medium">
              Compliance Review
            </span>
          </nav>
        </div>
      </header>

      {/* ─── Main Content ─── */}
      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* ─── Audit Summary Card ─── */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.3 }}
          className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
            <FileText className="w-4 h-4 text-gray-500" />
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
              Audit Summary
            </h2>
          </div>
          <div className="px-6 py-5 space-y-4">
            {/* Project */}
            <div className="flex items-baseline gap-3">
              <span className="text-xs font-semibold uppercase tracking-widest text-gray-500 w-40 shrink-0">
                Project
              </span>
              <span className="text-sm font-medium text-gray-900">
                Meridian Capital Q3 Earnings Report &mdash; Japanese Market Compliance
              </span>
            </div>

            {/* Flagged Segments */}
            <div className="flex items-baseline gap-3">
              <span className="text-xs font-semibold uppercase tracking-widest text-gray-500 w-40 shrink-0">
                Flagged Segments
              </span>
              <span className="text-sm text-gray-900">
                <span className="font-mono font-semibold">4</span> of{' '}
                <span className="font-mono">247</span> segments require
                compliance review
              </span>
            </div>

            {/* Severity Breakdown */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold uppercase tracking-widest text-gray-500 w-40 shrink-0">
                Severity
              </span>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-600">
                  {severityCounts.critical} Critical
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-600">
                  {severityCounts.major} Major
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-600">
                  {severityCounts.minor} Minor
                </span>
              </div>
            </div>

            {/* Compliance Frameworks */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold uppercase tracking-widest text-gray-500 w-40 shrink-0">
                Frameworks
              </span>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-gray-400 border border-slate-200">
                  TSE Disclosure Rules
                </span>
                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-gray-400 border border-slate-200">
                  J-GAAP (ASBJ)
                </span>
              </div>
            </div>

            {/* Requestor Note */}
            <div className="flex items-start gap-3">
              <span className="text-xs font-semibold uppercase tracking-widest text-gray-500 w-40 shrink-0 pt-0.5">
                Requestor Note
              </span>
              <p className="text-sm text-gray-400 leading-relaxed italic">
                Two segments reference US GAAP standards that need J-GAAP
                equivalents for TSE filing. One currency formatting issue
                flagged by auditor.
              </p>
            </div>
          </div>
        </motion.section>

        {/* ─── Flagged Segments ─── */}
        <section>
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
            Flagged Segments
          </h2>
          <div className="space-y-5">
            {FLAGGED_SEGMENTS.map((segment) => (
              <SegmentAuditCard
                key={segment.id}
                segment={segment}
                resolution={resolutions[segment.id]}
                onApprove={handleApprove}
                onRetranslate={handleRetranslate}
                onAnnotate={handleAnnotate}
                prefersReducedMotion={prefersReducedMotion}
              />
            ))}
          </div>
        </section>

        {/* ─── Review Progress Bar ─── */}
        <div className="sticky bottom-0 bg-white border-t border-slate-200 rounded-t-lg shadow-lg -mx-6 px-6 py-4 mt-8">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium text-gray-900">
                  <span className="font-mono font-semibold">{reviewedCount}</span>{' '}
                  of{' '}
                  <span className="font-mono font-semibold">{totalCount}</span>{' '}
                  segments reviewed
                </span>
                {!criticalAndMajorResolved && (
                  <span className="text-xs text-gray-500">
                    All critical and major segments must be resolved to submit
                  </span>
                )}
              </div>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-[#3D16FA]"
                  initial={{ width: 0 }}
                  animate={{
                    width: `${(reviewedCount / totalCount) * 100}%`,
                  }}
                  transition={
                    prefersReducedMotion
                      ? { duration: 0 }
                      : spring
                  }
                />
              </div>
            </div>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-md text-sm font-semibold bg-amber text-white hover:bg-amber-deep disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
            >
              <Shield className="w-4 h-4" />
              Submit Compliance Review
            </button>
          </div>
        </div>

        {/* ─── Audit Trail Footer ─── */}
        {auditLog.length > 0 && (
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.3 }}
            className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-500" />
                <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
                  Audit Trail
                </h2>
              </div>
              <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-gray-400 hover:text-gray-700 hover:bg-gray-100 border border-slate-200 transition-colors">
                <Download className="w-3.5 h-3.5" />
                Export Audit Log
              </button>
            </div>
            <div className="divide-y divide-slate-50">
              {auditLog.map((entry) => (
                <div
                  key={entry.id}
                  className="px-6 py-3 flex items-center gap-3 text-sm"
                >
                  <span className="font-mono text-xs font-semibold text-[#3D16FA]">
                    {entry.segRef}
                  </span>
                  <span className="text-gray-400">{entry.action}</span>
                </div>
              ))}
            </div>
          </motion.section>
        )}
      </main>
    </div>
  );
}
