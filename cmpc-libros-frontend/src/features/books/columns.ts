import type { SortField } from './types'

/** Nombre visible de cada campo ordenable (encabezados de la tabla y resumen del orden). */
export const COLUMN_LABELS: Record<SortField, string> = {
  title: 'Título',
  author: 'Autor',
  publisher: 'Editorial',
  genre: 'Género',
  price: 'Precio',
  stock: 'Disponibilidad',
  createdAt: 'Fecha de creación',
}
