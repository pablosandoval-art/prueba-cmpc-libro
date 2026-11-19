import type { Prisma } from '../../generated/prisma/client.js';
import type { User } from '../domain/user.js';
import type { UsersRepository } from '../domain/users.repository.js';

export class PrismaUsersRepository implements UsersRepository {
  constructor(private readonly db: Prisma.TransactionClient) {}

  async findByEmail(email: string): Promise<User | null> {
    const row = await this.db.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (!row) return null;
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      passwordHash: row.passwordHash,
      isActive: row.isActive,
    };
  }
}
