/**
 * Enterprise RBAC Domain Model
 *
 * Hierarchical, multi-tenant, scoped role-based access control.
 * Tree-based org structure with downward inheritance.
 */

/* ─── Tenants ────────────────────────────────────────────────── */

export const TENANTS = [
  { id: 'meridian', name: 'Meridian Capital', plan: 'enterprise', domain: 'meridian-capital.com' },
  { id: 'straker', name: 'arbitr', plan: 'enterprise', domain: 'arbitr.com' },
];

/* ─── Org Nodes (tree) ───────────────────────────────────────── */

export const ORG_NODES = [
  // Meridian Capital — primary tenant
  { id: 'mc-root',            tenantId: 'meridian', parentId: null,              name: 'Meridian Capital',       type: 'tenant' },
  // Japan
  { id: 'mc-japan',           tenantId: 'meridian', parentId: 'mc-root',         name: 'Japan',                 type: 'country' },
  { id: 'mc-japan-finance',   tenantId: 'meridian', parentId: 'mc-japan',        name: 'Financial Reporting',   type: 'department' },
  { id: 'mc-japan-compliance',tenantId: 'meridian', parentId: 'mc-japan',        name: 'Compliance & Regulatory', type: 'department' },
  { id: 'mc-japan-ma',        tenantId: 'meridian', parentId: 'mc-japan',        name: 'M&A Advisory',          type: 'team' },
  // Germany
  { id: 'mc-germany',         tenantId: 'meridian', parentId: 'mc-root',         name: 'Germany',               type: 'country' },
  { id: 'mc-germany-tax',     tenantId: 'meridian', parentId: 'mc-germany',      name: 'Tax & Audit',           type: 'department' },
  { id: 'mc-germany-wealth',  tenantId: 'meridian', parentId: 'mc-germany',      name: 'Wealth Management',     type: 'department' },
  // New Zealand
  { id: 'mc-nz',              tenantId: 'meridian', parentId: 'mc-root',         name: 'New Zealand',           type: 'country' },
  { id: 'mc-nz-ops',          tenantId: 'meridian', parentId: 'mc-nz',           name: 'Operations',            type: 'department' },
  { id: 'mc-nz-legal',        tenantId: 'meridian', parentId: 'mc-nz',           name: 'Legal',                 type: 'department' },
  // Global shared
  { id: 'mc-global-risk',     tenantId: 'meridian', parentId: 'mc-root',         name: 'Global Risk',           type: 'department' },
  // arbitr — secondary tenant (minimal)
  { id: 'straker-root',       tenantId: 'straker', parentId: null,               name: 'arbitr',  type: 'tenant' },
  { id: 'straker-apac',       tenantId: 'straker', parentId: 'straker-root',     name: 'APAC',                  type: 'region' },
  { id: 'straker-emea',       tenantId: 'straker', parentId: 'straker-root',     name: 'EMEA',                  type: 'region' },
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

  /* ─── HITL Vendor Workflow roles ─────────────────────────────── */
  { id: 'arbitr-global-admin',  name: 'arbitr Global Admin',  description: 'Platform owner. Manages global vendor registry, pools, selection policies, RBAC, and retraining governance.', level: 'platform', permissions: ['*'], internal: true },
  { id: 'org-admin',            name: 'Org Admin',            description: 'Manage organisation-level vendor pools, selection policies, and members.',                                    level: 'org',      permissions: ['manage_members', 'manage_structure', 'manage_workflows', 'manage_vendor_pool:org', 'manage_selection_policy:org', 'reassign_task', 'view_audit', 'view_resource', 'create_resource', 'edit_resource'], internal: false },
  { id: 'vendor-manager',       name: 'Vendor Manager',       description: 'Create and edit vendor profiles within scope. Review vendor performance. Approve assignments where permitted.', level: 'org',    permissions: ['manage_vendor:scope', 'review_vendor_performance', 'approve_assignment', 'suspend_vendor:scope', 'reassign_task', 'view_resource'], internal: false },
  { id: 'project-manager',      name: 'Project Manager',      description: 'Create projects, review recommendations, approve or override assignments, monitor progress.',                  level: 'org',      permissions: ['create_project', 'review_recommendation', 'approve_assignment', 'override_assignment', 'reassign_task', 'escalate', 'view_resource', 'edit_resource'], internal: false },
  { id: 'internal-reviewer',    name: 'Internal Reviewer',    description: 'Review vendor work. Edit outputs. Verify/Not Verify segments. Request rework. Recommend sign-off.',            level: 'org',      permissions: ['review_vendor_work', 'edit_segment', 'verify_segment', 'request_rework', 'recommend_signoff', 'view_resource'], internal: false },
  { id: 'final-validator',      name: 'Final Validator',      description: 'Perform final validation and sign-off. Approve corrections for Cortex / retraining where policy permits.',   level: 'org',      permissions: ['final_validate', 'signoff_output', 'approve_org_brain', 'approve_retraining', 'view_resource'], internal: false },
  { id: 'compliance-reviewer',  name: 'Compliance Reviewer',  description: 'Review outputs against regulatory and compliance policy.',                                                     level: 'org',      permissions: ['compliance_review', 'verify_segment', 'request_rework', 'view_resource'], internal: false },
  { id: 'legal-reviewer',       name: 'Legal Reviewer',       description: 'Review outputs against legal policy.',                                                                         level: 'org',      permissions: ['legal_review', 'verify_segment', 'request_rework', 'view_resource'], internal: false },
  { id: 'vendor-admin',         name: 'Vendor Admin',         description: 'Manage users inside their vendor organisation only. View assigned vendor projects.',                            level: 'vendor',   permissions: ['manage_vendor_users:own', 'view_assigned_projects', 'assign_vendor_user_to_task'], internal: false },
  { id: 'vendor-user',          name: 'Vendor User',          description: 'Work on assigned tasks only. Edit, comment, verify/not verify, submit work.',                                   level: 'vendor',   permissions: ['view_assigned_task', 'edit_assigned_segment', 'comment_assigned_segment', 'verify_assigned_segment', 'submit_assigned_task'], internal: false },
  { id: 'client-reviewer',      name: 'Client Reviewer',      description: 'Client-side reviewer with limited verify and sign-off authority on their organisation\'s outputs.',              level: 'org',      permissions: ['verify_segment', 'client_signoff', 'view_resource'], internal: false },
  { id: 'auditor',              name: 'Auditor',              description: 'Read-only access to audit logs and signed-off records within scope.',                                          level: 'org',      permissions: ['view_audit', 'view_signoff_records', 'view_resource'], internal: false },
  { id: 'read-only-observer',   name: 'Read-Only Observer',   description: 'Read-only access to projects, dashboards, and analytics within scope.',                                        level: 'org',      permissions: ['view_resource'], internal: false },
];

