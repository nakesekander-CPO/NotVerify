import { describe, it, expect } from 'vitest'
import {
  PRICING, rateFor, priceFor, savingsPct, creditPackages,
  buildLedger, walletFromLedger, reconciliationSummary, planMeterState,
  tabVisibility, validateAdjustment, buildAdjustmentEntry,
  getDemoAccount, DEMO_ACCOUNT_KEYS,
  planCtaModel, railPermissions, validateRailChange, buildRailChangeRequest,
  allocateUsageToBuckets, bucketsFromLedger, pastDueSummary, markInvoicesPaid,
  validateTopUpRequest, TRUST_PRICING, trustPriceFor, trustWalletFromLedger,
  purchaseRequestTotal, validatePurchaseRequest, buildPurchaseRequest, normalizeRequest,
  purchaseRequestFulfillment, purchaseLineCost,
} from '../billingModel'

describe('pricing — one schedule for both rails', () => {
  it('matches the published volume schedule', () => {
    expect(priceFor(500)).toBe(5)
    expect(priceFor(1000)).toBe(10)
    expect(priceFor(2500)).toBe(24)
    expect(priceFor(5000)).toBe(45)
    expect(priceFor(10000)).toBe(85)
    expect(priceFor(25000)).toBe(200) // enterprise rate, not silently $0.01
  })

  it('shows savings only when real vs. baseline', () => {
    expect(savingsPct(500)).toBe(0)
    expect(savingsPct(1000)).toBe(0)
    expect(savingsPct(2500)).toBe(4)
    expect(savingsPct(5000)).toBe(10)
    expect(savingsPct(10000)).toBe(15)
    expect(savingsPct(25000)).toBe(20)
  })

  it('packages derive labels from the same config — no fake badges', () => {
    const pkgs = creditPackages()
    const noSavings = pkgs.filter(p => p.save === 0)
    for (const p of noSavings) expect(p.bestValue).toBe(false)
    const best = pkgs.filter(p => p.bestValue)
    expect(best).toHaveLength(1)
    expect(best[0].credits).toBe(10000)
  })

  it('invoice/PO requests use the same pricing function as card', () => {
    const ent = getDemoAccount('enterprise-invoice')
    for (const tr of ent.topUpRequests) {
      expect(tr.cost).toBe(priceFor(tr.credits))
      expect(tr.rate).toBe(rateFor(tr.credits))
    }
  })
})

describe('wallet / ledger reconciliation', () => {
  it.each(DEMO_ACCOUNT_KEYS)('%s: wallet total equals sum of buckets', (key) => {
    const a = getDemoAccount(key)
    const w = a.creditWallet
    const sum = w.plan.remaining + w.topUp.available + w.adjustments.available
      + w.legacy.available + w.promotional.available
    expect(w.availableTotal).toBe(sum)
  })

  it.each(DEMO_ACCOUNT_KEYS)('%s: final ledger running balance equals headline available credits', (key) => {
    const a = getDemoAccount(key)
    const last = a.ledger[a.ledger.length - 1]
    expect(last.runningWallet).toBe(a.creditWallet.availableTotal)
  })

  it.each(DEMO_ACCOUNT_KEYS)('%s: reconciliation summary totals to the headline', (key) => {
    const a = getDemoAccount(key)
    expect(reconciliationSummary(a.ledger).total).toBe(a.creditWallet.availableTotal)
  })

  it('plan remaining = grant − usage (uncapped math, capped only for display)', () => {
    const a = getDemoAccount('proteam-card')
    const { plan } = a.creditWallet
    expect(plan.remaining).toBe(plan.grantThisCycle - plan.usedThisCycle)
    expect(plan.overage).toBe(0)
  })

  it('bucket running balance matches the Overview bucket figure', () => {
    const a = getDemoAccount('enterprise-invoice')
    const topUpRows = a.ledger.filter(r => r.bucket === 'top_up')
    expect(topUpRows[topUpRows.length - 1].runningBucket).toBe(a.creditWallet.topUp.available)
  })

  it('expired credits are subtracted from available credits', () => {
    const ledger = buildLedger([
      { date: '2026-05-01', event: 'promo_grant', source: 'Promo', bucket: 'promotional', delta: +300 },
      { date: '2026-06-30', event: 'expiration',  source: 'Promo expired', bucket: 'promotional', delta: -300 },
    ])
    const w = walletFromLedger(ledger, { planGrant: 0 })
    expect(w.promotional.available).toBe(0)
    expect(w.availableTotal).toBe(0)
  })

  it('reversed top-ups are subtracted from available credits', () => {
    const ledger = buildLedger([
      { date: '2026-05-01', event: 'top_up',   source: 'Top-up', bucket: 'top_up', delta: +1000 },
      { date: '2026-05-03', event: 'reversal', source: 'Refund', bucket: 'top_up', delta: -1000 },
    ])
    expect(walletFromLedger(ledger, { planGrant: 0 }).availableTotal).toBe(0)
  })
})

