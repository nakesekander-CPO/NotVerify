import { useMemo } from 'react'
import { ArrowRight, Workflow, Bell, AlertTriangle, CheckCircle2 } from 'lucide-react'
import {
  VENDORS, VENDOR_POOLS, HITL_PROJECTS, VENDOR_ASSIGNMENTS,
  HITL_NOTIFICATIONS, RETRAINING_CANDIDATES, SIGNOFF_RECORDS, HITL_AUDIT_LOG,
} from '../../data/hitlVendorWorkflow'
import { SectionHeading, Card, StatusBadge, MonoLabel, KeyValueRow, PrimaryButton } from './shared'

export default function WorkflowOverview({ navigate }) {
  const stats = useMemo(() => ({
    vendors: VENDORS.filter(v => v.status === 'approved').length,
    pools: VENDOR_POOLS.length,
    activeProjects: HITL_PROJECTS.filter(p => !['signed-off','published','archived','completed'].includes(p.status)).length,
    awaitingApproval: VENDOR_ASSIGNMENTS.filter(a => a.status === 'awaiting-approval').length,
    pendingRetraining: RETRAINING_CANDIDATES.filter(c => c.status === 'pending').length,
    signedOff: SIGNOFF_RECORDS.length,
  }), [])

  const unreadNotifications = HITL_NOTIFICATIONS.filter(n => !n.read)
  const recentAudit = [...HITL_AUDIT_LOG].sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1)).slice(0, 6)

  return (
    <div>
      <SectionHeading
        title="HITL Workflow Overview"
        subtitle="Governed human-in-the-loop control plane. Every recommendation, edit, and sign-off is auditable, explainable, and RBAC-scoped. Sage and the workflow agents monitor risk, deadlines, and quality continuously."
      />

      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard label="Approved vendors" value={stats.vendors} hint={`${stats.pools} pools configured`} onClick={() => navigate('vendors')} />
        <StatCard label="Active projects" value={stats.activeProjects} hint={`${stats.awaitingApproval} awaiting approval`} onClick={() => navigate('projects')} />
        <StatCard label="Retraining candidates" value={stats.pendingRetraining} hint={`${stats.signedOff} sign-offs to date`} onClick={() => navigate('retraining')} />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card padding="p-0">
          <div className="flex items-center justify-between px-5 py-4 border-b border-rule">
            <div>
              <MonoLabel>Pipeline</MonoLabel>
              <p className="text-[15px] font-semibold text-ink mt-1">Upload → Extract → Review → Publish</p>
            </div>
            <Workflow className="w-4 h-4 text-ocean" />
          </div>
          <div className="px-5 py-4">
            {HITL_PROJECTS.map(p => (
              <div key={p.id} className="flex items-center justify-between py-3 border-b border-rule last:border-b-0">
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-ink truncate">{p.name}</p>
                  <p className="text-[11px] text-mist mt-0.5">
                    {p.requirements.domain} · {p.requirements.sourceLanguage} → {p.requirements.targetLanguages.join(',')} · due {new Date(p.requirements.deadline).toLocaleDateString()}
                  </p>
                </div>
                <StatusBadge status={p.status} />
              </div>
            ))}
          </div>
        </Card>

        <Card padding="p-0">
          <div className="flex items-center justify-between px-5 py-4 border-b border-rule">
            <div>
              <MonoLabel>Notifications & escalations</MonoLabel>
              <p className="text-[15px] font-semibold text-ink mt-1">Sage is watching {stats.activeProjects} projects</p>
            </div>
            <Bell className="w-4 h-4 text-amber" />
          </div>
          <ul className="px-5 py-3">
            {unreadNotifications.length === 0 && <li className="text-[12px] text-mist">No unread notifications.</li>}
            {unreadNotifications.map(n => (
              <li key={n.id} className="py-2 border-b border-rule last:border-b-0 flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-amber mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[12.5px] text-ink leading-snug">{n.text}</p>
                  <p className="text-[10.5px] text-mist mt-0.5" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{n.type} · {new Date(n.timestamp).toLocaleString()}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-6 mt-6">
        <Card>
          <MonoLabel>Sage's recommendations</MonoLabel>
          <ul className="mt-3 space-y-2">
            <SageRow text="Approve Bonn Legal for BaFin filing (compliance-first policy passed; manual approval required)." action={() => navigate('recommendation')} />
            <SageRow text="3 segments in Q3 JA earnings flagged below 75% confidence — route to internal-reviewer for revalidation." action={() => navigate('workspace')} />
            <SageRow text="Nihon Linguistics is over capacity for new work this week (94% utilised). Hold further auto-assignments." action={() => navigate('vendors')} />
          </ul>
        </Card>
        <Card padding="p-0">
          <div className="flex items-center justify-between px-5 py-4 border-b border-rule">
            <MonoLabel>Recent audit trail</MonoLabel>
            <button onClick={() => navigate('audit')} className="text-[11px] text-ocean hover:text-ocean-deep cursor-pointer flex items-center gap-1">View full log <ArrowRight className="w-3 h-3" /></button>
          </div>
          <ul className="px-5 py-3 text-[12px]">
            {recentAudit.map(e => (
              <li key={e.id} className="flex items-start gap-2 py-1.5 border-b border-rule last:border-b-0">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-ink"><span className="font-medium">{e.actorId}</span> · {e.eventType}</p>
                  <p className="text-mist text-[10.5px]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{new Date(e.timestamp).toLocaleString()}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  )
}

function StatCard({ label, value, hint, onClick }) {
  return (
    <button onClick={onClick} className="text-left bg-white border border-rule rounded-lg p-5 hover:border-ocean/30 transition-colors cursor-pointer">
      <MonoLabel className="!text-mist">{label}</MonoLabel>
      <p className="text-[34px] font-semibold text-ink leading-none mt-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{value}</p>
      <p className="text-[12px] text-slate mt-2">{hint}</p>
    </button>
  )
}

function SageRow({ text, action }) {
  return (
    <li className="flex items-start gap-3 p-3 rounded-md bg-pale/40 border border-pale">
      <span className="text-[11px] font-mono uppercase tracking-wider text-ocean mt-0.5">Sage</span>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] text-ink leading-snug">{text}</p>
      </div>
      <button onClick={action} className="text-[11px] text-ocean hover:text-ocean-deep cursor-pointer">Open →</button>
    </li>
  )
}
