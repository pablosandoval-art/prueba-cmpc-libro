import { Modal } from '../../../components/ui/Modal'
import { formatDateTime } from '../../../lib/format'
import { ACTION_LABELS, changedFields, entityLabel, recordName, snapshotFields } from '../describe'
import type { AuditLog } from '../types'
import { ActionStamp } from './AuditTable'

const th = 'type-label border-b-[1.5px] border-ink px-3 py-2 text-left text-ink-2'
const td = 'border-b border-rule-soft px-3 py-2.5 align-top'

/** Qué cambió en una operación: antes → después en una edición; el registro completo en una creación o baja. */
function Changes({ log }: { log: AuditLog }) {
  if (log.action === 'UPDATE') {
    const rows = changedFields(log)
    if (rows.length === 0) {
      return <p className="text-[15px] text-ink-2">Esta edición no modificó ningún campo visible.</p>
    }
    return (
      <table className="w-full border-collapse text-[15px]">
        <caption className="sr-only">Campos modificados</caption>
        <thead>
          <tr>
            <th scope="col" className={th}>
              Campo
            </th>
            <th scope="col" className={th}>
              Antes
            </th>
            <th scope="col" className={th}>
              Después
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              <th scope="row" className={`${td} type-label w-1/4 text-left text-ink-2`}>
                {row.label}
              </th>
              <td className={`${td} text-ink-2 line-through decoration-ink-3`}>{row.before}</td>
              <td className={`${td} font-semibold`}>{row.after}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  const created = log.action === 'CREATE'
  // En una baja lógica `before` es lo que había y `after` aporta la fecha de eliminación.
  const fields = snapshotFields(created ? log.after : { ...log.before, deletedAt: log.after?.deletedAt ?? null })
  return (
    <table className="w-full border-collapse text-[15px]">
      <caption className="sr-only">{created ? 'Datos del registro creado' : 'Datos del registro eliminado'}</caption>
      <thead>
        <tr>
          <th scope="col" className={th}>
            Campo
          </th>
          <th scope="col" className={th}>
            {created ? 'Valor' : 'Valor al eliminarlo'}
          </th>
        </tr>
      </thead>
      <tbody>
        {fields.map((field) => (
          <tr key={field.key}>
            <th scope="row" className={`${td} type-label w-1/4 text-left text-ink-2`}>
              {field.label}
            </th>
            <td className={`${td} font-semibold`}>{field.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/** Detalle de una operación de la bitácora. Esc, la X o un clic fuera lo cierran. */
export function AuditDetailModal({ log, onClose }: { log: AuditLog; onClose: () => void }) {
  const entity = entityLabel(log.entityType)
  return (
    <Modal open onClose={onClose} size="lg" title={`${ACTION_LABELS[log.action]} de ${entity.toLowerCase()}`}>
      <dl className="mb-6 grid grid-cols-[auto_1fr] items-baseline gap-x-6 gap-y-3 text-[15px]">
        <dt className="type-label text-ink-2">Registro</dt>
        <dd className="font-semibold">{recordName(log)}</dd>
        <dt className="type-label text-ink-2">Acción</dt>
        <dd>
          <ActionStamp action={log.action} />
        </dd>
        <dt className="type-label text-ink-2">Usuario</dt>
        <dd>
          {log.user.name} <span className="text-ink-3">· {log.user.email}</span>
        </dd>
        <dt className="type-label text-ink-2">Fecha</dt>
        <dd>
          <time dateTime={log.createdAt}>{formatDateTime(log.createdAt)}</time>
        </dd>
        <dt className="type-label text-ink-2">Id</dt>
        <dd className="text-[13px] break-all text-ink-3">{log.entityId}</dd>
      </dl>
      <div className="overflow-x-auto">
        <Changes log={log} />
      </div>
    </Modal>
  )
}
