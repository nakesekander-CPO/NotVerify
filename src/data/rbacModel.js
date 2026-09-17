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

/*
 * Four-level structure (ruled 2026-09-17):
 *   Global Company → Country Business → Business Unit → Department/Team.
 * Global Risk & Compliance deliberately hangs off the root — group
 * functions sit at company level, and the tree must tolerate mixed depth.
 */
export const ORG_NODES = [
  // Meridian Capital — primary tenant (Global Company)
  { id: 'mc-root',            tenantId: 'meridian', parentId: null,              name: 'Meridian Capital Group', type: 'tenant' },
  // Japan (Country Business)
  { id: 'mc-japan',           tenantId: 'meridian', parentId: 'mc-root',         name: 'Meridian Japan',        type: 'country' },
  { id: 'mc-japan-securities',tenantId: 'meridian', parentId: 'mc-japan',        name: 'Securities',            type: 'business-unit' },
  { id: 'mc-japan-finance',   tenantId: 'meridian', parentId: 'mc-japan-securities', name: 'Financial Reporting', type: 'department' },
  { id: 'mc-japan-compliance',tenantId: 'meridian', parentId: 'mc-japan-securities', name: 'Compliance & Regulatory', type: 'department' },
  { id: 'mc-japan-ib',        tenantId: 'meridian', parentId: 'mc-japan',        name: 'Investment Banking',    type: 'business-unit' },
  // Information barrier (ruled 2026-09-17): NOBODY inherits through it —
  // not the tenant admin, not the group auditor. Access below requires a
  // direct grant at or under this node; a crossing is an explicit,
  // expiring, audited grant.
  { id: 'mc-japan-ma',        tenantId: 'meridian', parentId: 'mc-japan-ib',     name: 'M&A Advisory',          type: 'team', barrier: true, barrierReason: 'M&A information barrier — deal-sensitive information (MNPI). Inherited access stops here.' },
  // Germany (Country Business)
  { id: 'mc-germany',         tenantId: 'meridian', parentId: 'mc-root',         name: 'Meridian Germany',      type: 'country' },
  { id: 'mc-germany-pb',      tenantId: 'meridian', parentId: 'mc-germany',      name: 'Private Banking',       type: 'business-unit' },
  { id: 'mc-germany-tax',     tenantId: 'meridian', parentId: 'mc-germany-pb',   name: 'Tax & Audit',           type: 'department' },
  { id: 'mc-germany-wealth',  tenantId: 'meridian', parentId: 'mc-germany-pb',   name: 'Wealth Management',     type: 'department' },
  // New Zealand (Country Business)
  { id: 'mc-nz',              tenantId: 'meridian', parentId: 'mc-root',         name: 'Meridian New Zealand',  type: 'country' },
  { id: 'mc-nz-operations',   tenantId: 'meridian', parentId: 'mc-nz',           name: 'Operations',            type: 'business-unit' },
  { id: 'mc-nz-ops',          tenantId: 'meridian', parentId: 'mc-nz-operations', name: 'Client Operations',    type: 'department' },
  { id: 'mc-nz-legal',        tenantId: 'meridian', parentId: 'mc-nz-operations', name: 'Legal',                type: 'department' },
  // Global shared — group function at company level (deliberate exception)
  { id: 'mc-global-risk',     tenantId: 'meridian', parentId: 'mc-root',         name: 'Global Risk & Compliance', type: 'department' },
  // arbitr — secondary tenant (minimal)
  { id: 'straker-root',       tenantId: 'straker', parentId: null,               name: 'arbitr',  type: 'tenant' },
  { id: 'straker-apac',       tenantId: 'straker', parentId: 'straker-root',     name: 'APAC',                  type: 'region' },
  { id: 'straker-emea',       tenantId: 'straker', parentId: 'straker-root',     name: 'EMEA',                  type: 'region' },
];

/* ─── Node type styling ──────────────────────────────────────── */

