import { useState, useCallback, useEffect, useRef } from 'react';
import { Globe, Network, List, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/* ── Document-awareness helpers ── */

const CJK_CODES = ['ja', 'zh', 'zh-tw', 'zh-hk', 'ko'];
const ROMANCE_CODES = ['fr', 'es', 'pt', 'it', 'ro', 'ca'];

function getDocumentRelevantCodes(documentContext) {
  if (!documentContext) return [];
  const { industry, classification } = documentContext;
  const cls = (classification || '').toLowerCase();
  const ind = (industry || '').toLowerCase();

  if (ind === 'financial' || cls.includes('financial') || cls.includes('earnings')) {
    return CJK_CODES;
  }
  if (ind === 'legal' || cls.includes('legal') || cls.includes('regulatory')) {
    return ROMANCE_CODES;
  }
  if (ind === 'medical' || cls.includes('medical') || cls.includes('clinical')) {
    return ['de', 'ja', 'zh', 'ko', 'fr'];
  }
  return [];
}

function isDocumentRelevant(code, relevantCodes) {
  return relevantCodes.some((rc) => code.toLowerCase().startsWith(rc));
}

/* ── Pulsing keyframes (injected once) ── */

const PULSE_STYLE_ID = 'locale-constellation-pulse';

function ensurePulseStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(PULSE_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = PULSE_STYLE_ID;
  style.textContent = `
    @keyframes lc-pulse-ring {
      0%   { stroke-opacity: 0.6; r: 6; }
      50%  { stroke-opacity: 0.15; r: 7.5; }
      100% { stroke-opacity: 0.6; r: 6; }
    }
    @keyframes lc-selected-dash {
      to { stroke-dashoffset: -12; }
    }
    @keyframes lc-connection-draw {
      from { stroke-dashoffset: 20; }
      to   { stroke-dashoffset: 0; }
    }
  `;
  document.head.appendChild(style);
}

export default function LocaleConstellation({
  selectedLocales,
  onToggleLocale,
  constellationData,
  documentContext,
}) {
  const [viewMode, setViewMode] = useState('constellation');
  const [hoveredLocale, setHoveredLocale] = useState(null);
  const [tooltipPos, setTooltipPos] = useState(null);
  const [activeIQCard, setActiveIQCard] = useState(null); // { code, x, y }
  const svgContainerRef = useRef(null);

  const { locales = [], families = [] } = constellationData || {};

  /* Inject keyframes once */
  useEffect(() => {
    ensurePulseStyles();
  }, []);

  /* Close IQ card on outside click */
  useEffect(() => {
    if (!activeIQCard) return;
    const handler = (e) => {
      const card = document.getElementById('locale-iq-card');
      if (card && !card.contains(e.target)) {
        setActiveIQCard(null);
      }
    };
    // Defer so the opening click doesn't immediately close
    const timer = setTimeout(() => document.addEventListener('mousedown', handler), 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handler);
    };
  }, [activeIQCard]);

  /* ── Derived data ── */

  const relevantCodes = getDocumentRelevantCodes(documentContext);

  const isSelected = (code) => selectedLocales.includes(code);
  const getFamilyById = (familyId) => families.find((f) => f.id === familyId) || {};
  const getLocaleByCode = (code) => locales.find((l) => l.code === code);

  const getFamilyCenter = (family) => {
    const members = locales.filter((l) => l.family === family.id);
    if (members.length === 0) return { x: 50, y: 50 };
    const cx = members.reduce((sum, m) => sum + m.x, 0) / members.length;
    const cy = members.reduce((sum, m) => sum + m.y, 0) / members.length;
    return { x: cx, y: cy };
  };

  const getComplexityColor = (complexity) => {
    if (complexity > 0.7) return '#f59e0b';
    if (complexity > 0.5) return '#94a3b8';
    return '#34d399';
  };

  // Build set of already-drawn connections to avoid duplicates
  const drawnConnections = new Set();

  /* ── Event handlers ── */

  const handleNodeMouseEnter = (locale, e) => {
    setHoveredLocale(locale.code);
    const svgRect = e.currentTarget.closest('svg')?.getBoundingClientRect();
    if (svgRect) {
      const nodeX = (locale.x / 100) * svgRect.width + svgRect.left;
      const nodeY = (locale.y / 100) * svgRect.height + svgRect.top;
      setTooltipPos({ x: nodeX, y: nodeY });
    }
  };

  const handleNodeMouseLeave = () => {
    setHoveredLocale(null);
    setTooltipPos(null);
  };

  const handleNodeClick = useCallback(
    (locale, e) => {
      onToggleLocale(locale.code);

      // Position the IQ card relative to the SVG container
      const svgRect = svgContainerRef.current?.getBoundingClientRect();
      if (!svgRect) return;

      if (activeIQCard?.code === locale.code) {
        setActiveIQCard(null);
        return;
      }

      const nodeX = (locale.x / 100) * svgRect.width;
      const nodeY = (locale.y / 100) * svgRect.height;
      setActiveIQCard({ code: locale.code, x: nodeX, y: nodeY });
    },
    [onToggleLocale, activeIQCard],
  );

  const handleKeyDown = (e, locale) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleNodeClick(locale, e);
    }
  };

  /* ── Hovered data for tooltip ── */
  const hoveredLocaleData = hoveredLocale ? getLocaleByCode(hoveredLocale) : null;
  const hoveredFamily = hoveredLocaleData ? getFamilyById(hoveredLocaleData.family) : null;

  /* ── IQ card data ── */
  const iqLocale = activeIQCard ? getLocaleByCode(activeIQCard.code) : null;
  const iqFamily = iqLocale ? getFamilyById(iqLocale.family) : null;

  /* ── Render helpers ── */

  const renderComplexityBadge = (locale) => {
    const complexity = Math.round((locale.complexity || 0) * 100);
    return (
      <g transform="translate(5, -5)">
        <rect x="0" y="-2.5" width="7" height="4" rx="1" fill="#b45309" fillOpacity="0.85" />
        <text
          x="3.5"
          y="0"
          fontSize="2"
          fill="#fbbf24"
          textAnchor="middle"
          dominantBaseline="central"
          fontWeight="700"
          style={{ pointerEvents: 'none' }}
        >
          {complexity}%
        </text>
      </g>
    );
  };

  return (
    <div className="relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5">
            <Globe size={12} className="text-gray-500" />
            <span className="text-[12px] uppercase tracking-wider text-gray-500 font-medium">
              Target Locales
            </span>
          </div>
          {selectedLocales.length > 0 && (
            <span className="text-[11px] text-straker-600 bg-straker-50 px-2 py-0.5 rounded">
              {selectedLocales.length} selected
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setViewMode('constellation')}
            className={`p-1.5 rounded-md cursor-pointer transition-colors ${
              viewMode === 'constellation'
                ? 'bg-straker-50 text-straker-600'
                : 'bg-black/[0.03] text-gray-500 hover:text-gray-500'
            }`}
          >
            <Network size={14} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded-md cursor-pointer transition-colors ${
              viewMode === 'list'
                ? 'bg-straker-50 text-straker-600'
                : 'bg-black/[0.03] text-gray-500 hover:text-gray-500'
            }`}
          >
            <List size={14} />
          </button>
        </div>
      </div>

      {/* Constellation View */}
      {viewMode === 'constellation' && (
        <div className="relative bg-gray-100 rounded-lg border border-black/[0.06] p-4">
          <div className="relative h-[340px]" ref={svgContainerRef}>
            <svg viewBox="0 0 100 100" className="w-full h-full">
              <defs>
                {/* Glow filter for selected nodes */}
                <filter id="lc-glow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="1" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                {/* Amber glow for document-relevant nodes */}
                <filter id="lc-amber-glow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="1.2" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Family zone labels */}
              {families.map((family) => {
                const center = getFamilyCenter(family);
                return (
                  <text
                    key={`family-label-${family.id}`}
                    x={center.x}
                    y={center.y}
                    fill={family.color || 'rgba(0,0,0,0.12)'}
                    fillOpacity={0.15}
                    fontSize="3"
                    fontWeight="600"
                    textAnchor="middle"
                    dominantBaseline="central"
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    {family.label || family.name}
                  </text>
                );
              })}

              {/* Connection lines between related locales */}
              {locales.map((locale) =>
                (locale.relatedTo || []).map((relCode) => {
                  const pairKey = [locale.code, relCode].sort().join('-');
                  if (drawnConnections.has(pairKey)) return null;
                  drawnConnections.add(pairKey);
                  const related = getLocaleByCode(relCode);
                  if (!related) return null;
                  const isEndHovered =
                    hoveredLocale === locale.code || hoveredLocale === relCode;
                  return (
                    <line
                      key={`conn-${pairKey}`}
                      x1={locale.x}
                      y1={locale.y}
                      x2={related.x}
                      y2={related.y}
                      stroke={
                        isEndHovered
                          ? 'rgba(0,0,0,0.25)'
                          : 'rgba(0,0,0,0.1)'
                      }
                      strokeWidth="0.3"
                      strokeDasharray="1 1"
                      style={{ transition: 'stroke 0.2s' }}
                    />
                  );
                }),
              )}

              {/* Connection lines from selected nodes downward ("to brief") */}
              {locales
                .filter((l) => isSelected(l.code))
                .map((locale) => (
                  <line
                    key={`brief-conn-${locale.code}`}
                    x1={locale.x}
                    y1={locale.y}
                    x2={locale.x}
                    y2="100"
                    stroke="#4c6ef5"
                    strokeOpacity="0.25"
                    strokeWidth="0.35"
                    strokeDasharray="1.5 1"
                    style={{
                      animation: 'lc-connection-draw 0.6s ease-out forwards',
                    }}
                  />
                ))}

              {/* Locale nodes */}
              {locales.map((locale) => {
                const selected = isSelected(locale.code);
                const hovered = hoveredLocale === locale.code;
                const family = getFamilyById(locale.family);
                const docRelevant = isDocumentRelevant(locale.code, relevantCodes);
                const showRing = selected || hovered;
                const complexity = locale.complexity || 0;
                const circumference = 2 * Math.PI * 4.5;
                const dashLength = complexity * circumference;
                const nodeRadius = docRelevant ? 5 : 3.5;

                return (
                  <g
                    key={locale.code}
                    transform={`translate(${locale.x}, ${locale.y})`}
                    onClick={(e) => handleNodeClick(locale, e)}
                    onMouseEnter={(e) => handleNodeMouseEnter(locale, e)}
                    onMouseLeave={handleNodeMouseLeave}
                    onKeyDown={(e) => handleKeyDown(e, locale)}
                    tabIndex={0}
                    role="checkbox"
                    aria-checked={selected}
                    aria-label={locale.name}
                    style={{ cursor: 'pointer', outline: 'none' }}
                  >
                    {/* Document-relevant pulsing amber ring */}
                    {docRelevant && (
                      <circle
                        r="6"
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth="0.6"
                        filter="url(#lc-amber-glow)"
                        style={{
                          animation: 'lc-pulse-ring 2s ease-in-out infinite',
                        }}
                      />
                    )}

                    {/* Selected node animated dashed ring */}
                    {selected && (
                      <circle
                        r={nodeRadius + 1.5}
                        fill="none"
                        stroke="#4c6ef5"
                        strokeOpacity="0.5"
                        strokeWidth="0.4"
                        strokeDasharray="2 2"
                        filter="url(#lc-glow)"
                        style={{
                          animation: 'lc-selected-dash 1.5s linear infinite',
                        }}
                      />
                    )}

                    {/* Complexity ring */}
                    {showRing && (
                      <circle
                        r="4.5"
                        fill="none"
                        stroke={family.color || 'rgba(0,0,0,0.3)'}
                        strokeOpacity={0.3}
                        strokeWidth="0.5"
                        strokeDasharray={`${dashLength} ${circumference - dashLength}`}
                        strokeDashoffset={circumference * 0.25}
                        strokeLinecap="round"
                        style={{ transition: 'all 0.2s' }}
                      />
                    )}

                    {/* Main circle */}
                    <circle
                      r={nodeRadius}
                      fill={selected ? '#4c6ef5' : '#e5e7eb'}
                      stroke={
                        selected
                          ? hovered
                            ? '#91a7ff'
                            : '#748ffc'
                          : docRelevant
                            ? '#f59e0b'
                            : hovered
                              ? 'rgba(0,0,0,0.35)'
                              : 'rgba(0,0,0,0.15)'
                      }
                      strokeWidth={selected ? 0.6 : docRelevant ? 0.7 : 0.5}
                      style={{ transition: 'all 0.2s' }}
                    />

                    {/* Locale code text */}
                    <text
                      fontSize={docRelevant ? '2.6' : '2.2'}
                      fill={selected ? '#ffffff' : docRelevant ? '#b45309' : '#6b7280'}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontWeight="600"
                      style={{ pointerEvents: 'none', userSelect: 'none' }}
                    >
                      {locale.code.substring(0, 2).toUpperCase()}
                    </text>

                    {/* Complexity flag badge for doc-relevant nodes */}
                    {docRelevant && renderComplexityBadge(locale)}
                  </g>
                );
              })}
            </svg>

            {/* Tooltip overlay (only when no IQ card for this locale is open) */}
            {hoveredLocaleData && tooltipPos && activeIQCard?.code !== hoveredLocale && (
              <div
                className="fixed z-50 bg-white border border-black/[0.12] rounded-lg p-3  text-[11px] pointer-events-none"
                style={{
                  left: tooltipPos.x,
                  top: tooltipPos.y + 16,
                  transform: 'translateX(-50%)',
                  minWidth: 180,
                }}
              >
                <div className="text-gray-700 font-medium text-[13px] mb-1">
                  {hoveredLocaleData.name}
                </div>
                <div className="text-gray-500 mb-1.5">
                  {hoveredFamily?.label || hoveredFamily?.name || 'Unknown family'}
                </div>
                <div className="flex items-center gap-3 mb-1.5">
                  <span className="text-gray-500">Complexity</span>
                  <span className="text-gray-700">
                    {Math.round((hoveredLocaleData.complexity || 0) * 100)}%
                  </span>
                </div>
                {hoveredLocaleData.qualityPrediction && (
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-gray-500">Quality</span>
                    <span className="text-gray-500">
                      {hoveredLocaleData.qualityPrediction.base}
                    </span>
                    <span className="text-gray-400">&rarr;</span>
                    <span className="text-emerald-400/70">
                      {hoveredLocaleData.qualityPrediction.withEnhancements}
                    </span>
                  </div>
                )}
                {hoveredLocaleData.flags && hoveredLocaleData.flags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {hoveredLocaleData.flags.map((flag) => (
                      <span
                        key={flag}
                        className="text-[9px] bg-black/[0.03] text-gray-500 px-1.5 py-0.5 rounded"
                      >
                        {flag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Locale IQ Card */}
            <AnimatePresence>
              {iqLocale && activeIQCard && (
                <motion.div
                  id="locale-iq-card"
                  initial={{ opacity: 0, scale: 0.9, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 8 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  className="absolute z-[60] bg-white border border-black/[0.12] rounded-lg  p-4"
                  style={{
                    left: Math.min(activeIQCard.x + 12, (svgContainerRef.current?.offsetWidth || 300) - 260),
                    top: Math.max(activeIQCard.y - 40, 8),
                    width: 248,
                  }}
                >
                  {/* Card header */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="text-gray-700 font-semibold text-[14px] leading-tight">
                        {iqLocale.name}
                      </div>
                      <div className="text-gray-500 text-[11px] mt-0.5">
                        {iqFamily?.label || iqFamily?.name || 'Unknown family'}
                        {isDocumentRelevant(iqLocale.code, relevantCodes) && (
                          <span className="ml-1.5 text-amber-400/80 text-[10px] font-medium">
                            Doc-relevant
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveIQCard(null);
                      }}
                      className="p-0.5 rounded hover:bg-black/[0.06] text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
                      aria-label="Close Locale IQ Card"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  {/* Quality prediction */}
                  {iqLocale.qualityPrediction && (
                    <div className="bg-black/[0.02] rounded-lg px-3 py-2 mb-3">
                      <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1.5 font-medium">
                        Predicted Quality
                      </div>
                      <div className="flex items-center gap-2 text-[13px]">
                        <span className="text-gray-500 font-medium">
                          {iqLocale.qualityPrediction.base}
                        </span>
                        <span className="text-gray-400">&rarr;</span>
                        <span className="text-emerald-400 font-semibold">
                          {iqLocale.qualityPrediction.withEnhancements}
                        </span>
                        {iqLocale.qualityPrediction.enhancementLabel && (
                          <span className="text-[10px] text-emerald-400/60 ml-auto">
                            {iqLocale.qualityPrediction.enhancementLabel}
                          </span>
                        )}
                      </div>
                      {documentContext?.industry?.toLowerCase().includes('financial') &&
                        isDocumentRelevant(iqLocale.code, relevantCodes) && (
                          <div className="text-[10px] text-amber-400/70 mt-1">
                            with J-GAAP Guardrails
                          </div>
                        )}
                    </div>
                  )}

                  {/* Complexity indicator bar */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">
                        Complexity
                      </span>
                      <span className="text-[11px] text-gray-500">
                        {Math.round((iqLocale.complexity || 0) * 100)}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-black/[0.03] rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(iqLocale.complexity || 0) * 100}%` }}
                        transition={{ duration: 0.4, ease: 'easeOut' }}
                        className="h-full rounded-full"
                        style={{
                          backgroundColor: getComplexityColor(iqLocale.complexity || 0),
                        }}
                      />
                    </div>
                  </div>

                  {/* Flags as pills */}
                  {iqLocale.flags && iqLocale.flags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {iqLocale.flags.map((flag) => (
                        <span
                          key={flag}
                          className="text-[9px] bg-black/[0.06] text-gray-500 px-2 py-0.5 rounded-full border border-black/[0.12]"
                        >
                          {flag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Select / Deselect button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleLocale(iqLocale.code);
                    }}
                    className={`w-full py-1.5 rounded-lg text-[12px] font-medium transition-colors cursor-pointer ${
                      isSelected(iqLocale.code)
                        ? 'bg-black/[0.04] text-gray-700 hover:bg-black/[0.08]'
                        : 'bg-straker-600 text-white hover:bg-straker-500'
                    }`}
                  >
                    {isSelected(iqLocale.code) ? 'Deselect' : 'Select'}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="bg-gray-100 rounded-lg border border-black/[0.06] overflow-hidden">
          {/* Table header */}
          <div className="bg-gray-100 px-4 py-2.5 grid grid-cols-[28px_1fr_1fr_120px_120px] gap-2 items-center">
            <span />
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
              Locale
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
              Family
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
              Complexity
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
              Predicted Quality
            </span>
          </div>

          {/* Table rows */}
          <div className="max-h-[340px] overflow-y-auto">
            {locales.map((locale) => {
              const selected = isSelected(locale.code);
              const family = getFamilyById(locale.family);
              const complexity = locale.complexity || 0;
              const complexityColor = getComplexityColor(complexity);
              const docRelevant = isDocumentRelevant(locale.code, relevantCodes);

              return (
                <div
                  key={locale.code}
                  onClick={() => onToggleLocale(locale.code)}
                  className={`px-4 py-3 border-t border-black/[0.06] hover:bg-black/[0.02] cursor-pointer transition-colors grid grid-cols-[28px_1fr_1fr_120px_120px] gap-2 items-center ${
                    docRelevant ? 'bg-amber-500/[0.03]' : ''
                  }`}
                >
                  {/* Checkbox */}
                  <div
                    className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                      selected
                        ? 'bg-straker-600 border-straker-500'
                        : 'bg-black/[0.03] border-black/[0.12]'
                    }`}
                  >
                    {selected && <Check size={10} className="text-white" />}
                  </div>

                  {/* Locale name & code */}
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[13px] text-gray-700 truncate">
                      {locale.name}
                    </span>
                    <span className="text-[11px] text-gray-500 font-mono shrink-0">
                      {locale.code}
                    </span>
                    {docRelevant && (
                      <span className="text-[9px] text-amber-400/80 bg-amber-50 px-1.5 py-0.5 rounded shrink-0">
                        Doc-relevant
                      </span>
                    )}
                  </div>

                  {/* Family */}
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: family.color || '#64748b' }}
                    />
                    <span className="text-[12px] text-gray-500 truncate">
                      {family.label || family.name || '\u2014'}
                    </span>
                  </div>

                  {/* Complexity */}
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-black/[0.03] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${complexity * 100}%`,
                          backgroundColor: complexityColor,
                        }}
                      />
                    </div>
                    <span className="text-[11px] text-gray-500">
                      {Math.round(complexity * 100)}%
                    </span>
                  </div>

                  {/* Quality prediction */}
                  <div className="flex items-center gap-1 text-[12px]">
                    {locale.qualityPrediction ? (
                      <>
                        <span className="text-gray-500">
                          {locale.qualityPrediction.base}
                        </span>
                        <span className="text-gray-500">&rarr;</span>
                        <span className="text-emerald-400/70">
                          {locale.qualityPrediction.withEnhancements}
                        </span>
                      </>
                    ) : (
                      <span className="text-gray-500">&mdash;</span>
                    )}
                  </div>

                  {/* Flags */}
                  {locale.flags && locale.flags.length > 0 && (
                    <div className="col-span-full pl-7 flex flex-wrap gap-1 -mt-1 mb-0.5">
                      {locale.flags.map((flag) => (
                        <span
                          key={flag}
                          className="text-[9px] bg-black/[0.03] text-gray-500 px-1.5 py-0.5 rounded"
                        >
                          {flag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Selected locales strip */}
      {selectedLocales.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {selectedLocales.map((code) => {
            const locale = getLocaleByCode(code);
            return (
              <span
                key={code}
                className="bg-straker-50 text-straker-600 text-[11px] font-medium px-2.5 py-1 rounded-lg flex items-center gap-1.5"
              >
                {locale?.name || code}
                <button
                  onClick={() => onToggleLocale(code)}
                  className="hover:text-straker-300 transition-colors"
                >
                  <X size={10} />
                </button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
