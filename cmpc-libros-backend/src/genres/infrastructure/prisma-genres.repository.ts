import type { Prisma } from '../../generated/prisma/client.js';
import type { Genre } from '../domain/genre.js';
import type { GenresRepository } from '../domain/genres.repository.js';

export class PrismaGenresRepository implements GenresRepository {
  constructor(private readonly db: Prisma.TransactionClient) {}

  findAll(): Promise<Genre[]> {
    return this.db.genre.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  }

  async exists(id: number): Promise<boolean> {
    const count = await this.db.genre.count({ where: { id } });
    return count > 0;
  }
}
