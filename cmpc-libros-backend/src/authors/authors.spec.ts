import { HttpStatus } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AuditService } from '../audit/application/audit.service.js';
import type { Prisma } from '../generated/prisma/client.js';
import { UnitOfWork } from '../database/unit-of-work.js';
import { USER } from '../testing/fixtures.js';
import { AuthorsService } from './application/authors.service.js';
import { AuthorsRepository } from './domain/authors.repository.js';
import { AuthorsController } from './http/authors.controller.js';
import { PrismaAuthorsRepository } from './infrastructure/prisma-authors.repository.js';

const ITEM = { id: 5, name: 'Autor de prueba' };

describe('AuthorsService', () => {
  let service: AuthorsService;
  const repository = { search: vi.fn(), exists: vi.fn() };
  const txRepository = { findOrCreate: vi.fn() };
  const ctx = { authors: txRepository };
  const unitOfWork = { run: vi.fn() };
  const audit = { record: vi.fn() };

  beforeEach(async () => {
    vi.resetAllMocks();
    unitOfWork.run.mockImplementation((work: (c: typeof ctx) => unknown) =>
      work(ctx),
    );
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthorsService,
        { provide: AuthorsRepository, useValue: repository },
        { provide: UnitOfWork, useValue: unitOfWork },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();
    service = moduleRef.get(AuthorsService);
  });

  it('busca y comprueba existencia en el repositorio', async () => {
    repository.search.mockResolvedValue([ITEM]);
    repository.exists.mockResolvedValue(false);
    await expect(service.search({ limit: 20 })).resolves.toEqual([ITEM]);
    await expect(service.exists(99)).resolves.toBe(false);
  });

  it('crea usando el repositorio de la transacción y audita como "Author"', async () => {
    txRepository.findOrCreate.mockResolvedValue({ item: ITEM, created: true });
    await service.findOrCreate('  Autor   de prueba ', USER.id);
    expect(txRepository.findOrCreate).toHaveBeenCalledWith('Autor de prueba');
    expect(audit.record).toHaveBeenCalledWith(
      ctx,
      expect.objectContaining({
        entityType: 'Author',
        entityId: '5',
        action: 'CREATE',
      }),
    );
  });
});

describe('AuthorsController', () => {
  let controller: AuthorsController;
  const service = { search: vi.fn(), findOrCreate: vi.fn() };
  const res = { status: vi.fn() };

  beforeEach(async () => {
    vi.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      controllers: [AuthorsController],
      providers: [{ provide: AuthorsService, useValue: service }],
    }).compile();
    controller = moduleRef.get(AuthorsController);
  });

  it('search pasa el texto y el límite; el texto vacío equivale a sin filtro', async () => {
    service.search.mockResolvedValue([ITEM]);
    await expect(
      controller.search({ search: 'pru', limit: 10 }),
    ).resolves.toEqual([ITEM]);
    expect(service.search).toHaveBeenLastCalledWith({
      search: 'pru',
      limit: 10,
    });
    await controller.search({ search: '', limit: 20 });
    expect(service.search).toHaveBeenLastCalledWith({
      search: undefined,
      limit: 20,
    });
  });

  it('create responde 201 si creó el registro', async () => {
    service.findOrCreate.mockResolvedValue({ item: ITEM, created: true });
    await expect(
      controller.create({ name: ITEM.name }, USER, res),
    ).resolves.toEqual(ITEM);
    expect(service.findOrCreate).toHaveBeenCalledWith(ITEM.name, USER.id);
    expect(res.status).toHaveBeenCalledWith(HttpStatus.CREATED);
  });

  it('create responde 200 si ya existía', async () => {
    service.findOrCreate.mockResolvedValue({ item: ITEM, created: false });
    await expect(
      controller.create({ name: ITEM.name }, USER, res),
    ).resolves.toEqual(ITEM);
    expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
  });
});

describe('PrismaAuthorsRepository', () => {
  const db = {
    author: { findMany: vi.fn(), count: vi.fn() },
    $queryRaw: vi.fn(),
  };
  const repository = new PrismaAuthorsRepository(
    db as unknown as Prisma.TransactionClient,
  );

  beforeEach(() => vi.resetAllMocks());

  it('search filtra por nombre (ILIKE), ordena alfabéticamente y limita', async () => {
    db.author.findMany.mockResolvedValue([ITEM]);
    await expect(
      repository.search({ search: 'pru', limit: 5 }),
    ).resolves.toEqual([ITEM]);
    expect(db.author.findMany).toHaveBeenCalledWith({
      where: { name: { contains: 'pru', mode: 'insensitive' } },
      select: { id: true, name: true },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      take: 5,
    });
  });

  it('search sin texto no aplica filtro', async () => {
    db.author.findMany.mockResolvedValue([]);
    await repository.search({ limit: 20 });
    expect(db.author.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: undefined }),
    );
  });

  it.each([
    [1, true],
    [0, false],
  ])('exists con count=%i → %s', async (count, expected) => {
    db.author.count.mockResolvedValue(count);
    await expect(repository.exists(5)).resolves.toBe(expected);
    expect(db.author.count).toHaveBeenCalledWith({ where: { id: 5 } });
  });

  it('findOrCreate usa el alta idempotente sobre la tabla "authors"', async () => {
    db.$queryRaw.mockResolvedValueOnce([ITEM]);
    await expect(repository.findOrCreate(ITEM.name)).resolves.toEqual({
      item: ITEM,
      created: true,
    });
    expect(db.$queryRaw).toHaveBeenCalledTimes(1);
  });
});
