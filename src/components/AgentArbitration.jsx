import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Shield, Mic, Building2, Check, Pencil, ArrowRight } from 'lucide-react';
import useReducedMotion from '../hooks/useReducedMotion';

const ICON_MAP = { Shield, Mic, Building2 };

const spring = { type: 'spring', stiffness: 300, damping: 20 };

const DEFAULT_CONFLICTS = [
  {
    id: 'conflict-1',
    segmentNumber: 42,
    sourceText: 'We recorded total goodwill impairment charges of $4.2 million.',
    agentA: {
      id: 'JP-FIN-3',
      name: 'J-GAAP Specialist',
      icon: 'Shield',
      color: '#3D16FA',
      output: 'のれんの減損損失合計額 ¥630百万を計上しました。',
      reasoning:
        'Used formal financial register per ASBJ standards. "計上しました" (keijō shimashita) is the standard accounting term for recording charges in J-GAAP filings. Currency converted at spot rate.',
      priority: 'Regulatory Accuracy',
      confidence: 96,
    },
    agentB: {
      id: 'BV-SENT-1',
      name: 'Brand Voice Sentry',
      icon: 'Mic',
      color: '#f59e0b',
      output: 'のれんの減損費用として合計630百万円を認識いたしました。',
      reasoning:
        'Adjusted to Meridian Capital corporate voice. "認識いたしました" (ninshiki itashimashita) is softer and aligns with Meridian\'s established tone for investor communications. Avoids the blunt accounting register.',
      priority: 'Brand Consistency',
      confidence: 91,
    },
    category: 'Tone vs. Compliance',
  },
  {
    id: 'conflict-2',
    segmentNumber: 78,
    sourceText: 'Our operating margin improved by 3.2 percentage points year-over-year.',
    agentA: {
      id: 'JP-FIN-3',
      name: 'J-GAAP Specialist',
      icon: 'Shield',
      color: '#3D16FA',
      output: '営業利益率は前年同期比3.2ポイント改善しました。',
      reasoning:
        'Standard financial reporting terminology. "前年同期比" is the accepted TSE format for year-over-year comparisons.',
      priority: 'Regulatory Accuracy',
      confidence: 94,
    },
    agentB: {
      id: 'MER-DT-1',
      name: 'Meridian Capital Digital Twin',
      icon: 'Building2',
      color: '#8b5cf6',
      output: '営業利益率は前年度比3.2パーセントポイント向上いたしました。',
      reasoning:
        'Meridian Capital prefers "向上いたしました" over "改善しました" per style guide §3.1. Using "パーセントポイント" for clarity with non-financial readers.',
      priority: 'Corporate Terminology',
      confidence: 89,
    },
    category: 'Terminology Preference',
  },
];

function OptionCard({ agent, side, isSelected, isOtherSelected, onSelect, reducedMotion }) {
  const AgentIcon = ICON_MAP[agent.icon] || Shield;
  const selected = isSelected;
  const dimmed = isOtherSelected && !isSelected;

  return (
    <motion.div
      layout
      transition={reducedMotion ? { duration: 0 } : spring}
      animate={{
        scale: selected ? 1.01 : 1,
        opacity: dimmed ? 0.4 : 1,
      }}
      className={`relative flex-1 rounded-lg p-4 transition-colors duration-200 ${
        selected
          ? 'border-2 border-emerald-500 bg-[#ffffff]/50'
          : 'border border-black/[0.12] bg-[#ffffff]/50'
      }`}
      style={{
        borderLeftWidth: side === 'A' ? '3px' : undefined,
        borderLeftColor: side === 'A' ? agent.color : undefined,
        borderRightWidth: side === 'B' ? '3px' : undefined,
        borderRightColor: side === 'B' ? agent.color : undefined,
      }}
    >
      {selected && (
        <div className="absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500">
          <Check className="h-3 w-3 text-white" />
        </div>
      )}

      <div className="mb-3 flex items-center gap-2">
        <AgentIcon className="h-4 w-4" style={{ color: agent.color }} />
        <span className="text-sm font-semibold text-gray-900">{agent.name}</span>
      </div>

      <div className="mb-3 flex items-center gap-4">
        <div>
          <span className="text-[10px] font-medium uppercase tracking-wider text-gray-400">
            Confidence
          </span>
          <p className="font-mono text-sm text-gray-900">{agent.confidence}%</p>
        </div>
        <div>
          <span className="text-[10px] font-medium uppercase tracking-wider text-gray-400">
            Priority
          </span>
          <p className="text-sm text-gray-700">{agent.priority}</p>
        </div>
      </div>

      <div className="mb-3 rounded-lg bg-[#ffffff] p-3">
        <p className="font-mono text-sm leading-relaxed text-gray-700">{agent.output}</p>
      </div>

      <div className="mb-4">
        <span className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-gray-400">
          Reasoning
        </span>
        <p className="text-xs leading-relaxed text-gray-500">{agent.reasoning}</p>
      </div>

      {selected ? (
        <div className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-600">
          <Check className="h-3 w-3" />
          {agent.priority} prioritized
        </div>
      ) : (
        <button
          onClick={onSelect}
          className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-black/[0.12] bg-black/[0.02] px-3 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-black/[0.06] hover:text-gray-900"
        >
          Select This <Check className="h-3 w-3" />
        </button>
      )}
    </motion.div>
  );
}

