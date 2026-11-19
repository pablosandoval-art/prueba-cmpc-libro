import { apiClient } from '../../../lib/http/api-client'
import { call } from '../../../lib/http/call'
import type { CatalogItem } from '../types'

/** Catálogos de nombres únicos que se eligen (o crean) desde el formulario. */
export type CatalogKind = 'authors' | 'publishers'

export const CATALOG_SEARCH_LIMIT = 20

export const catalogService = {
  /** Búsqueda parcial por nombre (sin distinguir mayúsculas), ordenada alfabéticamente. */
  search(kind: CatalogKind, search: string, signal?: AbortSignal): Promise<CatalogItem[]> {
    return call(() =>
      apiClient.get<CatalogItem[]>(`/${kind}`, {
        params: { ...(search ? { search } : {}), limit: CATALOG_SEARCH_LIMIT },
        signal,
      }),
    )
  },

  /** Crea el registro; si ya existía un nombre equivalente, devuelve el existente. */
  create(kind: CatalogKind, name: string): Promise<CatalogItem> {
    return call(() => apiClient.post<CatalogItem>(`/${kind}`, { name }))
  },
}
