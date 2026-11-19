import { useState } from 'react'
import type { ReactNode } from 'react'
import { Pagination } from '../../../components/table/Pagination'
import { useStaleWhileLoading } from '../../../components/table/useStaleWhileLoading'
import { EmptyState, ErrorState } from '../../../components/ui/States'
import { plural } from '../../../lib/format'
import { AuditDetailModal } from '../components/AuditDetailModal'
import { AuditFilters } from '../components/AuditFilters'
import { AuditTable } from '../components/AuditTable'
import { useAuditList, useAuditListQuery } from '../hooks'
import { hasAuditFilters } from '../query'
import type { AuditLog } from '../types'

export function AuditPage() {
  const { query, update } = useAuditListQuery()
  const { data, loading, error, refresh } = useAuditList(query)
  const [selected, setSelected] = useState<AuditLog | null>(null)

  const { shown, ...load } = useStaleWhileLoading({ data, error, loading })

  let overlay: ReactNode = null
  if (error && !data) {
    overlay = <ErrorState message={error} onRetry={refresh} />
  } else if (data && data.data.length === 0 && !loading) {
    overlay = (
      <EmptyState title="Sin resultados">
        {hasAuditFilters(query)
          ? 'Ninguna operación coincide con los filtros. Prueba quitando alguno.'
          : 'Aún no hay operaciones registradas.'}
      </EmptyState>
    )
  }

  return (
    <>
      <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
        <h1 className="type-display text-[40px] md:text-[44px]">Auditoría</h1>
        <p className="pb-1 text-[15px] text-ink-2" aria-live="polite">
          {shown ? plural(shown.meta.total, 'operación', 'operaciones') : error ? '' : 'Cargando…'}
        </p>
      </div>

      <AuditFilters query={query} onChange={update} />

      <AuditTable
        logs={shown?.data ?? []}
        limit={query.limit}
        onOpen={setSelected}
        load={load}
        overlay={overlay}
        refreshError={data ? error : null}
        footer={
          shown && (
            <Pagination
              // Mientras llega el resultado nuevo, la página y el tamaño ya reflejan lo pedido.
              meta={load.stale ? { ...shown.meta, page: query.page, limit: query.limit } : shown.meta}
              onPage={(page) => update({ page })}
              onLimit={(limit) => update({ limit })}
            />
          )
        }
      />

      {selected && <AuditDetailModal log={selected} onClose={() => setSelected(null)} />}
    </>
  )
}
