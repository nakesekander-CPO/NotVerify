import { useState } from 'react'
import { Shield, Lock, Check, X, Download, Edit2, ChevronDown } from 'lucide-react'
import { downloadCsv } from '../../utils/demoFiles'

const DEFAULT_AGENTS = [
  { id: 'JP-FIN-3', name: 'J-GAAP Specialist', version: 'v4.2' },
  { id: 'MER-DT-1', name: "Meridian Capital Digital Twin", version: 'v2.1' },
  { id: 'BV-SENT-1', name: 'Brand Voice Sentry', version: 'v1.8' },
  { id: 'COMP-MON', name: 'Compliance Monitor', version: 'v3.0' },
]

const MOCK_AUDIT_LOG = [
  { ts: '2026-03-30 14:22', by: 'Alex Kim', byType: 'user', tool: 'Slack', op: 'Send message to #deliveries', status: 'success' },
  { ts: '2026-03-30 14:22', by: 'JP-FIN-3', byType: 'agent', tool: 'Jira', op: 'Create ticket COMP-114', status: 'success' },
  { ts: '2026-03-30 11:05', by: 'COMP-MON', byType: 'agent', tool: 'Slack', op: 'Send DM to @priya-mehta', status: 'success' },
  { ts: '2026-03-29 16:48', by: 'Alex Kim', byType: 'user', tool: 'Google Drive', op: 'Upload Q3_Earnings_Final.docx', status: 'success' },
  { ts: '2026-03-29 16:48', by: 'Workflow', byType: 'workflow', tool: 'Confluence', op: 'Create page: J-GAAP Term Update', status: 'success' },
  { ts: '2026-03-28 09:33', by: 'BV-SENT-1', byType: 'agent', tool: 'Slack', op: 'Send message to #brand-alerts', status: 'failed' },
  { ts: '2026-03-27 15:10', by: 'Alex Kim', byType: 'user', tool: 'Salesforce', op: 'Update opportunity: Meridian Q3', status: 'success' },
  { ts: '2026-03-26 10:00', by: 'Workflow', byType: 'workflow', tool: 'Slack', op: 'Send message to #deliveries', status: 'success' },
]

function buildDefaultPermissions(connectedIntegrations) {
  const perms = {}
  DEFAULT_AGENTS.forEach(agent => {
    perms[agent.id] = {}
    connectedIntegrations.forEach(conn => {
      // Compliance Monitor only gets Jira + Slack by default; Brand Voice only Slack
      if (agent.id === 'COMP-MON') {
        perms[agent.id][conn.id] = conn.id === 'jira' || conn.id === 'slack'
      } else if (agent.id === 'BV-SENT-1') {
        perms[agent.id][conn.id] = conn.id === 'slack'
      } else {
        perms[agent.id][conn.id] = true
      }
    })
  })
  return perms
}

