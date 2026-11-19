import { memo } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { Eye } from 'lucide-react'
import { TableLayout } from '../../../components/table/TableLayout'
import type { TableLoadState } from '../../../components/table/TableLayout'
import { cn } from '../../../components/ui/cn'
import { formatDateTime } from '../../../lib/format'
import { ACTION_LABELS, entityLabel, recordName, summarize } from '../describe'
import type { AuditAction, AuditLog } from '../types'

const COLUMNS = ['Fecha', 'Acción', 'Entidad', 'Registro', 'Usuario', 'Cambios'] as const

/** Sello de la acción: verde crea, tinta edita, rojo elimina (el texto siempre lo dice, no sólo el color). */
export function ActionStamp({ action }: { action: AuditAction }) {
  return (
    <span
      className={cn(
        'inline-block border-[1.5px] px-1.5 py-0.5 whitespace-nowrap uppercase [font-stretch:72%] font-[750] text-[11px] tracking-[0.08em]',
        action === 'CREATE' && 'border-flexo text-flexo-deep',
        action === 'UPDATE' && 'border-ink text-ink',
        action === 'DELETE' && 'border-alert text-alert',
      )}
    >
      {ACTION_LABELS[action]}
    </span>
  )
}

interface AuditTableProps {
  logs: AuditLog[]
  /** Filas por página: la tabla siempre ocupa este alto, aunque haya menos resultados. */
  limit: number
  onOpen: (log: AuditLog) => void
  load: TableLoadState
  overlay?: ReactNode
  refreshError?: string | null
  footer?: ReactNode
}

const AuditRow = memo(function AuditRow({
  log,
  index,
  onOpen,
}: {
  log: AuditLog
  index: number
  onOpen: (log: AuditLog) => void
}) {
  const name = recordName(log)
  const entity = entityLabel(log.entityType)
  return (
    <tr
      style={{ '--i': index } as CSSProperties}
      className={cn(
        'motion-row-in grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 border-b border-rule-soft px-4 py-3 transition-colors duration-150 focus-within:die-outline',
        'lg:table-row lg:h-[60px] lg:p-0 lg:hover:bg-board/60',
      )}
    >
      <td className="row-start-1 text-[13px] text-ink-2 lg:px-3.5 lg:align-middle lg:text-sm">
        <time dateTime={log.createdAt}>{formatDateTime(log.createdAt)}</time>
      </td>
      <td className="col-start-2 row-start-1 justify-self-end lg:px-3.5 lg:align-middle">
        <ActionStamp action={log.action} />
      </td>
      <td className="col-span-2 text-[13px] text-ink-2 lg:table-cell lg:px-3.5 lg:align-middle lg:text-[15px] lg:text-ink">
        <span className="type-label lg:hidden">{entity}</span>
        <span className="hidden lg:inline">{entity}</span>
      </td>
      <td className="col-span-2 lg:overflow-hidden lg:px-3.5 lg:align-middle">
        <button
          type="button"
          onClick={() => onOpen(log)}
          title={name}
          className="line-clamp-2 text-left text-[15px] leading-tight font-[650] hover:underline"
        >
          {name}
        </button>
      </td>
      <td className="col-span-2 text-sm lg:overflow-hidden lg:px-3.5 lg:align-middle lg:text-[15px]">
        <span className="line-clamp-2 leading-tight" title={log.user.email}>
          {log.user.name}
        </span>
      </td>
      <td className="col-span-2 text-sm text-ink-2 lg:overflow-hidden lg:px-3.5 lg:align-middle lg:text-[15px]">
        <span className="line-clamp-2 leading-tight">{summarize(log)}</span>
      </td>
      <td className="col-span-2 lg:pr-3 lg:align-middle">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => onOpen(log)}
            aria-label={`Ver cambios: ${ACTION_LABELS[log.action].toLowerCase()} de ${entity.toLowerCase()} ${name}`}
            className="grid size-8 place-items-center rounded-sheet text-ink-2 transition-colors duration-150 hover:bg-board hover:text-ink"
          >
            <Eye aria-hidden className="size-[18px]" />
          </button>
        </div>
      </td>
    </tr>
  )
})

/** Fecha, acción, entidad y botón tienen ancho fijo; registro, usuario y cambios reparten el resto. */
const WIDTHS = ['w-44', 'w-36', 'w-28', '', 'w-[18%]', 'w-[24%]', 'w-16']

export function AuditTable({ logs, limit, onOpen, load, overlay, refreshError, footer }: AuditTableProps) {
  return (
    <TableLayout
      caption="Operaciones registradas en la auditoría"
      columns={WIDTHS}
      header={
        <tr className="lg:table-row lg:h-12">
          {COLUMNS.map((label) => (
            <th key={label} scope="col" className="type-label px-3.5 text-left text-ink-2">
              {label}
            </th>
          ))}
          <th scope="col">
            <span className="sr-only">Acciones</span>
          </th>
        </tr>
      }
      rowCount={logs.length}
      limit={limit}
      load={load}
      skeleton={
        <>
          <div className="h-3.5 w-32 bg-rule-soft" />
          <div className="h-5 w-20 bg-rule-soft" />
          <div className="hidden h-3.5 w-1/4 bg-rule-soft lg:block" />
          <div className="ml-auto h-3.5 w-16 bg-rule-soft" />
        </>
      }
      overlay={overlay}
      refreshError={refreshError}
      footer={footer}
    >
      {logs.map((log, index) => (
        <AuditRow key={log.id} log={log} index={index} onOpen={onOpen} />
      ))}
    </TableLayout>
  )
}
