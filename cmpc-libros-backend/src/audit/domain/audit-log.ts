export const AUDIT_ACTIONS = ['CREATE', 'UPDATE', 'DELETE'] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

/** Representación JSON serializable de una entidad en un momento dado. */
export type AuditSnapshot = Record<string, unknown>;

export interface NewAuditLog {
  entityType: string;
  entityId: string;
  action: AuditAction;
  userId: string;
  before: AuditSnapshot | null;
  after: AuditSnapshot | null;
}

export interface AuditLog extends NewAuditLog {
  id: string;
  createdAt: Date;
  user: { id: string; email: string; name: string };
}

export interface AuditLogFilters {
  entityType?: string;
  entityId?: string;
  userId?: string;
  action?: AuditAction;
  /** Desde este instante (inclusive). */
  from?: Date;
  /** Hasta este instante (inclusive). */
  to?: Date;
}

export interface AuditLogQuery {
  filters: AuditLogFilters;
  page: number;
  limit: number;
}
