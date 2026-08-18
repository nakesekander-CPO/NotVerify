import { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronRight, Shield, Users, Search, Clock, X, UserPlus,
  UserMinus, KeyRound, AlertCircle, Plus, Trash2, CheckCircle2,
} from 'lucide-react'
import {
  TENANTS, ORG_NODES, ROLES,
  USERS as INITIAL_USERS,
  ROLE_ASSIGNMENTS as INITIAL_ASSIGNMENTS,
  AUDIT_LOG as INITIAL_AUDIT,
  NODE_TYPE_STYLES, ACTION_STYLES,
  getNodePath, getNodeChildren, getNodeDescendants,
} from '../../data/rbacModel'

/* ─── Shared sub-components ──────────────────────────────────── */

function Avatar({ initials, size = 28, internal }) {
  return (
    <div className={`shrink-0 rounded-full flex items-center justify-center font-semibold text-[10px] ${internal ? 'bg-purple-100 text-purple-700' : 'bg-gray-200 text-gray-600'}`}
      style={{ width: size, height: size }}>{initials}</div>
  )
}

function NodeTypeBadge({ type }) {
  const s = NODE_TYPE_STYLES[type] || NODE_TYPE_STYLES.department
  return <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium border ${s.bg} ${s.text} ${s.border}`}>{s.label}</span>
}

function RoleBadge({ role, scopeNode, compact }) {
  const isInt = role?.internal
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium border ${isInt ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-[#3D16FA]/10 text-[#3D16FA] border-[#3D16FA]/20'}`}>
      {isInt && <AlertCircle className="w-2.5 h-2.5" />}
      {role?.name}{!compact && scopeNode ? ` @ ${scopeNode.name}` : ''}
    </span>
  )
}

function StatusDot({ status }) {
  const c = status === 'online' ? 'bg-emerald-400' : status === 'away' ? 'bg-amber-400' : 'bg-gray-300'
  return <span className={`w-2 h-2 rounded-full ${c} shrink-0`} />
}

