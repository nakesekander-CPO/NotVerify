import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronRight, Shield, Users, Search, Clock, X, Eye, UserPlus,
  UserMinus, KeyRound, AlertCircle, Network, Building2, Globe,
  MapPin, Briefcase, GitBranch, CheckCircle2, ExternalLink,
} from 'lucide-react'
import {
  TENANTS, ORG_NODES, ROLES, USERS, ROLE_ASSIGNMENTS, AUDIT_LOG,
  NODE_TYPE_STYLES, ACTION_STYLES,
  getNodePath, getNodeChildren, getNodeEffectiveMembers,
  getNodeChildCount, getNodeAssignmentCount, getUserEffectiveRoles,
} from '../../data/rbacModel'

/* ─── Helpers ────────────────────────────────────────────────── */

function Avatar({ initials, size = 28, internal }) {
  return (
    <div
      className={`shrink-0 rounded-full flex items-center justify-center font-semibold text-[10px] ${internal ? 'bg-purple-100 text-purple-700' : 'bg-gray-200 text-gray-600'}`}
      style={{ width: size, height: size }}
    >
      {initials}
    </div>
  )
}

function NodeTypeBadge({ type }) {
  const style = NODE_TYPE_STYLES[type] || NODE_TYPE_STYLES.department
  return (
    <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium border ${style.bg} ${style.text} ${style.border}`}>
      {style.label}
    </span>
  )
}

function RoleBadge({ role, scopeNode, compact }) {
  const isInternal = role?.internal
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium border ${
      isInternal ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-[#009eda]/10 text-[#009eda] border-[#009eda]/20'
    }`}>
      {isInternal && <AlertCircle className="w-2.5 h-2.5" />}
      {role?.name}{!compact && scopeNode ? ` @ ${scopeNode.name}` : ''}
    </span>
  )
}

function StatusDot({ status }) {
  const color = status === 'online' ? 'bg-emerald-400' : status === 'away' ? 'bg-amber-400' : 'bg-gray-300'
  return <span className={`w-2 h-2 rounded-full ${color} shrink-0`} />
}

