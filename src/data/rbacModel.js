/**
 * Enterprise RBAC Domain Model
 *
 * Hierarchical, multi-tenant, scoped role-based access control.
 * Tree-based org structure with downward inheritance.
 */

/* ─── Tenants ────────────────────────────────────────────────── */

export const TENANTS = [
  { id: 'ibm', name: 'IBM Corporation', plan: 'enterprise', domain: 'ibm.com' },
  { id: 'meridian', name: 'Meridian Capital', plan: 'enterprise', domain: 'meridian-capital.com' },
];

/* ─── Org Nodes (tree) ───────────────────────────────────────── */

export const ORG_NODES = [
  // IBM
  { id: 'ibm-root',           tenantId: 'ibm', parentId: null,              name: 'IBM Corporation',  type: 'tenant' },
  { id: 'ibm-americas',       tenantId: 'ibm', parentId: 'ibm-root',       name: 'Americas',         type: 'region' },
  { id: 'ibm-us',             tenantId: 'ibm', parentId: 'ibm-americas',   name: 'United States',    type: 'country' },
  { id: 'ibm-us-research',    tenantId: 'ibm', parentId: 'ibm-us',         name: 'Research',         type: 'department' },
  { id: 'ibm-us-cloud',       tenantId: 'ibm', parentId: 'ibm-us',         name: 'Cloud Division',   type: 'department' },
  { id: 'ibm-brazil',         tenantId: 'ibm', parentId: 'ibm-americas',   name: 'Brazil',           type: 'country' },
  { id: 'ibm-emea',           tenantId: 'ibm', parentId: 'ibm-root',       name: 'EMEA',             type: 'region' },
  { id: 'ibm-uk',             tenantId: 'ibm', parentId: 'ibm-emea',       name: 'United Kingdom',   type: 'country' },
  { id: 'ibm-germany',        tenantId: 'ibm', parentId: 'ibm-emea',       name: 'Germany',          type: 'country' },
  { id: 'ibm-germany-tax',    tenantId: 'ibm', parentId: 'ibm-germany',    name: 'Tax & Compliance', type: 'department' },
  { id: 'ibm-france',         tenantId: 'ibm', parentId: 'ibm-emea',       name: 'France',           type: 'country' },
  { id: 'ibm-apac',           tenantId: 'ibm', parentId: 'ibm-root',       name: 'APAC',             type: 'region' },
  { id: 'ibm-japan',          tenantId: 'ibm', parentId: 'ibm-apac',       name: 'Japan',            type: 'country' },
  { id: 'ibm-india',          tenantId: 'ibm', parentId: 'ibm-apac',       name: 'India',            type: 'country' },
  // Meridian
  { id: 'meridian-root',      tenantId: 'meridian', parentId: null,                name: 'Meridian Capital',    type: 'tenant' },
  { id: 'meridian-london',    tenantId: 'meridian', parentId: 'meridian-root',     name: 'London HQ',          type: 'region' },
  { id: 'meridian-singapore', tenantId: 'meridian', parentId: 'meridian-root',     name: 'Singapore Office',   type: 'region' },
  { id: 'meridian-ma',        tenantId: 'meridian', parentId: 'meridian-london',   name: 'M&A Team',           type: 'team' },
  { id: 'meridian-compliance',tenantId: 'meridian', parentId: 'meridian-london',   name: 'Compliance',         type: 'department' },
];

/* ─── Node type styling ──────────────────────────────────────── */

export const NODE_TYPE_STYLES = {
  tenant:      { bg: 'bg-gray-100',    text: 'text-gray-700',    border: 'border-gray-200',    label: 'Tenant' },
  region:      { bg: 'bg-purple-50',   text: 'text-purple-600',  border: 'border-purple-200',  label: 'Region' },
  country:     { bg: 'bg-blue-50',     text: 'text-blue-600',    border: 'border-blue-200',    label: 'Country' },
  department:  { bg: 'bg-amber-50',    text: 'text-amber-600',   border: 'border-amber-200',   label: 'Department' },
  team:        { bg: 'bg-emerald-50',  text: 'text-emerald-600', border: 'border-emerald-200', label: 'Team' },
  'legal-entity': { bg: 'bg-cyan-50',  text: 'text-cyan-600',    border: 'border-cyan-200',    label: 'Legal Entity' },
  workspace:   { bg: 'bg-indigo-50',   text: 'text-indigo-600',  border: 'border-indigo-200',  label: 'Workspace' },
};

