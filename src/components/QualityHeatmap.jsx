import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  AlertTriangle,
  CheckCircle2,
  Info,
} from 'lucide-react';
import useReducedMotion from '../hooks/useReducedMotion';

/* ─── Helpers ─────────────────────────────────────────────────── */

function getLocaleLabel(locale) {
  const map = { ja: 'Japanese', de: 'German', zh: 'Chinese', fr: 'French', es: 'Spanish', ko: 'Korean', pt: 'Portuguese', it: 'Italian', nl: 'Dutch', ru: 'Russian' };
  return map[locale] ?? locale.toUpperCase();
}

function getLocaleShort(locale) {
  return locale.toUpperCase();
}

/**
 * Score → color classes
 * ≥90 = green, 75–89 = amber, <75 = red
 */
export function scoreTier(score) {
  if (score == null) return { bg: 'bg-gray-50', text: 'text-gray-300', border: 'border-gray-200/40', ring: 'ring-gray-200', label: 'Pending' };
  if (score >= 90)   return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200/60', ring: 'ring-emerald-400', label: 'Passing'  };
  if (score >= 75)   return { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200/60',   ring: 'ring-amber-400',   label: 'Warning'  };
  return              { bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200/60',     ring: 'ring-red-400',     label: 'At Risk'  };
}

function avg(nums) {
  const valid = nums.filter(n => n != null);
  if (!valid.length) return null;
  return Math.round(valid.reduce((a, b) => a + b, 0) / valid.length);
}

/* ─── Build matrix from campaign ─────────────────────────────── */

function buildMatrix(campaign, sortBy = 'risk') {
  const docs = campaign.documents ?? [];
  const localeSet = new Set();
  docs.forEach(doc => {
    const locales = doc.localeOverride ?? campaign.config?.locales ?? [];
    locales.forEach(l => localeSet.add(l));
  });
  const locales = [...localeSet];

  // Build raw matrix
  const indexed = docs.map((doc, origIdx) => {
    const row = locales.map(locale => {
      const result = doc.localeResults?.find(r => r.locale === locale);
      return {
        score: result?.qualityScore ?? null,
        status: result?.status ?? 'queued',
        docId: doc.id,
        locale,
        fileName: doc.fileName,
        detectedType: doc.detectedType,
      };
    });
    const rowAvg = avg(row.map(c => c.score));
    return { doc, row, rowAvg };
  });

  // Sort by risk: worst average first (nulls last)
  if (sortBy === 'risk') {
    indexed.sort((a, b) => {
      if (a.rowAvg == null && b.rowAvg == null) return 0;
      if (a.rowAvg == null) return 1;
      if (b.rowAvg == null) return -1;
      return a.rowAvg - b.rowAvg;
    });
  }

  return {
    docs: indexed.map(i => i.doc),
    locales,
    matrix: indexed.map(i => i.row),
    docAvgs: indexed.map(i => i.rowAvg),
  };
}

/* ─── Cell component ──────────────────────────────────────────── */

function HeatmapCell({ cell, onClick, isSelected, prefersReduced }) {
  const tier = scoreTier(cell.score);
  return (
    <motion.button
      type="button"
      onClick={() => onClick(cell)}
      whileHover={prefersReduced ? {} : { scale: 1.04 }}
      transition={{ duration: 0.12 }}
      className={`relative flex flex-col items-center justify-center rounded-lg border p-2 cursor-pointer transition-all min-h-[52px] ${tier.bg} ${tier.border} ${isSelected ? `ring-2 ${tier.ring}` : ''} hover:brightness-95`}
    >
      {cell.score != null ? (
        <>
          <span className={`text-[15px] font-bold tabular-nums leading-none ${tier.text}`}>{cell.score}</span>
          <span className={`text-[9px] font-medium mt-0.5 uppercase tracking-wide ${tier.text} opacity-70`}>{tier.label}</span>
        </>
      ) : (
        <span className="text-[11px] text-gray-300">&mdash;</span>
      )}
    </motion.button>
  );
}

/* ─── Cell popover (replaces sidebar panel) ──────────────────── */

function CellPopover({ cell, onClose, threshold, anchorRef }) {
  const tier = scoreTier(cell.score);
  const belowThreshold = cell.score != null && cell.score < threshold;
  const popoverRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (popoverRef.current && !popoverRef.current.contains(e.target) &&
          anchorRef?.current && !anchorRef.current.contains(e.target)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose, anchorRef]);

  return (
    <motion.div
      ref={popoverRef}
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.15 }}
      className="rounded-xl border border-black/[0.10] bg-white shadow-xl overflow-hidden mt-2"
    >
      <div className={`flex items-center justify-between gap-3 px-4 py-3 border-b border-black/[0.06] ${tier.bg}`}>
        <div>
          <p className="text-[12px] font-semibold text-gray-800 truncate max-w-[240px]">{cell.fileName}</p>
          <p className="text-[11px] text-gray-500">{getLocaleLabel(cell.locale)} · {cell.detectedType}</p>
        </div>
        <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 cursor-pointer transition-colors shrink-0">
          <X size={13} />
        </button>
      </div>

      <div className="px-4 py-3 space-y-3">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg border ${tier.bg} ${tier.border}`}>
            <span className={`text-[16px] font-bold tabular-nums ${tier.text}`}>{cell.score ?? '—'}</span>
          </div>
          <div>
            <p className={`text-[13px] font-semibold ${tier.text}`}>{tier.label}</p>
            {cell.score != null && (
              <p className={`text-[10px] ${belowThreshold ? 'text-amber-600' : 'text-emerald-600'}`}>
                {belowThreshold ? `Below ${threshold}% threshold` : `Meets threshold`}
              </p>
            )}
          </div>
        </div>

        {cell.score != null && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Dimensions</p>
            {[
              { name: 'Terminology',  score: Math.min(100, cell.score + Math.round(Math.random() * 6 - 3)) },
              { name: 'Compliance',   score: Math.min(100, cell.score + Math.round(Math.random() * 8 - 4)) },
              { name: 'Fluency',      score: Math.min(100, cell.score + Math.round(Math.random() * 6 - 3)) },
              { name: 'Cultural fit', score: Math.min(100, cell.score + Math.round(Math.random() * 10 - 5)) },
            ].map(dim => (
              <div key={dim.name} className="flex items-center gap-2">
                <span className="text-[11px] text-gray-500 w-20 shrink-0">{dim.name}</span>
                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${dim.score >= 90 ? 'bg-emerald-400' : dim.score >= 75 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width: `${dim.score}%` }} />
                </div>
                <span className={`text-[10px] font-medium tabular-nums w-6 text-right ${scoreTier(dim.score).text}`}>{dim.score}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ─── Main component ──────────────────────────────────────────── */

/**
 * @param {Object} props
 * @param {import('../data/campaignModel').Campaign} props.campaign
 * @param {number} [props.threshold]  — quality threshold for highlight (default 85)
 * @param {'risk'|'name'} [props.sortBy] — sort rows by risk (worst first) or name
 * @param {boolean} [props.compact] — hide sidebar panel, use popover instead
 */
export default function QualityHeatmap({ campaign, threshold = 85, sortBy = 'risk', compact = false }) {
  const prefersReduced = useReducedMotion();
  const [selectedCell, setSelectedCell] = useState(null);
  const [filterBand, setFilterBand] = useState('all');
  const tableRef = useRef(null);

  const { docs, locales, matrix, docAvgs } = buildMatrix(campaign, sortBy);

  if (docs.length === 0 || locales.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-black/[0.08] bg-gray-50 py-10">
        <p className="text-[13px] text-gray-400">No results yet.</p>
      </div>
    );
  }

  const localeAvgs = locales.map((_, li) =>
    avg(matrix.map(row => row[li]?.score))
  );

  const handleCellClick = (cell) => {
    if (cell.score == null) return;
    setSelectedCell(prev => (prev?.docId === cell.docId && prev?.locale === cell.locale) ? null : cell);
  };

  const filterBands = [
    { id: 'all', label: 'All' },
    { id: 'at-risk', label: 'At risk' },
    { id: 'warning', label: 'Warning' },
    { id: 'passing', label: 'Passing' },
  ];

  function cellMatchesBand(score) {
    if (filterBand === 'all' || score == null) return true;
    if (filterBand === 'at-risk') return score < 75;
    if (filterBand === 'warning') return score >= 75 && score < 90;
    if (filterBand === 'passing') return score >= 90;
    return true;
  }

  return (
    <div className="space-y-3">
      {/* Legend + filter */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 text-[11px] text-gray-500">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-emerald-300 inline-block" /> ≥90</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-amber-300 inline-block" /> 75–89</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-red-300 inline-block" /> &lt;75</span>
        </div>
        <div className="flex items-center gap-1">
          {filterBands.map(band => (
            <button
              key={band.id}
              type="button"
              onClick={() => setFilterBand(band.id)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors cursor-pointer ${
                filterBand === band.id
                  ? 'bg-gray-900 text-white'
                  : 'bg-white border border-black/[0.10] text-gray-500 hover:text-gray-800'
              }`}
            >
              {band.label}
            </button>
          ))}
        </div>
      </div>

      {/* Matrix */}
      <div ref={tableRef} className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="pb-2 pr-3 text-left w-48">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Document</span>
              </th>
              {locales.map((locale, li) => (
                <th key={locale} className="pb-2 px-1 text-center min-w-[68px]">
                  <div className="space-y-0.5">
                    <p className="text-[11px] font-semibold text-gray-700">{getLocaleShort(locale)}</p>
                    {localeAvgs[li] != null && <AvgBadge score={localeAvgs[li]} />}
                  </div>
                </th>
              ))}
              <th className="pb-2 pl-2 text-center min-w-[56px]">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Avg</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {docs.map((doc, di) => (
              <tr key={doc.id}>
                <td className="py-1 pr-3">
                  <p className="text-[12px] text-gray-700 font-medium truncate max-w-[176px]" title={doc.fileName}>
                    {doc.fileName.replace(/\.[^.]+$/, '')}
                  </p>
                  <p className="text-[10px] text-gray-400">{doc.detectedType} · {doc.pageCount}p</p>
                </td>
                {matrix[di].map((cell, li) => (
                  <td key={locales[li]} className="py-1 px-1">
                    <div className={`transition-opacity ${cellMatchesBand(cell.score) ? 'opacity-100' : 'opacity-20'}`}>
                      <HeatmapCell
                        cell={cell}
                        onClick={handleCellClick}
                        isSelected={selectedCell?.docId === cell.docId && selectedCell?.locale === cell.locale}
                        prefersReduced={prefersReduced}
                      />
                    </div>
                  </td>
                ))}
                <td className="py-1 pl-2 text-center">
                  {docAvgs[di] != null
                    ? <AvgBadge score={docAvgs[di]} large />
                    : <span className="text-[11px] text-gray-300">&mdash;</span>
                  }
                </td>
              </tr>
            ))}

            {/* Summary row */}
            <tr className="border-t border-black/[0.06]">
              <td className="pt-2 pr-3">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Locale avg</span>
              </td>
              {localeAvgs.map((score, li) => (
                <td key={locales[li]} className="pt-2 px-1 text-center">
                  {score != null ? <AvgBadge score={score} large /> : <span className="text-[11px] text-gray-300">&mdash;</span>}
                </td>
              ))}
              <td className="pt-2 pl-2 text-center">
                {avg(docAvgs.filter(Boolean)) != null && <AvgBadge score={avg(docAvgs.filter(Boolean))} large />}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Popover detail (compact mode) */}
      {compact && (
        <AnimatePresence mode="wait">
          {selectedCell && (
            <CellPopover
              key={`${selectedCell.docId}-${selectedCell.locale}`}
              cell={selectedCell}
              onClose={() => setSelectedCell(null)}
              threshold={threshold}
              anchorRef={tableRef}
            />
          )}
        </AnimatePresence>
      )}

      {/* Legacy side panel (non-compact mode, for backwards compat with QualityNarrative) */}
      {!compact && selectedCell && (
        <div className="mt-3">
          <CellPopover
            cell={selectedCell}
            onClose={() => setSelectedCell(null)}
            threshold={threshold}
            anchorRef={tableRef}
          />
        </div>
      )}
    </div>
  );
}

/* ─── Avg badge ───────────────────────────────────────────────── */

function AvgBadge({ score, large }) {
  const tier = scoreTier(score);
  return (
    <span className={`inline-flex items-center justify-center rounded-md px-1.5 py-0.5 tabular-nums font-bold ${tier.text} ${tier.bg} ${large ? 'text-[13px]' : 'text-[10px]'}`}>
      {score}
    </span>
  );
}
