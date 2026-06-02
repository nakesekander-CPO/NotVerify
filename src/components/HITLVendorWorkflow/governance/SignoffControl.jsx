import { Check, Ban } from 'lucide-react'
import { TIER_LABELS, canSignOff, tierForRole } from './capabilities'

/**
 * Sign-off action with pre-state + role check + designed blocked state.
 * @param resourceLabel string  @param preState string (counts/escalations)
 * @param currentRole roleId  @param requiredRoleLabel string (e.g. 'Compliance')
 * @param onApprove fn  @param onRequest fn (when blocked)
 */
export default function SignoffControl({ resourceLabel, preState, currentRole, requiredRoleLabel = 'Compliance', onApprove, onRequest }) {
  const allowed = canSignOff(currentRole)
  const tierLabel = TIER_LABELS[tierForRole(currentRole)]

  return (
    <div className="rounded-xl border border-rule bg-cream p-3.5 min-w-[280px]">
      <p className="text-[12px] text-slate mb-2.5 leading-relaxed">
        Signing off <span className="font-semibold text-ink">{resourceLabel}</span> — {preState}. This publishes to production.
      </p>
      {allowed ? (
        <>
          <button type="button" onClick={onApprove}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-[13.5px] font-bold bg-teal text-white cursor-pointer">
            <Check className="w-4 h-4" /> Approve &amp; publish
          </button>
          <p className="text-[11px] mt-2 text-mist">Role check: <span className="text-teal font-semibold">{tierLabel} ✓</span></p>
        </>
      ) : (
        <>
          <button type="button" disabled
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-[13.5px] font-bold bg-[#f1ede4] text-mist border border-rule cursor-not-allowed">
            <Check className="w-4 h-4" /> Approve &amp; publish
          </button>
          <div className="mt-2.5 flex gap-2 items-start bg-error/10 border border-error/30 rounded-lg px-2.5 py-2 text-[12px] text-error">
            <Ban className="w-4 h-4 shrink-0 mt-0.5" />
            <span><b>Sign-off requires role: {requiredRoleLabel}.</b> You have &ldquo;{tierLabel}&rdquo;.
              <button type="button" onClick={onRequest} className="underline font-semibold ml-1 cursor-pointer">Request sign-off</button>.</span>
          </div>
        </>
      )}
    </div>
  )
}