export const NODE_TYPE_STYLES = {
  tenant:      { bg: 'bg-gray-100',    text: 'text-gray-700',    border: 'border-gray-200',    label: 'Tenant' },
  region:      { bg: 'bg-purple-50',   text: 'text-purple-600',  border: 'border-purple-200',  label: 'Region' },
  country:     { bg: 'bg-blue-50',     text: 'text-blue-600',    border: 'border-blue-200',    label: 'Country Business' },
  'business-unit': { bg: 'bg-sky-50',  text: 'text-sky-700',     border: 'border-sky-200',     label: 'Business Unit' },
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

  /* ─── HITL Vendor Workflow roles ─────────────────────────────────
     `hidden: true` keeps a role out of the Organization & Access view
     (Roles tab and role pickers) until the vendor workflow is part of
     the demo (ruled 2026-09-17). The roles stay defined so the vendor
     module and its services keep working; compliance-reviewer,
     legal-reviewer, and auditor stay visible — they hold assignments. */
  { id: 'arbitr-global-admin',  name: 'arbitr Global Admin',  description: 'Platform owner. Manages global vendor registry, pools, selection policies, RBAC, and retraining governance.', level: 'platform', permissions: ['*'], internal: true, hidden: true },
  { id: 'org-admin',            name: 'Org Admin',            description: 'Manage organisation-level vendor pools, selection policies, and members.',                                    level: 'org',      permissions: ['manage_members', 'manage_structure', 'manage_workflows', 'manage_vendor_pool:org', 'manage_selection_policy:org', 'reassign_task', 'view_audit', 'view_resource', 'create_resource', 'edit_resource'], internal: false, hidden: true },
  { id: 'vendor-manager',       name: 'Vendor Manager',       description: 'Create and edit vendor profiles within scope. Review vendor performance. Approve assignments where permitted.', level: 'org',    permissions: ['manage_vendor:scope', 'review_vendor_performance', 'approve_assignment', 'suspend_vendor:scope', 'reassign_task', 'view_resource'], internal: false, hidden: true },
  { id: 'project-manager',      name: 'Project Manager',      description: 'Create projects, review recommendations, approve or override assignments, monitor progress.',                  level: 'org',      permissions: ['create_project', 'review_recommendation', 'approve_assignment', 'override_assignment', 'reassign_task', 'escalate', 'view_resource', 'edit_resource'], internal: false, hidden: true },
  { id: 'internal-reviewer',    name: 'Internal Reviewer',    description: 'Review vendor work. Edit outputs. Verify/Not Verify segments. Request rework. Recommend sign-off.',            level: 'org',      permissions: ['review_vendor_work', 'edit_segment', 'verify_segment', 'request_rework', 'recommend_signoff', 'view_resource'], internal: false, hidden: true },
  { id: 'final-validator',      name: 'Final Validator',      description: 'Perform final validation and sign-off. Approve corrections for Cortex / retraining where policy permits.',   level: 'org',      permissions: ['final_validate', 'signoff_output', 'approve_org_brain', 'approve_retraining', 'view_resource'], internal: false, hidden: true },
  { id: 'compliance-reviewer',  name: 'Compliance Reviewer',  description: 'Review outputs against regulatory and compliance policy.',                                                     level: 'org',      permissions: ['compliance_review', 'verify_segment', 'request_rework', 'view_resource'], internal: false },
  { id: 'legal-reviewer',       name: 'Legal Reviewer',       description: 'Review outputs against legal policy.',                                                                         level: 'org',      permissions: ['legal_review', 'verify_segment', 'request_rework', 'view_resource'], internal: false },
  { id: 'vendor-admin',         name: 'Vendor Admin',         description: 'Manage users inside their vendor organisation only. View assigned vendor projects.',                            level: 'vendor',   permissions: ['manage_vendor_users:own', 'view_assigned_projects', 'assign_vendor_user_to_task'], internal: false, hidden: true },
  { id: 'vendor-user',          name: 'Vendor User',          description: 'Work on assigned tasks only. Edit, comment, verify/not verify, submit work.',                                   level: 'vendor',   permissions: ['view_assigned_task', 'edit_assigned_segment', 'comment_assigned_segment', 'verify_assigned_segment', 'submit_assigned_task'], internal: false, hidden: true },
  { id: 'client-reviewer',      name: 'Client Reviewer',      description: 'Client-side reviewer with limited verify and sign-off authority on their organisation\'s outputs.',              level: 'org',      permissions: ['verify_segment', 'client_signoff', 'view_resource'], internal: false, hidden: true },
  { id: 'auditor',              name: 'Auditor',              description: 'Read-only access to audit logs and signed-off records within scope.',                                          level: 'org',      permissions: ['view_audit', 'view_signoff_records', 'view_resource'], internal: false },
  { id: 'read-only-observer',   name: 'Read-Only Observer',   description: 'Read-only access to projects, dashboards, and analytics within scope.',                                        level: 'org',      permissions: ['view_resource'], internal: false, hidden: true },
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

/* ─── Grants ─────────────────────────────────────────────────────
   Access is a grant, not a role (RBAC alignment, 2026-09-17).
   Shape: { id, principal:{type,id}, tenantId, roleId,
            scope:{nodeId,type}, conditions:{ expiresAt, justification,
            ticketRef, assignedOnly, residency, classification },
            assignedBy, assignedAt, lastUsedAt }
   Principal types: user | group | agent | vendor-org | support-session.
   Conditions are evaluated on EVERY decision by the engine
   (src/services/rbac/engine.js) — nothing else may read this table
   to make an access decision. `effect: 'deny'` marks an explicit
   deny grant, which beats every allow. */

export const GRANTS = [
  // Alex — Tenant Admin (full access to all of Meridian)
  { id: 'ra-1',  principal: { type: 'user', id: 'alex' },   tenantId: 'meridian', roleId: 'tenant-admin', scope: { nodeId: 'mc-root', type: 'tenant' },                 conditions: {}, assignedBy: 'system', assignedAt: '2025-06-01T00:00:00Z', lastUsedAt: '2026-09-16T17:40:00Z' },
  // Kenji — Org Manager for Meridian Japan
  { id: 'ra-3',  principal: { type: 'user', id: 'kenji' },  tenantId: 'meridian', roleId: 'org-manager', scope: { nodeId: 'mc-japan', type: 'country' },                conditions: {}, assignedBy: 'alex', assignedAt: '2025-03-01T00:00:00Z', lastUsedAt: '2026-09-15T08:42:00Z' },
  // Sarah — Approver for the Japan Securities BU (sign-off authority lives
  // at business-unit altitude; inherits to Financial Reporting + Compliance)
  { id: 'ra-4',  principal: { type: 'user', id: 'sarah' },  tenantId: 'meridian', roleId: 'approver', scope: { nodeId: 'mc-japan-securities', type: 'business-unit' },  conditions: {}, assignedBy: 'kenji', assignedAt: '2025-04-10T00:00:00Z', lastUsedAt: '2026-09-16T07:30:00Z' },
  // Marcus — Org Manager for Meridian Germany
  { id: 'ra-5',  principal: { type: 'user', id: 'marcus' }, tenantId: 'meridian', roleId: 'org-manager', scope: { nodeId: 'mc-germany', type: 'country' },              conditions: {}, assignedBy: 'alex', assignedAt: '2025-05-20T00:00:00Z', lastUsedAt: '2026-09-14T16:20:00Z' },
  // Thomas — Viewer at Germany Tax & Audit (narrowest scope; stale — unused 90+ days)
  { id: 'ra-6',  principal: { type: 'user', id: 'thomas' }, tenantId: 'meridian', roleId: 'viewer', scope: { nodeId: 'mc-germany-tax', type: 'department' },            conditions: {}, assignedBy: 'marcus', assignedAt: '2025-07-01T00:00:00Z', lastUsedAt: '2026-05-02T09:00:00Z' },
  // Priya — Contributor for Germany Wealth Management (never used — review candidate)
  { id: 'ra-7',  principal: { type: 'user', id: 'priya' },  tenantId: 'meridian', roleId: 'contributor', scope: { nodeId: 'mc-germany-wealth', type: 'department' },    conditions: {}, assignedBy: 'marcus', assignedAt: '2025-08-12T00:00:00Z', lastUsedAt: null },
  // Yuki — Approver for the Japan Investment Banking BU (covers M&A Advisory;
  // one BU's approver has no reach into the sibling Securities BU)
  { id: 'ra-8',  principal: { type: 'user', id: 'yuki' },   tenantId: 'meridian', roleId: 'approver', scope: { nodeId: 'mc-japan-ib', type: 'business-unit' },          conditions: {}, assignedBy: 'kenji', assignedAt: '2025-09-01T00:00:00Z', lastUsedAt: '2026-09-10T06:15:00Z' },
  // Lena — Org Manager for New Zealand
  { id: 'ra-9',  principal: { type: 'user', id: 'lena' },   tenantId: 'meridian', roleId: 'org-manager', scope: { nodeId: 'mc-nz', type: 'country' },                   conditions: {}, assignedBy: 'alex', assignedAt: '2025-10-15T00:00:00Z', lastUsedAt: '2026-09-16T09:00:00Z' },
  // James — Contributor for Global Risk (stale — unused 90+ days)
  { id: 'ra-2',  principal: { type: 'user', id: 'james' },  tenantId: 'meridian', roleId: 'contributor', scope: { nodeId: 'mc-global-risk', type: 'department' },       conditions: {}, assignedBy: 'alex', assignedAt: '2025-09-15T00:00:00Z', lastUsedAt: '2026-06-01T11:30:00Z' },
  // Yuki — Compliance Reviewer at Japan Compliance & Regulatory (second grant:
  // department-level review duty alongside the BU approver seat)
  { id: 'ra-11', principal: { type: 'user', id: 'yuki' },   tenantId: 'meridian', roleId: 'compliance-reviewer', scope: { nodeId: 'mc-japan-compliance', type: 'department' }, conditions: {}, assignedBy: 'kenji', assignedAt: '2026-01-12T00:00:00Z', lastUsedAt: '2026-09-12T14:00:00Z' },
  // Lena — Legal Reviewer at New Zealand Legal (second grant)
  { id: 'ra-12', principal: { type: 'user', id: 'lena' },   tenantId: 'meridian', roleId: 'legal-reviewer', scope: { nodeId: 'mc-nz-legal', type: 'department' },       conditions: {}, assignedBy: 'alex', assignedAt: '2026-02-03T00:00:00Z', lastUsedAt: '2026-08-28T10:10:00Z' },
  // James — Auditor across the whole group (read-only oversight from the top)
  { id: 'ra-13', principal: { type: 'user', id: 'james' },  tenantId: 'meridian', roleId: 'auditor', scope: { nodeId: 'mc-root', type: 'tenant' },                      conditions: {}, assignedBy: 'alex', assignedAt: '2026-02-03T00:00:00Z', lastUsedAt: '2026-09-15T08:55:00Z' },
  // Yuki — deal-team approver DIRECTLY at M&A Advisory. The barrier means
  // even her Investment Banking BU grant (one level up) stops at the wall;
  // deal-team membership is always an explicit grant.
  { id: 'ra-15', principal: { type: 'user', id: 'yuki' },   tenantId: 'meridian', roleId: 'approver', scope: { nodeId: 'mc-japan-ma', type: 'team' },              conditions: { justification: 'Deal team — Project Keystone' }, assignedBy: 'kenji', assignedAt: '2026-08-20T00:00:00Z', lastUsedAt: '2026-09-11T09:20:00Z' },
  // James — auditor CROSSING into M&A Advisory: explicit, expiring,
  // justified. His group-wide auditor grant (ra-13) does not cross the
  // barrier; this direct grant is the deliberate, audited exception.
  { id: 'ra-14', principal: { type: 'user', id: 'james' },  tenantId: 'meridian', roleId: 'auditor', scope: { nodeId: 'mc-japan-ma', type: 'team' },               conditions: { expiresAt: '2026-10-15T00:00:00Z', justification: 'Quarterly conflicts audit — Project Keystone', ticketRef: 'AUD-2026-114' }, assignedBy: 'alex', assignedAt: '2026-09-10T00:00:00Z', lastUsedAt: '2026-09-15T08:55:00Z' },
  // Internal support — scoped to entire tenant, time-bounded. EXPIRED
  // 2026-04-25: the engine denies it and drops it from member lists.
  { id: 'ra-10', principal: { type: 'user', id: 'support-bot' }, tenantId: 'meridian', roleId: 'support-operator', scope: { nodeId: 'mc-root', type: 'tenant' },        conditions: { expiresAt: '2026-04-25T10:00:00Z', justification: 'Support session for ticket #4821', ticketRef: 'TCK-4821' }, assignedBy: 'platform', assignedAt: '2026-03-25T10:00:00Z', lastUsedAt: '2026-04-20T15:00:00Z', internal: true },
];

/* ─── Audit Log ──────────────────────────────────────────────── */

export const AUDIT_LOG = [
  { id: 'al-1',  timestamp: '2026-03-31T09:20:00Z', actor: 'support-bot', action: 'support.access',    tenantId: 'meridian', scopeId: 'mc-root',            targetUser: null,          roleId: 'support-operator', details: 'Support session initiated for ticket #4821', internal: true },
  { id: 'al-2',  timestamp: '2026-03-31T08:15:00Z', actor: 'kenji',       action: 'resource.accessed', tenantId: 'meridian', scopeId: 'mc-japan-finance',   targetUser: null,          roleId: null,               details: 'Accessed Q3 Earnings Report (JA locale)' },
  { id: 'al-3',  timestamp: '2026-03-30T16:42:00Z', actor: 'alex',        action: 'role.assigned',     tenantId: 'meridian', scopeId: 'mc-germany',         targetUser: 'marcus',      roleId: 'org-manager',      details: 'Assigned Org Manager role at Germany scope' },
  { id: 'al-4',  timestamp: '2026-03-30T14:30:00Z', actor: 'marcus',      action: 'role.assigned',     tenantId: 'meridian', scopeId: 'mc-germany-tax',     targetUser: 'thomas',      roleId: 'viewer',           details: 'Assigned Viewer role at Tax & Audit' },
  { id: 'al-5',  timestamp: '2026-03-29T11:05:00Z', actor: 'kenji',       action: 'member.added',      tenantId: 'meridian', scopeId: 'mc-japan',           targetUser: 'yuki',        roleId: null,               details: 'Added Yuki Tanaka to Meridian Japan' },
  { id: 'al-6',  timestamp: '2026-03-28T09:30:00Z', actor: 'sarah',       action: 'resource.accessed', tenantId: 'meridian', scopeId: 'mc-japan-finance',   targetUser: null,          roleId: null,               details: 'Approved Q3 Investor Presentation (JA)' },
  { id: 'al-7',  timestamp: '2026-03-27T15:20:00Z', actor: 'kenji',       action: 'role.assigned',     tenantId: 'meridian', scopeId: 'mc-japan-securities', targetUser: 'sarah',      roleId: 'approver',         details: 'Assigned Approver role at Securities business unit' },
  { id: 'al-8',  timestamp: '2026-03-26T10:00:00Z', actor: 'platform',    action: 'support.access',    tenantId: 'meridian', scopeId: 'mc-root',            targetUser: 'support-bot', roleId: 'support-operator', details: 'Support access granted (expires 2026-04-25)', internal: true },
  { id: 'al-9',  timestamp: '2026-03-25T09:15:00Z', actor: 'lena',        action: 'resource.accessed', tenantId: 'meridian', scopeId: 'mc-nz',              targetUser: null,          roleId: null,               details: 'Created new translation campaign for New Zealand' },
  { id: 'al-10', timestamp: '2026-03-24T14:00:00Z', actor: 'marcus',      action: 'resource.accessed', tenantId: 'meridian', scopeId: 'mc-germany-wealth',  targetUser: null,          roleId: null,               details: 'Submitted DE regulatory filing for review' },
  { id: 'al-11', timestamp: '2026-03-23T11:30:00Z', actor: 'alex',        action: 'role.assigned',     tenantId: 'meridian', scopeId: 'mc-nz',              targetUser: 'lena',        roleId: 'org-manager',      details: 'Assigned Org Manager role at New Zealand' },
  { id: 'al-12', timestamp: '2026-03-22T16:45:00Z', actor: 'alex',        action: 'role.assigned',     tenantId: 'meridian', scopeId: 'mc-global-risk',     targetUser: 'james',       roleId: 'contributor',      details: 'Assigned Contributor role at Global Risk & Compliance' },
  { id: 'al-13', timestamp: '2026-03-20T08:00:00Z', actor: 'marcus',      action: 'member.added',      tenantId: 'meridian', scopeId: 'mc-germany',         targetUser: 'priya',       roleId: null,               details: 'Added Priya Patel to Germany Wealth Management' },
  { id: 'al-14', timestamp: '2026-03-18T13:00:00Z', actor: 'kenji',       action: 'role.assigned',     tenantId: 'meridian', scopeId: 'mc-japan-ib',        targetUser: 'yuki',        roleId: 'approver',         details: 'Assigned Approver role at Investment Banking business unit' },
  { id: 'al-15', timestamp: '2026-03-15T10:30:00Z', actor: 'support-bot', action: 'resource.accessed', tenantId: 'meridian', scopeId: 'mc-germany-tax',     targetUser: null,          roleId: null,               details: 'Diagnostic access for support ticket #4790', internal: true },
  { id: 'al-19', timestamp: '2026-09-10T10:00:00Z', actor: 'alex',        action: 'role.assigned',     tenantId: 'meridian', scopeId: 'mc-japan-ma',        targetUser: 'james',       roleId: 'auditor',          details: 'Barrier crossing into M&A Advisory — quarterly conflicts audit, expires 2026-10-15 (AUD-2026-114)' },
  { id: 'al-20', timestamp: '2026-08-20T09:00:00Z', actor: 'kenji',       action: 'role.assigned',     tenantId: 'meridian', scopeId: 'mc-japan-ma',        targetUser: 'yuki',        roleId: 'approver',         details: 'Deal-team grant at M&A Advisory — Project Keystone (direct; inherited access stops at the barrier)' },
  { id: 'al-16', timestamp: '2026-02-03T09:40:00Z', actor: 'alex',        action: 'role.assigned',     tenantId: 'meridian', scopeId: 'mc-root',            targetUser: 'james',       roleId: 'auditor',          details: 'Assigned Auditor role across Meridian Capital Group' },
  { id: 'al-17', timestamp: '2026-02-03T09:35:00Z', actor: 'alex',        action: 'role.assigned',     tenantId: 'meridian', scopeId: 'mc-nz-legal',        targetUser: 'lena',        roleId: 'legal-reviewer',   details: 'Assigned Legal Reviewer role at New Zealand Legal' },
  { id: 'al-18', timestamp: '2026-01-12T14:10:00Z', actor: 'kenji',       action: 'role.assigned',     tenantId: 'meridian', scopeId: 'mc-japan-compliance', targetUser: 'yuki',       roleId: 'compliance-reviewer', details: 'Assigned Compliance Reviewer role at Compliance & Regulatory' },
];

/* ─── Action type styling ────────────────────────────────────── */

export const ACTION_STYLES = {
  'role.assigned':     { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Role Assigned' },
  'role.removed':      { bg: 'bg-red-50',     text: 'text-red-700',     label: 'Role Removed' },
  'member.added':      { bg: 'bg-blue-50',    text: 'text-blue-700',    label: 'Member Added' },
  'member.removed':    { bg: 'bg-red-50',     text: 'text-red-700',     label: 'Member Removed' },
  'support.access':    { bg: 'bg-purple-50',  text: 'text-purple-700',  label: 'Support Access' },
  'resource.accessed': { bg: 'bg-gray-50',    text: 'text-gray-600',    label: 'Resource Accessed' },
  'access.allowed':    { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Access Allowed' },
  'access.denied':     { bg: 'bg-red-50',     text: 'text-red-700',     label: 'Access Denied' },
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

/*
 * Access decisions live in ONE place: src/services/rbac/engine.js (`can`).
 * The scope-aware-but-display-only `checkAccess`, the scope-blind service
 * path, and the per-component member-list re-implementations were all
 * removed in the 2026-09 RBAC alignment. Only pure tree utilities remain
 * here.
 */
