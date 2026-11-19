import { create } from 'zustand'
import { LIST_TTL_MS, createInflight, emptyEntry, isFresh } from '../../../lib/cache'
import type { CacheEntry } from '../../../lib/cache'
import { downloadBlob, exportFilename } from '../../../lib/download'
import { isCancelledRequest, toApiError } from '../../../lib/http/api-error'
import { useAuthStore } from '../../auth/auth.store'
import { booksService } from '../api/books.service'
import { listKey } from '../query'
import type { Book, BookFilters, BookInput, BookListQuery, Paginated, SortTerm } from '../types'

interface BooksState {
  /** Listados cacheados por clave de consulta (filtros + orden + página). */
  lists: Record<string, CacheEntry<Paginated<Book>>>
  /** Detalles cacheados por id. */
  details: Record<string, CacheEntry<Book>>
  exporting: boolean

  fetchList: (query: BookListQuery, options?: { force?: boolean }) => Promise<void>
  fetchBook: (id: string, options?: { force?: boolean }) => Promise<void>
  createBook: (input: BookInput) => Promise<Book>
  updateBook: (id: string, input: Partial<BookInput>) => Promise<Book>
  uploadImage: (id: string, file: File) => Promise<Book>
  deleteBook: (id: string) => Promise<void>
  exportCsv: (query: BookFilters & { sort: SortTerm[] }) => Promise<void>
  invalidateLists: () => void
  reset: () => void
}

const listInflight = createInflight<void>()
const detailInflight = createInflight<void>()
/** Sólo importa el último listado pedido: los anteriores se cancelan. */
let listController: AbortController | null = null
let listControllerKey: string | null = null

const initialState = { lists: {}, details: {}, exporting: false }

export const useBooksStore = create<BooksState>()((set, get) => {
  const patchList = (key: string, patch: Partial<CacheEntry<Paginated<Book>>>) =>
    set((s) => ({
      lists: { ...s.lists, [key]: { ...(s.lists[key] ?? emptyEntry()), ...patch } },
    }))

  const patchDetail = (id: string, patch: Partial<CacheEntry<Book>>) =>
    set((s) => ({
      details: {
        ...s.details,
        [id]: { ...(s.details[id] ?? emptyEntry()), ...patch },
      },
    }))

  /** Un libro modificado actualiza su detalle y marca los listados como vencidos. */
  const storeUpdated = (book: Book) => {
    patchDetail(book.id, { data: book, fetchedAt: Date.now(), error: undefined })
    get().invalidateLists()
  }

  return {
    ...initialState,

    fetchList(query, options = {}) {
      const key = listKey(query)
      if (!options.force && isFresh(get().lists[key], LIST_TTL_MS)) {
        return Promise.resolve()
      }
      if (listController && listControllerKey !== key) listController.abort()

      return listInflight.run(key, async () => {
        const controller = new AbortController()
        listController = controller
        listControllerKey = key
        // Stale-while-revalidate: se conservan los datos previos mientras carga.
        patchList(key, { loading: true, error: undefined })
        try {
          const data = await booksService.list(query, controller.signal)
          patchList(key, { data, loading: false, fetchedAt: Date.now() })
        } catch (error) {
          patchList(key, {
            loading: false,
            // Una búsqueda reemplazada por otra no es un error para el usuario.
            error: controller.signal.aborted || isCancelledRequest(error) ? undefined : toApiError(error).message,
          })
        }
      })
    },

    fetchBook(id, options = {}) {
      if (!options.force && isFresh(get().details[id], LIST_TTL_MS)) {
        return Promise.resolve()
      }
      return detailInflight.run(id, async () => {
        patchDetail(id, { loading: true, error: undefined })
        try {
          const data = await booksService.get(id)
          patchDetail(id, { data, loading: false, fetchedAt: Date.now() })
        } catch (error) {
          patchDetail(id, { loading: false, error: toApiError(error).message })
        }
      })
    },

    async createBook(input) {
      const book = await booksService.create(input)
      storeUpdated(book)
      return book
    },

    async updateBook(id, input) {
      const book = await booksService.update(id, input)
      storeUpdated(book)
      return book
    },

    async uploadImage(id, file) {
      const book = await booksService.uploadImage(id, file)
      storeUpdated(book)
      return book
    },

    async deleteBook(id) {
      await booksService.remove(id)
      set((s) => {
        // Se quita de inmediato de los listados en caché para no mostrarlo mientras se refrescan.
        const lists = Object.fromEntries(
          Object.entries(s.lists).map(([key, entry]) => {
            if (!entry.data?.data.some((b) => b.id === id)) {
              return [key, { ...entry, fetchedAt: 0 }]
            }
            const data = entry.data.data.filter((b) => b.id !== id)
            const total = Math.max(0, entry.data.meta.total - 1)
            return [
              key,
              {
                ...entry,
                fetchedAt: 0,
                data: {
                  data,
                  meta: {
                    ...entry.data.meta,
                    total,
                    totalPages: Math.ceil(total / entry.data.meta.limit),
                  },
                },
              },
            ]
          }),
        )
        const details = { ...s.details }
        delete details[id]
        return { lists, details }
      })
    },

    async exportCsv(query) {
      set({ exporting: true })
      try {
        const blob = await booksService.exportCsv(query)
        downloadBlob(blob, exportFilename())
      } finally {
        set({ exporting: false })
      }
    },

    invalidateLists() {
      set((s) => ({
        lists: Object.fromEntries(Object.entries(s.lists).map(([k, e]) => [k, { ...e, fetchedAt: 0 }])),
      }))
    },

    reset() {
      listController?.abort()
      listController = null
      listControllerKey = null
      listInflight.clear()
      detailInflight.clear()
      set(initialState)
    },
  }
})

// Al cerrar sesión se descarta la caché: no debe sobrevivir a otro usuario.
useAuthStore.subscribe((state, prev) => {
  if (prev.user && !state.user) useBooksStore.getState().reset()
})
