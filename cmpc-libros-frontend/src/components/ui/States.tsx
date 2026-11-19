import type { ReactNode } from 'react'
import { CircleAlert } from 'lucide-react'
import { Button } from './Button'

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      <CircleAlert aria-hidden className="size-7 text-alert" />
      <p className="max-w-md text-[15px] font-medium">{message}</p>
      {onRetry && (
        <Button size="sm" onClick={onRetry}>
          Reintentar
        </Button>
      )}
    </div>
  )
}

/** Estado vacío dibujado como una caja troquelada sin contenido. */
export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="px-6 py-14">
      <div className="die-line mx-auto flex max-w-md flex-col items-center gap-2 rounded-sheet px-6 py-8 text-center">
        <p className="type-display text-2xl">{title}</p>
        {children && <div className="text-[15px] text-ink-2">{children}</div>}
      </div>
    </div>
  )
}