describe('over-consumption is reported, not hidden', () => {
  it('standard-card shows true usage and explicit overage', () => {
    const a = getDemoAccount('standard-card')
    const { plan } = a.creditWallet
    expect(plan.usedThisCycle).toBe(2104)
    expect(plan.grantThisCycle).toBe(1000)
    expect(plan.overage).toBe(1104)
    expect(plan.remaining).toBe(0)
    expect(planMeterState(plan)).toBe('overage')
  })

  it('meter state distinguishes normal / exhausted / overage', () => {
    expect(planMeterState({ usedThisCycle: 500,  grantThisCycle: 1000 })).toBe('normal')
    expect(planMeterState({ usedThisCycle: 1000, grantThisCycle: 1000 })).toBe('exhausted')
    expect(planMeterState({ usedThisCycle: 1001, grantThisCycle: 1000 })).toBe('overage')
  })
})

describe('tab visibility matrix — rail-shaped, not template-shaped', () => {
  it('card/ACH accounts never see an Invoices tab', () => {
    for (const key of ['standard-card', 'proteam-card', 'enterprise-card']) {
      expect(getDemoAccount(key).tabs.invoices).toBe(false)
    }
  })
  it('card/ACH accounts with history see Payments & receipts', () => {
    expect(getDemoAccount('standard-card').tabs.paymentsReceipts).toBe(true)
  })
  it('invoice/PO enterprise sees Invoices and Admin', () => {
    const t = getDemoAccount('enterprise-invoice').tabs
    expect(t.invoices).toBe(true)
    expect(t.admin).toBe(true)
    expect(t.paymentsReceipts).toBe(false)
  })
  it('admin is role-gated', () => {
    expect(tabVisibility({ tier: 'enterprise', role: 'member', paymentRail: 'invoice_or_po', invoicesEnabled: true })).toMatchObject({ admin: false })
    expect(tabVisibility({ tier: 'pro_team', role: 'owner', paymentRail: 'card_or_ach' })).toMatchObject({ admin: false })
  })
})

describe('manual adjustments — finance controls', () => {
  const base = { direction: 'add', amount: 250, bucket: 'adjustment', reasonCode: 'billing_correction', reference: 'TICKET-1234', internalNote: 'Correcting May invoice rounding' }
  const team = { tier: 'pro_team' }

  it('rejects unreferenced or unreasoned changes', () => {
    expect(validateAdjustment({ ...base, reference: '' }, team).ok).toBe(false)
    expect(validateAdjustment({ ...base, reasonCode: null }, team).ok).toBe(false)
    expect(validateAdjustment({ ...base, internalNote: '' }, team).ok).toBe(false)
    expect(validateAdjustment(base, team).ok).toBe(true)
  })

  it('escalates large, negative, and enterprise adjustments to second approval', () => {
    expect(validateAdjustment(base, team).requiresSecondApproval).toBe(false)
    expect(validateAdjustment({ ...base, amount: 1500 }, team).requiresSecondApproval).toBe(true)
    expect(validateAdjustment({ ...base, direction: 'remove' }, team).requiresSecondApproval).toBe(true)
    expect(validateAdjustment(base, { tier: 'enterprise' }).requiresSecondApproval).toBe(true)
  })

  it('produces an immutable audit entry with actor, balances, reason, and reference', () => {
    const entry = buildAdjustmentEntry({
      ...base, actor: 'finance@arbitr.com',
      account: { accountId: 'acct-ent-01' }, oldBalance: 51236,
    })
    expect(entry.audit.source).toBe('manual_admin_adjustment')
    expect(entry.audit.oldBalance).toBe(51236)
    expect(entry.audit.newBalance).toBe(51486)
    expect(entry.audit.actorId).toBe('finance@arbitr.com')
    expect(entry.audit.reasonCode).toBe('billing_correction')
    expect(entry.ref).toBe('TICKET-1234')
    expect(entry.audit.timestamp).toBeTruthy()
  })
})

