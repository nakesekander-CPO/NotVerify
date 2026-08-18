/**
 * Billing — rail-shaped billing experience.
 *
 * The UI is driven by a normalized BillingAccountViewModel
 * (src/services/billing/billingModel.js). The payment rail —
 * card_or_ach vs invoice_or_po — decides which tabs, alerts, copy,
 * and actions exist. Card customers never see invoice/PO/Net-terms
 * concepts; invoice customers get request/approval flows and precise
 * invoice status, with card checkout only as an explicitly-enabled
 * secondary option.
 *
 * All credit figures are derived from the ledger (single source of
 * truth), so the Overview wallet, the Usage & Ledger running balance,
 * and the reconciliation summary always tie out.
 */

import { useMemo, useState } from 'react'
import {
  Wallet, History, Receipt, Plus, Tag, Settings as SettingsIcon,
  CheckCircle2, AlertCircle, Clock, Info, CreditCard,
  FileText, Building2, ShieldCheck,
} from 'lucide-react'
import {
  getDemoAccount, walletFromLedger, planMeterState, tabVisibility,
  railPermissions, validateRailChange, buildRailChangeRequest,
  pastDueSummary, markInvoicesPaid, trustWalletFromLedger,
} from '../../services/billing/billingModel'
import {
  TopUpPanel, UsageLedgerPanel, InvoicesPanel, PaymentsReceiptsPanel,
  AdminPanel, PlansPanel,
} from './BillingPanels'
import { Card, StatusPill, fmtDate, fmtMoney } from './BillingShared'
import { useToast } from '../ToastProvider'
import { Tabs } from '../ui'

const TIER_TO_ACCOUNT = { standard: 'standard-card', pro: 'proteam-card', enterprise: 'enterprise-invoice' }

/* This build is an explicit demo environment, so a clearly-labelled
 * rail preview switcher is allowed. In production this MUST be false:
 * the rail then renders as a read-only "Billing arrangement" with a
 * permissioned, audit-logged change-request flow only. */
const IS_DEMO_ENV = true

