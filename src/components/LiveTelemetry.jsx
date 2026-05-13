import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  Globe,
  Bot,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Radio,
  Terminal,
} from 'lucide-react';
import useReducedMotion from '../hooks/useReducedMotion';

// ── Constants ──────────────────────────────────────────────
const SPRING = { type: 'spring', stiffness: 300, damping: 20 };

const LOCALE_META = {
  ja: { flag: '\u{1F1EF}\u{1F1F5}', region: 'Tokyo', aws: 'ap-northeast-1' },
  de: { flag: '\u{1F1E9}\u{1F1EA}', region: 'Frankfurt', aws: 'eu-central-1' },
  zh: { flag: '\u{1F1E8}\u{1F1F3}', region: 'Shanghai', aws: 'cn-east-1' },
  ko: { flag: '\u{1F1F0}\u{1F1F7}', region: 'Seoul', aws: 'ap-northeast-2' },
  fr: { flag: '\u{1F1EB}\u{1F1F7}', region: 'Paris', aws: 'eu-west-3' },
  es: { flag: '\u{1F1EA}\u{1F1F8}', region: 'Madrid', aws: 'eu-south-2' },
  pt: { flag: '\u{1F1E7}\u{1F1F7}', region: 'S\u00e3o Paulo', aws: 'sa-east-1' },
};

const DEFAULT_AGENTS = [
  { id: 'JP-FIN-3', name: 'JP-FIN-3', color: '#1B5E8F' },
  { id: 'MER-DT-1', name: 'MER-DT-1', color: '#38bdf8' },
  { id: 'BV-SENT-1', name: 'BV-SENT-1', color: '#a78bfa' },
];

// Scripted log templates keyed by phase-relative offsets (in seconds)
function buildLogScript(agents, locales, totalSegments) {
  const agentNames = agents.map((a) => a.name);
  const localeList = locales.map((l) => {
    const m = LOCALE_META[l] || { region: l.toUpperCase(), aws: 'unknown' };
    return `${l.toUpperCase()}\u2192${m.region}`;
  });

  return [
    { t: 1, text: 'AES-256 encryption handshake established', type: 'success' },
    { t: 2, text: `Regional routing: ${localeList.join(', ')}`, type: 'info' },
    { t: 3, text: 'Zero-retention pipeline activated', type: 'success' },
    { t: 5, text: `${agentNames[0] || 'Agent-1'}: ASBJ Rule 29 pattern detected in seg 12`, type: 'agent', agentIdx: 0 },
    { t: 7, text: `${agentNames[1] || 'Agent-2'}: 42 knowledge entries synced for locale ${locales[0]?.toUpperCase() || 'JA'}`, type: 'agent', agentIdx: 1 },
    { t: 9, text: `${agentNames[2] || 'Agent-3'}: Tone deviation detected in seg 42`, type: 'warning', agentIdx: 2 },
    { t: 11, text: `${agentNames[0] || 'Agent-1'}: Currency conversion \u00a5630\u767e\u4e07 applied`, type: 'agent', agentIdx: 0 },
    { t: 12, text: `\u26a0 CONFLICT: ${agentNames[0] || 'Agent-1'} vs ${agentNames[2] || 'Agent-3'} on segment 42`, type: 'conflict' },
    { t: 14, text: `${agentNames[0] || 'Agent-1'}: ASC 606\u2192ASBJ 29 mapping completed`, type: 'agent', agentIdx: 0 },
    { t: 15, text: `All ${totalSegments} segments processed \u2713`, type: 'complete' },
  ];
}

// ── Helpers ─────────────────────────────────────────────────
function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ── Sub-components ──────────────────────────────────────────