describe('plans CTA hierarchy — locked down', () => {
  it('current plan is a state, never a sales CTA', () => {
    for (const tier of ['standard', 'pro_team']) {
      const cur = planCtaModel(tier).find(c => c.planId === tier)
      expect(cur.emphasis).toBe('current')
      expect(cur.label).toBe('Current plan')
    }
  })

  it('at most one primary filled CTA per tier', () => {
    for (const tier of ['standard', 'plus', 'pro_team', 'enterprise']) {
      const primaries = planCtaModel(tier).filter(c => c.emphasis === 'primary')
      expect(primaries.length).toBeLessThanOrEqual(1)
    }
  })

  it('the single primary is the recommended next step up', () => {
    expect(planCtaModel('standard').find(c => c.emphasis === 'primary').planId).toBe('plus')
    expect(planCtaModel('pro_team').find(c => c.emphasis === 'primary').planId).toBe('enterprise')
  })

  it('downgrades are never primary, in any policy', () => {
    for (const downgradePolicy of ['self_serve', 'request_only', 'not_allowed']) {
      const ctas = planCtaModel('pro_team', { downgradePolicy })
      const downgrades = ctas.filter(c => ['standard', 'plus'].includes(c.planId))
      for (const d of downgrades) expect(d.emphasis).not.toBe('primary')
    }
  })

  it('enterprise never sees a self-serve "Switch to Team" — contract policies map to request/contact', () => {
    const notAllowed = planCtaModel('enterprise', { downgradePolicy: 'not_allowed' })
    for (const c of notAllowed.filter(x => x.planId !== 'enterprise')) {
      expect(c.label).toBe('Contact support')
      expect(c.emphasis).toBe('none')
    }
    const requestOnly = planCtaModel('enterprise', { downgradePolicy: 'request_only' })
    for (const c of requestOnly.filter(x => x.planId !== 'enterprise')) {
      expect(c.label).toBe('Request downgrade')
      expect(c.emphasis).toBe('outline')
    }
  })

  it('aria labels expose plan state', () => {
    const ctas = planCtaModel('enterprise', { downgradePolicy: 'request_only' })
    expect(ctas.find(c => c.planId === 'enterprise').ariaLabel).toBe('enterprise, current plan')
    expect(ctas.find(c => c.planId === 'pro_team').ariaLabel).toContain('downgrade')
  })

  it('demo accounts carry an explicit downgrade policy', () => {
    expect(getDemoAccount('enterprise-invoice').downgradePolicy).toBe('not_allowed')
    expect(getDemoAccount('enterprise-card').downgradePolicy).toBe('request_only')
  })
})

