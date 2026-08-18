import { useState } from 'react';
import { X, ChevronDown, CheckCircle2 } from 'lucide-react';
import { ENSEMBLE_TEMPLATES } from '../../data/campaignModel';

export default function BulkEditBar({ selectedCount, campaignLocales, onApply, onDismiss }) {
  const [ensembleId, setEnsembleId] = useState('');
  const [showEnsembleMenu, setShowEnsembleMenu] = useState(false);
  const [selectedLocales, setSelectedLocales] = useState([]);
  const [showLocaleMenu, setShowLocaleMenu] = useState(false);

  const canApply = ensembleId || selectedLocales.length > 0;

  const handleApply = () => {
    onApply({
      ensembleId: ensembleId || null,
      localeOverride: selectedLocales.length > 0 ? selectedLocales : null,
    });
    setEnsembleId('');
    setSelectedLocales([]);
  };

  const toggleLocale = (locale) => {
    setSelectedLocales(prev =>
      prev.includes(locale) ? prev.filter(l => l !== locale) : [...prev, locale]
    );
  };

  const selectedEnsemble = ENSEMBLE_TEMPLATES.find(t => t.id === ensembleId);

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 px-4 py-3 bg-gray-900 rounded-2xl shadow-2xl border border-white/10 text-white min-w-max">
      {/* Selection count */}
      <span className="text-[12px] font-medium text-gray-300 pr-2 border-r border-white/10">
        {selectedCount} selected
      </span>

      {/* Ensemble picker */}
      <div className="relative">
        <button
          type="button"
          onClick={() => { setShowEnsembleMenu(v => !v); setShowLocaleMenu(false); }}
          className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 transition-colors cursor-pointer"
        >
          <span>{selectedEnsemble ? selectedEnsemble.name : 'Set ensemble'}</span>
          <ChevronDown size={12} className="text-gray-400" />
        </button>
        {showEnsembleMenu && (
          <div className="absolute bottom-full mb-2 left-0 w-52 bg-gray-800 border border-white/10 rounded-xl shadow-xl overflow-hidden">
            {ENSEMBLE_TEMPLATES.map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => { setEnsembleId(t.id); setShowEnsembleMenu(false); }}
                className={`w-full text-left flex items-center gap-2 px-3 py-2.5 text-[12px] transition-colors cursor-pointer ${ensembleId === t.id ? 'bg-[#3D16FA]/20 text-[#3D16FA]' : 'text-gray-200 hover:bg-white/10'}`}
              >
                {t.name}
                {ensembleId === t.id && <CheckCircle2 size={12} className="ml-auto" />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Locale picker */}
      {campaignLocales.length > 0 && (
        <div className="relative">
          <button
            type="button"
            onClick={() => { setShowLocaleMenu(v => !v); setShowEnsembleMenu(false); }}
            className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 transition-colors cursor-pointer"
          >
            <span>{selectedLocales.length > 0 ? `${selectedLocales.length} locale${selectedLocales.length > 1 ? 's' : ''}` : 'Override locales'}</span>
            <ChevronDown size={12} className="text-gray-400" />
          </button>
          {showLocaleMenu && (
            <div className="absolute bottom-full mb-2 left-0 w-44 bg-gray-800 border border-white/10 rounded-xl shadow-xl overflow-hidden">
              {campaignLocales.map(locale => (
                <button
                  key={locale}
                  type="button"
                  onClick={() => toggleLocale(locale)}
                  className={`w-full text-left flex items-center gap-2 px-3 py-2.5 text-[12px] transition-colors cursor-pointer ${selectedLocales.includes(locale) ? 'bg-[#3D16FA]/20 text-[#3D16FA]' : 'text-gray-200 hover:bg-white/10'}`}
                >
                  {locale.toUpperCase()}
                  {selectedLocales.includes(locale) && <CheckCircle2 size={12} className="ml-auto" />}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Apply */}
      <button
        type="button"
        onClick={handleApply}
        disabled={!canApply}
        className={`text-[12px] font-semibold px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer ${canApply ? 'bg-[#3D16FA] text-white hover:bg-[#2E10C4]' : 'bg-white/10 text-gray-500 cursor-not-allowed'}`}
      >
        Apply
      </button>

      {/* Dismiss */}
      <button
        type="button"
        onClick={onDismiss}
        className="p-1 text-gray-400 hover:text-white transition-colors cursor-pointer"
        aria-label="Dismiss bulk edit"
      >
        <X size={14} />
      </button>
    </div>
  );
}
