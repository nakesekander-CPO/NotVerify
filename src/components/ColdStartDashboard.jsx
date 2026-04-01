import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import {
  CheckCircle2,
  Circle,
  Bot,
  FileUp,
  Dna,
  Users,
  ShieldCheck,
  BrainCircuit,
  Upload,
  Layers,
  Brain,
  UserPlus,
  Lock,
  ChevronRight,
  ChevronDown,
  GripVertical,
  Settings2,
  X,
  Eye,
  EyeOff,
  Puzzle,
  ArrowRight,
} from 'lucide-react';
import useReducedMotion from '../hooks/useReducedMotion';

const spring = { type: 'spring', stiffness: 300, damping: 20 };

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { ...spring, delay },
});

const ACCEPTED_EXTENSIONS = '.docx, .pdf, .pptx, .xlsx, .mp4';

const READINESS_ITEMS = (locales, vertical, connectedCount, onOpenIntegrations) => [
  { done: true, label: 'Markets configured', value: locales.map(l => l.toUpperCase()).join(', ') },
  { done: true, label: 'Domain identified', value: vertical },
  { done: true, label: 'Tone calibrated', value: 'Formal' },
  { done: true, label: 'Locales activated', value: `${locales.length} ${locales.length === 1 ? 'target' : 'targets'}` },
  { done: false, label: 'Quality Baseline', value: 'builds with first project' },
  { done: false, label: 'Org Brain', value: 'grows automatically as you run projects' },
  {
    done: connectedCount > 0,
    label: 'Integrations connected',
    value: connectedCount > 0 ? `${connectedCount} tool${connectedCount > 1 ? 's' : ''}` : 'no tools connected',
    onClick: onOpenIntegrations,
  },
];

const FIRST_MISSION_ITEMS = [
  { id: 'upload', icon: Upload, label: 'Upload your first document', unlocked: true, action: 'file' },
  { id: 'ensemble', icon: Layers, label: 'Review your agent ensemble', unlocked: true, action: 'tooltip' },
  { id: 'brain', icon: Brain, label: 'Explore your Org Brain', unlocked: false, action: 'locked' },
  { id: 'invite', icon: UserPlus, label: 'Invite a team member', unlocked: false, action: 'locked' },
  { id: 'integrate', icon: Puzzle, label: 'Connect your first integration', unlocked: true, action: 'integrations' },
];

const STORAGE_KEY = 'nv-dashboard-widgets-v3';

/* Default widget config — Readiness Core hidden until first project completes */
const DEFAULT_WIDGETS = [
  { id: 'first-mission', visible: true, collapsed: false },
  { id: 'readiness', visible: false, collapsed: false },
  { id: 'smart-defaults', visible: true, collapsed: false },
];

function loadWidgetConfig() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Merge stored state with defaults so new widgets and updated defaults are respected
      return DEFAULT_WIDGETS.map(def => {
        const saved = parsed.find(w => w.id === def.id);
        return saved ? { ...def, ...saved } : def;
      });
    }
  } catch { /* ignore */ }
  return DEFAULT_WIDGETS;
}

function saveWidgetConfig(config) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch { /* ignore */ }
}

