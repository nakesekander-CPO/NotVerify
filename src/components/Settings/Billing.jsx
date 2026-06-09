/**
 * Billing — unified subscription, credits, top-up, ledger, invoice,
 * and admin surface. Implements the MVP scope of arbitr's
 * subscription-first / credit-ledger-backed / payment-rail-agnostic
 * billing model:
 *
 *   - One product model for self-serve, invoice, and enterprise
 *     customers; only the payment rail differs.
 *   - Every workspace has a credit wallet, fed by monthly plan
 *     grants, manual top-ups, invoice/PO top-ups, auto top-up,
 *     migrated legacy credits, and admin adjustments.
 *   - Customer-facing UI stays simple (available · used · expiring ·
 *     top up); admin surface preserves auditability and control.
 *
 * Tabs:
 *   Overview · Top up · Usage & Ledger · Invoices · Admin (ent only)
 *
 * Alerts (banner row): low balance, credits expiring soon, failed
 * payment / invoice overdue, account on hold, auto top-up disabled
 * — all conditional on data state.
 */

import { useMemo, useState } from 'react'
import {
  Zap, Shield, Clock, CheckCircle2, AlertCircle, AlertTriangle,
  Plus, ChevronDown, ChevronRight, Download, FileText, Receipt,
  RefreshCw, Sparkles, Wallet, History, Settings as SettingsIcon,
  ArrowUpRight, ArrowDownRight, Info, Pause, Play, Lock, Building2,
  Tag, Banknote, MailCheck, X,
} from 'lucide-react'

/* ── Mock data (self-contained for the prototype) ─────────────── */

const PLAN_BY_TIER = {
  standard: { name: 'Standard',  monthly: 20,  monthlyCredits: 1000, includesAI: 'Standard AI Translation', features: ['1,000 Intelligence Credits / month', 'Standard AI Translation'] },
  plus:     { name: 'Plus',      monthly: 35,  monthlyCredits: 2000, includesAI: 'Standard AI Translation + Agent Specialty Verification', features: ['2,000 Intelligence Credits / month', 'Standard AI Translation', 'AI Agent Specialty Verification'] },
  pro:      { name: 'Team',      monthly: 100, monthlyCredits: 5000, includesAI: 'All AI features (Translation + Agent)', features: ['5,000 Intelligence Credits / month', 'All AI features (Translation + Agent)', '2 Trust Credits / month', 'Priority processing & Rollovers'] },
  enterprise:{name: 'Enterprise',monthly: null,monthlyCredits: 50000,includesAI: 'All AI features + dedicated support', features: ['Committed annual credit pool', 'All AI features', 'SSO + advanced security', 'Dedicated support'] },
}

const TOP_UP_BUNDLES = [
  { credits: 500,   cost: 5,    label: 'Starter' },
  { credits: 1000,  cost: 10,   label: 'Standard',  popular: true },
  { credits: 2500,  cost: 24,   label: 'Plus',      save: '4%' },
  { credits: 5000,  cost: 45,   label: 'Pro',       save: '10%' },
  { credits: 10000, cost: 85,   label: 'Power',     save: '15%' },
]

const PAYMENT_TERMS = ['Due on receipt', 'Net 15', 'Net 30', 'Net 45']
const GRANT_POLICIES = [
  { id: 'on-payment',      label: 'On payment',             desc: 'Credits granted when invoice is paid.' },
  { id: 'on-finalization', label: 'On invoice finalization',desc: 'Credits granted when invoice is finalized.' },
  { id: 'on-contract',     label: 'On contract start',      desc: 'Credits granted at contract start each cycle.' },
  { id: 'credit-line',     label: 'Against credit line',    desc: 'Credits granted immediately, billed monthly.' },
]
const COLLECTIONS_STATES = [
  { id: 'good',      label: 'Good standing', tone: 'emerald' },
  { id: 'watch',     label: 'Watch',         tone: 'amber' },
  { id: 'hold',      label: 'Hold',          tone: 'red' },
  { id: 'suspended', label: 'Suspended',     tone: 'red' },
]

function defaultLedger() {
  return [
    { id: 'l01', date: '2026-04-13', type: 'grant',  amount: +5000, source: 'Monthly plan grant',         note: 'Team plan · April cycle',  invoiceId: 'INV-2026-005', runningBalance: 5000, expiresAt: '2026-05-13', who: 'system' },
    { id: 'l02', date: '2026-04-15', type: 'usage',  amount: -612,  source: 'Q3 Earnings Report — JA',     note: 'Localization run · 612 IC',                       runningBalance: 4388, who: 'Hana Ito' },
    { id: 'l03', date: '2026-04-18', type: 'usage',  amount: -294,  source: 'BaFin Filing Translation — DE',note: 'Localization run · 294 IC',                       runningBalance: 4094, who: 'Klaus Berger' },
    { id: 'l04', date: '2026-04-21', type: 'topup',  amount: +2500, source: 'Top-up — card',               note: 'Plus bundle · receipt RCP-1042', invoiceId: 'RCP-1042', runningBalance: 6594, who: 'Alex Chen' },
    { id: 'l05', date: '2026-04-22', type: 'usage',  amount: -847,  source: 'FY26 Annual Report',          note: 'Localization run · 847 IC',                       runningBalance: 5747, who: 'Sarah Chen' },
    { id: 'l06', date: '2026-04-24', type: 'adjust', amount: +250,  source: 'Manual adjustment',           note: 'Goodwill credit · ticket #4821', runningBalance: 5997, who: 'arbitr Support' },
    { id: 'l07', date: '2026-04-26', type: 'usage',  amount: -1244, source: 'Q3 MD&A Memo',                note: 'Localization run · 1,244 IC',                     runningBalance: 4753, who: 'Marcus Weber' },
    { id: 'l08', date: '2026-04-28', type: 'expire', amount: -150,  source: 'Promo credit expired',        note: 'Apr promo · 30-day expiry',                       runningBalance: 4603, who: 'system' },
  ]
}

