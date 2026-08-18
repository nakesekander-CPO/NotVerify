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

/* ── Authoritative credit-consumption rule ───────────────────────
 *
 * ONE rule, one allocator. No surface (Overview, ledger, banners,
 * usage processing) may infer its own consumption order.
 *
 *   1. Credits with an explicit expiration date are consumed before
 *      non-expiring credits, soonest expiration first.
 *   2. Within the same expiration date:
 *      promotional → plan → top_up → adjustment → legacy.
 *   3. Once expiring credits are exhausted, non-expiring credits:
 *      plan → top_up → adjustment → legacy.
 *
 * This makes the customer-facing promise TRUE: expiring promotional
 * credits are protected from expiry by being drawn down first. */

const EXPIRING_TIE_ORDER = ['promotional', 'plan', 'top_up', 'adjustment', 'legacy']
const NON_EXPIRING_ORDER = ['plan', 'top_up', 'adjustment', 'legacy', 'promotional']

export const CONSUMPTION_POLICY_TEXT =
  'Credits with the soonest expiry are used first (promotional before plan on the same date); non-expiring credits then follow Plan → Top-up → Adjustments → Legacy.'

/** Kept for compatibility: the non-expiring fallback order. */
export const CONSUMPTION_ORDER = ['plan', 'top_up', 'adjustment', 'legacy']

/**
 * allocateUsageToBuckets — the single allocator.
 *
 * buckets: [{ bucketId, type, availableCredits, expiresAt, sourceReference, eligibleForUsage }]
 * Returns { draws: CreditDraw[], shortfall } — draws sum to at most
 * usageCredits; shortfall > 0 means the wallet could not cover it.
 */
export function allocateUsageToBuckets(usageCredits, availableBuckets) {
  const eligible = (availableBuckets || [])
    .filter(b => b.eligibleForUsage !== false && b.availableCredits > 0)
    .slice()
    .sort((a, b) => {
      const aExp = a.expiresAt != null, bExp = b.expiresAt != null
      if (aExp !== bExp) return aExp ? -1 : 1                  // expiring first
      if (aExp && bExp && a.expiresAt !== b.expiresAt) {
        return a.expiresAt < b.expiresAt ? -1 : 1              // soonest expiry first
      }
      const order = aExp ? EXPIRING_TIE_ORDER : NON_EXPIRING_ORDER
      return order.indexOf(a.type) - order.indexOf(b.type)
    })

  const draws = []
  let remaining = usageCredits
  for (const b of eligible) {
    if (remaining <= 0) break
    const take = Math.min(b.availableCredits, remaining)
    draws.push({
      bucketId: b.bucketId, type: b.type, creditsDrawn: take,
      expiresAt: b.expiresAt ?? null, sourceReference: b.sourceReference ?? null,
    })
    remaining -= take
  }
  return { draws, shortfall: Math.max(0, remaining) }
}

/** Rebuild bucket state from a ledger prefix, for verifying that
 *  recorded usage rows match what the allocator would have drawn. */
