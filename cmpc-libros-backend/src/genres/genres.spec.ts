import { Test } from '@nestjs/testing';
import type { Prisma } from '../generated/prisma/client.js';
import { GenresService } from './application/genres.service.js';
import { GenresRepository } from './domain/genres.repository.js';
import { GenresController } from './http/genres.controller.js';
import { PrismaGenresRepository } from './infrastructure/prisma-genres.repository.js';

const GENRES = [
  { id: 2, name: 'Ciencia ficción' },
  { id: 1, name: 'Ficción' },
];

describe('GenresService', () => {
  let service: GenresService;
  const repository = { findAll: vi.fn(), exists: vi.fn() };

  beforeEach(async () => {
    vi.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        GenresService,
        { provide: GenresRepository, useValue: repository },
      ],
    }).compile();
    service = moduleRef.get(GenresService);
  });

  it('findAll delega al repositorio', async () => {
    repository.findAll.mockResolvedValue(GENRES);
    await expect(service.findAll()).resolves.toBe(GENRES);
  });

  it('exists delega al repositorio', async () => {
    repository.exists.mockResolvedValue(true);
    await expect(service.exists(1)).resolves.toBe(true);
    expect(repository.exists).toHaveBeenCalledWith(1);
  });
});

describe('GenresController', () => {
  it('lista el catálogo', async () => {
    const service = { findAll: vi.fn().mockResolvedValue(GENRES) };
    const moduleRef = await Test.createTestingModule({
      controllers: [GenresController],
      providers: [{ provide: GenresService, useValue: service }],
    }).compile();

    await expect(moduleRef.get(GenresController).findAll()).resolves.toBe(
      GENRES,
    );
  });
});

describe('PrismaGenresRepository', () => {
  const db = { genre: { findMany: vi.fn(), count: vi.fn() } };
  const repository = new PrismaGenresRepository(
    db as unknown as Prisma.TransactionClient,
  );

  it('findAll ordena alfabéticamente', async () => {
    db.genre.findMany.mockResolvedValue(GENRES);
    await expect(repository.findAll()).resolves.toBe(GENRES);
    expect(db.genre.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { name: 'asc' } }),
    );
  });

  it.each([
    [1, true],
    [0, false],
  ])('exists con count=%i → %s', async (count, expected) => {
    db.genre.count.mockResolvedValue(count);
    await expect(repository.exists(7)).resolves.toBe(expected);
    expect(db.genre.count).toHaveBeenCalledWith({ where: { id: 7 } });
  });
});
