import { useCallback, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { emptyEntry } from '../../lib/cache'
import { auditListKey, parseAuditQuery, toAuditSearchParams } from './query'
import { useAuditStore } from './store/audit.store'
import type { AuditListQuery } from './types'

/**
 * Consulta del listado sincronizada con la URL (fuente de verdad).
 * `update` cambia filtros o página; cambiar un filtro vuelve a la página 1.
 */
export function useAuditListQuery() {
  const [params, setParams] = useSearchParams()
  const search = params.toString()
  const query = useMemo(() => parseAuditQuery(new URLSearchParams(search)), [search])

  const update = useCallback(
    (patch: Partial<AuditListQuery>) => {
      setParams(
        (current) => {
          const prev = parseAuditQuery(current)
          const resetsPage = Object.keys(patch).some((k) => k !== 'page')
          return toAuditSearchParams({ ...prev, ...(resetsPage ? { page: 1 } : {}), ...patch })
        },
        // Cambiar un filtro no debe llenar el historial; paginar sí.
        { replace: !('page' in patch) },
      )
    },
    [setParams],
  )

  return { query, update }
}

/** Listado de auditoría: se pide al montar y cada vez que cambia la consulta. */
export function useAuditList(query: AuditListQuery) {
  const key = auditListKey(query)
  const entry = useAuditStore((s) => s.lists[key]) ?? emptyEntry()
  const fetchList = useAuditStore((s) => s.fetchList)

  useEffect(() => {
    void fetchList(query)
    // `key` resume `query`: evita recargas por identidad de objeto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, fetchList])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const refresh = useCallback(() => fetchList(query), [key, fetchList])

  return { ...entry, refresh }
}
