import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Lock,
  ShieldAlert,
  AlertTriangle,
  Info,
  RotateCcw,
  ClipboardCheck,
  Check,
  X,
  Pencil,
  ChevronDown,
  MessageSquarePlus,
  Send,
  User,
  Clock,
  ArrowRight,
} from 'lucide-react';
import useReducedMotion from '../hooks/useReducedMotion';

const spring = { type: 'spring', stiffness: 300, damping: 20 };

const SEVERITY_CONFIG = {
  critical: {
    border: 'border-l-red-500',
    badge: 'bg-red-500/20 text-red-600 ring-red-500/30',
    label: 'CRITICAL',
    icon: ShieldAlert,
    dot: 'bg-red-500',
  },
  major: {
    border: 'border-l-amber-500',
    badge: 'bg-amber-500/20 text-amber-600 ring-amber-500/30',
    label: 'MAJOR',
    icon: AlertTriangle,
    dot: 'bg-amber-500',
  },
  minor: {
    border: 'border-l-blue-500',
    badge: 'bg-blue-500/20 text-blue-600 ring-blue-500/30',
    label: 'MINOR',
    icon: Info,
    dot: 'bg-blue-500',
  },
};

const DEFAULT_FLAGGED_SEGMENTS = [
  {
    id: 's1',
    segmentNumber: 42,
    source:
      'Total goodwill impairment charges of $4.2 million were recorded in accordance with ASC 350.',
    translation:
      'のれんの減損損失合計額 ¥630百万をASC 350に基づき計上しました。',
    issue:
      'TSE Compliance Flag: ASC 350 reference must be mapped to ASBJ equivalent for Japanese market filing.',
    severity: 'critical',
    flaggedBy: 'J-GAAP Specialist (JP-FIN-3)',
    suggestedFix:
      'のれんの減損損失合計額 ¥630百万を企業会計基準第21号に基づき計上しました。',
    ruleRef: 'ASBJ Statement No. 21',
  },
  {
    id: 's2',
    segmentNumber: 67,
    source: 'Revenue was recognized in accordance with ASC 606.',
    translation: '収益はASC 606に基づき認識されました。',
    issue:
      'Regulatory Mapping Required: ASC 606 → ASBJ Statement No. 29 for Japanese regulatory compliance.',
    severity: 'major',
    flaggedBy: 'J-GAAP Specialist (JP-FIN-3)',
    suggestedFix:
      '収益は企業会計基準第29号に基づき認識されました。',
    ruleRef: 'ASBJ Statement No. 29',
  },
  {
    id: 's3',
    segmentNumber: 103,
    source: 'We believe our market position remains strong.',
    translation:
      '私たちは市場でのポジションは引き続き強いと考えています。',
    issue:
      'Brand Voice Violation: First-person informal "私たち" should use formal corporate register "当社".',
    severity: 'minor',
    flaggedBy: 'Brand Voice Sentry (BV-SENT-1)',
    suggestedFix:
      '当社は市場における地位は引き続き堅固であると認識しております。',
    ruleRef: 'Meridian Capital Style Guide §4.2',
  },
];

