import { X } from 'lucide-react'
import { Button } from '../../../components/ui/Button'
import { SelectField, TextField } from '../../../components/ui/Field'
import { ACTION_LABELS, ENTITY_LABELS } from '../describe'
import { hasAuditFilters } from '../query'
import { AUDIT_ACTIONS, AUDIT_ENTITIES } from '../types'
import type { AuditAction, AuditEntity, AuditListQuery } from '../types'

interface AuditFiltersProps {
  query: AuditListQuery
  onChange: (patch: Partial<AuditListQuery>) => void
}

export function AuditFilters({ query, onChange }: AuditFiltersProps) {
  return (
    <search aria-label="Filtros de la auditoría" className="mt-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
        <SelectField
          label="Acción"
          value={query.action ?? ''}
          active={!!query.action}
          onChange={(e) => onChange({ action: (e.target.value as AuditAction) || undefined })}
        >
          <option value="">Todas las acciones</option>
          {AUDIT_ACTIONS.map((action) => (
            <option key={action} value={action}>
              {ACTION_LABELS[action]}
            </option>
          ))}
        </SelectField>
        <SelectField
          label="Entidad"
          value={query.entityType ?? ''}
          active={!!query.entityType}
          onChange={(e) => onChange({ entityType: (e.target.value as AuditEntity) || undefined })}
        >
          <option value="">Todas las entidades</option>
          {AUDIT_ENTITIES.map((entity) => (
            <option key={entity} value={entity}>
              {ENTITY_LABELS[entity]}
            </option>
          ))}
        </SelectField>
        <TextField
          label="Desde"
          type="date"
          value={query.from ?? ''}
          max={query.to}
          active={!!query.from}
          onChange={(e) => onChange({ from: e.target.value || undefined })}
        />
        <TextField
          label="Hasta"
          type="date"
          value={query.to ?? ''}
          min={query.from}
          active={!!query.to}
          onChange={(e) => onChange({ to: e.target.value || undefined })}
        />
      </div>
      {/* Altura reservada: que aparezca o desaparezca el botón no mueve el resto de la pantalla. */}
      <div className="mt-1 flex min-h-9 flex-wrap items-center gap-x-4 gap-y-1">
        {hasAuditFilters(query) && (
          <Button
            variant="ghost"
            size="sm"
            className="motion-fade-in -ml-3"
            icon={<X aria-hidden className="size-4" />}
            onClick={() => onChange({ action: undefined, entityType: undefined, from: undefined, to: undefined })}
          >
            Limpiar filtros
          </Button>
        )}
      </div>
    </search>
  )
}