/* ─── Users ──────────────────────────────────────────────────── */

export const USERS = [
  { id: 'alex',    name: 'Alex Chen',        initials: 'AC', email: 'alex.chen@meridian-capital.com',    status: 'online',  lastActive: '2026-03-31T09:15:00Z' },
  { id: 'kenji',   name: 'Kenji Tanaka',     initials: 'KT', email: 'kenji.tanaka@meridian-capital.com', status: 'online',  lastActive: '2026-03-31T08:42:00Z' },
  { id: 'sarah',   name: 'Sarah Jenkins',       initials: 'SJ', email: 'sarah.jenkins@meridian-capital.com',   status: 'online',  lastActive: '2026-03-31T07:30:00Z' },
  { id: 'marcus',  name: 'Marcus Lee',     initials: 'ML', email: 'marcus.lee@meridian-capital.com', status: 'online',  lastActive: '2026-03-30T16:20:00Z' },
  { id: 'thomas',  name: 'Thomas Park',      initials: 'TP', email: 'thomas.park@meridian-capital.com',  status: 'away',    lastActive: '2026-03-30T14:05:00Z' },
  { id: 'priya',   name: 'Priya Patel',      initials: 'PP', email: 'priya.patel@meridian-capital.com',  status: 'offline', lastActive: '2026-03-29T11:00:00Z' },
  { id: 'yuki',    name: 'Yuki Tanaka',    initials: 'YT', email: 'yuki.tanaka@meridian-capital.com',status: 'away',    lastActive: '2026-03-31T06:15:00Z' },
  { id: 'lena',    name: 'Lena Crawford',    initials: 'LC', email: 'lena.crawford@meridian-capital.com', status: 'online', lastActive: '2026-03-31T09:00:00Z' },
  { id: 'james',   name: 'James Liu',        initials: 'JL', email: 'james.liu@meridian-capital.com',   status: 'online',  lastActive: '2026-03-31T08:55:00Z' },
  { id: 'support-bot', name: 'arbitr Support',   initials: 'AR', email: 'support@arbitr.com',            status: 'online',  lastActive: '2026-03-31T09:20:00Z', internal: true },

  /* ─── HITL vendor-side users (live in vendor tenants) ────────── */
  { id: 'hana',    name: 'Hana Ito',         initials: 'HI', email: 'hana.ito@nihon-linguistics.jp',     status: 'online',  lastActive: '2026-03-31T09:00:00Z' },
  { id: 'ren',     name: 'Ren Suzuki',       initials: 'RS', email: 'ren.suzuki@nihon-linguistics.jp',   status: 'away',    lastActive: '2026-03-31T07:10:00Z' },
  { id: 'klaus',   name: 'Klaus Berger',     initials: 'KB', email: 'klaus.berger@bonn-legal.de',        status: 'online',  lastActive: '2026-03-31T08:30:00Z' },
  { id: 'sofia',   name: 'Sofia Romano',     initials: 'SR', email: 'sofia.romano@milano-finance.it',    status: 'offline', lastActive: '2026-03-30T17:45:00Z' },
];