/* ─── Roles ──────────────────────────────────────────────────── */

export const ROLES = [
  { id: 'tenant-admin',     name: 'Tenant Admin',     description: 'Full access across the entire tenant. Can manage all structure, members, roles, and resources.',  level: 'tenant',   permissions: ['*'],                                                                                    internal: false },
  { id: 'org-manager',      name: 'Org Manager',      description: 'Manage structure, members, and workflows within their assigned scope and all descendants.',       level: 'org',      permissions: ['manage_members', 'manage_structure', 'view_audit', 'manage_workflows', 'view_resource', 'create_resource', 'edit_resource'], internal: false },
  { id: 'contributor',      name: 'Contributor',       description: 'Create and edit resources. Can submit work for review but cannot approve.',                       level: 'org',      permissions: ['create_resource', 'edit_resource', 'view_resource', 'submit_review'],                    internal: false },
  { id: 'viewer',           name: 'Viewer',            description: 'Read-only access to resources within scope. Cannot modify or create.',                            level: 'org',      permissions: ['view_resource'],                                                                         internal: false },
  { id: 'approver',         name: 'Approver',          description: 'Review and approve resources. Can accept, reject, or request changes.',                           level: 'org',      permissions: ['view_resource', 'approve_resource', 'reject_resource', 'request_changes'],               internal: false },
  { id: 'support-operator', name: 'Support Operator',  description: 'Internal platform support access. All actions are audited and time-bounded.',                     level: 'platform', permissions: ['view_resource', 'view_audit', 'impersonate'],                                            internal: true },
];

/* ─── Users ──────────────────────────────────────────────────── */

export const USERS = [
  { id: 'alex',    name: 'Alex Chen',        initials: 'AC', email: 'alex.chen@meridian-capital.com',    status: 'online',  lastActive: '2026-03-31T09:15:00Z' },
  { id: 'kenji',   name: 'Kenji Tanaka',     initials: 'KT', email: 'kenji.tanaka@ibm.com',             status: 'online',  lastActive: '2026-03-31T08:42:00Z' },
  { id: 'sarah',   name: 'Sarah Chen',       initials: 'SC', email: 'sarah.chen@ibm.com',               status: 'online',  lastActive: '2026-03-31T07:30:00Z' },
  { id: 'marcus',  name: 'Marcus Weber',     initials: 'MW', email: 'marcus.weber@ibm.com',             status: 'online',  lastActive: '2026-03-30T16:20:00Z' },
  { id: 'thomas',  name: 'Thomas Park',      initials: 'TP', email: 'thomas.park@ibm.com',              status: 'away',    lastActive: '2026-03-30T14:05:00Z' },
  { id: 'priya',   name: 'Priya Patel',      initials: 'PP', email: 'priya.patel@ibm.com',              status: 'offline', lastActive: '2026-03-29T11:00:00Z' },
  { id: 'yuki',    name: 'Yuki Nakamura',    initials: 'YN', email: 'yuki.nakamura@ibm.com',            status: 'away',    lastActive: '2026-03-31T06:15:00Z' },
  { id: 'maria',   name: 'Maria Santos',     initials: 'MS', email: 'maria.santos@ibm.com',             status: 'online',  lastActive: '2026-03-31T09:00:00Z' },
  { id: 'james',   name: 'James Liu',        initials: 'JL', email: 'james.liu@meridian-capital.com',   status: 'online',  lastActive: '2026-03-31T08:55:00Z' },
  { id: 'support-bot', name: 'NV Support',   initials: 'NV', email: 'support@notverify.com',            status: 'online',  lastActive: '2026-03-31T09:20:00Z', internal: true },
];

/* ─── Tenant Memberships ─────────────────────────────────────── */

export const MEMBERSHIPS = [
  { userId: 'alex',    tenantId: 'meridian' },
  { userId: 'james',   tenantId: 'meridian' },
  { userId: 'kenji',   tenantId: 'ibm' },
  { userId: 'sarah',   tenantId: 'ibm' },
  { userId: 'marcus',  tenantId: 'ibm' },
  { userId: 'thomas',  tenantId: 'ibm' },
  { userId: 'priya',   tenantId: 'ibm' },
  { userId: 'yuki',    tenantId: 'ibm' },
  { userId: 'maria',   tenantId: 'ibm' },
  // Support has access to both tenants
  { userId: 'support-bot', tenantId: 'ibm' },
  { userId: 'support-bot', tenantId: 'meridian' },
];