export function bucketsFromLedger(rows, { planGrant, expiringMeta = {} }) {
  const byType = {}
  for (const r of rows) byType[r.bucket] = (byType[r.bucket] || 0) + r.delta
  return Object.entries(byType)
    .filter(([, bal]) => bal > 0)
    .map(([type, bal]) => ({
      bucketId: type, type, availableCredits: bal,
      expiresAt: expiringMeta[type] ?? null,
      sourceReference: null, eligibleForUsage: true,
    }))
}

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
  const planBucketUsed = -sum(r => r.bucket === 'plan' && r.event === 'usage')
  // Overage = usage that spilled into non-plan reserves because the
  // plan was exhausted. Promotional draws are NOT overage — under the
  // consumption rule they are consumed first by design, so they never
  // inflate the plan meter.
  const overage = Math.max(0, -sum(r => r.event === 'usage' && ['top_up', 'adjustment', 'legacy'].includes(r.bucket)))
  const usedThisCycle = planBucketUsed + overage
  const planRemaining = Math.max(0, planGrant - planBucketUsed)
  const availableTotal = ledger.length ? ledger[ledger.length - 1].runningWallet : 0
  return {
    availableTotal,
    plan: { grantThisCycle: planGrant, usedThisCycle, remaining: planRemaining, overage },
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

/* ── Plans CTA hierarchy ─────────────────────────────────────────
 *
 * Pure, testable model of the Plans tab button hierarchy:
 *  - the current plan is an active STATE, never a sales CTA
 *  - at most ONE primary filled CTA (the recommended next step up)
 *  - downgrades are always outline/neutral and never self-serve for
 *    enterprise (request_only or not_allowed via downgradePolicy)
 */

const PLAN_ORDER = ['standard', 'plus', 'pro_team', 'enterprise']

export function planCtaModel(tier, { downgradePolicy = 'self_serve' } = {}) {
  const currentIdx = PLAN_ORDER.indexOf(tier)
  return PLAN_ORDER.map((planId, idx) => {
    if (idx === currentIdx) {
      return { planId, emphasis: 'current', label: 'Current plan', ariaLabel: `${planId}, current plan` }
    }
    if (idx > currentIdx) {
      const isNextStep = idx === currentIdx + 1
      const label = planId === 'enterprise' ? 'Contact sales' : `Upgrade to ${planId === 'pro_team' ? 'Team' : 'Plus'}`
      return {
        planId,
        emphasis: isNextStep ? 'primary' : 'outline',
        label,
        ariaLabel: `${planId}, available upgrade`,
      }
    }
    // Downgrade — never primary.
    if (downgradePolicy === 'not_allowed') {
      return { planId, emphasis: 'none', label: 'Contact support', ariaLabel: `${planId}, contact support to change plan` }
    }
    if (downgradePolicy === 'request_only') {
      return { planId, emphasis: 'outline', label: 'Request downgrade', ariaLabel: `${planId}, downgrade by request` }
    }
    return { planId, emphasis: 'outline', label: `Switch to ${planId === 'standard' ? 'Standard' : planId === 'plus' ? 'Plus' : 'Team'}`, ariaLabel: `${planId}, available downgrade option` }
  })
}

/* ── Payment-rail permissions & change control ───────────────────
 *
 * The rail is a billing contract attribute, not a casual toggle.
 * Customers can at most REQUEST a change; only internal finance
 * (arbitr-side) can edit directly, and high-risk changes require
 * approval. The demo environment may expose a clearly-labelled
 * preview switcher; production must not.
 */

export function railPermissions(role, { internalFinance = false } = {}) {
  const adminRoles = ['owner', 'admin', 'finance_admin']
  return {
    canViewPaymentRail: role !== 'viewer' ? true : false,
    canEditPaymentRail: internalFinance === true,
    canRequestPaymentRailChange: adminRoles.includes(role),
    canApprovePaymentRailChange: internalFinance === true,
  }
}

export function validateRailChange({ targetRail, reason, acknowledged }, account) {
  const errors = []
  if (!['card_or_ach', 'invoice_or_po'].includes(targetRail)) errors.push('A target billing arrangement is required.')
  if (targetRail === account.paymentRail) errors.push('The account is already on this billing arrangement.')
  if (!reason || !reason.trim()) errors.push('A reason is required.')
  if (!acknowledged) errors.push('You must acknowledge the impact of this change.')
  // High-risk: open/past-due invoices, or any enterprise account.
  const requiresApproval =
    account.hasOpenInvoices || account.hasPastDueInvoices || account.tier === 'enterprise'
  return { ok: errors.length === 0, errors, requiresApproval }
}

export function buildRailChangeRequest({ targetRail, reason, actor, account, approvalId }) {
  return {
    id: `RC-${Date.now()}`,
    type: 'payment_rail_change',
    accountId: account.accountId,
    fromRail: account.paymentRail,
    toRail: targetRail,
    reason,
    actorId: actor,
    approvalId: approvalId || null,
    status: approvalId ? 'approved' : 'pending_approval',
    timestamp: new Date().toISOString(),
    source: 'payment_rail_change',
  }
}

/* ── Trust Credits — the second wallet ───────────────────────────
 *
 * Trust Credits (human sign-off / trusted-review credits) are a
 * separate currency from Intelligence Credits: their own monthly
 * grant, their own ledger, and their own pricing ($38/credit,
 * 3-for-$110 bundle). They never mix into the IC bucket math, so
 * the IC reconciliation stays exact. */

export const TRUST_PRICING = {
  currency: 'USD',
  perCredit: 38,
  bundle: { credits: 3, price: 110 },
}

export function trustPriceFor(credits) {
  if (credits === TRUST_PRICING.bundle.credits) return TRUST_PRICING.bundle.price
  return credits * TRUST_PRICING.perCredit
}

export function trustWalletFromLedger(rows = []) {
  const sum = (pred) => rows.filter(pred).reduce((s, r) => s + r.delta, 0)
  return {
    grantThisCycle: sum(r => r.event === 'grant'),
    used: -sum(r => r.event === 'usage'),
    available: rows.reduce((s, r) => s + r.delta, 0),
  }
}

/* ── Top-up request validation — PO requirement is an account-level
 *    setting (Admin → Purchase orders), not a hardcoded rule. ───── */

export function validateTopUpRequest({ credits, po }, account) {
  const errors = []
  if (!credits || credits <= 0) errors.push('A credit amount is required.')
  if (account?.poRequired && !(po || '').trim()) errors.push('A PO number is required for this account.')
  return { ok: errors.length === 0, errors }
}

/* ── Combined purchase requests — Intelligence + Trust on one invoice
 *
 * A single invoice/PO request may carry line items of different
 * credit types. Each line is priced on its own schedule (IC volume
 * tiers; Trust $38/credit). One PO, one combined total, one request. */

export function purchaseLineCost(type, credits) {
  return type === 'trust' ? trustPriceFor(credits) : priceFor(credits)
}

export function purchaseRequestTotal(items = []) {
  return Math.round(items.reduce((s, i) => s + purchaseLineCost(i.type, Number(i.credits) || 0), 0) * 100) / 100
}

export function validatePurchaseRequest({ items, po }, account) {
  const errors = []
  const lines = (items || []).filter(i => (Number(i.credits) || 0) > 0)
  if (lines.length === 0) errors.push('Add at least one credit type to the order.')
  if (account?.poRequired && !(po || '').trim()) errors.push('A PO number is required for this account.')
  return { ok: errors.length === 0, errors, lineCount: lines.length }
}

export function buildPurchaseRequest({ items, po, account, id }) {
  const lines = (items || [])
    .filter(i => (Number(i.credits) || 0) > 0)
    .map(i => ({ type: i.type, credits: Number(i.credits), cost: purchaseLineCost(i.type, Number(i.credits)) }))
  return {
    id: id || `PR-${Math.floor(Math.random() * 9000) + 1000}`,
    date: new Date().toISOString().slice(0, 10),
    items: lines,
    cost: purchaseRequestTotal(lines),
    po: (po || '').trim() || null,
    status: 'requested',
    notes: account?.grantPolicy === 'on-finalization'
      ? 'Credits granted when the invoice is finalized'
      : 'Credits granted on payment',
  }
}

/* Normalize legacy single-currency requests to the line-item shape so
 * one list can render IC, Trust, and combined requests uniformly. */
export function normalizeRequest(r, type) {
  if (r.items) return r
  return { ...r, items: [{ type, credits: r.credits, cost: r.cost }] }
}

export const CREDIT_TYPE_LABEL = { intelligence: 'Intelligence Credits', trust: 'Trust Credits' }
export const CREDIT_TYPE_SHORT = { intelligence: 'IC', trust: 'Trust' }

/* Fulfillment — when a combined order is paid/finalized, each line is
 * granted to its OWN wallet: Intelligence lines become top-up rows in
 * the Intelligence ledger; Trust lines become top-up rows in the
 * separate Trust ledger. They never cross. Returns ready-to-append
 * rows per wallet. */
export function purchaseRequestFulfillment(request, { date } = {}) {
  const day = date || new Date().toISOString().slice(0, 10)
  const ref = request.po || request.id
  const icRows = (request.items || [])
    .filter(i => i.type === 'intelligence' && i.credits > 0)
    .map(i => ({
      date: day, event: 'top_up', bucket: 'top_up', delta: i.credits,
      source: `Order ${request.id} — Intelligence Credits`, ref, actor: 'system',
      note: 'Granted from combined order',
    }))
  const trustRows = (request.items || [])
    .filter(i => i.type === 'trust' && i.credits > 0)
    .map(i => ({
      date: day, event: 'top_up', delta: i.credits,
      source: `Order ${request.id} — Trust Credits`, ref,
    }))
  return { icRows, trustRows }
}

/* ── Past-due invoices — one source for banner, button, register ─
 *
 * The banner copy, the "Pay now" button amount, and the pay handler
 * must all derive from the same rows the Invoices register shows.
 * Nothing about the amount is ever hardcoded. */

export function pastDueSummary(invoices = []) {
  const rows = invoices.filter(i => i.status === 'past_due')
  return {
    count: rows.length,
    total: rows.reduce((s, i) => s + i.amount, 0),
    oldestDueDate: rows.length ? rows.reduce((a, b) => (a.dueDate < b.dueDate ? a : b)).dueDate : null,
    ids: rows.map(i => i.id),
  }
}

export function markInvoicesPaid(invoices = [], ids = []) {
  return invoices.map(i => (ids.includes(i.id) ? { ...i, status: 'paid' } : i))
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
  const trustLedger = base.trustLedger || []
  const trustCredits = { ...trustWalletFromLedger(trustLedger), ledger: trustLedger }
  return { ...base, ledger, creditWallet, trustCredits, tabs: tabVisibility({ ...base }) }
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
      downgradePolicy: 'self_serve',
      receipts: [
        { id: 'RCP-1042', date: '2026-05-21', type: 'Credit top-up', amount: 24, method: 'Visa •••• 4242', status: 'paid' },
        { id: 'RCP-1041', date: '2026-05-20', type: 'Credit top-up', amount: 24, method: 'Visa •••• 4242', status: 'failed' },
        { id: 'RCP-1038', date: '2026-05-01', type: 'Subscription',  amount: 20, method: 'Visa •••• 4242', status: 'paid' },
        { id: 'RCP-1035', date: '2026-04-18', type: 'Credit top-up', amount: 10, method: 'Visa •••• 4242', status: 'refunded' },
        { id: 'RCP-1031', date: '2026-04-01', type: 'Subscription',  amount: 20, method: 'Visa •••• 4242', status: 'paid' },
      ],
      invoices: [], topUpRequests: [],
    }, [
      { date: '2026-05-01', event: 'grant',  source: 'Monthly plan grant',        bucket: 'plan',   delta: +1000, ref: 'RCP-1038', actor: 'system' },
      { date: '2026-05-06', event: 'usage',  source: 'Q3 Earnings Report — JA',   bucket: 'plan',   delta: -612,  actor: 'Hana Ito' },
      { date: '2026-05-21', event: 'top_up', source: 'Top-up — card',             bucket: 'top_up', delta: +2500, ref: 'RCP-1042', actor: 'Alex Chen' },
      { date: '2026-05-24', event: 'usage',  source: 'Product Launch DE',         bucket: 'plan',   delta: -388,  actor: 'Marcus Lee' },
      // Plan bucket exhausted at 1,000 — per consumption order, this
      // usage draws from the top-up bucket. Meter still reports total
      // cycle usage (2,104 of 1,000) so the overage is visible.
      { date: '2026-05-28', event: 'usage',  source: 'Annual Report',             bucket: 'top_up', delta: -1104, actor: 'Sarah Jenkins', note: 'Plan exhausted — drawn from top-up balance' },
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
      downgradePolicy: 'self_serve',
      // Trust Credits — Team plan includes 2 / month.
      trustLedger: [
        { date: '2026-05-01', event: 'grant', delta: +2, source: 'Monthly plan grant — Team', ref: 'RCP-2008' },
        { date: '2026-05-20', event: 'usage', delta: -1, source: 'Trusted review — Q3 Earnings Report — JA', actor: 'Hana Ito' },
      ],
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
      { date: '2026-05-26', event: 'usage',  source: 'FY26 Annual Report',      bucket: 'plan',   delta: -1492, actor: 'Sarah Jenkins' },
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
      // Remaining expiring credits — consistent with the ledger: 300
      // granted May 28, 150 already consumed first by May 30 usage.
      expiring: { amount: 150, expiresAt: '2026-06-30', type: 'promotional' },
      pricingPolicy: { type: 'public_packages', baselinePricePerCredit: PRICING.baseRate, contractPricePerCredit: null, currency: 'USD' },
      overagePolicy: 'invoiceable_overage',
      downgradePolicy: 'not_allowed', // contract-managed; changes go through the account team
      trustLedger: [
        { date: '2026-05-01', event: 'grant', delta: +2, source: 'Monthly contract grant', ref: 'INV-2026-005' },
        { date: '2026-05-22', event: 'usage', delta: -1, source: 'Trusted review — BaFin Filing Translation — DE', actor: 'Klaus Berger' },
      ],
      // Trust Credits are purchased on the same invoice/PO rail as
      // Intelligence Credits — tracked requests, own pricing.
      trustTopUpRequests: [
        { id: 'TTR-1009', date: '2026-04-12', credits: 3, cost: trustPriceFor(3), po: 'PO-2026-013', status: 'completed', notes: 'Bundle · granted Apr 14' },
      ],
      // Combined orders — Intelligence + Trust credits on one invoice.
      purchaseRequests: [
        { id: 'PR-1044', date: '2026-05-18', po: 'PO-2026-021', status: 'invoiced',
          items: [
            { type: 'intelligence', credits: 25000, cost: priceFor(25000) },
            { type: 'trust', credits: 5, cost: trustPriceFor(5) },
          ],
          cost: priceFor(25000) + trustPriceFor(5),
          notes: 'Combined order · granted on finalization (Net 30)' },
      ],
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
      // Ledger order deliberately demonstrates the consumption rule:
      // usage BEFORE the promo grant draws plan; usage AFTER it draws
      // the expiring promotional bucket first, while plan is plentiful.
      { date: '2026-04-20', event: 'migration',  source: 'Legacy migration — PO-2025-098', bucket: 'legacy',      delta: +840,   ref: 'MIG-0042', actor: 'system' },
      { date: '2026-05-01', event: 'grant',      source: 'Monthly plan grant',             bucket: 'plan',        delta: +50000, ref: 'INV-2026-005', actor: 'system' },
      { date: '2026-05-09', event: 'usage',      source: 'Q3 Earnings Report — JA',        bucket: 'plan',        delta: -1200,  actor: 'Hana Ito' },
      { date: '2026-05-16', event: 'top_up',     source: 'PO top-up — TR-1031 (partial grant)', bucket: 'top_up', delta: +2500,  ref: 'INV-2026-007', actor: 'system' },
      { date: '2026-05-22', event: 'usage',      source: 'BaFin Filing Translation — DE',  bucket: 'plan',        delta: -904,   actor: 'Klaus Berger' },
      { date: '2026-05-27', event: 'adjustment', source: 'Manual adjustment — billing correction', bucket: 'adjustment', delta: +250, ref: 'TICKET-1234', actor: 'arbitr Finance' },
      { date: '2026-05-28', event: 'promo_grant',source: 'Promotional credit — Q2 pilot (expires Jun 30)', bucket: 'promotional', delta: +300, ref: 'PROMO-Q2', actor: 'system', expiresAt: '2026-06-30' },
      { date: '2026-05-30', event: 'usage',      source: 'Q3 MD&A Memo — JA',              bucket: 'promotional', delta: -150,  actor: 'Hana Ito', note: 'Expiring credits consumed first (expires Jun 30)' },
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
      downgradePolicy: 'request_only', // self-serve rail, but plan changes by request
      trustLedger: [
        { date: '2026-05-01', event: 'grant', delta: +2, source: 'Monthly contract grant', ref: 'RCP-3015' },
      ],
      receipts: [
        { id: 'RCP-3021-ACH-MERIDIAN-LTD', date: '2026-05-12', type: 'Credit top-up', amount: priceFor(2500), method: 'ACH — Chase Business Complete ••6789', status: 'paid' },
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
