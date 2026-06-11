/* Shared primitives for the Billing surface. */

export function Card({ children, className = '' }) {
  return <div className={`rounded-xl border border-black/[0.08] bg-white p-5 flex flex-col ${className}`}>{children}</div>
}

/* Toggle — track is shrink-0 and the label is a padded sibling, so
 * the first character can never be clipped by the knob or an
 * overflowing parent (fixes the "'equired" / "'nabled" defect). */
export function Toggle({ on, onChange, label }) {
  return (
    <button type="button" onClick={onChange} className="inline-flex items-center gap-2 cursor-pointer overflow-visible select-none">
      <span className={`relative shrink-0 rounded-full transition-colors ${on ? 'bg-[#009eda]' : 'bg-gray-200'}`} style={{ width: 32, height: 18 }}>
        <span
          className="absolute top-[2px] w-3.5 h-3.5 rounded-full bg-white shadow transition-transform"
          style={{ left: 2, transform: on ? 'translateX(14px)' : 'translateX(0)' }}
        />
      </span>
      {label && <span className="text-[11.5px] text-gray-700 whitespace-nowrap pl-0.5">{label}</span>}
    </button>
  )
}

export function Field({ label, children }) {
  return (
    <div className="overflow-visible">
      <label className="block text-[10.5px] font-medium text-gray-400 uppercase tracking-wider mb-1">{label}</label>
      {children}
    </div>
  )
}

export function StatusPill({ status }) {
  const map = {
    paid:      ['Paid', 'bg-emerald-100 text-emerald-700 border-emerald-200'],
    open:      ['Open', 'bg-[#009eda]/10 text-[#0089c4] border-[#009eda]/20'],
    past_due:  ['Past due', 'bg-red-50 text-red-700 border-red-200'],
    invoiced:  ['Invoiced', 'bg-[#009eda]/10 text-[#0089c4] border-[#009eda]/20'],
    requested: ['Requested', 'bg-violet-50 text-violet-700 border-violet-200'],
    completed: ['Completed', 'bg-emerald-100 text-emerald-700 border-emerald-200'],
    rejected:  ['Rejected', 'bg-red-50 text-red-700 border-red-200'],
  }
  const [label, tone] = map[status] || [status, 'bg-gray-100 text-gray-700 border-gray-200']
  return <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-semibold border whitespace-nowrap ${tone}`}>{label}</span>
}

export function fmtDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function fmtMoney(n) {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: n % 1 ? 2 : 0 })}`
}