const INVOICES = [
  { id: 'INV-2026-005', date: '2026-04-01', type: 'Subscription', amount: 100, po: 'PO-2026-018', status: 'paid'      },
  { id: 'RCP-1042',     date: '2026-04-21', type: 'Top-up',       amount: 24,  po: '',            status: 'paid'      },
  { id: 'INV-2026-004', date: '2026-03-01', type: 'Subscription', amount: 100, po: 'PO-2026-012', status: 'paid'      },
  { id: 'INV-2026-003', date: '2026-04-15', type: 'Top-up (PO)',  amount: 250, po: 'PO-2026-021', status: 'invoiced', creditsPending: 25000 },
  { id: 'INV-2026-002', date: '2026-03-30', type: 'Top-up (PO)',  amount: 50,  po: 'PO-2026-019', status: 'overdue'   },
]

const TOPUP_REQUESTS = [
  { id: 'TR-1031', date: '2026-04-15', credits: 25000, cost: 250, po: 'PO-2026-021', status: 'invoiced',  notes: 'Awaiting payment per Net-30 terms' },
  { id: 'TR-1029', date: '2026-03-30', credits: 5000,  cost: 50,  po: 'PO-2026-019', status: 'overdue',   notes: 'Payment overdue by 5 days' },
  { id: 'TR-1024', date: '2026-03-12', credits: 10000, cost: 100, po: 'PO-2026-014', status: 'completed', notes: 'Credits granted Mar 14' },
]

/* ── Component ────────────────────────────────────────────────── */

export default function Billing({ tier = 'pro' }) {
  const plan = PLAN_BY_TIER[tier] || PLAN_BY_TIER.pro
  const isEnterprise = tier === 'enterprise'
  const invoiceCustomer = isEnterprise // demo: enterprise = invoice-enabled

  const [tab, setTab] = useState('overview')

  /* Wallet state (mock; would come from server) */
  const monthlyGrant = plan.monthlyCredits
  const [used, setUsed] = useState(2104)
  const [topUpBalance, setTopUpBalance] = useState(2500)   // current-cycle top-ups
  const [adjustBalance, setAdjustBalance] = useState(250)
  const [expiringSoon] = useState([{ amount: 300, expiresAt: '2026-05-08', source: 'Apr promo credit' }])
  const [legacyBalance, setLegacyBalance] = useState(840) // migrated from old PO purchase
  const planRemaining = Math.max(0, monthlyGrant - used)
  const balance = planRemaining + topUpBalance + adjustBalance + legacyBalance

  const lowBalance = balance < monthlyGrant * 0.15
  const overdueInvoice = INVOICES.some(i => i.status === 'overdue')
  const accountOnHold = false  // demo

  /* Top-up state */
  const [topUpOpen, setTopUpOpen] = useState(false)
  const [topUpMethod, setTopUpMethod] = useState(invoiceCustomer ? 'invoice' : 'card')
  const [selectedBundle, setSelectedBundle] = useState(2)
  const [poNumber, setPoNumber] = useState('PO-2026-022')
  const [topUpStatus, setTopUpStatus] = useState(null)

  /* Auto top-up */
  const [autoTopUp, setAutoTopUp] = useState({ enabled: false, threshold: 500, bundleIdx: 2 })

  /* Admin / finance config (enterprise only) */
  const [admin, setAdmin] = useState({
    paymentRail: 'invoice',
    invoiceEnabled: true,
    paymentTerms: 'Net 30',
    poRequired: true,
    defaultPO: 'PO-2026-018',
    grantPolicy: 'on-finalization',
    creditLimit: 100000,
    collections: 'good',
  })

  /* Ledger filter */
  const [ledger, setLedger] = useState(defaultLedger())
  const [ledgerFilter, setLedgerFilter] = useState('all')

  const filteredLedger = useMemo(
    () => ledgerFilter === 'all' ? ledger : ledger.filter(e => e.type === ledgerFilter),
    [ledger, ledgerFilter]
  )

  const submitTopUp = () => {
    const bundle = TOP_UP_BUNDLES[selectedBundle]
    if (topUpMethod === 'card' || topUpMethod === 'ach') {
      // Self-serve: instant.
      setTopUpBalance(b => b + bundle.credits)
      setLedger(l => [{
        id: `l${Date.now()}`, date: new Date().toISOString().slice(0, 10),
        type: 'topup', amount: +bundle.credits,
        source: `Top-up — ${topUpMethod === 'card' ? 'card' : 'ACH'}`,
        note: `${bundle.label} bundle · $${bundle.cost}`,
        runningBalance: balance + bundle.credits, who: 'You',
      }, ...l])
      setTopUpStatus({ kind: 'ok', msg: `${bundle.credits.toLocaleString()} credits added. Receipt emailed.` })
    } else {
      // Invoice / PO: status-tracked, no immediate credit grant.
      setTopUpStatus({ kind: 'requested', msg: `Top-up requested. Invoice will be emailed within 1 business day; credits ${admin.grantPolicy === 'on-payment' ? 'granted on payment' : admin.grantPolicy === 'on-finalization' ? 'granted on finalization' : 'granted per contract'}.` })
    }
    setTimeout(() => { setTopUpOpen(false); setTopUpStatus(null) }, 2200)
  }

  /* ── Render ──────────────────────────────────────────────── */

  return (
    <div className="p-8 space-y-6">
      <header>
        <h3 className="text-[18px] font-semibold text-gray-900 mb-0.5">Billing</h3>
        <p className="text-[13px] text-gray-500">Subscription, credits, top-ups, usage, and invoices in one place.</p>
      </header>

      {/* ── Alerts (conditional) ────────────────────────────── */}
      <AlertStack>
        {accountOnHold && (
          <Alert tone="red" icon={Lock} title="Account on hold" body="New requests are paused. Pay outstanding invoices to resume." cta={{ label: 'View invoices', onClick: () => setTab('invoices') }} />
        )}
        {overdueInvoice && !accountOnHold && (
          <Alert tone="red" icon={AlertCircle} title="Invoice overdue" body="One or more invoices are past due. Credits may pause if unpaid." cta={{ label: 'Open invoices', onClick: () => setTab('invoices') }} />
        )}
        {lowBalance && !accountOnHold && (
          <Alert tone="amber" icon={AlertTriangle} title="Low credit balance" body={`You have ${balance.toLocaleString()} credits — below 15% of your monthly grant.`} cta={{ label: 'Top up', onClick: () => { setTab('topup'); setTopUpOpen(true) } }} />
        )}
        {expiringSoon.length > 0 && (
          <Alert tone="amber" icon={Clock} title={`${expiringSoon[0].amount} credits expiring soon`} body={`${expiringSoon[0].source} expires ${expiringSoon[0].expiresAt}.`} />
        )}
        {!autoTopUp.enabled && !invoiceCustomer && (
          <Alert tone="info" icon={Sparkles} title="Auto top-up available" body="Never run out — set a threshold and we'll top up automatically." cta={{ label: 'Set up', onClick: () => setTab('topup') }} />
        )}
      </AlertStack>

      {/* ── Tab bar ─────────────────────────────────────────── */}
      <nav className="flex items-center gap-1 border-b border-black/[0.08]">
        {[
          { id: 'overview', label: 'Overview',  icon: Wallet },
          { id: 'topup',    label: 'Top up',    icon: Plus },
          { id: 'usage',    label: 'Usage & Ledger', icon: History },
          { id: 'invoices', label: 'Invoices',  icon: Receipt },
          ...(isEnterprise ? [{ id: 'admin', label: 'Admin', icon: SettingsIcon }] : []),
        ].map(t => {
          const Icon = t.icon
          const active = tab === t.id
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 -mb-px border-b-2 text-[12.5px] cursor-pointer transition-colors ${active ? 'border-[#009eda] text-[#009eda] font-semibold' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
              <Icon className="w-3.5 h-3.5" /> {t.label}
            </button>
          )
        })}
      </nav>

      {/* ── Tab bodies ──────────────────────────────────────── */}
      {tab === 'overview' && <OverviewTab plan={plan} tier={tier} balance={balance} used={used} monthlyGrant={monthlyGrant} topUpBalance={topUpBalance} adjustBalance={adjustBalance} legacyBalance={legacyBalance} expiringSoon={expiringSoon} ledger={ledger} invoices={INVOICES} invoiceCustomer={invoiceCustomer} admin={admin} onTopUp={() => { setTab('topup'); setTopUpOpen(true) }} onViewLedger={() => setTab('usage')} onViewInvoices={() => setTab('invoices')} />}

      {tab === 'topup' && <TopUpTab tier={tier} invoiceCustomer={invoiceCustomer} admin={admin} topUpOpen={topUpOpen} setTopUpOpen={setTopUpOpen} topUpMethod={topUpMethod} setTopUpMethod={setTopUpMethod} selectedBundle={selectedBundle} setSelectedBundle={setSelectedBundle} poNumber={poNumber} setPoNumber={setPoNumber} topUpStatus={topUpStatus} submitTopUp={submitTopUp} autoTopUp={autoTopUp} setAutoTopUp={setAutoTopUp} topUpRequests={TOPUP_REQUESTS} />}

      {tab === 'usage' && <UsageTab ledger={filteredLedger} ledgerFilter={ledgerFilter} setLedgerFilter={setLedgerFilter} />}

      {tab === 'invoices' && <InvoicesTab invoices={INVOICES} invoiceCustomer={invoiceCustomer} topUpRequests={TOPUP_REQUESTS} />}

      {tab === 'admin' && isEnterprise && <AdminTab admin={admin} setAdmin={setAdmin} />}
    </div>
  )
}

