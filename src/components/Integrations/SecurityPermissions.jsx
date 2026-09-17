/**
 * Agent access — rule 5 of the RBAC alignment.
 *
 * An agent's reach is a GRANT like anyone else's: same table, same
 * engine, same audit log. The old surface here (a connector toggle
 * matrix, an approval switch, and scoping fields wired to nothing) is
 * gone — every control below reads and writes the real grant table,
 * and the log is the single unified audit log.
 */

import { useMemo, useState } from 'react'
import { Shield, Lock, Download, Trash2, Plus } from 'lucide-react'
import { downloadCsv } from '../../utils/demoFiles'
import { PRINCIPAL_DIRECTORY, ROLES, ORG_NODES, AUDIT_LOG, getNodePath } from '../../data/rbacModel'
import { useRbacStore, grantsForPrincipal, can, tenantPlan } from '../../services/rbac/engine'
import { addGrant, removeGrant } from '../../services/rbac/grants'

const TENANT = 'meridian'
const CURRENT_ADMIN = 'alex' // replaced by View-as once the switcher lands

export default function SecurityPermissions() {
  useRbacStore()
  const [adding, setAdding] = useState(null) // agent id with open add-form
  const [roleId, setRoleId] = useState('viewer')
  const [scopeId, setScopeId] = useState('')
  const [refusal, setRefusal] = useState(null)

  const agents = PRINCIPAL_DIRECTORY.filter(p => p.type === 'agent')
  const planOk = tenantPlan(TENANT) === 'enterprise'
  const meridianNodes = ORG_NODES.filter(n => n.tenantId === TENANT && n.type !== 'vendor-org')
  const grantableRoles = ROLES.filter(r => !r.internal && r.level !== 'tenant')

  const agentAudit = useMemo(() =>
    AUDIT_LOG.filter(e => e.actorType === 'agent'
      || (e.targetUser === null && agents.some(a => (e.details || '').includes(a.id)))
      || agents.some(a => e.actor === a.id))
      .slice(0, 20),
  [agents, AUDIT_LOG.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const submitGrant = (agent) => {
    const res = addGrant({
      principal: { type: 'agent', id: agent.id }, roleId, nodeId: scopeId,
      tenantId: TENANT, actorId: CURRENT_ADMIN,
    })
    if (res.error) { setRefusal(res.error); return }
    setRefusal(null); setAdding(null); setScopeId('')
  }

  return (
    <div className="flex flex-col gap-6">
      {!planOk && (
        <div className="px-4 py-3 rounded-xl bg-gray-50 border border-black/[0.08] text-[12px] text-gray-600 flex items-center gap-2">
          <Lock className="w-3.5 h-3.5 text-[#3D16FA] shrink-0" />
          Agent principals are an Enterprise capability — on this plan the engine denies every agent decision with reason <span className="font-mono">plan</span>. Grants below stay visible but inert.
        </div>
      )}

      {/* ── Agent principals & their grants ── */}
      <section className="border border-black/[0.08] rounded-xl overflow-hidden bg-white">
        <div className="px-5 py-4 border-b border-black/[0.06] flex items-center gap-2">
          <Lock className="w-4 h-4 text-gray-400" />
          <h3 className="text-[13px] font-semibold text-gray-900">Agent access</h3>
          <p className="text-[12px] text-gray-400 ml-1">— an agent's reach is a grant, evaluated by the same engine as a person's</p>
        </div>
        <div className="divide-y divide-black/[0.06]">
          {agents.map(agent => {
            const grants = grantsForPrincipal({ type: 'agent', id: agent.id }, TENANT)
            return (
              <div key={agent.id} className="px-5 py-4">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div>
                    <p className="text-[13px] font-medium text-gray-800">{agent.name}</p>
                    <p className="text-[10px] text-gray-400 font-mono">{agent.id} · {agent.description}</p>
                  </div>
                  {!adding && (
                    <button onClick={() => { setAdding(agent.id); setRefusal(null) }}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] text-[#3D16FA] hover:bg-[#3D16FA]/10 border border-[#3D16FA]/20 cursor-pointer">
                      <Plus className="w-3 h-3" /> Grant access
                    </button>
                  )}
                </div>

                {grants.length === 0 && (
                  <p className="text-[12px] text-gray-400">No grants — the engine denies every request from this agent, and each denial is logged.</p>
                )}
                {grants.map(g => {
                  const role = ROLES.find(r => r.id === g.roleId)
                  const scope = ORG_NODES.find(n => n.id === g.scope.nodeId)
                  const probe = can({ principal: { type: 'agent', id: agent.id }, permission: role?.permissions[0] || 'view_resource', nodeId: g.scope.nodeId })
                  return (
                    <div key={g.id} className="flex items-center gap-3 py-2 group">
                      <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium border bg-[#3D16FA]/10 text-[#3D16FA] border-[#3D16FA]/20">
                        {role?.name} @ {scope?.name}
                      </span>
                      <span className="text-[10px] text-gray-400 font-mono flex-1">
                        {getNodePath(g.scope.nodeId).map(n => n.name).join(' › ')}
                        {g.conditions?.expiresAt ? ` · expires ${g.conditions.expiresAt.slice(0, 10)}` : ''}
                        {g.lastUsedAt ? ` · last used ${new Date(g.lastUsedAt).toLocaleDateString()}` : ' · never used'}
                      </span>
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${probe.allow ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}
                        title={probe.reason}>
                        {probe.allow ? 'active' : probe.decisivePolicy}
                      </span>
                      <button onClick={() => removeGrant({ grantId: g.id, actorId: CURRENT_ADMIN })}
                        className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-red-500 cursor-pointer transition-all" aria-label={`Revoke ${role?.name} at ${scope?.name}`}>
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )
                })}

                {adding === agent.id && (
                  <div className="mt-2 rounded-lg border border-[#3D16FA]/30 bg-[#3D16FA]/[0.04] p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <select value={roleId} onChange={e => setRoleId(e.target.value)}
                        className="flex-1 rounded-lg border border-black/[0.08] bg-white px-2.5 py-1.5 text-[12px] outline-none focus:border-[#3D16FA]">
                        {grantableRoles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                      </select>
                      <select value={scopeId} onChange={e => setScopeId(e.target.value)}
                        className="flex-1 rounded-lg border border-black/[0.08] bg-white px-2.5 py-1.5 text-[12px] outline-none focus:border-[#3D16FA]">
                        <option value="">Select scope…</option>
                        {meridianNodes.map(n => <option key={n.id} value={n.id}>{'  '.repeat(getNodePath(n.id).length - 1)}{n.name}</option>)}
                      </select>
                      <button onClick={() => scopeId && submitGrant(agent)} disabled={!scopeId}
                        className="px-3 py-1.5 rounded-lg bg-[#3D16FA] text-white text-[11px] font-semibold cursor-pointer hover:bg-[#2E10C4] disabled:opacity-50 disabled:cursor-not-allowed">Grant</button>
                      <button onClick={() => { setAdding(null); setRefusal(null) }}
                        className="px-3 py-1.5 rounded-lg border border-black/[0.08] text-gray-500 text-[11px] cursor-pointer hover:bg-gray-50">Cancel</button>
                    </div>
                    {refusal && <p className="text-[11px] text-red-600">{refusal}</p>}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* ── Unified audit log — agent slice ── */}
      <section className="border border-black/[0.08] rounded-xl overflow-hidden bg-white">
        <div className="px-5 py-4 border-b border-black/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-gray-400" />
            <h3 className="text-[13px] font-semibold text-gray-900">Audit log — agent activity</h3>
            <p className="text-[12px] text-gray-400 ml-1">— the same single log everything else writes to</p>
          </div>
          <button onClick={() => downloadCsv('arbitr-agent-audit.csv', agentAudit.map(e => ({ timestamp: e.timestamp, actor: e.actor, action: e.action, scope: e.scopeId || '', details: e.details || '' })))}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] text-gray-500 hover:bg-black/[0.04] border border-black/[0.06] cursor-pointer">
            <Download className="w-3 h-3" /> Export CSV
          </button>
        </div>
        {agentAudit.length === 0 ? (
          <p className="px-5 py-6 text-[12px] text-gray-400">No agent events yet — grant an agent access, or let one act, and the decision lands here.</p>
        ) : (
          <div className="divide-y divide-black/[0.04]">
            {agentAudit.map(e => (
              <div key={e.id} className="flex items-center gap-3 px-5 py-2.5">
                <span className="text-[10px] text-gray-400 font-mono whitespace-nowrap w-36 shrink-0">{new Date(e.timestamp).toLocaleString()}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${e.action === 'access.denied' ? 'bg-red-50 text-red-500' : e.action === 'access.allowed' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>{e.action}</span>
                <span className="text-[12px] text-gray-700 shrink-0">{e.actor}</span>
                <span className="text-[11px] text-gray-400 truncate">{e.details}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
