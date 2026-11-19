import type { AuditService } from '../../audit/application/audit.service.js';
import type { UnitOfWork } from '../../database/unit-of-work.js';
import { Prisma } from '../../generated/prisma/client.js';
import { USER } from '../../testing/fixtures.js';
import { normalizeName } from './catalog.js';
import { NamedCatalogService } from './named-catalog.service.js';
import type { NamedCatalogRepository } from './catalog.js';
import { insertOrFindByName } from './prisma-catalog.js';

describe('normalizeName', () => {
  it.each([
    ['  Isabel   Allende ', 'Isabel Allende'],
    ['J.\tR. R.\nTolkien', 'J. R. R. Tolkien'],
    ['Alfaguara', 'Alfaguara'],
  ])('%j → %j', (input, expected) => {
    expect(normalizeName(input)).toBe(expected);
  });
});

/** Servicio concreto mínimo para probar la lógica compartida. */
class TestCatalogService extends NamedCatalogService {
  constructor(
    repository: NamedCatalogRepository,
    unitOfWork: UnitOfWork,
    audit: AuditService,
    txRepository: NamedCatalogRepository,
  ) {
    super(repository, unitOfWork, audit, 'Thing', () => txRepository);
  }
}

describe('NamedCatalogService', () => {
  const repository = {
    search: vi.fn(),
    exists: vi.fn(),
    findOrCreate: vi.fn(),
  };
  const txRepository = {
    search: vi.fn(),
    exists: vi.fn(),
    findOrCreate: vi.fn(),
  };
  const ctx = {};
  const unitOfWork = { run: vi.fn() };
  const audit = { record: vi.fn() };
  let service: TestCatalogService;

  beforeEach(() => {
    vi.resetAllMocks();
    unitOfWork.run.mockImplementation((work: (c: unknown) => unknown) =>
      work(ctx),
    );
    service = new TestCatalogService(
      repository as never,
      unitOfWork as never,
      audit as never,
      txRepository as never,
    );
  });

  it('search y exists delegan en el repositorio de lectura', async () => {
    repository.search.mockResolvedValue([{ id: 1, name: 'A' }]);
    repository.exists.mockResolvedValue(true);

    await expect(service.search({ search: 'a', limit: 5 })).resolves.toEqual([
      { id: 1, name: 'A' },
    ]);
    await expect(service.exists(1)).resolves.toBe(true);
    expect(repository.search).toHaveBeenCalledWith({ search: 'a', limit: 5 });
  });

  it('crea con el nombre normalizado y audita la creación en la misma transacción', async () => {
    const item = { id: 3, name: 'Isabel Allende' };
    txRepository.findOrCreate.mockResolvedValue({ item, created: true });

    await expect(
      service.findOrCreate('  Isabel   Allende ', USER.id),
    ).resolves.toEqual({ item, created: true });

    expect(txRepository.findOrCreate).toHaveBeenCalledWith('Isabel Allende');
    expect(audit.record).toHaveBeenCalledWith(ctx, {
      entityType: 'Thing',
      entityId: '3',
      action: 'CREATE',
      userId: USER.id,
      before: null,
      after: item,
    });
  });

  it('si ya existía devuelve el registro y no audita', async () => {
    const item = { id: 3, name: 'Isabel Allende' };
    txRepository.findOrCreate.mockResolvedValue({ item, created: false });

    await expect(
      service.findOrCreate('isabel allende', USER.id),
    ).resolves.toEqual({
      item,
      created: false,
    });
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('propaga el error si la auditoría falla (se revierte la transacción)', async () => {
    txRepository.findOrCreate.mockResolvedValue({
      item: { id: 1, name: 'X' },
      created: true,
    });
    audit.record.mockRejectedValue(new Error('fallo de auditoría'));

    await expect(service.findOrCreate('X', USER.id)).rejects.toThrow(
      'fallo de auditoría',
    );
  });
});

describe('insertOrFindByName', () => {
  const db = { $queryRaw: vi.fn() };
  const client = db as unknown as Prisma.TransactionClient;

  beforeEach(() => vi.resetAllMocks());

  /** SQL (formato pg, `$1`) y parámetros de la n-ésima consulta ejecutada. */
  function call(n: number) {
    const [strings, ...values] = db.$queryRaw.mock.calls[n] as [
      TemplateStringsArray,
      ...unknown[],
    ];
    const query = new Prisma.Sql([...strings], values);
    return {
      sql: query.text.replace(/\s+/g, ' ').trim(),
      values: query.values,
    };
  }

  it('inserta y devuelve el registro creado', async () => {
    db.$queryRaw.mockResolvedValueOnce([{ id: 7, name: 'Alfaguara' }]);

    await expect(
      insertOrFindByName(client, 'publishers', 'Alfaguara'),
    ).resolves.toEqual({
      item: { id: 7, name: 'Alfaguara' },
      created: true,
    });
    expect(db.$queryRaw).toHaveBeenCalledTimes(1);
    const { sql } = call(0);
    expect(sql).toContain('INSERT INTO "publishers"');
    expect(sql).toContain('ON CONFLICT (lower("name")) DO NOTHING');
  });

  it('si el nombre ya existe (sin distinguir mayúsculas) devuelve el existente', async () => {
    db.$queryRaw
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 2, name: 'Alfaguara' }]);

    await expect(
      insertOrFindByName(client, 'authors', 'ALFAGUARA'),
    ).resolves.toEqual({
      item: { id: 2, name: 'Alfaguara' },
      created: false,
    });
    const { sql, values } = call(1);
    expect(sql).toContain('FROM "authors" WHERE lower("name") = lower($1)');
    expect(values).toEqual(['ALFAGUARA']);
  });

  it('el nombre viaja como parámetro, nunca dentro del SQL', async () => {
    db.$queryRaw.mockResolvedValueOnce([
      { id: 1, name: "x'); DROP TABLE authors;--" },
    ]);
    await insertOrFindByName(client, 'authors', "x'); DROP TABLE authors;--");
    const { sql, values } = call(0);
    expect(sql).not.toContain('DROP TABLE');
    expect(values).toEqual(["x'); DROP TABLE authors;--"]);
  });
});