describe('payment rail — permissioned, validated, audited', () => {
  it('permission matrix: customers can at most request; only internal finance edits/approves', () => {
    for (const role of ['owner', 'admin', 'finance_admin']) {
      const p = railPermissions(role)
      expect(p.canViewPaymentRail).toBe(true)
      expect(p.canRequestPaymentRailChange).toBe(true)
      expect(p.canEditPaymentRail).toBe(false)
      expect(p.canApprovePaymentRailChange).toBe(false)
    }
    expect(railPermissions('member').canRequestPaymentRailChange).toBe(false)
    expect(railPermissions('viewer').canViewPaymentRail).toBe(false)
    const internal = railPermissions('finance_admin', { internalFinance: true })
    expect(internal.canEditPaymentRail).toBe(true)
    expect(internal.canApprovePaymentRailChange).toBe(true)
  })

  it('rail change requires target, reason, and acknowledgment', () => {
    const acct = getDemoAccount('proteam-card')
    expect(validateRailChange({ targetRail: 'invoice_or_po', reason: '', acknowledged: true }, acct).ok).toBe(false)
    expect(validateRailChange({ targetRail: 'invoice_or_po', reason: 'Procurement requires invoicing', acknowledged: false }, acct).ok).toBe(false)
    expect(validateRailChange({ targetRail: 'card_or_ach', reason: 'x', acknowledged: true }, acct).ok).toBe(false) // already on rail
    expect(validateRailChange({ targetRail: 'invoice_or_po', reason: 'Procurement requires invoicing', acknowledged: true }, acct).ok).toBe(true)
  })

  it('high-risk changes require approval: open/past-due invoices or enterprise', () => {
    const team = getDemoAccount('proteam-card')
    const entInv = getDemoAccount('enterprise-invoice')
    const valid = { targetRail: 'invoice_or_po', reason: 'r', acknowledged: true }
    expect(validateRailChange(valid, team).requiresApproval).toBe(false)
    expect(validateRailChange({ ...valid, targetRail: 'card_or_ach' }, entInv).requiresApproval).toBe(true)
  })

  it('rail change requests produce a full audit record', () => {
    const acct = getDemoAccount('enterprise-invoice')
    const req = buildRailChangeRequest({ targetRail: 'card_or_ach', reason: 'Moving to self-serve', actor: 'finance_admin@meridian', account: acct })
    expect(req.source).toBe('payment_rail_change')
    expect(req.fromRail).toBe('invoice_or_po')
    expect(req.toRail).toBe('card_or_ach')
    expect(req.status).toBe('pending_approval')
    expect(req.actorId).toBeTruthy()
    expect(req.timestamp).toBeTruthy()
    const approved = buildRailChangeRequest({ targetRail: 'card_or_ach', reason: 'r', actor: 'a', account: acct, approvalId: 'APPR-1' })
    expect(approved.status).toBe('approved')
  })
})

describe('payments & receipts fixtures — table coverage', () => {
  it('card accounts include success, failed, and refunded receipts plus long IDs/methods', () => {
    const std = getDemoAccount('standard-card')
    const statuses = std.receipts.map(r => r.status)
    expect(statuses).toContain('paid')
    expect(statuses).toContain('failed')
    expect(statuses).toContain('refunded')
    const entCard = getDemoAccount('enterprise-card')
    expect(entCard.receipts.some(r => r.id.length > 12)).toBe(true)
    expect(entCard.receipts.some(r => /ACH/.test(r.method))).toBe(true)
  })

  it('every receipt row has the fields the table renders — no blank cells', () => {
    for (const key of ['standard-card', 'proteam-card', 'enterprise-card']) {
      for (const r of getDemoAccount(key).receipts) {
        expect(r.id).toBeTruthy()
        expect(r.date).toBeTruthy()
        expect(r.type).toBeTruthy()
        expect(r.method).toBeTruthy()
        expect(typeof r.amount).toBe('number')
        expect(r.status).toBeTruthy()
      }
    }
  })

  it('card-rail receipts never carry invoice fields (no PO, no net terms)', () => {
    for (const key of ['standard-card', 'proteam-card', 'enterprise-card']) {
      const a = getDemoAccount(key)
      expect(a.netTerms).toBeNull()
      expect(a.poNumber).toBeNull()
      for (const r of a.receipts) expect(r.po).toBeUndefined()
    }
  })
})

