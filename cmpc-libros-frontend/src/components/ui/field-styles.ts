import { cn } from './cn'

const CONTROL =
  'h-10 w-full rounded-sheet border bg-sheet px-3 text-[15px] text-ink transition-[border-color] duration-150 disabled:bg-board disabled:text-ink-3'

/** Clases del control según estado: con valor → línea de troquel; con error → rojo. */
export function controlClass(state: { active?: boolean; invalid?: boolean }) {
  return cn(
    CONTROL,
    state.invalid ? 'border-[1.5px] border-alert' : state.active ? 'die-line' : 'border-field hover:border-ink',
  )
}
