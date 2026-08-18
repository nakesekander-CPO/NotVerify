import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, ChevronRight, Play, Pause, Trash2, Edit2, X, Check,
  Zap, Filter, ArrowRight, ChevronDown, Clock, CheckCircle2,
  AlertCircle, Copy, Sparkles,
} from 'lucide-react'
import { CONNECTORS, TRIGGERS, CONDITION_TYPES, CONNECTOR_ACTIONS, WORKFLOW_TEMPLATES } from './data.js'

const SPRING = { type: 'spring', stiffness: 300, damping: 20 }

const MOCK_LOG = [
  { id: 1, workflow: 'Notify team on completion', trigger: 'Human review approved', ts: '2026-03-30 14:22', status: 'success', duration: '0.8s' },
  { id: 2, workflow: 'Flag compliance issues', trigger: 'Compliance review flagged', ts: '2026-03-30 11:05', status: 'success', duration: '1.2s' },
  { id: 3, workflow: 'Sync to knowledge base', trigger: 'Cortex entry updated', ts: '2026-03-29 16:48', status: 'success', duration: '0.5s' },
  { id: 4, workflow: 'Quality alert — JA', trigger: 'Quality score threshold met', ts: '2026-03-28 09:33', status: 'failed', duration: '—' },
  { id: 5, workflow: 'Notify team on completion', trigger: 'Human review approved', ts: '2026-03-27 15:10', status: 'success', duration: '0.9s' },
]

function ConnectorIcon({ connectorId, size = 'sm' }) {
  const connector = CONNECTORS.find(c => c.id === connectorId)
  if (!connector) return null
  const cls = size === 'sm' ? 'w-6 h-6 text-[10px]' : 'w-8 h-8 text-[12px]'
  return (
    <div
      className={`${cls} rounded-lg flex items-center justify-center font-bold text-white shrink-0`}
      style={{ backgroundColor: connector.color }}
    >
      {connector.letter}
    </div>
  )
}

