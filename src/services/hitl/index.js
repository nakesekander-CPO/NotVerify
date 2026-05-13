/**
 * HITL service barrel — convenient single-import entry point for the
 * service layer. Components should import service functions through
 * this module so the underlying file layout can move without breaking
 * call sites.
 */

export * from './rbac';
export * from './auditLog';
export * from './selectionEngine';
export * from './assignment';
export * from './review';
export * from './signOff';
export * from './retrainingGate';
export * from './taskAssignment';
export * from './pedigree';
export * from './cockpit';
