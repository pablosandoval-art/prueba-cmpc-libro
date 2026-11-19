import { CircleAlert, CircleCheck, Info, X } from 'lucide-react'
import { useToastStore } from '../../features/notifications/toast.store'
import type { ToastTone } from '../../features/notifications/toast.store'
import { cn } from './cn'

const TONES: Record<ToastTone, { icon: typeof Info; className: string }> = {
  success: { icon: CircleCheck, className: 'border-flexo text-flexo-deep' },
  error: { icon: CircleAlert, className: 'border-alert text-alert' },
  info: { icon: Info, className: 'border-ink text-ink' },
}

/** Notificaciones de resultado, anunciadas a lectores de pantalla. */
export function Toaster() {
  const toasts = useToastStore((s) => s.toasts)
  const dismiss = useToastStore((s) => s.dismiss)

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-end gap-2 sm:left-auto sm:w-96"
    >
      {toasts.map((toast) => {
        const { icon: Icon, className } = TONES[toast.tone]
        return (
          <div
            key={toast.id}
            role={toast.tone === 'error' ? 'alert' : 'status'}
            className={cn(
              'motion-toast-in pointer-events-auto flex w-full items-start gap-3 rounded-sheet border-[1.5px] bg-sheet px-4 py-3 shadow-[0_8px_24px_-12px_rgb(30_30_28/0.45)]',
              className,
            )}
          >
            <Icon aria-hidden className="mt-0.5 size-[18px] shrink-0" />
            <p className="flex-1 text-sm font-medium text-ink">{toast.message}</p>
            <button
              type="button"
              aria-label="Cerrar notificación"
              onClick={() => dismiss(toast.id)}
              className="-m-1 grid size-7 place-items-center rounded-sheet text-ink-3 hover:text-ink"
            >
              <X aria-hidden className="size-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
