import { useState } from 'react'
import { LayoutList, Users, Zap, Shield, Plus, X, Edit2, Check, AlertCircle, ChevronDown } from 'lucide-react'

const MOCK_BUDGETS = [
  {
    id: 'b1',
    name: 'M&A Team — Q2',
    entity: 'Meridian Capital Ltd.',
    members: 4,
    ic: { allocated: 2000, used: 1459 },
    tc: { allocated: 1, used: 0.6 },
    alertThreshold: 80,
  },
  {
    id: 'b2',
    name: 'Compliance — APAC',
    entity: 'Meridian Asia Holdings Pte. Ltd.',
    members: 3,
    ic: { allocated: 1500, used: 612 },
    tc: { allocated: 0.5, used: 0 },
    alertThreshold: 75,
  },
  {
    id: 'b3',
    name: 'Corporate Communications',
    entity: 'Meridian Capital Ltd.',
    members: 2,
    ic: { allocated: 500, used: 294 },
    tc: { allocated: 0, used: 0 },
    alertThreshold: 90,
  },
]

export default function BudgetsAndAllocations() {
  const [budgets, setBudgets] = useState(MOCK_BUDGETS)
  const [showCreate, setShowCreate] = useState(false)

  const totalIcAllocated = budgets.reduce((s, b) => s + b.ic.allocated, 0)
  const totalTcAllocated = budgets.reduce((s, b) => s + b.tc.allocated, 0)

  return (
    <div>
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 className="text-[15px] font-semibold text-gray-900">Budgets & Allocations</h2>
          <p className="text-[12px] text-gray-500 mt-0.5">Set credit limits per team or project to manage spend across your organisation.</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium bg-[#3D16FA] text-white hover:bg-[#2E10C4] transition-colors cursor-pointer shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          Create budget
        </button>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <SummaryCard icon={Zap} label="IC Allocated" value={`${totalIcAllocated.toLocaleString()} IC`} note="across all budgets" color="text-amber-500" bg="bg-amber-50" />
        <SummaryCard icon={Shield} label="TC Allocated" value={`${totalTcAllocated.toFixed(1)} TC`} note="across all budgets" color="text-blue-500" bg="bg-blue-50" />
      </div>

      <div className="flex flex-col gap-3">
        {budgets.map(budget => (
          <BudgetCard key={budget.id} budget={budget} onUpdate={updated => setBudgets(budgets.map(b => b.id === updated.id ? updated : b))} />
        ))}
      </div>

      {showCreate && (
        <CreateBudgetModal
          onClose={() => setShowCreate(false)}
          onCreate={b => { setBudgets([...budgets, { ...b, id: `b${Date.now()}`, ic: { allocated: b.icAllocation, used: 0 }, tc: { allocated: b.tcAllocation, used: 0 } }]); setShowCreate(false) }}
        />
      )}
    </div>
  )
}

function SummaryCard({ icon: Icon, label, value, note, color, bg }) {
  return (
    <div className="border border-black/[0.08] rounded-xl p-4 bg-white flex items-center gap-3">
      <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <div>
        <p className="text-[11px] text-gray-400">{label}</p>
        <p className="text-[14px] font-semibold text-gray-900">{value}</p>
        <p className="text-[11px] text-gray-400">{note}</p>
      </div>
    </div>
  )
}

function BudgetCard({ budget, onUpdate }) {
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(null)

  const icPct = Math.round((budget.ic.used / budget.ic.allocated) * 100) || 0
  const tcPct = budget.tc.allocated > 0 ? Math.round((budget.tc.used / budget.tc.allocated) * 100) : 0
  const atRisk = icPct >= budget.alertThreshold || (budget.tc.allocated > 0 && tcPct >= budget.alertThreshold)

  const startEdit = () => {
    setDraft({ ...budget, icAllocated: budget.ic.allocated, tcAllocated: budget.tc.allocated })
    setEditing(true)
  }

  const save = () => {
    onUpdate({
      ...budget,
      name: draft.name,
      alertThreshold: draft.alertThreshold,
      ic: { ...budget.ic, allocated: Number(draft.icAllocated) },
      tc: { ...budget.tc, allocated: Number(draft.tcAllocated) },
    })
    setEditing(false)
    setDraft(null)
  }

  return (
    <div className={`border rounded-xl bg-white transition-colors ${atRisk && !editing ? 'border-amber-200' : 'border-black/[0.08]'}`}>
      {/* Header row */}
      <div className="flex items-center gap-3 p-4">
        <div className="w-8 h-8 rounded-lg bg-[#3D16FA]/10 flex items-center justify-center shrink-0">
          <LayoutList className="w-4 h-4 text-[#3D16FA]" />
        </div>
        <div className="flex-1 min-w-0">
          {editing ? (
            <input
              value={draft.name}
              onChange={e => setDraft({ ...draft, name: e.target.value })}
              className="text-[13px] font-semibold text-gray-900 w-full border border-black/[0.12] rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#3D16FA]/40 mb-0.5"
            />
          ) : (
            <div className="flex items-center gap-2">
              <p className="text-[13px] font-semibold text-gray-900 truncate">{budget.name}</p>
              {atRisk && <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
            </div>
          )}
          <p className="text-[11px] text-gray-400 truncate">{budget.entity}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="flex items-center gap-1 text-[11px] text-gray-400">
            <Users className="w-3 h-3" />
            {budget.members}
          </div>
          {editing ? (
            <>
              <button onClick={() => { setEditing(false); setDraft(null) }} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-black/[0.04] transition-colors cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
              <button onClick={save} className="p-1.5 rounded-lg text-[#3D16FA] hover:bg-[#3D16FA]/10 transition-colors cursor-pointer">
                <Check className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <>
              <button onClick={startEdit} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] text-gray-600 hover:bg-black/[0.04] hover:text-gray-900 transition-colors cursor-pointer border border-black/[0.06]">
                <Edit2 className="w-3 h-3" />
                Edit
              </button>
              <button onClick={() => setExpanded(!expanded)} className="p-1.5 rounded-lg text-gray-400 hover:bg-black/[0.04] transition-colors cursor-pointer">
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Progress bars */}
      <div className="px-4 pb-4 flex flex-col gap-3">
        <ProgressRow
          icon={Zap}
          label="Intelligence Credits"
          used={budget.ic.used}
          allocated={editing ? Number(draft.icAllocated) : budget.ic.allocated}
          unit="IC"
          pct={icPct}
          threshold={budget.alertThreshold}
          color="bg-amber-400"
          isEditing={editing}
          editValue={draft?.icAllocated}
          onEditChange={v => setDraft({ ...draft, icAllocated: v })}
        />
        {(budget.tc.allocated > 0 || editing) && (
          <ProgressRow
            icon={Shield}
            label="Trust Credits"
            used={budget.tc.used}
            allocated={editing ? Number(draft.tcAllocated) : budget.tc.allocated}
            unit="TC"
            pct={tcPct}
            threshold={budget.alertThreshold}
            color="bg-blue-400"
            isEditing={editing}
            editValue={draft?.tcAllocated}
            onEditChange={v => setDraft({ ...draft, tcAllocated: v })}
          />
        )}
        {editing && (
          <div className="flex items-center gap-3 pt-1">
            <span className="text-[11px] text-gray-500 shrink-0">Alert at</span>
            <select
              value={draft.alertThreshold}
              onChange={e => setDraft({ ...draft, alertThreshold: Number(e.target.value) })}
              className="text-[12px] text-gray-700 border border-black/[0.12] rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#3D16FA]/40 bg-white"
            >
              {[50, 60, 70, 75, 80, 85, 90, 95].map(v => <option key={v} value={v}>{v}%</option>)}
            </select>
            <span className="text-[11px] text-gray-400">of budget consumed</span>
          </div>
        )}
      </div>

      {/* Expanded detail */}
      {expanded && !editing && (
        <div className="border-t border-black/[0.06] px-4 py-3">
          <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-2">Budget details</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
            <DetailRow label="Alert threshold" value={`${budget.alertThreshold}% consumed`} />
            <DetailRow label="Members" value={String(budget.members)} />
            <DetailRow label="IC utilisation" value={`${icPct}%`} />
            {budget.tc.allocated > 0 && <DetailRow label="TC utilisation" value={`${tcPct}%`} />}
          </div>
        </div>
      )}
    </div>
  )
}

function ProgressRow({ icon: Icon, label, used, allocated, unit, pct, threshold, color, isEditing, editValue, onEditChange }) {
  const atRisk = pct >= threshold
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <Icon className={`w-3 h-3 ${atRisk ? 'text-amber-500' : 'text-gray-400'}`} />
          <span className="text-[11px] text-gray-500">{label}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-gray-700">
            {unit === 'IC' ? used.toLocaleString() : used.toFixed(1)} / {' '}
            {isEditing ? (
              <input
                value={editValue}
                onChange={e => onEditChange(e.target.value)}
                className="w-14 text-[11px] text-gray-700 border border-black/[0.12] rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-[#3D16FA]/40 inline-block"
              />
            ) : (
              unit === 'IC' ? allocated.toLocaleString() : allocated.toFixed(1)
            )} {unit}
          </span>
          <span className={`text-[10px] font-medium ${atRisk ? 'text-amber-500' : 'text-gray-400'}`}>{pct}%</span>
        </div>
      </div>
      <div className="h-1.5 rounded-full bg-black/[0.06] overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${atRisk ? 'bg-amber-400' : color}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  )
}

function DetailRow({ label, value }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-gray-400 w-28 shrink-0">{label}</span>
      <span className="text-[11px] text-gray-700">{value}</span>
    </div>
  )
}

function CreateBudgetModal({ onClose, onCreate }) {
  const [form, setForm] = useState({ name: '', entity: 'Meridian Capital Ltd.', icAllocation: 1000, tcAllocation: 0, alertThreshold: 80 })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const valid = form.name.trim().length > 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[14px] font-semibold text-gray-900">Create Budget</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-black/[0.04] transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <div>
            <label className="text-[11px] font-medium text-gray-500 block mb-1">Budget name *</label>
            <input
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="e.g. M&A Team — Q3"
              className="w-full text-[12px] text-gray-700 border border-black/[0.12] rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#3D16FA]/40 placeholder:text-gray-300"
            />
          </div>
          <div>
            <label className="text-[11px] font-medium text-gray-500 block mb-1">Billing entity</label>
            <select
              value={form.entity}
              onChange={e => set('entity', e.target.value)}
              className="w-full text-[12px] text-gray-700 border border-black/[0.12] rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#3D16FA]/40 bg-white"
            >
              <option>Meridian Capital Ltd.</option>
              <option>Meridian Asia Holdings Pte. Ltd.</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-medium text-gray-500 block mb-1">IC allocation</label>
              <input
                type="number"
                value={form.icAllocation}
                onChange={e => set('icAllocation', Number(e.target.value))}
                className="w-full text-[12px] text-gray-700 border border-black/[0.12] rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#3D16FA]/40"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-gray-500 block mb-1">TC allocation</label>
              <input
                type="number"
                step="0.1"
                value={form.tcAllocation}
                onChange={e => set('tcAllocation', Number(e.target.value))}
                className="w-full text-[12px] text-gray-700 border border-black/[0.12] rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#3D16FA]/40"
              />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-medium text-gray-500 block mb-1">Alert threshold</label>
            <select
              value={form.alertThreshold}
              onChange={e => set('alertThreshold', Number(e.target.value))}
              className="w-full text-[12px] text-gray-700 border border-black/[0.12] rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#3D16FA]/40 bg-white"
            >
              {[50, 60, 70, 75, 80, 85, 90, 95].map(v => <option key={v} value={v}>{v}% consumed</option>)}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-3 py-1.5 rounded-lg text-[12px] text-gray-600 hover:bg-black/[0.04] transition-colors cursor-pointer">Cancel</button>
          <button
            onClick={() => valid && onCreate(form)}
            disabled={!valid}
            className={`px-4 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${valid ? 'bg-[#3D16FA] text-white hover:bg-[#2E10C4] cursor-pointer' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
          >
            Create budget
          </button>
        </div>
      </div>
    </div>
  )
}
