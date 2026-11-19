import { Module } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { UsersRepository } from './domain/users.repository.js';
import { PrismaUsersRepository } from './infrastructure/prisma-users.repository.js';

@Module({
  providers: [
    {
      provide: UsersRepository,
      useFactory: (prisma: PrismaService) => new PrismaUsersRepository(prisma),
      inject: [PrismaService],
    },
  ],
  exports: [UsersRepository],
})
export class UsersModule {}
