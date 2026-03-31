import { CheckCircle2, TrendingUp, Scale, Megaphone, Layers } from 'lucide-react';

const ICONS = { TrendingUp, Scale, Megaphone, Layers };

export default function EnsembleTemplateCard({ template, selected, onSelect }) {
  const Icon = ICONS[template.icon] ?? Layers;
  return (
    <button
      type="button"
      onClick={() => onSelect(template.id)}
      className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
        selected
          ? 'border-[#009eda] bg-[#009eda]/[0.04] ring-1 ring-[#009eda]/30'
          : 'border-black/[0.10] bg-white hover:border-[#009eda]/40 hover:bg-[#009eda]/[0.02]'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${selected ? 'bg-[#009eda]/10 text-[#009eda]' : 'bg-gray-100 text-gray-500'}`}>
          <Icon size={15} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className={`text-[13px] font-semibold leading-tight ${selected ? 'text-gray-900' : 'text-gray-800'}`}>{template.name}</p>
            {selected && <CheckCircle2 size={13} className="text-[#009eda] shrink-0" />}
          </div>
          <p className="text-[11px] text-gray-400 mt-0.5 leading-snug">{template.bestFor}</p>
        </div>
      </div>
    </button>
  );
}
