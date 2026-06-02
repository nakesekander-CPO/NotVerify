import { Hand } from 'lucide-react'

const MODE_META = {
  autonomous: { label: 'Autonomous', cls: 'bg-ink text-teal border-ink' },
  supervised: { label: 'Supervised', cls: 'bg-teal/15 text-teal border-teal/40' },
  paused:     { label: 'Paused',     cls: 'bg-amber/15 text-amber-deep border-amber/40' },
}

/**
 * Global system-mode pill + manual-override badge.
 * @param mode 'autonomous'|'supervised'|'paused'  @param manualOverride bool
 * @param canControl bool (else read-only)  @param onOpenControl fn
 */
export default function ModeIndicator({ mode, manualOverride, canControl, onOpenControl }) {
  const m = MODE_META[mode] || MODE_META.supervised
  return (
    <div className="flex items-center gap-2">
      <button
        type="button" onClick={canControl ? onOpenControl : undefined}
        className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[12.5px] font-bold border ${m.cls} ${canControl ? 'cursor-pointer' : 'cursor-default opacity-90'}`}
        title={canControl ? 'Open mode control' : 'Mode control requires Admin or Compliance'}
      >
        <span className="w-2 h-2 rounded-full bg-current" /> {m.label}
      </button>
      {manualOverride && (
        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-bold bg-white text-ocean border border-dashed border-ocean">
          <Hand className="w-3 h-3" /> Manual
        </span>
      )}
    </div>
  )
}