function ProgressHeader({ fileName, progress, totalSegments, elapsed, duration }) {
  const currentSegment = Math.min(Math.floor(progress * totalSegments), totalSegments);
  const pct = Math.min(Math.round(progress * 100), 100);
  const elapsedSec = elapsed / 1000;
  const totalSec = duration / 1000;
  const remaining = Math.max(0, totalSec - elapsedSec);
  const isComplete = pct >= 100;

  return (
    <div className="sticky top-0 z-20 rounded-lg border border-black/[0.12] bg-[#f5f5f5]/95 px-6 py-5">
      <div className="mb-2 flex items-center gap-2 font-mono text-xs tracking-widest text-gray-500 uppercase">
        <Radio className="h-3.5 w-3.5 animate-pulse text-[#1B5E8F]" />
        <span>Processing: {fileName}</span>
      </div>

      {/* Bar */}
      <div className="relative mb-3 h-3 overflow-hidden rounded-full bg-black/[0.04]">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            width: `${pct}%`,
            background: isComplete
              ? 'linear-gradient(90deg, #10b981, #34d399)'
              : 'linear-gradient(90deg, #1B5E8F, #4F94C4)',
          }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
        {!isComplete && (
          <motion.div
            className="absolute inset-y-0 rounded-full bg-white/20"
            style={{ left: `${Math.max(0, pct - 8)}%`, width: '8%' }}
            animate={{ opacity: [0.2, 0.5, 0.2] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between font-['JetBrains_Mono'] text-xs text-gray-500">
        <span>
          <span className="text-gray-900">{currentSegment}</span> of {totalSegments} segments
        </span>
        <span className="tabular-nums">
          {pct}%
        </span>
        <span className="tabular-nums">
          Elapsed: {formatTime(elapsedSec)} &middot; ETA: {formatTime(remaining)}
        </span>
      </div>
    </div>
  );
}

function SecurityPanel({ phase, elapsed, duration }) {
  const deleteCountdown = useMemo(() => {
    const remaining = Math.max(0, 86400 - (elapsed / 1000));
    const h = Math.floor(remaining / 3600);
    const m = Math.floor((remaining % 3600) / 60);
    const s = Math.floor(remaining % 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }, [elapsed]);

  const items = [
    { label: 'AES-256', show: phase >= 1, ok: true },
    { label: 'Handshake', show: phase >= 1, ok: true },
  ];

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-black/[0.12] bg-[#f5f5f5] p-5">
      <div className="flex items-center gap-2 text-xs font-semibold tracking-widest text-gray-700 uppercase">
        <Shield className="h-4 w-4 text-[#1B5E8F]" />
        Security
      </div>

      <div className="space-y-2">
        {items.map((item) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, x: -10 }}
            animate={item.show ? { opacity: 1, x: 0 } : {}}
            transition={SPRING}
            className="flex items-center gap-2 font-['JetBrains_Mono'] text-xs text-gray-700"
          >
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            {item.label} {item.ok ? 'OK' : ''}
          </motion.div>
        ))}
      </div>

      {phase >= 1 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-1 border-t border-black/[0.12] pt-3 font-['JetBrains_Mono'] text-[11px] text-gray-500"
        >
          <div>
            Processing in: <span className="text-gray-800">ap-northeast-1</span>
          </div>
          <div className="text-gray-400">(Tokyo)</div>
        </motion.div>
      )}

      {phase >= 1 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="space-y-1 border-t border-black/[0.12] pt-3"
        >
          <div className="flex items-center gap-1.5 font-['JetBrains_Mono'] text-[11px]">
            <Lock className="h-3 w-3 text-emerald-600" />
            <span className="text-emerald-600">Zero-retention pipeline: ACTIVE</span>
          </div>
          <div className="font-['JetBrains_Mono'] text-[11px] text-gray-400">
            Auto-delete in: <span className="tabular-nums text-gray-500">{deleteCountdown}</span>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function LocaleRoutingCard({ locale, meta, status, reducedMotion }) {
  const dotColor =
    status === 'complete'
      ? 'bg-emerald-400'
      : status === 'active'
        ? 'bg-emerald-400'
        : 'bg-gray-400';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={SPRING}
      className="flex items-center gap-3 rounded-lg border border-black/[0.12] bg-black/[0.02] px-4 py-3"
    >
      <span className="text-lg">{meta.flag}</span>
      <div className="flex-1">
        <div className="font-['JetBrains_Mono'] text-xs font-semibold tracking-wider text-gray-800 uppercase">
          {locale}
        </div>
        <div className="font-['JetBrains_Mono'] text-[10px] text-gray-400">
          {meta.region} &middot; {meta.aws}
        </div>
      </div>
      <div className="relative">
        {status === 'complete' ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        ) : (
          <>
            <span className={`block h-2.5 w-2.5 rounded-full ${dotColor}`} />
            {status === 'active' && !reducedMotion && (
              <motion.span
                className="absolute inset-0 rounded-full bg-emerald-400"
                animate={{ scale: [1, 2.2], opacity: [0.6, 0] }}
                transition={{ duration: 1.2, repeat: Infinity }}
              />
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}

function RoutingPanel({ locales, phase, progress, reducedMotion }) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border border-black/[0.12] bg-[#f5f5f5] p-5">
      <div className="flex items-center gap-2 text-xs font-semibold tracking-widest text-gray-700 uppercase">
        <Globe className="h-4 w-4 text-[#1B5E8F]" />
        Routing
      </div>
      <div className="space-y-2">
        {locales.map((locale, i) => {
          const meta = LOCALE_META[locale] || { flag: '\u{1F310}', region: locale.toUpperCase(), aws: 'unknown' };
          let status = 'waiting';
          if (progress >= 1) status = 'complete';
          else if (phase >= 2) status = 'active';
          else if (phase >= 1 && i === 0) status = 'active';

          return (
            <LocaleRoutingCard
              key={locale}
              locale={locale}
              meta={meta}
              status={status}
              reducedMotion={reducedMotion}
            />
          );
        })}
      </div>
    </div>
  );
}

function AgentCard({ agent, segNum, agentProgress, flash, reducedMotion }) {
  const pct = Math.min(Math.round(agentProgress * 100), 100);
  const isComplete = pct >= 100;

  return (
    <motion.div
      className="rounded-lg border bg-black/[0.02] px-4 py-3"
      animate={{
        borderColor: flash ? 'rgba(251, 191, 36, 0.6)' : 'rgba(0,0,0,0.06)',
      }}
      transition={{ duration: 0.3 }}
    >
      <div className="mb-1 flex items-center gap-2">
        <Bot className="h-3.5 w-3.5" style={{ color: agent.color }} />
        <span className="font-['JetBrains_Mono'] text-xs font-semibold text-gray-800">
          {agent.name}
        </span>
      </div>
      <div className="mb-2 font-['JetBrains_Mono'] text-[11px] text-gray-400">
        {isComplete ? 'Complete' : `Scanning seg ${segNum}`}
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-black/[0.04]">
        <motion.div
          className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            backgroundColor: isComplete ? '#10b981' : agent.color,
          }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>
      <div className="mt-1 text-right font-['JetBrains_Mono'] text-[10px] text-gray-400">
        {pct}%
      </div>
    </motion.div>
  );
}

function AgentPanel({ agents, agentStates, reducedMotion }) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border border-black/[0.12] bg-[#f5f5f5] p-5">
      <div className="flex items-center gap-2 text-xs font-semibold tracking-widest text-gray-700 uppercase">
        <Bot className="h-4 w-4 text-[#1B5E8F]" />
        Agent Activity
      </div>
      <div className="space-y-2">
        {agents.map((agent, i) => {
          const state = agentStates[i] || { seg: 0, progress: 0, flash: false };
          return (
            <AgentCard
              key={agent.id}
              agent={agent}
              segNum={state.seg}
              agentProgress={state.progress}
              flash={state.flash}
              reducedMotion={reducedMotion}
            />
          );
        })}
      </div>
    </div>
  );
}

function LogLine({ line, reducedMotion }) {
  const colorMap = {
    info: 'text-gray-700',
    success: 'text-emerald-600',
    agent: 'text-gray-700',
    warning: 'text-amber-600',
    conflict: 'text-amber-600',
    complete: 'text-emerald-600',
  };

  const iconMap = {
    warning: <AlertTriangle className="inline h-3 w-3 text-amber-600" />,
    conflict: <AlertTriangle className="inline h-3 w-3 text-amber-600" />,
    complete: <CheckCircle2 className="inline h-3 w-3 text-emerald-600" />,
  };

  return (
    <motion.div
      initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`flex items-start gap-2 font-['JetBrains_Mono'] text-[11px] leading-relaxed ${
        line.type === 'conflict' ? 'rounded bg-amber-50 px-2 py-0.5' : ''
      }`}
    >
      <span className="shrink-0 text-gray-300">[{line.ts}]</span>
      {iconMap[line.type] && <span className="mt-0.5 shrink-0">{iconMap[line.type]}</span>}
      <span className={colorMap[line.type] || 'text-gray-700'}>{line.text}</span>
    </motion.div>
  );
}

function ActivityLog({ logLines, reducedMotion }) {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logLines.length]);

  return (
    <div className="rounded-lg border border-black/[0.12] bg-[#f5f5f5] p-5">
      <div className="mb-3 flex items-center gap-2 text-xs font-semibold tracking-widest text-gray-700 uppercase">
        <Terminal className="h-4 w-4 text-[#1B5E8F]" />
        Live Activity Log
      </div>
      <div
        ref={scrollRef}
        className="max-h-48 space-y-1 overflow-y-auto pr-2"
        style={{ scrollBehavior: 'smooth' }}
      >
        <AnimatePresence>
          {logLines.map((line, i) => (
            <LogLine key={i} line={line} reducedMotion={reducedMotion} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────
export default function LiveTelemetry({
  fileName = 'Q3_Earnings_Final.docx',
  totalSegments = 247,
  locales = ['ja', 'de', 'zh'],
  agents: agentsProp = [],
  onComplete,
  duration = 15000,
}) {
  const reducedMotion = useReducedMotion();
  const agents = agentsProp.length > 0 ? agentsProp : DEFAULT_AGENTS;

  // Global progress (0 -> 1)
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [phase, setPhase] = useState(0); // 0=init, 1=security, 2=processing, 3=complete
  const [logLines, setLogLines] = useState([]);
  const [agentStates, setAgentStates] = useState(() =>
    agents.map(() => ({ seg: 0, progress: 0, flash: false })),
  );

  const startTimeRef = useRef(null);
  const rafRef = useRef(null);
  const timeoutsRef = useRef([]);
  const intervalsRef = useRef([]);
  const completedRef = useRef(false);

  const addTimeout = useCallback((fn, ms) => {
    const id = setTimeout(fn, ms);
    timeoutsRef.current.push(id);
    return id;
  }, []);

  const addInterval = useCallback((fn, ms) => {
    const id = setInterval(fn, ms);
    intervalsRef.current.push(id);
    return id;
  }, []);

  // ── Log script ──
  const logScript = useMemo(
    () => buildLogScript(agents, locales, totalSegments),
    [agents, locales, totalSegments],
  );

  // ── Main animation loop ──
  useEffect(() => {
    startTimeRef.current = performance.now();

    function tick(now) {
      const el = now - startTimeRef.current;
      const p = Math.min(el / duration, 1);
      setElapsed(el);
      setProgress(p);

      // Phase transitions
      const sec = el / 1000;
      const phaseFrac = el / duration;
      if (phaseFrac >= 0.8 && phase < 3) setPhase(3);
      else if (phaseFrac >= 0.2 && phase < 2) setPhase(2);
      else if (sec >= 0.5 && phase < 1) setPhase(1);

      if (p < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    }

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [duration]); // phase intentionally excluded to avoid restarting

  // ── Phase setter via elapsed ──
  useEffect(() => {
    const sec = elapsed / 1000;
    const frac = elapsed / duration;
    if (frac >= 0.8 && phase < 3) setPhase(3);
    else if (frac >= 0.2 && phase < 2) setPhase(2);
    else if (sec >= 0.5 && phase < 1) setPhase(1);
  }, [elapsed, duration, phase]);

  // ── Scripted log lines ──
  useEffect(() => {
    const scale = duration / 15000; // scale log timestamps to actual duration
    logScript.forEach((entry) => {
      const ms = entry.t * 1000 * scale;
      addTimeout(() => {
        const ts = formatTime(entry.t * scale);
        setLogLines((prev) => [...prev, { ...entry, ts }]);
      }, ms);
    });
  }, [logScript, duration, addTimeout]);

  // ── Agent state ticker ──
  useEffect(() => {
    const agentSpeeds = agents.map((_, i) => 0.7 + i * 0.15); // slightly different rates
    const processingStart = duration * 0.2;
    const processingEnd = duration * 0.8;
    const processingDuration = processingEnd - processingStart;

    const id = addInterval(() => {
      const el = performance.now() - startTimeRef.current;
      if (el < processingStart) return;

      const processingElapsed = Math.min(el - processingStart, processingDuration);
      const processingFrac = processingElapsed / processingDuration;

      setAgentStates((prev) =>
        prev.map((state, i) => {
          const speed = agentSpeeds[i];
          const rawProgress = Math.min(processingFrac * (1 / speed) * 1.1, 1);
          const p = Math.min(rawProgress, 1);
          const seg = Math.floor(p * totalSegments);
          return { ...state, seg, progress: p };
        }),
      );
    }, 200);

    return () => clearInterval(id);
  }, [agents, duration, totalSegments, addInterval]);

  // ── Conflict flash at ~53% of duration ──
  useEffect(() => {
    const conflictTime = duration * 0.53;
    addTimeout(() => {
      setAgentStates((prev) =>
        prev.map((s, i) => (i === 0 || i === 2 ? { ...s, flash: true } : s)),
      );
      addTimeout(() => {
        setAgentStates((prev) => prev.map((s) => ({ ...s, flash: false })));
      }, 1200);
    }, conflictTime);
  }, [duration, addTimeout]);

  // ── Completion ──
  useEffect(() => {
    if (progress >= 1 && !completedRef.current) {
      completedRef.current = true;
      // Mark all agents complete
      setAgentStates((prev) => prev.map((s) => ({ ...s, progress: 1, seg: totalSegments })));
      addTimeout(() => {
        onComplete?.();
      }, 500);
    }
  }, [progress, onComplete, totalSegments, addTimeout]);

  // ── Cleanup ──
  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach(clearTimeout);
      intervalsRef.current.forEach(clearInterval);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <motion.div
      initial={reducedMotion ? { opacity: 1 } : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="mx-auto flex w-full max-w-5xl flex-col gap-5 p-6"
    >
      {/* 1. Progress Header */}
      <ProgressHeader
        fileName={fileName}
        progress={progress}
        totalSegments={totalSegments}
        elapsed={elapsed}
        duration={duration}
      />

      {/* 2. Three-Column Telemetry Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <SecurityPanel phase={phase} elapsed={elapsed} duration={duration} />
        <RoutingPanel
          locales={locales}
          phase={phase}
          progress={progress}
          reducedMotion={reducedMotion}
        />
        <AgentPanel agents={agents} agentStates={agentStates} reducedMotion={reducedMotion} />
      </div>

      {/* 3. Live Activity Log */}
      <ActivityLog logLines={logLines} reducedMotion={reducedMotion} />
    </motion.div>
  );
}