function timeAgo(ts) {
  const diff = Date.now() - new Date(ts).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

/* ═══════════════════════════════════════════════════════════════
   STRUCTURE TAB
   ═══════════════════════════════════════════════════════════════ */

function TreeNode({ nodeId, depth, expanded, onToggle, selected, onSelect, tenantId }) {
  const node = ORG_NODES.find(n => n.id === nodeId)
  if (!node) return null
  const children = getNodeChildren(nodeId)
  const hasChildren = children.length > 0
  const isExpanded = expanded.has(nodeId)
  const isSelected = selected === nodeId
  const assignmentCount = getNodeAssignmentCount(nodeId)
  const memberCount = getNodeEffectiveMembers(nodeId).length

  return (
    <>
      <button
        type="button"
        onClick={() => onSelect(nodeId)}
        className={`w-full flex items-center gap-2 py-2 pr-3 text-left transition-colors cursor-pointer rounded-md ${
          isSelected ? 'bg-[#009eda]/[0.08] border-l-2 border-[#009eda] pl-[calc(var(--indent)-2px)]' : 'hover:bg-black/[0.03] pl-[var(--indent)]'
        }`}
        style={{ '--indent': `${depth * 24 + 8}px` }}
      >
        {hasChildren ? (
          <span onClick={(e) => { e.stopPropagation(); onToggle(nodeId) }}
            className="p-0.5 rounded hover:bg-black/[0.06] transition-colors">
            <ChevronRight className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
          </span>
        ) : (
          <span className="w-4.5" />
        )}
        <NodeTypeBadge type={node.type} />
        <span className="text-[13px] font-medium text-gray-800 truncate flex-1">{node.name}</span>
        <span className="text-[10px] text-gray-400 shrink-0 tabular-nums">
          {memberCount > 0 && <span className="mr-2">{memberCount} <Users className="w-2.5 h-2.5 inline -mt-0.5" /></span>}
          {assignmentCount > 0 && <span>{assignmentCount} <KeyRound className="w-2.5 h-2.5 inline -mt-0.5" /></span>}
        </span>
      </button>
      {hasChildren && isExpanded && children.map(child => (
        <TreeNode key={child.id} nodeId={child.id} depth={depth + 1} expanded={expanded} onToggle={onToggle} selected={selected} onSelect={onSelect} tenantId={tenantId} />
      ))}
    </>
  )
}

function NodeDetailPanel({ nodeId, onClose }) {
  const node = ORG_NODES.find(n => n.id === nodeId)
  if (!node) return null
  const path = getNodePath(nodeId)
  const members = getNodeEffectiveMembers(nodeId)
  const directMembers = members.filter(m => m.isDirect)
  const inheritedMembers = members.filter(m => !m.isDirect)

  return (
    <div className="w-80 shrink-0 border-l border-black/[0.08] overflow-y-auto">
      <div className="p-4 border-b border-black/[0.06]">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1 mb-2 flex-wrap">
          {path.map((n, i) => (
            <span key={n.id} className="flex items-center gap-1 text-[10px] text-gray-400">
              {i > 0 && <ChevronRight className="w-2.5 h-2.5" />}
              <span className={i === path.length - 1 ? 'text-gray-700 font-medium' : ''}>{n.name}</span>
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <NodeTypeBadge type={node.type} />
          <h3 className="text-[15px] font-semibold text-gray-900">{node.name}</h3>
        </div>
      </div>

      {/* Direct Assignments */}
      <div className="p-4 border-b border-black/[0.06]">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-3">Direct Assignments ({directMembers.length})</p>
        {directMembers.length > 0 ? (
          <div className="space-y-2">
            {directMembers.map((m, i) => (
              <div key={`${m.user.id}-${i}`} className="flex items-center gap-2.5">
                <Avatar initials={m.user.initials} internal={m.user.internal} />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium text-gray-800 truncate">{m.user.name}</p>
                  <RoleBadge role={m.role} compact />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[11px] text-gray-400">No direct assignments at this scope.</p>
        )}
      </div>

      {/* Inherited Access */}
      <div className="p-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-3">Inherited Access ({inheritedMembers.length})</p>
        {inheritedMembers.length > 0 ? (
          <div className="space-y-2.5">
            {inheritedMembers.map((m, i) => (
              <div key={`${m.user.id}-${i}`}>
                <div className="flex items-center gap-2.5">
                  <Avatar initials={m.user.initials} internal={m.user.internal} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium text-gray-800 truncate">{m.user.name}</p>
                    <RoleBadge role={m.role} compact />
                  </div>
                </div>
                <p className="text-[10px] text-gray-400 italic ml-[38px] mt-0.5">
                  via {m.role.name} at {m.scopeNode?.name}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[11px] text-gray-400">No inherited access from parent scopes.</p>
        )}
      </div>
    </div>
  )
}

function StructureTab({ tenantId }) {
  const rootNodes = ORG_NODES.filter(n => n.tenantId === tenantId && n.parentId === null)
  const regionIds = rootNodes.flatMap(r => getNodeChildren(r.id).map(c => c.id))
  const [expanded, setExpanded] = useState(() => new Set([...rootNodes.map(r => r.id), ...regionIds]))
  const [selectedNodeId, setSelectedNodeId] = useState(null)

  const toggleExpand = (id) => setExpanded(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next })

  return (
    <div className="flex gap-0 min-h-[400px]">
      <div className="flex-1 min-w-0">
        {rootNodes.map(root => (
          <TreeNode key={root.id} nodeId={root.id} depth={0} expanded={expanded} onToggle={toggleExpand} selected={selectedNodeId} onSelect={setSelectedNodeId} tenantId={tenantId} />
        ))}
      </div>
      <AnimatePresence>
        {selectedNodeId && (
          <motion.div initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 320 }} exit={{ opacity: 0, width: 0 }} transition={{ duration: 0.2 }}>
            <NodeDetailPanel nodeId={selectedNodeId} onClose={() => setSelectedNodeId(null)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   MEMBERS TAB
   ═══════════════════════════════════════════════════════════════ */

function MembersTab({ tenantId }) {
  const [selectedUserId, setSelectedUserId] = useState(null)
  const [search, setSearch] = useState('')

  const tenantUsers = useMemo(() => {
    const memberIds = new Set(ROLE_ASSIGNMENTS.filter(a => a.tenantId === tenantId).map(a => a.userId))
    return USERS.filter(u => memberIds.has(u.id))
  }, [tenantId])

  const filtered = search
    ? tenantUsers.filter(u => u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()))
    : tenantUsers

  const selectedUser = selectedUserId ? USERS.find(u => u.id === selectedUserId) : null
  const selectedRoles = selectedUserId ? getUserEffectiveRoles(selectedUserId, tenantId) : []

  return (
    <div className="flex gap-0 min-h-[400px]">
      <div className="flex-1 min-w-0">
        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input type="text" placeholder="Search members..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-black/[0.08] bg-gray-50 text-[12px] placeholder:text-gray-400 outline-none focus:border-[#009eda] transition" />
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
              const roles = getUserEffectiveRoles(user.id, tenantId)
              return (
                <tr key={user.id} onClick={() => setSelectedUserId(user.id)}
                  className={`border-b border-black/[0.04] cursor-pointer transition-colors ${selectedUserId === user.id ? 'bg-[#009eda]/[0.06]' : 'hover:bg-gray-50'}`}>
                  <td className="py-2.5 pr-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar initials={user.initials} internal={user.internal} />
                      <div>
                        <p className="text-[12px] font-medium text-gray-800">{user.name}</p>
                        <p className="text-[10px] text-gray-400">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5 pr-3">
                    <div className="flex flex-wrap gap-1">
                      {roles.map(r => <RoleBadge key={r.id} role={r.role} scopeNode={r.scopeNode} />)}
                    </div>
                  </td>
                  <td className="py-2.5 pr-3">
                    <div className="flex items-center gap-1.5">
                      <StatusDot status={user.status} />
                      <span className="text-[11px] text-gray-500 capitalize">{user.status}</span>
                    </div>
                  </td>
                  <td className="py-2.5 text-right text-[11px] text-gray-400">{timeAgo(user.lastActive)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* User detail panel */}
      <AnimatePresence>
        {selectedUser && (
          <motion.div initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 320 }} exit={{ opacity: 0, width: 0 }} transition={{ duration: 0.2 }}
            className="shrink-0 border-l border-black/[0.08] overflow-y-auto">
            <div className="p-4 border-b border-black/[0.06]">
              <div className="flex items-center gap-3 mb-2">
                <Avatar initials={selectedUser.initials} size={36} internal={selectedUser.internal} />
                <div>
                  <p className="text-[14px] font-semibold text-gray-900">{selectedUser.name}</p>
                  <p className="text-[11px] text-gray-500">{selectedUser.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <StatusDot status={selectedUser.status} />
                <span className="text-[11px] text-gray-500 capitalize">{selectedUser.status}</span>
                {selectedUser.internal && (
                  <span className="ml-1 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-200">
                    <AlertCircle className="w-2.5 h-2.5" /> Internal
                  </span>
                )}
              </div>
            </div>

            <div className="p-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-3">Role Assignments ({selectedRoles.length})</p>
              <div className="space-y-3">
                {selectedRoles.map(assignment => (
                  <div key={assignment.id} className={`rounded-lg border p-3 ${assignment.internal ? 'border-purple-200 bg-purple-50/30 border-l-4 border-l-purple-400' : 'border-black/[0.08]'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <Shield className={`w-3.5 h-3.5 ${assignment.internal ? 'text-purple-600' : 'text-[#009eda]'}`} />
                      <span className="text-[13px] font-semibold text-gray-900">{assignment.role?.name}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-gray-500 mb-1.5">
                      {assignment.path.map((n, i) => (
                        <span key={n.id} className="flex items-center gap-1">
                          {i > 0 && <ChevronRight className="w-2.5 h-2.5 text-gray-300" />}
                          <span className={i === assignment.path.length - 1 ? 'text-gray-700 font-medium' : ''}>{n.name}</span>
                        </span>
                      ))}
                    </div>
                    {assignment.coveredNodes.length > 1 && (
                      <p className="text-[10px] text-gray-400">
                        Inherits to: {assignment.coveredNodes.slice(1, 6).map(n => n.name).join(', ')}
                        {assignment.coveredNodes.length > 6 && ` +${assignment.coveredNodes.length - 6} more`}
                      </p>
                    )}
                    {assignment.expiresAt && (
                      <p className="text-[10px] text-amber-600 mt-1 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" /> Expires {new Date(assignment.expiresAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   ROLES TAB
   ═══════════════════════════════════════════════════════════════ */

function RolesTab() {
  const assignmentCounts = useMemo(() => {
    const counts = {}
    ROLE_ASSIGNMENTS.forEach(a => { counts[a.roleId] = (counts[a.roleId] || 0) + 1 })
    return counts
  }, [])

  return (
    <div className="space-y-3">
      {ROLES.map(role => (
        <div key={role.id} className={`rounded-xl border p-4 ${role.internal ? 'border-purple-200 bg-purple-50/20' : 'border-black/[0.08] bg-white'}`}>
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${role.internal ? 'bg-purple-100' : 'bg-[#009eda]/10'}`}>
                <Shield className={`w-4 h-4 ${role.internal ? 'text-purple-600' : 'text-[#009eda]'}`} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-[14px] font-semibold text-gray-900">{role.name}</h3>
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md ${
                    role.level === 'tenant' ? 'bg-gray-100 text-gray-600' :
                    role.level === 'platform' ? 'bg-purple-50 text-purple-600' :
                    'bg-blue-50 text-blue-600'
                  }`}>
                    {role.level}
                  </span>
                  {role.internal && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-red-50 text-red-600 border border-red-200">
                      Internal Only
                    </span>
                  )}
                </div>
                <p className="text-[12px] text-gray-500 mt-0.5">{role.description}</p>
              </div>
            </div>
            <span className="text-[11px] text-gray-400 shrink-0 tabular-nums">{assignmentCounts[role.id] || 0} assigned</span>
          </div>
          {/* Permissions */}
          <div className="flex flex-wrap gap-1 mt-3 ml-[42px]">
            {role.permissions.map(p => (
              <span key={p} className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-600 border border-gray-200">
                {p === '*' ? 'Full Access' : p.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   AUDIT LOG TAB
   ═══════════════════════════════════════════════════════════════ */

function AuditTab({ tenantId }) {
  const [filterAction, setFilterAction] = useState('all')

  const tenantLogs = useMemo(() =>
    AUDIT_LOG.filter(l => l.tenantId === tenantId).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)),
    [tenantId]
  )

  const filtered = filterAction === 'all' ? tenantLogs : tenantLogs.filter(l => l.action === filterAction)
  const actionTypes = [...new Set(tenantLogs.map(l => l.action))]

  return (
    <div>
      {/* Filters */}
      <div className="flex items-center gap-1.5 mb-4 flex-wrap">
        <button type="button" onClick={() => setFilterAction('all')}
          className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors cursor-pointer ${filterAction === 'all' ? 'bg-gray-900 text-white' : 'bg-white border border-black/[0.10] text-gray-500 hover:text-gray-800'}`}>
          All
        </button>
        {actionTypes.map(action => {
          const style = ACTION_STYLES[action] || ACTION_STYLES['resource.accessed']
          return (
            <button key={action} type="button" onClick={() => setFilterAction(action)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors cursor-pointer ${filterAction === action ? 'bg-gray-900 text-white' : `bg-white border border-black/[0.10] text-gray-500 hover:text-gray-800`}`}>
              {style.label}
            </button>
          )
        })}
      </div>

      {/* Timeline */}
      <div className="space-y-0">
        {filtered.map((entry, i) => {
          const actor = USERS.find(u => u.id === entry.actor)
          const target = entry.targetUser ? USERS.find(u => u.id === entry.targetUser) : null
          const scope = ORG_NODES.find(n => n.id === entry.scopeId)
          const actionStyle = ACTION_STYLES[entry.action] || ACTION_STYLES['resource.accessed']
          const path = scope ? getNodePath(scope.id) : []

          return (
            <div key={entry.id} className={`flex gap-3 py-3 ${i < filtered.length - 1 ? 'border-b border-black/[0.04]' : ''} ${entry.internal ? 'border-l-2 border-l-purple-400 pl-3' : ''}`}>
              {/* Time */}
              <div className="w-16 shrink-0 text-right">
                <p className="text-[11px] text-gray-400 tabular-nums">{timeAgo(entry.timestamp)}</p>
              </div>
              {/* Dot */}
              <div className="flex flex-col items-center shrink-0 pt-1">
                <div className={`w-2 h-2 rounded-full ${entry.internal ? 'bg-purple-400' : 'bg-gray-300'}`} />
              </div>
              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  {actor && <span className="text-[12px] font-medium text-gray-800">{actor.name}</span>}
                  <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium ${actionStyle.bg} ${actionStyle.text}`}>
                    {actionStyle.label}
                  </span>
                  {target && <span className="text-[12px] text-gray-600">{target.name}</span>}
                  {entry.internal && (
                    <span className="inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-medium bg-purple-50 text-purple-600 border border-purple-200">
                      <AlertCircle className="w-2.5 h-2.5" /> Internal
                    </span>
                  )}
                </div>
                {/* Scope breadcrumb */}
                {path.length > 0 && (
                  <div className="flex items-center gap-0.5 mb-0.5">
                    {path.map((n, j) => (
                      <span key={n.id} className="flex items-center gap-0.5 text-[10px] text-gray-400">
                        {j > 0 && <ChevronRight className="w-2 h-2" />}
                        {n.name}
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-[11px] text-gray-500">{entry.details}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */

export default function OrgAccess({ activeTab, tier }) {
  const [activeTenant, setActiveTenant] = useState('ibm')
  const tenant = TENANTS.find(t => t.id === activeTenant)

  return (
    <div>
      {/* Tenant selector */}
      <div className="flex items-center gap-3 mb-5">
        <span className="text-[11px] text-gray-400">Tenant:</span>
        <div className="flex items-center gap-1">
          {TENANTS.map(t => (
            <button key={t.id} type="button" onClick={() => setActiveTenant(t.id)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                activeTenant === t.id ? 'bg-[#009eda] text-white' : 'text-gray-500 hover:bg-black/[0.05]'
              }`}>
              {t.name}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {activeTab === 'structure' && <StructureTab tenantId={activeTenant} />}
      {activeTab === 'members' && <MembersTab tenantId={activeTenant} />}
      {activeTab === 'roles' && <RolesTab />}
      {activeTab === 'audit' && <AuditTab tenantId={activeTenant} />}
    </div>
  )
}
