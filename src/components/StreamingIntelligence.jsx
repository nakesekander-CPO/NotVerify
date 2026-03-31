import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Shield, Building2, Mic, CheckCircle2, Bot, Loader2 } from 'lucide-react';
import useReducedMotion from '../hooks/useReducedMotion';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const SPRING = { type: 'spring', stiffness: 300, damping: 20 };

const ICON_MAP = { Shield, Building2, Mic, FileText, CheckCircle2, Bot, Loader2 };

const TOTAL_DURATION_MS = 3000;

/**
 * Positions around the central document where agent icons land.
 * Index maps to the order agents appear (0 = right, 1 = left, 2 = top).
 */
const AGENT_POSITIONS = [
  { x: 80, y: 0 },   // right of centre
  { x: -80, y: 0 },  // left of centre
  { x: 0, y: -80 },  // above centre
];

/** Entry vectors for the fly-in (where the icon starts off-screen). */
const AGENT_ORIGINS = [
  { x: 260, y: 0 },    // from right
  { x: -260, y: 0 },   // from left
  { x: 0, y: -260 },   // from top
];

/* ------------------------------------------------------------------ */
/*  Streaming log lines                                                */
/* ------------------------------------------------------------------ */

function buildLogLines(agents) {
  return [
    { time: 0, text: 'Orchestrator identifying document DNA...', agentIndex: null },
    { time: 500, text: 'Regulatory structure detected: US GAAP \u2192 J-GAAP mapping required', agentIndex: null },
    { time: 1000, text: `Matching to ${agents[0]?.name ?? 'Agent'} (${agents[0]?.id ?? '?'})...`, agentIndex: 0 },
    { time: 1500, text: `Activating ${agents[1]?.name ?? 'Agent'}: ${agents[1]?.glossaryMatch ?? 0} glossary terms syncing...`, agentIndex: 1 },
    { time: 2000, text: `Activating ${agents[2]?.name ?? 'Agent'}: '${agents[2]?.profile ?? ''}'...`, agentIndex: 2 },
    { time: 2500, text: `Ensemble locked. ${agents.length} agents deployed.`, agentIndex: null, success: true },
  ];
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function LogLine({ text, success, reducedMotion }) {
  if (reducedMotion) {
    return (
      <p
        className="font-mono text-xs leading-relaxed"
        style={{ color: success ? '#34d399' : '#6b7280', fontFamily: "'JetBrains Mono', monospace" }}
      >
        {success ? '\u2713 ' : '> '}{text}
      </p>
    );
  }

  return (
    <motion.p
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      className="font-mono text-xs leading-relaxed"
      style={{ color: success ? '#34d399' : '#6b7280', fontFamily: "'JetBrains Mono', monospace" }}
    >
      {success ? '\u2713 ' : '> '}{text}
    </motion.p>
  );
}

function AgentIcon({ agent, index, ensembleLocked, reducedMotion }) {
  const IconComponent = ICON_MAP[agent.icon] ?? Bot;
  const pos = AGENT_POSITIONS[index] ?? { x: 0, y: 0 };
  const origin = AGENT_ORIGINS[index] ?? { x: 200, y: 0 };

  if (reducedMotion) {
    return (
      <div
        className="absolute flex flex-col items-center gap-1"
        style={{
          left: `calc(50% + ${pos.x}px)`,
          top: `calc(50% + ${pos.y}px)`,
          transform: 'translate(-50%, -50%)',
        }}
      >
        <div
          className="rounded-full p-2"
          style={{
            backgroundColor: ensembleLocked ? 'rgba(52,211,153,0.15)' : 'rgba(92,124,250,0.15)',
            border: `1px solid ${ensembleLocked ? '#34d399' : '#5c7cfa'}`,
          }}
        >
          <IconComponent
            size={20}
            style={{ color: ensembleLocked ? '#34d399' : '#5c7cfa' }}
          />
        </div>
        <span
          className="text-[10px] whitespace-nowrap"
          style={{ color: '#6b7280', fontFamily: "'JetBrains Mono', monospace" }}
        >
          {agent.id}
        </span>
      </div>
    );
  }

  return (
    <motion.div
      className="absolute flex flex-col items-center gap-1"
      style={{
        left: `calc(50% + ${pos.x}px)`,
        top: `calc(50% + ${pos.y}px)`,
        transform: 'translate(-50%, -50%)',
      }}
      initial={{ x: origin.x - pos.x, y: origin.y - pos.y, opacity: 0 }}
      animate={{ x: 0, y: 0, opacity: 1 }}
      transition={SPRING}
    >
      {/* Connection line glow on land */}
      <motion.div
        className="absolute inset-0 rounded-full"
        initial={{ scale: 1 }}
        animate={ensembleLocked ? { scale: [1, 1.5, 1], opacity: [0.6, 0, 0.6] } : {}}
        transition={{ duration: 0.5 }}
        style={{
          backgroundColor: ensembleLocked ? 'rgba(52,211,153,0.1)' : 'transparent',
        }}
      />
      <motion.div
        className="rounded-full p-2"
        style={{
          backgroundColor: ensembleLocked ? 'rgba(52,211,153,0.15)' : 'rgba(92,124,250,0.15)',
          border: `1px solid ${ensembleLocked ? '#34d399' : '#5c7cfa'}`,
        }}
        initial={{ boxShadow: '0 0 0px rgba(92,124,250,0)' }}
        animate={{
          boxShadow: ensembleLocked
            ? '0 0 16px rgba(52,211,153,0.5)'
            : '0 0 12px rgba(92,124,250,0.4)',
        }}
        transition={{ duration: 0.4 }}
      >
        <IconComponent
          size={20}
          style={{ color: ensembleLocked ? '#34d399' : '#5c7cfa' }}
        />
      </motion.div>
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-[10px] whitespace-nowrap"
        style={{ color: '#6b7280', fontFamily: "'JetBrains Mono', monospace" }}
      >
        {agent.id}
      </motion.span>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export default function StreamingIntelligence({ fileName, onComplete, agents = [] }) {
  const reducedMotion = useReducedMotion();
  const [visibleLines, setVisibleLines] = useState([]);
  const [visibleAgents, setVisibleAgents] = useState([]);
  const [ensembleLocked, setEnsembleLocked] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fadingOut, setFadingOut] = useState(false);
  const timeoutsRef = useRef([]);
  const rafRef = useRef(null);
  const startRef = useRef(null);
  const onCompleteRef = useRef(onComplete);

  // Keep callback ref fresh without re-triggering effects.
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const logLines = buildLogLines(agents);

  // Clean up helper
  const cleanup = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, []);

  useEffect(() => {
    // Reduced-motion path: show everything immediately, fire onComplete fast.
    if (reducedMotion) {
      setVisibleLines(logLines);
      setVisibleAgents(agents.map((_, i) => i));
      setEnsembleLocked(true);
      setProgress(100);
      const t = setTimeout(() => onCompleteRef.current?.(), 100);
      timeoutsRef.current.push(t);
      return cleanup;
    }

    // ---- Animated path ----

    // Progress bar driven by rAF for smoothness.
    startRef.current = performance.now();
    const tick = (now) => {
      const elapsed = now - startRef.current;
      const pct = Math.min((elapsed / TOTAL_DURATION_MS) * 100, 100);
      setProgress(pct);
      if (pct < 100) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    // Choreography: show log lines and fly in agents at defined times.
    logLines.forEach((line) => {
      const t = setTimeout(() => {
        setVisibleLines((prev) => [...prev, line]);
        if (line.agentIndex !== null) {
          setVisibleAgents((prev) => [...prev, line.agentIndex]);
        }
        if (line.success) {
          setEnsembleLocked(true);
        }
      }, line.time);
      timeoutsRef.current.push(t);
    });

    // Fade out and call onComplete at 3s.
    const completionTimeout = setTimeout(() => {
      setFadingOut(true);
      // Allow a short fade-out before calling onComplete.
      const fadeTimeout = setTimeout(() => onCompleteRef.current?.(), 400);
      timeoutsRef.current.push(fadeTimeout);
    }, TOTAL_DURATION_MS);
    timeoutsRef.current.push(completionTimeout);

    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducedMotion]);

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  const wrapperVariants = {
    visible: { opacity: 1 },
    hidden: { opacity: 0, transition: { duration: 0.35 } },
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ backgroundColor: '#ffffff', fontFamily: "'Inter', sans-serif" }}
      variants={!reducedMotion ? wrapperVariants : undefined}
      initial={!reducedMotion ? 'visible' : undefined}
      animate={!reducedMotion ? (fadingOut ? 'hidden' : 'visible') : undefined}
    >
      {/* ---- Document + Agent ring ---- */}
      <div className="relative" style={{ width: 280, height: 280 }}>
        {/* Central document icon */}
        {reducedMotion ? (
          <div
            className="absolute flex items-center justify-center"
            style={{
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
            }}
          >
            <div
              className="rounded-lg p-4"
              style={{ backgroundColor: '#f5f5f5', border: '1px solid rgba(92,124,250,0.3)' }}
            >
              <FileText size={48} style={{ color: '#5c7cfa' }} />
            </div>
          </div>
        ) : (
          <motion.div
            className="absolute flex items-center justify-center"
            style={{
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
            }}
            animate={{
              scale: [1, 1.04, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            <div
              className="rounded-lg p-4"
              style={{
                backgroundColor: '#f5f5f5',
                border: '1px solid rgba(92,124,250,0.3)',
                boxShadow: '0 0 24px rgba(92,124,250,0.15)',
              }}
            >
              <FileText size={48} style={{ color: '#5c7cfa' }} />
            </div>
          </motion.div>
        )}

        {/* Agent icons flying in */}
        <AnimatePresence>
          {visibleAgents.map((agentIndex) => {
            const agent = agents[agentIndex];
            if (!agent) return null;
            return (
              <AgentIcon
                key={agent.id}
                agent={agent}
                index={agentIndex}
                ensembleLocked={ensembleLocked}
                reducedMotion={reducedMotion}
              />
            );
          })}
        </AnimatePresence>
      </div>

      {/* ---- File name label ---- */}
      <p
        className="mt-2 text-sm"
        style={{ color: '#374151', fontFamily: "'JetBrains Mono', monospace" }}
      >
        {fileName}
      </p>

      {/* ---- Streaming log ---- */}
      <div
        className="mt-6 w-full max-w-lg rounded-lg p-4 space-y-1.5 overflow-hidden"
        style={{
          backgroundColor: '#f5f5f5',
          border: '1px solid rgba(92,124,250,0.15)',
          minHeight: 140,
        }}
      >
        {visibleLines.map((line, i) => (
          <LogLine
            key={i}
            text={line.text}
            success={line.success}
            reducedMotion={reducedMotion}
          />
        ))}
      </div>

      {/* ---- Progress bar ---- */}
      <div
        className="mt-6 w-full max-w-lg overflow-hidden rounded-full"
        style={{ height: 3, backgroundColor: 'rgba(92,124,250,0.15)' }}
      >
        <motion.div
          className="h-full rounded-full"
          style={{
            width: `${progress}%`,
            backgroundColor: ensembleLocked ? '#34d399' : '#5c7cfa',
          }}
          layout={false}
        />
      </div>
    </motion.div>
  );
}
