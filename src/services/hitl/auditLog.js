/**
 * HITL Audit Log service
 *
 * Append-only event log. Every critical HITL action (vendor selection,
 * assignment, segment decision, sign-off, retraining approval, RBAC
 * change, restricted-action attempt) flows through `appendAuditEvent`.
 *
 * The audit array lives in src/data/hitlVendorWorkflow.js (HITL_AUDIT_LOG).
 * This module just enforces the shape and provides query helpers.
 */

import { HITL_AUDIT_LOG, createAuditEvent } from '../../data/hitlVendorWorkflow';

export function appendAuditEvent(event) {
  if (!event || !event.eventType) {
    throw new Error('audit: eventType is required');
  }
  if (!event.actorId) {
    throw new Error('audit: actorId is required');
  }
  const record = createAuditEvent(event);
  HITL_AUDIT_LOG.push(record);
  return record;
}

export function listAuditEvents({ projectId, vendorId, actorId, eventType, since, limit = 200 } = {}) {
  let out = HITL_AUDIT_LOG;
  if (projectId) out = out.filter(e => e.projectId === projectId);
  if (vendorId) out = out.filter(e => e.vendorId === vendorId);
  if (actorId) out = out.filter(e => e.actorId === actorId);
  if (eventType) out = out.filter(e => e.eventType === eventType);
  if (since) out = out.filter(e => e.timestamp >= since);
  // newest first
  return [...out].sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1)).slice(0, limit);
}
