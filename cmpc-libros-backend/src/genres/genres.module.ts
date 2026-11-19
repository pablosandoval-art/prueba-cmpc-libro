import { Module } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { GenresService } from './application/genres.service.js';
import { GenresRepository } from './domain/genres.repository.js';
import { GenresController } from './http/genres.controller.js';
import { PrismaGenresRepository } from './infrastructure/prisma-genres.repository.js';

@Module({
  controllers: [GenresController],
  providers: [
    GenresService,
    {
      provide: GenresRepository,
      useFactory: (prisma: PrismaService) => new PrismaGenresRepository(prisma),
      inject: [PrismaService],
    },
  ],
  exports: [GenresService],
})
export class GenresModule {}