/* ─── Tenant Memberships ─────────────────────────────────────── */

export const MEMBERSHIPS = [
  { userId: 'alex',    tenantId: 'meridian' },
  { userId: 'kenji',   tenantId: 'meridian' },
  { userId: 'sarah',   tenantId: 'meridian' },
  { userId: 'marcus',  tenantId: 'meridian' },
  { userId: 'thomas',  tenantId: 'meridian' },
  { userId: 'priya',   tenantId: 'meridian' },
  { userId: 'yuki',    tenantId: 'meridian' },
  { userId: 'lena',    tenantId: 'meridian' },
  { userId: 'james',   tenantId: 'meridian' },
  { userId: 'support-bot', tenantId: 'meridian' },
  { userId: 'support-bot', tenantId: 'straker' },
];

/* ─── Role Assignments (scoped) ──────────────────────────────── */

export const ROLE_ASSIGNMENTS = [
  // Alex — Tenant Admin (full access to all of Meridian)
  { id: 'ra-1',  userId: 'alex',        tenantId: 'meridian', roleId: 'tenant-admin',     scopeType: 'tenant',     scopeId: 'mc-root',            assignedAt: '2025-06-01T00:00:00Z', assignedBy: 'system' },
  // Kenji — Org Manager for Japan (inherits to Financial Reporting, Compliance, M&A)
  { id: 'ra-3',  userId: 'kenji',       tenantId: 'meridian', roleId: 'org-manager',      scopeType: 'country',    scopeId: 'mc-japan',           assignedAt: '2025-03-01T00:00:00Z', assignedBy: 'alex' },
  // Sarah — Approver for Japan Financial Reporting (narrow scope)
  { id: 'ra-4',  userId: 'sarah',       tenantId: 'meridian', roleId: 'approver',         scopeType: 'department', scopeId: 'mc-japan-finance',   assignedAt: '2025-04-10T00:00:00Z', assignedBy: 'kenji' },
  // Marcus — Org Manager for Germany (inherits to Tax & Audit, Wealth Management)
  { id: 'ra-5',  userId: 'marcus',      tenantId: 'meridian', roleId: 'org-manager',      scopeType: 'country',    scopeId: 'mc-germany',         assignedAt: '2025-05-20T00:00:00Z', assignedBy: 'alex' },
  // Thomas — Viewer at Germany Tax & Audit (narrowest scope)
  { id: 'ra-6',  userId: 'thomas',      tenantId: 'meridian', roleId: 'viewer',           scopeType: 'department', scopeId: 'mc-germany-tax',     assignedAt: '2025-07-01T00:00:00Z', assignedBy: 'marcus' },
  // Priya — Contributor for Germany Wealth Management
  { id: 'ra-7',  userId: 'priya',       tenantId: 'meridian', roleId: 'contributor',      scopeType: 'department', scopeId: 'mc-germany-wealth',  assignedAt: '2025-08-12T00:00:00Z', assignedBy: 'marcus' },
  // Yuki — Approver for Japan Compliance & Regulatory
  { id: 'ra-8',  userId: 'yuki',        tenantId: 'meridian', roleId: 'approver',         scopeType: 'department', scopeId: 'mc-japan-compliance', assignedAt: '2025-09-01T00:00:00Z', assignedBy: 'kenji' },
  // Lena — Org Manager for New Zealand (inherits to Operations, Legal)
  { id: 'ra-9',  userId: 'lena',        tenantId: 'meridian', roleId: 'org-manager',      scopeType: 'country',    scopeId: 'mc-nz',              assignedAt: '2025-10-15T00:00:00Z', assignedBy: 'alex' },
  // James — Contributor for Global Risk
  { id: 'ra-2',  userId: 'james',       tenantId: 'meridian', roleId: 'contributor',      scopeType: 'department', scopeId: 'mc-global-risk',     assignedAt: '2025-09-15T00:00:00Z', assignedBy: 'alex' },
  // Internal support — scoped to entire tenant, time-bounded
  { id: 'ra-10', userId: 'support-bot', tenantId: 'meridian', roleId: 'support-operator', scopeType: 'tenant',     scopeId: 'mc-root',            assignedAt: '2026-03-25T10:00:00Z', assignedBy: 'platform', internal: true, expiresAt: '2026-04-25T10:00:00Z' },
];