/* ─── Role Assignments (scoped) ──────────────────────────────── */

export const ROLE_ASSIGNMENTS = [
  // Meridian
  { id: 'ra-1',  userId: 'alex',        tenantId: 'meridian', roleId: 'tenant-admin',     scopeType: 'tenant',     scopeId: 'meridian-root',     assignedAt: '2025-06-01T00:00:00Z', assignedBy: 'system' },
  { id: 'ra-2',  userId: 'james',       tenantId: 'meridian', roleId: 'contributor',       scopeType: 'team',       scopeId: 'meridian-ma',       assignedAt: '2025-09-15T00:00:00Z', assignedBy: 'alex' },
  // IBM
  { id: 'ra-3',  userId: 'kenji',       tenantId: 'ibm',     roleId: 'org-manager',       scopeType: 'region',     scopeId: 'ibm-apac',          assignedAt: '2025-03-01T00:00:00Z', assignedBy: 'system' },
  { id: 'ra-4',  userId: 'sarah',       tenantId: 'ibm',     roleId: 'approver',          scopeType: 'country',    scopeId: 'ibm-japan',         assignedAt: '2025-04-10T00:00:00Z', assignedBy: 'kenji' },
  { id: 'ra-5',  userId: 'marcus',      tenantId: 'ibm',     roleId: 'contributor',        scopeType: 'region',     scopeId: 'ibm-emea',          assignedAt: '2025-05-20T00:00:00Z', assignedBy: 'system' },
  { id: 'ra-6',  userId: 'thomas',      tenantId: 'ibm',     roleId: 'viewer',             scopeType: 'department', scopeId: 'ibm-germany-tax',   assignedAt: '2025-07-01T00:00:00Z', assignedBy: 'marcus' },
  { id: 'ra-7',  userId: 'priya',       tenantId: 'ibm',     roleId: 'org-manager',       scopeType: 'country',    scopeId: 'ibm-india',         assignedAt: '2025-08-12T00:00:00Z', assignedBy: 'kenji' },
  { id: 'ra-8',  userId: 'yuki',        tenantId: 'ibm',     roleId: 'approver',          scopeType: 'country',    scopeId: 'ibm-japan',         assignedAt: '2025-09-01T00:00:00Z', assignedBy: 'kenji' },
  { id: 'ra-9',  userId: 'maria',       tenantId: 'ibm',     roleId: 'contributor',        scopeType: 'region',     scopeId: 'ibm-americas',      assignedAt: '2025-10-15T00:00:00Z', assignedBy: 'system' },
  // Internal support
  { id: 'ra-10', userId: 'support-bot', tenantId: 'ibm',     roleId: 'support-operator',  scopeType: 'tenant',     scopeId: 'ibm-root',          assignedAt: '2026-03-25T10:00:00Z', assignedBy: 'platform', internal: true, expiresAt: '2026-04-25T10:00:00Z' },
];

/* ─── Audit Log ──────────────────────────────────────────────── */

