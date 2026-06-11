import { describe, it, expect } from 'vitest'
import {
  PRICING, rateFor, priceFor, savingsPct, creditPackages,
  buildLedger, walletFromLedger, reconciliationSummary, planMeterState,
  tabVisibility, validateAdjustment, buildAdjustmentEntry,
  getDemoAccount, DEMO_ACCOUNT_KEYS,
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