/* ── Collapsible Widget Card ── */
function WidgetCard({ id, title, badge, collapsed, onToggle, children, prefersReduced }) {
  return (
    <div className={`overflow-hidden transition-all ${collapsed ? '' : 'rounded-lg border border-black/[0.12] bg-white'}`}>
      <button
        type="button"
        onClick={onToggle}
        className={`flex w-full items-center gap-2 px-4 py-3 text-left cursor-pointer transition-colors ${collapsed ? 'hover:bg-black/[0.03] rounded-lg' : 'hover:bg-black/[0.02]'}`}
        aria-expanded={!collapsed}
        aria-controls={`widget-${id}`}
      >
        <GripVertical size={14} className="text-gray-300 shrink-0 cursor-grab" />
        <h3 className="text-[11px] font-semibold uppercase tracking-widest text-gray-600 flex-1">
          {title}
        </h3>
        {badge && (
          <span className="text-[11px] font-medium text-gray-400 mr-1">{badge}</span>
        )}
        <ChevronDown
          size={14}
          className={`text-gray-400 transition-transform ${collapsed ? '' : 'rotate-180'}`}
        />
      </button>
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            id={`widget-${id}`}
            initial={prefersReduced ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Customize Modal ── */
function CustomizePanel({ widgets, onUpdate, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.15 }}
      className="absolute top-full right-0 mt-2 w-56 bg-white border border-black/[0.12] rounded-lg shadow-lg z-20 p-3"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[12px] font-semibold text-gray-700">Show Widgets</span>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 cursor-pointer">
          <X size={14} />
        </button>
      </div>
      <div className="space-y-1">
        {[
          { id: 'first-mission', label: 'First Mission' },
          { id: 'readiness', label: 'Readiness Core' },
          { id: 'smart-defaults', label: 'Smart Defaults' },
        ].map(item => {
          const w = widgets.find(w => w.id === item.id);
          const isVisible = w?.visible ?? true;
          return (
            <button
              key={item.id}
              onClick={() => {
                const updated = widgets.map(w =>
                  w.id === item.id ? { ...w, visible: !w.visible } : w
                );
                onUpdate(updated);
              }}
              className="flex w-full items-center gap-2 px-2 py-1.5 rounded-md text-[12px] text-gray-600 hover:bg-black/[0.03] cursor-pointer transition-colors"
            >
              {isVisible ? (
                <Eye size={13} className="text-straker-600" />
              ) : (
                <EyeOff size={13} className="text-gray-300" />
              )}
              <span className={isVisible ? 'text-gray-700' : 'text-gray-400'}>{item.label}</span>
            </button>
          );
        })}
      </div>
      <button
        onClick={() => { onUpdate(DEFAULT_WIDGETS); onClose(); }}
        className="mt-2 w-full text-center text-[11px] text-gray-400 hover:text-gray-600 cursor-pointer transition-colors"
      >
        Reset to default
      </button>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function ColdStartDashboard({
  userName = 'Alex',
  companyName = 'Meridian Capital',
  configuredLocales = ['ja', 'de', 'zh'],
  configuredVertical = 'Financial Services',
  onStartFirstProject,
  onStartCampaign,
  onFileAccepted,
  connectedIntegrations = [],
  onOpenIntegrations,
}) {
  const prefersReduced = useReducedMotion();
  const [isDragOver, setIsDragOver] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [widgets, setWidgets] = useState(loadWidgetConfig);
  const dropRef = useRef(null);
  const fileInputRef = useRef(null);
  const customizeRef = useRef(null);

  const m = (variants) => (prefersReduced ? {} : variants);

  // Persist widget config
  useEffect(() => { saveWidgetConfig(widgets); }, [widgets]);

  // Close customize panel on outside click
  useEffect(() => {
    if (!showCustomize) return;
    const handleClick = (e) => {
      if (customizeRef.current && !customizeRef.current.contains(e.target)) {
        setShowCustomize(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showCustomize]);

  const toggleWidget = useCallback((id) => {
    setWidgets(prev => prev.map(w =>
      w.id === id ? { ...w, collapsed: !w.collapsed } : w
    ));
  }, []);

  /* --- file picker ------------------------------------------------- */
  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileInputChange = useCallback(
    (e) => {
      const file = e.target.files?.[0];
      if (file && onFileAccepted) onFileAccepted(file);
      e.target.value = '';
    },
    [onFileAccepted],
  );

  const handleZoneClick = useCallback(() => {
    openFilePicker();
    if (onStartFirstProject) onStartFirstProject();
  }, [openFilePicker, onStartFirstProject]);

  /* --- drag & drop ------------------------------------------------- */
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (dropRef.current && !dropRef.current.contains(e.relatedTarget)) {
      setIsDragOver(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      const file = e.dataTransfer?.files?.[0];
      if (file && onFileAccepted) onFileAccepted(file);
    },
    [onFileAccepted],
  );

  /* --- data -------------------------------------------------------- */
  const readiness = READINESS_ITEMS(configuredLocales, configuredVertical, connectedIntegrations.length, onOpenIntegrations);
  const doneCount = readiness.filter((r) => r.done).length;
  const integrationsConnected = connectedIntegrations.length > 0;
  const missionCompleted = integrationsConnected ? 1 : 0;

  const getWidget = (id) => widgets.find(w => w.id === id);
  const visibleWidgets = widgets.filter(w => w.visible);

  /* --- widget renderers -------------------------------------------- */
  const renderWidget = (widget) => {
    switch (widget.id) {
      case 'first-mission': {
        const unlockedItems = FIRST_MISSION_ITEMS.filter(i => i.unlocked)
        return (
          <WidgetCard
            key={widget.id}
            id={widget.id}
            title="Setup Checklist"
            badge={`${missionCompleted} of ${unlockedItems.length}`}
            collapsed={widget.collapsed}
            onToggle={() => toggleWidget(widget.id)}
            prefersReduced={prefersReduced}
          >
            {/* Progress bar */}
            <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
              <motion.div
                className="h-full rounded-full bg-[#3b5bdb]"
                initial={{ width: 0 }}
                animate={{ width: `${(missionCompleted / unlockedItems.length) * 100}%` }}
                transition={spring}
              />
            </div>
            <ul className="flex flex-col gap-1">
              {unlockedItems.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => {
                        if (item.action === 'file') {
                          openFilePicker();
                          if (onStartFirstProject) onStartFirstProject();
                        } else if (item.action === 'integrations') {
                          if (onOpenIntegrations) onOpenIntegrations();
                        }
                      }}
                      className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-[13px] cursor-pointer text-gray-700 hover:bg-black/[0.03] transition-colors"
                    >
                      <Icon size={14} className="shrink-0 text-[#3b5bdb]" />
                      <span className="flex-1">{item.label}</span>
                      <ChevronRight size={13} className="shrink-0 text-gray-300" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </WidgetCard>
        );
      }

      case 'readiness':
        return (
          <WidgetCard
            key={widget.id}
            id={widget.id}
            title="Readiness Core"
            badge={`${doneCount} of ${readiness.length}`}
            collapsed={widget.collapsed}
            onToggle={() => toggleWidget(widget.id)}
            prefersReduced={prefersReduced}
          >
            <ul className="flex flex-col gap-2">
              {readiness.map((item) => (
                <li
                  key={item.label}
                  className={`flex items-start gap-2 text-[13px] leading-snug ${item.onClick ? 'cursor-pointer group' : ''}`}
                  title={!item.done && !item.onClick ? 'Complete your first project to unlock' : undefined}
                  onClick={item.onClick}
                >
                  {item.done ? (
                    <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-600" />
                  ) : (
                    <Circle size={15} className="mt-0.5 shrink-0 text-gray-300" />
                  )}
                  <span className={`${item.done ? 'text-gray-700' : item.onClick ? 'text-[#009eda]/70 group-hover:text-[#009eda]' : 'text-gray-400'} transition-colors`}>
                    {item.label}
                    <span className={`ml-1.5 ${item.done ? 'text-gray-500' : ''}`}>
                      {item.done ? `· ${item.value}` : item.onClick ? `· ${item.value}` : ''}
                    </span>
                    {!item.done && !item.onClick && (
                      <span className="ml-1.5 inline-block bg-gray-200 rounded animate-pulse h-2.5 w-14 align-middle" />
                    )}
                    {item.onClick && !item.done && (
                      <ChevronRight size={11} className="inline ml-1 opacity-50 group-hover:opacity-100 transition-opacity" />
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </WidgetCard>
        );

      case 'smart-defaults':
        return (
          <WidgetCard
            key={widget.id}
            id={widget.id}
            title="Your Configuration"
            collapsed={widget.collapsed}
            onToggle={() => toggleWidget(widget.id)}
            prefersReduced={prefersReduced}
          >
            <div className="space-y-2 text-[13px]">
              <div className="flex items-baseline justify-between">
                <span className="text-gray-500">Vertical</span>
                <span className="text-gray-700 font-medium">{configuredVertical}</span>
              </div>
              <div className="h-px bg-black/[0.04]" />
              <div className="flex items-baseline justify-between">
                <span className="text-gray-500">Tone</span>
                <span className="text-gray-700 font-medium">Formal</span>
              </div>
              <div className="h-px bg-black/[0.04]" />
              <div className="flex items-baseline justify-between">
                <span className="text-gray-500">Locales</span>
                <span className="text-gray-700 font-medium">
                  {configuredLocales.map(l => l.toUpperCase()).join(', ')}
                </span>
              </div>
            </div>
            <p className="text-[11px] text-gray-400 mt-2">
              These adapt with every project you run.
            </p>
          </WidgetCard>
        );

      default:
        return null;
    }
  };

  return (
    <div className="w-full p-6 xl:p-8 2xl:p-10 pb-10 xl:pb-14">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_EXTENSIONS}
        className="hidden"
        onChange={handleFileInputChange}
      />

      {/* ── Context confirmation — one line, oriented not effusive ── */}
      <motion.p className="text-[13px] text-gray-500 mb-7" {...m(fadeUp(0))}>
        <span className="text-gray-900 font-medium">{companyName}</span>
        {' '}is configured for{' '}
        <span className="font-medium text-gray-700">{configuredLocales.map(l => l.toUpperCase()).join(', ')}</span>
        {' '}·{' '}{configuredVertical}{' '}· Formal tone
      </motion.p>

      {/* ── Pipeline visualization strip ── */}
      <motion.div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center mb-8" {...m(fadeUp(0.05))}>
        {[
          { icon: FileUp,       label: 'Content Intake',         sub: 'Policies · Filings · Reports · Contracts', color: 'text-gray-500'     },
          { isArrow: true },
          { icon: ShieldCheck,  label: 'Intelligence Extraction', sub: 'Compliance · Risk · Knowledge',           color: 'text-[#009eda]'    },
          { isArrow: true },
          { icon: CheckCircle2, label: 'Trusted Output',          sub: 'Confidence · Flags · Audit Trail',        color: 'text-emerald-600'  },
        ].map((item, i) => {
          if (item.isArrow) return (
            <div key={i} className="flex justify-center px-3 text-gray-300 text-[14px] select-none">→</div>
          )
          const Icon = item.icon
          return (
            <div key={i} className="flex items-center gap-2.5 px-4 py-3 rounded-lg border border-black/[0.08] bg-white">
              <Icon size={15} className={`${item.color} shrink-0`} />
              <div className="min-w-0">
                <p className="text-[12px] font-semibold text-gray-800 leading-tight">{item.label}</p>
                <p className="text-[10px] text-gray-400 font-mono">{item.sub}</p>
              </div>
            </div>
          )
        })}
      </motion.div>

      {/* ── Three-path action zone ── */}
      <motion.div className="mb-8 space-y-3" {...m(fadeUp(0.1))}>

        {/* Primary CTA — sample project */}
        <button
          type="button"
          onClick={() => onStartFirstProject?.()}
          className="w-full flex items-start gap-5 p-5 rounded-xl border-2 border-straker-500/20 bg-straker-50/40 hover:bg-straker-50 hover:border-straker-500/40 transition-all group cursor-pointer text-left"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-straker-600 text-white group-hover:bg-straker-700 transition-colors">
            <BrainCircuit size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-semibold text-gray-900 mb-0.5">See intelligence extraction in action</p>
            <p className="text-[13px] text-gray-500 leading-snug">
              We've loaded a sample Q3 Earnings Report. Watch Not Verify extract compliance intelligence, score quality, and surface risks — no upload required.
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 self-center px-4 py-2 rounded-lg bg-straker-600 text-white text-[13px] font-semibold group-hover:bg-straker-700 transition-colors whitespace-nowrap">
            Start sample <ChevronRight size={14} />
          </div>
        </button>

        {/* Secondary CTAs — 2 columns, equal height */}
        <div className="grid grid-cols-2 gap-3 items-stretch">
          {/* Analyze your first document */}
          <motion.div
            ref={dropRef}
            role="button"
            tabIndex={0}
            onClick={handleZoneClick}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleZoneClick() } }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`flex flex-col h-full p-4 rounded-xl border cursor-pointer transition-all text-left ${
              isDragOver
                ? 'border-dashed border-[#009eda] bg-[#009eda]/[0.04] scale-[1.01]'
                : 'border-black/[0.08] bg-white hover:border-[#009eda]/30 hover:bg-[#009eda]/[0.02]'
            }`}
          >
            <div className="flex items-start gap-3 flex-1">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
                <FileUp size={17} />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-gray-800 mb-0.5">Analyze your first document</p>
                <p className="text-[11px] text-gray-400 leading-snug">Your content stays in your environment. Intelligence compounds.</p>
              </div>
            </div>
          </motion.div>

          {/* How intelligence extraction works */}
          <div className="flex flex-col h-full p-4 rounded-xl border border-black/[0.08] bg-white">
            <div className="flex items-start gap-3 flex-1">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                <Dna size={17} />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-gray-800 mb-0.5">How intelligence extraction works</p>
                <p className="text-[11px] text-gray-400 leading-snug">7 steps from document to verified output. See what happens at each stage.</p>
                <button
                  type="button"
                  onClick={() => onStartFirstProject?.()}
                  className="mt-2 text-[11px] font-medium text-[#009eda] hover:text-[#007bb5] transition-colors cursor-pointer"
                >
                  Explore the pipeline →
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Campaign entry point ── */}
      <motion.div className="mb-6" {...m(fadeUp(0.15))}>
        <button
          type="button"
          onClick={() => onStartCampaign?.()}
          className="w-full flex items-center justify-between gap-4 px-5 py-4 rounded-xl border border-black/[0.08] bg-white hover:border-[#009eda]/30 hover:bg-[#009eda]/[0.02] transition-all group cursor-pointer text-left"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500 group-hover:bg-[#009eda]/10 group-hover:text-[#009eda] transition-colors">
              <Layers size={16} />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-gray-800">Batch intelligence extraction</p>
              <p className="text-[11px] text-gray-400 leading-snug">Multi-document analysis, cross-document patterns, and a compliance heatmap</p>
            </div>
          </div>
          <ChevronRight size={16} className="text-gray-300 group-hover:text-[#009eda] transition-colors shrink-0" />
        </button>
      </motion.div>

      {/* ── Widget Grid ── */}
      {/* ── Org Brain Aspiration ── */}
      <motion.div {...m(fadeUp(0.4))} className="rounded-xl border border-black/[0.08] bg-white p-8">
        {/* Ghosted knowledge graph visualization */}
        <div className="relative flex items-center justify-center py-8">
          <svg width="480" height="240" viewBox="0 0 480 240" className="opacity-20">
            {/* Connections */}
            <line x1="240" y1="60" x2="100" y2="140" stroke="#009eda" strokeWidth="1.5" strokeDasharray="4 4" />
            <line x1="240" y1="60" x2="380" y2="140" stroke="#a78bfa" strokeWidth="1.5" strokeDasharray="4 4" />
            <line x1="100" y1="140" x2="180" y2="200" stroke="#fbbf24" strokeWidth="1.5" strokeDasharray="4 4" />
            <line x1="380" y1="140" x2="300" y2="200" stroke="#34d399" strokeWidth="1.5" strokeDasharray="4 4" />
            <line x1="240" y1="60" x2="240" y2="200" stroke="#f87171" strokeWidth="1" strokeDasharray="3 3" />
            <line x1="100" y1="140" x2="380" y2="140" stroke="#94a3b8" strokeWidth="1" strokeDasharray="3 3" />
            {/* Nodes */}
            <circle cx="240" cy="60" r="28" fill="none" stroke="#009eda" strokeWidth="2" strokeDasharray="4 4" />
            <text x="240" y="64" textAnchor="middle" fill="#64748b" fontSize="9" fontWeight="600">Compliance</text>
            <circle cx="100" cy="140" r="24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeDasharray="4 4" />
            <text x="100" y="144" textAnchor="middle" fill="#64748b" fontSize="9" fontWeight="600">Financial</text>
            <circle cx="380" cy="140" r="24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeDasharray="4 4" />
            <text x="380" y="144" textAnchor="middle" fill="#64748b" fontSize="9" fontWeight="600">Regulatory</text>
            <circle cx="180" cy="200" r="20" fill="none" stroke="#34d399" strokeWidth="1.5" strokeDasharray="4 4" />
            <text x="180" y="204" textAnchor="middle" fill="#64748b" fontSize="8" fontWeight="600">Cultural</text>
            <circle cx="300" cy="200" r="20" fill="none" stroke="#f87171" strokeWidth="1.5" strokeDasharray="4 4" />
            <text x="300" y="204" textAnchor="middle" fill="#64748b" fontSize="8" fontWeight="600">Brand</text>
            <circle cx="440" cy="80" r="16" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="4 4" />
            <text x="440" y="83" textAnchor="middle" fill="#94a3b8" fontSize="7" fontWeight="600">Legal</text>
          </svg>
          {/* Center overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <Brain size={24} className="text-gray-300 mb-2" />
            <p className="text-[14px] font-semibold text-gray-400">Your compliance intelligence will grow here</p>
            <p className="text-[12px] text-gray-300 mt-1">Every analysis makes this smarter</p>
          </div>
        </div>

        {/* Aspirational stats */}
        <div className="flex items-center justify-center gap-8 mt-4 pt-4 border-t border-black/[0.06]">
          {[
            { current: 0, target: '1,247', label: 'Knowledge Entries' },
            { current: 0, target: '342', label: 'Patterns' },
            { current: 0, target: '47h', label: 'Time Saved' },
          ].map(stat => (
            <div key={stat.label} className="text-center">
              <p className="text-[18px] font-bold tabular-nums text-gray-200">
                {stat.current} <span className="text-[11px] font-normal text-gray-300">/ {stat.target}</span>
              </p>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="flex justify-center mt-5">
          <button
            onClick={onStartFirstProject}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-straker-600 hover:bg-straker-500 text-white text-[13px] font-semibold transition-colors cursor-pointer"
          >
            Analyze your first document to start building your Org Brain
            <ArrowRight size={14} />
          </button>
        </div>
      </motion.div>

      {/* ── Trust anchor bar ── */}
      <motion.div
        className="mt-10 pt-5 border-t border-black/[0.06] flex flex-wrap items-center justify-center gap-x-6 gap-y-1"
        {...m(fadeUp(0.6))}
      >
        {[
          'SOC 2 Type II',
          'AES-256 Encryption',
          'In-Region Processing',
          'GDPR Compliant',
        ].map((label, i) => (
          <span key={label} className="flex items-center gap-1.5 text-[11px] text-gray-400">
            {i > 0 && <span className="w-px h-3 bg-black/[0.08] hidden sm:block" />}
            <ShieldCheck size={11} className="text-emerald-500 shrink-0" />
            {label}
          </span>
        ))}
      </motion.div>
    </div>
  );
}
