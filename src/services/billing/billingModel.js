/**
 * Billing view model — normalized account state for the Billing UI.
 *
 * Design rules this module enforces:
 *
 * 1. The UI is shaped by `paymentRail` ('card_or_ach' | 'invoice_or_po'),
 *    not by one universal template. Tab visibility comes from
 *    `tabVisibility()` — components never infer rail behavior from
 *    scattered fields.
 *
 * 2. The credit LEDGER is the single source of truth. Wallet bucket
 *    balances, plan usage, overage, and the headline available total
 *    are all DERIVED from ledger rows, so Overview, Usage & Ledger,
 *    and the reconciliation summary tie out by construction.
 *
 * 3. One pricing function (`rateFor`/`priceFor`) serves both payment
 *    rails (Option A: unified volume pricing). PO/invoice requests are
 *    priced on the same schedule as card checkout.
 *
 * 4. Credit consumption order: plan → promotional/expiring → top-up →
 *    adjustment → legacy. When nothing remains: card/ACH prompts a
 *    top-up; invoice/PO creates invoiceable overage.
 */

/* ── Pricing (Option A: unified volume schedule) ─────────────── */

export const PRICING = {
  currency: 'USD',
  baseRate: 0.01, // public baseline $/credit
  tiers: [
    { min: 25000, rate: 0.0080 },
    { min: 10000, rate: 0.0085 },
    { min: 5000,  rate: 0.0090 },
    { min: 2500,  rate: 0.0096 },
    { min: 0,     rate: 0.0100 },
  ],
}

export function rateFor(credits) {
  return PRICING.tiers.find(t => credits >= t.min).rate
}

export function priceFor(credits) {
  return Math.round(credits * rateFor(credits) * 100) / 100
}

export function savingsPct(credits) {
  return Math.round((1 - rateFor(credits) / PRICING.baseRate) * 100)
}

/* Public packages — labels/badges derive from the same schedule.
 * "Best value" goes to the highest real savings; no badge without a
 * product reason. */
export function creditPackages() {
  const sizes = [500, 1000, 2500, 5000, 10000]
  const maxSave = Math.max(...sizes.map(savingsPct))
  return sizes.map(credits => {
    const save = savingsPct(credits)
    return {
      credits,
      price: priceFor(credits),
      rate: rateFor(credits),
      save,                      // 0 when no real savings
      bestValue: save === maxSave && save > 0,
    }
  })
}

/* ── Ledger construction ─────────────────────────────────────── */

export const CONSUMPTION_ORDER = ['plan', 'promotional', 'top_up', 'adjustment', 'legacy']

/* Rows in: { date, event, source, bucket, delta, ref?, actor? }
 * Rows out add runningWallet + runningBucket, computed in order. */
export function buildLedger(rows) {
  let wallet = 0
  const buckets = {}
  return rows.map(r => {
    wallet += r.delta
    buckets[r.bucket] = (buckets[r.bucket] || 0) + r.delta
    return { ...r, runningWallet: wallet, runningBucket: buckets[r.bucket] }
  })
}

/* Wallet derived entirely from the ledger.
 *
 * Bucket accounting follows the consumption order — once the plan
 * bucket is exhausted, further usage rows are charged to the bucket
 * they actually drew from (top_up, etc.). The plan meter, however,
 * reports TOTAL cycle usage against the grant so overage is never
 * hidden: usedThisCycle can exceed grantThisCycle. */
export function walletFromLedger(ledger, { planGrant }) {
  const sum = (pred) => ledger.filter(pred).reduce((s, r) => s + r.delta, 0)
  const bucketBal = (b) => sum(r => r.bucket === b)
  const totalUsed = -sum(r => r.event === 'usage')
  const planBucketUsed = -sum(r => r.bucket === 'plan' && r.event === 'usage')
  const planRemaining = Math.max(0, planGrant - planBucketUsed)
  const overage = Math.max(0, totalUsed - planGrant)
  const availableTotal = ledger.length ? ledger[ledger.length - 1].runningWallet : 0
  return {
    availableTotal,
    plan: { grantThisCycle: planGrant, usedThisCycle: totalUsed, remaining: planRemaining, overage },
    topUp: { available: bucketBal('top_up') },
    adjustments: { available: bucketBal('adjustment') },
    legacy: { available: bucketBal('legacy') },
    promotional: { available: bucketBal('promotional') },
  }
}

