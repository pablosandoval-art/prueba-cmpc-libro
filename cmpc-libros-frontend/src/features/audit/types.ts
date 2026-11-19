export const AUDIT_ACTIONS = ['CREATE', 'UPDATE', 'DELETE'] as const
export type AuditAction = (typeof AUDIT_ACTIONS)[number]

/** Entidades que hoy se auditan (la API acepta cualquier texto, pero éstas son las que existen). */
export const AUDIT_ENTITIES = ['Book', 'Author', 'Publisher'] as const
export type AuditEntity = (typeof AUDIT_ENTITIES)[number]

/** Estado de una entidad en un momento dado, tal como lo guarda la API. */
export type AuditSnapshot = Record<string, unknown>

export interface AuditUser {
  id: string
  email: string
  name: string
}

export interface AuditLog {
  id: string
  entityType: string
  entityId: string
  action: AuditAction
  user: AuditUser
  /** Estado previo (`null` al crear). */
  before: AuditSnapshot | null
  /** Estado posterior. */
  after: AuditSnapshot | null
  createdAt: string
}

export interface AuditListQuery {
  page: number
  limit: number
  action?: AuditAction
  entityType?: AuditEntity
  /** Día (`YYYY-MM-DD`, hora local) desde el que se listan operaciones, inclusive. */
  from?: string
  /** Día (`YYYY-MM-DD`, hora local) hasta el que se listan operaciones, inclusive. */
  to?: string
}
