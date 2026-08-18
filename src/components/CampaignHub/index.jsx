import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  FolderOpen,
  ArrowRight,
  ChevronRight,
  Settings2,
  FileUp,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  ChevronLeft,
  Info,
} from 'lucide-react';
import {
  createCampaign,
  createDocumentRecord,
  createSampleCampaign,
  ENSEMBLE_TEMPLATES,
  DEFAULT_ENSEMBLE_ID,
  checkEnsembleMismatch,
} from '../../data/campaignModel';
import EnsembleTemplateCard from './EnsembleTemplateCard';
import PreflightTable from './PreflightTable';
import BulkEditBar from './BulkEditBar';
import useReducedMotion from '../../hooks/useReducedMotion';

const ACCEPTED_EXTENSIONS = '.docx,.pdf,.pptx,.xlsx,.mp4,.doc,.xls,.ppt,.txt,.csv';

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { type: 'spring', stiffness: 300, damping: 22, delay },
});

/* ─── Step indicator ─────────────────────────────────────────── */
function StepBar({ step }) {
  const steps = ['Upload', 'Pre-flight'];
  return (
    <div className="flex items-center gap-2 mb-8">
      {steps.map((label, i) => {
        const idx = i + 1;
        const done = step > idx;
        const active = step === idx;
        return (
          <div key={label} className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 text-[12px] font-medium transition-colors ${active ? 'text-gray-900' : done ? 'text-[#3D16FA]' : 'text-gray-400'}`}>
              <div className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold shrink-0 ${active ? 'bg-gray-900 text-white' : done ? 'bg-[#3D16FA] text-white' : 'bg-gray-100 text-gray-400'}`}>
                {done ? '✓' : idx}
              </div>
              {label}
            </div>
            {i < steps.length - 1 && (
              <div className={`h-px w-6 shrink-0 ${done || active ? 'bg-[#3D16FA]/40' : 'bg-gray-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Campaign config form ───────────────────────────────────── */
function CampaignConfigPanel({ campaign, onChange }) {
  return (
    <div className="space-y-5">
      {/* Name + PO */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-widest text-gray-500 mb-1.5">Campaign Name</label>
          <input
            type="text"
            value={campaign.name}
            onChange={e => onChange({ name: e.target.value })}
            placeholder="e.g. Q3 Financial Package"
            className="w-full rounded-lg border border-black/[0.10] bg-white px-3 py-2 text-[13px] text-gray-900 placeholder:text-gray-400 outline-none focus:border-[#3D16FA] focus:ring-1 focus:ring-[#3D16FA]/30 transition"
          />
        </div>
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-widest text-gray-500 mb-1.5">PO / Reference</label>
          <input
            type="text"
            value={campaign.poNumber}
            onChange={e => onChange({ poNumber: e.target.value })}
            placeholder="Optional"
            className="w-full rounded-lg border border-black/[0.10] bg-white px-3 py-2 text-[13px] text-gray-900 placeholder:text-gray-400 outline-none focus:border-[#3D16FA] focus:ring-1 focus:ring-[#3D16FA]/30 transition"
          />
        </div>
      </div>

      {/* Quality threshold */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-widest text-gray-500">Quality Threshold</label>
          <span className="text-[13px] font-semibold text-gray-900 tabular-nums">{campaign.config.qualityThreshold}%</span>
        </div>
        <input
          type="range"
          min={60}
          max={100}
          step={1}
          value={campaign.config.qualityThreshold}
          onChange={e => onChange({ config: { ...campaign.config, qualityThreshold: Number(e.target.value) } })}
          className="w-full accent-[#3D16FA]"
        />
        <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
          <span>60%</span>
          <span>100%</span>
        </div>
        <p className="text-[11px] text-gray-400 mt-1">Documents below this score route to human review.</p>
      </div>

      {/* Auto-publish */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[13px] font-medium text-gray-800">Auto-publish above threshold</p>
          <p className="text-[11px] text-gray-400">Bypass human review for documents that meet quality bar</p>
        </div>
        <button
          type="button"
          onClick={() => onChange({ config: { ...campaign.config, autoPublish: !campaign.config.autoPublish } })}
          className="cursor-pointer text-gray-400 hover:text-gray-600 transition-colors"
          aria-pressed={campaign.config.autoPublish}
        >
          {campaign.config.autoPublish
            ? <ToggleRight size={28} className="text-[#3D16FA]" />
            : <ToggleLeft size={28} />}
        </button>
      </div>
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────────── */
export default function CampaignHub({
  structuredContext = {},
  onLaunch,
  onBack,
  isFirstRun = false,
}) {
  const prefersReduced = useReducedMotion();
  const m = (v) => prefersReduced ? {} : v;

  const [view, setView] = useState('upload'); // 'upload' | 'preflight' | 'configure'
  const [isDragOver, setIsDragOver] = useState(false);
  const [campaign, setCampaign] = useState(() => createCampaign({
    locales: structuredContext.targetLocales?.length > 0 ? structuredContext.targetLocales : ['ja', 'de', 'zh'],
    vertical: structuredContext.industryVertical || 'Financial Services',
    tone: structuredContext.toneGuidelines?.tone || 'Formal',
    ensembleId: DEFAULT_ENSEMBLE_ID,
    qualityThreshold: 85,
    autoPublish: false,
  }));
  const [selectedIds, setSelectedIds] = useState([]);
  const [showConfig, setShowConfig] = useState(false);

  const dropRef = useRef(null);
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);

  /* ── Campaign update helpers ── */
  const patchCampaign = useCallback((patch) => {
    setCampaign(prev => ({ ...prev, ...patch }));
  }, []);

  const addDocuments = useCallback((files) => {
    setCampaign(prev => {
      const newDocs = Array.from(files).map(f => createDocumentRecord(f, prev.config));
      return { ...prev, documents: [...prev.documents, ...newDocs] };
    });
    setView('preflight');
  }, []);

  const removeDocument = useCallback((id) => {
    setCampaign(prev => ({ ...prev, documents: prev.documents.filter(d => d.id !== id) }));
    setSelectedIds(prev => prev.filter(i => i !== id));
  }, []);

  const updateDocument = useCallback((id, patch) => {
    setCampaign(prev => ({
      ...prev,
      documents: prev.documents.map(d => d.id === id ? { ...d, ...patch } : d),
    }));
  }, []);

  const applyBulkEdit = useCallback(({ ensembleId, localeOverride }) => {
    setCampaign(prev => ({
      ...prev,
      documents: prev.documents.map(d =>
        selectedIds.includes(d.id)
          ? { ...d, ...(ensembleId ? { ensembleId } : {}), ...(localeOverride ? { localeOverride } : {}) }
          : d
      ),
    }));
    setSelectedIds([]);
  }, [selectedIds]);

  const toggleSelect = useCallback((id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds(prev =>
      prev.length === campaign.documents.length ? [] : campaign.documents.map(d => d.id)
    );
  }, [campaign.documents]);

  /* ── Drag & drop ── */
  const handleDragOver = useCallback((e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true); }, []);
  const handleDragLeave = useCallback((e) => {
    e.preventDefault(); e.stopPropagation();
    if (dropRef.current && !dropRef.current.contains(e.relatedTarget)) setIsDragOver(false);
  }, []);
  const handleDrop = useCallback((e) => {
    e.preventDefault(); e.stopPropagation();
    setIsDragOver(false);
    const files = e.dataTransfer?.files;
    if (files?.length) addDocuments(files);
  }, [addDocuments]);

  /* ── Totals ── */
  const totalLocales = new Set(
    campaign.documents.flatMap(d => d.localeOverride ?? campaign.config.locales)
  ).size;
  const estSegments = campaign.documents.reduce((sum, d) => sum + d.pageCount * 18, 0);
  const flaggedCount = campaign.documents.filter(d =>
    checkEnsembleMismatch(d.ensembleId, d.detectedType)
  ).length;

  const stepIndex = view === 'upload' ? 1 : view === 'preflight' ? 2 : 3;

  /* ─────────────────── VIEW: UPLOAD ─────────────────── */
  if (view === 'upload') {
    const configuredLocales = structuredContext.targetLocales?.length > 0
      ? structuredContext.targetLocales
      : campaign.config.locales;
    const configuredVertical = structuredContext.industryVertical || campaign.config.vertical || 'General';
    const configuredEnsemble = ENSEMBLE_TEMPLATES.find(t => t.id === campaign.config.ensembleId);

    return (
      <div className="w-full p-6 xl:p-8 2xl:p-10">
        {/* Back + stepper */}
        <div className="flex items-center gap-3 mb-6">
          <button type="button" onClick={onBack} className="flex items-center gap-1.5 text-[12px] text-gray-400 hover:text-gray-700 transition-colors cursor-pointer">
            <ChevronLeft size={14} />
            {isFirstRun ? 'Skip — explore the dashboard first' : 'Back'}
          </button>
        </div>
        {!isFirstRun && <StepBar step={stepIndex} />}

        <motion.div {...m(fadeUp(0))}>
          <h1 className="text-[22px] font-bold text-gray-900 mb-1">
            {isFirstRun ? 'Bring in your first documents' : 'Check a batch'}
          </h1>
          <p className="text-[13px] text-gray-500 mb-6">
            {isFirstRun
              ? 'Upload the files you want processed. Settings from your setup are already applied.'
              : 'Upload multiple documents to process together with shared settings.'}
          </p>
        </motion.div>

        {/* First-run context strip */}
        {isFirstRun && (
          <motion.div {...m(fadeUp(0.03))} className="mb-6 flex items-center gap-3 flex-wrap px-4 py-3 rounded-xl border border-[#3D16FA]/20 bg-[#3D16FA]/[0.04]">
            <Info size={13} className="text-[#3D16FA] shrink-0" />
            <div className="flex items-center gap-3 flex-wrap text-[12px] text-gray-600">
              {configuredLocales.length > 0 && (
                <span>
                  <span className="font-medium text-gray-800">Locales:</span>{' '}
                  {configuredLocales.map(l => l.toUpperCase()).join(', ')}
                </span>
              )}
              {configuredVertical && (
                <span className="text-gray-300 select-none">·</span>
              )}
              {configuredVertical && (
                <span>
                  <span className="font-medium text-gray-800">Vertical:</span>{' '}
                  {configuredVertical}
                </span>
              )}
              {configuredEnsemble && (
                <span className="text-gray-300 select-none">·</span>
              )}
              {configuredEnsemble && (
                <span>
                  <span className="font-medium text-gray-800">Ensemble:</span>{' '}
                  {configuredEnsemble.name}
                </span>
              )}
            </div>
          </motion.div>
        )}

        {/* Drop zone */}
        <motion.div {...m(fadeUp(0.05))}>
          <div
            ref={dropRef}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed transition-all py-16 px-8 text-center cursor-pointer ${
              isDragOver
                ? 'border-[#3D16FA] bg-[#3D16FA]/[0.04]'
                : 'border-black/[0.12] bg-gray-50/50 hover:border-[#3D16FA]/50 hover:bg-[#3D16FA]/[0.02]'
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className={`flex h-14 w-14 items-center justify-center rounded-2xl transition-colors ${isDragOver ? 'bg-[#3D16FA]/10' : 'bg-white border border-black/[0.08]'}`}>
              <Upload size={24} className={isDragOver ? 'text-[#3D16FA]' : 'text-gray-400'} />
            </div>
            <div>
              <p className="text-[15px] font-semibold text-gray-800 mb-1">Drop files here</p>
              <p className="text-[13px] text-gray-400">or click to browse · multiple files at once</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 text-white text-[13px] font-medium hover:bg-gray-800 transition-colors cursor-pointer"
              >
                <FileUp size={14} /> Browse files
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); folderInputRef.current?.click(); }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-black/[0.10] bg-white text-gray-700 text-[13px] font-medium hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <FolderOpen size={14} /> Select folder
              </button>
            </div>
            <p className="text-[11px] text-gray-300 font-mono">.docx · .pdf · .pptx · .xlsx · .mp4</p>
          </div>
        </motion.div>

        {/* Hidden file inputs */}
        <input ref={fileInputRef} type="file" multiple accept={ACCEPTED_EXTENSIONS} className="hidden" onChange={(e) => { if (e.target.files?.length) addDocuments(e.target.files); e.target.value = ''; }} />
        <input ref={folderInputRef} type="file" webkitdirectory="" multiple className="hidden" onChange={(e) => { if (e.target.files?.length) addDocuments(e.target.files); e.target.value = ''; }} />

        {/* Sample campaign CTA */}
        <motion.div className="mt-6 flex justify-center" {...m(fadeUp(0.1))}>
          <button
            type="button"
            onClick={() => {
              const sample = createSampleCampaign(structuredContext);
              setCampaign(sample);
              setView('preflight');
            }}
            className="flex items-center gap-2 text-[13px] text-[#3D16FA] hover:text-[#2E10C4] transition-colors cursor-pointer"
          >
            <Sparkles size={13} />
            Try with sample campaign (3 documents)
          </button>
        </motion.div>
      </div>
    );
  }

  /* ─────────────────── VIEW: PREFLIGHT ─────────────────── */
  if (view === 'preflight') {
    return (
      <div className="w-full p-6 xl:p-8 2xl:p-10 pb-24">
        <div className="flex items-center gap-3 mb-6">
          <button type="button" onClick={() => setView('upload')} className="flex items-center gap-1.5 text-[12px] text-gray-400 hover:text-gray-700 transition-colors cursor-pointer">
            <ChevronLeft size={14} /> {isFirstRun ? 'Start over' : 'Back'}
          </button>
        </div>
        {!isFirstRun && <StepBar step={stepIndex} />}

        {/* Header row */}
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h1 className="text-[20px] font-bold text-gray-900 mb-0.5">Pre-flight review</h1>
            <p className="text-[13px] text-gray-500">
              {campaign.documents.length} document{campaign.documents.length !== 1 ? 's' : ''} · {totalLocales} locale{totalLocales !== 1 ? 's' : ''} · ~{estSegments.toLocaleString()} segments
              {flaggedCount > 0 && (
                <span className="ml-2 inline-flex items-center gap-1 text-amber-600">
                  · {flaggedCount} ensemble mismatch{flaggedCount > 1 ? 'es' : ''}
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 text-[12px] text-gray-500 hover:text-gray-800 border border-black/[0.10] rounded-lg px-3 py-2 bg-white transition-colors cursor-pointer"
            >
              <FileUp size={13} /> Add files
            </button>
            <button
              type="button"
              onClick={() => setShowConfig(v => !v)}
              className={`flex items-center gap-1.5 text-[12px] border rounded-lg px-3 py-2 transition-colors cursor-pointer ${showConfig ? 'border-[#3D16FA]/40 bg-[#3D16FA]/[0.04] text-[#3D16FA]' : 'border-black/[0.10] bg-white text-gray-500 hover:text-gray-800'}`}
            >
              <Settings2 size={13} /> Campaign settings
            </button>
          </div>
        </div>

        {/* Campaign config expansion */}
        <AnimatePresence>
          {showConfig && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden mb-5"
            >
              <div className="rounded-xl border border-black/[0.08] bg-gray-50/60 p-5">
                <h3 className="text-[12px] font-semibold uppercase tracking-widest text-gray-500 mb-4">Campaign Configuration</h3>
                <CampaignConfigPanel campaign={campaign} onChange={patchCampaign} />
                <div className="mt-5 pt-4 border-t border-black/[0.06]">
                  <h3 className="text-[12px] font-semibold uppercase tracking-widest text-gray-500 mb-3">Default Ensemble</h3>
                  <div className="grid grid-cols-2 xl:grid-cols-4 gap-2">
                    {ENSEMBLE_TEMPLATES.map(t => (
                      <EnsembleTemplateCard
                        key={t.id}
                        template={t}
                        selected={campaign.config.ensembleId === t.id}
                        onSelect={(id) => {
                          // Update campaign default + re-apply to docs that haven't been individually overridden
                          setCampaign(prev => ({
                            ...prev,
                            config: { ...prev.config, ensembleId: id },
                            documents: prev.documents.map(d => ({ ...d, ensembleId: id })),
                          }));
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pre-flight table */}
        {campaign.documents.length > 0 ? (
          <PreflightTable
            documents={campaign.documents}
            campaignLocales={campaign.config.locales}
            onRemoveDocument={removeDocument}
            onUpdateDocument={updateDocument}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onToggleSelectAll={toggleSelectAll}
          />
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-black/[0.08] py-12 text-center">
            <p className="text-[13px] text-gray-400">No documents added yet.</p>
            <button type="button" onClick={() => fileInputRef.current?.click()} className="mt-3 text-[13px] text-[#3D16FA] hover:text-[#2E10C4] cursor-pointer transition-colors">Add files →</button>
          </div>
        )}

        {/* Hidden file input for "Add files" button */}
        <input ref={fileInputRef} type="file" multiple accept={ACCEPTED_EXTENSIONS} className="hidden" onChange={(e) => { if (e.target.files?.length) { setCampaign(prev => ({ ...prev, documents: [...prev.documents, ...Array.from(e.target.files).map(f => createDocumentRecord(f, prev.config))] })); e.target.value = ''; } }} />

        {/* Bottom action bar */}
        {campaign.documents.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 z-20 flex items-center justify-between px-8 py-4 bg-white border-t border-black/[0.08] shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
            <div className="text-[13px] text-gray-500">
              <span className="font-medium text-gray-900">{campaign.documents.length}</span> documents ·{' '}
              <span className="font-medium text-gray-900">{totalLocales}</span> locale{totalLocales !== 1 ? 's' : ''} ·{' '}
              ~<span className="font-medium text-gray-900">{estSegments.toLocaleString()}</span> segments
            </div>
            <button
              type="button"
              onClick={() => onLaunch?.(campaign)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-900 text-white text-[13px] font-semibold hover:bg-gray-800 transition-colors cursor-pointer"
            >
              Start Campaign <ArrowRight size={15} />
            </button>
          </div>
        )}

        {/* Bulk edit bar */}
        <AnimatePresence>
          {selectedIds.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} transition={{ duration: 0.15 }}>
              <BulkEditBar
                selectedCount={selectedIds.length}
                campaignLocales={campaign.config.locales}
                onApply={applyBulkEdit}
                onDismiss={() => setSelectedIds([])}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return null;
}
