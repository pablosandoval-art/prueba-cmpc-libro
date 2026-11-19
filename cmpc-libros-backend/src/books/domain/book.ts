import type { CatalogItem } from '../../common/catalog/catalog.js';
import type { Genre } from '../../genres/domain/genre.js';

export interface Book {
  id: string;
  title: string;
  author: CatalogItem;
  publisher: CatalogItem;
  /** Precio en pesos chilenos (entero). */
  price: number;
  /** Disponibilidad: unidades en stock. */
  stock: number;
  genre: Genre;
  imageUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  /** Fecha de soft delete; `null` si el libro está activo. */
  deletedAt: Date | null;
}

export interface CreateBookData {
  title: string;
  authorId: number;
  publisherId: number;
  price: number;
  stock: number;
  genreId: number;
}

export type UpdateBookData = Partial<CreateBookData> & {
  imageUrl?: string | null;
};

export const BOOK_SORT_FIELDS = [
  'title',
  'author',
  'publisher',
  'price',
  'stock',
  'genre',
  'createdAt',
] as const;

export type BookSortField = (typeof BOOK_SORT_FIELDS)[number];
export type SortDirection = 'asc' | 'desc';

export interface BookSort {
  field: BookSortField;
  direction: SortDirection;
}

/** Orden por defecto del listado: más recientes primero. */
export const DEFAULT_BOOK_SORT: readonly BookSort[] = [
  { field: 'createdAt', direction: 'desc' },
];

export interface BookFilters {
  title?: string;
  /** Texto buscado dentro del nombre del autor. */
  author?: string;
  /** Texto buscado dentro del nombre de la editorial. */
  publisher?: string;
  genreId?: number;
  /** `true`: sólo con stock; `false`: sólo sin stock; ausente: todos. */
  available?: boolean;
}

export interface BookQuery {
  filters: BookFilters;
  sort: readonly BookSort[];
  page: number;
  limit: number;
}
