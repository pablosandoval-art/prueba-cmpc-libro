import type { Page } from '../../common/pagination/pagination.js';
import { toSkip } from '../../common/pagination/pagination.js';
import type { Prisma } from '../../generated/prisma/client.js';
import type {
  Book,
  BookFilters,
  BookQuery,
  BookSort,
  CreateBookData,
  UpdateBookData,
} from '../domain/book.js';
import type { BooksRepository } from '../domain/books.repository.js';

const BOOK_INCLUDE = {
  genre: { select: { id: true, name: true } },
  author: { select: { id: true, name: true } },
  publisher: { select: { id: true, name: true } },
} satisfies Prisma.BookInclude;

type BookRow = Prisma.BookGetPayload<{ include: typeof BOOK_INCLUDE }>;

export function toDomain(row: BookRow): Book {
  return {
    id: row.id,
    title: row.title,
    author: row.author,
    publisher: row.publisher,
    price: row.price,
    stock: row.stock,
    genre: row.genre,
    imageUrl: row.imageUrl,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
  };
}

/** Filtros del listado. Los de texto usan ILIKE, acelerado por índices GIN trigram. */
export function buildWhere(filters: BookFilters): Prisma.BookWhereInput {
  const where: Prisma.BookWhereInput = { deletedAt: null };
  if (filters.title) {
    where.title = { contains: filters.title, mode: 'insensitive' };
  }
  if (filters.author) {
    where.author = {
      name: { contains: filters.author, mode: 'insensitive' },
    };
  }
  if (filters.publisher) {
    where.publisher = {
      name: { contains: filters.publisher, mode: 'insensitive' },
    };
  }
  if (filters.genreId !== undefined) {
    where.genreId = filters.genreId;
  }
  if (filters.available === true) {
    where.stock = { gt: 0 };
  } else if (filters.available === false) {
    where.stock = 0;
  }
  return where;
}

/** Columnas que ordenan por el nombre de una relación (JOIN). */
const RELATION_SORT_FIELDS: ReadonlySet<string> = new Set([
  'genre',
  'author',
  'publisher',
]);

/**
 * Orden multi-campo. Se agrega `id` como desempate final para que la
 * paginación sea determinista (sin filas repetidas ni perdidas entre páginas).
 */
export function buildOrderBy(
  sort: readonly BookSort[],
): Prisma.BookOrderByWithRelationInput[] {
  const orderBy: Prisma.BookOrderByWithRelationInput[] = sort.map(
    ({ field, direction }) =>
      RELATION_SORT_FIELDS.has(field)
        ? { [field]: { name: direction } }
        : { [field]: direction },
  );
  orderBy.push({ id: 'asc' });
  return orderBy;
}

export class PrismaBooksRepository implements BooksRepository {
  constructor(private readonly db: Prisma.TransactionClient) {}

  async findMany(query: BookQuery): Promise<Page<Book>> {
    const where = buildWhere(query.filters);
    const [rows, total] = await Promise.all([
      this.db.book.findMany({
        where,
        orderBy: buildOrderBy(query.sort),
        skip: toSkip(query),
        take: query.limit,
        include: BOOK_INCLUDE,
      }),
      this.db.book.count({ where }),
    ]);
    return { items: rows.map(toDomain), total };
  }

  async findActiveById(id: string): Promise<Book | null> {
    const row = await this.db.book.findFirst({
      where: { id, deletedAt: null },
      include: BOOK_INCLUDE,
    });
    return row ? toDomain(row) : null;
  }

  async create(data: CreateBookData): Promise<Book> {
    const row = await this.db.book.create({ data, include: BOOK_INCLUDE });
    return toDomain(row);
  }

  async update(id: string, data: UpdateBookData): Promise<Book> {
    const row = await this.db.book.update({
      where: { id, deletedAt: null },
      data,
      include: BOOK_INCLUDE,
    });
    return toDomain(row);
  }

  async softDelete(id: string): Promise<Book> {
    const row = await this.db.book.update({
      where: { id, deletedAt: null },
      data: { deletedAt: new Date() },
      include: BOOK_INCLUDE,
    });
    return toDomain(row);
  }

  /** Paginación por cursor: memoria constante aunque haya miles de libros. */
  async *findAllInBatches(
    filters: BookFilters,
    sort: readonly BookSort[],
    batchSize: number,
  ): AsyncGenerator<Book[]> {
    const where = buildWhere(filters);
    const orderBy = buildOrderBy(sort);
    let cursor: string | undefined;

    while (true) {
      const rows = await this.db.book.findMany({
        where,
        orderBy,
        take: batchSize,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        include: BOOK_INCLUDE,
      });
      if (rows.length === 0) return;
      yield rows.map(toDomain);
      if (rows.length < batchSize) return;
      cursor = rows[rows.length - 1].id;
    }
  }
}
