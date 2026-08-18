/**
 * Billing panels — Plans/Contract, Top up, Usage & Ledger, Invoices,
 * Payments & receipts, and Admin. All panels consume the normalized
 * account view model; pricing comes from the single shared schedule
 * in billingModel (same function for card and invoice/PO rails).
 */

import { useMemo, useState } from 'react'
import {
  CheckCircle2, AlertTriangle, Lock, Download, FileText, Receipt,
  Sparkles, Building2, Phone, ShieldCheck,
} from 'lucide-react'
import {
  creditPackages, priceFor, rateFor,
  reconciliationSummary, validateAdjustment, buildAdjustmentEntry,
  ADJUSTMENT_REASON_CODES, CONSUMPTION_POLICY_TEXT, planCtaModel,
  trustPriceFor, purchaseLineCost, purchaseRequestTotal, validatePurchaseRequest,
  buildPurchaseRequest, normalizeRequest, purchaseRequestFulfillment,
} from '../../services/billing/billingModel'
import { Card, Toggle, Field, StatusPill, fmtDate, fmtMoney } from './BillingShared'
import { useToast } from '../ToastProvider'
import { downloadCsv, downloadHtml } from '../../utils/demoFiles'

/* ── Plans / Contract ─────────────────────────────────────────── */

const PUBLIC_PLANS = {
  standard:   { name: 'Standard', price: 20,  blurb: 'Fast AI intelligence for everyday work.', features: ['1,000 Intelligence Credits / month', 'Standard AI checks'] },
  plus:       { name: 'Plus',     price: 35,  blurb: 'More credits and Specialty Verification.', features: ['2,000 Intelligence Credits / month', 'AI Agent Specialty Verification'] },
  pro_team:   { name: 'Team',     price: 100, blurb: 'Full platform with Trust Credits and priority.', features: ['5,000 Intelligence Credits / month', 'All AI features', '2 Trust Credits', 'Priority & rollovers'] },
  enterprise: { name: 'Enterprise', price: null, blurb: 'Contract pricing, governance, and scale.', features: ['Committed credit pool', 'Invoice / PO / ACH / net terms', 'SSO + advanced security', 'Dedicated support'] },
}

/* CTA hierarchy comes from planCtaModel (tested): current plan is a
 * state, exactly one primary (the recommended next step up), and
 * downgrades are always outline/neutral — never the loudest button. */