describe('authoritative consumption rule — one allocator, every surface agrees', () => {
  const B = (type, availableCredits, expiresAt = null, extra = {}) =>
    ({ bucketId: `${type}${expiresAt ? '-' + expiresAt : ''}`, type, availableCredits, expiresAt, sourceReference: null, eligibleForUsage: true, ...extra })

  it('expiring credits are consumed before non-expiring — promo drained while plan is plentiful', () => {
    const { draws, shortfall } = allocateUsageToBuckets(150, [
      B('plan', 47896), B('promotional', 300, '2026-06-30'), B('top_up', 2500), B('legacy', 840),
    ])
    expect(shortfall).toBe(0)
    expect(draws).toHaveLength(1)
    expect(draws[0]).toMatchObject({ type: 'promotional', creditsDrawn: 150, expiresAt: '2026-06-30' })
  })

  it('soonest expiration is protected first', () => {
    const { draws } = allocateUsageToBuckets(100, [
      B('promotional', 100, '2026-08-01'), B('promotional', 100, '2026-06-30'),
    ])
    expect(draws[0].expiresAt).toBe('2026-06-30')
  })

  it('same expiration date ties break promotional → plan → top_up → adjustment → legacy', () => {
    const { draws } = allocateUsageToBuckets(250, [
      B('plan', 100, '2026-06-30'), B('promotional', 100, '2026-06-30'), B('top_up', 100, '2026-06-30'),
    ])
    expect(draws.map(d => d.type)).toEqual(['promotional', 'plan', 'top_up'])
  })

  it('after expiring credits, non-expiring order is plan → top_up → adjustment → legacy', () => {
    const { draws } = allocateUsageToBuckets(1300, [
      B('legacy', 840), B('top_up', 2500), B('plan', 1000), B('adjustment', 250),
    ])
    expect(draws.map(d => d.type)).toEqual(['plan', 'top_up'])
    expect(draws[0].creditsDrawn).toBe(1000)
    expect(draws[1].creditsDrawn).toBe(300)
  })

  it('ineligible buckets are skipped; shortfall is reported, never hidden', () => {
    const { draws, shortfall } = allocateUsageToBuckets(500, [
      B('plan', 1000, null, { eligibleForUsage: false }), B('top_up', 200),
    ])
    expect(draws).toEqual([expect.objectContaining({ type: 'top_up', creditsDrawn: 200 })])
    expect(shortfall).toBe(300)
  })

  it('the enterprise ledger matches what the allocator would have drawn — engine and ledger agree', () => {
    const a = getDemoAccount('enterprise-invoice')
    const expiringMeta = { promotional: '2026-06-30' }
    a.ledger.forEach((row, i) => {
      if (row.event !== 'usage') return
      const buckets = bucketsFromLedger(a.ledger.slice(0, i), { planGrant: 50000, expiringMeta })
      const { draws } = allocateUsageToBuckets(-row.delta, buckets)
      // The bucket recorded on the ledger row must be the first bucket
      // the allocator draws from for that usage.
      expect(draws[0].type).toBe(row.bucket)
    })
  })

  it('banner, wallet, and ledger agree on remaining expiring credits', () => {
    const a = getDemoAccount('enterprise-invoice')
    expect(a.expiring.amount).toBe(a.creditWallet.promotional.available)
    // The ledger proves the drawdown: a usage row hit the promotional
    // bucket while the plan bucket held ample credits.
    const promoUsage = a.ledger.find(r => r.event === 'usage' && r.bucket === 'promotional')
    expect(promoUsage).toBeTruthy()
    expect(promoUsage.delta).toBe(-150)
  })

  it('promotional draws do not inflate the plan meter; true overage still reports', () => {
    const ent = getDemoAccount('enterprise-invoice')
    expect(ent.creditWallet.plan.usedThisCycle).toBe(2104) // plan usage only
    expect(ent.creditWallet.plan.overage).toBe(0)
    const std = getDemoAccount('standard-card')
    expect(std.creditWallet.plan.usedThisCycle).toBe(2104) // 1,000 plan + 1,104 overage
    expect(std.creditWallet.plan.overage).toBe(1104)
  })

  it('the standard-card overage row follows the non-expiring fallback (plan exhausted → top_up)', () => {
    const a = getDemoAccount('standard-card')
    const i = a.ledger.findIndex(r => r.event === 'usage' && r.bucket === 'top_up')
    const buckets = bucketsFromLedger(a.ledger.slice(0, i), { planGrant: 1000 })
    const planLeft = buckets.find(b => b.type === 'plan')
    expect(planLeft).toBeUndefined() // plan bucket already at zero
    const { draws } = allocateUsageToBuckets(1104, buckets)
    expect(draws[0].type).toBe('top_up')
  })
})