export default function SecurityPermissions({ connectedIntegrations }) {
  const [permissions, setPermissions] = useState(() => buildDefaultPermissions(connectedIntegrations))
  const [requireApproval, setRequireApproval] = useState(false)
  const [scopeEditing, setScopeEditing] = useState(null)
  const [scopeDraft, setScopeDraft] = useState('')
  const [scopes, setScopes] = useState(() => {
    const s = {}
    connectedIntegrations.forEach(c => { s[c.id] = '' })
    return s
  })

  const togglePerm = (agentId, connId) => {
    setPermissions(prev => ({
      ...prev,
      [agentId]: { ...prev[agentId], [connId]: !prev[agentId]?.[connId] },
    }))
  }

  if (connectedIntegrations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Shield className="w-8 h-8 text-gray-200" />
        <p className="text-[13px] text-gray-500 font-medium">No integrations connected</p>
        <p className="text-[12px] text-gray-400">Connect tools to manage agent permissions and view the audit log.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">

      {/* ── Per-agent permissions ── */}
      <section className="border border-black/[0.08] rounded-xl overflow-hidden bg-white">
        <div className="px-5 py-4 border-b border-black/[0.06] flex items-center gap-2">
          <Lock className="w-4 h-4 text-gray-400" />
          <h3 className="text-[13px] font-semibold text-gray-900">Per-Agent Permissions</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-black/[0.06]">
                <th className="text-left px-5 py-3 text-gray-400 font-medium w-44">Agent</th>
                {connectedIntegrations.map(conn => (
                  <th key={conn.id} className="px-3 py-3 text-center text-gray-500 font-medium whitespace-nowrap">
                    <div className="flex flex-col items-center gap-1">
                      <div
                        className="w-6 h-6 rounded flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                        style={{ backgroundColor: conn.color }}
                      >
                        {conn.letter}
                      </div>
                      <span className="text-[10px] text-gray-400 max-w-[56px] leading-tight">{conn.name}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DEFAULT_AGENTS.map((agent, i) => (
                <tr key={agent.id} className={i % 2 === 0 ? 'bg-gray-50/40' : ''}>
                  <td className="px-5 py-3">
                    <p className="text-[12px] font-medium text-gray-700">{agent.name}</p>
                    <p className="text-[10px] text-gray-400 font-mono">{agent.id}</p>
                  </td>
                  {connectedIntegrations.map(conn => {
                    const allowed = permissions[agent.id]?.[conn.id] ?? true
                    return (
                      <td key={conn.id} className="px-3 py-3 text-center">
                        <button
                          onClick={() => togglePerm(agent.id, conn.id)}
                          className={`w-6 h-6 rounded-full flex items-center justify-center mx-auto transition-colors cursor-pointer ${
                            allowed
                              ? 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200'
                              : 'bg-gray-100 text-gray-300 hover:bg-gray-200'
                          }`}
                          aria-label={`${allowed ? 'Revoke' : 'Grant'} ${agent.name} access to ${conn.name}`}
                        >
                          {allowed ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                        </button>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Approval gates ── */}
      <section className="border border-black/[0.08] rounded-xl p-5 bg-white">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Shield className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-[13px] font-semibold text-gray-900">Approval Gates</p>
              <p className="text-[12px] text-gray-500 mt-0.5 leading-relaxed">
                Require human confirmation before any integration action is executed. Agents will pause and prompt a reviewer.
              </p>
            </div>
          </div>
          <button
            onClick={() => setRequireApproval(!requireApproval)}
            className={`relative w-10 h-5.5 rounded-full transition-colors shrink-0 cursor-pointer focus:outline-none mt-0.5 ${
              requireApproval ? 'bg-[#3D16FA]' : 'bg-gray-200'
            }`}
            role="switch"
            aria-checked={requireApproval}
          >
            <span
              className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                requireApproval ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>
        {requireApproval && (
          <div className="mt-3 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-[12px] text-amber-700">
            All Merge-powered actions will show a confirm dialog before executing.
          </div>
        )}
      </section>

      {/* ── Data scoping ── */}
      <section className="border border-black/[0.08] rounded-xl overflow-hidden bg-white">
        <div className="px-5 py-4 border-b border-black/[0.06] flex items-center gap-2">
          <Lock className="w-4 h-4 text-gray-400" />
          <h3 className="text-[13px] font-semibold text-gray-900">Data Scoping</h3>
          <p className="text-[12px] text-gray-400 ml-1">— Least-privilege access paths per connector</p>
        </div>
        <div className="divide-y divide-black/[0.06]">
          {connectedIntegrations.map(conn => (
            <div key={conn.id} className="flex items-center gap-3 px-5 py-3">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[11px] font-bold shrink-0"
                style={{ backgroundColor: conn.color }}
              >
                {conn.letter}
              </div>
              <p className="text-[12px] font-medium text-gray-700 w-32 shrink-0">{conn.name}</p>
              {scopeEditing === conn.id ? (
                <div className="flex items-center gap-2 flex-1">
                  <input
                    value={scopeDraft}
                    onChange={e => setScopeDraft(e.target.value)}
                    placeholder="e.g. /Deliverables/Meridian-Capital"
                    className="flex-1 text-[12px] text-gray-700 border border-black/[0.12] rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#3D16FA]/40"
                  />
                  <button onClick={() => { setScopes(s => ({ ...s, [conn.id]: scopeDraft })); setScopeEditing(null) }} className="p-1.5 rounded-lg text-[#3D16FA] hover:bg-[#3D16FA]/10 cursor-pointer">
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setScopeEditing(null)} className="p-1.5 rounded-lg text-gray-400 hover:bg-black/[0.04] cursor-pointer">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-[12px] text-gray-400 font-mono flex-1">
                    {scopes[conn.id] || 'Full access — click Edit to scope'}
                  </span>
                  <button
                    onClick={() => { setScopeDraft(scopes[conn.id] || ''); setScopeEditing(conn.id) }}
                    className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-gray-500 hover:bg-black/[0.04] cursor-pointer border border-black/[0.06]"
                  >
                    <Edit2 className="w-3 h-3" />
                    Edit
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── Audit Log ── */}
      <section className="border border-black/[0.08] rounded-xl overflow-hidden bg-white">
        <div className="px-5 py-4 border-b border-black/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-gray-400" />
            <h3 className="text-[13px] font-semibold text-gray-900">Audit Log</h3>
          </div>
          <button onClick={() => downloadCsv('arbitr-integration-audit.csv', MOCK_AUDIT_LOG)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] text-gray-500 hover:bg-black/[0.04] border border-black/[0.06] cursor-pointer">
            <Download className="w-3 h-3" />
            Export CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-black/[0.06] bg-gray-50/50">
                <th className="text-left px-5 py-2.5 text-gray-400 font-medium">Timestamp</th>
                <th className="text-left px-4 py-2.5 text-gray-400 font-medium">Triggered by</th>
                <th className="text-left px-4 py-2.5 text-gray-400 font-medium">Tool</th>
                <th className="text-left px-4 py-2.5 text-gray-400 font-medium">Operation</th>
                <th className="text-left px-4 py-2.5 text-gray-400 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.04]">
              {MOCK_AUDIT_LOG.map((row, i) => (
                <tr key={i} className="hover:bg-black/[0.01]">
                  <td className="px-5 py-2.5 text-gray-400 font-mono whitespace-nowrap">{row.ts}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        row.byType === 'agent' ? 'bg-straker-50 text-straker-600'
                        : row.byType === 'workflow' ? 'bg-violet-50 text-violet-600'
                        : 'bg-gray-100 text-gray-500'
                      }`}>
                        {row.byType}
                      </span>
                      <span className="text-gray-700">{row.by}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-gray-700">{row.tool}</td>
                  <td className="px-4 py-2.5 text-gray-500 max-w-[200px] truncate">{row.op}</td>
                  <td className="px-4 py-2.5">
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                      row.status === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'
                    }`}>
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
