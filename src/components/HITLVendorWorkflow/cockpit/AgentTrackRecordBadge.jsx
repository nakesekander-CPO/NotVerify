/**
 * AgentTrackRecordBadge — small badge under each agent card showing
 * the agent's historical override rate and false-positive rate in
 * this domain over a 90-day window.
 */

import { useMemo } from 'react'
import { agentTrackRecord } from '../../../services/hitl/cockpit'

export default function AgentTrackRecordBadge({ agentId, domain }) {
  const tr = useMemo(() => agentTrackRecord(agentId, domain), [agentId, domain])
  if (!tr || tr.appearances === 0) {
    return (
      <span className="text-[10px] text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
        no prior signal
      </span>
    )
  }
  const overridePct = ((tr.overrideRate ?? 0) * 100).toFixed(0)
  const fpPct       = ((tr.fpRate ?? 0)       * 100).toFixed(0)
  const tone = (tr.overrideRate ?? 0) > 0.3 ? 'text-[#996800]' : 'text-mist'
  return (
    <span className={`text-[10px] ${tone}`} title={`${tr.appearances} appearances in last 90 days · ${domain || 'all domains'}`} style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
      OVERRIDE {overridePct}% · FP {fpPct}%
    </span>
  )
}
