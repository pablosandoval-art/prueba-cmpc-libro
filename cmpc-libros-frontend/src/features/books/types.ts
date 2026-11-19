export interface Genre {
  id: number
  name: string
}

/** Autor o editorial: registro de un catálogo de nombres únicos. */
export interface CatalogItem {
  id: number
  name: string
}

export interface Book {
  id: string
  title: string
  author: CatalogItem
  publisher: CatalogItem
  /** Precio en CLP (entero). */
  price: number
  /** Disponibilidad: unidades en stock. */
  stock: number
  genre: Genre
  imageUrl: string | null
  createdAt: string
  updatedAt: string
}

export type { Paginated, PaginationMeta } from '../../components/table/types'

export type SortField = 'title' | 'author' | 'publisher' | 'price' | 'stock' | 'genre' | 'createdAt'

export type SortDirection = 'asc' | 'desc'

export interface SortTerm {
  field: SortField
  direction: SortDirection
}

export interface BookFilters {
  title?: string
  author?: string
  publisher?: string
  genreId?: number
  /** `true`: sólo libros con stock. Ausente: todos. */
  available?: boolean
}

export interface BookListQuery extends BookFilters {
  page: number
  limit: number
  sort: SortTerm[]
}

/** Datos editables de un libro (lo que envía el formulario). */
export interface BookInput {
  title: string
  authorId: number
  publisherId: number
  price: number
  stock: number
  genreId: number
}
