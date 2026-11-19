import { create } from 'zustand'
import { createInflight } from '../../../lib/cache'
import { toApiError } from '../../../lib/http/api-error'
import { useAuthStore } from '../../auth/auth.store'
import { genresService } from '../api/books.service'
import type { Genre } from '../types'

interface GenresState {
  genres: Genre[] | null
  loading: boolean
  error: string | null
  /** El catálogo de géneros casi no cambia: se pide una vez por sesión. */
  fetchGenres: () => Promise<void>
  reset: () => void
}

const inflight = createInflight<void>()

export const useGenresStore = create<GenresState>()((set, get) => ({
  genres: null,
  loading: false,
  error: null,

  fetchGenres() {
    if (get().genres) return Promise.resolve()
    return inflight.run('genres', async () => {
      set({ loading: true, error: null })
      try {
        set({ genres: await genresService.list(), loading: false })
      } catch (error) {
        set({ loading: false, error: toApiError(error).message })
      }
    })
  },

  reset() {
    inflight.clear()
    set({ genres: null, loading: false, error: null })
  },
}))

useAuthStore.subscribe((state, prev) => {
  if (prev.user && !state.user) useGenresStore.getState().reset()
})
