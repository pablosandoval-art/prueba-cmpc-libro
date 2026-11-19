import { useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from './cn'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
  size?: 'md' | 'lg'
}

/**
 * Modal sobre `<dialog>` nativo: foco atrapado, cierre con Esc y fondo
 * inerte los da el navegador (accesibilidad sin reimplementarla).
 */
export function Modal({ open, onClose, title, children, footer, size = 'md' }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
      // `autoFocus` de React llega antes de abrir el diálogo (cuando aún no se puede enfocar nada dentro):
      // el campo inicial se marca con `data-autofocus` y se enfoca recién abierto.
      dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus()
    }
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        // Clic en el fondo (fuera de la hoja) cierra.
        if (event.target === ref.current) onClose()
      }}
      className={cn(
        'm-auto w-[calc(100%-2rem)] max-h-[calc(100dvh-2rem)] rounded-sheet border border-ink bg-sheet p-0 text-ink',
        size === 'lg' ? 'max-w-3xl' : 'max-w-md',
      )}
    >
      {open && (
        <div className="flex max-h-[calc(100dvh-2rem)] flex-col">
          <header className="flex items-start gap-4 border-b border-rule px-6 pt-5 pb-4">
            <h2 id={titleId} className="type-display text-[28px] text-balance">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="-mr-2 ml-auto grid size-9 shrink-0 place-items-center rounded-sheet hover:bg-board"
            >
              <X aria-hidden className="size-5" />
            </button>
          </header>
          <div className="overflow-y-auto px-6 py-5">{children}</div>
          {footer && (
            <footer className="flex flex-wrap justify-end gap-2.5 border-t border-rule bg-board px-6 py-4">
              {footer}
            </footer>
          )}
        </div>
      )}
    </dialog>
  )
}
