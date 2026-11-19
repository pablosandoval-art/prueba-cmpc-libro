import { useState } from 'react'
import type { TableLoadState } from './TableLayout'

interface Entry<T> {
  data?: T
  error?: string
  loading: boolean
}

/**
 * Mientras llega el resultado de una consulta nueva (otro filtro, orden o página) se sigue
 * mostrando el último recibido, atenuado: la tabla no se vacía ni cambia de alto.
 *
 * Devuelve lo que hay que pintar (`shown`) y el estado visual para `TableLayout`.
 */
export function useStaleWhileLoading<T>({ data, error, loading }: Entry<T>): TableLoadState & {
  shown: T | null
} {
  const [last, setLast] = useState<T | null>(null)
  if (data && data !== last) setLast(data)

  const pending = !data && !error // aún no hay respuesta para esta consulta
  const stale = pending && !!last // lo que se ve es el resultado anterior
  return {
    shown: data ?? (pending ? last : null),
    firstLoad: pending && !last,
    stale,
    refreshing: stale || (!!data && loading),
  }
}
