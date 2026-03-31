import { useState } from 'react';
import { AlertTriangle, ChevronDown, X, FileText } from 'lucide-react';
import {
  ENSEMBLE_TEMPLATES,
  checkEnsembleMismatch,
} from '../../data/campaignModel';

const TYPE_COLORS = {
  Financial: 'bg-blue-50 text-blue-700 border-blue-200/60',
  Legal:     'bg-violet-50 text-violet-700 border-violet-200/60',
  Marketing: 'bg-amber-50 text-amber-700 border-amber-200/60',
  Technical: 'bg-teal-50 text-teal-700 border-teal-200/60',
  General:   'bg-gray-50 text-gray-600 border-gray-200/60',
};

function LocaleChips({ locales, maxVisible = 3 }) {
  const visible = locales.slice(0, maxVisible);
  const overflow = locales.length - maxVisible;
  return (
    <div className="flex flex-wrap gap-1">
      {visible.map(l => (
        <span key={l} className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-600 border border-black/[0.06]">
          {l.toUpperCase()}
        </span>
      ))}
      {overflow > 0 && (
        <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-500">
          +{overflow}
        </span>
      )}
    </div>
  );
}

function EnsembleDropdown({ value, onChange, docType }) {
  const [open, setOpen] = useState(false);
  const current = ENSEMBLE_TEMPLATES.find(t => t.id === value);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1 text-[12px] text-gray-700 hover:text-gray-900 cursor-pointer transition-colors"
      >
        <span>{current?.name ?? value}</span>
        <ChevronDown size={11} className="text-gray-400" />
      </button>
      {open && (
        <div className="absolute top-full mt-1 left-0 z-20 w-48 bg-white border border-black/[0.10] rounded-xl shadow-lg overflow-hidden">
          {ENSEMBLE_TEMPLATES.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => { onChange(t.id); setOpen(false); }}
              className={`w-full text-left flex items-center gap-2 px-3 py-2 text-[12px] transition-colors cursor-pointer ${value === t.id ? 'bg-[#009eda]/[0.06] text-[#009eda] font-medium' : 'text-gray-700 hover:bg-black/[0.03]'}`}
            >
              {t.name}
              {checkEnsembleMismatch(t.id, docType) && (
                <AlertTriangle size={11} className="ml-auto text-amber-500 shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PreflightTable({
  documents,
  campaignLocales,
  onRemoveDocument,
  onUpdateDocument,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
}) {
  const allSelected = documents.length > 0 && selectedIds.length === documents.length;
  const someSelected = selectedIds.length > 0 && !allSelected;

  return (
    <div className="rounded-xl border border-black/[0.10] overflow-hidden bg-white">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-black/[0.08] bg-gray-50/60">
            <th className="w-10 px-3 py-2.5">
              <input
                type="checkbox"
                checked={allSelected}
                ref={el => { if (el) el.indeterminate = someSelected; }}
                onChange={onToggleSelectAll}
                className="cursor-pointer accent-[#009eda]"
              />
            </th>
            <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-gray-500 w-8">#</th>
            <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-gray-500">File</th>
            <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-gray-500">Type</th>
            <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-gray-500 text-right">Pages</th>
            <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-gray-500">Locales</th>
            <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-gray-500">Ensemble</th>
            <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-gray-500 w-8"></th>
          </tr>
        </thead>
        <tbody>
          {documents.map((doc, i) => {
            const mismatch = checkEnsembleMismatch(doc.ensembleId, doc.detectedType);
            const effectiveLocales = doc.localeOverride ?? campaignLocales;
            const isSelected = selectedIds.includes(doc.id);
            return (
              <tr
                key={doc.id}
                className={`border-b border-black/[0.05] last:border-0 transition-colors ${isSelected ? 'bg-[#009eda]/[0.03]' : 'hover:bg-black/[0.015]'}`}
              >
                {/* Checkbox */}
                <td className="px-3 py-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSelect(doc.id)}
                    className="cursor-pointer accent-[#009eda]"
                  />
                </td>

                {/* Row number */}
                <td className="px-3 py-3 text-[12px] text-gray-400">{i + 1}</td>

                {/* File name */}
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText size={13} className="text-gray-400 shrink-0" />
                    <span className="text-[13px] text-gray-800 font-medium truncate max-w-[220px]" title={doc.fileName}>
                      {doc.fileName}
                    </span>
                  </div>
                </td>

                {/* Detected type */}
                <td className="px-3 py-3">
                  <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium border ${TYPE_COLORS[doc.detectedType] ?? TYPE_COLORS.General}`}>
                    {doc.detectedType}
                  </span>
                </td>

                {/* Page count */}
                <td className="px-3 py-3 text-right">
                  <span className="text-[12px] text-gray-600 tabular-nums">{doc.pageCount}</span>
                </td>

                {/* Locales */}
                <td className="px-3 py-3">
                  <div className="flex items-center gap-1.5">
                    <LocaleChips locales={effectiveLocales} />
                    {doc.localeOverride && (
                      <span className="text-[10px] text-amber-600 font-medium">(override)</span>
                    )}
                  </div>
                </td>

                {/* Ensemble */}
                <td className="px-3 py-3">
                  <div className="flex items-center gap-1.5">
                    <EnsembleDropdown
                      value={doc.ensembleId}
                      docType={doc.detectedType}
                      onChange={(id) => onUpdateDocument(doc.id, { ensembleId: id })}
                    />
                    {mismatch && (
                      <div className="group relative">
                        <AlertTriangle size={13} className="text-amber-500 cursor-help shrink-0" />
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-30 w-64 px-3 py-2 bg-gray-900 text-white text-[11px] rounded-lg shadow-xl leading-snug">
                          {mismatch}
                        </div>
                      </div>
                    )}
                  </div>
                </td>

                {/* Remove */}
                <td className="px-3 py-3">
                  <button
                    type="button"
                    onClick={() => onRemoveDocument(doc.id)}
                    className="p-1 rounded text-gray-300 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                    aria-label={`Remove ${doc.fileName}`}
                  >
                    <X size={13} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
