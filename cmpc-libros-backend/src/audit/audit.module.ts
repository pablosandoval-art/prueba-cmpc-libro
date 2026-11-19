import { Module } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { AuditService } from './application/audit.service.js';
import { AuditLogsRepository } from './domain/audit-logs.repository.js';
import { AuditController } from './http/audit.controller.js';
import { PrismaAuditLogsRepository } from './infrastructure/prisma-audit-logs.repository.js';

@Module({
  controllers: [AuditController],
  providers: [
    AuditService,
    {
      provide: AuditLogsRepository,
      useFactory: (prisma: PrismaService) =>
        new PrismaAuditLogsRepository(prisma),
      inject: [PrismaService],
    },
  ],
  exports: [AuditService],
})
export class AuditModule {}