/* ── Overview tab ─────────────────────────────────────────────── */

function OverviewTab({ plan, tier, balance, used, monthlyGrant, topUpBalance, adjustBalance, legacyBalance, expiringSoon, ledger, invoices, invoiceCustomer, admin, onTopUp, onViewLedger, onViewInvoices }) {
  const pct = Math.round((Math.min(used, monthlyGrant) / monthlyGrant) * 100)
  return (
    <div className="space-y-6">
      {/* Two-up: plan + wallet */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-[#009eda]" />
            <h4 className="text-[13px] font-semibold text-gray-900">{plan.name} Plan</h4>
            <span className="ml-auto text-[10.5px] font-medium px-2 py-0.5 rounded-full bg-[#009eda]/10 text-[#009eda]">Current</span>
          </div>
          <p className="text-[11px] text-gray-400 ml-4 mb-3">{plan.monthly != null ? `$${plan.monthly}/mo · ` : 'Annual contract · '}Renews Apr 13, 2026</p>
          <ul className="space-y-1.5 mb-4">
            {plan.features.map(f => (
              <li key={f} className="flex items-start gap-2 text-[12px] text-gray-700">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />{f}
              </li>
            ))}
          </ul>
          <div className="flex gap-2 mt-auto">
            <button className="flex-1 px-3 py-2 rounded-lg border border-black/[0.12] text-[12px] font-medium text-gray-700 hover:bg-black/[0.03] cursor-pointer">Change plan</button>
            <button className="flex-1 px-3 py-2 rounded-lg border border-black/[0.12] text-[12px] font-medium text-gray-700 hover:bg-black/[0.03] cursor-pointer">Payment method</button>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-2 mb-1">
            <Wallet className="w-4 h-4 text-[#009eda]" />
            <h4 className="text-[13px] font-semibold text-gray-900">Credit wallet</h4>
            <button onClick={onTopUp} className="ml-auto inline-flex items-center gap-1 text-[11px] text-[#009eda] hover:text-[#0089c4] cursor-pointer">
              <Plus className="w-3 h-3" /> Top up
            </button>
          </div>
          <p className="text-[32px] font-bold text-gray-900 leading-none mt-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{balance.toLocaleString()}</p>
          <p className="text-[11px] text-gray-500 mt-1">credits available · next grant Apr 13, 2026 ({monthlyGrant.toLocaleString()} credits)</p>

          {/* Usage bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-[11px] text-gray-500 mb-1">
              <span>This cycle · {used.toLocaleString()} of {monthlyGrant.toLocaleString()} plan credits used</span>
              <span>{pct}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-black/[0.06] overflow-hidden">
              <div className="h-full bg-[#009eda]" style={{ width: `${pct}%` }} />
            </div>
          </div>

          {/* Wallet breakdown */}
          <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11.5px]">
            <li className="flex justify-between"><span className="text-gray-500">Plan remaining</span><span className="text-gray-900 font-medium tabular-nums">{Math.max(0, monthlyGrant - used).toLocaleString()}</span></li>
            <li className="flex justify-between"><span className="text-gray-500">Top-up credits</span><span className="text-gray-900 font-medium tabular-nums">{topUpBalance.toLocaleString()}</span></li>
            <li className="flex justify-between"><span className="text-gray-500">Adjustments</span><span className="text-gray-900 font-medium tabular-nums">{adjustBalance.toLocaleString()}</span></li>
            {legacyBalance > 0 && (
              <li className="flex justify-between"><span className="text-gray-500 inline-flex items-center gap-1"><Info className="w-3 h-3" />Legacy</span><span className="text-gray-900 font-medium tabular-nums">{legacyBalance.toLocaleString()}</span></li>
            )}
          </ul>

          {expiringSoon.length > 0 && (
            <p className="mt-3 text-[11px] text-amber-600 inline-flex items-center gap-1">
              <Clock className="w-3 h-3" /> {expiringSoon[0].amount} credits expire {expiringSoon[0].expiresAt} · {expiringSoon[0].source}
            </p>
          )}
        </Card>
      </div>

      {/* Legacy credits (Flow 10) */}
      {legacyBalance > 0 && (
        <Card>
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
              <History className="w-4 h-4 text-amber-700" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-gray-900">Legacy credit balance · {legacyBalance.toLocaleString()} credits</p>
              <p className="text-[12px] text-gray-600 mt-0.5">Migrated from your previous PO purchase. These are consumed <span className="font-medium">before</span> new monthly grant and top-up credits.</p>
              <p className="text-[11px] text-gray-400 mt-1">Source: Migration — PO-2025-098 · No expiry</p>
            </div>
            <button className="text-[11px] text-[#009eda] hover:text-[#0089c4] cursor-pointer shrink-0">Learn more</button>
          </div>
        </Card>
      )}

      {/* Recent activity + recent invoices */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-[13px] font-semibold text-gray-900">Recent activity</h4>
            <button onClick={onViewLedger} className="text-[11px] text-[#009eda] hover:text-[#0089c4] cursor-pointer inline-flex items-center gap-1">View ledger <ChevronRight className="w-3 h-3" /></button>
          </div>
          <ul className="divide-y divide-black/[0.06]">
            {ledger.slice(0, 5).map(e => <LedgerRow key={e.id} e={e} compact />)}
          </ul>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-[13px] font-semibold text-gray-900">Recent invoices & receipts</h4>
            <button onClick={onViewInvoices} className="text-[11px] text-[#009eda] hover:text-[#0089c4] cursor-pointer inline-flex items-center gap-1">All invoices <ChevronRight className="w-3 h-3" /></button>
          </div>
          <ul className="divide-y divide-black/[0.06]">
            {invoices.slice(0, 5).map(i => (
              <li key={i.id} className="py-2 flex items-center gap-3 text-[12px]">
                <FileText className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-gray-900 truncate">{i.id} · {i.type}</p>
                  <p className="text-[10.5px] text-gray-400">{i.date}{i.po ? ` · ${i.po}` : ''}</p>
                </div>
                <span className="text-gray-700 tabular-nums">${i.amount}</span>
                <InvoiceStatus status={i.status} />
                <button className="p-1 rounded hover:bg-black/[0.04] text-gray-400 cursor-pointer" title="Download"><Download className="w-3.5 h-3.5" /></button>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {invoiceCustomer && (
        <Card>
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="w-4 h-4 text-gray-500" />
            <h4 className="text-[13px] font-semibold text-gray-900">Invoice billing terms</h4>
          </div>
          <ul className="grid grid-cols-3 gap-x-6 gap-y-2 text-[12px]">
            <li><span className="text-gray-400 text-[10.5px] uppercase tracking-wider block">Payment rail</span><span className="text-gray-900 capitalize">{admin.paymentRail}</span></li>
            <li><span className="text-gray-400 text-[10.5px] uppercase tracking-wider block">Terms</span><span className="text-gray-900">{admin.paymentTerms}</span></li>
            <li><span className="text-gray-400 text-[10.5px] uppercase tracking-wider block">PO required</span><span className="text-gray-900">{admin.poRequired ? 'Yes' : 'No'}</span></li>
            <li><span className="text-gray-400 text-[10.5px] uppercase tracking-wider block">Default PO</span><span className="text-gray-900">{admin.defaultPO || '—'}</span></li>
            <li><span className="text-gray-400 text-[10.5px] uppercase tracking-wider block">Credit grant</span><span className="text-gray-900">{GRANT_POLICIES.find(g => g.id === admin.grantPolicy)?.label}</span></li>
            <li><span className="text-gray-400 text-[10.5px] uppercase tracking-wider block">Collections</span><CollectionsBadge status={admin.collections} /></li>
          </ul>
        </Card>
      )}
    </div>
  )
}

/* ── Top-up tab ───────────────────────────────────────────────── */

function TopUpTab({ tier, invoiceCustomer, admin, topUpOpen, setTopUpOpen, topUpMethod, setTopUpMethod, selectedBundle, setSelectedBundle, poNumber, setPoNumber, topUpStatus, submitTopUp, autoTopUp, setAutoTopUp, topUpRequests }) {
  const bundle = TOP_UP_BUNDLES[selectedBundle]
  const isInvoice = topUpMethod === 'invoice' || topUpMethod === 'po'
  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h4 className="text-[13px] font-semibold text-gray-900">Add credits</h4>
            <p className="text-[12px] text-gray-500 mt-0.5">Top up anytime. Credits are added immediately for card/ACH; invoice top-ups follow your account's grant policy.</p>
          </div>
        </div>

        {/* Payment method */}
        <div className="flex flex-wrap gap-2 mb-4">
          {[
            { id: 'card',    label: 'Card',    icon: Receipt,  desc: 'Instant · receipt emailed' },
            { id: 'ach',     label: 'ACH',     icon: Banknote, desc: 'Instant · 2–3 day settlement' },
            ...(invoiceCustomer ? [
              { id: 'invoice', label: 'Invoice', icon: FileText, desc: `${admin.paymentTerms} · grant ${admin.grantPolicy === 'on-payment' ? 'on payment' : admin.grantPolicy === 'on-finalization' ? 'on finalization' : 'per contract'}` },
              { id: 'po',      label: 'PO',      icon: Tag,      desc: `${admin.paymentTerms} · PO required` },
            ] : []),
          ].map(m => {
            const Icon = m.icon
            const active = topUpMethod === m.id
            return (
              <button key={m.id} onClick={() => setTopUpMethod(m.id)}
                className={`text-left rounded-lg border p-3 flex-1 min-w-[150px] cursor-pointer transition-colors ${active ? 'border-[#009eda] bg-[#009eda]/5' : 'border-black/[0.12] hover:border-black/[0.25]'}`}>
                <div className="flex items-center gap-2">
                  <Icon className={`w-3.5 h-3.5 ${active ? 'text-[#009eda]' : 'text-gray-500'}`} />
                  <span className="text-[12px] font-semibold text-gray-900">{m.label}</span>
                </div>
                <p className="text-[10.5px] text-gray-500 mt-1">{m.desc}</p>
              </button>
            )
          })}
        </div>

        {/* Bundles */}
        <div className="grid grid-cols-5 gap-2 mb-4">
          {TOP_UP_BUNDLES.map((b, i) => {
            const active = selectedBundle === i
            return (
              <button key={b.label} onClick={() => setSelectedBundle(i)}
                className={`text-left rounded-lg border p-3 cursor-pointer transition-colors ${active ? 'border-[#009eda] bg-[#009eda]/5' : 'border-black/[0.12] hover:border-black/[0.25]'}`}>
                <div className="flex items-center justify-between">
                  <span className="text-[10.5px] text-gray-500">{b.label}</span>
                  {b.popular && <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-[#009eda] text-white font-semibold">Popular</span>}
                  {b.save && <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold">Save {b.save}</span>}
                </div>
                <p className="text-[16px] font-bold text-gray-900 mt-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{b.credits.toLocaleString()}</p>
                <p className="text-[10.5px] text-gray-500">credits · ${b.cost}</p>
              </button>
            )
          })}
        </div>

        {/* PO field for invoice/PO method */}
        {isInvoice && (
          <div className="rounded-lg border border-black/[0.08] bg-gray-50 p-3 mb-4 space-y-2">
            <label className="block text-[10.5px] font-medium text-gray-400 uppercase tracking-wider">PO Number {admin.poRequired && <span className="text-red-600 normal-case">(required)</span>}</label>
            <input value={poNumber} onChange={e => setPoNumber(e.target.value)} placeholder="e.g. PO-2026-022"
              className="w-full px-3 py-1.5 rounded-md border border-black/[0.12] text-[12px] focus:outline-none focus:border-[#009eda] bg-white" />
            <p className="text-[10.5px] text-gray-500">Credits will be granted <span className="font-medium">{admin.grantPolicy === 'on-payment' ? 'when this invoice is paid' : admin.grantPolicy === 'on-finalization' ? 'when the invoice is finalized' : 'per your contract terms'}</span>. You'll see status updates here.</p>
          </div>
        )}

        {/* Review + submit */}
        <div className="flex items-center justify-between rounded-lg border border-black/[0.08] bg-white p-3">
          <div>
            <p className="text-[12px] text-gray-500">Adding</p>
            <p className="text-[18px] font-bold text-gray-900" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{bundle.credits.toLocaleString()} credits · ${bundle.cost}</p>
            <p className="text-[10.5px] text-gray-400 mt-0.5">{isInvoice ? `Billed by ${topUpMethod === 'po' ? 'PO' : 'invoice'} · ${admin.paymentTerms}` : 'Charged to your default payment method · instant'}</p>
          </div>
          <button onClick={submitTopUp} disabled={isInvoice && admin.poRequired && !poNumber.trim()}
            className="px-5 py-2.5 rounded-lg bg-[#009eda] text-white text-[13px] font-semibold hover:bg-[#0089c4] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
            {isInvoice ? 'Submit request' : `Pay $${bundle.cost} & add ${bundle.credits.toLocaleString()} credits`}
          </button>
        </div>

        {topUpStatus && (
          <div className={`mt-3 rounded-lg p-3 text-[12px] flex items-start gap-2 ${topUpStatus.kind === 'ok' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-[#009eda]/8 text-[#0089c4] border border-[#009eda]/20'}`}>
            {topUpStatus.kind === 'ok' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <MailCheck className="w-4 h-4 shrink-0" />}
            <span>{topUpStatus.msg}</span>
          </div>
        )}
      </Card>

      {/* Auto top-up */}
      <Card>
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#009eda]/8 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-[#009eda]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h4 className="text-[13px] font-semibold text-gray-900">Auto top-up</h4>
              <Toggle on={autoTopUp.enabled} onChange={() => setAutoTopUp(s => ({ ...s, enabled: !s.enabled }))} />
            </div>
            <p className="text-[12px] text-gray-500 mt-0.5">Never run out. When your balance drops below the threshold, we add credits automatically.</p>
            {invoiceCustomer && (
              <p className="text-[11px] text-amber-700 mt-1 inline-flex items-center gap-1">
                <Info className="w-3 h-3" /> Requires good standing, satisfied PO, and available credit line.
              </p>
            )}
          </div>
        </div>
        {autoTopUp.enabled && (
          <div className="mt-4 grid grid-cols-2 gap-4">
            <Field label="Threshold (credits)">
              <select value={autoTopUp.threshold} onChange={e => setAutoTopUp(s => ({ ...s, threshold: Number(e.target.value) }))}
                className="w-full px-2.5 py-1.5 rounded-md border border-black/[0.12] text-[12px] bg-white">
                {[250, 500, 1000, 2000].map(v => <option key={v} value={v}>{v} credits</option>)}
              </select>
            </Field>
            <Field label="Top-up amount">
              <select value={autoTopUp.bundleIdx} onChange={e => setAutoTopUp(s => ({ ...s, bundleIdx: Number(e.target.value) }))}
                className="w-full px-2.5 py-1.5 rounded-md border border-black/[0.12] text-[12px] bg-white">
                {TOP_UP_BUNDLES.map((b, i) => <option key={b.label} value={i}>{b.credits.toLocaleString()} credits — ${b.cost}</option>)}
              </select>
            </Field>
          </div>
        )}
      </Card>

      {/* Invoice/PO top-up history */}
      {invoiceCustomer && (
        <Card>
          <h4 className="text-[13px] font-semibold text-gray-900 mb-3">Invoice / PO top-up requests</h4>
          <ul className="divide-y divide-black/[0.06]">
            {topUpRequests.map(r => (
              <li key={r.id} className="py-3 grid grid-cols-[1fr_auto_auto_auto] gap-3 items-center text-[12px]">
                <div>
                  <p className="text-gray-900">{r.id} · {r.credits.toLocaleString()} credits</p>
                  <p className="text-[10.5px] text-gray-400">{r.date} · {r.po} · {r.notes}</p>
                </div>
                <span className="text-gray-700 tabular-nums">${r.cost}</span>
                <RequestStatus status={r.status} />
                <button className="text-[11px] text-[#009eda] hover:text-[#0089c4] cursor-pointer">Details</button>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}

/* ── Usage / ledger tab ───────────────────────────────────────── */

function UsageTab({ ledger, ledgerFilter, setLedgerFilter }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-[13px] font-semibold text-gray-900">Credit ledger</h4>
        <div className="flex items-center gap-1">
          {[
            { id: 'all',    label: 'All' },
            { id: 'grant',  label: 'Grants' },
            { id: 'topup',  label: 'Top-ups' },
            { id: 'usage',  label: 'Usage' },
            { id: 'expire', label: 'Expirations' },
            { id: 'adjust', label: 'Adjustments' },
          ].map(f => (
            <button key={f.id} onClick={() => setLedgerFilter(f.id)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium cursor-pointer transition-colors ${ledgerFilter === f.id ? 'bg-[#009eda] text-white' : 'text-gray-500 hover:bg-black/[0.04]'}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>
      <div className="rounded-xl border border-black/[0.08] bg-white overflow-hidden">
        <div className="grid grid-cols-[100px_120px_1fr_120px_110px_30px] text-[10px] uppercase tracking-wider text-gray-400 font-semibold px-4 py-2 border-b border-black/[0.06] bg-gray-50/60">
          <span>Date</span><span>Type</span><span>Source</span><span>Amount</span><span>Balance</span><span></span>
        </div>
        <ul>
          {ledger.length === 0 && <li className="px-4 py-8 text-center text-[12px] text-gray-400">No entries.</li>}
          {ledger.map(e => <LedgerRow key={e.id} e={e} />)}
        </ul>
      </div>
      <p className="text-[11px] text-gray-400">Every grant and consumption is traced to its source. Export available on request.</p>
    </div>
  )
}

function LedgerRow({ e, compact }) {
  const positive = e.amount > 0
  const typeBadge = {
    grant:  { label: 'Grant',     tone: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
    topup:  { label: 'Top-up',    tone: 'bg-[#009eda]/8 text-[#0089c4] border-[#009eda]/20' },
    usage:  { label: 'Usage',     tone: 'bg-gray-100 text-gray-700 border-gray-200' },
    expire: { label: 'Expired',   tone: 'bg-amber-50 text-amber-700 border-amber-100' },
    adjust: { label: 'Adjusted',  tone: 'bg-violet-50 text-violet-700 border-violet-100' },
  }[e.type] || { label: e.type, tone: 'bg-gray-100 text-gray-700 border-gray-200' }
  if (compact) {
    return (
      <li className="py-2 flex items-center gap-3 text-[12px]">
        {positive ? <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> : <ArrowDownRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />}
        <div className="min-w-0 flex-1">
          <p className="text-gray-900 truncate">{e.source}</p>
          <p className="text-[10.5px] text-gray-400 truncate">{e.date} · {e.who}</p>
        </div>
        <span className={`tabular-nums ${positive ? 'text-emerald-600' : 'text-gray-700'}`}>{positive ? '+' : ''}{e.amount.toLocaleString()}</span>
      </li>
    )
  }
  return (
    <li className="grid grid-cols-[100px_120px_1fr_120px_110px_30px] items-center px-4 py-2.5 border-b border-black/[0.04] last:border-b-0 text-[12px] hover:bg-gray-50/60">
      <span className="text-gray-500 tabular-nums">{e.date}</span>
      <span><span className={`inline-block px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider border ${typeBadge.tone}`}>{typeBadge.label}</span></span>
      <div className="min-w-0">
        <p className="text-gray-900 truncate">{e.source}</p>
        <p className="text-[10.5px] text-gray-400 truncate">{e.note} · {e.who}{e.invoiceId ? ` · ${e.invoiceId}` : ''}</p>
      </div>
      <span className={`tabular-nums ${positive ? 'text-emerald-600' : 'text-gray-700'}`}>{positive ? '+' : ''}{e.amount.toLocaleString()}</span>
      <span className="tabular-nums text-gray-700">{e.runningBalance.toLocaleString()}</span>
      <button className="p-1 rounded hover:bg-black/[0.06] text-gray-400 cursor-pointer" title="Details"><ChevronRight className="w-3.5 h-3.5" /></button>
    </li>
  )
}

/* ── Invoices tab ─────────────────────────────────────────────── */

function InvoicesTab({ invoices, invoiceCustomer, topUpRequests }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-[13px] font-semibold text-gray-900">Invoices & receipts</h4>
        <button className="inline-flex items-center gap-1.5 text-[11px] text-gray-600 hover:text-gray-900 border border-black/[0.12] px-3 py-1.5 rounded-lg cursor-pointer">
          <Download className="w-3 h-3" /> Export all
        </button>
      </div>
      <div className="rounded-xl border border-black/[0.08] bg-white overflow-hidden">
        <div className="grid grid-cols-[140px_120px_1fr_100px_110px_120px_30px] text-[10px] uppercase tracking-wider text-gray-400 font-semibold px-4 py-2 border-b border-black/[0.06] bg-gray-50/60">
          <span>Invoice</span><span>Date</span><span>Type / PO</span><span>Amount</span><span>Status</span><span>Credits</span><span></span>
        </div>
        <ul>
          {invoices.map(i => (
            <li key={i.id} className="grid grid-cols-[140px_120px_1fr_100px_110px_120px_30px] items-center px-4 py-2.5 border-b border-black/[0.04] last:border-b-0 text-[12px] hover:bg-gray-50/60">
              <span className="text-gray-900">{i.id}</span>
              <span className="text-gray-500 tabular-nums">{i.date}</span>
              <span className="text-gray-700 truncate">{i.type}{i.po ? <span className="text-gray-400"> · {i.po}</span> : null}</span>
              <span className="text-gray-900 tabular-nums">${i.amount}</span>
              <span><InvoiceStatus status={i.status} /></span>
              <span className="text-gray-500 text-[11px]">{i.creditsPending ? `${i.creditsPending.toLocaleString()} pending` : i.status === 'paid' ? 'Granted' : '—'}</span>
              <button className="p-1 rounded hover:bg-black/[0.06] text-gray-400 cursor-pointer" title="Download"><Download className="w-3.5 h-3.5" /></button>
            </li>
          ))}
        </ul>
      </div>
      {invoiceCustomer && (
        <p className="text-[11px] text-gray-500">Invoice top-up requests are tracked under <span className="font-medium">Top up → Invoice / PO requests</span>.</p>
      )}
    </div>
  )
}

/* ── Admin tab ────────────────────────────────────────────────── */

function AdminTab({ admin, setAdmin }) {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-[12px] text-amber-800">
        <Lock className="w-4 h-4 shrink-0 mt-0.5" />
        <span><span className="font-semibold">Finance-sensitive.</span> Changes here affect how this account is billed and how credits become available. All edits are recorded in the audit log.</span>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <h4 className="text-[13px] font-semibold text-gray-900 mb-3">Payment rail</h4>
          <div className="space-y-3">
            <Field label="Primary rail">
              <select value={admin.paymentRail} onChange={e => setAdmin(s => ({ ...s, paymentRail: e.target.value }))}
                className="w-full px-2.5 py-1.5 rounded-md border border-black/[0.12] text-[12px] bg-white">
                {['card', 'ach', 'invoice', 'po', 'annual-contract'].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </Field>
            <Field label="Invoice billing">
              <Toggle on={admin.invoiceEnabled} onChange={() => setAdmin(s => ({ ...s, invoiceEnabled: !s.invoiceEnabled }))} label={admin.invoiceEnabled ? 'Enabled' : 'Disabled'} />
            </Field>
            <Field label="Payment terms">
              <select value={admin.paymentTerms} onChange={e => setAdmin(s => ({ ...s, paymentTerms: e.target.value }))}
                className="w-full px-2.5 py-1.5 rounded-md border border-black/[0.12] text-[12px] bg-white">
                {PAYMENT_TERMS.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </Field>
          </div>
        </Card>

        <Card>
          <h4 className="text-[13px] font-semibold text-gray-900 mb-3">Purchase orders</h4>
          <div className="space-y-3">
            <Field label="PO required for top-ups">
              <Toggle on={admin.poRequired} onChange={() => setAdmin(s => ({ ...s, poRequired: !s.poRequired }))} label={admin.poRequired ? 'Required' : 'Optional'} />
            </Field>
            <Field label="Default PO number">
              <input value={admin.defaultPO} onChange={e => setAdmin(s => ({ ...s, defaultPO: e.target.value }))}
                className="w-full px-2.5 py-1.5 rounded-md border border-black/[0.12] text-[12px] bg-white" />
            </Field>
            <p className="text-[10.5px] text-gray-400">Pre-fills the PO field on every invoice top-up request.</p>
          </div>
        </Card>

        <Card>
          <h4 className="text-[13px] font-semibold text-gray-900 mb-3">Credit grant policy</h4>
          <div className="space-y-2">
            {GRANT_POLICIES.map(g => (
              <label key={g.id} className="flex items-start gap-2 cursor-pointer">
                <input type="radio" name="grantPolicy" checked={admin.grantPolicy === g.id} onChange={() => setAdmin(s => ({ ...s, grantPolicy: g.id }))} className="mt-1" />
                <span>
                  <span className="text-[12px] font-medium text-gray-900 block">{g.label}</span>
                  <span className="text-[11px] text-gray-500">{g.desc}</span>
                </span>
              </label>
            ))}
          </div>
        </Card>

        <Card>
          <h4 className="text-[13px] font-semibold text-gray-900 mb-3">Credit limit & collections</h4>
          <div className="space-y-3">
            <Field label="Credit limit (USD)">
              <input type="number" value={admin.creditLimit} onChange={e => setAdmin(s => ({ ...s, creditLimit: Number(e.target.value) }))}
                className="w-full px-2.5 py-1.5 rounded-md border border-black/[0.12] text-[12px] bg-white" />
            </Field>
            <Field label="Collections status">
              <div className="flex flex-wrap gap-1.5">
                {COLLECTIONS_STATES.map(s => {
                  const active = admin.collections === s.id
                  const tone = s.tone === 'emerald' ? (active ? 'bg-emerald-600 text-white' : 'border-emerald-200 text-emerald-700')
                              : s.tone === 'amber' ? (active ? 'bg-amber-500 text-white' : 'border-amber-200 text-amber-700')
                              : (active ? 'bg-red-600 text-white' : 'border-red-200 text-red-700')
                  return (
                    <button key={s.id} onClick={() => setAdmin(a => ({ ...a, collections: s.id }))}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-medium border cursor-pointer ${tone} ${active ? '' : 'bg-white'}`}>
                      {s.label}
                    </button>
                  )
                })}
              </div>
            </Field>
          </div>
        </Card>
      </div>

      <Card>
        <h4 className="text-[13px] font-semibold text-gray-900 mb-3">Manual credit adjustment</h4>
        <ManualAdjust />
      </Card>
    </div>
  )
}

function ManualAdjust() {
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('goodwill')
  const [note, setNote] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [logged, setLogged] = useState(false)
  const submit = () => {
    if (!amount || !note.trim()) return
    setLogged(true)
    setTimeout(() => { setLogged(false); setAmount(''); setNote(''); setConfirmed(false) }, 2200)
  }
  return (
    <div className="grid grid-cols-[120px_160px_1fr_auto] gap-3 items-end">
      <Field label="Amount (credits)">
        <input value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. +250 or -100" type="text"
          className="w-full px-2.5 py-1.5 rounded-md border border-black/[0.12] text-[12px] bg-white" />
      </Field>
      <Field label="Reason code">
        <select value={reason} onChange={e => setReason(e.target.value)}
          className="w-full px-2.5 py-1.5 rounded-md border border-black/[0.12] text-[12px] bg-white">
          <option value="goodwill">Goodwill</option>
          <option value="correction">Correction</option>
          <option value="promo">Promotion</option>
          <option value="migration">Migration</option>
          <option value="other">Other</option>
        </select>
      </Field>
      <Field label="Note (required)">
        <input value={note} onChange={e => setNote(e.target.value)} placeholder="Ticket # or short explanation"
          className="w-full px-2.5 py-1.5 rounded-md border border-black/[0.12] text-[12px] bg-white" />
      </Field>
      <label className="flex items-center gap-2 text-[11px] text-gray-700 mb-1.5">
        <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />
        Confirm
      </label>
      <div className="col-span-4 flex items-center justify-between">
        <p className="text-[10.5px] text-gray-400">This adjustment will appear in the customer's ledger with the reason code and your name.</p>
        <button onClick={submit} disabled={!amount || !note.trim() || !confirmed}
          className="px-4 py-2 rounded-lg bg-gray-900 text-white text-[12px] font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:bg-black">
          Apply adjustment
        </button>
      </div>
      {logged && (
        <div className="col-span-4 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-[12px] text-emerald-800 inline-flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> Adjustment logged. Customer ledger updated.
        </div>
      )}
    </div>
  )
}

/* ── Small primitives ─────────────────────────────────────────── */

function Card({ children }) {
  return <div className="rounded-xl border border-black/[0.08] bg-white p-5 flex flex-col">{children}</div>
}

function AlertStack({ children }) {
  const kids = (Array.isArray(children) ? children : [children]).filter(Boolean)
  if (kids.length === 0) return null
  return <div className="space-y-2">{kids}</div>
}

function Alert({ tone = 'info', icon: Icon, title, body, cta }) {
  const tones = {
    red:   'bg-red-50 border-red-200 text-red-800',
    amber: 'bg-amber-50 border-amber-200 text-amber-800',
    info:  'bg-[#009eda]/8 border-[#009eda]/20 text-[#0089c4]',
  }
  return (
    <div className={`rounded-lg border px-3 py-2 flex items-center gap-3 text-[12.5px] ${tones[tone]}`}>
      <Icon className="w-4 h-4 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="font-semibold">{title}</p>
        <p className="text-[11.5px] opacity-90">{body}</p>
      </div>
      {cta && (
        <button onClick={cta.onClick} className="text-[11.5px] font-semibold underline-offset-2 hover:underline cursor-pointer shrink-0">
          {cta.label}
        </button>
      )}
    </div>
  )
}

function Toggle({ on, onChange, label }) {
  return (
    <button onClick={onChange} className="inline-flex items-center gap-2 cursor-pointer">
      <span className="relative rounded-full transition-colors" style={{ height: 18, width: 32, backgroundColor: on ? '#009eda' : '#e5e7eb' }}>
        <span className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-4' : 'translate-x-0.5'}`} />
      </span>
      {label && <span className="text-[11.5px] text-gray-600">{label}</span>}
    </button>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-[10.5px] font-medium text-gray-400 uppercase tracking-wider mb-1">{label}</label>
      {children}
    </div>
  )
}

function InvoiceStatus({ status }) {
  const map = {
    paid:      { label: 'Paid',       tone: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    invoiced:  { label: 'Invoiced',   tone: 'bg-[#009eda]/10 text-[#0089c4] border-[#009eda]/20' },
    pending:   { label: 'Pending',    tone: 'bg-gray-100 text-gray-700 border-gray-200' },
    overdue:   { label: 'Overdue',    tone: 'bg-red-50 text-red-700 border-red-200' },
    requested: { label: 'Requested',  tone: 'bg-violet-50 text-violet-700 border-violet-200' },
    completed: { label: 'Completed',  tone: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    rejected:  { label: 'Rejected',   tone: 'bg-red-50 text-red-700 border-red-200' },
  }[status] || { label: status, tone: 'bg-gray-100 text-gray-700 border-gray-200' }
  return <span className={`inline-block px-2 py-0.5 rounded-full text-[10.5px] uppercase tracking-wider font-semibold border ${map.tone}`}>{map.label}</span>
}

function RequestStatus({ status }) { return <InvoiceStatus status={status} /> }

function CollectionsBadge({ status }) {
  const map = COLLECTIONS_STATES.find(s => s.id === status) || { label: status, tone: 'emerald' }
  const tone = map.tone === 'emerald' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : map.tone === 'amber' ? 'bg-amber-50 text-amber-700 border-amber-200'
              : 'bg-red-50 text-red-700 border-red-200'
  return <span className={`inline-block px-2 py-0.5 rounded-full text-[10.5px] uppercase tracking-wider font-semibold border ${tone}`}>{map.label}</span>
}
