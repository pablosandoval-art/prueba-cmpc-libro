import { HttpStatus } from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { PrismaAuditLogsRepository } from '../audit/infrastructure/prisma-audit-logs.repository.js';
import { PrismaAuthorsRepository } from '../authors/infrastructure/prisma-authors.repository.js';
import { PrismaBooksRepository } from '../books/infrastructure/prisma-books.repository.js';
import { PrismaPublishersRepository } from '../publishers/infrastructure/prisma-publishers.repository.js';
import type { EnvironmentVariables } from '../config/env.validation.js';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaExceptionFilter } from './prisma-exception.filter.js';
import { PrismaUnitOfWork } from './prisma-unit-of-work.js';
import { PrismaService } from './prisma.service.js';

describe('PrismaUnitOfWork', () => {
  it('ejecuta el trabajo dentro de $transaction con repositorios ligados a ella', async () => {
    const tx = {};
    const prisma = {
      $transaction: vi.fn((fn: (client: unknown) => unknown) => fn(tx)),
    };
    const uow = new PrismaUnitOfWork(prisma as unknown as PrismaService);

    const result = await uow.run(async (ctx) => {
      expect(ctx.books).toBeInstanceOf(PrismaBooksRepository);
      expect(ctx.auditLogs).toBeInstanceOf(PrismaAuditLogsRepository);
      expect(ctx.authors).toBeInstanceOf(PrismaAuthorsRepository);
      expect(ctx.publishers).toBeInstanceOf(PrismaPublishersRepository);
      return 'ok';
    });

    expect(result).toBe('ok');
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });
});

describe('PrismaExceptionFilter', () => {
  const filter = new PrismaExceptionFilter();

  function run(code: string) {
    const json = vi.fn();
    const status = vi.fn(() => ({ status, json }));
    const host = {
      switchToHttp: () => ({ getResponse: () => ({ status, json }) }),
    } as unknown as ArgumentsHost;
    const error = new Prisma.PrismaClientKnownRequestError('detalle interno', {
      code,
      clientVersion: '7.10.1',
    });
    filter.catch(error, host);
    return { status, json };
  }

  it.each([
    ['P2002', HttpStatus.CONFLICT],
    ['P2003', HttpStatus.BAD_REQUEST],
    ['P2025', HttpStatus.NOT_FOUND],
    ['P9999', HttpStatus.INTERNAL_SERVER_ERROR],
  ])('traduce %s a HTTP %i sin exponer el detalle', (code, expected) => {
    const { status, json } = run(code);
    expect(status).toHaveBeenCalledWith(expected);
    const body = json.mock.calls[0][0] as {
      statusCode: number;
      message: string;
    };
    expect(body.statusCode).toBe(expected);
    expect(body.message).not.toContain('detalle interno');
  });
});

describe('PrismaService', () => {
  const config = { get: () => 'postgresql://u:p@localhost:5432/db' };

  it('conecta al iniciar el módulo y desconecta al destruirlo', async () => {
    const service = new PrismaService(
      config as unknown as ConfigService<EnvironmentVariables, true>,
    );
    const connect = vi.spyOn(service, '$connect').mockResolvedValue();
    const disconnect = vi.spyOn(service, '$disconnect').mockResolvedValue();

    await service.onModuleInit();
    await service.onModuleDestroy();

    expect(connect).toHaveBeenCalledTimes(1);
    expect(disconnect).toHaveBeenCalledTimes(1);
  });
});