function timeAgo(ts) {
  const d = Date.now() - new Date(ts).getTime()
  const m = Math.floor(d / 60000)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function ScopeBreadcrumb({ nodeId }) {
  const path = getNodePath(nodeId)
  return (
    <span className="flex items-center gap-0.5 flex-wrap">
      {path.map((n, i) => (
        <span key={n.id} className="flex items-center gap-0.5 text-[10px] text-gray-400">
          {i > 0 && <ChevronRight className="w-2 h-2 text-gray-300" />}
          <span className={i === path.length - 1 ? 'text-gray-600 font-medium' : ''}>{n.name}</span>
        </span>
      ))}
    </span>
  )
}

/* ─── Local data helpers (operate on passed-in arrays) ───────── */

function getEffectiveRoles(userId, tenantId, assignments) {
  return assignments.filter(a => a.userId === userId && a.tenantId === tenantId).map(a => {
    const role = ROLES.find(r => r.id === a.roleId)
    const scopeNode = ORG_NODES.find(n => n.id === a.scopeId)
    const descendants = getNodeDescendants(a.scopeId)
    return { ...a, role, scopeNode, coveredNodes: scopeNode ? [scopeNode, ...descendants] : descendants, path: getNodePath(a.scopeId) }
  })
}

function getEffectiveMembers(nodeId, assignments, users) {
  const node = ORG_NODES.find(n => n.id === nodeId)
  if (!node) return []
  const ta = assignments.filter(a => a.tenantId === node.tenantId)
  const members = []
  for (const a of ta) {
    const covers = a.scopeId === nodeId || (() => { let cur = ORG_NODES.find(n => n.id === nodeId); while (cur) { if (cur.id === a.scopeId) return true; cur = cur.parentId ? ORG_NODES.find(n => n.id === cur.parentId) : null } return false })()
    if (covers) {
      const user = users.find(u => u.id === a.userId)
      const role = ROLES.find(r => r.id === a.roleId)
      const scopeNode = ORG_NODES.find(n => n.id === a.scopeId)
      if (user && role) members.push({ user, role, assignment: a, scopeNode, isDirect: a.scopeId === nodeId, inheritancePath: a.scopeId !== nodeId ? getNodePath(a.scopeId).map(n => n.name).join(' > ') : null })
    }
  }
  return members
}

/* ═══════════════════════════════════════════════════════════════
   STRUCTURE TAB
   ═══════════════════════════════════════════════════════════════ */

function TreeNode({ nodeId, depth, expanded, onToggle, selected, onSelect, assignments, users }) {
  const node = ORG_NODES.find(n => n.id === nodeId)
  if (!node) return null
  const children = getNodeChildren(nodeId)
  const hasChildren = children.length > 0
  const isExp = expanded.has(nodeId)
  const isSel = selected === nodeId
  const ac = assignments.filter(a => a.scopeId === nodeId).length
  const mc = getEffectiveMembers(nodeId, assignments, users).length

  return (
    <>
      <button type="button" onClick={() => onSelect(nodeId)}
        className={`w-full flex items-center gap-2 py-2 pr-3 text-left transition-colors cursor-pointer rounded-md ${isSel ? 'bg-[#3D16FA]/[0.08] border-l-2 border-[#3D16FA] pl-[calc(var(--indent)-2px)]' : 'hover:bg-black/[0.03] pl-[var(--indent)]'}`}
        style={{ '--indent': `${depth * 24 + 8}px` }}>
        {hasChildren ? (
          <span onClick={e => { e.stopPropagation(); onToggle(nodeId) }} className="p-0.5 rounded hover:bg-black/[0.06] transition-colors">
            <ChevronRight className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isExp ? 'rotate-90' : ''}`} />
          </span>
        ) : <span className="w-4.5" />}
        <NodeTypeBadge type={node.type} />
        <span className="text-[13px] font-medium text-gray-800 truncate flex-1">{node.name}</span>
        <span className="text-[10px] text-gray-400 shrink-0 tabular-nums">
          {mc > 0 && <span className="mr-2">{mc} <Users className="w-2.5 h-2.5 inline -mt-0.5" /></span>}
          {ac > 0 && <span>{ac} <KeyRound className="w-2.5 h-2.5 inline -mt-0.5" /></span>}
        </span>
      </button>
      {hasChildren && isExp && children.map(c => <TreeNode key={c.id} nodeId={c.id} depth={depth + 1} expanded={expanded} onToggle={onToggle} selected={selected} onSelect={onSelect} assignments={assignments} users={users} />)}
    </>
  )
}

function StructureTab({ tenantId, assignments, users }) {
  const rootNodes = ORG_NODES.filter(n => n.tenantId === tenantId && !n.parentId)
  const regionIds = rootNodes.flatMap(r => getNodeChildren(r.id).map(c => c.id))
  const [expanded, setExpanded] = useState(() => new Set([...rootNodes.map(r => r.id), ...regionIds]))
  const [sel, setSel] = useState(null)
  const toggle = id => setExpanded(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })

  const selNode = sel ? ORG_NODES.find(n => n.id === sel) : null
  const selMembers = sel ? getEffectiveMembers(sel, assignments, users) : []

  return (
    <div className="flex gap-0 min-h-[400px]">
      <div className="flex-1 min-w-0">
        {rootNodes.map(r => <TreeNode key={r.id} nodeId={r.id} depth={0} expanded={expanded} onToggle={toggle} selected={sel} onSelect={setSel} assignments={assignments} users={users} />)}
      </div>
      <AnimatePresence>
        {selNode && (
          <motion.div key={sel} initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 320 }} exit={{ opacity: 0, width: 0 }} transition={{ duration: 0.2 }}
            className="shrink-0 border-l border-black/[0.08] overflow-y-auto">
            <div className="p-4 border-b border-black/[0.06]">
              <ScopeBreadcrumb nodeId={sel} />
              <div className="flex items-center gap-2 mt-2"><NodeTypeBadge type={selNode.type} /><h3 className="text-[15px] font-semibold text-gray-900">{selNode.name}</h3></div>
            </div>
            <div className="p-4 border-b border-black/[0.06]">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-3">Direct ({selMembers.filter(m => m.isDirect).length})</p>
              {selMembers.filter(m => m.isDirect).length > 0 ? selMembers.filter(m => m.isDirect).map((m, i) => (
                <div key={`${m.user.id}-${i}`} className="flex items-center gap-2.5 mb-2">
                  <Avatar initials={m.user.initials} internal={m.user.internal} />
                  <div className="flex-1 min-w-0"><p className="text-[12px] font-medium text-gray-800 truncate">{m.user.name}</p><RoleBadge role={m.role} compact /></div>
                </div>
              )) : <p className="text-[11px] text-gray-400">None at this scope.</p>}
            </div>
            <div className="p-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-3">Inherited ({selMembers.filter(m => !m.isDirect).length})</p>
              {selMembers.filter(m => !m.isDirect).map((m, i) => (
                <div key={`${m.user.id}-${i}`} className="mb-2.5">
                  <div className="flex items-center gap-2.5">
                    <Avatar initials={m.user.initials} internal={m.user.internal} />
                    <div className="flex-1 min-w-0"><p className="text-[12px] font-medium text-gray-800 truncate">{m.user.name}</p><RoleBadge role={m.role} compact /></div>
                  </div>
                  <p className="text-[10px] text-gray-400 italic ml-[38px] mt-0.5">via {m.role.name} at {m.scopeNode?.name}</p>
                </div>
              ))}
              {selMembers.filter(m => !m.isDirect).length === 0 && <p className="text-[11px] text-gray-400">No inherited access.</p>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   INVITE MODAL
   ═══════════════════════════════════════════════════════════════ */

function InviteModal({ tenantId, onInvite, onClose }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [roleId, setRoleId] = useState('contributor')
  const [scopeId, setScopeId] = useState('')
  const tenantNodes = ORG_NODES.filter(n => n.tenantId === tenantId)
  const customerRoles = ROLES.filter(r => !r.internal)

  const canSubmit = name.trim() && email.trim() && roleId && scopeId

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }}
        className="bg-white rounded-xl border border-black/[0.12] shadow-2xl w-full max-w-[480px] overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/[0.06]">
          <h2 className="text-[15px] font-semibold text-gray-900">Invite member</h2>
          <button type="button" onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 cursor-pointer transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-5 py-4 space-y-3.5">
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">Full name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Jane Doe"
              className="w-full rounded-lg border border-black/[0.08] bg-gray-50 px-3 py-2 text-[13px] placeholder:text-gray-400 outline-none focus:border-[#3D16FA] transition" />
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="jane.doe@ibm.com"
              className="w-full rounded-lg border border-black/[0.08] bg-gray-50 px-3 py-2 text-[13px] placeholder:text-gray-400 outline-none focus:border-[#3D16FA] transition" />
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">Role</label>
            <select value={roleId} onChange={e => setRoleId(e.target.value)}
              className="w-full rounded-lg border border-black/[0.08] bg-gray-50 px-3 py-2 text-[13px] outline-none focus:border-[#3D16FA] transition">
              {customerRoles.map(r => <option key={r.id} value={r.id}>{r.name} — {r.description.slice(0, 60)}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">Scope</label>
            <select value={scopeId} onChange={e => setScopeId(e.target.value)}
              className="w-full rounded-lg border border-black/[0.08] bg-gray-50 px-3 py-2 text-[13px] outline-none focus:border-[#3D16FA] transition">
              <option value="">Select scope...</option>
              {tenantNodes.map(n => {
                const depth = getNodePath(n.id).length - 1
                return <option key={n.id} value={n.id}>{'\u00A0\u00A0'.repeat(depth)}{n.name} ({NODE_TYPE_STYLES[n.type]?.label || n.type})</option>
              })}
            </select>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-black/[0.06] bg-gray-50">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-black/[0.10] text-gray-600 text-[13px] font-medium hover:bg-white cursor-pointer transition-colors">Cancel</button>
          <button type="button" onClick={() => { if (canSubmit) onInvite({ name: name.trim(), email: email.trim(), roleId, scopeId }) }} disabled={!canSubmit}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#3D16FA] text-white text-[13px] font-semibold hover:bg-[#007bb5] cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            <UserPlus className="w-3.5 h-3.5" /> Invite
          </button>
        </div>
      </motion.div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   ADD ROLE INLINE FORM
   ═══════════════════════════════════════════════════════════════ */

function AddRoleForm({ tenantId, onAdd, onCancel }) {
  const [roleId, setRoleId] = useState('contributor')
  const [scopeId, setScopeId] = useState('')
  const tenantNodes = ORG_NODES.filter(n => n.tenantId === tenantId)
  const customerRoles = ROLES.filter(r => !r.internal)

  return (
    <div className="rounded-lg border border-[#3D16FA]/30 bg-[#3D16FA]/[0.04] p-3 space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-[#3D16FA]">Add role assignment</p>
      <select value={roleId} onChange={e => setRoleId(e.target.value)}
        className="w-full rounded-lg border border-black/[0.08] bg-white px-2.5 py-1.5 text-[12px] outline-none focus:border-[#3D16FA] transition">
        {customerRoles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
      </select>
      <select value={scopeId} onChange={e => setScopeId(e.target.value)}
        className="w-full rounded-lg border border-black/[0.08] bg-white px-2.5 py-1.5 text-[12px] outline-none focus:border-[#3D16FA] transition">
        <option value="">Select scope...</option>
        {tenantNodes.map(n => {
          const depth = getNodePath(n.id).length - 1
          return <option key={n.id} value={n.id}>{'\u00A0\u00A0'.repeat(depth)}{n.name}</option>
        })}
      </select>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => { if (scopeId) onAdd({ roleId, scopeId }) }}
          disabled={!scopeId} className="px-3 py-1.5 rounded-lg bg-[#3D16FA] text-white text-[11px] font-semibold cursor-pointer hover:bg-[#007bb5] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
          Assign
        </button>
        <button type="button" onClick={onCancel} className="px-3 py-1.5 rounded-lg border border-black/[0.08] text-gray-500 text-[11px] font-medium cursor-pointer hover:bg-gray-50 transition-colors">Cancel</button>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   MEMBERS TAB
   ═══════════════════════════════════════════════════════════════ */

function MembersTab({ tenantId, users, assignments, onInvite, onAddRole, onRemoveRole, onRemoveMember }) {
  const [sel, setSel] = useState(null)
  const [search, setSearch] = useState('')
  const [showInvite, setShowInvite] = useState(false)
  const [showAddRole, setShowAddRole] = useState(false)

  const tenantUsers = useMemo(() => {
    const ids = new Set(assignments.filter(a => a.tenantId === tenantId).map(a => a.userId))
    return users.filter(u => ids.has(u.id))
  }, [tenantId, assignments, users])

  const filtered = search ? tenantUsers.filter(u => u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())) : tenantUsers
  const selUser = sel ? users.find(u => u.id === sel) : null
  const selRoles = sel ? getEffectiveRoles(sel, tenantId, assignments) : []

  return (
    <>
      <div className="flex gap-0 min-h-[400px]">
        <div className="flex-1 min-w-0">
          {/* Header row */}
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input type="text" placeholder="Search members..." value={search} onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-black/[0.08] bg-gray-50 text-[12px] placeholder:text-gray-400 outline-none focus:border-[#3D16FA] transition" />
            </div>
            <button type="button" onClick={() => setShowInvite(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#3D16FA] text-white text-[12px] font-semibold hover:bg-[#007bb5] cursor-pointer transition-colors shrink-0">
              <UserPlus className="w-3.5 h-3.5" /> Invite member
            </button>
          </div>

          {/* Table */}
          <table className="w-full">
            <thead>
              <tr className="border-b border-black/[0.08]">
                <th className="pb-2 text-left text-[10px] font-semibold uppercase tracking-widest text-gray-400">Member</th>
                <th className="pb-2 text-left text-[10px] font-semibold uppercase tracking-widest text-gray-400">Roles</th>
                <th className="pb-2 text-left text-[10px] font-semibold uppercase tracking-widest text-gray-400">Status</th>
                <th className="pb-2 text-right text-[10px] font-semibold uppercase tracking-widest text-gray-400">Last Active</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(user => {
                const roles = getEffectiveRoles(user.id, tenantId, assignments)
                return (
                  <tr key={user.id} onClick={() => { setSel(user.id); setShowAddRole(false) }}
                    className={`border-b border-black/[0.04] cursor-pointer transition-colors ${sel === user.id ? 'bg-[#3D16FA]/[0.06]' : 'hover:bg-gray-50'}`}>
                    <td className="py-2.5 pr-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar initials={user.initials} internal={user.internal} />
                        <div><p className="text-[12px] font-medium text-gray-800">{user.name}</p><p className="text-[10px] text-gray-400">{user.email}</p></div>
                      </div>
                    </td>
                    <td className="py-2.5 pr-3"><div className="flex flex-wrap gap-1">{roles.map(r => <RoleBadge key={r.id} role={r.role} scopeNode={r.scopeNode} />)}</div></td>
                    <td className="py-2.5 pr-3"><div className="flex items-center gap-1.5"><StatusDot status={user.status} /><span className="text-[11px] text-gray-500 capitalize">{user.status}</span></div></td>
                    <td className="py-2.5 text-right text-[11px] text-gray-400">{timeAgo(user.lastActive)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filtered.length === 0 && <p className="text-center text-[12px] text-gray-400 py-8">No members found.</p>}
        </div>

        {/* Detail panel */}
        <AnimatePresence>
          {selUser && (
            <motion.div key={sel} initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 320 }} exit={{ opacity: 0, width: 0 }} transition={{ duration: 0.2 }}
              className="shrink-0 border-l border-black/[0.08] overflow-y-auto">
              <div className="p-4 border-b border-black/[0.06]">
                <div className="flex items-center gap-3 mb-2">
                  <Avatar initials={selUser.initials} size={36} internal={selUser.internal} />
                  <div><p className="text-[14px] font-semibold text-gray-900">{selUser.name}</p><p className="text-[11px] text-gray-500">{selUser.email}</p></div>
                </div>
                <div className="flex items-center gap-1.5">
                  <StatusDot status={selUser.status} />
                  <span className="text-[11px] text-gray-500 capitalize">{selUser.status}</span>
                  {selUser.internal && <span className="ml-1 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-200"><AlertCircle className="w-2.5 h-2.5" /> Internal</span>}
                </div>
              </div>

              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Role Assignments ({selRoles.length})</p>
                  {!showAddRole && (
                    <button type="button" onClick={() => setShowAddRole(true)} className="flex items-center gap-1 text-[11px] text-[#3D16FA] hover:text-[#007bb5] font-medium cursor-pointer transition-colors">
                      <Plus className="w-3 h-3" /> Add role
                    </button>
                  )}
                </div>

                {/* Add role form */}
                {showAddRole && (
                  <div className="mb-3">
                    <AddRoleForm tenantId={tenantId} onCancel={() => setShowAddRole(false)}
                      onAdd={({ roleId, scopeId }) => { onAddRole(sel, roleId, scopeId); setShowAddRole(false) }} />
                  </div>
                )}

                {/* Existing assignments */}
                <div className="space-y-3">
                  {selRoles.map(a => (
                    <div key={a.id} className={`rounded-lg border p-3 group ${a.internal ? 'border-purple-200 bg-purple-50/30 border-l-4 border-l-purple-400' : 'border-black/[0.08]'}`}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <Shield className={`w-3.5 h-3.5 ${a.internal ? 'text-purple-600' : 'text-[#3D16FA]'}`} />
                          <span className="text-[13px] font-semibold text-gray-900">{a.role?.name}</span>
                        </div>
                        {!a.internal && (
                          <button type="button" onClick={() => onRemoveRole(a.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-red-500 cursor-pointer transition-all" title="Remove role">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      <ScopeBreadcrumb nodeId={a.scopeId} />
                      {a.coveredNodes.length > 1 && <p className="text-[10px] text-gray-400 mt-1">Inherits to: {a.coveredNodes.slice(1, 5).map(n => n.name).join(', ')}{a.coveredNodes.length > 5 ? ` +${a.coveredNodes.length - 5} more` : ''}</p>}
                      {a.expiresAt && <p className="text-[10px] text-amber-600 mt-1 flex items-center gap-1"><Clock className="w-2.5 h-2.5" /> Expires {new Date(a.expiresAt).toLocaleDateString()}</p>}
                    </div>
                  ))}
                </div>

                {/* Remove member */}
                {!selUser.internal && (
                  <button type="button" onClick={() => { onRemoveMember(sel); setSel(null) }}
                    className="mt-4 flex items-center gap-1.5 text-[11px] text-red-500 hover:text-red-700 font-medium cursor-pointer transition-colors">
                    <UserMinus className="w-3 h-3" /> Remove from tenant
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Invite modal */}
      <AnimatePresence>
        {showInvite && (
          <InviteModal tenantId={tenantId} onClose={() => setShowInvite(false)}
            onInvite={(data) => { onInvite(data); setShowInvite(false) }} />
        )}
      </AnimatePresence>
    </>
  )
}

/* ═══════════════════════════════════════════════════════════════
   ROLES TAB
   ═══════════════════════════════════════════════════════════════ */

function RolesTab({ assignments }) {
  const counts = useMemo(() => { const c = {}; assignments.forEach(a => { c[a.roleId] = (c[a.roleId] || 0) + 1 }); return c }, [assignments])
  return (
    <div className="space-y-3">
      {ROLES.map(role => (
        <div key={role.id} className={`rounded-xl border p-4 ${role.internal ? 'border-purple-200 bg-purple-50/20' : 'border-black/[0.08] bg-white'}`}>
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${role.internal ? 'bg-purple-100' : 'bg-[#3D16FA]/10'}`}>
                <Shield className={`w-4 h-4 ${role.internal ? 'text-purple-600' : 'text-[#3D16FA]'}`} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-[14px] font-semibold text-gray-900">{role.name}</h3>
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md ${role.level === 'tenant' ? 'bg-gray-100 text-gray-600' : role.level === 'platform' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'}`}>{role.level}</span>
                  {role.internal && <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-red-50 text-red-600 border border-red-200">Internal Only</span>}
                </div>
                <p className="text-[12px] text-gray-500 mt-0.5">{role.description}</p>
              </div>
            </div>
            <span className="text-[11px] text-gray-400 shrink-0 tabular-nums">{counts[role.id] || 0} assigned</span>
          </div>
          <div className="flex flex-wrap gap-1 mt-3 ml-[42px]">
            {role.permissions.map(p => <span key={p} className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-600 border border-gray-200">{p === '*' ? 'Full Access' : p.replace(/_/g, ' ')}</span>)}
          </div>
        </div>
      ))}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   AUDIT TAB
   ═══════════════════════════════════════════════════════════════ */

function AuditTab({ tenantId, auditLog, users }) {
  const [filter, setFilter] = useState('all')
  const logs = useMemo(() => auditLog.filter(l => l.tenantId === tenantId).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)), [tenantId, auditLog])
  const filtered = filter === 'all' ? logs : logs.filter(l => l.action === filter)
  const types = [...new Set(logs.map(l => l.action))]

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-4 flex-wrap">
        <button type="button" onClick={() => setFilter('all')} className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors cursor-pointer ${filter === 'all' ? 'bg-gray-900 text-white' : 'bg-white border border-black/[0.10] text-gray-500 hover:text-gray-800'}`}>All</button>
        {types.map(t => { const s = ACTION_STYLES[t] || ACTION_STYLES['resource.accessed']; return (
          <button key={t} type="button" onClick={() => setFilter(t)} className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors cursor-pointer ${filter === t ? 'bg-gray-900 text-white' : 'bg-white border border-black/[0.10] text-gray-500 hover:text-gray-800'}`}>{s.label}</button>
        ) })}
      </div>
      <div>
        {filtered.map((e, i) => {
          const actor = users.find(u => u.id === e.actor)
          const target = e.targetUser ? users.find(u => u.id === e.targetUser) : null
          const scope = ORG_NODES.find(n => n.id === e.scopeId)
          const as = ACTION_STYLES[e.action] || ACTION_STYLES['resource.accessed']
          return (
            <div key={e.id} className={`flex gap-3 py-3 ${i < filtered.length - 1 ? 'border-b border-black/[0.04]' : ''} ${e.internal ? 'border-l-2 border-l-purple-400 pl-3' : ''}`}>
              <div className="w-16 shrink-0 text-right"><p className="text-[11px] text-gray-400 tabular-nums">{timeAgo(e.timestamp)}</p></div>
              <div className="flex flex-col items-center shrink-0 pt-1"><div className={`w-2 h-2 rounded-full ${e.internal ? 'bg-purple-400' : 'bg-gray-300'}`} /></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  {actor && <span className="text-[12px] font-medium text-gray-800">{actor.name}</span>}
                  <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium ${as.bg} ${as.text}`}>{as.label}</span>
                  {target && <span className="text-[12px] text-gray-600">{target.name}</span>}
                  {e.internal && <span className="inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-medium bg-purple-50 text-purple-600 border border-purple-200"><AlertCircle className="w-2.5 h-2.5" /> Internal</span>}
                </div>
                {scope && <ScopeBreadcrumb nodeId={scope.id} />}
                <p className="text-[11px] text-gray-500 mt-0.5">{e.details}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT — lifts all mutable state
   ═══════════════════════════════════════════════════════════════ */

export default function OrgAccess({ activeTab, tier }) {
  const [activeTenant, setActiveTenant] = useState('meridian')
  const [users, setUsers] = useState(() => [...INITIAL_USERS])
  const [assignments, setAssignments] = useState(() => [...INITIAL_ASSIGNMENTS])
  const [auditLog, setAuditLog] = useState(() => [...INITIAL_AUDIT])

  const addAuditEntry = useCallback((action, scopeId, targetUser, roleId, details, internal) => {
    setAuditLog(prev => [{ id: `al-${Date.now()}`, timestamp: new Date().toISOString(), actor: 'alex', action, tenantId: activeTenant, scopeId, targetUser, roleId, details, internal: internal || false }, ...prev])
  }, [activeTenant])

  const handleInvite = useCallback(({ name, email, roleId, scopeId }) => {
    const id = `user-${Date.now()}`
    const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    const newUser = { id, name, initials, email, status: 'offline', lastActive: new Date().toISOString() }
    setUsers(prev => [...prev, newUser])
    const assignId = `ra-${Date.now()}`
    const scopeNode = ORG_NODES.find(n => n.id === scopeId)
    const role = ROLES.find(r => r.id === roleId)
    setAssignments(prev => [...prev, { id: assignId, userId: id, tenantId: activeTenant, roleId, scopeType: scopeNode?.type || 'org', scopeId, assignedAt: new Date().toISOString(), assignedBy: 'alex' }])
    addAuditEntry('member.added', scopeId, id, null, `Invited ${name} to ${TENANTS.find(t => t.id === activeTenant)?.name}`)
    addAuditEntry('role.assigned', scopeId, id, roleId, `Assigned ${role?.name} at ${scopeNode?.name}`)
  }, [activeTenant, addAuditEntry])

  const handleAddRole = useCallback((userId, roleId, scopeId) => {
    const assignId = `ra-${Date.now()}`
    const scopeNode = ORG_NODES.find(n => n.id === scopeId)
    const role = ROLES.find(r => r.id === roleId)
    const user = users.find(u => u.id === userId)
    setAssignments(prev => [...prev, { id: assignId, userId, tenantId: activeTenant, roleId, scopeType: scopeNode?.type || 'org', scopeId, assignedAt: new Date().toISOString(), assignedBy: 'alex' }])
    addAuditEntry('role.assigned', scopeId, userId, roleId, `Assigned ${role?.name} at ${scopeNode?.name} to ${user?.name}`)
  }, [activeTenant, users, addAuditEntry])

  const handleRemoveRole = useCallback((assignmentId) => {
    const a = assignments.find(x => x.id === assignmentId)
    if (!a) return
    const user = users.find(u => u.id === a.userId)
    const role = ROLES.find(r => r.id === a.roleId)
    const scopeNode = ORG_NODES.find(n => n.id === a.scopeId)
    setAssignments(prev => prev.filter(x => x.id !== assignmentId))
    addAuditEntry('role.removed', a.scopeId, a.userId, a.roleId, `Removed ${role?.name} at ${scopeNode?.name} from ${user?.name}`)
  }, [assignments, users, addAuditEntry])

  const handleRemoveMember = useCallback((userId) => {
    const user = users.find(u => u.id === userId)
    setAssignments(prev => prev.filter(a => !(a.userId === userId && a.tenantId === activeTenant)))
    addAuditEntry('member.removed', ORG_NODES.find(n => n.tenantId === activeTenant && !n.parentId)?.id, userId, null, `Removed ${user?.name} from ${TENANTS.find(t => t.id === activeTenant)?.name}`)
  }, [activeTenant, users, addAuditEntry])

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <span className="text-[11px] text-gray-400">Tenant:</span>
        <div className="flex items-center gap-1">
          {TENANTS.map(t => (
            <button key={t.id} type="button" onClick={() => setActiveTenant(t.id)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${activeTenant === t.id ? 'bg-[#3D16FA] text-white' : 'text-gray-500 hover:bg-black/[0.05]'}`}>{t.name}</button>
          ))}
        </div>
      </div>
      {activeTab === 'structure' && <StructureTab tenantId={activeTenant} assignments={assignments} users={users} />}
      {activeTab === 'members' && <MembersTab tenantId={activeTenant} users={users} assignments={assignments} onInvite={handleInvite} onAddRole={handleAddRole} onRemoveRole={handleRemoveRole} onRemoveMember={handleRemoveMember} />}
      {activeTab === 'roles' && <RolesTab assignments={assignments} />}
      {activeTab === 'audit' && <AuditTab tenantId={activeTenant} auditLog={auditLog} users={users} />}
    </div>
  )
}
