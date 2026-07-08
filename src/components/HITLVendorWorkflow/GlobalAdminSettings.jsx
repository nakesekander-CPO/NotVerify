import { ShieldCheck, Lock, Workflow } from 'lucide-react'
import { ROLES } from '../../data/rbacModel'
import { SectionHeading, Card, MonoLabel, KeyValueRow } from './shared'

const HITL_ROLE_IDS = [
  'arbitr-global-admin', 'org-admin', 'vendor-manager', 'project-manager',
  'internal-reviewer', 'final-validator', 'compliance-reviewer', 'legal-reviewer',
  'vendor-admin', 'vendor-user', 'client-reviewer', 'auditor', 'read-only-observer',
]

export default function GlobalAdminSettings() {
  const hitlRoles = ROLES.filter(r => HITL_ROLE_IDS.includes(r.id))

  return (
    <div>
      <SectionHeading
        title="Global Admin · HITL Vendor Workflow"
        subtitle="arbitr global admin controls. Toggle the module, manage policy templates, set RBAC, and govern retraining feeds."
      />

      <div className="grid grid-cols-2 gap-6 mb-6">
        <Card>
          <div className="flex items-center gap-2">
            <Workflow className="w-4 h-4 text-ocean" />
            <p className="text-[14px] font-semibold text-ink">Module status</p>
          </div>
          <p className="text-[12.5px] text-slate mt-2">HITL Vendor Workflow is <span className="text-teal font-medium">enabled</span> globally. Vendor work is restricted to in-app workspaces. Raw downloads are blocked by default.</p>
          <div className="mt-3">
            <KeyValueRow label="Module" value="HITL Vendor Workflow" />
            <KeyValueRow label="Status" value="Enabled" />
            <KeyValueRow label="Default vendor download policy" value="Blocked (admin opt-in only)" />
            <KeyValueRow label="Default copy/paste policy" value="Restricted on high-security projects" />
            <KeyValueRow label="Audit retention" value="7 years (immutable)" />
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber" />
            <p className="text-[14px] font-semibold text-ink">Retraining governance</p>
          </div>
          <p className="text-[12.5px] text-slate mt-2">Retraining and Cortex updates require approval by a final-validator or arbitr global admin. Unapproved corrections are never used.</p>
          <div className="mt-3">
            <KeyValueRow label="Required approval role" value="final-validator / arbitr-global-admin" />
            <KeyValueRow label="Regression test before promotion" value="Required" />
            <KeyValueRow label="Model version history" value="Retained per agent" />
            <KeyValueRow label="Retraining sources" value="Validated, signed-off only" />
            <KeyValueRow label="Cortex feed" value="Per-project policy" />
          </div>
        </Card>
      </div>

      <Card padding="p-0">
        <div className="px-5 py-3 border-b border-rule flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-teal" />
          <p className="text-[13px] font-semibold text-ink">HITL roles ({hitlRoles.length})</p>
        </div>
        <ul className="px-5 py-3 divide-y divide-rule">
          {hitlRoles.map(r => (
            <li key={r.id} className="py-3">
              <div className="flex items-center justify-between">
                <p className="text-[13px] font-semibold text-ink">{r.name} <span className="text-mist text-[11px] ml-2" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{r.id}</span></p>
                <span className="text-[10.5px] text-mist uppercase tracking-wider" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{r.level}</span>
              </div>
              <p className="text-[12px] text-slate mt-1">{r.description}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {r.permissions.map(p => (
                  <span key={p} className="text-[10.5px] px-1.5 py-0.5 rounded bg-cream border border-rule text-slate" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{p}</span>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
