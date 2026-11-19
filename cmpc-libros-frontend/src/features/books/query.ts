import { DEFAULT_LIMIT, PAGE_SIZES } from '../../components/table/paging'
import type { BookFilters, BookListQuery, SortDirection, SortField, SortTerm } from './types'

export const SORT_FIELDS: readonly SortField[] = [
  'title',
  'author',
  'publisher',
  'price',
  'stock',
  'genre',
  'createdAt',
]

export { DEFAULT_LIMIT, PAGE_SIZES } from '../../components/table/paging'

export const DEFAULT_QUERY: BookListQuery = {
  page: 1,
  limit: DEFAULT_LIMIT,
  sort: [],
}

const TEXT_FILTERS = ['title', 'author', 'publisher'] as const

function positiveInt(value: string | null): number | undefined {
  if (!value || !/^\d+$/.test(value)) return undefined
  const n = Number(value)
  return n >= 1 ? n : undefined
}

/** `"price:desc,title"` → términos válidos, sin campos repetidos. */
export function parseSort(value: string | null): SortTerm[] {
  if (!value) return []
  const seen = new Set<SortField>()
  const terms: SortTerm[] = []
  for (const part of value.split(',')) {
    const [field, dir = 'asc'] = part.split(':')
    if (!SORT_FIELDS.includes(field as SortField)) continue
    if (dir !== 'asc' && dir !== 'desc') continue
    if (seen.has(field as SortField)) continue
    seen.add(field as SortField)
    terms.push({ field: field as SortField, direction: dir })
  }
  return terms
}

export function serializeSort(sort: readonly SortTerm[]): string {
  return sort.map((t) => `${t.field}:${t.direction}`).join(',')
}

/** La URL es la fuente de verdad del listado: se valida todo lo que viene en ella. */
export function parseListQuery(params: URLSearchParams): BookListQuery {
  const query: BookListQuery = {
    page: positiveInt(params.get('page')) ?? 1,
    limit: PAGE_SIZES.includes(positiveInt(params.get('limit')) as (typeof PAGE_SIZES)[number])
      ? Number(params.get('limit'))
      : DEFAULT_LIMIT,
    sort: parseSort(params.get('sort')),
  }
  for (const key of TEXT_FILTERS) {
    const value = params.get(key)?.trim()
    if (value) query[key] = value
  }
  const genreId = positiveInt(params.get('genreId'))
  if (genreId) query.genreId = genreId
  if (params.get('available') === 'true') query.available = true
  return query
}

/** Inverso de `parseListQuery`: omite los valores por defecto para una URL limpia. */
export function toSearchParams(query: BookListQuery): URLSearchParams {
  const params = new URLSearchParams()
  for (const key of TEXT_FILTERS) {
    if (query[key]) params.set(key, query[key])
  }
  if (query.genreId) params.set('genreId', String(query.genreId))
  if (query.available) params.set('available', 'true')
  if (query.sort.length) params.set('sort', serializeSort(query.sort))
  if (query.page > 1) params.set('page', String(query.page))
  if (query.limit !== DEFAULT_LIMIT) params.set('limit', String(query.limit))
  return params
}

/** Parámetros para la API (listado y exportación). */
export function toApiParams(
  query: BookFilters & { sort: readonly SortTerm[]; page?: number; limit?: number },
): Record<string, string | number | boolean> {
  const params: Record<string, string | number | boolean> = {}
  for (const key of TEXT_FILTERS) {
    if (query[key]) params[key] = query[key]
  }
  if (query.genreId) params.genreId = query.genreId
  if (query.available) params.available = true
  if (query.sort.length) params.sort = serializeSort(query.sort)
  if (query.page) params.page = query.page
  if (query.limit) params.limit = query.limit
  return params
}

/** Clave de caché estable: misma consulta → misma clave. */
export function listKey(query: BookListQuery): string {
  return toSearchParams({ ...query, page: query.page }).toString() || 'all'
}

export function hasActiveFilters(query: BookFilters): boolean {
  return Boolean(query.title || query.author || query.publisher || query.genreId || query.available)
}

/**
 * Ciclo de orden de una columna: sin orden → asc → desc → sin orden.
 * Las columnas se acumulan (orden multi-campo); la prioridad es el orden de clic.
 */
export function cycleSort(sort: readonly SortTerm[], field: SortField): SortTerm[] {
  const current = sort.find((t) => t.field === field)
  if (!current) return [...sort, { field, direction: 'asc' }]
  if (current.direction === 'asc') {
    return sort.map((t) => (t.field === field ? { field, direction: 'desc' as SortDirection } : t))
  }
  return sort.filter((t) => t.field !== field)
}