/* ─── Segment Card (Reviewer View) ─── */
function ReviewerSegmentCard({ segment, resolution, onAccept, onEdit, onReject, prefersReducedMotion }) {
  const [editMode, setEditMode] = useState(false);
  const [editValue, setEditValue] = useState(segment.suggestedFix);
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const sev = SEVERITY_CONFIG[segment.severity];
  const SevIcon = sev.icon;

  const isResolved = !!resolution;

  const handleEditApprove = () => {
    onEdit(segment.id, editValue);
    setEditMode(false);
  };

  const handleRejectSubmit = () => {
    onReject(segment.id, rejectReason);
    setRejectMode(false);
  };

  return (
    <motion.div
      layout={!prefersReducedMotion}
      transition={spring}
      className={`border-l-4 ${sev.border} rounded-lg bg-[#f5f5f5] p-5 relative ${
        isResolved ? 'opacity-70' : ''
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm text-gray-500">
            Segment #{segment.segmentNumber}
          </span>
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ring-1 ${sev.badge}`}
          >
            <SevIcon className="w-3 h-3" />
            {sev.label}
          </span>
        </div>
        {isResolved && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-600 ring-1 ring-emerald-500/30">
            <Check className="w-3 h-3" />
            {resolution.type === 'accepted'
              ? 'Accepted'
              : resolution.type === 'edited'
              ? 'Edited & Approved'
              : 'Rejected'}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="space-y-3 text-sm">
        <div>
          <span className="text-gray-400 uppercase text-xs font-semibold tracking-wider">
            Original
          </span>
          <p className="text-gray-700 mt-1">{segment.source}</p>
        </div>
        <div>
          <span className="text-gray-400 uppercase text-xs font-semibold tracking-wider">
            AI Output
          </span>
          <p className="text-gray-700 mt-1 font-[JetBrains_Mono] text-xs">
            {segment.translation}
          </p>
        </div>
        <div>
          <span className="text-gray-400 uppercase text-xs font-semibold tracking-wider">
            Suggested Fix
          </span>
          <p className="text-[#5c7cfa] mt-1 font-[JetBrains_Mono] text-xs">
            {segment.suggestedFix}
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-400">
          <span>Rule: {segment.ruleRef}</span>
        </div>
        <div className="bg-[#ffffff] rounded-md p-3 text-xs text-gray-500 italic">
          Agent Reasoning: &quot;{segment.issue}&quot;
        </div>
      </div>

      {/* Actions */}
      {!isResolved && (
        <div className="mt-4 space-y-3">
          {/* Edit Mode */}
          <AnimatePresence>
            {editMode && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={spring}
                className="overflow-hidden"
              >
                <textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  rows={3}
                  className="w-full bg-[#ffffff] border border-black/[0.12] rounded-md p-3 text-sm text-gray-800 font-[JetBrains_Mono] focus:outline-none focus:ring-2 focus:ring-[#5c7cfa] resize-none"
                />
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={handleEditApprove}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-md transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Save & Approve
                  </button>
                  <button
                    onClick={() => setEditMode(false)}
                    className="px-3 py-1.5 text-gray-500 hover:text-gray-800 text-xs rounded-md transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Reject Mode */}
          <AnimatePresence>
            {rejectMode && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={spring}
                className="overflow-hidden"
              >
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={2}
                  placeholder="Reason for rejection..."
                  className="w-full bg-[#ffffff] border border-red-900/50 rounded-md p-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                />
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={handleRejectSubmit}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-md transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                    Confirm Rejection
                  </button>
                  <button
                    onClick={() => setRejectMode(false)}
                    className="px-3 py-1.5 text-gray-500 hover:text-gray-800 text-xs rounded-md transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action Buttons */}
          {!editMode && !rejectMode && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onAccept(segment.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-600 text-xs font-semibold rounded-md ring-1 ring-emerald-500/30 transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
                Accept Suggestion
              </button>
              <button
                onClick={() => {
                  setEditValue(segment.suggestedFix);
                  setEditMode(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#5c7cfa]/20 hover:bg-[#5c7cfa]/40 text-[#5c7cfa] text-xs font-semibold rounded-md ring-1 ring-[#5c7cfa]/30 transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit & Approve
              </button>
              <button
                onClick={() => setRejectMode(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-500/20 text-red-600 text-xs font-semibold rounded-md ring-1 ring-red-500/30 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Reject
              </button>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

/* ─── Segment Card (Alex / Non-Reviewer View) ─── */
function FlaggedSegmentCard({ segment, prefersReducedMotion }) {
  const sev = SEVERITY_CONFIG[segment.severity];
  const SevIcon = sev.icon;

  return (
    <motion.div
      layout={!prefersReducedMotion}
      transition={spring}
      className={`border-l-4 ${sev.border} rounded-lg bg-[#f5f5f5] p-5`}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="font-mono text-sm text-gray-500">
          Segment #{segment.segmentNumber}
        </span>
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ring-1 ${sev.badge}`}
        >
          <SevIcon className="w-3 h-3" />
          {sev.label}
        </span>
      </div>

      <div className="space-y-3 text-sm">
        <div>
          <span className="text-gray-400 uppercase text-xs font-semibold tracking-wider">
            Source
          </span>
          <p className="text-gray-700 mt-1">{segment.source}</p>
        </div>
        <div>
          <span className="text-gray-400 uppercase text-xs font-semibold tracking-wider">
            AI Output
          </span>
          <p className="text-gray-700 mt-1 font-[JetBrains_Mono] text-xs">
            {segment.translation}
          </p>
        </div>
        <div className="flex items-start gap-2 bg-[#ffffff] rounded-md p-3">
          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-sm text-gray-700">{segment.issue}</p>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-400">
          <span>Flagged by: {segment.flaggedBy}</span>
          <span>Rule: {segment.ruleRef}</span>
        </div>
        {segment.suggestedFix && (
          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-md p-3">
            <span className="text-emerald-600 text-xs font-semibold flex items-center gap-1 mb-1">
              <ArrowRight className="w-3 h-3" />
              Suggested Fix
            </span>
            <p className="text-gray-700 font-[JetBrains_Mono] text-xs">
              {segment.suggestedFix}
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ─── Main Component ─── */
export default function ComplianceGate({
  complianceStatus = 'flagged',
  flaggedSegments = DEFAULT_FLAGGED_SEGMENTS,
  onApprove,
  onReject,
  onDelegate,
  isReviewer = false,
  onViewAsReviewer,
}) {
  const prefersReducedMotion = useReducedMotion();
  const motionProps = prefersReducedMotion
    ? {}
    : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: spring };

  // Reviewer state
  const [resolutions, setResolutions] = useState({});
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [reviewerNote, setReviewerNote] = useState('');

  // Severity counts
  const severityCounts = useMemo(() => {
    const counts = { critical: 0, major: 0, minor: 0 };
    flaggedSegments.forEach((s) => {
      if (counts[s.severity] !== undefined) counts[s.severity]++;
    });
    return counts;
  }, [flaggedSegments]);

  // Resolved count
  const resolvedCount = Object.keys(resolutions).length;
  const totalCount = flaggedSegments.length;

  // Can submit: all critical + major resolved
  const criticalMajorSegments = useMemo(
    () => flaggedSegments.filter((s) => s.severity === 'critical' || s.severity === 'major'),
    [flaggedSegments]
  );
  const allCriticalMajorResolved = criticalMajorSegments.every((s) => resolutions[s.id]);

  const handleAccept = useCallback((segmentId) => {
    setResolutions((prev) => ({
      ...prev,
      [segmentId]: { type: 'accepted' },
    }));
  }, []);

  const handleEdit = useCallback((segmentId, editedText) => {
    setResolutions((prev) => ({
      ...prev,
      [segmentId]: { type: 'edited', text: editedText },
    }));
  }, []);

  const handleReject = useCallback((segmentId, reason) => {
    setResolutions((prev) => ({
      ...prev,
      [segmentId]: { type: 'rejected', reason },
    }));
  }, []);

  const handleApproveAll = useCallback(() => {
    const newResolutions = {};
    flaggedSegments.forEach((s) => {
      if (!resolutions[s.id]) {
        newResolutions[s.id] = { type: 'accepted' };
      }
    });
    setResolutions((prev) => ({ ...prev, ...newResolutions }));
  }, [flaggedSegments, resolutions]);

  const handleSubmitReview = useCallback(() => {
    const resolvedSegments = flaggedSegments.map((s) => ({
      ...s,
      resolution: resolutions[s.id] || null,
    }));
    onApprove?.(resolvedSegments);
  }, [flaggedSegments, resolutions, onApprove]);

  // ─── Reviewer View ───
  if (isReviewer) {
    return (
      <motion.div
        {...motionProps}
        className="bg-[#ffffff] border border-black/[0.12] rounded-lg overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-700/60">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-[#5c7cfa]/20 flex items-center justify-center">
              <ClipboardCheck className="w-5 h-5 text-[#5c7cfa]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 tracking-tight">
                Compliance Review Request
              </h2>
              <p className="text-sm text-gray-500">
                Q3 Earnings Report &mdash; Japanese Content Verification
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <User className="w-3.5 h-3.5" />
              Submitted by: Alex Chen
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              12 min ago
            </span>
          </div>
          <p className="mt-3 text-sm text-gray-700">
            {totalCount} segment{totalCount !== 1 ? 's' : ''} require your review
          </p>
        </div>

        {/* Segments */}
        <div className="p-6 space-y-4">
          {flaggedSegments.map((segment) => (
            <ReviewerSegmentCard
              key={segment.id}
              segment={segment}
              resolution={resolutions[segment.id]}
              onAccept={handleAccept}
              onEdit={handleEdit}
              onReject={handleReject}
              prefersReducedMotion={prefersReducedMotion}
            />
          ))}
        </div>

        {/* Bottom Bar */}
        <div className="p-6 border-t border-slate-700/60 bg-[#f5f5f5]/50">
          {/* Progress */}
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
              <span>
                {resolvedCount} of {totalCount} resolved
              </span>
              <span>{Math.round((resolvedCount / totalCount) * 100)}%</span>
            </div>
            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-[#5c7cfa] rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${(resolvedCount / totalCount) * 100}%` }}
                transition={spring}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleApproveAll}
              disabled={resolvedCount === totalCount}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#5c7cfa]/20 hover:bg-[#5c7cfa]/30 text-[#5c7cfa] text-sm font-semibold rounded-lg ring-1 ring-[#5c7cfa]/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Check className="w-4 h-4" />
              Approve All Suggestions
            </button>
            <button
              onClick={handleSubmitReview}
              disabled={!allCriticalMajorResolved}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
            >
              <Send className="w-4 h-4" />
              Submit Review
            </button>
            {!allCriticalMajorResolved && (
              <span className="text-xs text-gray-400 ml-2">
                Resolve all critical and major segments to submit
              </span>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  // ─── Alex / Non-Reviewer View ───
  return (
    <motion.div
      {...motionProps}
      className="bg-[#ffffff] border border-black/[0.12] rounded-lg overflow-hidden"
    >
      {/* Header */}
      <div className="p-6 border-b border-slate-700/60">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-lg bg-red-500/20 flex items-center justify-center">
            <Lock className="w-5 h-5 text-red-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 tracking-tight">
            Compliance Gate
          </h2>
        </div>

        {/* Severity Summary */}
        <div className="flex items-center gap-3 text-sm mb-4">
          {severityCounts.critical > 0 && (
            <span className="flex items-center gap-1.5 text-red-600">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span className="font-semibold">{severityCounts.critical}</span> Critical
            </span>
          )}
          {severityCounts.major > 0 && (
            <>
              <span className="text-gray-300">|</span>
              <span className="flex items-center gap-1.5 text-amber-600">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="font-semibold">{severityCounts.major}</span> Major
              </span>
            </>
          )}
          {severityCounts.minor > 0 && (
            <>
              <span className="text-gray-300">|</span>
              <span className="flex items-center gap-1.5 text-blue-600">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="font-semibold">{severityCounts.minor}</span> Minor
              </span>
            </>
          )}
          <span className="text-gray-400">&mdash; flagged segments</span>
        </div>

        <p className="text-sm text-gray-500">
          This document cannot be published until all critical and major compliance flags
          are resolved.
        </p>
      </div>

      {/* Routing Card */}
      <div className="p-6">
        <div className="rounded-lg bg-[#5c7cfa]/10 border border-[#5c7cfa]/30 p-5">
          <div className="flex items-center gap-2 mb-3">
            <RotateCcw className="w-4 h-4 text-[#5c7cfa]" />
            <h3 className="text-sm font-semibold text-[#5c7cfa]">
              Routing to Regional Legal Review
            </h3>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <span className="text-gray-400 w-36 shrink-0">Reviewer:</span>
              <span className="text-gray-800">Takeshi Yamamoto (JP Legal)</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-gray-400 w-36 shrink-0">Estimated SLA:</span>
              <span className="text-gray-800 font-mono text-xs">4 hours</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-gray-400 w-36 shrink-0">Auto-assigned based on:</span>
              <span className="text-gray-800">JP regulatory flags</span>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={() => setShowNoteInput(!showNoteInput)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#5c7cfa]/20 hover:bg-[#5c7cfa]/30 text-[#5c7cfa] text-xs font-semibold rounded-md ring-1 ring-[#5c7cfa]/30 transition-colors"
            >
              <MessageSquarePlus className="w-3.5 h-3.5" />
              Add Note for Reviewer
            </button>
            <button
              onClick={() => onDelegate?.()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-md ring-1 ring-black/[0.12] transition-colors"
            >
              Change Reviewer
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>

          <AnimatePresence>
            {showNoteInput && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={spring}
                className="overflow-hidden"
              >
                <div className="mt-3">
                  <textarea
                    value={reviewerNote}
                    onChange={(e) => setReviewerNote(e.target.value)}
                    rows={2}
                    placeholder="Add context for the reviewer..."
                    className="w-full bg-[#ffffff] border border-black/[0.12] rounded-md p-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#5c7cfa] resize-none"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Flagged Segments */}
      <div className="px-6 pb-4">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
          Flagged Segments
        </h3>
        <div className="space-y-4">
          {flaggedSegments.map((segment) => (
            <FlaggedSegmentCard
              key={segment.id}
              segment={segment}
              prefersReducedMotion={prefersReducedMotion}
            />
          ))}
        </div>
      </div>

      {/* Locked Publish Footer */}
      <div className="p-6 border-t border-slate-700/60 bg-[#f5f5f5]/50">
        <div className="flex items-center gap-3">
          <button
            disabled
            className="flex items-center gap-2 px-5 py-2.5 bg-gray-200 text-gray-400 text-sm font-semibold rounded-lg cursor-not-allowed"
          >
            <Lock className="w-4 h-4" />
            Publish Locked
          </button>
          {onViewAsReviewer && (
            <button
              onClick={onViewAsReviewer}
              className="flex items-center gap-2 px-5 py-2.5 bg-straker-50 hover:bg-straker-600/30 text-straker-600 text-sm font-semibold rounded-lg ring-1 ring-straker-500/30 transition-colors cursor-pointer"
            >
              <ClipboardCheck className="w-4 h-4" />
              Open Compliance Officer View
            </button>
          )}
        </div>
        <p className="mt-2 text-xs text-gray-400">
          Awaiting compliance review from Takeshi Yamamoto
        </p>
      </div>
    </motion.div>
  );
}