describe('past-due banner ↔ invoice register consistency', () => {
  it('banner amount, count, and date derive from the same rows the register shows', () => {
    const a = getDemoAccount('enterprise-invoice')
    const pd = pastDueSummary(a.invoices)
    expect(pd.count).toBe(1)
    expect(pd.ids).toEqual(['INV-2026-006'])
    expect(pd.total).toBe(priceFor(5000)) // $45 — computed, never hardcoded
    expect(pd.oldestDueDate).toBe('2026-05-31')
    // The same row exists in the register with the same amount.
    const row = a.invoices.find(i => i.id === 'INV-2026-006')
    expect(row.status).toBe('past_due')
    expect(row.amount).toBe(pd.total)
  })

  it('paying clears the past-due state so the banner re-evaluates', () => {
    const a = getDemoAccount('enterprise-invoice')
    const before = pastDueSummary(a.invoices)
    const after = markInvoicesPaid(a.invoices, before.ids)
    expect(pastDueSummary(after).count).toBe(0)
    expect(pastDueSummary(after).total).toBe(0)
    expect(after.find(i => i.id === 'INV-2026-006').status).toBe('paid')
    // Other invoices untouched: open count unchanged.
    expect(after.filter(i => i.status === 'open').length)
      .toBe(a.invoices.filter(i => i.status === 'open').length)
  })

  it('partial payment leaves the remainder counted and summed', () => {
    const invoices = [
      { id: 'A', amount: 100, status: 'past_due', dueDate: '2026-05-01' },
      { id: 'B', amount: 50,  status: 'past_due', dueDate: '2026-06-01' },
    ]
    const after = markInvoicesPaid(invoices, ['A'])
    const pd = pastDueSummary(after)
    expect(pd.count).toBe(1)
    expect(pd.total).toBe(50)
    expect(pd.oldestDueDate).toBe('2026-06-01')
  })

  it('card-rail accounts have no past-due surface at all', () => {
    for (const k of ['standard-card', 'proteam-card', 'enterprise-card']) {
      expect(pastDueSummary(getDemoAccount(k).invoices).count).toBe(0)
    }
  })
})

describe('top-up PO requirement — account-level setting, not a hardcoded rule', () => {
  it('when the account requires a PO, requests without one are blocked', () => {
    const acct = { poRequired: true }
    expect(validateTopUpRequest({ credits: 25000, po: '' }, acct).ok).toBe(false)
    expect(validateTopUpRequest({ credits: 25000, po: '   ' }, acct).ok).toBe(false)
    expect(validateTopUpRequest({ credits: 25000, po: 'PO-2026-022' }, acct).ok).toBe(true)
  })

  it('when the account setting is optional, requests submit without a PO', () => {
    const acct = { poRequired: false }
    expect(validateTopUpRequest({ credits: 25000, po: '' }, acct).ok).toBe(true)
    expect(validateTopUpRequest({ credits: 25000, po: 'PO-2026-022' }, acct).ok).toBe(true)
  })

  it('a credit amount is always required regardless of PO policy', () => {
    expect(validateTopUpRequest({ credits: 0, po: 'PO-1' }, { poRequired: false }).ok).toBe(false)
    expect(validateTopUpRequest({ credits: null, po: '' }, { poRequired: false }).ok).toBe(false)
  })

  it('the demo enterprise account defaults to PO required (overridable in Admin)', () => {
    expect(getDemoAccount('enterprise-invoice').poRequired).toBe(true)
    // The Admin toggle overrides via account-level settings — the
    // validator obeys whatever the account currently says:
    const overridden = { ...getDemoAccount('enterprise-invoice'), poRequired: false }
    expect(validateTopUpRequest({ credits: 5000, po: '' }, overridden).ok).toBe(true)
  })
})

