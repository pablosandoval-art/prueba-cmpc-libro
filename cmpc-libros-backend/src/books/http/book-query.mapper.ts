import { DEFAULT_BOOK_SORT } from '../domain/book.js';
import type {
  BookFilters,
  BookQuery,
  BookSort,
  BookSortField,
  SortDirection,
} from '../domain/book.js';
import type { BookFiltersQueryDto, ListBooksQueryDto } from './book.dto.js';

/**
 * Convierte `"genre:asc,price:desc"` en una lista de criterios.
 * Si un campo se repite, prevalece la primera aparición.
 */
export function parseSort(sort: string | undefined): readonly BookSort[] {
  if (!sort) return DEFAULT_BOOK_SORT;
  const seen = new Set<string>();
  const result: BookSort[] = [];
  for (const term of sort.split(',')) {
    const [field, direction = 'asc'] = term.split(':');
    if (seen.has(field)) continue;
    seen.add(field);
    result.push({
      field: field as BookSortField,
      direction: direction as SortDirection,
    });
  }
  return result;
}

/** Normaliza filtros: strings vacíos se tratan como "sin filtro". */
export function toBookFilters(dto: BookFiltersQueryDto): BookFilters {
  return {
    title: dto.title || undefined,
    author: dto.author || undefined,
    publisher: dto.publisher || undefined,
    genreId: dto.genreId,
    available: dto.available,
  };
}

export function toBookQuery(dto: ListBooksQueryDto): BookQuery {
  return {
    filters: toBookFilters(dto),
    sort: parseSort(dto.sort),
    page: dto.page,
    limit: dto.limit,
  };
}
