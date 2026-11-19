import { Global, Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { PrismaExceptionFilter } from './prisma-exception.filter.js';
import { PrismaUnitOfWork } from './prisma-unit-of-work.js';
import { PrismaService } from './prisma.service.js';
import { UnitOfWork } from './unit-of-work.js';

/** Infraestructura de persistencia compartida por todos los módulos. */
@Global()
@Module({
  providers: [
    PrismaService,
    { provide: UnitOfWork, useClass: PrismaUnitOfWork },
    { provide: APP_FILTER, useClass: PrismaExceptionFilter },
  ],
  exports: [PrismaService, UnitOfWork],
})
export class DatabaseModule {}