export const AUDIT_LOG = [
  { id: 'al-1',  timestamp: '2026-03-31T09:20:00Z', actor: 'support-bot', action: 'support.access',   tenantId: 'ibm', scopeId: 'ibm-root',       targetUser: null,      roleId: 'support-operator', details: 'Support session initiated for ticket #4821', internal: true },
  { id: 'al-2',  timestamp: '2026-03-31T08:15:00Z', actor: 'kenji',       action: 'resource.accessed', tenantId: 'ibm', scopeId: 'ibm-japan',      targetUser: null,      roleId: null,               details: 'Accessed Q3 Earnings Report (JA locale)' },
  { id: 'al-3',  timestamp: '2026-03-30T16:42:00Z', actor: 'alex',        action: 'role.assigned',     tenantId: 'ibm', scopeId: 'ibm-emea',       targetUser: 'marcus',  roleId: 'contributor',      details: 'Assigned Contributor role at EMEA scope' },
  { id: 'al-4',  timestamp: '2026-03-30T14:30:00Z', actor: 'marcus',      action: 'role.assigned',     tenantId: 'ibm', scopeId: 'ibm-germany-tax',targetUser: 'thomas',  roleId: 'viewer',           details: 'Assigned Viewer role at Tax & Compliance' },
  { id: 'al-5',  timestamp: '2026-03-29T11:05:00Z', actor: 'kenji',       action: 'member.added',      tenantId: 'ibm', scopeId: 'ibm-apac',       targetUser: 'yuki',    roleId: null,               details: 'Added Yuki Nakamura to IBM tenant' },
  { id: 'al-6',  timestamp: '2026-03-28T09:30:00Z', actor: 'sarah',       action: 'resource.accessed', tenantId: 'ibm', scopeId: 'ibm-japan',      targetUser: null,      roleId: null,               details: 'Approved Q3 Investor Presentation (JA)' },
  { id: 'al-7',  timestamp: '2026-03-27T15:20:00Z', actor: 'kenji',       action: 'role.assigned',     tenantId: 'ibm', scopeId: 'ibm-japan',      targetUser: 'sarah',   roleId: 'approver',         details: 'Assigned Approver role at Japan scope' },
  { id: 'al-8',  timestamp: '2026-03-26T10:00:00Z', actor: 'platform',    action: 'support.access',    tenantId: 'ibm', scopeId: 'ibm-root',       targetUser: 'support-bot', roleId: 'support-operator', details: 'Support access granted (expires 2026-04-25)', internal: true },
  { id: 'al-9',  timestamp: '2026-03-25T09:15:00Z', actor: 'priya',       action: 'resource.accessed', tenantId: 'ibm', scopeId: 'ibm-india',      targetUser: null,      roleId: null,               details: 'Created new translation campaign for India' },
  { id: 'al-10', timestamp: '2026-03-24T14:00:00Z', actor: 'marcus',      action: 'resource.accessed', tenantId: 'ibm', scopeId: 'ibm-uk',         targetUser: null,      roleId: null,               details: 'Submitted UK regulatory filing for review' },
  { id: 'al-11', timestamp: '2026-03-23T11:30:00Z', actor: 'alex',        action: 'role.removed',      tenantId: 'meridian', scopeId: 'meridian-root', targetUser: 'james', roleId: 'viewer',          details: 'Upgraded from Viewer — reassigned as Contributor' },
  { id: 'al-12', timestamp: '2026-03-22T16:45:00Z', actor: 'alex',        action: 'role.assigned',     tenantId: 'meridian', scopeId: 'meridian-ma',   targetUser: 'james', roleId: 'contributor',     details: 'Assigned Contributor role at M&A Team' },
  { id: 'al-13', timestamp: '2026-03-20T08:00:00Z', actor: 'kenji',       action: 'member.added',      tenantId: 'ibm', scopeId: 'ibm-india',      targetUser: 'priya',   roleId: null,               details: 'Added Priya Patel to IBM tenant' },
  { id: 'al-14', timestamp: '2026-03-18T13:00:00Z', actor: 'system',      action: 'role.assigned',     tenantId: 'ibm', scopeId: 'ibm-americas',   targetUser: 'maria',   roleId: 'contributor',     details: 'Auto-assigned via onboarding flow' },
  { id: 'al-15', timestamp: '2026-03-15T10:30:00Z', actor: 'support-bot', action: 'resource.accessed', tenantId: 'ibm', scopeId: 'ibm-germany',    targetUser: null,      roleId: null,               details: 'Diagnostic access for support ticket #4790', internal: true },
];

/* ─── Action type styling ────────────────────────────────────── */

