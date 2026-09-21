/**
 * Access Explorer — demo surface 2 of the RBAC alignment.
 *
 * Forward: pick a principal and a permission, see allow/deny with the
 * decisive reason at every node in the tree. Reverse: pick a node, see
 * who and what can reach it, and why. Every cell is a live can() call —
 * this page IS the engine, drawn.
 */

import { useState } from 'react'
import { Check, X, ChevronRight, Lock } from 'lucide-react'
import {
  ORG_NODES, USERS, PRINCIPAL_DIRECTORY, NODE_TYPE_STYLES, getNodePath,
} from '../../data/rbacModel'
import { can, effectiveMembers, useRbacStore } from '../../services/rbac/engine'

const TENANT = 'meridian'

// A curated permission set that spans the catalogue's altitudes.
const EXPLORER_PERMISSIONS = [
  'view_resource', 'edit_resource', 'approve_resource', 'manage_members',
  'view_audit', 'verify_segment', 'signoff_output',
]

export default function AccessExplorer() {
  useRbacStore()
  const [mode, setMode] = useState('principal') // principal | node
  const [principalKey, setPrincipalKey] = useState('user:thomas')
  const [permission, setPermission] = useState('view_resource')
  const [nodeSel, setNodeSel] = useState('mc-japan-ma')
  const [inspecting, setInspecting] = useState(null)

  const principals = [
    ...USERS.filter(u => !u.internal).map(u => ({ key: `user:${u.id}`, label: u.name, principal: { type: 'user', id: u.id } })),
    ...USERS.filter(u => u.internal).map(u => ({ key: `user:${u.id}`, label: `${u.name} (internal)`, principal: { type: 'user', id: u.id } })),
    ...PRINCIPAL_DIRECTORY.map(p => ({ key: `${p.type}:${p.id}`, label: p.name, principal: { type: p.type, id: p.id } })),
  ]
  const active = principals.find(p => p.key === principalKey) || principals[0]
  const nodes = ORG_NODES.filter(n => n.tenantId === TENANT)

  return (
    <div>
      {/* Mode toggle */}
      <div className="flex items-center gap-1.5 mb-5">
        {[['principal', 'By principal — where can they act?'], ['node', 'By node — who can reach it?']].map(([m, label]) => (
          <button key={m} type="button" onClick={() => setMode(m)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-medium transition-colors cursor-pointer ${mode === m ? 'bg-gray-900 text-white' : 'bg-white border border-black/[0.10] text-gray-500 hover:text-gray-800'}`}>
            {label}
          </button>
        ))}
      </div>

      {mode === 'principal' && (
        <>
          <div className="flex items-center gap-2 mb-4">
            <select value={principalKey} onChange={e => setPrincipalKey(e.target.value)}
              className="rounded-lg border border-black/[0.08] bg-white px-3 py-2 text-[12.5px] outline-none focus:border-[#3D16FA]">
              {principals.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
            <select value={permission} onChange={e => setPermission(e.target.value)}
              className="rounded-lg border border-black/[0.08] bg-white px-3 py-2 text-[12.5px] font-mono outline-none focus:border-[#3D16FA]">
              {EXPLORER_PERMISSIONS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div className="rounded-xl border border-black/[0.08] bg-white divide-y divide-black/[0.04]">
            {nodes.map(n => {
              const d = can({ principal: active.principal, permission, nodeId: n.id })
              const depth = getNodePath(n.id).length - 1
              const open = inspecting === n.id
              return (
                <div key={n.id}>
                  <button type="button" onClick={() => setInspecting(open ? null : n.id)}
                    className="w-full flex items-center gap-2 px-4 py-2 text-left cursor-pointer hover:bg-black/[0.02]"
                    style={{ paddingLeft: `${depth * 20 + 16}px` }}>
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${d.allow ? 'bg-emerald-100 text-emerald-600' : 'bg-red-50 text-red-400'}`}>
                      {d.allow ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                    </span>
                    <span className="text-[12.5px] text-gray-800 truncate">{n.name}</span>
                    {n.barrier && <Lock className="w-3 h-3 text-[#996800] shrink-0" />}
                    <span className="text-[10px] text-gray-400 font-mono ml-auto shrink-0">{d.decisivePolicy}</span>
                    <ChevronRight className={`w-3 h-3 text-gray-300 shrink-0 transition-transform ${open ? 'rotate-90' : ''}`} />
                  </button>
                  {open && (
                    <p className="px-4 pb-2.5 text-[11px] text-gray-500" style={{ paddingLeft: `${depth * 20 + 44}px` }}>{d.reason}</p>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      {mode === 'node' && (
        <>
          <div className="flex items-center gap-2 mb-4">
            <select value={nodeSel} onChange={e => setNodeSel(e.target.value)}
              className="rounded-lg border border-black/[0.08] bg-white px-3 py-2 text-[12.5px] outline-none focus:border-[#3D16FA]">
              {nodes.map(n => <option key={n.id} value={n.id}>{'  '.repeat(getNodePath(n.id).length - 1)}{n.name}</option>)}
            </select>
            <NodeBadge nodeId={nodeSel} />
          </div>

          <div className="rounded-xl border border-black/[0.08] bg-white divide-y divide-black/[0.04]">
            {effectiveMembers(nodeSel).length === 0 && (
              <p className="px-4 py-6 text-[12px] text-gray-400">Nobody reaches this node — every path is blocked or expired.</p>
            )}
            {effectiveMembers(nodeSel).map(m => (
              <div key={m.user.id} className="px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-[12.5px] font-medium text-gray-800">{m.user.name}</span>
                  {m.user.principalType && <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-600 font-medium">{m.user.principalType}</span>}
                </div>
                {m.grants.map(g => (
                  <p key={g.grant.id} className="text-[11px] text-gray-500 mt-0.5 pl-1">
                    {g.isDirect ? 'Direct' : 'Inherited'}: {g.role.name} at {g.scopeNode?.name} <span className="font-mono text-gray-400">({g.grant.id}{g.grant.conditions?.expiresAt ? ` · expires ${g.grant.conditions.expiresAt.slice(0, 10)}` : ''})</span>
                  </p>
                ))}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function NodeBadge({ nodeId }) {
  const n = ORG_NODES.find(x => x.id === nodeId)
  if (!n) return null
  const s = NODE_TYPE_STYLES[n.type] || NODE_TYPE_STYLES.department
  return (
    <span className="flex items-center gap-2">
      <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium border ${s.bg} ${s.text} ${s.border}`}>{s.label}</span>
      {n.barrier && <span className="inline-flex items-center gap-1 text-[10px] text-[#996800]"><Lock className="w-2.5 h-2.5" /> {n.barrierReason}</span>}
    </span>
  )
}
