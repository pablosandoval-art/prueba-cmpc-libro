import { formatDateTime, formatNumber, formatPrice } from '../../lib/format'
import type { AuditAction, AuditEntity, AuditLog, AuditSnapshot } from './types'

export const ACTION_LABELS: Record<AuditAction, string> = {
  CREATE: 'Creación',
  UPDATE: 'Edición',
  DELETE: 'Eliminación',
}

export const ENTITY_LABELS: Record<AuditEntity, string> = {
  Book: 'Libro',
  Author: 'Autor',
  Publisher: 'Editorial',
}

export function entityLabel(type: string): string {
  return ENTITY_LABELS[type as AuditEntity] ?? type
}

/** Campos conocidos, en el orden en que se muestran. Los demás van después, por nombre. */
const FIELD_LABELS: Record<string, string> = {
  title: 'Título',
  name: 'Nombre',
  author: 'Autor',
  publisher: 'Editorial',
  genre: 'Género',
  price: 'Precio',
  stock: 'Disponibilidad',
  imageUrl: 'Portada',
  deletedAt: 'Eliminado el',
}
const FIELD_ORDER = Object.keys(FIELD_LABELS)

/** Datos técnicos que cambian solos o no aportan: no se muestran. */
const HIDDEN_FIELDS = new Set(['id', 'createdAt', 'updatedAt'])
const DATE_FIELDS = new Set(['deletedAt'])

/** Un registro con `id` (autor, editorial, género) se compara y se muestra por su nombre. */
function isNamed(value: unknown): value is { id: unknown; name: string } {
  return typeof value === 'object' && value !== null && 'name' in value && typeof value.name === 'string'
}

export function formatField(key: string, value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (isNamed(value)) return value.name
  if (key === 'price' && typeof value === 'number') return formatPrice(value)
  if (key === 'stock' && typeof value === 'number') return formatNumber(value)
  if (key === 'imageUrl') return 'Con portada'
  if (DATE_FIELDS.has(key) && typeof value === 'string') return formatDateTime(value)
  if (typeof value === 'boolean') return value ? 'Sí' : 'No'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

/** Dos valores son "el mismo" si coinciden (los registros con nombre, por su id). */
function sameValue(a: unknown, b: unknown): boolean {
  if (isNamed(a) && isNamed(b)) return a.id === b.id
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null)
}

function orderedKeys(...snapshots: (AuditSnapshot | null)[]): string[] {
  const keys = new Set<string>()
  for (const snapshot of snapshots) {
    for (const key of Object.keys(snapshot ?? {})) {
      if (!HIDDEN_FIELDS.has(key)) keys.add(key)
    }
  }
  const rank = (key: string) => {
    const i = FIELD_ORDER.indexOf(key)
    return i === -1 ? FIELD_ORDER.length : i
  }
  return [...keys].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))
}

const labelOf = (key: string) => FIELD_LABELS[key] ?? key

export interface FieldRow {
  key: string
  label: string
  before: string
  after: string
}

/** Campos que cambiaron en una edición (antes → después). */
export function changedFields(log: AuditLog): FieldRow[] {
  return orderedKeys(log.before, log.after)
    .filter((key) => !sameValue(log.before?.[key], log.after?.[key]))
    .map((key) => ({
      key,
      label: labelOf(key),
      before: formatField(key, log.before?.[key]),
      after: formatField(key, log.after?.[key]),
    }))
}

/** Valores de un registro completo (creación: lo creado; eliminación: lo que había). */
export function snapshotFields(snapshot: AuditSnapshot | null): { key: string; label: string; value: string }[] {
  return orderedKeys(snapshot)
    .filter((key) => key !== 'deletedAt' || snapshot?.deletedAt != null)
    .map((key) => ({ key, label: labelOf(key), value: formatField(key, snapshot?.[key]) }))
}

/** Nombre legible del registro auditado (título del libro, nombre del autor…). */
export function recordName(log: AuditLog): string {
  for (const snapshot of [log.after, log.before]) {
    const value = snapshot?.title ?? snapshot?.name
    if (typeof value === 'string' && value) return value
  }
  return log.entityId
}

/** Resumen de una línea de lo ocurrido. */
export function summarize(log: AuditLog): string {
  if (log.action === 'CREATE') return 'Registro nuevo'
  if (log.action === 'DELETE') return 'Baja lógica del registro'
  const labels = changedFields(log).map((c) => c.label)
  return labels.length ? labels.join(', ') : 'Sin cambios en campos visibles'
}
