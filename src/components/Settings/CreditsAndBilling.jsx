import { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle2, ChevronDown, Info, X, Zap, Shield,
  Edit2, Download, Tag, Clock, Check, AlertCircle,
  FileText, Plus, ChevronRight, BarChart2,
} from 'lucide-react'

// ── Mock data ─────────────────────────────────────────────────────────────────

const CURRENT_PLAN = {
  name: 'Team',
  tier: 1,
  renewsDate: 'Apr 13, 2026',
  features: [
    '5,000 Intelligence Credits / month',
    'All AI features (Translation + Agent)',
    '2 Trust Credits / month',
    'Priority processing & Rollovers',
  ],
}

const CREDIT_BALANCE = {
  intelligence: { used: 1753, total: 5000, resetsIn: 13 },
  trust: { used: 1, total: 2, resetsIn: 13 },
}

const BURN = {
  ic: { daily: 142, weekly: 994, projectedEOM: 1753 },
  tc: { daily: 0.2, weekly: 1.4, projectedEOM: 0.4 },
}

// Single-priced Team tier (was a 3-step Pro dropdown; consolidated to one
// price-point per the simplified plan structure).
const TEAM_TIER = { price: 100, annualPrice: 90, ic: 5000, tc: 2 }

const IC_THRESHOLDS = [
  { value: 250, label: '250 IC' },
  { value: 500, label: '500 IC' },
  { value: 1000, label: '1,000 IC' },
  { value: 2000, label: '2,000 IC' },
]

const IC_AMOUNTS = [
  { credits: 500, cost: 5 },
  { credits: 1000, cost: 10 },
  { credits: 2000, cost: 20 },
  { credits: 5000, cost: 50 },
]

const TC_THRESHOLDS = [
  { value: 0, label: 'When empty (0 TC)' },
  { value: 1, label: '1 TC' },
]

const TC_AMOUNTS = [
  { credits: 1, cost: 38, label: '+1 credit — $38' },
  { credits: 3, cost: 110, label: '+3 credits — $110 (bundle)' },
]

const PURCHASE_IC_OPTIONS = [
  { credits: 500, cost: 5 },
  { credits: 1000, cost: 10 },
  { credits: 2000, cost: 20 },
  { credits: 5000, cost: 50 },
]

const PURCHASE_TC_OPTIONS = [
  { credits: 1, cost: 38, label: '1 credit — $38' },
  { credits: 3, cost: 110, label: '3 credits — $110 (bundle)' },
]

// Pro: project tags
const PROJECT_TAGS = [
  { id: 'p1', name: 'Q3 Earnings Report', ic: 612, tc: 0.2 },
  { id: 'p2', name: 'Product Launch DE', ic: 847, tc: 0.0 },
  { id: 'p3', name: 'Annual Report', ic: 294, tc: 0.0 },
]

// Enterprise: team usage breakdown
const TEAM_USAGE = [
  { team: 'M&A Team — Q2', entity: 'Meridian Capital Ltd.', ic: 847, tc: 0.4 },
  { team: 'Compliance — APAC', entity: 'Meridian Asia Holdings', ic: 612, tc: 0.0 },
  { team: 'Corporate Communications', entity: 'Meridian Capital Ltd.', ic: 294, tc: 0.0 },
]

// Enterprise: top-up approval requests
const TOP_UP_REQUESTS = [
  { id: 1, date: 'Dec 12', wallet: 'IC', amount: '+1,000 IC', cost: '$10', budget: 'M&A Team — Q2', by: 'Alex Kim', status: 'approved' },
  { id: 2, date: 'Dec 5',  wallet: 'IC', amount: '+2,000 IC', cost: '$20', budget: 'Compliance — APAC', by: 'Priya Mehta', status: 'pending' },
  { id: 3, date: 'Nov 28', wallet: 'TC', amount: '+1 TC',    cost: '$38', budget: 'M&A Team — Q2', by: 'Alex Kim', status: 'approved' },
]

// Enterprise: budgets (for request dropdown)
const ENTERPRISE_BUDGETS = [
  { id: 'b1', name: 'M&A Team — Q2' },
  { id: 'b2', name: 'Compliance — APAC' },
  { id: 'b3', name: 'Corporate Communications' },
]

// Invoices (all tiers)
const INVOICES = [
  { id: 'INV-2025-012', date: 'Dec 1, 2025',  type: 'Subscription', amount: 100, po: 'PO-2025-043', entity: 'Meridian Capital Ltd.',      status: 'paid' },
  { id: 'INV-2025-011', date: 'Nov 1, 2025',  type: 'Subscription', amount: 100, po: 'PO-2025-039', entity: 'Meridian Capital Ltd.',      status: 'paid' },
  { id: 'INV-2025-010', date: 'Oct 7, 2025',  type: 'Credit top-up', amount: 10, po: '',           entity: 'Meridian Capital Ltd.',      status: 'paid' },
  { id: 'INV-2025-009', date: 'Oct 1, 2025',  type: 'Subscription', amount: 100, po: '',           entity: 'Meridian Capital Ltd.',      status: 'paid' },
  { id: 'INV-2025-008', date: 'Sep 1, 2025',  type: 'Subscription', amount: 100, po: 'PO-2025-031', entity: 'Meridian Asia Holdings',     status: 'paid' },
  { id: 'INV-2025-007', date: 'Aug 1, 2025',  type: 'Subscription', amount: 100, po: '',           entity: 'Meridian Capital Ltd.',      status: 'paid' },
]