function ConflictCard({ conflict, index, resolution, onResolve, reducedMotion }) {
  const [showCompromise, setShowCompromise] = useState(false);
  const [compromiseText, setCompromiseText] = useState('');

  const higherConfidenceOutput =
    conflict.agentA.confidence >= conflict.agentB.confidence
      ? conflict.agentA.output
      : conflict.agentB.output;

  const handleOpenCompromise = useCallback(() => {
    setShowCompromise(true);
    if (!compromiseText) {
      setCompromiseText(higherConfidenceOutput);
    }
  }, [higherConfidenceOutput, compromiseText]);

  const handleApplyCompromise = useCallback(() => {
    onResolve(conflict.id, {
      conflictId: conflict.id,
      resolution: 'compromise',
      text: compromiseText,
    });
  }, [conflict.id, compromiseText, onResolve]);

  const handleSelectAgent = useCallback(
    (side) => {
      setShowCompromise(false);
      const agent = side === 'agentA' ? conflict.agentA : conflict.agentB;
      onResolve(conflict.id, {
        conflictId: conflict.id,
        resolution: side,
        text: agent.output,
      });
    },
    [conflict, onResolve],
  );

  const isResolvedA = resolution?.resolution === 'agentA';
  const isResolvedB = resolution?.resolution === 'agentB';
  const isCompromise = resolution?.resolution === 'compromise';

  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={
        reducedMotion ? { duration: 0 } : { ...spring, delay: index * 0.1 }
      }
      className="rounded-lg border border-black/[0.12] bg-[#f5f5f5] p-6"
    >
      {/* Card header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#3D16FA]">
            Conflict #{index + 1}
          </span>
          <span className="text-xs text-gray-400">—</span>
          <span className="text-xs text-gray-500">Segment {conflict.segmentNumber}</span>
        </div>
        <span className="rounded-full border border-black/[0.12] bg-black/[0.02] px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-gray-500">
          {conflict.category}
        </span>
      </div>

      {/* Source text */}
      <div className="mb-5">
        <span className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-gray-400">
          Source
        </span>
        <div className="rounded-lg bg-[#ffffff] p-3">
          <p className="font-mono text-sm leading-relaxed text-gray-700">
            {conflict.sourceText}
          </p>
        </div>
      </div>

      {/* Two option cards side-by-side */}
      <div className="flex gap-4">
        <OptionCard
          agent={conflict.agentA}
          side="A"
          isSelected={isResolvedA}
          isOtherSelected={isResolvedB || isCompromise}
          onSelect={() => handleSelectAgent('agentA')}
          reducedMotion={reducedMotion}
        />
        <OptionCard
          agent={conflict.agentB}
          side="B"
          isSelected={isResolvedB}
          isOtherSelected={isResolvedA || isCompromise}
          onSelect={() => handleSelectAgent('agentB')}
          reducedMotion={reducedMotion}
        />
      </div>

      {/* OR divider */}
      <div className="my-4 flex items-center gap-3">
        <div className="h-px flex-1 bg-black/[0.04]" />
        <span className="text-xs font-medium uppercase tracking-wider text-gray-400">or</span>
        <div className="h-px flex-1 bg-black/[0.04]" />
      </div>

      {/* Compromise button / textarea */}
      {!showCompromise ? (
        <button
          onClick={handleOpenCompromise}
          className="flex cursor-pointer items-center gap-2 rounded-lg border border-black/[0.12] bg-black/[0.02] px-4 py-2.5 text-xs font-medium text-gray-700 transition-colors hover:bg-black/[0.06] hover:text-gray-900"
        >
          <Pencil className="h-3.5 w-3.5" />
          Draft Human Compromise
        </button>
      ) : (
        <AnimatePresence>
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={reducedMotion ? undefined : { opacity: 0, height: 0 }}
            transition={reducedMotion ? { duration: 0 } : spring}
          >
            <textarea
              value={compromiseText}
              onChange={(e) => setCompromiseText(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-black/[0.12] bg-[#ffffff] p-3 font-mono text-sm leading-relaxed text-gray-700 outline-none transition-colors focus:border-[#3D16FA]/50"
            />
            <div className="mt-2 flex items-center gap-2">
              <button
                onClick={handleApplyCompromise}
                className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-amber px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-amber-deep"
              >
                <Check className="h-3 w-3" />
                Apply Compromise
              </button>
              <button
                onClick={() => setShowCompromise(false)}
                className="cursor-pointer rounded-lg px-3 py-2 text-xs text-gray-500 transition-colors hover:text-gray-900"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      )}
    </motion.div>
  );
}

export default function AgentArbitration({
  conflicts = DEFAULT_CONFLICTS,
  onResolve,
  onResolveAll,
}) {
  const reducedMotion = useReducedMotion();
  const [resolutions, setResolutions] = useState({});

  const resolvedCount = Object.keys(resolutions).length;
  const totalCount = conflicts.length;
  const allResolved = resolvedCount === totalCount && totalCount > 0;
  const progressPct = totalCount > 0 ? (resolvedCount / totalCount) * 100 : 0;

  const handleResolve = useCallback(
    (conflictId, resolution) => {
      setResolutions((prev) => ({ ...prev, [conflictId]: resolution }));
      onResolve?.(conflictId, resolution);
    },
    [onResolve],
  );

  const handleApplyAll = useCallback(() => {
    if (!allResolved) return;
    const allResolutions = conflicts.map((c) => resolutions[c.id]);
    onResolveAll?.(allResolutions);
  }, [allResolved, conflicts, resolutions, onResolveAll]);

  return (
    <div className="w-full">
      {/* Header */}
      <motion.div
        initial={reducedMotion ? false : { opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reducedMotion ? { duration: 0 } : spring}
        className="mb-6"
      >
        <div className="mb-2 flex items-center gap-2">
          <Zap className="h-4 w-4 text-amber-600" />
          <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-gray-900">
            Agent Arbitration
          </h2>
          <span className="text-xs text-gray-400">—</span>
          <span className="text-xs text-gray-500">
            {totalCount} conflict{totalCount !== 1 ? 's' : ''} require{totalCount === 1 ? 's' : ''}{' '}
            resolution
          </span>
        </div>
        <p className="text-sm text-gray-500">
          Your agents disagree on {totalCount} segment{totalCount !== 1 ? 's' : ''}. Review each
          conflict and choose the best output.
        </p>
      </motion.div>

      {/* Conflict cards */}
      <div className="flex flex-col gap-5">
        {conflicts.map((conflict, i) => (
          <ConflictCard
            key={conflict.id}
            conflict={conflict}
            index={i}
            resolution={resolutions[conflict.id]}
            onResolve={handleResolve}
            reducedMotion={reducedMotion}
          />
        ))}
      </div>

      {/* Bottom bar */}
      <motion.div
        initial={reducedMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={
          reducedMotion ? { duration: 0 } : { ...spring, delay: conflicts.length * 0.1 + 0.1 }
        }
        className="mt-6 flex items-center justify-between rounded-lg border border-black/[0.12] bg-[#f5f5f5] px-6 py-4"
      >
        <div className="flex flex-1 flex-col gap-2">
          <span className="text-xs text-gray-500">
            {resolvedCount} of {totalCount} conflicts resolved
          </span>
          <div className="h-1.5 w-48 overflow-hidden rounded-full bg-black/[0.04]">
            <motion.div
              className="h-full rounded-full bg-emerald-500"
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={reducedMotion ? { duration: 0 } : { ...spring }}
            />
          </div>
        </div>
        <button
          onClick={handleApplyAll}
          disabled={!allResolved}
          className={`flex cursor-pointer items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-colors ${
            allResolved
              ? 'bg-emerald-500 text-white hover:bg-emerald-600'
              : 'cursor-not-allowed bg-black/[0.02] text-gray-400'
          }`}
        >
          Apply All
          <ArrowRight className="h-4 w-4" />
        </button>
      </motion.div>
    </div>
  );
}