describe('Trust Credits — the second wallet, restored', () => {
  it('trust pricing matches the published rates: $38/credit, 3-for-$110 bundle', () => {
    expect(trustPriceFor(1)).toBe(38)
    expect(trustPriceFor(2)).toBe(76)
    expect(trustPriceFor(3)).toBe(110) // bundle, not 114
    expect(TRUST_PRICING.perCredit).toBe(38)
  })

  it('trust wallet derives from its own ledger: grant, used, available', () => {
    const w = trustWalletFromLedger([
      { date: '2026-05-01', event: 'grant',  delta: +2 },
      { date: '2026-05-20', event: 'usage',  delta: -1 },
      { date: '2026-05-25', event: 'top_up', delta: +1 },
    ])
    expect(w.grantThisCycle).toBe(2)
    expect(w.used).toBe(1)
    expect(w.available).toBe(2)
  })

  it('plans that sell Trust Credits actually grant them; plans that do not, do not', () => {
    // Team plan: "2 Trust Credits / month" — must be backed by a grant.
    const team = getDemoAccount('proteam-card').trustCredits
    expect(team.grantThisCycle).toBe(2)
    expect(team.used).toBe(1)
    expect(team.available).toBe(1)
    // Enterprise (both rails) includes Trust Credits.
    expect(getDemoAccount('enterprise-invoice').trustCredits.grantThisCycle).toBe(2)
    expect(getDemoAccount('enterprise-card').trustCredits.grantThisCycle).toBe(2)
    // Standard sells none and grants none.
    const std = getDemoAccount('standard-card').trustCredits
    expect(std.grantThisCycle).toBe(0)
    expect(std.available).toBe(0)
  })

  it('Trust Credits never leak into the Intelligence Credits wallet math', () => {
    // The IC reconciliation invariants are asserted elsewhere for every
    // account; here we pin that trust ledgers live outside the IC ledger.
    for (const key of DEMO_ACCOUNT_KEYS) {
      const a = getDemoAccount(key)
      for (const row of a.ledger) {
        expect(Math.abs(row.delta)).toBeGreaterThanOrEqual(100) // IC rows are credit-scale
      }
      const trustRows = a.trustCredits.ledger
      for (const row of trustRows) {
        expect(Math.abs(row.delta)).toBeLessThanOrEqual(3) // TC rows are unit-scale
      }
    }
  })
})

describe('Trust Credits — purchase & invoicing parity with Intelligence Credits', () => {
  it('trust pricing is one schedule used on both rails ($38/credit, 3-for-$110 bundle)', () => {
    expect(trustPriceFor(1)).toBe(38)
    expect(trustPriceFor(3)).toBe(110)   // bundle
    expect(trustPriceFor(5)).toBe(190)
    expect(trustPriceFor(10)).toBe(380)
    expect(trustPriceFor(25)).toBe(950)
  })

  it('invoice/PO trust requests obey the account PO requirement, like IC requests', () => {
    const poReq = { poRequired: true }
    expect(validateTopUpRequest({ credits: 5, po: '' }, poReq).ok).toBe(false)
    expect(validateTopUpRequest({ credits: 5, po: 'PO-1' }, poReq).ok).toBe(true)
    const poOpt = { poRequired: false }
    expect(validateTopUpRequest({ credits: 5, po: '' }, poOpt).ok).toBe(true)
  })

  it('the invoice/PO enterprise account seeds tracked trust purchases', () => {
    const a = getDemoAccount('enterprise-invoice')
    expect(a.trustTopUpRequests.length).toBeGreaterThanOrEqual(1)
    for (const r of a.trustTopUpRequests) expect(r.cost).toBe(trustPriceFor(r.credits))
    // An invoiced Trust line now rides on a combined IC+Trust order.
    const invoicedTrust = a.purchaseRequests.some(r => r.status === 'invoiced' && r.items.some(i => i.type === 'trust'))
    expect(invoicedTrust).toBe(true)
  })

  it('trust requests never appear on card-rail accounts (rail-shaped)', () => {
    for (const k of ['standard-card', 'proteam-card', 'enterprise-card']) {
      const reqs = getDemoAccount(k).trustTopUpRequests || []
      expect(reqs.length).toBe(0)
    }
  })
})