export const ACTION_STYLES = {
  'role.assigned':     { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Role Assigned' },
  'role.removed':      { bg: 'bg-red-50',     text: 'text-red-700',     label: 'Role Removed' },
  'member.added':      { bg: 'bg-blue-50',    text: 'text-blue-700',    label: 'Member Added' },
  'member.removed':    { bg: 'bg-red-50',     text: 'text-red-700',     label: 'Member Removed' },
  'support.access':    { bg: 'bg-purple-50',  text: 'text-purple-700',  label: 'Support Access' },
  'resource.accessed': { bg: 'bg-gray-50',    text: 'text-gray-600',    label: 'Resource Accessed' },
};

/* ═══════════════════════════════════════════════════════════════
   HELPER FUNCTIONS
   ═══════════════════════════════════════════════════════════════ */

/** Get the path from root to a node (array of nodes, root first) */
export function getNodePath(nodeId) {
  const path = [];
  let current = ORG_NODES.find(n => n.id === nodeId);
  while (current) {
    path.unshift(current);
    current = current.parentId ? ORG_NODES.find(n => n.id === current.parentId) : null;
  }
  return path;
}

/** Get direct children of a node */
export function getNodeChildren(nodeId) {
  return ORG_NODES.filter(n => n.parentId === nodeId);
}

/** Get all descendants of a node (BFS, not including the node itself) */
export function getNodeDescendants(nodeId) {
  const descendants = [];
  const queue = [nodeId];
  while (queue.length > 0) {
    const id = queue.shift();
    const children = ORG_NODES.filter(n => n.parentId === id);
    for (const child of children) {
      descendants.push(child);
      queue.push(child.id);
    }
  }
  return descendants;
}

/** Check if targetNodeId is a descendant of ancestorNodeId */
function isDescendantOf(targetNodeId, ancestorNodeId) {
  let current = ORG_NODES.find(n => n.id === targetNodeId);
  while (current) {
    if (current.id === ancestorNodeId) return true;
    current = current.parentId ? ORG_NODES.find(n => n.id === current.parentId) : null;
  }
  return false;
}

/** Get all role assignments for a user in a tenant, with coverage info */
export function getUserEffectiveRoles(userId, tenantId) {
  const assignments = ROLE_ASSIGNMENTS.filter(a => a.userId === userId && a.tenantId === tenantId);
  return assignments.map(a => {
    const role = ROLES.find(r => r.id === a.roleId);
    const scopeNode = ORG_NODES.find(n => n.id === a.scopeId);
    const descendants = getNodeDescendants(a.scopeId);
    const coveredNodes = scopeNode ? [scopeNode, ...descendants] : descendants;
    return {
      ...a,
      role,
      scopeNode,
      coveredNodes,
      path: getNodePath(a.scopeId),
    };
  });
}

/** Check if a user has a specific permission at a given node */
export function checkAccess(userId, tenantId, nodeId, permission) {
  const assignments = ROLE_ASSIGNMENTS.filter(a => a.userId === userId && a.tenantId === tenantId);

  for (const assignment of assignments) {
    const role = ROLES.find(r => r.id === assignment.roleId);
    if (!role) continue;

    const hasPermission = role.permissions.includes('*') || role.permissions.includes(permission);
    if (!hasPermission) continue;

    // Check if the node is at or under the assignment's scope
    if (assignment.scopeId === nodeId || isDescendantOf(nodeId, assignment.scopeId)) {
      const scopeNode = ORG_NODES.find(n => n.id === assignment.scopeId);
      const targetNode = ORG_NODES.find(n => n.id === nodeId);
      const isDirect = assignment.scopeId === nodeId;
      return {
        allowed: true,
        assignmentId: assignment.id,
        role: role.name,
        scopeNode,
        targetNode,
        isDirect,
        reason: isDirect
          ? `Direct: ${role.name} at ${scopeNode?.name}`
          : `Inherited: ${role.name} at ${scopeNode?.name} (via ${getNodePath(nodeId).map(n => n.name).join(' > ')})`,
        path: getNodePath(nodeId),
        internal: assignment.internal || false,
      };
    }
  }

  return { allowed: false, reason: 'No matching role assignment covers this scope' };
}

/** Get all users who have access to a given node (direct + inherited) */
export function getNodeEffectiveMembers(nodeId) {
  const node = ORG_NODES.find(n => n.id === nodeId);
  if (!node) return [];

  const tenantId = node.tenantId;
  const tenantAssignments = ROLE_ASSIGNMENTS.filter(a => a.tenantId === tenantId);
  const members = [];

  for (const assignment of tenantAssignments) {
    // Does this assignment's scope cover the target node?
    if (assignment.scopeId === nodeId || isDescendantOf(nodeId, assignment.scopeId)) {
      const user = USERS.find(u => u.id === assignment.userId);
      const role = ROLES.find(r => r.id === assignment.roleId);
      const scopeNode = ORG_NODES.find(n => n.id === assignment.scopeId);
      const isDirect = assignment.scopeId === nodeId;

      if (user && role) {
        members.push({
          user,
          role,
          assignment,
          scopeNode,
          isDirect,
          inheritancePath: isDirect ? null : getNodePath(assignment.scopeId).map(n => n.name).join(' > '),
        });
      }
    }
  }

  return members;
}

/** Get the count of direct children for each node */
export function getNodeChildCount(nodeId) {
  return ORG_NODES.filter(n => n.parentId === nodeId).length;
}

/** Get the count of direct role assignments at a node */
export function getNodeAssignmentCount(nodeId) {
  return ROLE_ASSIGNMENTS.filter(a => a.scopeId === nodeId).length;
}