/* ─── Audit Log ──────────────────────────────────────────────── */

export const AUDIT_LOG = [
  { id: 'al-1',  timestamp: '2026-03-31T09:20:00Z', actor: 'support-bot', action: 'support.access',    tenantId: 'meridian', scopeId: 'mc-root',            targetUser: null,          roleId: 'support-operator', details: 'Support session initiated for ticket #4821', internal: true },
  { id: 'al-2',  timestamp: '2026-03-31T08:15:00Z', actor: 'kenji',       action: 'resource.accessed', tenantId: 'meridian', scopeId: 'mc-japan-finance',   targetUser: null,          roleId: null,               details: 'Accessed Q3 Earnings Report (JA locale)' },
  { id: 'al-3',  timestamp: '2026-03-30T16:42:00Z', actor: 'alex',        action: 'role.assigned',     tenantId: 'meridian', scopeId: 'mc-germany',         targetUser: 'marcus',      roleId: 'org-manager',      details: 'Assigned Org Manager role at Germany scope' },
  { id: 'al-4',  timestamp: '2026-03-30T14:30:00Z', actor: 'marcus',      action: 'role.assigned',     tenantId: 'meridian', scopeId: 'mc-germany-tax',     targetUser: 'thomas',      roleId: 'viewer',           details: 'Assigned Viewer role at Tax & Audit' },
  { id: 'al-5',  timestamp: '2026-03-29T11:05:00Z', actor: 'kenji',       action: 'member.added',      tenantId: 'meridian', scopeId: 'mc-japan',           targetUser: 'yuki',        roleId: null,               details: 'Added Yuki Tanaka to Japan region' },
  { id: 'al-6',  timestamp: '2026-03-28T09:30:00Z', actor: 'sarah',       action: 'resource.accessed', tenantId: 'meridian', scopeId: 'mc-japan-finance',   targetUser: null,          roleId: null,               details: 'Approved Q3 Investor Presentation (JA)' },
  { id: 'al-7',  timestamp: '2026-03-27T15:20:00Z', actor: 'kenji',       action: 'role.assigned',     tenantId: 'meridian', scopeId: 'mc-japan-finance',   targetUser: 'sarah',       roleId: 'approver',         details: 'Assigned Approver role at Financial Reporting' },
  { id: 'al-8',  timestamp: '2026-03-26T10:00:00Z', actor: 'platform',    action: 'support.access',    tenantId: 'meridian', scopeId: 'mc-root',            targetUser: 'support-bot', roleId: 'support-operator', details: 'Support access granted (expires 2026-04-25)', internal: true },
  { id: 'al-9',  timestamp: '2026-03-25T09:15:00Z', actor: 'lena',        action: 'resource.accessed', tenantId: 'meridian', scopeId: 'mc-nz',              targetUser: null,          roleId: null,               details: 'Created new translation campaign for New Zealand' },
  { id: 'al-10', timestamp: '2026-03-24T14:00:00Z', actor: 'marcus',      action: 'resource.accessed', tenantId: 'meridian', scopeId: 'mc-germany-wealth',  targetUser: null,          roleId: null,               details: 'Submitted DE regulatory filing for review' },
  { id: 'al-11', timestamp: '2026-03-23T11:30:00Z', actor: 'alex',        action: 'role.assigned',     tenantId: 'meridian', scopeId: 'mc-nz',              targetUser: 'lena',        roleId: 'org-manager',      details: 'Assigned Org Manager role at New Zealand' },
  { id: 'al-12', timestamp: '2026-03-22T16:45:00Z', actor: 'alex',        action: 'role.assigned',     tenantId: 'meridian', scopeId: 'mc-global-risk',     targetUser: 'james',       roleId: 'contributor',      details: 'Assigned Contributor role at Global Risk' },
  { id: 'al-13', timestamp: '2026-03-20T08:00:00Z', actor: 'marcus',      action: 'member.added',      tenantId: 'meridian', scopeId: 'mc-germany',         targetUser: 'priya',       roleId: null,               details: 'Added Priya Patel to Germany Wealth Management' },
  { id: 'al-14', timestamp: '2026-03-18T13:00:00Z', actor: 'system',      action: 'role.assigned',     tenantId: 'meridian', scopeId: 'mc-japan-compliance', targetUser: 'yuki',       roleId: 'approver',         details: 'Auto-assigned Approver via onboarding flow' },
  { id: 'al-15', timestamp: '2026-03-15T10:30:00Z', actor: 'support-bot', action: 'resource.accessed', tenantId: 'meridian', scopeId: 'mc-germany-tax',     targetUser: null,          roleId: null,               details: 'Diagnostic access for support ticket #4790', internal: true },
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
