import type { BookFormValues } from './book.schema'

/** Nombre de cada campo en el resumen «Falta completar: …». */
export const FIELD_LABELS: Record<keyof BookFormValues, string> = {
  title: 'título',
  author: 'autor',
  publisher: 'editorial',
  price: 'precio',
  stock: 'disponibilidad',
  genreId: 'género',
}

/** Lo que el modal necesita saber del formulario para dibujar su pie y proteger los cambios. */
export interface EditorState {
  /** Hay cambios sin guardar (campos o imagen nueva). */
  dirty: boolean
  submitting: boolean
  /** Campos con error tras intentar guardar (para el resumen «Falta completar»). */
  missing: Array<keyof BookFormValues>
  serverError: string | null
}

export const IDLE_EDITOR: EditorState = { dirty: false, submitting: false, missing: [], serverError: null }
