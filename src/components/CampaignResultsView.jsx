import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  RotateCcw,
  Download,
  ChevronRight,
  AlertTriangle,
  Send,
  Database,
  Globe,
  Webhook,
  CheckCheck,
  Clock,
  XCircle,
  Loader2,
  Plus,
  Trash2,
  Eye,
  Lock,
  Building2,
  UserCheck,
  Mail,
  Link,
  ArrowRight,
  X,
  FileText,
  Truck,
  Info,
} from 'lucide-react';
import { scoreTier } from './QualityHeatmap';
import PatternTriagePanel from './PatternTriagePanel';
import { EXPORT_FORMATS, FOLDER_STRUCTURE_TEMPLATES } from '../data/campaignModel';
import useReducedMotion from '../hooks/useReducedMotion';

/* ─── Score Ring ─────────────────────────────────────────────── */

function ScoreRing({ score, size = 80, strokeWidth = 6, color, prefersReducedMotion = false }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const scoreColor = color || (score >= 85 ? '#34d399' : score >= 70 ? '#fbbf24' : '#f87171');
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(0,0,0,0.04)" strokeWidth={strokeWidth} />
        <motion.circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={scoreColor} strokeWidth={strokeWidth} strokeLinecap="round" strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - progress }}
          transition={{ duration: prefersReducedMotion ? 0 : 1.2, type: 'spring', stiffness: 80, damping: 15 }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-mono font-bold text-gray-900" style={{ fontSize: size > 60 ? '1.5rem' : size > 40 ? '1rem' : '0.75rem' }}>{score}</span>
      </div>
    </div>
  );
}

/* ─── Helpers ────────────────────────────────────────────────── */

const LOCALE_META = { ja: { flag: '\u{1F1EF}\u{1F1F5}', name: 'Japanese', agent: 'JP-FIN-3' }, de: { flag: '\u{1F1E9}\u{1F1EA}', name: 'German', agent: 'EU-REG-5' }, zh: { flag: '\u{1F1E8}\u{1F1F3}', name: 'Chinese', agent: 'CN-FIN-2' }, fr: { flag: '\u{1F1EB}\u{1F1F7}', name: 'French', agent: 'FR-GEN-1' }, es: { flag: '\u{1F1EA}\u{1F1F8}', name: 'Spanish', agent: 'ES-GEN-1' }, ko: { flag: '\u{1F1F0}\u{1F1F7}', name: 'Korean', agent: 'KR-FIN-1' }, pt: { flag: '\u{1F1E7}\u{1F1F7}', name: 'Portuguese', agent: 'PT-GEN-1' } };
function getLocaleMeta(code) { return LOCALE_META[code.toLowerCase()] || { flag: '\u{1F310}', name: code.toUpperCase(), agent: 'Agent' }; }
function avg(nums) { const v = nums.filter(n => n != null); return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null; }
function getScoreColor(score) {
  if (score >= 85) return { text: 'text-emerald-600', bar: 'bg-emerald-400' };
  if (score >= 70) return { text: 'text-amber-600', bar: 'bg-amber-400' };
  return { text: 'text-red-600', bar: 'bg-red-400' };
}

/* Generate mock dimension scores from a quality score */
function mockDimensions(score) {
  const jitter = (base, range) => Math.max(0, Math.min(100, base + Math.round((Math.random() - 0.5) * range)));
  return [
    { name: 'Domain Precision', score: jitter(score, 14) },
    { name: 'Regulatory', score: jitter(score + 4, 10) },
    { name: 'Cultural', score: jitter(score - 2, 12) },
    { name: 'Reading Level', score: jitter(score + 3, 8) },
  ];
}

/* Generate alert text based on score and locale */
function generateAlert(score, locale) {
  if (score >= 85) return null;
  const lc = locale.toLowerCase();
  if (score < 75) return `Critical terminology gaps in ${locale.toUpperCase()} knowledge base`;
  if (lc === 'ja') return 'J-GAAP terminology below threshold';
  if (lc === 'de') return 'Regulatory language needs review';
  return `Cultural adaptation below ${locale.toUpperCase()} threshold`;
}

/* ─── Build doc summaries ────────────────────────────────────── */

function buildDocSummaries(campaign, threshold) {
  return (campaign.documents ?? []).map(doc => {
    const locales = doc.localeOverride ?? campaign.config?.locales ?? [];
    const results = doc.localeResults ?? [];
    const docScores = results.map(r => r.qualityScore).filter(s => s != null);
    const docAvg = avg(docScores);
    const reviewCount = docScores.filter(s => s < threshold).length;
    const status = reviewCount > 0 ? 'needs-review' : docAvg != null ? 'ready' : 'pending';
    const topIssue = reviewCount > 0
      ? (results.find(r => r.qualityScore != null && r.qualityScore < threshold)
          ? `${results.find(r => r.qualityScore != null && r.qualityScore < threshold).locale.toUpperCase()} below threshold`
          : null)
      : null;

    // Build locale health cards (same shape as QualityNarrative's localeHealthCards)
    const localeCards = locales.map(locale => {
      const result = results.find(r => r.locale === locale);
      const score = result?.qualityScore ?? null;
      const meta = getLocaleMeta(locale);
      return {
        locale: locale.toUpperCase(),
        flag: meta.flag,
        name: meta.name,
        agent: meta.agent,
        score: score ?? 0,
        dimensions: score != null ? mockDimensions(score) : [],
        alert: score != null ? generateAlert(score, locale) : null,
        hasDiagnostic: score != null && score < 85,
      };
    });

    return { doc, docAvg, status, reviewCount, topIssue, localeCards };
  });
}

