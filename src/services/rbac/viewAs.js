/**
 * View-as — the demo's acting identity.
 *
 * One module-level current principal, subscribed to by the Header, the
 * admin surfaces, and the HITL workspace, so every panel re-renders
 * through the engine when the viewer changes. Until this existed the
 * demo could only ever be experienced as the tenant admin — the first
 * question a buyer asks ("what does a Viewer actually see?") had no
 * answer.
 */

import { useCallback, useEffect, useState } from 'react'
import { USERS } from '../../data/rbacModel'

/** The switchable cast (ruled in the alignment spec, Part 3.1). */
export const VIEW_AS_IDS = ['alex', 'kenji', 'thomas', 'yuki', 'support-bot']

let _current = 'alex'
const _subs = new Set()

export function currentViewAs() { return _current }

export function setViewAs(userId) {
  if (!VIEW_AS_IDS.includes(userId)) return
  _current = userId
  _subs.forEach(fn => fn(userId))
}

/** Subscribe a component to the acting identity. */
export function useViewAs() {
  const [, setT] = useState(0)
  const refresh = useCallback(() => setT(t => t + 1), [])
  useEffect(() => {
    _subs.add(refresh)
    return () => { _subs.delete(refresh) }
  }, [refresh])
  return [_current, setViewAs]
}

export function viewAsUser() {
  return USERS.find(u => u.id === _current) || null
}