export default function Billing({ tier = 'pro' }) {
  /* Enterprise can run on either rail — explicit account data, not an
   * assumption. The selector below previews both configurations. */
  const [entRail, setEntRail] = useState('invoice_or_po')
  const accountKey = tier === 'enterprise'
    ? (entRail === 'invoice_or_po' ? 'enterprise-invoice' : 'enterprise-card')
    : TIER_TO_ACCOUNT[tier] || 'proteam-card'

  const baseAccount = useMemo(() => getDemoAccount(accountKey), [accountKey])

  /* Ledger and invoices are local state so payments, top-ups, and
   * adjustments mutate real rows; wallet, alerts, and tabs all
   * recompute from them — banner and register share one source. */
  const [ledgerByAccount, setLedgerByAccount] = useState({})
  const [invoicesByAccount, setInvoicesByAccount] = useState({})
  /* Account-level billing settings editable in Admin (e.g. whether a
   * PO is required on top-up requests) — overrides the fixture so
   * the Admin toggle genuinely controls the request form. */
  const [settingsByAccount, setSettingsByAccount] = useState({})
  /* Trust Credits are a separate currency with their own ledger —
   * they never mix into the Intelligence Credits bucket math. */
  const [trustByAccount, setTrustByAccount] = useState({})
  /* Receipts are live so card/ACH purchases (IC and Trust alike)
   * leave a real paper trail in Payments & receipts. */
  const [receiptsByAccount, setReceiptsByAccount] = useState({})
  const ledger = ledgerByAccount[accountKey] || baseAccount.ledger
  const invoices = invoicesByAccount[accountKey] || baseAccount.invoices
  const trustLedger = trustByAccount[accountKey] || baseAccount.trustLedger || []
  const receipts = receiptsByAccount[accountKey] || baseAccount.receipts || []
  const settings = settingsByAccount[accountKey] || {}
  const updateBillingSettings = (patch) =>
    setSettingsByAccount(s => ({ ...s, [accountKey]: { ...(s[accountKey] || {}), ...patch } }))
  const account = useMemo(() => {
    const creditWallet = walletFromLedger(ledger, { planGrant: baseAccount.creditWallet.plan.grantThisCycle })
    // Re-derive invoice flags + linked request statuses from live
    // invoice state so the past-due warning re-evaluates on payment.
    const paidPos = new Set(invoices.filter(i => i.status === 'paid' && i.po).map(i => i.po))
    const topUpRequests = (baseAccount.topUpRequests || []).map(r =>
      ['past_due', 'invoiced'].includes(r.status) && paidPos.has(r.po)
        ? { ...r, status: 'completed', notes: 'Invoice paid · credits granted' }
        : r
    )
    const a = {
      ...baseAccount, ...settings, ledger, creditWallet, invoices, receipts, topUpRequests,
      trustCredits: { ...trustWalletFromLedger(trustLedger), ledger: trustLedger },
      hasPastDueInvoices: invoices.some(i => i.status === 'past_due'),
      hasOpenInvoices: invoices.some(i => i.status === 'open'),
    }
    a.tabs = tabVisibility(a)
    return a
  }, [baseAccount, ledger, invoices, receipts, settings, trustLedger])

  const appendLedger = (row) => {
    const prev = ledger[ledger.length - 1]
    const next = {
      ...row,
      runningWallet: (prev?.runningWallet || 0) + row.delta,
      runningBucket: ledger.filter(r => r.bucket === row.bucket).reduce((s, r) => s + r.delta, 0) + row.delta,
    }
    setLedgerByAccount(s => ({ ...s, [accountKey]: [...ledger, next] }))
  }

  const appendTrustLedger = (row) =>
    setTrustByAccount(s => ({ ...s, [accountKey]: [...trustLedger, row] }))

  const appendReceipt = (row) =>
    setReceiptsByAccount(s => ({ ...s, [accountKey]: [row, ...receipts] }))

  const [tab, setTab] = useState('overview')
  const [ledgerFilter, setLedgerFilter] = useState('all')
  const [invoiceFilter, setInvoiceFilter] = useState('all') // 'all' | 'past_due'
  const isCard = account.paymentRail === 'card_or_ach'

  /* ── Pay past-due invoices inline ──────────────────────────────
   * Pending state blocks double submission; success re-derives the
   * banner (cleared or recounted) from the same invoice rows the
   * register renders; failure keeps the banner and surfaces the
   * error in place. */
  const [payingPastDue, setPayingPastDue] = useState(false)
  const [payError, setPayError] = useState(null)
  const [paySuccess, setPaySuccess] = useState(null)

  const payInvoiceIds = (ids) => {
    if (payingPastDue || ids.length === 0) return
    setPayError(null)
    setPayingPastDue(true)
    setTimeout(() => {
      try {
        const paidRows = invoices.filter(i => ids.includes(i.id))
        if (paidRows.length === 0) throw new Error('Invoice not found')
        setInvoicesByAccount(s => ({ ...s, [accountKey]: markInvoicesPaid(invoices, ids) }))
        // Release credit grants held against the now-paid invoice(s).
        for (const inv of paidRows) {
          const req = (baseAccount.topUpRequests || []).find(r => r.po && r.po === inv.po && r.status === 'past_due')
          if (req) appendLedger({
            id: `tp-${inv.id}`, date: new Date().toISOString().slice(0, 10),
            event: 'top_up', source: `PO top-up — ${req.id} (released on payment)`,
            bucket: 'top_up', delta: req.credits, ref: inv.id, actor: 'system',
            note: `Granted on payment of ${inv.id}`,
          })
        }
        const total = paidRows.reduce((s, i) => s + i.amount, 0)
        setPaySuccess(`${paidRows.map(i => i.id).join(', ')} paid — ${fmtMoney(total)}. Held credit grants released; the past-due hold is cleared.`)
        setTimeout(() => setPaySuccess(null), 6000)
      } catch {
        setPayError('Payment failed — nothing was charged. Try again or contact billing@arbitr.com.')
      } finally {
        setPayingPastDue(false)
      }
    }, 900)
  }

  /* Banner primary action: one past-due invoice → pay it directly;
   * several → invoices view pre-filtered with a Pay-all affordance
   * (the banner amount is the sum). */
  const onPayPastDue = () => {
    const pd = pastDueSummary(invoices)
    if (pd.count === 1) payInvoiceIds(pd.ids)
    else if (pd.count > 1) { setInvoiceFilter('past_due'); setTab('invoices') }
  }

  /* Reset to a visible tab when the account/rail changes hides one. */
  const tabDefs = [
    account.tabs.overview        && { id: 'overview', label: 'Overview', icon: Wallet },
    account.tabs.plans           && { id: 'plans', label: account.tier === 'enterprise' && !isCard ? 'Plan & Contract' : 'Plans', icon: Tag },
    account.tabs.topUp           && { id: 'topup', label: isCard ? 'Buy credits' : 'Top-up requests', icon: Plus },
    account.tabs.usageLedger     && { id: 'usage', label: 'Usage & Ledger', icon: History },
    account.tabs.invoices        && { id: 'invoices', label: 'Invoices', icon: FileText },
    account.tabs.paymentsReceipts&& { id: 'payments', label: 'Payments & receipts', icon: Receipt },
    account.tabs.admin           && { id: 'admin', label: 'Admin', icon: SettingsIcon },
  ].filter(Boolean)
  const activeTab = tabDefs.some(t => t.id === tab) ? tab : 'overview'

  const goToExpiring = () => { setLedgerFilter('promotional'); setTab('usage') }

  return (
    <div className="p-8 space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-[18px] font-semibold text-gray-900 mb-0.5">Billing</h3>
          <p className="text-[13px] text-gray-500">
            {isCard
              ? 'Subscription, credits, and payments — self-serve.'
              : 'Subscription, credits, invoices, and purchase requests.'}
          </p>
        </div>
        <RailControl account={account} entRail={entRail} setEntRail={setEntRail} />
      </header>

      <AlertStack account={account} onOpenInvoices={() => { setInvoiceFilter('all'); setTab('invoices') }} onTopUp={() => setTab('topup')} onViewExpiring={goToExpiring}
        onPayPastDue={onPayPastDue} payingPastDue={payingPastDue} payError={payError} paySuccess={paySuccess} />

      <Tabs ariaLabel="Billing sections" tabs={tabDefs} active={activeTab} onChange={setTab} />

      {activeTab === 'overview' && (
        <OverviewPanel account={account} onTopUp={() => setTab('topup')} onChangePlan={() => setTab('plans')}
          onViewLedger={() => setTab('usage')} onViewInvoices={() => setTab('invoices')} onViewPayments={() => setTab('payments')} />
      )}
      {activeTab === 'plans' && <PlansPanel account={account} />}
      {activeTab === 'topup' && <TopUpPanel account={account} appendLedger={appendLedger} appendTrustLedger={appendTrustLedger} appendReceipt={appendReceipt} />}
      {activeTab === 'usage' && <UsageLedgerPanel account={account} filter={ledgerFilter} setFilter={setLedgerFilter} />}
      {activeTab === 'invoices' && account.tabs.invoices && (
        <InvoicesPanel account={account} filter={invoiceFilter} setFilter={setInvoiceFilter}
          onPayAll={() => payInvoiceIds(pastDueSummary(invoices).ids)} paying={payingPastDue} />
      )}
      {activeTab === 'payments' && account.tabs.paymentsReceipts && <PaymentsReceiptsPanel account={account} />}
      {activeTab === 'admin' && account.tabs.admin && <AdminPanel account={account} appendLedger={appendLedger} updateBillingSettings={updateBillingSettings} />}
    </div>
  )
}

