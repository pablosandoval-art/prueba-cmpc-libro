import { create } from 'zustand'
import { LIST_TTL_MS, createInflight, emptyEntry, isFresh } from '../../../lib/cache'
import type { CacheEntry } from '../../../lib/cache'
import { toApiError } from '../../../lib/http/api-error'
import { useAuthStore } from '../../auth/auth.store'
import { catalogService } from '../api/catalog.service'
import type { CatalogKind } from '../api/catalog.service'
import { normalizeName } from '../catalog'
import type { CatalogItem } from '../types'

/** Clave de caché: catálogo + texto buscado (sin distinguir mayúsculas). */
export function catalogKey(kind: CatalogKind, term: string): string {
  return `${kind}|${normalizeName(term).toLowerCase()}`
}

interface CatalogState {
  /** Resultados de búsqueda cacheados por catálogo y texto. */
  searches: Record<string, CacheEntry<CatalogItem[]>>
  search: (kind: CatalogKind, term: string) => Promise<void>
  create: (kind: CatalogKind, name: string) => Promise<CatalogItem>
  reset: () => void
}

const inflight = createInflight<void>()

export const useCatalogStore = create<CatalogState>()((set, get) => {
  const patch = (key: string, change: Partial<CacheEntry<CatalogItem[]>>) =>
    set((s) => ({
      searches: { ...s.searches, [key]: { ...(s.searches[key] ?? emptyEntry()), ...change } },
    }))

  return {
    searches: {},

    search(kind, term) {
      const key = catalogKey(kind, term)
      if (isFresh(get().searches[key], LIST_TTL_MS)) return Promise.resolve()
      return inflight.run(key, async () => {
        // Stale-while-revalidate: se conservan los resultados previos mientras carga.
        patch(key, { loading: true, error: undefined })
        try {
          const data = await catalogService.search(kind, normalizeName(term))
          patch(key, { data, loading: false, fetchedAt: Date.now() })
        } catch (error) {
          patch(key, { loading: false, error: toApiError(error).message })
        }
      })
    },

    async create(kind, name) {
      const item = await catalogService.create(kind, normalizeName(name))
      // Un registro nuevo puede aparecer en cualquier búsqueda de ese catálogo.
      set((s) => ({
        searches: Object.fromEntries(
          Object.entries(s.searches).map(([key, entry]) => [
            key,
            key.startsWith(`${kind}|`) ? { ...entry, fetchedAt: 0 } : entry,
          ]),
        ),
      }))
      return item
    },

    reset() {
      inflight.clear()
      set({ searches: {} })
    },
  }
})

useAuthStore.subscribe((state, prev) => {
  if (prev.user && !state.user) useCatalogStore.getState().reset()
})
