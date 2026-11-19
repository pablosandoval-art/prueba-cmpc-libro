import { useId } from 'react'
import type { InputHTMLAttributes, ReactNode, Ref, SelectHTMLAttributes } from 'react'
import { CircleAlert } from 'lucide-react'
import { cn } from './cn'
import { controlClass } from './field-styles'

/**
 * - `stacked` (por defecto): etiqueta sobre el campo.
 * - `inline`: etiqueta a la izquierda, como una fila de ficha (`<dl>` del detalle). Cada campo ocupa
 *   una fila de una grilla `grid-cols-[auto_1fr]` del contenedor y comparte su columna de etiquetas
 *   (subgrid); bajo `sm` vuelve a apilarse.
 */
export type FieldLayout = 'stacked' | 'inline'

interface FieldShellProps {
  id: string
  label: string
  error?: string
  hint?: ReactNode
  children: ReactNode
  className?: string
  layout?: FieldLayout
}

export function FieldShell({ id, label, error, hint, children, className, layout = 'stacked' }: FieldShellProps) {
  const message = error ? (
    <p id={`${id}-error`} className="mt-1.5 flex items-center gap-1.5 text-[13px] font-medium text-alert">
      <CircleAlert aria-hidden className="size-3.5 shrink-0" />
      {error}
    </p>
  ) : hint ? (
    <p id={`${id}-hint`} className="mt-1.5 text-[13px] text-ink-3">
      {hint}
    </p>
  ) : null

  if (layout === 'inline') {
    return (
      <div className={cn('grid gap-1.5 sm:col-span-2 sm:grid-cols-subgrid sm:gap-x-6', className)}>
        <label htmlFor={id} className="type-label block text-ink-2 sm:pt-3">
          {label}
        </label>
        <div className="min-w-0">
          {children}
          {message}
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      <label htmlFor={id} className="type-label mb-1.5 block text-ink-2">
        {label}
      </label>
      {children}
      {message}
    </div>
  )
}

function describedBy(id: string, error?: string, hint?: ReactNode) {
  return error ? `${id}-error` : hint ? `${id}-hint` : undefined
}

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  hint?: ReactNode
  active?: boolean
  ref?: Ref<HTMLInputElement>
  containerClassName?: string
  layout?: FieldLayout
}

export function TextField({
  label,
  error,
  hint,
  active,
  className,
  containerClassName,
  id,
  layout,
  ...rest
}: TextFieldProps) {
  const generated = useId()
  const fieldId = id ?? generated
  return (
    <FieldShell id={fieldId} label={label} error={error} hint={hint} className={containerClassName} layout={layout}>
      <input
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(fieldId, error, hint)}
        className={cn(controlClass({ active, invalid: !!error }), className)}
        {...rest}
      />
    </FieldShell>
  )
}

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  error?: string
  hint?: ReactNode
  active?: boolean
  ref?: Ref<HTMLSelectElement>
  containerClassName?: string
  layout?: FieldLayout
}

export function SelectField({
  label,
  error,
  hint,
  active,
  className,
  containerClassName,
  id,
  layout,
  children,
  ...rest
}: SelectFieldProps) {
  const generated = useId()
  const fieldId = id ?? generated
  return (
    <FieldShell id={fieldId} label={label} error={error} hint={hint} className={containerClassName} layout={layout}>
      <select
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(fieldId, error, hint)}
        className={cn(controlClass({ active, invalid: !!error }), 'pr-8', className)}
        {...rest}
      >
        {children}
      </select>
    </FieldShell>
  )
}
