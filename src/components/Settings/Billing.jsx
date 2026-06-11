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
  FileText, Building2,
} from 'lucide-react'
import {
  getDemoAccount, walletFromLedger, planMeterState, tabVisibility,
} from '../../services/billing/billingModel'
import {
  TopUpPanel, UsageLedgerPanel, InvoicesPanel, PaymentsReceiptsPanel,
  AdminPanel, PlansPanel,
} from './BillingPanels'
import { Card, StatusPill, fmtDate } from './BillingShared'

const TIER_TO_ACCOUNT = { standard: 'standard-card', pro: 'proteam-card', enterprise: 'enterprise-invoice' }

export default function Billing({ tier = 'pro' }) {
  /* Enterprise can run on either rail — explicit account data, not an
   * assumption. The selector below previews both configurations. */
  const [entRail, setEntRail] = useState('invoice_or_po')
  const accountKey = tier === 'enterprise'
    ? (entRail === 'invoice_or_po' ? 'enterprise-invoice' : 'enterprise-card')
    : TIER_TO_ACCOUNT[tier] || 'proteam-card'

  const baseAccount = useMemo(() => getDemoAccount(accountKey), [accountKey])

  /* Ledger is local state so top-ups / adjustments append real rows;
   * wallet + tabs recompute from it. */
  const [ledgerByAccount, setLedgerByAccount] = useState({})
  const ledger = ledgerByAccount[accountKey] || baseAccount.ledger
  const account = useMemo(() => {
    const creditWallet = walletFromLedger(ledger, { planGrant: baseAccount.creditWallet.plan.grantThisCycle })
    const a = { ...baseAccount, ledger, creditWallet }
    a.tabs = tabVisibility(a)
    return a
  }, [baseAccount, ledger])

  const appendLedger = (row) => {
    const prev = ledger[ledger.length - 1]
    const next = {
      ...row,
      runningWallet: (prev?.runningWallet || 0) + row.delta,
      runningBucket: ledger.filter(r => r.bucket === row.bucket).reduce((s, r) => s + r.delta, 0) + row.delta,
    }
    setLedgerByAccount(s => ({ ...s, [accountKey]: [...ledger, next] }))
  }

  const [tab, setTab] = useState('overview')
  const [ledgerFilter, setLedgerFilter] = useState('all')
  const isCard = account.paymentRail === 'card_or_ach'

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
        {account.tier === 'enterprise' && (
          <div className="shrink-0 rounded-lg border border-black/[0.08] bg-gray-50 px-3 py-2">
            <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">Account payment rail (preview)</p>
            <div className="flex gap-1">
              {[['invoice_or_po', 'Invoice / PO'], ['card_or_ach', 'Card / ACH']].map(([v, l]) => (
                <button key={v} onClick={() => setEntRail(v)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium cursor-pointer ${entRail === v ? 'bg-[#009eda] text-white' : 'text-gray-500 hover:bg-black/[0.05]'}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      <AlertStack account={account} onOpenInvoices={() => setTab('invoices')} onTopUp={() => setTab('topup')} onViewExpiring={goToExpiring} />

      <nav className="flex items-center gap-1 border-b border-black/[0.08] overflow-x-auto">
        {tabDefs.map(t => {
          const Icon = t.icon
          const active = activeTab === t.id
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 -mb-px border-b-2 text-[12.5px] cursor-pointer whitespace-nowrap transition-colors ${active ? 'border-[#009eda] text-[#009eda] font-semibold' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
              <Icon className="w-3.5 h-3.5" /> {t.label}
            </button>
          )
        })}
      </nav>

      {activeTab === 'overview' && (
        <OverviewPanel account={account} onTopUp={() => setTab('topup')} onChangePlan={() => setTab('plans')}
          onViewLedger={() => setTab('usage')} onViewInvoices={() => setTab('invoices')} onViewPayments={() => setTab('payments')} />
      )}
      {activeTab === 'plans' && <PlansPanel account={account} />}
      {activeTab === 'topup' && <TopUpPanel account={account} appendLedger={appendLedger} />}
      {activeTab === 'usage' && <UsageLedgerPanel account={account} filter={ledgerFilter} setFilter={setLedgerFilter} />}
      {activeTab === 'invoices' && account.tabs.invoices && <InvoicesPanel account={account} />}
      {activeTab === 'payments' && account.tabs.paymentsReceipts && <PaymentsReceiptsPanel account={account} />}
      {activeTab === 'admin' && account.tabs.admin && <AdminPanel account={account} appendLedger={appendLedger} />}
    </div>
  )
}

/* ── Alerts — rail-aware, action sits beside the message ─────── */

function AlertStack({ account, onOpenInvoices, onTopUp, onViewExpiring }) {
  const isCard = account.paymentRail === 'card_or_ach'
  const w = account.creditWallet
  const alerts = []

  if (isCard) {
    if (account.lastPaymentFailed) alerts.push({ tone: 'red', icon: AlertCircle, title: 'Payment failed', body: 'Your last payment did not go through.', cta: { label: 'Retry payment', onClick: onTopUp } })
    if (account.cardExpiresSoon) alerts.push({ tone: 'amber', icon: CreditCard, title: 'Card expires soon', body: 'Your card on file expires at the end of next month.', cta: { label: 'Update payment method', onClick: onTopUp } })
    if (w.plan.overage > 0 && account.overagePolicy === 'draw_from_top_up') alerts.push({ tone: 'info', icon: Info, title: 'Plan credits fully used', body: `${w.plan.overage.toLocaleString()} credits this cycle were drawn from your top-up balance.`, cta: { label: 'Buy credits', onClick: onTopUp } })
  } else {
    const pastDue = account.invoices.filter(i => i.status === 'past_due')
    const open = account.invoices.filter(i => i.status === 'open')
    if (pastDue.length > 0) {
      const oldest = pastDue.reduce((a, b) => (a.dueDate < b.dueDate ? a : b))
      const total = pastDue.reduce((s, i) => s + i.amount, 0)
      alerts.push({
        tone: 'red', icon: AlertCircle,
        title: `${pastDue.length} invoice${pastDue.length === 1 ? ' is' : 's are'} past due`,
        body: `$${total.toLocaleString(undefined, { minimumFractionDigits: 2 })} due since ${fmtDate(oldest.dueDate)}. Credits may pause if unpaid.`,
        cta: { label: 'Open invoices', onClick: onOpenInvoices },
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
      body: 'Expiring credits are used before your other balances, so normal usage consumes them first.',
      cta: { label: 'View expiring credits', onClick: onViewExpiring },
    })
  }

  if (alerts.length === 0) return null
  const tones = {
    red:     'bg-red-50 border-red-200 text-red-800',
    amber:   'bg-amber-50 border-amber-200 text-amber-800',
    info:    'bg-[#009eda]/8 border-[#009eda]/20 text-[#0089c4]',
    neutral: 'bg-gray-50 border-black/[0.08] text-gray-700',
  }
  return (
    <div className="space-y-2">
      {alerts.map((a, i) => {
        const Icon = a.icon
        return (
          <div key={i} className={`rounded-lg border px-3 py-2 flex items-center gap-3 text-[12.5px] ${tones[a.tone]}`}>
            <Icon className="w-4 h-4 shrink-0" />
            <span className="min-w-0">
              <span className="font-semibold">{a.title}</span>
              <span className="opacity-90"> — {a.body}</span>
              {a.cta && (
                <button onClick={a.cta.onClick} className="ml-2 font-semibold underline underline-offset-2 cursor-pointer whitespace-nowrap">
                  {a.cta.label}
                </button>
              )}
            </span>
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
            <span className="w-2 h-2 rounded-full bg-[#009eda]" />
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
              ? <button className="flex-1 px-3 py-2 rounded-lg border border-black/[0.12] text-[12px] font-medium text-gray-700 hover:bg-black/[0.03] cursor-pointer">Update payment method</button>
              : <button onClick={onViewInvoices} className="flex-1 px-3 py-2 rounded-lg border border-black/[0.12] text-[12px] font-medium text-gray-700 hover:bg-black/[0.03] cursor-pointer">View invoices</button>}
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-2 mb-1">
            <Wallet className="w-4 h-4 text-[#009eda]" />
            <h4 className="text-[13px] font-semibold text-gray-900">Credit wallet</h4>
            <button onClick={onTopUp} className="ml-auto inline-flex items-center gap-1 text-[11px] text-[#009eda] hover:text-[#0089c4] cursor-pointer">
              <Plus className="w-3 h-3" /> {isCard ? 'Buy credits' : 'Request top-up'}
            </button>
          </div>
          <p className="text-[32px] font-bold text-gray-900 leading-none mt-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{w.availableTotal.toLocaleString()}</p>
          <p className="text-[11px] text-gray-500 mt-1">credits available · next grant Jul 1, 2026 ({w.plan.grantThisCycle.toLocaleString()} credits)</p>

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
              <div className={`h-full ${meter === 'overage' ? 'bg-amber-500' : meter === 'exhausted' ? 'bg-gray-400' : 'bg-[#009eda]'}`} style={{ width: `${pct}%` }} />
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
            <button onClick={onViewLedger} className="text-[11px] text-[#009eda] hover:text-[#0089c4] cursor-pointer">View ledger →</button>
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
            <button onClick={isCard ? onViewPayments : onViewInvoices} className="text-[11px] text-[#009eda] hover:text-[#0089c4] cursor-pointer">View all →</button>
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
            <li><Term label="PO on file" value={account.poNumber || '—'} /></li>
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

