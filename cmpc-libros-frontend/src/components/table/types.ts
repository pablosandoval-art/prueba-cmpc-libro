export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

/** Respuesta paginada de la API: `{ data, meta }`. */
export interface Paginated<T> {
  data: T[]
  meta: PaginationMeta
}
