import { VENDORS, RETRAINING_CANDIDATES, SIGNOFF_RECORDS, ERROR_CATEGORIES, HITL_PROJECTS } from '../../data/hitlVendorWorkflow'
import { SectionHeading, Card, MonoLabel, ScoreBar } from './shared'

export default function VendorAnalytics() {
  const ranked = [...VENDORS].sort((a, b) => (b.qualityScore || 0) - (a.qualityScore || 0))
  const errorTally = ERROR_CATEGORIES.map(cat => ({ cat, count: RETRAINING_CANDIDATES.filter(c => c.errorCategory === cat).length })).filter(x => x.count > 0)

  return (
    <div>
      <SectionHeading
        title="Vendor Analytics"
        subtitle="Vendor performance, project health, and the HITL learning loop. All metrics update from validated and signed-off corrections only — unapproved work never moves the needle."
      />

      <div className="grid grid-cols-2 gap-6 mb-6">
        <Card padding="p-0">
          <div className="px-5 py-3 border-b border-rule">
            <MonoLabel>Vendor performance ranking</MonoLabel>
          </div>
          <ul className="px-5 py-3 space-y-3">
            {ranked.map(v => (
              <li key={v.id}>
                <div className="flex items-center justify-between text-[12.5px]">
                  <span className="font-medium text-ink truncate max-w-[60%]">{v.name}</span>
                  <span className="text-slate" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>Q {v.qualityScore} · OT {v.onTimeDeliveryScore}% · RW {(v.reworkRate * 100).toFixed(1)}%</span>
                </div>
                <ScoreBar value={v.qualityScore || 0} color="teal" />
              </li>
            ))}
          </ul>
        </Card>

        <Card padding="p-0">
          <div className="px-5 py-3 border-b border-rule">
            <MonoLabel>HITL learning — error category mix</MonoLabel>
          </div>
          <div className="px-5 py-3">
            {errorTally.length === 0 ? (
              <p className="text-[12.5px] text-mist">No retraining candidates yet. Sign off a project to populate this view.</p>
            ) : (
              <ul className="space-y-2.5">
                {errorTally.map(({ cat, count }) => (
                  <li key={cat}>
                    <div className="flex items-center justify-between text-[12.5px]">
                      <span className="text-ink capitalize">{cat.replaceAll('-', ' ')}</span>
                      <span className="font-mono text-slate" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{count}</span>
                    </div>
                    <ScoreBar value={count * 10} color="amber" />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Stat label="Sign-offs to date" value={SIGNOFF_RECORDS.length} />
        <Stat label="Retraining candidates" value={RETRAINING_CANDIDATES.length} />
        <Stat label="Approved corrections" value={RETRAINING_CANDIDATES.filter(c => c.status === 'approved').length} />
      </div>

      <Card padding="p-0" className="mt-6">
        <div className="px-5 py-3 border-b border-rule"><MonoLabel>Project health</MonoLabel></div>
        <table className="w-full text-[12.5px]">
          <thead className="bg-cream border-b border-rule">
            <tr><Th>Project</Th><Th>Status</Th><Th>Words</Th><Th>Deadline</Th><Th>Risk</Th><Th>Confidence</Th></tr>
          </thead>
          <tbody>
            {HITL_PROJECTS.map(p => (
              <tr key={p.id} className="border-b border-rule last:border-b-0">
                <Td>{p.name}</Td>
                <Td><span className="px-2 py-0.5 rounded-full bg-pale text-ocean text-[10.5px]">{p.status}</span></Td>
                <Td mono>{p.estimatedWordCount.toLocaleString()}</Td>
                <Td mono>{new Date(p.requirements.deadline).toLocaleDateString()}</Td>
                <Td>{p.riskAssessment.riskLevel}</Td>
                <Td mono>{(p.riskAssessment.confidenceScore * 100).toFixed(0)}%</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div className="bg-white border border-rule rounded-md p-4">
      <p className="text-[10.5px] uppercase tracking-wider text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{label}</p>
      <p className="text-[26px] font-semibold text-ink mt-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{value}</p>
    </div>
  )
}

function Th({ children }) { return <th className="text-left text-mist uppercase tracking-wider text-[10.5px] font-medium px-4 py-2" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{children}</th> }
function Td({ children, mono }) { return <td className="px-4 py-2 text-ink" style={mono ? { fontFamily: "'IBM Plex Mono', monospace" } : undefined}>{children}</td> }
