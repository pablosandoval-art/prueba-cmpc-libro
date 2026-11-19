import { DEFAULT_LIMIT, PAGE_SIZES } from '../../components/table/paging'
import { AUDIT_ACTIONS, AUDIT_ENTITIES } from './types'
import type { AuditAction, AuditEntity, AuditListQuery } from './types'

export const DEFAULT_AUDIT_QUERY: AuditListQuery = { page: 1, limit: DEFAULT_LIMIT }

function positiveInt(value: string | null): number | undefined {
  if (!value || !/^\d+$/.test(value)) return undefined
  const n = Number(value)
  return n >= 1 ? n : undefined
}

/** `YYYY-MM-DD` de un día que existe en el calendario (rechaza `2026-02-31`). */
function validDay(value: string | null): string | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined
  const [y, m, d] = value.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const ok = date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d
  return ok ? value : undefined
}

/** La URL es la fuente de verdad del listado: se valida todo lo que viene en ella. */
export function parseAuditQuery(params: URLSearchParams): AuditListQuery {
  const limit = positiveInt(params.get('limit'))
  const query: AuditListQuery = {
    page: positiveInt(params.get('page')) ?? 1,
    limit: PAGE_SIZES.includes(limit as (typeof PAGE_SIZES)[number]) ? (limit as number) : DEFAULT_LIMIT,
  }
  const action = params.get('action')
  if (AUDIT_ACTIONS.includes(action as AuditAction)) query.action = action as AuditAction
  const entity = params.get('entity')
  if (AUDIT_ENTITIES.includes(entity as AuditEntity)) query.entityType = entity as AuditEntity
  const from = validDay(params.get('from'))
  const to = validDay(params.get('to'))
  if (from) query.from = from
  // Un rango invertido no tiene sentido: se descarta el extremo final.
  if (to && (!from || from <= to)) query.to = to
  return query
}

/** Inverso de `parseAuditQuery`: omite los valores por defecto para una URL limpia. */
export function toAuditSearchParams(query: AuditListQuery): URLSearchParams {
  const params = new URLSearchParams()
  if (query.action) params.set('action', query.action)
  if (query.entityType) params.set('entity', query.entityType)
  if (query.from) params.set('from', query.from)
  if (query.to) params.set('to', query.to)
  if (query.page > 1) params.set('page', String(query.page))
  if (query.limit !== DEFAULT_LIMIT) params.set('limit', String(query.limit))
  return params
}

/**
 * Parámetros para la API. Los días se interpretan en la hora local del navegador
 * (de 00:00 a 23:59:59.999) y se envían como instantes ISO 8601 en UTC.
 */
export function toAuditApiParams(query: AuditListQuery): Record<string, string | number> {
  const params: Record<string, string | number> = { page: query.page, limit: query.limit }
  if (query.action) params.action = query.action
  if (query.entityType) params.entityType = query.entityType
  if (query.from) params.from = new Date(`${query.from}T00:00:00`).toISOString()
  if (query.to) params.to = new Date(`${query.to}T23:59:59.999`).toISOString()
  return params
}

/** Clave de caché estable: misma consulta → misma clave. */
export function auditListKey(query: AuditListQuery): string {
  return toAuditSearchParams(query).toString() || 'all'
}

export function hasAuditFilters(query: AuditListQuery): boolean {
  return Boolean(query.action || query.entityType || query.from || query.to)
}