export function PlansPanel({ account }) {
  const { addToast } = useToast()
  if (account.tier === 'enterprise') return <ContractPanel account={account} />
  const ctas = planCtaModel(account.tier, { downgradePolicy: account.downgradePolicy })
  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-[13px] font-semibold text-gray-900">Plans</h4>
        <p className="text-[12px] text-gray-500 mt-0.5">Every plan includes a monthly credit grant. Top up anytime.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {ctas.map(cta => {
          const p = PUBLIC_PLANS[cta.planId]
          const isCurrent = cta.emphasis === 'current'
          return (
            <div key={cta.planId} aria-label={cta.ariaLabel}
              className={`rounded-xl bg-white p-5 flex flex-col gap-3 relative ${isCurrent ? 'border-2 border-[#3D16FA]' : 'border border-black/[0.12]'}`}>
              {isCurrent && <span className="absolute -top-3 left-4 text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#3D16FA] text-white">Current plan</span>}
              <div>
                <p className="text-[14px] font-bold text-gray-900">{p.name}</p>
                <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">{p.blurb}</p>
              </div>
              {p.price != null
                ? <p><span className="text-[24px] font-bold text-gray-900">${p.price}</span><span className="text-[12px] text-gray-500 ml-1">/ month</span></p>
                : <p className="text-[18px] font-bold text-gray-900">Contract pricing</p>}
              <ul className="space-y-1.5 flex-1">
                {p.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-[12px] text-gray-700">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />{f}
                  </li>
                ))}
              </ul>
              {isCurrent ? (
                <div aria-label={cta.ariaLabel} className="mt-auto px-4 py-2.5 rounded-lg text-center text-[13px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">Current plan</div>
              ) : cta.emphasis === 'primary' ? (
                <button onClick={() => addToast(`${cta.label} — request sent to your account team`, 'success')} aria-label={cta.ariaLabel} className="mt-auto w-full px-4 py-2.5 rounded-lg text-[13px] font-semibold bg-[#3D16FA] text-white hover:bg-[#2E10C4] cursor-pointer">
                  {cta.label}
                </button>
              ) : (
                <button onClick={() => addToast(`${cta.label} — request sent to your account team`, 'success')} aria-label={cta.ariaLabel} className="mt-auto w-full px-4 py-2.5 rounded-lg text-[13px] font-medium border border-black/[0.15] text-gray-600 hover:bg-black/[0.04] cursor-pointer">
                  {cta.label}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* Enterprise — contract view; never pushes downgrade CTAs. */
function ContractPanel({ account }) {
  const { addToast } = useToast()
  const w = account.creditWallet
  const isInvoice = account.paymentRail === 'invoice_or_po'
  const committed = w.plan.grantThisCycle * 12
  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center gap-2 mb-1">
          <Building2 className="w-4 h-4 text-[#3D16FA]" />
          <h4 className="text-[13px] font-semibold text-gray-900">Enterprise contract</h4>
          <span className="ml-auto text-[10.5px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Active</span>
        </div>
        <p className="text-[11px] text-gray-400 ml-6 mb-4">Term Jan 1 – Dec 31, 2026 · {isInvoice ? `billed by invoice · ${account.netTerms}` : 'billed by ACH'}</p>
        <div className="grid grid-cols-4 gap-4">
          <Metric label="Annual commitment" value={committed.toLocaleString()} sub="credits" />
          <Metric label="Granted to date" value={w.plan.grantThisCycle.toLocaleString()} sub="this cycle" />
          <Metric label="Used this cycle" value={w.plan.usedThisCycle.toLocaleString()} sub={`${Math.round((w.plan.usedThisCycle / w.plan.grantThisCycle) * 100)}% of grant`} />
          <Metric label="Available now" value={w.availableTotal.toLocaleString()} sub="all buckets" />
        </div>
        <div className="mt-4 pt-4 border-t border-black/[0.06] flex items-center gap-2 flex-wrap">
          <button onClick={() => addToast('Message sent — your account team will reach out within one business day', 'success')} aria-label="Contact account team about Enterprise plan" className="px-4 py-2 rounded-lg bg-[#3D16FA] text-white text-[12.5px] font-semibold hover:bg-[#2E10C4] cursor-pointer inline-flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5" /> Contact account team
          </button>
          <button onClick={() => downloadHtml('arbitr-enterprise-contract.html', 'Enterprise Agreement — Meridian Capital', '<p>Master service agreement summary.</p><table><tr><th>Term</th><td>12 months, renews Jul 1</td></tr><tr><th>Billing</th><td>Invoice / PO, Net 30</td></tr><tr><th>Credits</th><td>Intelligence and Trust Credits per order form</td></tr></table>')} className="px-4 py-2 rounded-lg border border-black/[0.12] text-[12.5px] font-medium text-gray-700 hover:bg-black/[0.03] cursor-pointer">View contract</button>
          <button onClick={() => addToast('Plan comparison is on the Plans tab', 'info')} className="px-4 py-2 rounded-lg border border-black/[0.12] text-[12.5px] font-medium text-gray-700 hover:bg-black/[0.03] cursor-pointer">Compare plans</button>
          {account.downgradePolicy === 'request_only' && (
            <button onClick={() => addToast('Plan-change request sent for account-team review', 'success')} aria-label="Request a plan change — reviewed by your account team" className="px-4 py-2 rounded-lg border border-black/[0.12] text-[12.5px] font-medium text-gray-600 hover:bg-black/[0.03] cursor-pointer">
              Request plan change
            </button>
          )}
        </div>
        <p className="text-[11px] text-gray-400 mt-3">
          Overage policy: {account.overagePolicy === 'invoiceable_overage' ? 'usage beyond commitment is invoiced at your contract rate.' : 'usage beyond the grant draws from top-up credits.'}{' '}
          {account.downgradePolicy === 'not_allowed'
            ? 'Plan changes are contract-managed — contact your account team.'
            : 'Plan-change requests are reviewed by your account team before taking effect.'}
        </p>
      </Card>
    </div>
  )
}

function Metric({ label, value, sub }) {
  return (
    <div>
      <p className="text-[10.5px] uppercase tracking-wider text-gray-400">{label}</p>
      <p className="text-[20px] font-bold text-gray-900 mt-0.5" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{value}</p>
      <p className="text-[10.5px] text-gray-400">{sub}</p>
    </div>
  )
}

/* ── Top up ───────────────────────────────────────────────────── */

export function TopUpPanel({ account, appendLedger, appendTrustLedger, appendReceipt }) {
  const { addToast } = useToast()
  const isCard = account.paymentRail === 'card_or_ach'
  const trustAvailable = account.trustCredits?.grantThisCycle > 0 || account.trustCredits?.available > 0
  /* Invoice/PO rail uses ONE combined order card (IC + Trust on a
   * single invoice). Card/ACH rail keeps separate instant purchases —
   * there is no invoice to combine onto. */
  if (!isCard) return <InvoiceTopUp account={account} appendLedger={appendLedger} appendTrustLedger={appendTrustLedger} />
  return (
    <div className="space-y-6">
      <CardTopUp account={account} appendLedger={appendLedger} appendReceipt={appendReceipt} />
      {trustAvailable && <TrustCardTopUp account={account} appendTrustLedger={appendTrustLedger} appendReceipt={appendReceipt} />}
    </div>
  )
}

const TRUST_OPTIONS = [
  { credits: 1, label: '1 credit' },
  { credits: 3, label: '3 credits', bundle: true },
  { credits: 5, label: '5 credits' },
  { credits: 10, label: '10 credits' },
]

function TrustHeader({ account, blurb }) {
  return (
    <>
      <div className="flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-[#3D16FA]" />
        <h4 className="text-[13px] font-semibold text-gray-900">Trust Credits</h4>
        <span className="ml-auto text-[11px] text-gray-400 tabular-nums">
          {account.trustCredits.used} of {account.trustCredits.grantThisCycle} used · {account.trustCredits.available} available
        </span>
      </div>
      <p className="text-[12px] text-gray-500 mt-0.5 mb-3">{blurb}</p>
    </>
  )
}

/* Trust · card / ACH — instant purchase, writes the trust ledger and
 * a receipt, exactly like an Intelligence Credit card top-up. */
function TrustCardTopUp({ account, appendTrustLedger, appendReceipt }) {
  const [sel, setSel] = useState(0)
  const [done, setDone] = useState(null)
  const opt = TRUST_OPTIONS[sel]
  const price = trustPriceFor(opt.credits)
  const buy = () => {
    const today = new Date().toISOString().slice(0, 10)
    const ref = `RCP-T${Math.floor(Math.random() * 9000) + 1000}`
    appendTrustLedger?.({ date: today, event: 'top_up', delta: opt.credits, source: 'Trust Credit top-up — card', ref })
    appendReceipt?.({ id: ref, date: today, type: 'Trust Credit top-up', method: 'Card •••• 4242', amount: price, status: 'paid', creditType: 'trust' })
    setDone(`${opt.credits} Trust Credit${opt.credits === 1 ? '' : 's'} added — ${fmtMoney(price)}. A receipt has been emailed and added to Payments & receipts.`)
    setTimeout(() => setDone(null), 3500)
  }
  return (
    <Card>
      <TrustHeader account={account} blurb="Trust Credits cover trusted human review and sign-off — a separate balance from Intelligence Credits, with their own pricing ($38/credit, 3 for $110). Purchases are instant and a receipt is emailed." />
      <div className="flex items-center gap-2 flex-wrap">
        {TRUST_OPTIONS.map((o, i) => (
          <button key={o.credits} onClick={() => setSel(i)}
            className={`text-left rounded-lg border px-3 py-2 cursor-pointer transition-colors ${sel === i ? 'border-[#3D16FA] bg-[#3D16FA]/5' : 'border-black/[0.12] hover:border-black/[0.25]'}`}>
            <span className="text-[12.5px] font-semibold text-gray-900">{o.label} — {fmtMoney(trustPriceFor(o.credits))}</span>
            {o.bundle && <span className="ml-1.5 text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold">Bundle</span>}
          </button>
        ))}
        <button onClick={buy} className="ml-auto px-4 py-2 rounded-lg bg-[#3D16FA] text-white text-[12.5px] font-semibold hover:bg-[#2E10C4] cursor-pointer">
          Pay {fmtMoney(price)}
        </button>
      </div>
      {done && <p className="mt-3 text-[12px] text-emerald-700 inline-flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" />{done}</p>}
    </Card>
  )
}

function PackageGrid({ selected, onSelect }) {
  const pkgs = creditPackages()
  return (
    <div className="grid grid-cols-5 gap-2">
      {pkgs.map((p, i) => (
        <button key={p.credits} onClick={() => onSelect(i)}
          className={`text-left rounded-lg border p-3 cursor-pointer transition-colors ${selected === i ? 'border-[#3D16FA] bg-[#3D16FA]/5' : 'border-black/[0.12] hover:border-black/[0.25]'}`}>
          <div className="flex items-center justify-between gap-1 min-h-[16px]">
            <span className="text-[10px] text-gray-400 tabular-nums">${p.rate.toFixed(4)}/cr</span>
            {p.bestValue && <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-[#3D16FA] text-white font-semibold">Best value</span>}
            {!p.bestValue && p.save > 0 && <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold">−{p.save}%</span>}
          </div>
          <p className="text-[16px] font-bold text-gray-900 mt-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{p.credits.toLocaleString()}</p>
          <p className="text-[10.5px] text-gray-500">credits · {fmtMoney(p.price)}</p>
        </button>
      ))}
    </div>
  )
}

function CardTopUp({ account, appendLedger, appendReceipt }) {
  const pkgs = creditPackages()
  const [sel, setSel] = useState(1)
  const [method, setMethod] = useState('card')
  const [done, setDone] = useState(null)
  const [auto, setAuto] = useState({ enabled: account.autoTopUpEnabled, threshold: 500, pkgIdx: 2 })
  const pkg = pkgs[sel]

  const buy = () => {
    const today = new Date().toISOString().slice(0, 10)
    const ref = `RCP-${Math.floor(Math.random() * 9000) + 1000}`
    appendLedger({
      id: `tp-${Date.now()}`, date: today,
      event: 'top_up', source: `Top-up — ${method === 'card' ? 'card' : 'ACH'}`,
      bucket: 'top_up', delta: pkg.credits, ref, actor: 'You',
    })
    appendReceipt?.({ id: ref, date: today, type: 'Credit top-up', method: method === 'card' ? 'Card •••• 4242' : 'ACH transfer', amount: pkg.price, status: 'paid', creditType: 'intelligence' })
    setDone(`${pkg.credits.toLocaleString()} credits added. A receipt has been emailed to you.`)
    setTimeout(() => setDone(null), 2500)
  }

  return (
    <div className="space-y-6">
      <Card>
        <h4 className="text-[13px] font-semibold text-gray-900">Buy credits</h4>
        <p className="text-[12px] text-gray-500 mt-0.5 mb-4">Credits are added immediately and a receipt is emailed. Every package shows its effective per-credit rate.</p>
        <PackageGrid selected={sel} onSelect={setSel} />
        <div className="flex flex-wrap gap-2 mt-4">
          {[account.cardTopUpsEnabled && ['card', 'Card — Visa •••• 4242'], account.achEnabled && ['ach', 'ACH — instant credit, 2–3 day settlement']].filter(Boolean).map(([id, label]) => (
            <button key={id} onClick={() => setMethod(id)}
              className={`px-3 py-2 rounded-lg border text-[12px] cursor-pointer ${method === id ? 'border-[#3D16FA] bg-[#3D16FA]/5 text-gray-900' : 'border-black/[0.12] text-gray-600 hover:border-black/[0.25]'}`}>
              {label}
            </button>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between rounded-lg border border-black/[0.08] bg-gray-50/60 p-3">
          <div>
            <p className="text-[16px] font-bold text-gray-900">{pkg.credits.toLocaleString()} credits · {fmtMoney(pkg.price)}</p>
            <p className="text-[10.5px] text-gray-400">${pkg.rate.toFixed(4)} per credit{pkg.save > 0 ? ` · ${pkg.save}% below baseline` : ' · baseline rate'}</p>
          </div>
          <button onClick={buy} className="px-5 py-2.5 rounded-lg bg-[#3D16FA] text-white text-[13px] font-semibold hover:bg-[#2E10C4] cursor-pointer">
            Pay {fmtMoney(pkg.price)}
          </button>
        </div>
        {done && <p className="mt-3 text-[12px] text-emerald-700 inline-flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" />{done}</p>}
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#3D16FA]" />
            <h4 className="text-[13px] font-semibold text-gray-900">Auto top-up</h4>
          </div>
          <Toggle on={auto.enabled} onChange={() => setAuto(s => ({ ...s, enabled: !s.enabled }))} label={auto.enabled ? 'Enabled' : 'Off'} />
        </div>
        <p className="text-[12px] text-gray-500 mt-1">When your balance drops below the threshold, we charge your payment method and add credits automatically.</p>
        {auto.enabled && (
          <div className="mt-3 grid grid-cols-2 gap-4">
            <Field label="Threshold (credits)">
              <select value={auto.threshold} onChange={e => setAuto(s => ({ ...s, threshold: Number(e.target.value) }))} className="w-full px-2.5 py-1.5 rounded-md border border-black/[0.12] text-[12px] bg-white">
                {[250, 500, 1000, 2000].map(v => <option key={v} value={v}>{v.toLocaleString()} credits</option>)}
              </select>
            </Field>
            <Field label="Top-up package">
              <select value={auto.pkgIdx} onChange={e => setAuto(s => ({ ...s, pkgIdx: Number(e.target.value) }))} className="w-full px-2.5 py-1.5 rounded-md border border-black/[0.12] text-[12px] bg-white">
                {pkgs.map((p, i) => <option key={p.credits} value={i}>{p.credits.toLocaleString()} credits — {fmtMoney(p.price)}</option>)}
              </select>
            </Field>
          </div>
        )}
      </Card>
    </div>
  )
}

/* Combined invoice/PO order — Intelligence and/or Trust credits on a
 * single invoice. Each line is priced on its own schedule; one PO,
 * one combined total, one tracked request. */
const IC_AMOUNTS = [0, 5000, 10000, 25000, 50000, 100000]
const TC_AMOUNTS = [0, 3, 5, 10, 25, 50]

function requestLineLabel(item) {
  return item.type === 'trust'
    ? `${item.credits} Trust Credits`
    : `${item.credits.toLocaleString()} IC`
}

function InvoiceTopUp({ account, appendLedger, appendTrustLedger }) {
  const trustAvailable = account.trustCredits?.grantThisCycle > 0 || account.trustCredits?.available > 0
  const [ic, setIc] = useState(25000)
  const [tc, setTc] = useState(trustAvailable ? 5 : 0)
  const [po, setPo] = useState(account.poNumber || '')
  const [added, setAdded] = useState([])
  const [statusOverrides, setStatusOverrides] = useState({}) // id → status (after grant)
  const [done, setDone] = useState(null)

  const items = [
    ic > 0 && { type: 'intelligence', credits: ic },
    tc > 0 && { type: 'trust', credits: tc },
  ].filter(Boolean)
  const total = purchaseRequestTotal(items)
  const validation = validatePurchaseRequest({ items, po }, account)

  /* One unified, date-sorted list: legacy IC + Trust single-currency
   * requests are normalized to line items alongside combined orders. */
  const requests = [
    ...added,
    ...(account.purchaseRequests || []),
    ...(account.topUpRequests || []).map(r => normalizeRequest(r, 'intelligence')),
    ...(account.trustTopUpRequests || []).map(r => normalizeRequest(r, 'trust')),
  ]
    .map(r => statusOverrides[r.id] ? { ...r, status: statusOverrides[r.id] } : r)
    .sort((a, b) => (a.date < b.date ? 1 : -1))

  const submit = () => {
    if (!validation.ok) return
    const req = buildPurchaseRequest({ items, po, account })
    setAdded(r => [req, ...r])
    const summary = req.items.map(requestLineLabel).join(' + ')
    setDone(`Request ${req.id} submitted — ${summary} on one invoice (${fmtMoney(req.cost)}) under ${account.netTerms}. ${req.notes}.`)
    setTimeout(() => setDone(null), 4000)
  }

  /* Mark a request's invoice paid → fulfil each line to its OWN
   * wallet: Intelligence → Intelligence ledger, Trust → Trust
   * ledger. They never cross. */
  const grant = (req) => {
    const { icRows, trustRows } = purchaseRequestFulfillment(req)
    icRows.forEach(row => appendLedger?.(row))
    trustRows.forEach(row => appendTrustLedger?.(row))
    setStatusOverrides(s => ({ ...s, [req.id]: 'completed' }))
    const parts = []
    if (icRows.length) parts.push(`${icRows.reduce((s, r) => s + r.delta, 0).toLocaleString()} IC → Intelligence wallet`)
    if (trustRows.length) parts.push(`${trustRows.reduce((s, r) => s + r.delta, 0)} → Trust wallet`)
    setDone(`Invoice ${req.id} marked paid — ${parts.join(' · ')}.`)
    setTimeout(() => setDone(null), 4000)
  }

  return (
    <div className="space-y-6">
      <Card>
        <h4 className="text-[13px] font-semibold text-gray-900">Order credits</h4>
        <p className="text-[12px] text-gray-500 mt-0.5 mb-4">
          Order Intelligence Credits, Trust Credits, or both on a single {account.poRequired ? 'PO-backed invoice' : 'invoice'} under {account.netTerms}. Each line is priced on its own schedule; you'll see one combined total before you submit.
        </p>

        {/* Line items */}
        <div className="space-y-2.5">
          <div className="grid grid-cols-[120px_1fr_auto] gap-3 items-center">
            <span className="text-[12px] font-medium text-gray-700">Intelligence</span>
            <select value={ic} onChange={e => setIc(Number(e.target.value))} className="w-full px-2.5 py-1.5 rounded-md border border-black/[0.12] text-[12px] bg-white">
              {IC_AMOUNTS.map(v => (
                <option key={v} value={v}>{v === 0 ? 'None' : `${v.toLocaleString()} credits — ${fmtMoney(priceFor(v))} ($${rateFor(v).toFixed(4)}/cr)`}</option>
              ))}
            </select>
            <span className="text-[12px] tabular-nums text-gray-900 w-20 text-right">{ic > 0 ? fmtMoney(priceFor(ic)) : '—'}</span>
          </div>
          {trustAvailable && (
            <div className="grid grid-cols-[120px_1fr_auto] gap-3 items-center">
              <span className="text-[12px] font-medium text-gray-700 inline-flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5 text-[#3D16FA]" /> Trust</span>
              <select value={tc} onChange={e => setTc(Number(e.target.value))} className="w-full px-2.5 py-1.5 rounded-md border border-black/[0.12] text-[12px] bg-white">
                {TC_AMOUNTS.map(v => (
                  <option key={v} value={v}>{v === 0 ? 'None' : `${v} credits — ${fmtMoney(trustPriceFor(v))}${v === 3 ? ' (bundle)' : ''}`}</option>
                ))}
              </select>
              <span className="text-[12px] tabular-nums text-gray-900 w-20 text-right">{tc > 0 ? fmtMoney(trustPriceFor(tc)) : '—'}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-[1fr_1fr] gap-4 mt-4">
          <Field label={`PO number (${account.poRequired ? 'required' : 'optional'})`}>
            <input value={po} onChange={e => setPo(e.target.value)} placeholder="e.g. PO-2026-022" className="w-full px-2.5 py-1.5 rounded-md border border-black/[0.12] text-[12px] bg-white" />
            <p className="text-[10px] text-gray-400 mt-1">
              {account.poRequired
                ? 'Your billing admin requires a PO on every order (Admin → Purchase orders).'
                : 'Optional for this account — your billing admin can require it under Admin → Purchase orders.'}
            </p>
          </Field>
        </div>

        {/* Combined commitment */}
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2 text-[11.5px] text-amber-800">
          Submitting creates a purchase commitment: arbitr will issue <span className="font-semibold">one invoice</span> for{' '}
          <span className="font-semibold">{fmtMoney(total)}</span>
          {items.length > 0 && <> ({items.map(requestLineLabel).join(' + ')})</>}
          {po.trim() ? <> against <span className="font-semibold">{po.trim()}</span></> : null} under {account.netTerms}.
          Credits are {account.grantPolicy === 'on-finalization' ? 'granted when the invoice is finalized' : 'granted when the invoice is paid'}; the request is binding once invoiced.
        </div>

        {/* Itemized order summary — one invoice, separate lines */}
        <div className="mt-3 rounded-lg border border-black/[0.08] bg-gray-50/60 p-3">
          {items.length === 0 ? (
            <p className="text-[13px] text-gray-500">No items selected.</p>
          ) : (
            <ul className="space-y-1 mb-2">
              {items.map(it => (
                <li key={it.type} className="flex items-center justify-between text-[12px]">
                  <span className="inline-flex items-center gap-1.5 text-gray-700">
                    {it.type === 'trust' ? <ShieldCheck className="w-3.5 h-3.5 text-[#3D16FA]" /> : <Sparkles className="w-3.5 h-3.5 text-gray-400" />}
                    {requestLineLabel(it)}
                    <span className="text-[10px] text-gray-400">→ {it.type === 'trust' ? 'Trust wallet' : 'Intelligence wallet'}</span>
                  </span>
                  <span className="tabular-nums text-gray-900">{fmtMoney(purchaseLineCost(it.type, it.credits))}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="flex items-center justify-between border-t border-black/[0.08] pt-2">
            <div>
              <p className="text-[15px] font-bold text-gray-900">Invoice total · {fmtMoney(total)}</p>
              <p className="text-[10.5px] text-gray-400">One invoice · {account.netTerms}</p>
            </div>
            <div className="flex items-center gap-2">
            <button onClick={() => addToast('Message sent to sales', 'success')} className="px-3 py-2 rounded-lg border border-black/[0.12] text-[12px] font-medium text-gray-600 hover:bg-black/[0.03] cursor-pointer">Contact sales</button>
            {account.cardTopUpsEnabled && (
              <button onClick={() => addToast('One-time card order started — this stays a separate line item from your invoice rail', 'info')} className="px-3 py-2 rounded-lg border border-black/[0.12] text-[12px] font-medium text-gray-600 hover:bg-black/[0.03] cursor-pointer">Pay by card for this one-time order</button>
            )}
            <button onClick={submit} disabled={!validation.ok}
              title={validation.ok ? undefined : validation.errors.join(' ')}
              className="px-4 py-2.5 rounded-lg bg-[#3D16FA] text-white text-[13px] font-semibold hover:bg-[#2E10C4] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
              Submit purchase request
            </button>
            </div>
          </div>
        </div>
        {done && <p className="mt-3 text-[12px] text-[#2E10C4] inline-flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 shrink-0" />{done}</p>}
      </Card>

      <Card>
        <h4 className="text-[13px] font-semibold text-gray-900 mb-3">Purchase requests</h4>
        <ul className="divide-y divide-black/[0.06]">
          {requests.map(r => (
            <li key={r.id} className="py-3 text-[12px]">
              <div className="grid grid-cols-[1fr_auto_auto] gap-4 items-start">
                <div className="min-w-0">
                  <p className="text-gray-900 font-medium">
                    {r.id}
                    {r.items.length > 1 && <span className="ml-1.5 text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-[#3D16FA]/10 text-[#2E10C4] border border-[#3D16FA]/20 font-semibold">Combined</span>}
                  </p>
                  {/* Separate, itemized line items per credit type */}
                  <ul className="mt-1 space-y-0.5">
                    {r.items.map(it => (
                      <li key={it.type} className="flex items-center gap-1.5 text-[11.5px] text-gray-600">
                        {it.type === 'trust'
                          ? <ShieldCheck className="w-3 h-3 text-[#3D16FA] shrink-0" />
                          : <Sparkles className="w-3 h-3 text-gray-400 shrink-0" />}
                        <span className="text-gray-800">{requestLineLabel(it)}</span>
                        <span className="text-gray-400">→ {it.type === 'trust' ? 'Trust wallet' : 'Intelligence wallet'}</span>
                        <span className="ml-auto tabular-nums text-gray-500">{fmtMoney(it.cost ?? purchaseLineCost(it.type, it.credits))}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-[10.5px] text-gray-400 mt-1 truncate">{fmtDate(r.date)} · {r.po || 'No PO'} · {r.notes}</p>
                </div>
                <span className="text-right shrink-0">
                  <span className="text-gray-900 font-semibold tabular-nums block">{fmtMoney(r.cost)}</span>
                  <span className="text-[10px] text-gray-400 block">one invoice · {account.netTerms}</span>
                </span>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <StatusPill status={r.status} />
                  {r.status !== 'completed' && (
                    <button onClick={() => grant(r)}
                      className="text-[10.5px] text-[#3D16FA] hover:text-[#2E10C4] cursor-pointer whitespace-nowrap font-medium">
                      Mark paid &amp; grant →
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
        <p className="text-[10.5px] text-gray-400 mt-3">
          On payment, each line is fulfilled to its own wallet — Intelligence to the Intelligence balance, Trust to the Trust balance.
        </p>
      </Card>
    </div>
  )
}

/* ── Usage & Ledger ──────────────────────────────────────────── */

const BUCKET_LABEL = { plan: 'Plan', top_up: 'Top-up', promotional: 'Promotional', adjustment: 'Adjustments', legacy: 'Legacy' }
const EVENT_LABEL = { grant: 'Grant', usage: 'Usage', top_up: 'Top-up', adjustment: 'Adjustment', migration: 'Migration', promo_grant: 'Promo grant', expiration: 'Expired', reversal: 'Reversal' }

export function UsageLedgerPanel({ account, filter, setFilter }) {
  const ledger = account.ledger
  const rows = filter === 'all' ? ledger : ledger.filter(r => r.bucket === filter)
  const recon = useMemo(() => reconciliationSummary(ledger), [ledger])
  const w = account.creditWallet

  return (
    <div className="space-y-4">
      {/* Reconciliation summary — ties exactly to the Overview headline */}
      <Card>
        <h4 className="text-[13px] font-semibold text-gray-900 mb-3">Reconciliation · Intelligence Credits</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-1.5 text-[12px]">
          <ReconRow label="Plan grants" value={recon.planGrants} />
          <ReconRow label="Top-ups" value={recon.topUps} />
          <ReconRow label="Adjustments" value={recon.adjustments} />
          <ReconRow label="Legacy migrations" value={recon.legacyMigrations} />
          <ReconRow label="Promotional grants" value={recon.promotionalGrants} />
          <ReconRow label="Usage" value={recon.usage} />
          <ReconRow label="Expirations" value={recon.expirations} />
          <ReconRow label="Reversals / refunds" value={recon.reversals} />
        </div>
        <div className="mt-3 pt-3 border-t border-black/[0.08] flex items-center justify-between text-[13px]">
          <span className="font-semibold text-gray-900">Current available credits</span>
          <span className="font-bold text-gray-900 tabular-nums">{recon.total.toLocaleString()}</span>
        </div>
        <p className="text-[10.5px] text-gray-400 mt-1">Matches the wallet headline on Overview ({w.availableTotal.toLocaleString()}).</p>
      </Card>

      <div className="flex items-center justify-between">
        <h4 className="text-[13px] font-semibold text-gray-900">Credit ledger</h4>
        <div className="flex items-center gap-1">
          {[['all', 'All wallet activity'], ...Object.entries(BUCKET_LABEL)].map(([id, label]) => (
            <button key={id} onClick={() => setFilter(id)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium cursor-pointer transition-colors ${filter === id ? 'bg-[#3D16FA] text-white' : 'text-gray-500 hover:bg-black/[0.04]'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {filter !== 'all' && (
        <p className="text-[11px] text-gray-500 -mt-2">
          Showing <span className="font-medium">{BUCKET_LABEL[filter]}</span> activity only — the running balance below is this bucket's balance. Other buckets are shown in the wallet breakdown on Overview.
        </p>
      )}

      <div className="rounded-xl border border-black/[0.08] bg-white overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="bg-gray-50/60 border-b border-black/[0.06] text-left">
              {['Date', 'Event', 'Source', 'Bucket', 'Credits', filter === 'all' ? 'Wallet balance' : 'Bucket balance', 'Reference'].map(h => (
                <th key={h} className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold px-4 py-2 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No entries in this bucket.</td></tr>
            )}
            {rows.map((e, i) => (
              <tr key={i} className="border-b border-black/[0.04] last:border-b-0 hover:bg-gray-50/60">
                <td className="px-4 py-2.5 text-gray-500 tabular-nums whitespace-nowrap">{fmtDate(e.date)}</td>
                <td className="px-4 py-2.5"><span className="inline-block px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider border bg-gray-50 text-gray-600 border-gray-200 whitespace-nowrap">{EVENT_LABEL[e.event] || e.event}</span></td>
                <td className="px-4 py-2.5">
                  <p className="text-gray-900">{e.source}</p>
                  {(e.note || e.actor) && <p className="text-[10.5px] text-gray-400">{[e.note, e.actor].filter(Boolean).join(' · ')}</p>}
                </td>
                <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">{BUCKET_LABEL[e.bucket] || e.bucket}</td>
                <td className={`px-4 py-2.5 tabular-nums whitespace-nowrap ${e.delta > 0 ? 'text-emerald-600' : 'text-gray-700'}`}>{e.delta > 0 ? '+' : ''}{e.delta.toLocaleString()}</td>
                <td className="px-4 py-2.5 tabular-nums text-gray-900 whitespace-nowrap">{(filter === 'all' ? e.runningWallet : e.runningBucket).toLocaleString()}</td>
                <td className="px-4 py-2.5 text-gray-400 whitespace-nowrap">{e.ref || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-gray-400">
        Consumption order: {CONSUMPTION_POLICY_TEXT} Every grant and consumption is traceable to a source.
      </p>

      {/* Trust Credits — separate currency, separate mini-ledger so
          the Intelligence Credits reconciliation stays exact. */}
      {account.trustCredits?.ledger?.length > 0 && (
        <Card>
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="w-4 h-4 text-[#3D16FA]" />
            <h4 className="text-[13px] font-semibold text-gray-900">Trust Credit activity</h4>
            <span className="ml-auto text-[11px] text-gray-400 tabular-nums">
              {account.trustCredits.available} available · {account.trustCredits.used} of {account.trustCredits.grantThisCycle} used this cycle
            </span>
          </div>
          <ul className="divide-y divide-black/[0.06]">
            {account.trustCredits.ledger.map((e, i) => (
              <li key={i} className="py-2 flex items-center gap-3 text-[12px]">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${e.delta > 0 ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                <span className="text-gray-500 tabular-nums w-24 shrink-0">{fmtDate(e.date)}</span>
                <span className="text-gray-900 flex-1 min-w-0 truncate">{e.source}{e.actor ? <span className="text-gray-400"> · {e.actor}</span> : null}</span>
                <span className={`tabular-nums ${e.delta > 0 ? 'text-emerald-600' : 'text-gray-700'}`}>{e.delta > 0 ? '+' : ''}{e.delta}</span>
                <span className="text-gray-400 text-[10.5px] w-20 text-right shrink-0">{e.ref || '—'}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}

function ReconRow({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-500">{label}</span>
      <span className={`tabular-nums font-medium ${value > 0 ? 'text-emerald-600' : value < 0 ? 'text-gray-700' : 'text-gray-300'}`}>
        {value > 0 ? '+' : ''}{value.toLocaleString()}
      </span>
    </div>
  )
}

/* ── Invoices (invoice/PO rail only) ─────────────────────────── */

export function InvoicesPanel({ account, filter = 'all', setFilter, onPayAll, paying }) {
  const exportInvoices = () => downloadCsv('arbitr-invoices.csv', account.invoices.map(i => ({ id: i.id, type: i.type, date: i.date, amount: i.amount, status: i.status, due: i.dueDate, po: i.po || '' })))
  const [payOpen, setPayOpen] = useState(null) // invoice id with the remittance panel open
  const pastDue = account.invoices.filter(i => i.status === 'past_due')
  const pastDueTotal = pastDue.reduce((s, i) => s + i.amount, 0)
  const rows = filter === 'past_due' ? pastDue : account.invoices
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h4 className="text-[13px] font-semibold text-gray-900">
          Invoices
          {filter === 'past_due' && (
            <span className="ml-2 text-[11px] font-normal text-gray-500">
              showing past-due only ·{' '}
              <button onClick={() => setFilter?.('all')} className="text-[#3D16FA] hover:text-[#2E10C4] cursor-pointer underline underline-offset-2">Show all</button>
            </span>
          )}
        </h4>
        <div className="flex items-center gap-2">
          {filter === 'past_due' && pastDue.length > 0 && (
            <button onClick={onPayAll} disabled={paying}
              className="px-3 py-1.5 rounded-md bg-red-600 hover:bg-red-700 text-white text-[11.5px] font-semibold cursor-pointer disabled:opacity-60 disabled:cursor-wait">
              {paying ? 'Processing…' : `Pay all past due (${fmtMoney(pastDueTotal)})`}
            </button>
          )}
          <button onClick={exportInvoices} className="inline-flex items-center gap-1.5 text-[11px] text-gray-600 hover:text-gray-900 border border-black/[0.12] px-3 py-1.5 rounded-lg cursor-pointer">
            <Download className="w-3 h-3" /> Export all
          </button>
        </div>
      </div>

      {/* How to resolve — opened by a Pay action */}
      {payOpen && (() => {
        const inv = account.invoices.find(i => i.id === payOpen)
        if (!inv) return null
        return (
          <div className="rounded-lg border border-[#3D16FA]/25 bg-[#3D16FA]/5 p-4 text-[12px] text-gray-800">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1.5">
                <p className="font-semibold text-gray-900">Pay {inv.id} · {fmtMoney(inv.amount)}{inv.status === 'past_due' ? ` · past due since ${fmtDate(inv.dueDate)}` : ` · due ${fmtDate(inv.dueDate)}`}</p>
                <p>Pay by bank transfer using the remittance details on the invoice PDF. Include the invoice number <span className="font-mono">{inv.id}</span>{inv.po ? <> and PO <span className="font-mono">{inv.po}</span></> : null} in the payment reference.</p>
                <p className="text-gray-600">Status updates within 1 business day of receipt{inv.status === 'past_due' ? '; paying clears the past-due hold on new credit grants' : ''}. Questions or disputes: <span className="text-[#3D16FA]">billing@arbitr.com</span>.</p>
                {account.cardTopUpsEnabled && (
                  <button className="mt-1 px-3 py-1.5 rounded-md border border-black/[0.12] text-[11.5px] text-gray-700 hover:bg-white cursor-pointer">Pay by card for this one-time invoice</button>
                )}
              </div>
              <button onClick={() => setPayOpen(null)} aria-label="Close payment details" className="text-[11px] text-gray-500 hover:text-gray-800 cursor-pointer shrink-0">Close</button>
            </div>
          </div>
        )
      })()}
      <div className="rounded-xl border border-black/[0.08] bg-white overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="bg-gray-50/60 border-b border-black/[0.06] text-left">
              <th className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold px-4 py-2 whitespace-nowrap">Invoice</th>
              <th className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold px-4 py-2 whitespace-nowrap">Type</th>
              <th className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold px-4 py-2 whitespace-nowrap">Amount</th>
              <th className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold px-4 py-2 whitespace-nowrap hidden md:table-cell">PO</th>
              <th className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold px-4 py-2 whitespace-nowrap">Status</th>
              <th className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold px-4 py-2 whitespace-nowrap hidden md:table-cell">Due date</th>
              <th className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold px-4 py-2 whitespace-nowrap text-right min-w-[132px] sticky right-0 bg-gray-50 shadow-[-8px_0_8px_-8px_rgba(0,0,0,0.12)]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(inv => (
              <tr key={inv.id} className="border-b border-black/[0.04] last:border-b-0 hover:bg-gray-50/60">
                <td className="px-4 py-2.5 text-gray-900 whitespace-nowrap">{inv.id}</td>
                <td className="px-4 py-2.5 text-gray-700 whitespace-nowrap">{inv.type}</td>
                <td className="px-4 py-2.5 text-gray-900 tabular-nums whitespace-nowrap">{fmtMoney(inv.amount)}</td>
                <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap hidden md:table-cell">{inv.po || '—'}</td>
                <td className="px-4 py-2.5"><StatusPill status={inv.status} /></td>
                <td className={`px-4 py-2.5 tabular-nums whitespace-nowrap hidden md:table-cell ${inv.status === 'past_due' ? 'text-red-600 font-medium' : 'text-gray-500'}`}>{fmtDate(inv.dueDate)}</td>
                <td className="px-4 py-2.5 whitespace-nowrap text-right min-w-[132px] sticky right-0 bg-white shadow-[-8px_0_8px_-8px_rgba(0,0,0,0.12)]">
                  <button onClick={() => downloadHtml(`${inv.id}.html`, `Invoice ${inv.id}`, `<table><tr><th>Amount</th><td>${fmtMoney(inv.amount)}</td></tr><tr><th>Status</th><td>${inv.status}</td></tr><tr><th>Due</th><td>${fmtDate(inv.dueDate)}</td></tr><tr><th>PO</th><td>${inv.po || '—'}</td></tr></table>`)} aria-label={`Download invoice ${inv.id}`} className="text-[11px] text-[#3D16FA] hover:text-[#2E10C4] cursor-pointer mr-3 px-1 py-1 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3D16FA]/40">Download</button>
                  {inv.status !== 'paid' && <button onClick={() => setPayOpen(inv.id)} aria-label={`Pay invoice ${inv.id}`} className="text-[11px] text-[#3D16FA] hover:text-[#2E10C4] cursor-pointer px-1 py-1 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3D16FA]/40">Pay</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ── Payments & receipts (card/ACH rail only) ────────────────── */

export function PaymentsReceiptsPanel({ account }) {
  const exportReceipts = () => downloadCsv('arbitr-receipts.csv', account.receipts.map(r => ({ id: r.id, type: r.type, date: r.date, method: r.method || '', amount: r.amount, status: r.status })))
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-[13px] font-semibold text-gray-900">Payments & receipts</h4>
        <button onClick={exportReceipts} className="inline-flex items-center gap-1.5 text-[11px] text-gray-600 hover:text-gray-900 border border-black/[0.12] px-3 py-1.5 rounded-lg cursor-pointer">
          <Download className="w-3 h-3" /> Export all
        </button>
      </div>
      {/* The Actions column has a guaranteed min-width and never
          truncates — "Download" must always render in full. If the
          table needs to give up space, the low-priority method and
          receipt-id columns truncate (with title tooltips) instead. */}
      <div className="rounded-xl border border-black/[0.08] bg-white overflow-x-auto">
        <table className="w-full text-[12px]" style={{ tableLayout: 'auto' }}>
          <thead>
            <tr className="bg-gray-50/60 border-b border-black/[0.06] text-left">
              <th scope="col" className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold px-4 py-2 whitespace-nowrap">Receipt</th>
              <th scope="col" className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold px-4 py-2 whitespace-nowrap">Date</th>
              <th scope="col" className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold px-4 py-2 whitespace-nowrap hidden md:table-cell">Type</th>
              <th scope="col" className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold px-4 py-2 whitespace-nowrap hidden md:table-cell">Payment method</th>
              <th scope="col" className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold px-4 py-2 whitespace-nowrap">Amount</th>
              <th scope="col" className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold px-4 py-2 whitespace-nowrap">Status</th>
              {/* Sticky action column: always visible even when the
                  table scrolls horizontally; edge shadow signals the
                  scroll. Never clipped, never truncated. */}
              <th scope="col" className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold px-4 py-2 whitespace-nowrap text-right min-w-[104px] sticky right-0 bg-gray-50 shadow-[-8px_0_8px_-8px_rgba(0,0,0,0.12)]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {account.receipts.map(r => (
              <tr key={r.id} className="border-b border-black/[0.04] last:border-b-0 hover:bg-gray-50/60">
                <td className="px-4 py-2.5 text-gray-900 max-w-[140px] truncate" title={r.id}>{r.id}</td>
                <td className="px-4 py-2.5 text-gray-500 tabular-nums whitespace-nowrap">{fmtDate(r.date)}</td>
                <td className="px-4 py-2.5 text-gray-700 whitespace-nowrap hidden md:table-cell">
                  {r.type}
                  {r.creditType === 'trust' && <span className="ml-1.5 text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-[#3D16FA]/10 text-[#2E10C4] border border-[#3D16FA]/20 font-semibold">Trust</span>}
                </td>
                <td className="px-4 py-2.5 text-gray-500 max-w-[150px] truncate hidden md:table-cell" title={r.method}>{r.method}</td>
                <td className="px-4 py-2.5 text-gray-900 tabular-nums whitespace-nowrap">{fmtMoney(r.amount)}</td>
                <td className="px-4 py-2.5"><StatusPill status={r.status} /></td>
                <td className="px-4 py-2.5 text-right whitespace-nowrap min-w-[104px] sticky right-0 bg-white shadow-[-8px_0_8px_-8px_rgba(0,0,0,0.12)]">
                  <button
                    onClick={() => downloadHtml(`${r.id}.html`, `Receipt ${r.id}`, `<table><tr><th>Amount</th><td>${fmtMoney(r.amount)}</td></tr><tr><th>Method</th><td>${r.method || '—'}</td></tr><tr><th>Status</th><td>${r.status}</td></tr></table>`)}
                    aria-label={`Download receipt ${r.id}`}
                    className="text-[11px] text-[#3D16FA] hover:text-[#2E10C4] cursor-pointer px-1 py-1 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3D16FA]/40"
                  >
                    Download
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ── Admin (enterprise, role-gated) ──────────────────────────── */

const REASON_LABEL = {
  service_credit: 'Service credit', billing_correction: 'Billing correction',
  refund_reversal: 'Refund / reversal', migration_correction: 'Migration correction',
  contract_adjustment: 'Contract adjustment', promotional_grant: 'Promotional grant', other: 'Other',
}

export function AdminPanel({ account, appendLedger, updateBillingSettings }) {
  const isInvoice = account.paymentRail === 'invoice_or_po'
  const [invoiceEnabled, setInvoiceEnabled] = useState(!!account.invoicesEnabled)

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-[12px] text-amber-800">
        <Lock className="w-4 h-4 shrink-0 mt-0.5" />
        <span><span className="font-semibold">Finance-sensitive.</span> Changes here affect how this account is billed and how credits become available. Every change is written to the audit log.</span>
      </div>

      {isInvoice && (
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <h4 className="text-[13px] font-semibold text-gray-900 mb-3">Invoice billing</h4>
            <div className="space-y-3">
              <Field label="Invoice billing">
                <Toggle on={invoiceEnabled} onChange={() => setInvoiceEnabled(v => !v)} label={invoiceEnabled ? 'Enabled' : 'Disabled'} />
              </Field>
              <Field label="Payment terms">
                <select defaultValue={account.netTerms} className="w-full px-2.5 py-1.5 rounded-md border border-black/[0.12] text-[12px] bg-white">
                  {['Due on receipt', 'Net 15', 'Net 30', 'Net 45', 'Net 60'].map(v => <option key={v}>{v}</option>)}
                </select>
              </Field>
              <Field label="Credit grant policy">
                <select defaultValue={account.grantPolicy} className="w-full px-2.5 py-1.5 rounded-md border border-black/[0.12] text-[12px] bg-white">
                  <option value="on-payment">On payment</option>
                  <option value="on-finalization">On invoice finalization</option>
                  <option value="on-contract">On contract start</option>
                  <option value="credit-line">Against approved credit line</option>
                </select>
              </Field>
            </div>
          </Card>
          <Card>
            <h4 className="text-[13px] font-semibold text-gray-900 mb-3">Purchase orders</h4>
            <div className="space-y-3">
              <Field label="PO required for top-ups">
                <Toggle
                  on={!!account.poRequired}
                  onChange={() => updateBillingSettings?.({ poRequired: !account.poRequired })}
                  label={account.poRequired ? 'Required' : 'Optional'}
                />
              </Field>
              <Field label="Default PO number">
                <input
                  value={account.poNumber || ''}
                  onChange={e => updateBillingSettings?.({ poNumber: e.target.value })}
                  placeholder="e.g. PO-2026-018"
                  className="w-full px-2.5 py-1.5 rounded-md border border-black/[0.12] text-[12px] bg-white"
                />
              </Field>
              <p className="text-[10.5px] text-gray-400">
                Applies immediately to new top-up requests for this account. When optional, requesters may submit without a PO; the invoice is issued without a PO reference.
              </p>
            </div>
          </Card>
        </div>
      )}

      <Card>
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck className="w-4 h-4 text-gray-600" />
          <h4 className="text-[13px] font-semibold text-gray-900">Manual credit adjustment</h4>
        </div>
        <p className="text-[12px] text-gray-500 mb-4">Adjustments require a reason code, an internal note, and a reference. Removals, adjustments over 1,000 credits, and all Enterprise adjustments need a second approver.</p>
        <AdjustmentForm account={account} appendLedger={appendLedger} />
      </Card>
    </div>
  )
}

function AdjustmentForm({ account, appendLedger }) {
  const [form, setForm] = useState({ direction: 'add', amount: '', bucket: 'adjustment', reasonCode: 'billing_correction', internalNote: '', customerNote: '', reference: '', approvalId: '' })
  const [stage, setStage] = useState('edit') // edit | review | done
  const [confirmed, setConfirmed] = useState(false)
  const [result, setResult] = useState(null)
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target?.value ?? e }))

  const validation = validateAdjustment(form, account)
  const amt = Number(form.amount) || 0
  const delta = form.direction === 'remove' ? -amt : amt
  const oldBalance = account.creditWallet.availableTotal
  const newBalance = oldBalance + delta

  const submit = () => {
    const entry = buildAdjustmentEntry({ ...form, actor: 'finance@arbitr.com', account, oldBalance })
    appendLedger({ ...entry, source: `Manual adjustment — ${REASON_LABEL[form.reasonCode]}` })
    setResult(entry)
    setStage('done')
    setTimeout(() => { setStage('edit'); setForm(f => ({ ...f, amount: '', internalNote: '', customerNote: '', reference: '', approvalId: '' })); setConfirmed(false); setResult(null) }, 3500)
  }

  if (stage === 'done' && result) {
    return (
      <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-[12px] text-emerald-800">
        <p className="font-semibold inline-flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> Adjustment {result.id} applied and logged.</p>
        <p className="mt-1">Balance {result.audit.oldBalance.toLocaleString()} → {result.audit.newBalance.toLocaleString()} · {REASON_LABEL[result.audit.reasonCode]} · ref {result.ref} · by {result.audit.actorId}. Recorded in the customer ledger as <span className="font-mono">manual_admin_adjustment</span>.</p>
      </div>
    )
  }

  if (stage === 'review') {
    return (
      <div className="rounded-lg border border-black/[0.12] bg-gray-50/60 p-4 space-y-3">
        <p className="text-[13px] font-semibold text-gray-900">
          You are {form.direction === 'remove' ? 'removing' : 'adding'} {amt.toLocaleString()} {BUCKET_LABEL[form.bucket].toLowerCase()} credits {form.direction === 'remove' ? 'from' : 'to'} {account.accountName}.
        </p>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-[12px]">
          <SummaryRow label="Account" value={account.accountName} />
          <SummaryRow label="Current available balance" value={oldBalance.toLocaleString()} />
          <SummaryRow label="Adjustment" value={`${delta > 0 ? '+' : ''}${delta.toLocaleString()}`} />
          <SummaryRow label="New available balance" value={newBalance.toLocaleString()} />
          <SummaryRow label="Reason" value={REASON_LABEL[form.reasonCode]} />
          <SummaryRow label="Reference" value={form.reference} />
          <SummaryRow label="Actor" value="finance@arbitr.com" />
          <SummaryRow label="Timestamp" value="generated on submit" />
        </div>
        {validation.requiresSecondApproval && (
          <Field label="Second approver — approval ID (required)">
            <input value={form.approvalId} onChange={set('approvalId')} placeholder="e.g. APPR-2026-114" className="w-full px-2.5 py-1.5 rounded-md border border-black/[0.12] text-[12px] bg-white" />
          </Field>
        )}
        <label className="flex items-start gap-2 text-[12px] text-gray-700 cursor-pointer">
          <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} className="mt-0.5" />
          {form.direction === 'remove'
            ? 'I understand this will remove credits from the customer’s balance.'
            : 'I understand this will change the customer’s credit balance.'}
        </label>
        <div className="flex items-center gap-2">
          <button onClick={submit} disabled={!confirmed || (validation.requiresSecondApproval && !form.approvalId.trim())}
            className={`px-4 py-2 rounded-lg text-[12.5px] font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${form.direction === 'remove' ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-gray-900 text-white hover:bg-black'}`}>
            {form.direction === 'remove' ? 'Remove credits' : 'Apply adjustment'}
          </button>
          <button onClick={() => setStage('edit')} className="px-4 py-2 rounded-lg border border-black/[0.12] text-[12.5px] font-medium text-gray-600 hover:bg-black/[0.03] cursor-pointer">Back</button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Field label="Account">
          <p className="text-[12px] text-gray-900 py-1.5">{account.accountName}</p>
        </Field>
        <Field label="Current available credits">
          <p className="text-[12px] text-gray-900 py-1.5 tabular-nums">{oldBalance.toLocaleString()}</p>
        </Field>
        <Field label="Direction">
          <div className="flex gap-1">
            {[['add', 'Add credits'], ['remove', 'Remove credits']].map(([v, l]) => (
              <button key={v} onClick={() => setForm(f => ({ ...f, direction: v }))}
                className={`px-2.5 py-1.5 rounded-md text-[11.5px] font-medium border cursor-pointer ${form.direction === v ? (v === 'remove' ? 'bg-red-600 text-white border-red-600' : 'bg-gray-900 text-white border-gray-900') : 'bg-white text-gray-600 border-black/[0.12]'}`}>
                {l}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Amount (credits)">
          <input type="number" min="1" value={form.amount} onChange={set('amount')} placeholder="e.g. 250" className="w-full px-2.5 py-1.5 rounded-md border border-black/[0.12] text-[12px] bg-white" />
        </Field>
        <Field label="Bucket">
          <select value={form.bucket} onChange={set('bucket')} className="w-full px-2.5 py-1.5 rounded-md border border-black/[0.12] text-[12px] bg-white">
            {Object.entries(BUCKET_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </Field>
        <Field label="Reason code">
          <select value={form.reasonCode} onChange={set('reasonCode')} className="w-full px-2.5 py-1.5 rounded-md border border-black/[0.12] text-[12px] bg-white">
            {ADJUSTMENT_REASON_CODES.map(c => <option key={c} value={c}>{REASON_LABEL[c]}</option>)}
          </select>
        </Field>
        <Field label="Reference (ticket / invoice / contract / approval)">
          <input value={form.reference} onChange={set('reference')} placeholder="e.g. TICKET-1234" className="w-full px-2.5 py-1.5 rounded-md border border-black/[0.12] text-[12px] bg-white" />
        </Field>
        <Field label="Customer-facing note (optional)">
          <input value={form.customerNote} onChange={set('customerNote')} placeholder="Shown in the customer ledger" className="w-full px-2.5 py-1.5 rounded-md border border-black/[0.12] text-[12px] bg-white" />
        </Field>
      </div>
      <Field label="Internal note (required)">
        <input value={form.internalNote} onChange={set('internalNote')} placeholder="Why this adjustment is being made" className="w-full px-2.5 py-1.5 rounded-md border border-black/[0.12] text-[12px] bg-white" />
      </Field>
      {validation.errors.length > 0 && form.amount !== '' && (
        <ul className="text-[11px] text-red-600 space-y-0.5">
          {validation.errors.map(e => <li key={e} className="inline-flex items-center gap-1.5 mr-3"><AlertTriangle className="w-3 h-3" />{e}</li>)}
        </ul>
      )}
      <div className="flex items-center justify-between">
        <p className="text-[10.5px] text-gray-400">
          {validation.requiresSecondApproval ? 'This adjustment will require a second approver.' : 'This adjustment can be applied with single confirmation.'}
        </p>
        <button onClick={() => setStage('review')} disabled={!validation.ok}
          className="px-4 py-2 rounded-lg bg-gray-900 text-white text-[12.5px] font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:bg-black">
          Review adjustment
        </button>
      </div>
    </div>
  )
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-900 font-medium text-right">{value}</span>
    </div>
  )
}
