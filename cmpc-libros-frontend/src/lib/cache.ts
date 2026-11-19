/**
 * Entrada de caché para datos remotos (patrón stale-while-revalidate).
 * Los stores de Zustand guardan un mapa `clave → CacheEntry`.
 */
export interface CacheEntry<T> {
  data?: T
  error?: string
  /** `true` mientras hay una petición en curso para esta clave. */
  loading: boolean
  /** Epoch ms de la última respuesta exitosa (0 = invalidada). */
  fetchedAt: number
}

export const LIST_TTL_MS = 60_000

export function emptyEntry<T>(): CacheEntry<T> {
  return { loading: false, fetchedAt: 0 }
}

/** Hay datos y no han vencido: no hace falta pedirlos de nuevo. */
export function isFresh(entry: CacheEntry<unknown> | undefined, ttl: number, now: number = Date.now()): boolean {
  return !!entry?.data && entry.fetchedAt > 0 && now - entry.fetchedAt < ttl
}

/**
 * Deduplica peticiones concurrentes con la misma clave: si ya hay una en
 * vuelo, todos los llamadores comparten la misma promesa.
 */
export function createInflight<T>() {
  const pending = new Map<string, Promise<T>>()
  return {
    run(key: string, task: () => Promise<T>): Promise<T> {
      const existing = pending.get(key)
      if (existing) return existing
      const promise = task().finally(() => pending.delete(key))
      pending.set(key, promise)
      return promise
    },
    has: (key: string) => pending.has(key),
    clear: () => pending.clear(),
  }
}
