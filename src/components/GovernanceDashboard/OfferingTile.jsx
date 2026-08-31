/**
 * Governance dashboard — compact offering tile (the rail under the strip).
 *
 * The bento cards pushed the queue — where actions live — below the
 * fold, so the offerings compressed into one row of tiles: icon, name,
 * one live number, and a one-line work state (amber when something
 * needs attention). Same data, sixth of the height; the tile is the
 * button into its module.
 */

import { Card } from '../HITLVendorWorkflow/shared'

export default function OfferingTile({
  icon,
  iconClass = 'bg-ocean/10 text-ocean',
  label,
  headline,
  headlineSuffix,
  attention,          // string | null
  allClear,
  onClick,
  ariaLabel,
}) {
  const Icon = icon
  return (
    <Card padding="p-0" className="h-full">
      <button
        onClick={() => onClick?.()}
        aria-label={ariaLabel || `Open ${label}`}
        title={attention || allClear}
        className="w-full h-full text-left cursor-pointer group px-3 py-2.5 flex items-start gap-2.5 hover:bg-pale/50 transition-colors rounded-lg"
      >
        <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${iconClass}`}>
          <Icon className="w-3.5 h-3.5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 min-w-0">
            <span className="block text-[11.5px] font-semibold text-ink truncate">{label}</span>
            {attention && <span className="w-1.5 h-1.5 rounded-full bg-[#FFB000] shrink-0" aria-hidden />}
          </span>
          <span className="block text-[15px] font-bold text-ink leading-tight tabular-nums" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {headline}
            {headlineSuffix && <span className="text-[10px] font-medium text-mist ml-1">{headlineSuffix}</span>}
          </span>
          <span className={`block text-[10px] truncate ${attention ? 'text-[#996800] font-medium' : 'text-mist'}`}>
            {attention || allClear}
          </span>
        </span>
      </button>
    </Card>
  )
}