function WorkflowCard({ workflow, onEdit, onDelete, onToggle }) {
  const trigger = TRIGGERS.find(t => t.id === workflow.trigger)
  return (
    <div className="border border-black/[0.08] rounded-xl bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-[13px] font-semibold text-gray-900">{workflow.name}</p>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
              workflow.active ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'
            }`}>
              {workflow.active ? 'Active' : 'Paused'}
            </span>
          </div>
          <p className="text-[12px] text-gray-400 mb-2">{workflow.description || 'No description'}</p>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-gray-50 border border-black/[0.06]">
              <Zap className="w-3 h-3 text-amber-500" />
              <span className="text-[11px] text-gray-600">{trigger?.label || workflow.trigger}</span>
            </div>
            {workflow.condition && (
              <>
                <ChevronRight className="w-3 h-3 text-gray-300" />
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-gray-50 border border-black/[0.06]">
                  <Filter className="w-3 h-3 text-blue-400" />
                  <span className="text-[11px] text-gray-600">
                    {CONDITION_TYPES.find(c => c.id === workflow.condition.type)?.label} {workflow.condition.value}
                  </span>
                </div>
              </>
            )}
            <ChevronRight className="w-3 h-3 text-gray-300" />
            <div className="flex items-center gap-1.5">
              {workflow.actions.map((a, i) => (
                <ConnectorIcon key={i} connectorId={a.connectorId} />
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => onToggle(workflow.id)}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-black/[0.04] hover:text-gray-600 transition-colors cursor-pointer"
            title={workflow.active ? 'Pause workflow' : 'Activate workflow'}
          >
            {workflow.active ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>
          <button onClick={() => onEdit(workflow)} className="p-1.5 rounded-lg text-gray-400 hover:bg-black/[0.04] hover:text-gray-600 transition-colors cursor-pointer">
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onDelete(workflow.id)} className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-400 transition-colors cursor-pointer">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

function BuilderCard({ title, icon: Icon, color, children, onRemove }) {
  return (
    <div className="border border-black/[0.08] rounded-xl bg-white overflow-hidden min-w-0 flex-1">
      <div className={`flex items-center justify-between px-4 py-3 border-b border-black/[0.06] ${color}`}>
        <div className="flex items-center gap-2">
          <Icon className="w-3.5 h-3.5" />
          <span className="text-[11px] font-semibold uppercase tracking-wide">{title}</span>
        </div>
        {onRemove && (
          <button onClick={onRemove} className="p-0.5 rounded text-current opacity-50 hover:opacity-100 cursor-pointer">
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
      <div className="p-4">
        {children}
      </div>
    </div>
  )
}

function SelectField({ label, value, onChange, options }) {
  return (
    <div className="mb-3">
      <label className="text-[11px] font-medium text-gray-400 block mb-1">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full text-[12px] text-gray-700 border border-black/[0.12] rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#3D16FA]/40 bg-white"
      >
        <option value="">Select…</option>
        {options.map(o => (
          <option key={o.value || o} value={o.value || o}>{o.label || o}</option>
        ))}
      </select>
    </div>
  )
}

function TextField({ label, value, onChange, placeholder }) {
  return (
    <div className="mb-3">
      <label className="text-[11px] font-medium text-gray-400 block mb-1">{label}</label>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full text-[12px] text-gray-700 border border-black/[0.12] rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#3D16FA]/40 placeholder:text-gray-300"
      />
    </div>
  )
}

function WorkflowBuilder({ connectedIntegrations }) {
  const [tab, setTab] = useState('workflows') // 'workflows' | 'log'
  const [workflows, setWorkflows] = useState([])
  const [building, setBuilding] = useState(false)
  const [editingWorkflow, setEditingWorkflow] = useState(null)
  const [showTemplates, setShowTemplates] = useState(false)
  const [showTest, setShowTest] = useState(false)

  // Builder state
  const [bName, setBName] = useState('')
  const [bDescription, setBDescription] = useState('')
  const [bTrigger, setBTrigger] = useState('')
  const [bCondition, setBCondition] = useState(null) // null | { type, value }
  const [bActions, setBActions] = useState([{ connectorId: '', actionId: '', config: {} }])

  const connectedIds = connectedIntegrations.map(c => c.id)

  function startNew() {
    setBName('')
    setBDescription('')
    setBTrigger('')
    setBCondition(null)
    setBActions([{ connectorId: '', actionId: '', config: {} }])
    setEditingWorkflow(null)
    setBuilding(true)
  }

  function startEdit(wf) {
    setBName(wf.name)
    setBDescription(wf.description || '')
    setBTrigger(wf.trigger)
    setBCondition(wf.condition)
    setBActions(wf.actions.map(a => ({ ...a })))
    setEditingWorkflow(wf.id)
    setBuilding(true)
  }

  function cancelBuild() {
    setBuilding(false)
    setEditingWorkflow(null)
  }

  function saveWorkflow() {
    if (!bName.trim() || !bTrigger) return
    const wf = {
      id: editingWorkflow || `wf-${Date.now()}`,
      name: bName,
      description: bDescription,
      trigger: bTrigger,
      condition: bCondition,
      actions: bActions.filter(a => a.connectorId),
      active: true,
    }
    if (editingWorkflow) {
      setWorkflows(prev => prev.map(w => w.id === editingWorkflow ? wf : w))
    } else {
      setWorkflows(prev => [...prev, wf])
    }
    setBuilding(false)
    setEditingWorkflow(null)
  }

  function deleteWorkflow(id) {
    setWorkflows(prev => prev.filter(w => w.id !== id))
  }

  function toggleWorkflow(id) {
    setWorkflows(prev => prev.map(w => w.id === id ? { ...w, active: !w.active } : w))
  }

  function cloneTemplate(template) {
    // Filter actions to only include connected tools
    const filteredActions = template.actions.filter(a => connectedIds.includes(a.connectorId))
    const wf = {
      id: `wf-${Date.now()}`,
      name: template.name,
      description: template.description,
      trigger: template.trigger,
      condition: template.condition,
      actions: filteredActions.length > 0 ? filteredActions : template.actions,
      active: false,
    }
    setWorkflows(prev => [...prev, wf])
    setShowTemplates(false)
  }

  function updateAction(index, field, value) {
    setBActions(prev => {
      const updated = [...prev]
      if (field === 'connectorId') {
        updated[index] = { connectorId: value, actionId: '', config: {} }
      } else if (field === 'actionId') {
        updated[index] = { ...updated[index], actionId: value, config: {} }
      } else {
        updated[index] = { ...updated[index], config: { ...updated[index].config, [field]: value } }
      }
      return updated
    })
  }

  const canSave = bName.trim() && bTrigger && bActions.some(a => a.connectorId)

  if (building) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-5">
          <button onClick={cancelBuild} className="text-[12px] text-gray-400 hover:text-gray-600 cursor-pointer flex items-center gap-1">
            ← Back
          </button>
          <h3 className="text-[14px] font-semibold text-gray-900">{editingWorkflow ? 'Edit Workflow' : 'New Workflow'}</h3>
        </div>

        <div className="flex flex-col gap-3 mb-5">
          <div>
            <label className="text-[11px] font-medium text-gray-500 block mb-1">Workflow name *</label>
            <input
              value={bName}
              onChange={e => setBName(e.target.value)}
              placeholder="e.g. Notify team on completion"
              className="w-full text-[13px] text-gray-700 border border-black/[0.12] rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#3D16FA]/40 placeholder:text-gray-300"
            />
          </div>
          <div>
            <label className="text-[11px] font-medium text-gray-500 block mb-1">Description</label>
            <input
              value={bDescription}
              onChange={e => setBDescription(e.target.value)}
              placeholder="What does this workflow do?"
              className="w-full text-[13px] text-gray-700 border border-black/[0.12] rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#3D16FA]/40 placeholder:text-gray-300"
            />
          </div>
        </div>

        {/* Builder chain */}
        <div className="flex items-start gap-2 mb-5 overflow-x-auto pb-2">
          {/* Trigger */}
          <BuilderCard title="Trigger" icon={Zap} color="bg-amber-50 text-amber-600">
            <SelectField
              label="When this happens…"
              value={bTrigger}
              onChange={setBTrigger}
              options={TRIGGERS.map(t => ({ value: t.id, label: t.label }))}
            />
          </BuilderCard>

          <div className="flex items-center pt-10 shrink-0">
            <ChevronRight className="w-4 h-4 text-gray-300" />
          </div>

          {/* Condition (optional) */}
          {bCondition ? (
            <>
              <BuilderCard
                title="Condition"
                icon={Filter}
                color="bg-blue-50 text-blue-600"
                onRemove={() => setBCondition(null)}
              >
                <SelectField
                  label="Only if…"
                  value={bCondition.type}
                  onChange={v => setBCondition({ ...bCondition, type: v, value: '' })}
                  options={CONDITION_TYPES.map(c => ({ value: c.id, label: c.label }))}
                />
                {bCondition.type && (
                  <SelectField
                    label="Value"
                    value={bCondition.value}
                    onChange={v => setBCondition({ ...bCondition, value: v })}
                    options={CONDITION_TYPES.find(c => c.id === bCondition.type)?.options || []}
                  />
                )}
              </BuilderCard>
              <div className="flex items-center pt-10 shrink-0">
                <ChevronRight className="w-4 h-4 text-gray-300" />
              </div>
            </>
          ) : (
            <>
              <button
                onClick={() => setBCondition({ type: '', value: '' })}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-dashed border-black/[0.12] text-[12px] text-gray-400 hover:border-[#3D16FA]/40 hover:text-[#3D16FA] cursor-pointer transition-colors mt-8 h-fit"
              >
                <Plus className="w-3 h-3" />
                Add condition
              </button>
              <div className="flex items-center pt-10 shrink-0">
                <ChevronRight className="w-4 h-4 text-gray-300" />
              </div>
            </>
          )}

          {/* Actions */}
          <div className="flex items-start gap-2">
            {bActions.map((action, idx) => {
              const availableActions = connectedIds.includes(action.connectorId)
                ? (CONNECTOR_ACTIONS[action.connectorId] || [])
                : []
              const selectedAction = availableActions.find(a => a.id === action.actionId)

              return (
                <div key={idx} className="flex items-start gap-2">
                  <BuilderCard
                    title={`Action ${idx + 1}`}
                    icon={ArrowRight}
                    color="bg-straker-50 text-straker-600"
                    onRemove={bActions.length > 1 ? () => setBActions(prev => prev.filter((_, i) => i !== idx)) : undefined}
                  >
                    <SelectField
                      label="Tool"
                      value={action.connectorId}
                      onChange={v => updateAction(idx, 'connectorId', v)}
                      options={connectedIntegrations.map(c => ({ value: c.id, label: c.name }))}
                    />
                    {action.connectorId && (
                      <SelectField
                        label="Action"
                        value={action.actionId}
                        onChange={v => updateAction(idx, 'actionId', v)}
                        options={availableActions.map(a => ({ value: a.id, label: a.label }))}
                      />
                    )}
                    {selectedAction?.fields.map(field => (
                      <TextField
                        key={field}
                        label={field.charAt(0).toUpperCase() + field.slice(1)}
                        value={action.config[field] || ''}
                        onChange={v => updateAction(idx, field, v)}
                        placeholder={`{{${field}}}`}
                      />
                    ))}
                  </BuilderCard>
                  {idx < bActions.length - 1 && (
                    <div className="flex items-center pt-10 shrink-0">
                      <ChevronRight className="w-4 h-4 text-gray-300" />
                    </div>
                  )}
                </div>
              )
            })}
            <button
              onClick={() => setBActions(prev => [...prev, { connectorId: '', actionId: '', config: {} }])}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-dashed border-black/[0.12] text-[12px] text-gray-400 hover:border-[#3D16FA]/40 hover:text-[#3D16FA] cursor-pointer transition-colors mt-8 h-fit"
            >
              <Plus className="w-3 h-3" />
              Add action
            </button>
          </div>
        </div>

        {/* Variable reference */}
        <div className="mb-5 p-3 rounded-lg bg-gray-50 border border-black/[0.06]">
          <p className="text-[11px] font-medium text-gray-400 mb-1.5">Available variables</p>
          <div className="flex flex-wrap gap-1.5">
            {['{{document.name}}', '{{document.link}}', '{{project.client}}', '{{quality.score}}', '{{compliance.status}}', '{{agent.name}}', '{{project.locale}}'].map(v => (
              <span key={v} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white border border-black/[0.08] text-gray-500">{v}</span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={cancelBuild} className="px-3 py-1.5 rounded-lg text-[12px] text-gray-600 hover:bg-black/[0.04] cursor-pointer">Cancel</button>
          <button
            onClick={() => setShowTest(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] text-gray-600 border border-black/[0.08] hover:bg-black/[0.04] cursor-pointer"
          >
            <Play className="w-3 h-3" />
            Test Workflow
          </button>
          <button
            onClick={saveWorkflow}
            disabled={!canSave}
            className={`px-4 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${
              canSave ? 'bg-[#3D16FA] text-white hover:bg-[#0089bf] cursor-pointer' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            Save workflow
          </button>
        </div>

        {/* Test modal */}
        <AnimatePresence>
          {showTest && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm" onClick={() => setShowTest(false)}>
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={SPRING}
                className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[14px] font-semibold text-gray-900">Workflow Test — Dry Run</h3>
                  <button onClick={() => setShowTest(false)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-2">
                  {[
                    { label: 'Trigger received', detail: TRIGGERS.find(t => t.id === bTrigger)?.label || '—', ok: !!bTrigger },
                    { label: 'Condition evaluated', detail: bCondition?.type ? 'Passed' : 'No condition — skipped', ok: true },
                    ...bActions.filter(a => a.connectorId).map(a => ({
                      label: `Action: ${CONNECTOR_ACTIONS[a.connectorId]?.find(x => x.id === a.actionId)?.label || a.connectorId}`,
                      detail: 'Simulated — no real request sent',
                      ok: true,
                    })),
                  ].map((step, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-black/[0.06]">
                      {step.ok ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                      )}
                      <div>
                        <p className="text-[12px] font-medium text-gray-700">{step.label}</p>
                        <p className="text-[11px] text-gray-400">{step.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-gray-400 mt-3">This is a simulation — no real actions were performed.</p>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-[14px] font-semibold text-gray-900">Workflows</h3>
          <p className="text-[12px] text-gray-400 mt-0.5">Automate actions triggered by pipeline events.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTemplates(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] text-gray-600 border border-black/[0.08] hover:bg-black/[0.04] cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Templates
          </button>
          <button
            onClick={startNew}
            disabled={connectedIntegrations.length === 0}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${
              connectedIntegrations.length > 0
                ? 'bg-[#3D16FA] text-white hover:bg-[#0089bf] cursor-pointer'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            New workflow
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-5 border-b border-black/[0.06]">
        {[['workflows', 'Workflows'], ['log', 'Execution Log']].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-3 py-2 text-[13px] font-medium transition-colors cursor-pointer -mb-px border-b-2 ${
              tab === id ? 'border-[#3D16FA] text-[#3D16FA]' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'workflows' && (
        <>
          {connectedIntegrations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 gap-3 border border-dashed border-black/[0.10] rounded-xl">
              <Zap className="w-8 h-8 text-gray-200" />
              <p className="text-[13px] text-gray-500 font-medium">Connect your first tool to start building workflows</p>
              <p className="text-[12px] text-gray-400">Head to the All tab to connect Slack, Jira, Google Drive, and more.</p>
            </div>
          ) : workflows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 gap-3 border border-dashed border-black/[0.10] rounded-xl">
              <Zap className="w-8 h-8 text-gray-200" />
              <p className="text-[13px] text-gray-500 font-medium">No workflows yet</p>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowTemplates(true)} className="text-[12px] text-[#3D16FA] hover:underline cursor-pointer">Browse templates</button>
                <span className="text-gray-300">or</span>
                <button onClick={startNew} className="text-[12px] text-[#3D16FA] hover:underline cursor-pointer">create one from scratch</button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {workflows.map(wf => (
                <WorkflowCard
                  key={wf.id}
                  workflow={wf}
                  onEdit={startEdit}
                  onDelete={deleteWorkflow}
                  onToggle={toggleWorkflow}
                />
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'log' && (
        <div className="border border-black/[0.08] rounded-xl overflow-hidden bg-white">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-black/[0.06] bg-gray-50/60">
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Timestamp</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Workflow</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Trigger</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Status</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.04]">
              {MOCK_LOG.map(row => (
                <tr key={row.id} className="hover:bg-black/[0.01]">
                  <td className="px-4 py-3 text-gray-400 font-mono whitespace-nowrap">{row.ts}</td>
                  <td className="px-4 py-3 text-gray-700 font-medium">{row.workflow}</td>
                  <td className="px-4 py-3 text-gray-500">{row.trigger}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                      row.status === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'
                    }`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 font-mono">{row.duration}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Templates modal */}
      <AnimatePresence>
        {showTemplates && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm" onClick={() => setShowTemplates(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={SPRING}
              className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6 max-h-[80vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-[14px] font-semibold text-gray-900">Workflow Templates</h3>
                  <p className="text-[12px] text-gray-400 mt-0.5">Clone a template to get started quickly.</p>
                </div>
                <button onClick={() => setShowTemplates(false)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex flex-col gap-3">
                {WORKFLOW_TEMPLATES.map(template => {
                  const trigger = TRIGGERS.find(t => t.id === template.trigger)
                  const hasConnectors = template.actions.some(a => connectedIds.includes(a.connectorId))
                  return (
                    <div key={template.id} className="border border-black/[0.08] rounded-xl p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <p className="text-[13px] font-semibold text-gray-900 mb-0.5">{template.name}</p>
                          <p className="text-[12px] text-gray-400 mb-2">{template.description}</p>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[11px] text-gray-500 bg-gray-50 border border-black/[0.06] px-2 py-0.5 rounded-full">{trigger?.label}</span>
                            <ChevronRight className="w-3 h-3 text-gray-300" />
                            <div className="flex items-center gap-1">
                              {template.actions.map((a, i) => (
                                <ConnectorIcon key={i} connectorId={a.connectorId} />
                              ))}
                            </div>
                          </div>
                          {!hasConnectors && (
                            <p className="text-[11px] text-amber-500 mt-2">Connect required tools to use this template.</p>
                          )}
                        </div>
                        <button
                          onClick={() => cloneTemplate(template)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium bg-[#3D16FA] text-white hover:bg-[#0089bf] cursor-pointer shrink-0"
                        >
                          <Copy className="w-3 h-3" />
                          Use
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default WorkflowBuilder
