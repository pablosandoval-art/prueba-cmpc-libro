import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module.js';
import { PrismaService } from '../database/prisma.service.js';
import { PublishersService } from './application/publishers.service.js';
import { PublishersRepository } from './domain/publishers.repository.js';
import { PublishersController } from './http/publishers.controller.js';
import { PrismaPublishersRepository } from './infrastructure/prisma-publishers.repository.js';

@Module({
  imports: [AuditModule],
  controllers: [PublishersController],
  providers: [
    PublishersService,
    {
      provide: PublishersRepository,
      useFactory: (prisma: PrismaService) =>
        new PrismaPublishersRepository(prisma),
      inject: [PrismaService],
    },
  ],
  exports: [PublishersService],
})
export class PublishersModule {}