// ── Main component ─────────────────────────────────────────────────────────────

export default function CreditsAndBilling({ tier = 'pro' }) {
  const [annualPro, setAnnualPro] = useState(false)
  const [annualPlus, setAnnualPlus] = useState(false)
  const [annualStandard, setAnnualStandard] = useState(false)

  // PO / reference (Pro + Enterprise)
  const [poNumber, setPoNumber] = useState('')
  const [costCenter, setCostCenter] = useState('')
  const [poEditing, setPoEditing] = useState(false)
  const [poDraft, setPoDraft] = useState({ poNumber: '', costCenter: '' })

  // Modals
  const [showPurchase, setShowPurchase] = useState(false)
  const [showTopUpRequest, setShowTopUpRequest] = useState(false)
  const [showAutoRules, setShowAutoRules] = useState(false)

  // Usage breakdown
  const [showBreakdown, setShowBreakdown] = useState(false)
  const [projectFilter, setProjectFilter] = useState('all')

  // Invoice history
  const [showAllInvoices, setShowAllInvoices] = useState(false)

  const icRemaining = CREDIT_BALANCE.intelligence.total - CREDIT_BALANCE.intelligence.used
  const tcRemaining = CREDIT_BALANCE.trust.total - CREDIT_BALANCE.trust.used
  const icPct = Math.round((icRemaining / CREDIT_BALANCE.intelligence.total) * 100)
  const tcPct = Math.round((tcRemaining / CREDIT_BALANCE.trust.total) * 100)

  const isPro = tier === 'pro'
  const isEnterprise = tier === 'enterprise'
  const isPaid = isPro || isEnterprise

  const visibleInvoices = showAllInvoices ? INVOICES : INVOICES.slice(0, 3)

  // PO edit helpers
  const startPoEdit = () => {
    setPoDraft({ poNumber, costCenter })
    setPoEditing(true)
  }
  const savePoEdit = () => {
    setPoNumber(poDraft.poNumber)
    setCostCenter(poDraft.costCenter)
    setPoEditing(false)
  }
  const cancelPoEdit = () => setPoEditing(false)

  // Filtered burn stats (Pro project filter)
  const activeProjectData = projectFilter === 'all' ? null : PROJECT_TAGS.find(p => p.id === projectFilter)
  const displayBurn = activeProjectData
    ? { ic: activeProjectData.ic, tc: activeProjectData.tc }
    : BURN

  return (
    <div className="p-8 space-y-8">
      <div>
        <h3 className="text-[18px] font-semibold text-gray-900 mb-0.5">Credits & Billing</h3>
        <p className="text-[13px] text-gray-500">Manage your subscription, monitor usage, and adjust your plan.</p>
      </div>

      {/* ── Zone A: Current plan + Credit balance ───────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">

        {/* Current plan card */}
        <div className="rounded-xl border border-black/[0.12] bg-white p-5 flex flex-col">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-[#009eda]" />
            <span className="text-[13px] font-semibold text-gray-900">
              {tier === 'standard' ? 'Standard Plan' : tier === 'plus' ? 'Plus Plan' : tier === 'enterprise' ? 'Enterprise Plan' : 'Team Plan'}
            </span>
            <span className="ml-auto text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#009eda]/10 text-[#009eda]">Current</span>
          </div>
          <p className="text-[11px] text-gray-400 mb-4 ml-4">Renews {CURRENT_PLAN.renewsDate}</p>

          <ul className="space-y-2 mb-5">
            {CURRENT_PLAN.features.map(f => (
              <li key={f} className="flex items-start gap-2 text-[12px] text-gray-700">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                {f}
              </li>
            ))}
          </ul>

          {/* PO / Reference fields — Pro + Enterprise */}
          {isPaid && (
            <div className="mt-auto mb-4 pt-4 border-t border-black/[0.06]">
              {poEditing ? (
                <div className="space-y-2">
                  <div>
                    <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">PO Number</label>
                    <input
                      type="text"
                      value={poDraft.poNumber}
                      onChange={e => setPoDraft(v => ({ ...v, poNumber: e.target.value }))}
                      placeholder="e.g. PO-2025-043"
                      className="w-full px-3 py-1.5 rounded-lg border border-black/[0.12] text-[12px] text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#009eda] bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">Cost Center / GL Code</label>
                    <input
                      type="text"
                      value={poDraft.costCenter}
                      onChange={e => setPoDraft(v => ({ ...v, costCenter: e.target.value }))}
                      placeholder="e.g. FIN-APAC-003"
                      className="w-full px-3 py-1.5 rounded-lg border border-black/[0.12] text-[12px] text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#009eda] bg-white"
                    />
                  </div>
                  <p className="text-[10px] text-gray-400">These will appear on all invoices and receipts.</p>
                  <div className="flex gap-2 pt-1">
                    <button onClick={savePoEdit} className="px-3 py-1.5 rounded-lg bg-[#009eda] text-[11px] font-medium text-white hover:bg-[#0089c4] transition-colors cursor-pointer">
                      Save
                    </button>
                    <button onClick={cancelPoEdit} className="px-3 py-1.5 rounded-lg border border-black/[0.12] text-[11px] font-medium text-gray-600 hover:bg-black/[0.03] transition-colors cursor-pointer">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider w-20">PO Number</span>
                      <span className="text-[12px] text-gray-700">{poNumber || <span className="text-gray-400">—</span>}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider w-20">Cost Center</span>
                      <span className="text-[12px] text-gray-700">{costCenter || <span className="text-gray-400">—</span>}</span>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">Attached to all invoices and receipts.</p>
                  </div>
                  <button
                    onClick={startPoEdit}
                    className="flex items-center gap-1 text-[11px] text-[#009eda] hover:text-[#0089c4] transition-colors cursor-pointer shrink-0"
                  >
                    <Edit2 className="w-3 h-3" />
                    Edit
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2 mt-auto">
            <button className="flex-1 px-3 py-2 rounded-lg border border-black/[0.12] text-[12px] font-medium text-gray-700 hover:bg-black/[0.03] transition-colors cursor-pointer">
              Manage
            </button>
            {isEnterprise ? (
              <button
                onClick={() => setShowTopUpRequest(true)}
                className="flex-1 px-3 py-2 rounded-lg bg-[#009eda] text-[12px] font-medium text-white hover:bg-[#0089c4] transition-colors cursor-pointer"
              >
                Request top-up
              </button>
            ) : (
              <button
                onClick={() => setShowPurchase(true)}
                className="flex-1 px-3 py-2 rounded-lg bg-[#009eda] text-[12px] font-medium text-white hover:bg-[#0089c4] transition-colors cursor-pointer"
              >
                Top up credits
              </button>
            )}
          </div>
        </div>

        {/* Credit balance card */}
        <div className="rounded-xl border border-black/[0.12] bg-white p-5 space-y-5">
          <div className="flex items-baseline justify-between">
            <span className="text-[13px] font-semibold text-gray-900">Credits remaining</span>
            <span className="text-[18px] font-bold font-mono text-gray-900">{icRemaining.toLocaleString()} IC</span>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-gray-500 font-medium">Intelligence Credits</span>
              <span className="font-mono text-gray-700">{icRemaining.toLocaleString()} / {CREDIT_BALANCE.intelligence.total.toLocaleString()}</span>
            </div>
            <div className="h-2 w-full bg-black/[0.06] rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-[#009eda] rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${icPct}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>
            <p className="text-[10px] text-gray-400">Resets in {CREDIT_BALANCE.intelligence.resetsIn} days</p>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-gray-500 font-medium">Trust Credits</span>
              <span className="font-mono text-gray-700">{tcRemaining} / {CREDIT_BALANCE.trust.total}</span>
            </div>
            <div className="h-2 w-full bg-black/[0.06] rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-violet-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${tcPct}%` }}
                transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
              />
            </div>
            <p className="text-[10px] text-gray-400">Resets in {CREDIT_BALANCE.trust.resetsIn} days</p>
          </div>
        </div>
      </div>

      {/* ── Enterprise: Top-up approval audit log ──────────────────────────────── */}
      {isEnterprise && (
        <div className="rounded-xl border border-black/[0.12] bg-white overflow-hidden">
          <div className="px-5 py-3 border-b border-black/[0.06] flex items-center justify-between">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Recent Top-Up Requests</h4>
            <button className="text-[11px] text-[#009eda] hover:text-[#0089c4] transition-colors cursor-pointer flex items-center gap-1">
              View all <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="divide-y divide-black/[0.04]">
            {TOP_UP_REQUESTS.map(req => (
              <div key={req.id} className="flex items-center gap-4 px-5 py-3">
                <span className="text-[11px] text-gray-400 w-14 shrink-0 font-mono">{req.date}</span>
                <div className="flex-1 min-w-0">
                  <span className="text-[12px] text-gray-900 font-medium">{req.amount}</span>
                  <span className="text-[11px] text-gray-400 ml-2">· {req.budget} · requested by {req.by}</span>
                </div>
                <span className="text-[11px] font-medium shrink-0">
                  {req.status === 'approved' && (
                    <span className="flex items-center gap-1 text-emerald-600">
                      <Check className="w-3 h-3" /> Approved
                    </span>
                  )}
                  {req.status === 'pending' && (
                    <span className="flex items-center gap-1 text-amber-600">
                      <Clock className="w-3 h-3" /> Pending
                    </span>
                  )}
                  {req.status === 'rejected' && (
                    <span className="flex items-center gap-1 text-red-500">
                      <X className="w-3 h-3" /> Rejected
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Zone B: Burn rates ─────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-black/[0.12] bg-gray-50/60 p-5">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Month-to-date usage</h4>
          <div className="flex items-center gap-2">
            {/* Pro: project filter */}
            {isPro && (
              <div className="relative">
                <select
                  value={projectFilter}
                  onChange={e => setProjectFilter(e.target.value)}
                  className="appearance-none pl-7 pr-7 py-1.5 rounded-lg border border-black/[0.12] text-[11px] text-gray-600 bg-white cursor-pointer focus:outline-none focus:border-[#009eda]"
                >
                  <option value="all">All projects</option>
                  {PROJECT_TAGS.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <Tag className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
              </div>
            )}
            {/* Enterprise: breakdown toggle */}
            {isEnterprise && (
              <button
                onClick={() => setShowBreakdown(v => !v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-medium transition-colors cursor-pointer ${
                  showBreakdown
                    ? 'bg-[#009eda]/10 border-[#009eda]/30 text-[#009eda]'
                    : 'border-black/[0.12] text-gray-600 hover:bg-black/[0.04]'
                }`}
              >
                <BarChart2 className="w-3 h-3" />
                {showBreakdown ? 'Hide breakdown' : 'View breakdown'}
              </button>
            )}
            {/* All tiers: export */}
            {isPaid && (
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-black/[0.12] text-[11px] font-medium text-gray-600 hover:bg-black/[0.04] transition-colors cursor-pointer">
                <Download className="w-3 h-3" />
                Export
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <BurnStat label="Daily avg"
            ic={activeProjectData ? (activeProjectData.ic / 30).toFixed(1) : BURN.ic.daily}
            tc={activeProjectData ? (activeProjectData.tc / 30).toFixed(2) : BURN.tc.daily}
            unit="/ day" />
          <BurnStat label="Weekly avg"
            ic={activeProjectData ? (activeProjectData.ic / 4).toFixed(1) : BURN.ic.weekly}
            tc={activeProjectData ? (activeProjectData.tc / 4).toFixed(2) : BURN.tc.weekly}
            unit="/ wk" />
          <BurnStat label="Used this month"
            ic={activeProjectData ? activeProjectData.ic : BURN.ic.projectedEOM}
            tc={activeProjectData ? activeProjectData.tc : BURN.tc.projectedEOM}
            unit="so far" />
        </div>

        {/* Enterprise breakdown table */}
        <AnimatePresence>
          {isEnterprise && showBreakdown && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-5 pt-4 border-t border-black/[0.08]">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="text-left">
                      <th className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider pb-2">Team / Budget</th>
                      <th className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider pb-2">Billing Entity</th>
                      <th className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider pb-2 text-right">IC Used</th>
                      <th className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider pb-2 text-right">TC Used</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/[0.04]">
                    {TEAM_USAGE.map((row, i) => (
                      <tr key={i}>
                        <td className="py-2 font-medium text-gray-900">{row.team}</td>
                        <td className="py-2 text-gray-500">{row.entity}</td>
                        <td className="py-2 font-mono text-gray-900 text-right">{row.ic.toLocaleString()}</td>
                        <td className="py-2 font-mono text-violet-600 text-right">{row.tc}</td>
                      </tr>
                    ))}
                    <tr className="border-t border-black/[0.08]">
                      <td className="py-2 font-semibold text-gray-900">Total</td>
                      <td />
                      <td className="py-2 font-mono font-semibold text-gray-900 text-right">1,753</td>
                      <td className="py-2 font-mono font-semibold text-violet-600 text-right">0.4</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Zone C: Plan comparison ────────────────────────────────────────────── */}
      <div>
        <h4 className="text-[13px] font-semibold text-gray-900 mb-4">All plans</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <PlanCard
            name="Standard"
            tagline="Fast AI intelligence for everyday work."
            price={annualStandard ? 17 : 20}
            priceNote="per month"
            inclVat
            annual={annualStandard}
            onToggleAnnual={() => setAnnualStandard(v => !v)}
            isCurrent={tier === 'standard'}
            features={[
              '1,000 Intelligence Credits',
              'Standard AI Translation',
            ]}
            cta={tier === 'standard' ? null : 'Upgrade to Standard'}
            ctaVariant="outline"
          />

          <PlanCard
            name="Plus / Pro Individual"
            tagline="More credits and Specialty Verification for power users."
            price={annualPlus ? 31 : 35}
            priceNote="per month"
            inclVat
            annual={annualPlus}
            onToggleAnnual={() => setAnnualPlus(v => !v)}
            isCurrent={tier === 'plus'}
            features={[
              '2,000 Intelligence Credits',
              'Standard AI Translation',
              'Unlocked: AI Agent Specialty Verification',
            ]}
            cta={tier === 'plus' ? null : 'Upgrade to Plus'}
            ctaVariant="outline"
          />

          <PlanCard
            name="Team"
            tagline="Full platform — every AI feature plus Trust Credits and priority."
            price={annualPro ? TEAM_TIER.annualPrice : TEAM_TIER.price}
            priceNote="per month"
            inclVat
            annual={annualPro}
            onToggleAnnual={() => setAnnualPro(v => !v)}
            isCurrent={isPro}
            features={[
              '5,000 Intelligence Credits',
              'All AI features (Translation + Agent)',
              '2 Trust Credits',
              'Priority processing & Rollovers',
            ]}
            cta={isPro ? null : 'Upgrade to Team'}
            ctaVariant="primary"
          />

          <PlanCard
            name="Enterprise"
            tagline="Built for large orgs needing flexibility, scale, and governance."
            priceLabel="Platform fee"
            priceSub="Based on company size, covering all employees"
            isCurrent={isEnterprise}
            features={[
              'Volume-based credit pricing',
              'Dedicated support',
              'Onboarding services',
              'Design systems',
              'SSO + advanced security',
            ]}
            cta={isEnterprise ? null : 'Book a Demo'}
            ctaVariant="outline"
          />
        </div>
      </div>

      {/* ── Zone D: Auto top-off rates ─────────────────────────────────────────── */}
      <div className="rounded-xl border border-black/[0.08] bg-gray-50/60 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Info className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Auto Top-Off</span>
          </div>
          {!isEnterprise && (
            <button
              onClick={() => setShowAutoRules(true)}
              className="text-[11px] text-[#009eda] hover:text-[#0089c4] transition-colors cursor-pointer font-medium"
            >
              Configure rules
            </button>
          )}
          {isEnterprise && (
            <span className="text-[11px] text-gray-400">Managed via approval workflow</span>
          )}
        </div>
        <div className="flex gap-8">
          <div>
            <p className="text-[12px] font-medium text-gray-700">Intelligence Wallet</p>
            <p className="text-[13px] font-bold text-gray-900 mt-0.5">$10 <span className="text-[11px] font-normal text-gray-500">/ 1,000 credits</span></p>
          </div>
          <div className="w-px bg-black/[0.08]" />
          <div>
            <p className="text-[12px] font-medium text-gray-700">Trust Wallet</p>
            <p className="text-[13px] font-bold text-gray-900 mt-0.5">$38 <span className="text-[11px] font-normal text-gray-500">/ credit</span></p>
            <p className="text-[11px] text-gray-400">Bundle: 3 for $110</p>
          </div>
        </div>
      </div>

      {/* ── Invoice History ────────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-[13px] font-semibold text-gray-900">Invoice History</h4>
          <button className="flex items-center gap-1.5 text-[11px] font-medium text-gray-500 hover:text-gray-900 transition-colors cursor-pointer border border-black/[0.12] px-3 py-1.5 rounded-lg hover:bg-black/[0.03]">
            <Download className="w-3 h-3" />
            Export all
          </button>
        </div>
        <div className="rounded-xl border border-black/[0.12] bg-white overflow-hidden">
          <table className="w-full text-[12px]">
            <thead className="bg-gray-50/80 border-b border-black/[0.06]">
              <tr>
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Date</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Invoice</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Type</th>
                {isPaid && <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">PO Ref</th>}
                {isEnterprise && <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Entity</th>}
                <th className="text-right px-4 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Amount</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.04]">
              {visibleInvoices.map(inv => (
                <tr key={inv.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-4 py-3 text-gray-500">{inv.date}</td>
                  <td className="px-4 py-3 font-mono text-gray-700">{inv.id}</td>
                  <td className="px-4 py-3 text-gray-600">{inv.type}</td>
                  {isPaid && (
                    <td className="px-4 py-3 font-mono text-gray-600">
                      {inv.po || <span className="text-gray-300">—</span>}
                    </td>
                  )}
                  {isEnterprise && (
                    <td className="px-4 py-3 text-gray-600">{inv.entity}</td>
                  )}
                  <td className="px-4 py-3 font-mono text-gray-900 text-right">${inv.amount}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                      <Check className="w-3 h-3" /> Paid
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button className="text-[#009eda] hover:text-[#0089c4] transition-colors cursor-pointer">
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {INVOICES.length > 3 && (
            <div className="px-4 py-3 border-t border-black/[0.06] bg-gray-50/40 text-center">
              <button
                onClick={() => setShowAllInvoices(v => !v)}
                className="text-[12px] text-[#009eda] hover:text-[#0089c4] transition-colors cursor-pointer font-medium"
              >
                {showAllInvoices ? 'Show fewer' : `Show all ${INVOICES.length} invoices`}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Modals ────────────────────────────────────────────────────────────── */}
      <PurchaseCreditsModal
        isOpen={showPurchase}
        onClose={() => setShowPurchase(false)}
        showPo={isPaid}
      />
      <TopUpRequestModal
        isOpen={showTopUpRequest}
        onClose={() => setShowTopUpRequest(false)}
      />
      <AutoTopUpRulesModal
        isOpen={showAutoRules}
        onClose={() => setShowAutoRules(false)}
      />
    </div>
  )
}

// ── Purchase Credits Modal (Standard / Pro) ───────────────────────────────────

function PurchaseCreditsModal({ isOpen, onClose, showPo }) {
  const [wallet, setWallet] = useState('ic')
  const [icAmount, setIcAmount] = useState(1000)
  const [tcAmount, setTcAmount] = useState(1)
  const [po, setPo] = useState('')

  const selectedIc = IC_AMOUNTS.find(a => a.credits === icAmount)
  const selectedTc = PURCHASE_TC_OPTIONS.find(a => a.credits === tcAmount)
  const cost = wallet === 'ic' ? selectedIc?.cost : selectedTc?.cost

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <motion.div className="absolute inset-0 bg-black/40 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} onClick={onClose} />
          <motion.div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" initial={{ opacity: 0, scale: 0.97, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: 8 }} transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-black/[0.08]">
              <h3 className="text-[15px] font-semibold text-gray-900">Purchase credits</h3>
              <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-black/[0.06] hover:text-gray-600 transition-colors cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] font-medium text-gray-500 mb-2">Wallet</label>
                <div className="flex gap-2">
                  {[
                    { value: 'ic', label: 'Intelligence Credits' },
                    { value: 'tc', label: 'Trust Credits' },
                  ].map(w => (
                    <button
                      key={w.value}
                      onClick={() => setWallet(w.value)}
                      className={`flex-1 py-2 rounded-lg border text-[12px] font-medium transition-colors cursor-pointer ${
                        wallet === w.value ? 'border-[#009eda] bg-[#009eda]/5 text-[#009eda]' : 'border-black/[0.12] text-gray-600 hover:bg-black/[0.03]'
                      }`}
                    >
                      {w.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-500 mb-1.5">Amount</label>
                <div className="relative">
                  <select
                    value={wallet === 'ic' ? icAmount : tcAmount}
                    onChange={e => wallet === 'ic' ? setIcAmount(Number(e.target.value)) : setTcAmount(Number(e.target.value))}
                    className="w-full appearance-none pl-3 pr-8 py-2 rounded-lg border border-black/[0.12] text-[12px] text-gray-700 bg-white cursor-pointer focus:outline-none focus:border-[#009eda]"
                  >
                    {wallet === 'ic'
                      ? IC_AMOUNTS.map(a => <option key={a.credits} value={a.credits}>+{a.credits.toLocaleString()} credits — ${a.cost}</option>)
                      : PURCHASE_TC_OPTIONS.map(a => <option key={a.credits} value={a.credits}>{a.label}</option>)
                    }
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                </div>
              </div>
              {showPo && (
                <div>
                  <label className="block text-[11px] font-medium text-gray-500 mb-1.5">PO reference <span className="text-gray-400 font-normal">(optional)</span></label>
                  <input
                    type="text"
                    value={po}
                    onChange={e => setPo(e.target.value)}
                    placeholder="e.g. PO-2025-044"
                    className="w-full px-3 py-2 rounded-lg border border-black/[0.12] text-[12px] text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#009eda]"
                  />
                </div>
              )}
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg border border-black/[0.15] text-[13px] font-medium text-gray-700 hover:bg-black/[0.03] transition-colors cursor-pointer">Cancel</button>
              <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg bg-[#009eda] text-[13px] font-semibold text-white hover:bg-[#0089c4] transition-colors cursor-pointer">
                Purchase — ${cost}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  )
}

// ── Top-Up Request Modal (Enterprise) ────────────────────────────────────────

function TopUpRequestModal({ isOpen, onClose }) {
  const [wallet, setWallet] = useState('ic')
  const [icAmount, setIcAmount] = useState(1000)
  const [tcAmount, setTcAmount] = useState(1)
  const [budget, setBudget] = useState('b1')
  const [po, setPo] = useState('')
  const [note, setNote] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = () => setSubmitted(true)

  const selectedIc = IC_AMOUNTS.find(a => a.credits === icAmount)
  const selectedTc = PURCHASE_TC_OPTIONS.find(a => a.credits === tcAmount)
  const cost = wallet === 'ic' ? selectedIc?.cost : selectedTc?.cost

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <motion.div className="absolute inset-0 bg-black/40 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} onClick={onClose} />
          <motion.div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" initial={{ opacity: 0, scale: 0.97, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: 8 }} transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-black/[0.08]">
              <div>
                <h3 className="text-[15px] font-semibold text-gray-900">Request credit top-up</h3>
                <p className="text-[12px] text-gray-500 mt-0.5">Requires approval from your billing admin.</p>
              </div>
              <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-black/[0.06] hover:text-gray-600 transition-colors cursor-pointer"><X className="w-4 h-4" /></button>
            </div>

            {submitted ? (
              <div className="p-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mx-auto">
                  <Check className="w-6 h-6 text-emerald-500" />
                </div>
                <p className="text-[14px] font-semibold text-gray-900">Request submitted</p>
                <p className="text-[12px] text-gray-500">Your billing admin has been notified and will review the request shortly.</p>
                <button onClick={onClose} className="mt-4 px-6 py-2.5 rounded-lg bg-[#009eda] text-[13px] font-semibold text-white hover:bg-[#0089c4] transition-colors cursor-pointer">Done</button>
              </div>
            ) : (
              <>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 mb-2">Wallet</label>
                    <div className="flex gap-2">
                      {[{ value: 'ic', label: 'Intelligence' }, { value: 'tc', label: 'Trust' }].map(w => (
                        <button key={w.value} onClick={() => setWallet(w.value)} className={`flex-1 py-2 rounded-lg border text-[12px] font-medium transition-colors cursor-pointer ${wallet === w.value ? 'border-[#009eda] bg-[#009eda]/5 text-[#009eda]' : 'border-black/[0.12] text-gray-600 hover:bg-black/[0.03]'}`}>{w.label}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 mb-1.5">Amount</label>
                    <div className="relative">
                      <select value={wallet === 'ic' ? icAmount : tcAmount} onChange={e => wallet === 'ic' ? setIcAmount(Number(e.target.value)) : setTcAmount(Number(e.target.value))} className="w-full appearance-none pl-3 pr-8 py-2 rounded-lg border border-black/[0.12] text-[12px] text-gray-700 bg-white cursor-pointer focus:outline-none focus:border-[#009eda]">
                        {wallet === 'ic' ? IC_AMOUNTS.map(a => <option key={a.credits} value={a.credits}>+{a.credits.toLocaleString()} credits — ${a.cost}</option>) : PURCHASE_TC_OPTIONS.map(a => <option key={a.credits} value={a.credits}>{a.label}</option>)}
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 mb-1.5">Assign to budget</label>
                    <div className="relative">
                      <select value={budget} onChange={e => setBudget(e.target.value)} className="w-full appearance-none pl-3 pr-8 py-2 rounded-lg border border-black/[0.12] text-[12px] text-gray-700 bg-white cursor-pointer focus:outline-none focus:border-[#009eda]">
                        {ENTERPRISE_BUDGETS.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 mb-1.5">PO reference <span className="font-normal text-gray-400">(optional)</span></label>
                    <input type="text" value={po} onChange={e => setPo(e.target.value)} placeholder="e.g. PO-2025-044" className="w-full px-3 py-2 rounded-lg border border-black/[0.12] text-[12px] text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#009eda]" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 mb-1.5">Note for approver <span className="font-normal text-gray-400">(optional)</span></label>
                    <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Needed for Q4 APAC compliance work" rows={2} className="w-full px-3 py-2 rounded-lg border border-black/[0.12] text-[12px] text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#009eda] resize-none" />
                  </div>
                </div>
                <div className="flex gap-3 px-6 pb-6">
                  <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg border border-black/[0.15] text-[13px] font-medium text-gray-700 hover:bg-black/[0.03] transition-colors cursor-pointer">Cancel</button>
                  <button onClick={handleSubmit} className="flex-1 px-4 py-2.5 rounded-lg bg-[#009eda] text-[13px] font-semibold text-white hover:bg-[#0089c4] transition-colors cursor-pointer">Submit request</button>
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  )
}

// ── Auto Top-Up Rules Modal ────────────────────────────────────────────────────

function AutoTopUpRulesModal({ isOpen, onClose }) {
  const [icEnabled, setIcEnabled] = useState(false)
  const [icThreshold, setIcThreshold] = useState(500)
  const [icAmount, setIcAmount] = useState(1000)
  const [tcEnabled, setTcEnabled] = useState(false)
  const [tcThreshold, setTcThreshold] = useState(0)
  const [tcAmount, setTcAmount] = useState(1)

  const selectedIcAmount = IC_AMOUNTS.find(a => a.credits === icAmount)
  const selectedTcAmount = TC_AMOUNTS.find(a => a.credits === tcAmount)

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <motion.div className="absolute inset-0 bg-black/40 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} onClick={onClose} />
          <motion.div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" initial={{ opacity: 0, scale: 0.97, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: 8 }} transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-black/[0.08]">
              <div>
                <h3 className="text-[15px] font-semibold text-gray-900">Auto top-up rules</h3>
                <p className="text-[12px] text-gray-500 mt-0.5">Auto-refill wallets when they run low.</p>
              </div>
              <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-black/[0.06] hover:text-gray-600 transition-colors cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 space-y-5">
              <WalletRule
                icon={<Zap className="w-3.5 h-3.5 text-[#009eda]" />}
                label="Intelligence Credits"
                enabled={icEnabled}
                onToggle={() => setIcEnabled(v => !v)}
                thresholdOptions={IC_THRESHOLDS}
                threshold={icThreshold}
                onThresholdChange={v => setIcThreshold(Number(v))}
                thresholdLabel="Top up when balance falls below"
                amountOptions={IC_AMOUNTS.map(a => ({ value: a.credits, label: `+${a.credits.toLocaleString()} credits — $${a.cost}` }))}
                amount={icAmount}
                onAmountChange={v => setIcAmount(Number(v))}
                amountLabel="Add credits"
                rateNote="$10 / 1,000 credits"
              />
              <div className="h-px bg-black/[0.06]" />
              <WalletRule
                icon={<Shield className="w-3.5 h-3.5 text-violet-500" />}
                label="Trust Credits"
                enabled={tcEnabled}
                onToggle={() => setTcEnabled(v => !v)}
                thresholdOptions={TC_THRESHOLDS.map(t => ({ value: t.value, label: t.label }))}
                threshold={tcThreshold}
                onThresholdChange={v => setTcThreshold(Number(v))}
                thresholdLabel="Top up when balance falls below"
                amountOptions={TC_AMOUNTS.map(a => ({ value: a.credits, label: a.label }))}
                amount={tcAmount}
                onAmountChange={v => setTcAmount(Number(v))}
                amountLabel="Add credits"
                rateNote="$38 / credit · Bundle: 3 for $110"
              />
            </div>
            {(icEnabled || tcEnabled) && (
              <div className="mx-6 mb-4 rounded-lg bg-gray-50 border border-black/[0.06] px-4 py-3 text-[12px] text-gray-600 space-y-1">
                {icEnabled && selectedIcAmount && <p>When IC drops below <strong className="text-gray-900">{icThreshold.toLocaleString()} IC</strong>, add <strong className="text-gray-900">+{icAmount.toLocaleString()} IC</strong> for <strong className="text-gray-900">${selectedIcAmount.cost}</strong>.</p>}
                {tcEnabled && selectedTcAmount && <p>When TC drops below <strong className="text-gray-900">{tcThreshold} TC</strong>, add <strong className="text-gray-900">+{tcAmount} TC</strong> for <strong className="text-gray-900">${selectedTcAmount.cost}</strong>.</p>}
              </div>
            )}
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg border border-black/[0.15] text-[13px] font-medium text-gray-700 hover:bg-black/[0.03] transition-colors cursor-pointer">Cancel</button>
              <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg bg-[#009eda] text-[13px] font-semibold text-white hover:bg-[#0089c4] transition-colors cursor-pointer">Save rules</button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  )
}

// ── WalletRule ─────────────────────────────────────────────────────────────────

function WalletRule({ icon, label, enabled, onToggle, thresholdOptions, threshold, onThresholdChange, thresholdLabel, amountOptions, amount, onAmountChange, amountLabel, rateNote }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-gray-100 flex items-center justify-center">{icon}</div>
          <span className="text-[13px] font-semibold text-gray-900">{label}</span>
        </div>
        <button role="switch" aria-checked={enabled} onClick={onToggle} className="relative rounded-full transition-colors cursor-pointer focus:outline-none" style={{ height: '20px', width: '36px', backgroundColor: enabled ? '#009eda' : '#e5e7eb' }}>
          <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
        </button>
      </div>
      <AnimatePresence>
        {enabled && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.18 }} className="overflow-hidden">
            <div className="space-y-3 pl-8">
              <div>
                <label className="block text-[11px] font-medium text-gray-500 mb-1.5">{thresholdLabel}</label>
                <div className="relative">
                  <select value={threshold} onChange={e => onThresholdChange(e.target.value)} className="w-full appearance-none pl-3 pr-8 py-2 rounded-lg border border-black/[0.12] text-[12px] text-gray-700 bg-white cursor-pointer focus:outline-none focus:border-[#009eda]">
                    {thresholdOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-500 mb-1.5">{amountLabel}</label>
                <div className="relative">
                  <select value={amount} onChange={e => onAmountChange(e.target.value)} className="w-full appearance-none pl-3 pr-8 py-2 rounded-lg border border-black/[0.12] text-[12px] text-gray-700 bg-white cursor-pointer focus:outline-none focus:border-[#009eda]">
                    {amountOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <p className="text-[11px] text-gray-400">{rateNote}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Helper sub-components ─────────────────────────────────────────────────────

function BurnStat({ label, ic, tc, unit }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">{label}</p>
      <div className="space-y-1">
        <div className="flex items-baseline gap-1.5">
          <span className="text-[15px] font-bold font-mono text-gray-900">{typeof ic === 'number' && ic % 1 !== 0 ? Number(ic).toFixed(0) : String(ic)}</span>
          <span className="text-[11px] text-gray-500">IC {unit}</span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-[13px] font-bold font-mono text-violet-600">{tc}</span>
          <span className="text-[11px] text-gray-500">TC {unit}</span>
        </div>
      </div>
    </div>
  )
}

function PlanCard({ name, tagline, price, priceLabel, priceSub, priceNote, inclVat, annual, onToggleAnnual, isCurrent, features, caveat, cta, ctaVariant }) {
  return (
    <div className={`rounded-xl bg-white p-5 flex flex-col gap-4 ${isCurrent ? 'border-2 border-[#009eda]' : 'border border-black/[0.12]'}`}>
      <div>
        <p className="text-[14px] font-bold text-gray-900 mb-0.5">{name}</p>
        <p className="text-[11px] text-gray-500 leading-relaxed">{tagline}</p>
      </div>
      {priceLabel ? (
        <div>
          <p className="text-[24px] font-bold text-gray-900">{priceLabel}</p>
          {priceSub && <p className="text-[11px] text-gray-500 mt-0.5">{priceSub}</p>}
        </div>
      ) : (
        <div>
          <div className="text-center">
            <span className="text-[28px] font-bold text-gray-900">${price}</span>
            <span className="text-[12px] text-gray-500 ml-1">{priceNote}</span>
            {inclVat && <p className="text-[10px] text-gray-400 mt-0.5">incl. VAT · shared across unlimited users</p>}
          </div>
          {onToggleAnnual && (
            <label className="flex items-center gap-2 cursor-pointer select-none mt-2">
              <div className="relative rounded-full transition-colors" style={{ height: '18px', width: '32px', backgroundColor: annual ? '#009eda' : '#e5e7eb' }} onClick={onToggleAnnual}>
                <div className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-transform ${annual ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </div>
              <span className="text-[11px] text-gray-500">Annual {annual && <span className="text-emerald-600 font-medium">(save 15%)</span>}</span>
            </label>
          )}
        </div>
      )}
      {features && (
        <ul className="space-y-1.5 flex-1">
          {features.map(f => (
            <li key={f} className="flex items-start gap-2 text-[12px] text-gray-700">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
              {f}
            </li>
          ))}
          {caveat && <li className="text-[11px] text-gray-400 mt-2 pl-5">{caveat}</li>}
        </ul>
      )}
      {isCurrent && (
        <div className="mt-auto px-4 py-2.5 rounded-lg text-center text-[13px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          Current Plan
        </div>
      )}
      {cta && (
        <button className={`mt-auto w-full px-4 py-2.5 rounded-lg text-[13px] font-semibold transition-colors cursor-pointer ${ctaVariant === 'outline' ? 'border border-black/[0.15] text-gray-700 hover:bg-black/[0.04]' : 'bg-[#009eda] text-white hover:bg-[#0089c4]'}`}>
          {cta}
        </button>
      )}
    </div>
  )
}
