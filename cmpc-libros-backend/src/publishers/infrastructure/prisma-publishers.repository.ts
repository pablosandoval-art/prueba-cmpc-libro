import type {
  CatalogItem,
  CatalogSearch,
  FindOrCreateResult,
} from '../../common/catalog/catalog.js';
import { insertOrFindByName } from '../../common/catalog/prisma-catalog.js';
import type { Prisma } from '../../generated/prisma/client.js';
import type { PublishersRepository } from '../domain/publishers.repository.js';

export class PrismaPublishersRepository implements PublishersRepository {
  constructor(private readonly db: Prisma.TransactionClient) {}

  search({ search, limit }: CatalogSearch): Promise<CatalogItem[]> {
    return this.db.publisher.findMany({
      where: search
        ? { name: { contains: search, mode: 'insensitive' } }
        : undefined,
      select: { id: true, name: true },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      take: limit,
    });
  }

  async exists(id: number): Promise<boolean> {
    return (await this.db.publisher.count({ where: { id } })) > 0;
  }

  findOrCreate(name: string): Promise<FindOrCreateResult> {
    return insertOrFindByName(this.db, 'publishers', name);
  }
}