/* Reconciliation summary — categories sum exactly to availableTotal. */
export function reconciliationSummary(ledger) {
  const sum = (pred) => ledger.filter(pred).reduce((s, r) => s + r.delta, 0)
  const out = {
    planGrants: sum(r => r.event === 'grant'),
    topUps: sum(r => r.event === 'top_up'),
    adjustments: sum(r => r.event === 'adjustment'),
    legacyMigrations: sum(r => r.event === 'migration'),
    promotionalGrants: sum(r => r.event === 'promo_grant'),
    usage: sum(r => r.event === 'usage'),
    expirations: sum(r => r.event === 'expiration'),
    reversals: sum(r => r.event === 'reversal'),
  }
  out.total = Object.values(out).reduce((s, v) => s + v, 0)
  return out
}

/* Plan meter state — never hides overage. */
export function planMeterState(plan) {
  if (plan.usedThisCycle > plan.grantThisCycle) return 'overage'
  if (plan.usedThisCycle === plan.grantThisCycle) return 'exhausted'
  return 'normal'
}

/* ── Tab visibility matrix ───────────────────────────────────── */

const ADMIN_ROLES = ['owner', 'admin', 'finance_admin']

export function tabVisibility(account) {
  const card = account.paymentRail === 'card_or_ach'
  const invoice = account.paymentRail === 'invoice_or_po'
  return {
    overview: true,
    plans: true,
    topUp: true,
    usageLedger: true,
    invoices: invoice && account.invoicesEnabled,
    paymentsReceipts: card && (account.receipts?.length > 0),
    admin: account.tier === 'enterprise' && ADMIN_ROLES.includes(account.role),
  }
}

/* ── Manual adjustment validation ────────────────────────────── */

export const ADJUSTMENT_REASON_CODES = [
  'service_credit', 'billing_correction', 'refund_reversal',
  'migration_correction', 'contract_adjustment', 'promotional_grant', 'other',
]

export const ADJUSTMENT_THRESHOLDS = {
  amountRequiringApproval: 1000,
}

export function validateAdjustment({ direction, amount, bucket, reasonCode, reference, internalNote }, account) {
  const errors = []
  const amt = Number(amount)
  if (!direction || !['add', 'remove'].includes(direction)) errors.push('Direction is required.')
  if (!amt || amt <= 0 || !Number.isFinite(amt)) errors.push('Amount must be a positive number.')
  if (!bucket || !['plan', 'top_up', 'adjustment', 'legacy', 'promotional'].includes(bucket)) errors.push('Bucket is required.')
  if (!reasonCode || !ADJUSTMENT_REASON_CODES.includes(reasonCode)) errors.push('Reason code is required.')
  if (!reference || !reference.trim()) errors.push('A reference (ticket, invoice, contract, or approval ID) is required.')
  if (!internalNote || !internalNote.trim()) errors.push('An internal note is required.')
  const requiresSecondApproval =
    amt > ADJUSTMENT_THRESHOLDS.amountRequiringApproval ||
    direction === 'remove' ||
    account?.tier === 'enterprise'
  return { ok: errors.length === 0, errors, requiresSecondApproval }
}