describe('Combined purchase requests — IC + Trust on one invoice', () => {
  it('totals each line on its own pricing schedule', () => {
    const items = [
      { type: 'intelligence', credits: 25000 },
      { type: 'trust', credits: 5 },
    ]
    expect(purchaseRequestTotal(items)).toBe(priceFor(25000) + trustPriceFor(5)) // 200 + 190 = 390
  })

  it('validates: needs at least one line and obeys the account PO requirement', () => {
    const poReq = { poRequired: true }
    expect(validatePurchaseRequest({ items: [], po: 'PO-1' }, poReq).ok).toBe(false)
    expect(validatePurchaseRequest({ items: [{ type: 'trust', credits: 0 }], po: 'PO-1' }, poReq).ok).toBe(false)
    expect(validatePurchaseRequest({ items: [{ type: 'intelligence', credits: 5000 }], po: '' }, poReq).ok).toBe(false)
    expect(validatePurchaseRequest({ items: [{ type: 'intelligence', credits: 5000 }, { type: 'trust', credits: 3 }], po: 'PO-1' }, poReq).ok).toBe(true)
  })

  it('builds a request with priced line items and a combined total', () => {
    const req = buildPurchaseRequest({
      items: [{ type: 'intelligence', credits: 10000 }, { type: 'trust', credits: 3 }, { type: 'trust', credits: 0 }],
      po: 'PO-2026-099', account: { grantPolicy: 'on-finalization' }, id: 'PR-test',
    })
    expect(req.items).toHaveLength(2) // zero-credit line dropped
    expect(req.items[0]).toMatchObject({ type: 'intelligence', credits: 10000, cost: priceFor(10000) })
    expect(req.items[1]).toMatchObject({ type: 'trust', credits: 3, cost: trustPriceFor(3) })
    expect(req.cost).toBe(priceFor(10000) + trustPriceFor(3))
    expect(req.po).toBe('PO-2026-099')
    expect(req.status).toBe('requested')
  })

  it('normalizes legacy single-currency requests to the line-item shape', () => {
    const ic = normalizeRequest({ id: 'TR-1', credits: 5000, cost: priceFor(5000) }, 'intelligence')
    expect(ic.items).toEqual([{ type: 'intelligence', credits: 5000, cost: priceFor(5000) }])
    const combined = { id: 'PR-1', items: [{ type: 'trust', credits: 3, cost: 110 }] }
    expect(normalizeRequest(combined, 'trust')).toBe(combined) // already line-item, untouched
  })

  it('the enterprise account seeds a real combined order (IC + Trust)', () => {
    const pr = getDemoAccount('enterprise-invoice').purchaseRequests
    expect(pr.length).toBeGreaterThanOrEqual(1)
    const combined = pr.find(r => r.items.length > 1)
    expect(combined).toBeTruthy()
    expect(combined.items.map(i => i.type).sort()).toEqual(['intelligence', 'trust'])
    expect(combined.cost).toBe(combined.items.reduce((s, i) => s + i.cost, 0))
  })
})

describe('Combined order fulfillment — each line to its own wallet', () => {
  it('splits a combined order: IC → Intelligence ledger (top_up bucket), Trust → Trust ledger', () => {
    const req = { id: 'PR-9', po: 'PO-9', items: [
      { type: 'intelligence', credits: 25000, cost: priceFor(25000) },
      { type: 'trust', credits: 5, cost: trustPriceFor(5) },
    ] }
    const { icRows, trustRows } = purchaseRequestFulfillment(req, { date: '2026-06-16' })
    expect(icRows).toHaveLength(1)
    expect(icRows[0]).toMatchObject({ event: 'top_up', bucket: 'top_up', delta: 25000, ref: 'PO-9' })
    expect(trustRows).toHaveLength(1)
    expect(trustRows[0]).toMatchObject({ event: 'top_up', delta: 5, ref: 'PO-9' })
    expect(trustRows[0].bucket).toBeUndefined() // trust ledger has no IC bucket
  })

  it('IC-only and Trust-only orders fulfil to just one wallet', () => {
    const icOnly = purchaseRequestFulfillment({ id: 'PR-1', items: [{ type: 'intelligence', credits: 5000 }] })
    expect(icOnly.icRows).toHaveLength(1)
    expect(icOnly.trustRows).toHaveLength(0)
    const trustOnly = purchaseRequestFulfillment({ id: 'PR-2', items: [{ type: 'trust', credits: 3 }] })
    expect(trustOnly.icRows).toHaveLength(0)
    expect(trustOnly.trustRows).toHaveLength(1)
  })

  it('granting the seeded combined order adds exactly its credits to each wallet', () => {
    const a = getDemoAccount('enterprise-invoice')
    const combined = a.purchaseRequests.find(r => r.items.length > 1)
    const { icRows, trustRows } = purchaseRequestFulfillment(combined)
    const icBefore = a.creditWallet.topUp.available
    const icAfter = walletFromLedger([...a.ledger, ...icRows.map(r => ({ ...r }))], { planGrant: a.creditWallet.plan.grantThisCycle }).topUp.available
    expect(icAfter - icBefore).toBe(combined.items.find(i => i.type === 'intelligence').credits)
    const trustAdded = trustRows.reduce((s, r) => s + r.delta, 0)
    expect(trustAdded).toBe(combined.items.find(i => i.type === 'trust').credits)
  })
})
