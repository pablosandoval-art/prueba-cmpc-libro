import type { Prisma } from '../../generated/prisma/client.js';
import { BOOK_ID, makeBook } from '../../testing/fixtures.js';
import {
  PrismaBooksRepository,
  buildOrderBy,
  buildWhere,
} from './prisma-books.repository.js';

const row = (overrides = {}) => ({
  ...makeBook(),
  genreId: 1,
  ...overrides,
});

describe('buildWhere', () => {
  it('siempre excluye libros eliminados', () => {
    expect(buildWhere({})).toEqual({ deletedAt: null });
  });

  it('combina filtros de texto (ILIKE), género y disponibilidad', () => {
    expect(
      buildWhere({
        title: 'cien',
        author: 'garcía',
        publisher: 'sud',
        genreId: 3,
        available: true,
      }),
    ).toEqual({
      deletedAt: null,
      title: { contains: 'cien', mode: 'insensitive' },
      author: { name: { contains: 'garcía', mode: 'insensitive' } },
      publisher: { name: { contains: 'sud', mode: 'insensitive' } },
      genreId: 3,
      stock: { gt: 0 },
    });
  });

  it('available=false filtra libros sin stock', () => {
    expect(buildWhere({ available: false })).toEqual({
      deletedAt: null,
      stock: 0,
    });
  });
});

describe('buildOrderBy', () => {
  it('ordena por el nombre de la relación (género, autor, editorial) y agrega id como desempate', () => {
    expect(
      buildOrderBy([
        { field: 'genre', direction: 'desc' },
        { field: 'author', direction: 'asc' },
        { field: 'publisher', direction: 'desc' },
        { field: 'price', direction: 'asc' },
      ]),
    ).toEqual([
      { genre: { name: 'desc' } },
      { author: { name: 'asc' } },
      { publisher: { name: 'desc' } },
      { price: 'asc' },
      { id: 'asc' },
    ]);
  });
});

describe('PrismaBooksRepository', () => {
  const db = {
    book: {
      findMany: vi.fn(),
      count: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  };
  const repository = new PrismaBooksRepository(
    db as unknown as Prisma.TransactionClient,
  );

  beforeEach(() => vi.resetAllMocks());

  it('findMany pagina y cuenta con el mismo filtro', async () => {
    db.book.findMany.mockResolvedValue([row()]);
    db.book.count.mockResolvedValue(11);

    const page = await repository.findMany({
      filters: { title: 'cien' },
      sort: [{ field: 'title', direction: 'asc' }],
      page: 2,
      limit: 5,
    });

    expect(page.total).toBe(11);
    expect(page.items[0]).toEqual(makeBook());
    expect(page.items[0]).not.toHaveProperty('genreId');
    const args = db.book.findMany.mock.calls[0][0];
    expect(args.skip).toBe(5);
    expect(args.take).toBe(5);
    expect(db.book.count).toHaveBeenCalledWith({ where: args.where });
  });

  it('findActiveById devuelve null si no existe', async () => {
    db.book.findFirst.mockResolvedValue(null);
    await expect(repository.findActiveById(BOOK_ID)).resolves.toBeNull();
    expect(db.book.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: BOOK_ID, deletedAt: null } }),
    );
  });

  it('findActiveById mapea la fila al dominio', async () => {
    db.book.findFirst.mockResolvedValue(row());
    await expect(repository.findActiveById(BOOK_ID)).resolves.toEqual(
      makeBook(),
    );
  });

  it('create inserta y mapea', async () => {
    db.book.create.mockResolvedValue(row());
    const data = {
      title: 'T',
      authorId: 1,
      publisherId: 2,
      price: 1,
      stock: 1,
      genreId: 1,
    };
    await expect(repository.create(data)).resolves.toEqual(makeBook());
    expect(db.book.create).toHaveBeenCalledWith(
      expect.objectContaining({ data }),
    );
  });

  it('update sólo afecta libros activos', async () => {
    db.book.update.mockResolvedValue(row({ price: 5 }));
    const result = await repository.update(BOOK_ID, { price: 5 });
    expect(result.price).toBe(5);
    expect(db.book.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: BOOK_ID, deletedAt: null },
        data: { price: 5 },
      }),
    );
  });

  it('softDelete marca deletedAt en lugar de borrar', async () => {
    const deletedAt = new Date();
    db.book.update.mockResolvedValue(row({ deletedAt }));
    const result = await repository.softDelete(BOOK_ID);
    expect(result.deletedAt).toBe(deletedAt);
    const args = db.book.update.mock.calls[0][0];
    expect(args.where).toEqual({ id: BOOK_ID, deletedAt: null });
    expect(args.data.deletedAt).toBeInstanceOf(Date);
  });

  it('findAllInBatches avanza con cursor hasta agotar los resultados', async () => {
    db.book.findMany
      .mockResolvedValueOnce([row({ id: 'a' }), row({ id: 'b' })])
      .mockResolvedValueOnce([row({ id: 'c' })]);

    const result: string[][] = [];
    for await (const batch of repository.findAllInBatches({}, [], 2)) {
      result.push(batch.map((b) => b.id));
    }

    expect(result).toEqual([['a', 'b'], ['c']]);
    expect(db.book.findMany.mock.calls[0][0]).not.toHaveProperty('cursor');
    expect(db.book.findMany.mock.calls[1][0]).toMatchObject({
      cursor: { id: 'b' },
      skip: 1,
    });
  });

  it('findAllInBatches termina si un lote completo es seguido de uno vacío', async () => {
    db.book.findMany
      .mockResolvedValueOnce([row({ id: 'a' })])
      .mockResolvedValueOnce([]);

    const result: unknown[] = [];
    for await (const batch of repository.findAllInBatches({}, [], 1)) {
      result.push(batch);
    }

    expect(result).toHaveLength(1);
    expect(db.book.findMany).toHaveBeenCalledTimes(2);
  });
});