export function buildAdjustmentEntry({ direction, amount, bucket, reasonCode, reference, internalNote, customerNote, approvalId, actor, account, oldBalance }) {
  const amt = Number(amount)
  const delta = direction === 'remove' ? -amt : amt
  return {
    id: `adj-${Date.now()}`,
    date: new Date().toISOString().slice(0, 10),
    event: 'adjustment',
    source: 'manual_admin_adjustment',
    bucket,
    delta,
    ref: reference,
    actor,
    audit: {
      accountId: account.accountId,
      actorId: actor,
      timestamp: new Date().toISOString(),
      oldBalance,
      newBalance: oldBalance + delta,
      amount: amt,
      direction,
      bucket,
      reasonCode,
      internalNote,
      customerNote: customerNote || null,
      approvalId: approvalId || null,
      source: 'manual_admin_adjustment',
    },
  }
}

/* ── Demo accounts (every number derived from the ledger) ────── */

function account(base, ledgerRows, planGrant) {
  const ledger = buildLedger(ledgerRows)
  const creditWallet = walletFromLedger(ledger, { planGrant })
  return { ...base, ledger, creditWallet, tabs: tabVisibility({ ...base }) }
}

export function getDemoAccount(key) {
  switch (key) {
    /* Standard · card/ACH · over-consumed plan covered by top-ups */
    case 'standard-card': return account({
      accountId: 'acct-std-01', accountName: 'Meridian Capital',
      tier: 'standard', role: 'owner',
      paymentRail: 'card_or_ach', billingStatus: 'active',
      cardTopUpsEnabled: true, achEnabled: true, autoTopUpEnabled: false,
      invoiceTopUpsEnabled: false, invoicesEnabled: false,
      hasOpenInvoices: false, hasPastDueInvoices: false,
      netTerms: null, poNumber: null,
      cardExpiresSoon: false, lastPaymentFailed: false,
      expiring: null,
      pricingPolicy: { type: 'public_packages', baselinePricePerCredit: PRICING.baseRate, contractPricePerCredit: null, currency: 'USD' },
      overagePolicy: 'draw_from_top_up', // plan exhausted → top-up credits cover it
      receipts: [
        { id: 'RCP-1042', date: '2026-05-21', type: 'Credit top-up', amount: 24, method: 'Visa •••• 4242', status: 'paid' },
        { id: 'RCP-1038', date: '2026-05-01', type: 'Subscription',  amount: 20, method: 'Visa •••• 4242', status: 'paid' },
        { id: 'RCP-1031', date: '2026-04-01', type: 'Subscription',  amount: 20, method: 'Visa •••• 4242', status: 'paid' },
      ],
      invoices: [], topUpRequests: [],
    }, [
      { date: '2026-05-01', event: 'grant',  source: 'Monthly plan grant',        bucket: 'plan',   delta: +1000, ref: 'RCP-1038', actor: 'system' },
      { date: '2026-05-06', event: 'usage',  source: 'Q3 Earnings Report — JA',   bucket: 'plan',   delta: -612,  actor: 'Hana Ito' },
      { date: '2026-05-21', event: 'top_up', source: 'Top-up — card',             bucket: 'top_up', delta: +2500, ref: 'RCP-1042', actor: 'Alex Chen' },
      { date: '2026-05-24', event: 'usage',  source: 'Product Launch DE',         bucket: 'plan',   delta: -388,  actor: 'Marcus Weber' },
      // Plan bucket exhausted at 1,000 — per consumption order, this
      // usage draws from the top-up bucket. Meter still reports total
      // cycle usage (2,104 of 1,000) so the overage is visible.
      { date: '2026-05-28', event: 'usage',  source: 'Annual Report',             bucket: 'top_up', delta: -1104, actor: 'Sarah Chen', note: 'Plan exhausted — drawn from top-up balance' },
    ], 1000)

    /* Pro/Team · card/ACH · normal consumption, auto top-up on */
    case 'proteam-card': return account({
      accountId: 'acct-team-01', accountName: 'Meridian Capital',
      tier: 'pro_team', role: 'admin',
      paymentRail: 'card_or_ach', billingStatus: 'active',
      cardTopUpsEnabled: true, achEnabled: true, autoTopUpEnabled: true,
      invoiceTopUpsEnabled: false, invoicesEnabled: false,
      hasOpenInvoices: false, hasPastDueInvoices: false,
      netTerms: null, poNumber: null,
      cardExpiresSoon: true, lastPaymentFailed: false,
      expiring: null,
      pricingPolicy: { type: 'public_packages', baselinePricePerCredit: PRICING.baseRate, contractPricePerCredit: null, currency: 'USD' },
      overagePolicy: 'draw_from_top_up',
      receipts: [
        { id: 'RCP-2011', date: '2026-05-18', type: 'Credit top-up', amount: 10,  method: 'Amex •••• 1005', status: 'paid' },
        { id: 'RCP-2008', date: '2026-05-01', type: 'Subscription',  amount: 100, method: 'Amex •••• 1005', status: 'paid' },
        { id: 'RCP-2003', date: '2026-04-01', type: 'Subscription',  amount: 100, method: 'Amex •••• 1005', status: 'paid' },
      ],
      invoices: [], topUpRequests: [],
    }, [
      { date: '2026-05-01', event: 'grant',  source: 'Monthly plan grant',      bucket: 'plan',   delta: +5000, ref: 'RCP-2008', actor: 'system' },
      { date: '2026-05-08', event: 'usage',  source: 'Q3 Earnings Report — JA', bucket: 'plan',   delta: -612,  actor: 'Hana Ito' },
      { date: '2026-05-18', event: 'top_up', source: 'Auto top-up — card',      bucket: 'top_up', delta: +1000, ref: 'RCP-2011', actor: 'system' },
      { date: '2026-05-26', event: 'usage',  source: 'FY26 Annual Report',      bucket: 'plan',   delta: -1492, actor: 'Sarah Chen' },
    ], 5000)

    /* Enterprise · invoice/PO · Net 30, PO required, past-due invoice */
    case 'enterprise-invoice': return account({
      accountId: 'acct-ent-01', accountName: 'Meridian Capital Ltd.',
      tier: 'enterprise', role: 'finance_admin',
      paymentRail: 'invoice_or_po', billingStatus: 'active',
      cardTopUpsEnabled: false, achEnabled: false, autoTopUpEnabled: false,
      invoiceTopUpsEnabled: true, invoicesEnabled: true,
      hasOpenInvoices: true, hasPastDueInvoices: true,
      netTerms: 'Net 30', poNumber: 'PO-2026-018', poRequired: true,
      grantPolicy: 'on-finalization',
      cardExpiresSoon: false, lastPaymentFailed: false,
      expiring: { amount: 300, expiresAt: '2026-06-30', type: 'promotional' },
      pricingPolicy: { type: 'public_packages', baselinePricePerCredit: PRICING.baseRate, contractPricePerCredit: null, currency: 'USD' },
      overagePolicy: 'invoiceable_overage',
      receipts: [],
      invoices: [
        { id: 'INV-2026-008', date: '2026-06-01', type: 'Subscription', amount: 4000, po: 'PO-2026-018', status: 'open',     dueDate: '2026-07-01' },
        { id: 'INV-2026-007', date: '2026-05-15', type: 'Credit top-up', amount: priceFor(25000), po: 'PO-2026-021', status: 'open', dueDate: '2026-06-14', creditsPending: 0 },
        { id: 'INV-2026-006', date: '2026-05-01', type: 'Credit top-up', amount: priceFor(5000), po: 'PO-2026-019', status: 'past_due', dueDate: '2026-05-31' },
        { id: 'INV-2026-005', date: '2026-05-01', type: 'Subscription', amount: 4000, po: 'PO-2026-018', status: 'paid',     dueDate: '2026-05-31' },
        { id: 'INV-2026-004', date: '2026-04-01', type: 'Subscription', amount: 4000, po: 'PO-2026-012', status: 'paid',     dueDate: '2026-05-01' },
      ],
      topUpRequests: [
        { id: 'TR-1031', date: '2026-05-15', credits: 25000, cost: priceFor(25000), rate: rateFor(25000), po: 'PO-2026-021', status: 'invoiced',  notes: 'Credits granted on finalization · awaiting payment (Net 30)' },
        { id: 'TR-1029', date: '2026-04-30', credits: 5000,  cost: priceFor(5000),  rate: rateFor(5000),  po: 'PO-2026-019', status: 'past_due',  notes: 'Invoice past due since May 31' },
        { id: 'TR-1024', date: '2026-04-12', credits: 10000, cost: priceFor(10000), rate: rateFor(10000), po: 'PO-2026-014', status: 'completed', notes: 'Credits granted Apr 14' },
      ],
    }, [
      { date: '2026-04-20', event: 'migration',  source: 'Legacy migration — PO-2025-098', bucket: 'legacy',      delta: +840,   ref: 'MIG-0042', actor: 'system' },
      { date: '2026-05-01', event: 'grant',      source: 'Monthly plan grant',             bucket: 'plan',        delta: +50000, ref: 'INV-2026-005', actor: 'system' },
      { date: '2026-05-04', event: 'promo_grant',source: 'Promotional credit — Q2 pilot',  bucket: 'promotional', delta: +300,   ref: 'PROMO-Q2', actor: 'system' },
      { date: '2026-05-09', event: 'usage',      source: 'Q3 Earnings Report — JA',        bucket: 'plan',        delta: -1200,  actor: 'Hana Ito' },
      { date: '2026-05-16', event: 'top_up',     source: 'PO top-up — TR-1031 (partial grant)', bucket: 'top_up', delta: +2500,  ref: 'INV-2026-007', actor: 'system' },
      { date: '2026-05-22', event: 'usage',      source: 'BaFin Filing Translation — DE',  bucket: 'plan',        delta: -904,   actor: 'Klaus Berger' },
      { date: '2026-05-27', event: 'adjustment', source: 'Manual adjustment — billing correction', bucket: 'adjustment', delta: +250, ref: 'TICKET-1234', actor: 'arbitr Finance' },
    ], 50000)

    /* Enterprise · card/ACH (supported; no invoices issued) */
    case 'enterprise-card': return account({
      accountId: 'acct-ent-02', accountName: 'Meridian Capital Ltd.',
      tier: 'enterprise', role: 'finance_admin',
      paymentRail: 'card_or_ach', billingStatus: 'active',
      cardTopUpsEnabled: true, achEnabled: true, autoTopUpEnabled: true,
      invoiceTopUpsEnabled: false, invoicesEnabled: false,
      hasOpenInvoices: false, hasPastDueInvoices: false,
      netTerms: null, poNumber: null,
      cardExpiresSoon: false, lastPaymentFailed: false,
      expiring: null,
      pricingPolicy: { type: 'public_packages', baselinePricePerCredit: PRICING.baseRate, contractPricePerCredit: null, currency: 'USD' },
      overagePolicy: 'draw_from_top_up',
      receipts: [
        { id: 'RCP-3021', date: '2026-05-12', type: 'Credit top-up', amount: priceFor(2500), method: 'ACH — Chase ••6789', status: 'paid' },
        { id: 'RCP-3015', date: '2026-05-01', type: 'Subscription',  amount: 4000, method: 'ACH — Chase ••6789', status: 'paid' },
      ],
      invoices: [], topUpRequests: [],
    }, [
      { date: '2026-05-01', event: 'grant',  source: 'Monthly plan grant',     bucket: 'plan',   delta: +50000, ref: 'RCP-3015', actor: 'system' },
      { date: '2026-05-10', event: 'usage',  source: 'Q3 Earnings Report — JA',bucket: 'plan',   delta: -2104,  actor: 'Hana Ito' },
      { date: '2026-05-12', event: 'top_up', source: 'Top-up — ACH',           bucket: 'top_up', delta: +2500,  ref: 'RCP-3021', actor: 'Alex Chen' },
    ], 50000)

    default: return getDemoAccount('proteam-card')
  }
}

export const DEMO_ACCOUNT_KEYS = ['standard-card', 'proteam-card', 'enterprise-invoice', 'enterprise-card']
