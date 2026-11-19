import { cn } from './cn'

interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  /** Marca el interruptor como filtro activo (línea de troquel). */
  active?: boolean
  className?: string
}

/** Interruptor accesible (`role="switch"`). */
export function Toggle({ checked, onChange, label, active = false, className }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'group inline-flex h-10 items-center gap-2.5 rounded-sheet px-2.5 text-[15px] font-semibold',
        active ? 'die-line' : 'border-[1.5px] border-transparent',
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          'relative h-[22px] w-10 rounded-full transition-colors duration-200',
          checked ? 'bg-flexo' : 'bg-field',
        )}
      >
        <span
          className={cn(
            'absolute top-[3px] size-4 rounded-full bg-sheet transition-[left] duration-200 ease-out',
            checked ? 'left-[21px]' : 'left-[3px]',
          )}
        />
      </span>
      {label}
    </button>
  )
}