/* ─── Batch issue strip ──────────────────────────────────────── */

function buildBatchIssues(docSummaries) {
  const issues = [];
  const localeIssues = {};
  for (const ds of docSummaries) {
    for (const lc of ds.localeCards) {
      if (lc.alert) {
        const key = lc.locale;
        if (!localeIssues[key]) localeIssues[key] = 0;
        localeIssues[key]++;
      }
    }
  }
  for (const [locale, count] of Object.entries(localeIssues)) {
    issues.push(`${count} doc${count > 1 ? 's' : ''} have ${locale} quality issues`);
  }
  const blocked = docSummaries.filter(d => d.status === 'needs-review').length;
  if (blocked > 0) issues.push(`${blocked} doc${blocked > 1 ? 's' : ''} not cleared for auto-publish`);
  return issues;
}

/* ─── Delivery constants ─────────────────────────────────────── */

const DESTINATION_TYPES = [
  { id: 'reviewer', label: 'Invite reviewer', icon: UserCheck, description: 'They review directly in the platform', primary: true },
  { id: 'straker', label: 'Send to arbitr', icon: Building2, description: 'Professional post-editing service', primary: true, upsell: true },
  { id: 's3', label: 'AWS S3', icon: Database, description: 'Push to an S3 bucket' },
  { id: 'sftp', label: 'SFTP', icon: Globe, description: 'Upload via secure FTP' },
  { id: 'webhook', label: 'Webhook', icon: Webhook, description: 'POST to an API endpoint' },
];
const DELIVERY_STATUS = {
  pending: { label: 'Pending', icon: Clock, color: 'text-gray-400', bg: 'bg-gray-50' },
  sending: { label: 'Sending', icon: Loader2, color: 'text-[#3D16FA]', bg: 'bg-[#3D16FA]/[0.06]' },
  sent: { label: 'Invitation sent', icon: CheckCheck, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  failed: { label: 'Failed', icon: XCircle, color: 'text-red-500', bg: 'bg-red-50' },
};

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */

export default function CampaignResultsView({ campaign, threshold = 85, onReset, onReviewJob }) {
  const prefersReduced = useReducedMotion();
  const m = (v) => prefersReduced ? {} : v;
  const [selectedDocIdx, setSelectedDocIdx] = useState(0);
  const [viewMode, setViewMode] = useState('review'); // 'review' | 'compare' | 'deliver'
  const [destinations, setDestinations] = useState([]);
  const [showAddDest, setShowAddDest] = useState(false);

  /* ── Computed ── */
  const totalDocs = campaign.documents?.length ?? 0;
  const allLocales = [...new Set((campaign.documents ?? []).flatMap(d => d.localeOverride ?? campaign.config?.locales ?? []))];
  const scores = (campaign.documents ?? []).flatMap(d => (d.localeResults ?? []).map(r => r.qualityScore)).filter(s => s != null);
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
  const autoPublished = scores.filter(s => s >= threshold).length;
  const needsReview = scores.filter(s => s < threshold).length;

  const docSummaries = useMemo(() => buildDocSummaries(campaign, threshold), [campaign, threshold]);
  const batchIssues = useMemo(() => buildBatchIssues(docSummaries), [docSummaries]);
  const selectedSummary = docSummaries[selectedDocIdx] ?? docSummaries[0];

  const readyCount = docSummaries.filter(d => d.status === 'ready').length;
  const reviewDocCount = docSummaries.filter(d => d.status === 'needs-review').length;
  const flaggedJobs = useMemo(() => buildFlaggedJobs(campaign, threshold), [campaign, threshold]);

  /* ── Delivery state ── */
  const addDestination = (typeId) => {
    if (destinations.some(d => d.type === typeId && (typeId === 'straker' || typeId === 'reviewer'))) return;
    setDestinations(prev => [...prev, { id: `dest-${Date.now()}`, type: typeId, status: 'pending' }]);
    setShowAddDest(false);
  };
  const updateDestination = (id, patch) => setDestinations(prev => prev.map(d => d.id === id ? { ...d, ...patch } : d));
  const removeDestination = (id) => setDestinations(prev => prev.filter(d => d.id !== id));
  const sendToDestination = (id) => { updateDestination(id, { status: 'sending' }); setTimeout(() => updateDestination(id, { status: 'sent' }), 2200); };

  return (
    <motion.div
      initial={prefersReduced ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: prefersReduced ? 0 : 0.4 }}
      className="w-full space-y-6"
    >
      {/* ═══ 1. COMPLETION HEADER ═══ */}
      <div className="bg-gray-50 border border-black/[0.12] rounded-lg p-8">
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-lg bg-emerald-50 flex items-center justify-center">
            <CheckCircle2 className="w-7 h-7 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Campaign Complete</h1>
          <p className="text-[14px] text-gray-500">
            {campaign.name || 'Campaign'} &middot; {totalDocs} document{totalDocs !== 1 ? 's' : ''} &middot; {allLocales.map(l => l.toUpperCase()).join(' \u00b7 ')}
          </p>
        </div>
      </div>

      {/* ═══ 2. BATCH SUMMARY STRIP ═══ */}
      <div className="bg-gray-50 border border-black/[0.12] rounded-lg p-6">
        <div className="flex items-center gap-6">
          {avgScore != null && <ScoreRing score={avgScore} size={72} strokeWidth={6} prefersReducedMotion={prefersReduced} />}
          <div className="flex-1 min-w-0">
            <h2 className="text-[18px] font-semibold text-gray-900 mb-1">{avgScore ?? '\u2014'}% Overall Quality</h2>
            <p className="text-[13px] text-gray-500 leading-relaxed mb-3">
              {totalDocs} documents processed across {allLocales.length} locale{allLocales.length !== 1 ? 's' : ''}.
              {readyCount > 0 && ` ${readyCount} ready for delivery.`}
              {reviewDocCount > 0 && ` ${reviewDocCount} need${reviewDocCount === 1 ? 's' : ''} review before publishing.`}
            </p>
            <div className="flex flex-wrap gap-2">
              {readyCount > 0 && (
                <span className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-500/20 text-emerald-700 text-[11px] font-medium px-2.5 py-1 rounded-lg">
                  <CheckCircle2 size={12} /> {readyCount} Ready
                </span>
              )}
              {reviewDocCount > 0 && (
                <span className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-500/20 text-amber-700 text-[11px] font-medium px-2.5 py-1 rounded-lg">
                  <AlertTriangle size={12} /> {reviewDocCount} Needs Review
                </span>
              )}
              {needsReview > 0 && (
                <span className="inline-flex items-center gap-1.5 bg-red-50 border border-red-500/20 text-red-700 text-[11px] font-medium px-2.5 py-1 rounded-lg">
                  <X size={12} /> Auto-Publish: Not Cleared
                </span>
              )}
              {needsReview === 0 && scores.length > 0 && (
                <span className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-500/20 text-emerald-700 text-[11px] font-medium px-2.5 py-1 rounded-lg">
                  <CheckCheck size={12} /> Auto-Publish: Cleared
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Batch issue strip */}
        {batchIssues.length > 0 && (
          <div className="mt-4 pt-4 border-t border-black/[0.06] flex flex-wrap gap-3">
            {batchIssues.map((issue, i) => (
              <span key={i} className="flex items-center gap-1.5 text-[11px] text-amber-700">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                {issue}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ═══ 3. VIEW MODE TOGGLE ═══ */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
          {[
            { id: 'review', label: 'Review Documents' },
            { id: 'compare', label: 'Compare All' },
            { id: 'deliver', label: 'Share & Publish' },
          ].map(mode => (
            <button key={mode.id} type="button" onClick={() => setViewMode(mode.id)}
              className={`px-3.5 py-1.5 rounded-md text-[12px] font-medium transition-all cursor-pointer ${
                viewMode === mode.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}>
              {mode.label}
            </button>
          ))}
        </div>
        <div className="text-[12px] text-gray-400">
          {docSummaries.filter(d => d.status === 'ready').length} of {totalDocs} ready &middot;
          {' '}{reviewDocCount} need{reviewDocCount === 1 ? 's' : ''} attention
        </div>
      </div>

      {/* ═══ VIEW: REVIEW DOCUMENTS (default) ═══ */}
      {viewMode === 'review' && selectedSummary && (
        <div className="grid grid-cols-[240px_1fr] gap-5 min-h-[500px]">
          {/* Left rail — document list */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2 px-1">Documents</p>
            {docSummaries.map((ds, idx) => {
              const isActive = idx === selectedDocIdx;
              const statusDot = ds.status === 'ready' ? 'bg-emerald-400' : ds.status === 'needs-review' ? 'bg-amber-400' : 'bg-gray-300';
              return (
                <button key={ds.doc.id} type="button" onClick={() => setSelectedDocIdx(idx)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg transition-all cursor-pointer ${
                    isActive ? 'bg-white border border-black/[0.12] shadow-sm' : 'hover:bg-gray-50'
                  }`}>
                  <div className="flex items-start gap-2">
                    <span className={`w-2 h-2 rounded-full ${statusDot} shrink-0 mt-1.5`} />
                    <div className="min-w-0 flex-1">
                      <p className={`text-[12px] font-medium truncate ${isActive ? 'text-gray-900' : 'text-gray-700'}`}>
                        {ds.doc.fileName.replace(/\.[^.]+$/, '')}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[11px] font-bold tabular-nums ${ds.docAvg != null ? (ds.docAvg >= 85 ? 'text-emerald-600' : ds.docAvg >= 75 ? 'text-amber-600' : 'text-red-600') : 'text-gray-300'}`}>
                          {ds.docAvg ?? '\u2014'}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {ds.status === 'ready' ? 'Ready' : ds.status === 'needs-review' ? 'Needs review' : 'Pending'}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right panel — single-document detail */}
          <div className="min-w-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedSummary.doc.id}
                initial={prefersReduced ? false : { opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={prefersReduced ? { opacity: 0 } : { opacity: 0, x: -8 }}
                transition={{ duration: 0.2 }}
                className="space-y-5"
              >
                {/* Doc header with score */}
                <div className="bg-gray-50 border border-black/[0.12] rounded-lg p-5">
                  <div className="flex items-center gap-5">
                    {selectedSummary.docAvg != null && (
                      <ScoreRing score={selectedSummary.docAvg} size={64} strokeWidth={5} prefersReducedMotion={prefersReduced} />
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[16px] font-semibold text-gray-900 mb-0.5 truncate">{selectedSummary.doc.fileName}</h3>
                      <p className="text-[12px] text-gray-500 mb-2">
                        {selectedSummary.doc.detectedType} &middot; {selectedSummary.doc.pageCount}p &middot; {selectedSummary.localeCards.length} locale{selectedSummary.localeCards.length !== 1 ? 's' : ''}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {selectedSummary.status === 'ready' ? (
                          <span className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-500/20 text-emerald-700 text-[11px] font-medium px-2.5 py-1 rounded-lg">
                            <CheckCircle2 size={11} /> Ready to publish
                          </span>
                        ) : (
                          <>
                            <span className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-500/20 text-amber-700 text-[11px] font-medium px-2.5 py-1 rounded-lg">
                              <AlertTriangle size={11} /> {selectedSummary.reviewCount} locale{selectedSummary.reviewCount !== 1 ? 's' : ''} need review
                            </span>
                            <span className="inline-flex items-center gap-1.5 bg-red-50 border border-red-500/20 text-red-700 text-[11px] font-medium px-2.5 py-1 rounded-lg">
                              <X size={11} /> Auto-Publish: Not Cleared
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Locale health cards — same as QualityNarrative */}
                <div className={`grid gap-4 ${selectedSummary.localeCards.length <= 3 ? `grid-cols-1 md:grid-cols-${selectedSummary.localeCards.length}` : 'grid-cols-1 md:grid-cols-3'}`}>
                  {selectedSummary.localeCards.map((card, cardIdx) => {
                    const isAmber = card.score < 85;
                    const borderColor = isAmber ? 'border-l-amber-400' : 'border-l-emerald-400';
                    const ringColor = isAmber ? '#fbbf24' : '#34d399';
                    return (
                      <motion.div
                        key={card.locale}
                        initial={prefersReduced ? false : { opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: prefersReduced ? 0 : 0.4, delay: prefersReduced ? 0 : 0.1 * cardIdx }}
                        whileHover={prefersReduced ? {} : { y: -4, transition: { duration: 0.2 } }}
                        className={`bg-gray-50 border border-black/[0.12] border-l-4 ${borderColor} rounded-lg p-5 cursor-default`}
                      >
                        <div className="mb-1">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-lg">{card.flag}</span>
                            <span className="text-[15px] font-semibold text-gray-900">{card.name}</span>
                          </div>
                          <p className="text-[12px] text-gray-500">Agent: {card.agent}</p>
                        </div>
                        <div className="flex justify-center my-4">
                          <ScoreRing score={card.score} size={56} strokeWidth={5} color={ringColor} prefersReducedMotion={prefersReduced} />
                        </div>
                        <div className="space-y-2.5 mb-4">
                          {card.dimensions.map((dim) => {
                            const dc = getScoreColor(dim.score);
                            return (
                              <div key={dim.name}>
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-[11px] text-gray-500">{dim.name}</span>
                                  <span className={`text-[11px] font-medium ${dc.text}`}>{dim.score}%</span>
                                </div>
                                <div className="h-1.5 bg-black/[0.03] rounded-full overflow-hidden">
                                  <motion.div className={`h-full rounded-full ${dc.bar}`}
                                    initial={{ width: '0%' }}
                                    animate={{ width: `${dim.score}%` }}
                                    transition={{ duration: prefersReduced ? 0 : 0.6, delay: prefersReduced ? 0 : 0.3 + cardIdx * 0.1, ease: 'easeOut' }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        {card.alert ? (
                          <div className="bg-amber-50 border border-amber-500/20 rounded-lg px-3 py-2 mb-3">
                            <div className="flex items-start gap-2">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                              <p className="text-[12px] text-amber-700 leading-snug">{card.alert}</p>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-emerald-50 border border-emerald-500/20 rounded-lg px-3 py-2 mb-3">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              <p className="text-[12px] text-emerald-700">All clear</p>
                            </div>
                          </div>
                        )}
                        {card.hasDiagnostic ? (
                          <button type="button" onClick={() => onReviewJob?.({ docId: selectedSummary.doc.id, fileName: selectedSummary.doc.fileName, locale: card.locale.toLowerCase(), score: card.score, detectedType: selectedSummary.doc.detectedType })}
                            className="group flex items-center gap-1 text-[13px] font-medium text-straker-600 hover:text-straker-400 transition-colors cursor-pointer">
                            <span>Review</span>
                            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                          </button>
                        ) : (
                          <span className="flex items-center gap-1 text-[13px] text-gray-500">
                            Details <ArrowRight className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </motion.div>
                    );
                  })}
                </div>

                {/* Deliverables for this document */}
                <div className="relative pt-6">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 flex items-center gap-3">
                    <div className="w-16 h-px bg-gradient-to-r from-transparent to-black/[0.08]" />
                    <span className="text-[10px] uppercase tracking-widest text-gray-400 font-medium whitespace-nowrap">Deliverables</span>
                    <div className="w-16 h-px bg-gradient-to-l from-transparent to-black/[0.08]" />
                  </div>
                </div>
                <div className="bg-gray-50 border border-black/[0.12] rounded-lg p-5 ring-1 ring-straker-500/10">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText size={14} className="text-straker-600" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Output Files</span>
                  </div>
                  <div className="space-y-2 mb-3">
                    <div className="flex items-center gap-3 group">
                      <FileText size={13} className="text-gray-300 group-hover:text-straker-600 transition-colors shrink-0" />
                      <div><p className="text-[12px] text-gray-700 font-medium">{selectedSummary.doc.fileName.replace(/\.[^.]+$/, '')}_verified.docx</p><p className="text-[10px] text-gray-400">Verified Document</p></div>
                    </div>
                    <div className="flex items-center gap-3 group">
                      <FileText size={13} className="text-gray-300 group-hover:text-straker-600 transition-colors shrink-0" />
                      <div><p className="text-[12px] text-gray-700 font-medium">quality_report.pdf</p><p className="text-[10px] text-gray-400">Quality Assessment Report</p></div>
                    </div>
                  </div>
                  <button type="button" className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-amber hover:bg-amber-deep text-white font-semibold text-[12px] transition-all cursor-pointer">
                    <Download size={14} /> Download Files
                  </button>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* ═══ VIEW: COMPARE ALL ═══ */}
      {viewMode === 'compare' && (
        <div className="space-y-3">
          {docSummaries.map((ds, idx) => {
            const tier = scoreTier(ds.docAvg);
            return (
              <motion.div key={ds.doc.id}
                initial={prefersReduced ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: prefersReduced ? 0 : idx * 0.05 }}
                className="bg-white border border-black/[0.10] rounded-xl p-5 hover:border-black/[0.20] hover:shadow-sm transition-all cursor-pointer"
                onClick={() => { setSelectedDocIdx(idx); setViewMode('review'); }}
              >
                <div className="flex items-center gap-5">
                  {ds.docAvg != null && <ScoreRing score={ds.docAvg} size={48} strokeWidth={4} prefersReducedMotion={prefersReduced} />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="text-[14px] font-semibold text-gray-900 truncate">{ds.doc.fileName}</h3>
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${ds.status === 'ready' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                        {ds.status === 'ready' ? 'Ready' : 'Needs review'}
                      </span>
                    </div>
                    <p className="text-[12px] text-gray-500">{ds.doc.detectedType} &middot; {ds.doc.pageCount}p</p>
                  </div>
                  {/* Locale chips */}
                  <div className="flex items-center gap-2 shrink-0">
                    {ds.localeCards.map(lc => {
                      const lt = scoreTier(lc.score);
                      return (
                        <div key={lc.locale} className={`flex flex-col items-center gap-0.5 rounded-lg border px-3 py-1.5 ${lt.bg} ${lt.border}`}>
                          <span className={`text-[13px] font-bold tabular-nums ${lt.text}`}>{lc.score}</span>
                          <span className="text-[9px] font-medium text-gray-500">{lc.locale}</span>
                        </div>
                      );
                    })}
                  </div>
                  <ChevronRight size={16} className="text-gray-300 shrink-0" />
                </div>
                {ds.topIssue && (
                  <div className="mt-2 ml-[68px]">
                    <span className="text-[11px] text-amber-600 flex items-center gap-1.5">
                      <AlertTriangle size={10} /> {ds.topIssue}
                    </span>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ═══ VIEW: SHARE & PUBLISH ═══ */}
      {viewMode === 'deliver' && (
        <DeliverView
          campaign={campaign}
          destinations={destinations}
          addDestination={addDestination}
          updateDestination={updateDestination}
          removeDestination={removeDestination}
          sendToDestination={sendToDestination}
          reviewDocCount={reviewDocCount}
          totalDocs={totalDocs}
          readyCount={readyCount}
          flaggedJobs={flaggedJobs}
          threshold={threshold}
        />
      )}

      {/* ═══ FOOTER ═══ */}
      <div className="flex items-center justify-between pt-4 border-t border-black/[0.06]">
        <div className="text-[12px] text-gray-400">
          {readyCount} of {totalDocs} documents ready for publish
        </div>
        <button type="button" onClick={onReset}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-black/[0.10] text-gray-500 text-[13px] font-medium hover:bg-gray-50 transition-colors cursor-pointer">
          <RotateCcw size={13} /> New Campaign
        </button>
      </div>
    </motion.div>
  );
}

/* ─── Share & Publish View ────────────────────────────────────── */

function DeliverView({ campaign, destinations, addDestination, updateDestination, removeDestination, sendToDestination, reviewDocCount, totalDocs, readyCount, flaggedJobs, threshold }) {
  const [showExport, setShowExport] = useState(false);
  const hasReviewer = destinations.some(d => d.type === 'reviewer');
  const hasStraker = destinations.some(d => d.type === 'straker');

  // Build smart context for reviewer note
  const reviewSummary = useMemo(() => {
    if (!flaggedJobs || flaggedJobs.length === 0) return '';
    const localeGroups = {};
    flaggedJobs.forEach(j => {
      const lc = j.locale.toUpperCase();
      if (!localeGroups[lc]) localeGroups[lc] = { count: 0, worstScore: 100 };
      localeGroups[lc].count++;
      localeGroups[lc].worstScore = Math.min(localeGroups[lc].worstScore, j.score);
    });
    const parts = Object.entries(localeGroups).map(([lc, g]) => `${lc} (${g.count} flagged, lowest: ${g.worstScore})`);
    return `${flaggedJobs.length} segments need review across ${parts.join(', ')}. Threshold: ${threshold}%.`;
  }, [flaggedJobs, threshold]);

  return (
    <div className="space-y-5">
      {/* Headline: what needs to happen */}
      {reviewDocCount > 0 ? (
        <div className="flex items-center gap-2.5 mb-1">
          <AlertTriangle size={16} className="text-amber-500 shrink-0" />
          <p className="text-[15px] font-semibold text-gray-900">
            {reviewDocCount} document{reviewDocCount !== 1 ? 's' : ''} need review before publishing
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-2.5 mb-1">
          <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
          <p className="text-[15px] font-semibold text-gray-900">
            All {totalDocs} documents are ready to publish
          </p>
        </div>
      )}

      {/* Primary: Send for Review */}
      {!hasReviewer ? (
        <button type="button" onClick={() => addDestination('reviewer')}
          className="w-full flex items-center gap-4 p-5 rounded-xl border-2 border-[#3D16FA]/20 bg-[#3D16FA]/[0.02] hover:border-[#3D16FA]/40 hover:bg-[#3D16FA]/[0.05] group cursor-pointer transition-all text-left">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#3D16FA]/10 group-hover:bg-[#3D16FA]/20 transition-colors shrink-0">
            <Send size={20} className="text-[#3D16FA]" />
          </div>
          <div className="flex-1">
            <p className="text-[14px] font-semibold text-gray-900">Send for Review</p>
            <p className="text-[12px] text-gray-500">Review happens in-platform</p>
          </div>
          <ArrowRight size={16} className="text-gray-300 group-hover:text-[#3D16FA] transition-colors" />
        </button>
      ) : (
        <ReviewerInlineForm
          dest={destinations.find(d => d.type === 'reviewer')}
          onChange={updateDestination}
          onRemove={removeDestination}
          onSend={sendToDestination}
          defaultNote={reviewSummary}
        />
      )}

      {/* arbitr professional service — demoted to text link */}
      {!hasStraker ? (
        <button type="button" onClick={() => addDestination('straker')}
          className="flex items-center gap-1.5 text-[12px] text-gray-400 hover:text-gray-600 cursor-pointer transition-colors">
          <Building2 size={13} />
          <span>Or send to a professional post-editing service</span>
          <ArrowRight size={11} />
        </button>
      ) : (
        <DeliveryDestinationForm
          dest={destinations.find(d => d.type === 'straker')}
          onChange={updateDestination}
          onRemove={removeDestination}
          onSend={sendToDestination}
        />
      )}

      {/* Export files — quiet disclosure */}
      <div className="border-t border-black/[0.06] pt-4">
        <button type="button" onClick={() => setShowExport(v => !v)}
          className="flex items-center gap-2 text-[12px] text-gray-400 hover:text-gray-600 cursor-pointer transition-colors">
          <Download size={13} />
          <span>Export files</span>
          <ChevronRight size={12} className={`transition-transform ${showExport ? 'rotate-90' : ''}`} />
        </button>
        <AnimatePresence>
          {showExport && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
              <div className="mt-3 rounded-xl border border-black/[0.08] bg-white p-5">
                <ExportWizard campaign={campaign} onDone={() => {}} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ─── Reviewer Inline Form ───────────────────────────────────── */

function ReviewerInlineForm({ dest, onChange, onRemove, onSend, defaultNote = '' }) {
  if (!dest) return null;
  const isSent = dest.status === 'sent';
  const isSending = dest.status === 'sending';

  // Pre-populate note on first render if empty
  const [initialized, setInitialized] = useState(false);
  if (!initialized && defaultNote && !dest.message) {
    onChange(dest.id, { message: defaultNote });
    setInitialized(true);
  }

  // Sent state: compact status row
  if (isSent) {
    return (
      <div className="rounded-xl border border-emerald-200/60 bg-emerald-50/30 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 shrink-0">
            <CheckCheck size={14} className="text-emerald-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-gray-800">{dest.emails || 'Reviewer'}</p>
            <p className="text-[11px] text-emerald-600">Sent for review · just now</p>
          </div>
          <button type="button" onClick={() => onRemove(dest.id)} className="text-[11px] text-gray-400 hover:text-gray-600 cursor-pointer transition-colors">
            Revoke
          </button>
        </div>
      </div>
    );
  }

  // Pending state: inline form
  return (
    <div className="rounded-xl border border-[#3D16FA]/20 bg-[#3D16FA]/[0.02] p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Send size={15} className="text-[#3D16FA]" />
          <span className="text-[14px] font-semibold text-gray-900">Send for Review</span>
        </div>
        <button type="button" onClick={() => onRemove(dest.id)} className="text-[11px] text-gray-400 hover:text-gray-600 cursor-pointer transition-colors">
          Cancel
        </button>
      </div>

      <div>
        <label className="block text-[11px] text-gray-500 mb-1">Reviewer email</label>
        <input
          type="text"
          placeholder="name@company.com"
          value={dest.emails ?? ''}
          onChange={e => onChange(dest.id, { emails: e.target.value })}
          className="w-full rounded-lg border border-black/[0.08] bg-white px-3 py-2 text-[13px] text-gray-800 placeholder:text-gray-400 outline-none focus:border-[#3D16FA] focus:ring-1 focus:ring-[#3D16FA]/20 transition"
        />
      </div>

      <div>
        <label className="block text-[11px] text-gray-500 mb-1">Review summary (editable)</label>
        <textarea
          rows={2}
          placeholder="What should the reviewer focus on?"
          value={dest.message ?? ''}
          onChange={e => onChange(dest.id, { message: e.target.value })}
          className="w-full rounded-lg border border-black/[0.08] bg-white px-3 py-2 text-[13px] text-gray-800 placeholder:text-gray-400 outline-none focus:border-[#3D16FA] focus:ring-1 focus:ring-[#3D16FA]/20 transition resize-none"
        />
      </div>

      <button
        type="button"
        onClick={() => onSend(dest.id)}
        disabled={isSending || !dest.emails?.trim()}
        className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#3D16FA] hover:bg-[#007bb5] text-white text-[13px] font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSending ? <><Loader2 size={13} className="animate-spin" /> Sending...</> : <><Send size={13} /> Send for Review</>}
      </button>
    </div>
  );
}

/* ─── Delivery Destination Form ──────────────────────────────── */

function DeliveryDestinationForm({ dest, onChange, onRemove, onSend }) {
  const cfg = DESTINATION_TYPES.find(t => t.id === dest.type);
  const Icon = cfg?.icon ?? Send;
  const status = DELIVERY_STATUS[dest.status] ?? DELIVERY_STATUS.pending;
  const StatusIcon = status.icon;
  return (
    <div className="rounded-xl border border-black/[0.08] bg-white overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-black/[0.06]">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-gray-600 shrink-0"><Icon size={14} /></div>
        <div className="flex-1"><p className="text-[13px] font-semibold text-gray-800">{cfg?.label}</p><p className="text-[11px] text-gray-400">{cfg?.description}</p></div>
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${status.color} ${status.bg}`}><StatusIcon size={9} className={dest.status === 'sending' ? 'animate-spin' : ''} /> {status.label}</span>
        <button type="button" onClick={() => onRemove(dest.id)} className="p-1 text-gray-300 hover:text-gray-500 transition-colors cursor-pointer"><Trash2 size={13} /></button>
      </div>
      <div className="px-4 py-3 space-y-2.5">
        {dest.type === 'straker' && (<><FormField label="Project name" placeholder="e.g. Q3 Earnings" value={dest.projectName ?? ''} onChange={v => onChange(dest.id, { projectName: v })} /><FormField label="Instructions" placeholder="Focus on terminology..." value={dest.notes ?? ''} onChange={v => onChange(dest.id, { notes: v })} multiline /></>)}
        {dest.type === 'reviewer' && (<><FormField label="Reviewer email(s)" placeholder="reviewer@company.com" value={dest.emails ?? ''} onChange={v => onChange(dest.id, { emails: v })} /><FormField label="Message" placeholder="Please review..." value={dest.message ?? ''} onChange={v => onChange(dest.id, { message: v })} multiline /></>)}
        {dest.type === 's3' && (<><FormField label="Bucket" placeholder="my-bucket" value={dest.bucket ?? ''} onChange={v => onChange(dest.id, { bucket: v })} /><FormField label="Prefix" placeholder="exports/" value={dest.prefix ?? ''} onChange={v => onChange(dest.id, { prefix: v })} /></>)}
        {dest.type === 'sftp' && (<><FormField label="Host" placeholder="sftp.example.com" value={dest.host ?? ''} onChange={v => onChange(dest.id, { host: v })} /><FormField label="Path" placeholder="/exports/" value={dest.path ?? ''} onChange={v => onChange(dest.id, { path: v })} /></>)}
        {dest.type === 'webhook' && (<FormField label="Endpoint" placeholder="https://api.example.com/webhook" value={dest.url ?? ''} onChange={v => onChange(dest.id, { url: v })} />)}
      </div>
      <div className="px-4 pb-3">
        <button type="button" onClick={() => onSend(dest.id)} disabled={dest.status === 'sending' || dest.status === 'sent'}
          className={`flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50 ${dest.type === 'straker' ? 'bg-[#3D16FA] hover:bg-[#007bb5] text-white' : 'bg-gray-900 hover:bg-gray-800 text-white'}`}>
          {dest.status === 'sending' ? <><Loader2 size={11} className="animate-spin" /> Sending...</> : dest.status === 'sent' ? <><CheckCheck size={11} /> Sent</> : <><Send size={11} /> {dest.type === 'straker' ? 'Submit to arbitr' : 'Deliver'}</>}
        </button>
      </div>
    </div>
  );
}

function FormField({ label, placeholder, value, onChange, secure, multiline }) {
  const cls = "w-full rounded-lg border border-black/[0.08] bg-gray-50 px-2.5 py-1.5 text-[12px] text-gray-800 placeholder:text-gray-400 outline-none focus:border-[#3D16FA] focus:ring-1 focus:ring-[#3D16FA]/20 transition";
  return (
    <div>
      <label className="block text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">{label}</label>
      {multiline ? <textarea rows={2} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} className={cls + ' resize-none'} />
        : <input type="text" placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} className={cls} />}
    </div>
  );
}

/* ─── Export Wizard ───────────────────────────────────────────── */

function generateMockContent(format, campaign) {
  const docs = campaign.documents ?? [];
  const allLocales = [...new Set(docs.flatMap(d => d.localeOverride ?? campaign.config?.locales ?? []))];
  const name = campaign.name || 'Campaign';
  const date = new Date().toISOString().slice(0, 10);
  if (format === 'xliff') return `<?xml version="1.0"?>\n<xliff version="1.2">\n<!-- ${name} ${date} -->\n${docs.slice(0,3).map((d,i)=>`<file original="${d.fileName}"><body><trans-unit id="s${i+1}"><source>Segment ${i+1}</source><target>翻訳${i+1}</target></trans-unit></body></file>`).join('\n')}\n</xliff>`;
  if (format === 'tmx') return `<?xml version="1.0"?>\n<tmx version="1.4"><header/><body>${docs.slice(0,3).map((d,i)=>`<tu tuid="${i}"><tuv xml:lang="en"><seg>${d.fileName}</seg></tuv></tu>`).join('')}</body></tmx>`;
  return JSON.stringify({ campaign: name, generated: date, documents: docs.map(d=>({name:d.fileName,type:d.detectedType})) },null,2);
}

function ExportWizard({ campaign, onDone }) {
  const [step, setStep] = useState(1);
  const [formatId, setFormatId] = useState('xliff');
  const [structureId, setStructureId] = useState('locale-doctype');
  const [downloading, setDownloading] = useState(false);
  const handleDownload = () => {
    setDownloading(true);
    setTimeout(() => {
      const ext = formatId === 'xliff' ? 'xliff' : formatId === 'tmx' ? 'tmx' : 'txt';
      const blob = new Blob([generateMockContent(formatId, campaign)], { type: 'application/xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `${(campaign.name||'campaign').replace(/[^a-z0-9]/gi,'_')}_export.${ext}`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
      setDownloading(false); onDone?.();
    }, 900);
  };
  return (
    <div className="space-y-3">
      {step === 1 && (<div className="space-y-2">
        {EXPORT_FORMATS.map(f => (<button key={f.id} type="button" onClick={() => setFormatId(f.id)} className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left cursor-pointer transition-all ${formatId === f.id ? 'border-[#3D16FA] bg-[#3D16FA]/[0.04]' : 'border-black/[0.08] bg-white hover:border-[#3D16FA]/30'}`}><div className="flex-1"><p className="text-[13px] font-medium text-gray-800">{f.label}</p><p className="text-[11px] text-gray-400">{f.description}</p></div>{formatId === f.id && <CheckCircle2 size={14} className="text-[#3D16FA]" />}</button>))}
        <button onClick={() => setStep(2)} className="mt-1 w-full flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-gray-900 text-white text-[13px] font-semibold cursor-pointer hover:bg-gray-800 transition-colors">Next <ChevronRight size={14} /></button>
      </div>)}
      {step === 2 && (<div className="space-y-2">
        {FOLDER_STRUCTURE_TEMPLATES.map(s => (<button key={s.id} type="button" onClick={() => setStructureId(s.id)} className={`w-full flex items-start gap-3 p-3 rounded-lg border text-left cursor-pointer transition-all ${structureId === s.id ? 'border-[#3D16FA] bg-[#3D16FA]/[0.04]' : 'border-black/[0.08] bg-white hover:border-[#3D16FA]/30'}`}><div className="flex-1"><p className="text-[13px] font-medium text-gray-800">{s.label}</p><p className="text-[11px] font-mono text-gray-400">{s.example}</p></div>{structureId === s.id && <CheckCircle2 size={14} className="text-[#3D16FA]" />}</button>))}
        <div className="flex gap-2 mt-1"><button onClick={() => setStep(1)} className="flex-1 px-4 py-2.5 rounded-lg border border-black/[0.10] text-gray-600 text-[13px] font-medium cursor-pointer hover:bg-gray-50">Back</button><button onClick={() => setStep(3)} className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-gray-900 text-white text-[13px] font-semibold cursor-pointer hover:bg-gray-800">Next <ChevronRight size={14} /></button></div>
      </div>)}
      {step === 3 && (<div className="space-y-3">
        <div className="rounded-lg border border-black/[0.08] bg-white p-3 space-y-2 text-[12px]">{[{l:'Campaign',v:campaign.name},{l:'Documents',v:campaign.documents?.length},{l:'Format',v:EXPORT_FORMATS.find(f=>f.id===formatId)?.label},{l:'Structure',v:FOLDER_STRUCTURE_TEMPLATES.find(s=>s.id===structureId)?.label}].map(r=>(<div key={r.l} className="flex justify-between"><span className="text-gray-500">{r.l}</span><span className="text-gray-800 font-medium">{r.v}</span></div>))}</div>
        <div className="flex gap-2"><button onClick={() => setStep(2)} className="flex-1 px-4 py-2.5 rounded-lg border border-black/[0.10] text-gray-600 text-[13px] font-medium cursor-pointer hover:bg-gray-50">Back</button><button onClick={handleDownload} disabled={downloading} className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#3D16FA] text-white text-[13px] font-semibold cursor-pointer hover:bg-[#007bb5] disabled:opacity-60">{downloading ? <><Loader2 size={13} className="animate-spin" /> Generating...</> : <><Download size={13} /> Download .zip</>}</button></div>
      </div>)}
    </div>
  );
}
