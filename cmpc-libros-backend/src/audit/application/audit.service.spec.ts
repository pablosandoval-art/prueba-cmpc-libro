import { Test } from '@nestjs/testing';
import {
  BOOK_ID,
  USER,
  makeAuditLog,
  makeBook,
} from '../../testing/fixtures.js';
import { AuditLogsRepository } from '../domain/audit-logs.repository.js';
import { AuditService, toSnapshot } from './audit.service.js';

describe('toSnapshot', () => {
  it('convierte fechas a ISO y conserva null', () => {
    expect(toSnapshot(null)).toBeNull();
    expect(toSnapshot({ at: new Date('2026-01-01T00:00:00.000Z') })).toEqual({
      at: '2026-01-01T00:00:00.000Z',
    });
  });
});

describe('AuditService', () => {
  let service: AuditService;
  const repository = { create: vi.fn(), findMany: vi.fn() };

  beforeEach(async () => {
    vi.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuditService,
        { provide: AuditLogsRepository, useValue: repository },
      ],
    }).compile();
    service = moduleRef.get(AuditService);
  });

  it('record escribe en el repositorio de la transacción, no en el global', async () => {
    const txAuditLogs = { create: vi.fn() };
    const before = makeBook();
    const after = makeBook({ price: 1 });

    await service.record(
      { auditLogs: txAuditLogs as never },
      {
        entityType: 'Book',
        entityId: BOOK_ID,
        action: 'UPDATE',
        userId: USER.id,
        before,
        after,
      },
    );

    expect(repository.create).not.toHaveBeenCalled();
    expect(txAuditLogs.create).toHaveBeenCalledWith({
      entityType: 'Book',
      entityId: BOOK_ID,
      action: 'UPDATE',
      userId: USER.id,
      before: expect.objectContaining({
        createdAt: '2026-01-01T00:00:00.000Z',
      }),
      after: expect.objectContaining({ price: 1 }),
    });
  });

  it('findAll delega la consulta paginada', async () => {
    const page = { items: [makeAuditLog()], total: 1 };
    repository.findMany.mockResolvedValue(page);
    const query = {
      filters: { action: 'CREATE' as const },
      page: 1,
      limit: 10,
    };

    await expect(service.findAll(query)).resolves.toBe(page);
    expect(repository.findMany).toHaveBeenCalledWith(query);
  });
});
