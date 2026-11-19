import { create } from 'zustand'
import { createInflight, emptyEntry } from '../../../lib/cache'
import type { CacheEntry } from '../../../lib/cache'
import { isCancelledRequest, toApiError } from '../../../lib/http/api-error'
import { useAuthStore } from '../../auth/auth.store'
import type { Paginated } from '../../books/types'
import { auditService } from '../api/audit.service'
import { auditListKey } from '../query'
import type { AuditListQuery, AuditLog } from '../types'

interface AuditState {
  /** Listados por clave de consulta (filtros + página). */
  lists: Record<string, CacheEntry<Paginated<AuditLog>>>
  /**
   * Pide el listado. No hay TTL: la bitácora cambia con cada operación del catálogo, así que
   * siempre se revalida; lo cacheado sólo se muestra mientras llega lo nuevo (stale-while-revalidate).
   */
  fetchList: (query: AuditListQuery) => Promise<void>
  reset: () => void
}

const inflight = createInflight<void>()
/** Sólo importa el último listado pedido: los anteriores se cancelan. */
let controller: AbortController | null = null
let controllerKey: string | null = null

export const useAuditStore = create<AuditState>()((set) => {
  const patch = (key: string, entry: Partial<CacheEntry<Paginated<AuditLog>>>) =>
    set((s) => ({ lists: { ...s.lists, [key]: { ...(s.lists[key] ?? emptyEntry()), ...entry } } }))

  return {
    lists: {},

    fetchList(query) {
      const key = auditListKey(query)
      if (controller && controllerKey !== key) controller.abort()

      return inflight.run(key, async () => {
        const current = new AbortController()
        controller = current
        controllerKey = key
        patch(key, { loading: true, error: undefined })
        try {
          const data = await auditService.list(query, current.signal)
          patch(key, { data, loading: false, fetchedAt: Date.now() })
        } catch (error) {
          patch(key, {
            loading: false,
            // Una consulta reemplazada por otra no es un error para el usuario.
            error: current.signal.aborted || isCancelledRequest(error) ? undefined : toApiError(error).message,
          })
        }
      })
    },

    reset() {
      controller?.abort()
      controller = null
      controllerKey = null
      inflight.clear()
      set({ lists: {} })
    },
  }
})

// Al cerrar sesión se descarta la caché: no debe sobrevivir a otro usuario.
useAuthStore.subscribe((state, prev) => {
  if (prev.user && !state.user) useAuditStore.getState().reset()
})
