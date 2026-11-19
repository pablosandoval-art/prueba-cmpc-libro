import type { Page } from '../../common/pagination/pagination.js';
import type {
  Book,
  BookFilters,
  BookQuery,
  BookSort,
  CreateBookData,
  UpdateBookData,
} from './book.js';

/**
 * Contrato de persistencia de libros (token DI).
 * Todas las lecturas excluyen libros con soft delete.
 */
export abstract class BooksRepository {
  abstract findMany(query: BookQuery): Promise<Page<Book>>;
  abstract findActiveById(id: string): Promise<Book | null>;
  abstract create(data: CreateBookData): Promise<Book>;
  abstract update(id: string, data: UpdateBookData): Promise<Book>;
  abstract softDelete(id: string): Promise<Book>;
  /** Recorre todos los libros que cumplen los filtros, en lotes (exportación). */
  abstract findAllInBatches(
    filters: BookFilters,
    sort: readonly BookSort[],
    batchSize: number,
  ): AsyncGenerator<Book[]>;
}
