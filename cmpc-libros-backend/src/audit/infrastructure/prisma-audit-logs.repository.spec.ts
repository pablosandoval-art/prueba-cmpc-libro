import { Prisma } from '../../generated/prisma/client.js';
import { BOOK_ID, USER, makeAuditLog } from '../../testing/fixtures.js';
import {
  PrismaAuditLogsRepository,
  buildAuditWhere,
} from './prisma-audit-logs.repository.js';

describe('buildAuditWhere', () => {
  it('incluye sólo los filtros presentes', () => {
    expect(buildAuditWhere({})).toEqual({});
    expect(
      buildAuditWhere({
        entityType: 'Book',
        entityId: BOOK_ID,
        userId: USER.id,
        action: 'DELETE',
      }),
    ).toEqual({
      entityType: 'Book',
      entityId: BOOK_ID,
      userId: USER.id,
      action: 'DELETE',
    });
  });

  it('arma el rango de fechas con límites inclusivos, también abierto por un extremo', () => {
    const from = new Date('2026-11-18T03:00:00.000Z');
    const to = new Date('2026-11-19T02:59:59.999Z');
    expect(buildAuditWhere({ from, to })).toEqual({
      createdAt: { gte: from, lte: to },
    });
    expect(buildAuditWhere({ from })).toEqual({ createdAt: { gte: from } });
    expect(buildAuditWhere({ to })).toEqual({ createdAt: { lte: to } });
  });
});

describe('PrismaAuditLogsRepository', () => {
  const db = {
    auditLog: { create: vi.fn(), findMany: vi.fn(), count: vi.fn() },
  };
  const repository = new PrismaAuditLogsRepository(
    db as unknown as Prisma.TransactionClient,
  );

  beforeEach(() => vi.resetAllMocks());

  it('create guarda null de BD cuando no hay snapshot', async () => {
    await repository.create({
      entityType: 'Book',
      entityId: BOOK_ID,
      action: 'CREATE',
      userId: USER.id,
      before: null,
      after: { title: 'X' },
    });

    expect(db.auditLog.create).toHaveBeenCalledWith({
      data: {
        entityType: 'Book',
        entityId: BOOK_ID,
        action: 'CREATE',
        userId: USER.id,
        before: Prisma.DbNull,
        after: { title: 'X' },
      },
    });
  });

  it('findMany ordena por fecha descendente y pagina', async () => {
    const log = makeAuditLog();
    db.auditLog.findMany.mockResolvedValue([log]);
    db.auditLog.count.mockResolvedValue(30);

    const page = await repository.findMany({
      filters: { action: 'CREATE' },
      page: 3,
      limit: 10,
    });

    expect(page).toEqual({ items: [log], total: 30 });
    expect(db.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { action: 'CREATE' },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: 20,
        take: 10,
      }),
    );
  });
});
