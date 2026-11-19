import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { AuditModule } from '../audit/audit.module.js';
import { AuthorsModule } from '../authors/authors.module.js';
import type { EnvironmentVariables } from '../config/env.validation.js';
import { PrismaService } from '../database/prisma.service.js';
import { GenresModule } from '../genres/genres.module.js';
import { PublishersModule } from '../publishers/publishers.module.js';
import { StorageModule } from '../storage/storage.module.js';
import { BooksCsvSerializer } from './application/books-csv.serializer.js';
import { BooksService } from './application/books.service.js';
import { BooksRepository } from './domain/books.repository.js';
import { BooksController } from './http/books.controller.js';
import { PrismaBooksRepository } from './infrastructure/prisma-books.repository.js';

@Module({
  imports: [
    AuditModule,
    GenresModule,
    AuthorsModule,
    PublishersModule,
    StorageModule,
    // Imágenes en memoria (se escriben vía ImageStorage) con límite de tamaño:
    // Multer corta la subida y responde 413 si se excede.
    MulterModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvironmentVariables, true>) => ({
        limits: {
          fileSize: config.get('UPLOAD_MAX_BYTES', { infer: true }),
          files: 1,
        },
      }),
    }),
  ],
  controllers: [BooksController],
  providers: [
    BooksService,
    BooksCsvSerializer,
    {
      provide: BooksRepository,
      useFactory: (prisma: PrismaService) => new PrismaBooksRepository(prisma),
      inject: [PrismaService],
    },
  ],
})
export class BooksModule {}
