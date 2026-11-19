import type {
  CatalogItem,
  CatalogSearch,
  FindOrCreateResult,
} from '../../common/catalog/catalog.js';
import { insertOrFindByName } from '../../common/catalog/prisma-catalog.js';
import type { Prisma } from '../../generated/prisma/client.js';
import type { AuthorsRepository } from '../domain/authors.repository.js';

export class PrismaAuthorsRepository implements AuthorsRepository {
  constructor(private readonly db: Prisma.TransactionClient) {}

  search({ search, limit }: CatalogSearch): Promise<CatalogItem[]> {
    return this.db.author.findMany({
      where: search
        ? { name: { contains: search, mode: 'insensitive' } }
        : undefined,
      select: { id: true, name: true },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      take: limit,
    });
  }

  async exists(id: number): Promise<boolean> {
    return (await this.db.author.count({ where: { id } })) > 0;
  }

  findOrCreate(name: string): Promise<FindOrCreateResult> {
    return insertOrFindByName(this.db, 'authors', name);
  }
}
