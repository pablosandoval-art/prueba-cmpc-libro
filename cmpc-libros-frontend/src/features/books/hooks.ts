import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { emptyEntry } from '../../lib/cache'
import type { CatalogKind } from './api/catalog.service'
import { listKey, parseListQuery, toSearchParams } from './query'
import { useBooksStore } from './store/books.store'
import { catalogKey, useCatalogStore } from './store/catalog.store'
import { useGenresStore } from './store/genres.store'
import type { BookListQuery } from './types'

/** Devuelve `value` sólo después de `delay` ms sin cambios (búsqueda en tiempo real). */
export function useDebouncedValue<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

/**
 * Consulta del listado sincronizada con la URL (fuente de verdad).
 * `update` cambia filtros/orden/página; cambiar un filtro vuelve a la página 1.
 */
export function useBookListQuery() {
  const [params, setParams] = useSearchParams()
  const search = params.toString()
  const query = useMemo(() => parseListQuery(new URLSearchParams(search)), [search])

  const update = useCallback(
    (patch: Partial<BookListQuery>) => {
      setParams(
        (current) => {
          const prev = parseListQuery(current)
          const resetsPage = Object.keys(patch).some((k) => k !== 'page')
          const next: BookListQuery = {
            ...prev,
            ...(resetsPage ? { page: 1 } : {}),
            ...patch,
          }
          return toSearchParams(next)
        },
        // Escribir la búsqueda no debe llenar el historial; paginar sí.
        { replace: !('page' in patch) },
      )
    },
    [setParams],
  )

  return { query, update }
}

/** Listado cacheado: dispara la carga cuando cambia la consulta. */
export function useBooksList(query: BookListQuery) {
  const key = listKey(query)
  const entry = useBooksStore((s) => s.lists[key]) ?? emptyEntry()
  const fetchList = useBooksStore((s) => s.fetchList)
  // Crear, editar o eliminar desde el modal vence los listados (fetchedAt = 0) mientras el
  // catálogo sigue montado detrás: entonces se vuelve a pedir el que se está viendo.
  const invalidated = !!entry.data && entry.fetchedAt === 0

  useEffect(() => {
    void fetchList(query)
    // `key` resume `query`: evita recargas por identidad de objeto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, fetchList, invalidated])

  const refresh = useCallback(
    () => fetchList(query, { force: true }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key, fetchList],
  )

  return { ...entry, refresh }
}

export function useBook(id: string | undefined) {
  const entry = useBooksStore((s) => (id ? s.details[id] : undefined)) ?? emptyEntry()
  const fetchBook = useBooksStore((s) => s.fetchBook)
  useEffect(() => {
    if (id) void fetchBook(id)
  }, [id, fetchBook])
  return entry
}

export function useGenres() {
  const genres = useGenresStore((s) => s.genres)
  const loading = useGenresStore((s) => s.loading)
  const error = useGenresStore((s) => s.error)
  const fetchGenres = useGenresStore((s) => s.fetchGenres)
  useEffect(() => {
    void fetchGenres()
  }, [fetchGenres])
  return { genres: genres ?? [], loading, error }
}

export const SEARCH_DEBOUNCE_MS = 350

/**
 * Texto de un filtro con debounce: el input responde al instante y la URL
 * (y por ende la búsqueda en el servidor) se actualiza al dejar de escribir.
 */
export function useDebouncedFilter(
  urlValue: string,
  onCommit: (value: string | undefined) => void,
): [string, (value: string) => void] {
  const [value, setValue] = useState(urlValue)
  const [seenUrlValue, setSeenUrlValue] = useState(urlValue)
  const debounced = useDebouncedValue(value, SEARCH_DEBOUNCE_MS)

  // Cambio externo de la URL (limpiar filtros, botón Atrás): se refleja en el input.
  if (urlValue !== seenUrlValue) {
    setSeenUrlValue(urlValue)
    if (urlValue !== value.trim()) setValue(urlValue)
  }

  const latest = useRef({ urlValue, onCommit })
  useEffect(() => {
    latest.current = { urlValue, onCommit }
  })

  useEffect(() => {
    const next = debounced.trim()
    if (next !== latest.current.urlValue) latest.current.onCommit(next || undefined)
  }, [debounced])

  return [value, setValue]
}

/** Búsqueda cacheada en un catálogo (autores, editoriales); sólo consulta si `enabled`. */
export function useCatalogSearch(kind: CatalogKind, term: string, enabled: boolean) {
  const key = catalogKey(kind, term)
  const entry = useCatalogStore((s) => s.searches[key]) ?? emptyEntry()
  const search = useCatalogStore((s) => s.search)

  useEffect(() => {
    if (enabled) void search(kind, term)
    // `key` resume `kind` y `term`: evita recargas por identidad.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, key, search])

  return entry
}
