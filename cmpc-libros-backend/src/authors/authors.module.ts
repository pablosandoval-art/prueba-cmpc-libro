import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module.js';
import { PrismaService } from '../database/prisma.service.js';
import { AuthorsService } from './application/authors.service.js';
import { AuthorsRepository } from './domain/authors.repository.js';
import { AuthorsController } from './http/authors.controller.js';
import { PrismaAuthorsRepository } from './infrastructure/prisma-authors.repository.js';

@Module({
  imports: [AuditModule],
  controllers: [AuthorsController],
  providers: [
    AuthorsService,
    {
      provide: AuthorsRepository,
      useFactory: (prisma: PrismaService) =>
        new PrismaAuthorsRepository(prisma),
      inject: [PrismaService],
    },
  ],
  exports: [AuthorsService],
})
export class AuthorsModule {}
