import { Injectable } from '@nestjs/common';
import { PrismaAuditLogsRepository } from '../audit/infrastructure/prisma-audit-logs.repository.js';
import { PrismaAuthorsRepository } from '../authors/infrastructure/prisma-authors.repository.js';
import { PrismaBooksRepository } from '../books/infrastructure/prisma-books.repository.js';
import { PrismaPublishersRepository } from '../publishers/infrastructure/prisma-publishers.repository.js';
import { PrismaService } from './prisma.service.js';
import type { TransactionContext, UnitOfWork } from './unit-of-work.js';

/** UnitOfWork sobre una transacción interactiva de Prisma. */
@Injectable()
export class PrismaUnitOfWork implements UnitOfWork {
  constructor(private readonly prisma: PrismaService) {}

  run<T>(work: (ctx: TransactionContext) => Promise<T>): Promise<T> {
    return this.prisma.$transaction((tx) =>
      work({
        books: new PrismaBooksRepository(tx),
        authors: new PrismaAuthorsRepository(tx),
        publishers: new PrismaPublishersRepository(tx),
        auditLogs: new PrismaAuditLogsRepository(tx),
      }),
    );
  }
}