/* ── Payment rail control — production-safe ──────────────────────
 *
 * The rail is a billing contract attribute. Customers see a read-only
 * "Billing arrangement"; eligible admins can REQUEST a change through
 * a confirmation flow (reason + impact acknowledgment + audit entry;
 * high-risk changes are approval-gated). Only when IS_DEMO_ENV is
 * true does an explicitly-labelled demo switcher render. */

const RAIL_LABEL = { card_or_ach: 'Card / ACH', invoice_or_po: 'Invoice / PO' }

function RailControl({ account, entRail, setEntRail }) {
  const perms = railPermissions(account.role)
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [acknowledged, setAcknowledged] = useState(false)
  const [request, setRequest] = useState(null)
  if (!perms.canViewPaymentRail) return null

  const targetRail = account.paymentRail === 'card_or_ach' ? 'invoice_or_po' : 'card_or_ach'
  const validation = validateRailChange({ targetRail, reason, acknowledged }, account)

  const submit = () => {
    const req = buildRailChangeRequest({ targetRail, reason, actor: `${account.role}@meridian`, account })
    setRequest(req)
    setOpen(false); setReason(''); setAcknowledged(false)
  }

  return (
    <div className="shrink-0 rounded-lg border border-black/[0.08] bg-gray-50 px-3 py-2 max-w-[300px]">
      <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">Billing arrangement</p>
      <div className="flex items-center gap-2">
        <span className="text-[12px] font-semibold text-gray-900">{RAIL_LABEL[account.paymentRail]}</span>
        {perms.canRequestPaymentRailChange && !request && (
          <button onClick={() => setOpen(o => !o)} className="text-[11px] text-[#3D16FA] hover:text-[#2E10C4] cursor-pointer">
            Request change
          </button>
        )}
      </div>
      {request && (
        <p className="text-[10.5px] text-gray-500 mt-1">
          Request {request.id} → {RAIL_LABEL[request.toRail]} · {request.status === 'pending_approval' ? 'pending approval' : 'approved'} · logged to audit
        </p>
      )}
      {open && (
        <div className="mt-2 pt-2 border-t border-black/[0.08] space-y-2">
          <p className="text-[11px] text-gray-700">
            Change to <span className="font-semibold">{RAIL_LABEL[targetRail]}</span>. This changes invoices vs. receipts,
            payment methods, PO and net-terms handling, and how top-ups are purchased.
          </p>
          <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason (required)"
            className="w-full px-2.5 py-1.5 rounded-md border border-black/[0.12] text-[11.5px] bg-white" />
          <label className="flex items-start gap-1.5 text-[10.5px] text-gray-600 cursor-pointer">
            <input type="checkbox" checked={acknowledged} onChange={e => setAcknowledged(e.target.checked)} className="mt-0.5" />
            I understand this changes the account's billing contract surface.
          </label>
          {validation.requiresApproval && (
            <p className="text-[10.5px] text-amber-700">This change requires arbitr finance approval before it takes effect.</p>
          )}
          <div className="flex gap-1.5">
            <button onClick={submit} disabled={!validation.ok}
              className="px-2.5 py-1 rounded-md bg-gray-900 text-white text-[11px] font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
              Submit request
            </button>
            <button onClick={() => setOpen(false)} className="px-2.5 py-1 rounded-md border border-black/[0.12] text-[11px] text-gray-600 cursor-pointer">Cancel</button>
          </div>
        </div>
      )}
      {IS_DEMO_ENV && account.tier === 'enterprise' && (
        <div className="mt-2 pt-2 border-t border-dashed border-black/[0.1]">
          <p className="text-[9.5px] uppercase tracking-wider text-amber-600 mb-1">Demo environment · preview both rails</p>
          <div className="flex gap-1">
            {[['invoice_or_po', 'Invoice / PO'], ['card_or_ach', 'Card / ACH']].map(([v, l]) => (
              <button key={v} onClick={() => setEntRail(v)}
                className={`px-2 py-0.5 rounded text-[10.5px] font-medium cursor-pointer ${entRail === v ? 'bg-[#3D16FA] text-white' : 'text-gray-500 hover:bg-black/[0.05]'}`}>
                {l}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Alerts — rail-aware, action sits beside the message ─────── */

function AlertStack({ account, onOpenInvoices, onTopUp, onViewExpiring, onPayPastDue, payingPastDue, payError, paySuccess }) {
  const isCard = account.paymentRail === 'card_or_ach'
  const w = account.creditWallet
  const alerts = []

  if (paySuccess) {
    alerts.push({ tone: 'success', icon: CheckCircle2, title: 'Payment received', body: paySuccess })
  }

  if (isCard) {
    if (account.lastPaymentFailed) alerts.push({ tone: 'red', icon: AlertCircle, title: 'Payment failed', body: 'Your last payment did not go through.', cta: { label: 'Retry payment', onClick: onTopUp } })
    if (account.cardExpiresSoon) alerts.push({ tone: 'amber', icon: CreditCard, title: 'Card expires soon', body: 'Your card on file expires at the end of next month.', cta: { label: 'Update payment method', onClick: onTopUp } })
    if (w.plan.overage > 0 && account.overagePolicy === 'draw_from_top_up') alerts.push({ tone: 'info', icon: Info, title: 'Plan credits fully used', body: `${w.plan.overage.toLocaleString()} credits this cycle were drawn from your top-up balance.`, cta: { label: 'Buy credits', onClick: onTopUp } })
  } else {
    /* Banner figures and the Pay button derive from pastDueSummary —
     * the same rows the Invoices register renders. */
    const pd = pastDueSummary(account.invoices)
    const open = account.invoices.filter(i => i.status === 'open')
    if (pd.count > 0) {
      alerts.push({
        tone: 'red', icon: AlertCircle,
        title: `${pd.count} invoice${pd.count === 1 ? ' is' : 's are'} past due`,
        body: `${fmtMoney(pd.total)} due since ${fmtDate(pd.oldestDueDate)}. Credits may pause if unpaid.`,
        primary: {
          label: payingPastDue ? 'Processing…' : `Pay ${fmtMoney(pd.total)} now`,
          onClick: onPayPastDue,
          busy: payingPastDue,
        },
        cta: { label: 'Open invoices', onClick: onOpenInvoices },
        errorText: payError,
      })
    }
    if (open.length > 0) {
      const next = open.reduce((a, b) => (a.dueDate < b.dueDate ? a : b))
      alerts.push({
        tone: 'info', icon: FileText,
        title: `${open.length} invoice${open.length === 1 ? '' : 's'} awaiting payment`,
        body: `Next invoice due ${fmtDate(next.dueDate)}.`,
        cta: { label: 'Open invoices', onClick: onOpenInvoices },
      })
    }
  }

  /* Expiring credits — informational; only actions that exist. */
  if (account.expiring?.amount > 0) {
    alerts.push({
      tone: 'neutral', icon: Clock,
      title: `${account.expiring.amount.toLocaleString()} ${account.expiring.type} credits expire on ${fmtDate(account.expiring.expiresAt)}`,
      body: 'Expiring credits are used first — the ledger shows them drawn down before your other balances.',
      cta: { label: 'View expiring credits', onClick: onViewExpiring },
    })
  }

  if (alerts.length === 0) return null
  const tones = {
    red:     'bg-red-50 border-red-200 text-red-800',
    amber:   'bg-amber-50 border-amber-200 text-amber-800',
    info:    'bg-[#3D16FA]/8 border-[#3D16FA]/20 text-[#2E10C4]',
    neutral: 'bg-gray-50 border-black/[0.08] text-gray-700',
    success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  }
  /* Severity-matched solid button for the primary inline action —
   * same style family as the page's other filled buttons. */
  const primaryTones = {
    red:     'bg-red-600 hover:bg-red-700 text-white',
    amber:   'bg-amber-500 hover:bg-amber-600 text-white',
    info:    'bg-[#3D16FA] hover:bg-[#2E10C4] text-white',
    neutral: 'bg-gray-900 hover:bg-black text-white',
    success: 'bg-emerald-600 hover:bg-emerald-700 text-white',
  }
  return (
    <div className="space-y-2">
      {alerts.map((a, i) => {
        const Icon = a.icon
        return (
          <div key={i} className={`rounded-lg border px-3 py-2 text-[12.5px] ${tones[a.tone]}`}>
            <div className="flex items-center gap-3 flex-wrap">
              <Icon className="w-4 h-4 shrink-0" />
              <span className="min-w-0 flex-1 basis-64">
                <span className="font-semibold">{a.title}</span>
                <span className="opacity-90"> — {a.body}</span>
                {a.cta && (
                  <button onClick={a.cta.onClick} className="ml-2 font-semibold underline underline-offset-2 cursor-pointer whitespace-nowrap">
                    {a.cta.label}
                  </button>
                )}
              </span>
              {a.primary && (
                <button
                  onClick={a.primary.onClick}
                  disabled={a.primary.busy}
                  aria-label={a.primary.label}
                  className={`shrink-0 px-3 py-1.5 rounded-md text-[11.5px] font-semibold cursor-pointer transition-colors disabled:opacity-60 disabled:cursor-wait ${primaryTones[a.tone]}`}
                >
                  {a.primary.label}
                </button>
              )}
            </div>
            {a.errorText && (
              <p className="mt-1.5 ml-7 text-[11.5px] font-medium">{a.errorText}</p>
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ── Overview ────────────────────────────────────────────────── */

const PLAN_LABEL = { standard: 'Standard', pro_team: 'Team', enterprise: 'Enterprise' }
const PLAN_PRICE = { standard: '$20/mo', pro_team: '$100/mo', enterprise: 'Annual contract' }

function OverviewPanel({ account, onTopUp, onChangePlan, onViewLedger, onViewInvoices, onViewPayments }) {
  const { addToast } = useToast()
  const isCard = account.paymentRail === 'card_or_ach'
  const w = account.creditWallet
  const meter = planMeterState(w.plan)
  const pctRaw = w.plan.grantThisCycle ? (w.plan.usedThisCycle / w.plan.grantThisCycle) * 100 : 0
  const pct = Math.min(100, Math.round(pctRaw))

  const buckets = [
    { label: 'Plan remaining', value: w.plan.remaining },
    { label: 'Top-up credits', value: w.topUp.available },
    w.adjustments.available !== 0 && { label: 'Adjustments', value: w.adjustments.available },
    w.promotional.available !== 0 && { label: 'Promotional', value: w.promotional.available },
    w.legacy.available !== 0 && { label: 'Legacy', value: w.legacy.available },
  ].filter(Boolean)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-[#3D16FA]" />
            <h4 className="text-[13px] font-semibold text-gray-900">{PLAN_LABEL[account.tier]} Plan</h4>
            <span className="ml-auto text-[10.5px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Active</span>
          </div>
          <p className="text-[11px] text-gray-400 ml-4 mb-3">
            {PLAN_PRICE[account.tier]} · {isCard ? 'billed to payment method on file' : `billed by invoice · ${account.netTerms}`} · renews Jul 1, 2026
          </p>
          <ul className="space-y-1.5 mb-4 text-[12px] text-gray-700">
            <li className="flex items-start gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />{w.plan.grantThisCycle.toLocaleString()} Intelligence Credits granted each cycle</li>
            {!isCard && account.poNumber && <li className="flex items-start gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />PO on file: {account.poNumber}</li>}
            {isCard && <li className="flex items-start gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />Receipts emailed automatically after every payment</li>}
          </ul>
          <div className="flex gap-2 mt-auto">
            <button onClick={onChangePlan} className="flex-1 px-3 py-2 rounded-lg border border-black/[0.12] text-[12px] font-medium text-gray-700 hover:bg-black/[0.03] cursor-pointer">
              {account.tier === 'enterprise' ? 'View contract' : 'Review plan options'}
            </button>
            {isCard
              ? <button onClick={() => addToast('Secure payment-method update link sent to the billing contact', 'success')} className="flex-1 px-3 py-2 rounded-lg border border-black/[0.12] text-[12px] font-medium text-gray-700 hover:bg-black/[0.03] cursor-pointer">Update payment method</button>
              : <button onClick={onViewInvoices} className="flex-1 px-3 py-2 rounded-lg border border-black/[0.12] text-[12px] font-medium text-gray-700 hover:bg-black/[0.03] cursor-pointer">View invoices</button>}
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-2 mb-1">
            <Wallet className="w-4 h-4 text-[#3D16FA]" />
            <h4 className="text-[13px] font-semibold text-gray-900">Credit wallet</h4>
            <button onClick={onTopUp} className="ml-auto inline-flex items-center gap-1 text-[11px] text-[#3D16FA] hover:text-[#2E10C4] cursor-pointer">
              <Plus className="w-3 h-3" /> {isCard ? 'Buy credits' : 'Request top-up'}
            </button>
          </div>
          <p className="text-[32px] font-bold text-gray-900 leading-none mt-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{w.availableTotal.toLocaleString()}</p>
          <p className="text-[11px] text-gray-500 mt-1">Intelligence Credits available · next grant Jul 1, 2026 ({w.plan.grantThisCycle.toLocaleString()} credits)</p>

          {/* Plan meter — overage is reported, never hidden */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className={meter === 'overage' ? 'text-amber-700 font-medium' : 'text-gray-500'}>
                {w.plan.usedThisCycle.toLocaleString()} of {w.plan.grantThisCycle.toLocaleString()} plan credits used
              </span>
              <span className={meter === 'overage' ? 'text-amber-700 font-semibold' : 'text-gray-500'}>
                {meter === 'overage' ? `${Math.round(pctRaw)}%` : `${pct}%`}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-black/[0.06] overflow-hidden">
              <div className={`h-full ${meter === 'overage' ? 'bg-amber-500' : meter === 'exhausted' ? 'bg-gray-400' : 'bg-[#3D16FA]'}`} style={{ width: `${pct}%` }} />
            </div>
            {meter === 'normal' && (
              <p className="text-[11px] text-gray-500 mt-1">{(w.plan.grantThisCycle - w.plan.usedThisCycle).toLocaleString()} plan credits remaining</p>
            )}
            {meter === 'exhausted' && (
              <p className="text-[11px] text-gray-600 mt-1">Plan credits fully used.</p>
            )}
            {meter === 'overage' && (
              <p className="text-[11px] text-amber-700 mt-1">
                {w.plan.overage.toLocaleString()} credits over plan — {account.overagePolicy === 'draw_from_top_up'
                  ? 'drawn from your top-up balance.'
                  : 'recorded as contract overage and will appear on your next invoice.'}
              </p>
            )}
          </div>

          <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11.5px]">
            {buckets.map(b => (
              <li key={b.label} className="flex justify-between">
                <span className="text-gray-500">{b.label}</span>
                <span className="text-gray-900 font-medium tabular-nums">{b.value.toLocaleString()}</span>
              </li>
            ))}
          </ul>

          {/* Trust Credits — separate currency, separate ledger. Shown
              only when the plan includes them or a balance exists. */}
          {(account.trustCredits?.grantThisCycle > 0 || account.trustCredits?.available > 0) && (
            <div className="mt-3 pt-3 border-t border-black/[0.06] flex items-center justify-between text-[11.5px]">
              <span className="text-gray-500 inline-flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#3D16FA]" /> Trust Credits
              </span>
              <span className="text-gray-900 font-medium tabular-nums">
                {account.trustCredits.used} of {account.trustCredits.grantThisCycle} used · {account.trustCredits.available} available
              </span>
            </div>
          )}
        </Card>
      </div>

      {/* Legacy credits — historical archive framing */}
      {w.legacy.available > 0 && (
        <Card>
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-gray-100 border border-black/[0.06] flex items-center justify-center shrink-0">
              <History className="w-4 h-4 text-gray-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-gray-900">Legacy credit balance · {w.legacy.available.toLocaleString()} credits</p>
              <p className="text-[12px] text-gray-600 mt-0.5">Migrated from a previous purchase (PO-2025-098). Legacy credits are consumed last, after plan, promotional, top-up, and adjustment credits.</p>
              <p className="text-[11px] text-gray-400 mt-1">No expiry · visible in the ledger under the Legacy bucket</p>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-[13px] font-semibold text-gray-900">Recent activity</h4>
            <button onClick={onViewLedger} className="text-[11px] text-[#3D16FA] hover:text-[#2E10C4] cursor-pointer">View ledger →</button>
          </div>
          <ul className="divide-y divide-black/[0.06]">
            {account.ledger.slice(-5).reverse().map((e, i) => (
              <li key={i} className="py-2 flex items-center gap-3 text-[12px]">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${e.delta > 0 ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-gray-900 truncate">{e.source}</p>
                  <p className="text-[10.5px] text-gray-400">{fmtDate(e.date)} · {e.actor || '—'}</p>
                </div>
                <span className={`tabular-nums ${e.delta > 0 ? 'text-emerald-600' : 'text-gray-700'}`}>{e.delta > 0 ? '+' : ''}{e.delta.toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-[13px] font-semibold text-gray-900">{isCard ? 'Payments & receipts' : 'Recent invoices'}</h4>
            <button onClick={isCard ? onViewPayments : onViewInvoices} className="text-[11px] text-[#3D16FA] hover:text-[#2E10C4] cursor-pointer">View all →</button>
          </div>
          <ul className="divide-y divide-black/[0.06]">
            {(isCard ? account.receipts : account.invoices).slice(0, 4).map(r => (
              <li key={r.id} className="py-2 flex items-center gap-3 text-[12px]">
                <Receipt className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-gray-900 truncate">{r.id} · {r.type}</p>
                  <p className="text-[10.5px] text-gray-400">{fmtDate(r.date)}{r.method ? ` · ${r.method}` : ''}{r.po ? ` · ${r.po}` : ''}</p>
                </div>
                <span className="text-gray-700 tabular-nums">${r.amount.toLocaleString(undefined, { minimumFractionDigits: r.amount % 1 ? 2 : 0 })}</span>
                <StatusPill status={r.status} />
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {!isCard && (
        <Card>
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="w-4 h-4 text-gray-500" />
            <h4 className="text-[13px] font-semibold text-gray-900">Billing terms</h4>
          </div>
          <ul className="grid grid-cols-4 gap-x-6 gap-y-2 text-[12px]">
            <li><Term label="Payment rail" value="Invoice / PO" /></li>
            <li><Term label="Terms" value={account.netTerms} /></li>
            <li><Term label={`PO (${account.poRequired ? 'required' : 'optional'})`} value={account.poNumber || '—'} /></li>
            <li><Term label="Credit grant" value={account.grantPolicy === 'on-finalization' ? 'On invoice finalization' : 'On payment'} /></li>
          </ul>
        </Card>
      )}
    </div>
  )
}

function Term({ label, value }) {
  return (
    <>
      <span className="text-gray-400 text-[10.5px] uppercase tracking-wider block">{label}</span>
      <span className="text-gray-900">{value}</span>
    </>
  )
}

