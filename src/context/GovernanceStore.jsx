import { createContext, useContext, useState, useMemo, useCallback } from 'react'
import { getUserRoles } from '../services/hitl/rbac'
import { appendAuditEvent } from '../services/hitl/auditLog'
import { DEFAULT_THRESHOLDS } from '../components/HITLVendorWorkflow/governance/gates'

const GovernanceContext = createContext(null)

export function useGovernance() {
  const ctx = useContext(GovernanceContext)
  if (!ctx) throw new Error('useGovernance must be used within <GovernanceProvider>')
  return ctx
}

export function GovernanceProvider({ currentUserId, children }) {
  const initialRole = getUserRoles(currentUserId)[0]?.id || 'internal-reviewer'
  const [currentRole, setCurrentRoleState] = useState(initialRole)
  const [systemMode, setSystemModeState] = useState('supervised') // 'autonomous' | 'supervised' | 'paused'
  const [manualOverride, setManualOverrideState] = useState(true)
  const [thresholds, setThresholds] = useState({ project: { ...DEFAULT_THRESHOLDS }, domains: {} })

  // Safe audit append (never throws into render).
  const record = useCallback((event) => {
    try { appendAuditEvent({ actorId: currentUserId, actorRole: currentRole, ...event }) } catch { /* demo: swallow */ }
  }, [currentUserId, currentRole])

  const setCurrentRole = useCallback((roleId) => {
    try {
      appendAuditEvent({
        actorId: currentUserId, actorRole: roleId, eventType: 'rbac.view_as',
        reason: `Viewing as ${roleId}`, beforeValue: currentRole, afterValue: roleId,
      })
    } catch { /* swallow */ }
    setCurrentRoleState(roleId)
  }, [currentUserId, currentRole])

  const setSystemMode = useCallback((mode) => {
    record({ eventType: 'mode.change', reason: `System mode → ${mode}`, beforeValue: systemMode, afterValue: mode })
    setSystemModeState(mode)
  }, [record, systemMode])

  const setManualOverride = useCallback((on) => {
    record({ eventType: 'mode.manual_override', reason: `Manual override ${on ? 'ON' : 'OFF'}`, beforeValue: manualOverride, afterValue: on })
    setManualOverrideState(on)
  }, [record, manualOverride])

  const value = useMemo(() => ({
    currentUserId, currentRole, setCurrentRole,
    systemMode, setSystemMode, manualOverride, setManualOverride,
    thresholds, setThresholds, record,
  }), [currentUserId, currentRole, setCurrentRole, systemMode, setSystemMode, manualOverride, setManualOverride, thresholds, record])

  return <GovernanceContext.Provider value={value}>{children}</GovernanceContext.Provider>
}
