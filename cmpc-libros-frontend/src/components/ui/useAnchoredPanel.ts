import { useLayoutEffect, useRef } from 'react'

const GAP = 4
/** Alto máximo de la lista; con menos espacio abajo que esto (y más arriba), se abre hacia arriba. */
const MAX_HEIGHT = 256
const MIN_HEIGHT = 120

/**
 * Coloca un panel desplegable (la lista de un combobox) pegado a su campo con `position: fixed`.
 *
 * Así no lo recorta ningún contenedor con scroll ni el propio `<dialog>` de un modal, que
 * recortan a sus hijos `absolute`. Se abre hacia arriba si abajo no hay espacio, y se recoloca
 * al hacer scroll o cambiar el tamaño de la ventana. Escribe los estilos directamente en el
 * elemento (sin estado), así no provoca renders extra.
 *
 * Devuelve las refs para el campo (`anchorRef`), el panel (`panelRef`) y la lista con scroll (`listRef`).
 */
export function useAnchoredPanel<A extends HTMLElement, P extends HTMLElement, L extends HTMLElement>(open: boolean) {
  const anchorRef = useRef<A>(null)
  const panelRef = useRef<P>(null)
  const listRef = useRef<L>(null)

  useLayoutEffect(() => {
    if (!open) return
    const place = () => {
      const anchor = anchorRef.current
      const panel = panelRef.current
      if (!anchor || !panel) return
      const rect = anchor.getBoundingClientRect()
      const below = window.innerHeight - rect.bottom - GAP * 2
      const above = rect.top - GAP * 2
      const up = below < MAX_HEIGHT && above > below

      panel.style.position = 'fixed'
      panel.style.left = `${rect.left}px`
      panel.style.width = `${rect.width}px`
      panel.style.top = up ? '' : `${rect.bottom + GAP}px`
      panel.style.bottom = up ? `${window.innerHeight - rect.top + GAP}px` : ''
      panel.style.transformOrigin = up ? 'bottom' : 'top'
      if (listRef.current) {
        listRef.current.style.maxHeight = `${Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, up ? above : below))}px`
      }
    }
    place()
    window.addEventListener('resize', place)
    // `capture`: también el scroll de contenedores internos (el cuerpo de un modal).
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open])

  return { anchorRef, panelRef, listRef }
}
