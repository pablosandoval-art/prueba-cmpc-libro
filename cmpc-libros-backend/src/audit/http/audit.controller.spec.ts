import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { BOOK_ID, makeAuditLog } from '../../testing/fixtures.js';
import { AuditService } from '../application/audit.service.js';
import { AuditLogResponseDto } from './audit-log.dto.js';
import { AuditController } from './audit.controller.js';

describe('AuditController', () => {
  let controller: AuditController;
  const service = { findAll: vi.fn() };

  beforeEach(async () => {
    vi.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      controllers: [AuditController],
      providers: [{ provide: AuditService, useValue: service }],
    }).compile();
    controller = moduleRef.get(AuditController);
  });

  it('separa paginación de filtros y arma la respuesta', async () => {
    service.findAll.mockResolvedValue({ items: [makeAuditLog()], total: 1 });

    const result = await controller.findAll({
      page: 1,
      limit: 20,
      entityType: 'Book',
      entityId: BOOK_ID,
    });

    expect(service.findAll).toHaveBeenCalledWith({
      filters: { entityType: 'Book', entityId: BOOK_ID },
      page: 1,
      limit: 20,
    });
    expect(result.meta).toEqual({
      page: 1,
      limit: 20,
      total: 1,
      totalPages: 1,
    });
    expect(result.data[0]).toBeInstanceOf(AuditLogResponseDto);
    expect(result.data[0].user.email).toBe('admin@cmpc.cl');
  });

  it('convierte el rango de fechas a Date', async () => {
    service.findAll.mockResolvedValue({ items: [], total: 0 });

    await controller.findAll({
      page: 1,
      limit: 20,
      action: 'DELETE',
      from: '2026-11-18T00:00:00-03:00',
      to: '2026-11-18T23:59:59.999-03:00',
    });

    expect(service.findAll).toHaveBeenCalledWith({
      filters: {
        action: 'DELETE',
        from: new Date('2026-11-18T03:00:00.000Z'),
        to: new Date('2026-11-19T02:59:59.999Z'),
      },
      page: 1,
      limit: 20,
    });
  });

  it('rechaza un rango invertido', async () => {
    await expect(
      controller.findAll({
        page: 1,
        limit: 20,
        from: '2026-11-19T00:00:00Z',
        to: '2026-11-18T00:00:00Z',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(service.findAll).not.toHaveBeenCalled();
  });
});
