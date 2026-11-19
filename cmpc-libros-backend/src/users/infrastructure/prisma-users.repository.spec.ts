import type { Prisma } from '../../generated/prisma/client.js';
import { USER } from '../../testing/fixtures.js';
import { PrismaUsersRepository } from './prisma-users.repository.js';

describe('PrismaUsersRepository', () => {
  const db = { user: { findUnique: vi.fn() } };
  const repository = new PrismaUsersRepository(
    db as unknown as Prisma.TransactionClient,
  );

  beforeEach(() => vi.resetAllMocks());

  it('busca por email normalizado a minúsculas', async () => {
    db.user.findUnique.mockResolvedValue(null);
    await expect(repository.findByEmail('Admin@CMPC.cl')).resolves.toBeNull();
    expect(db.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'admin@cmpc.cl' },
    });
  });

  it('mapea la fila al dominio sin campos de auditoría', async () => {
    db.user.findUnique.mockResolvedValue({
      ...USER,
      passwordHash: 'hash',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await expect(repository.findByEmail(USER.email)).resolves.toEqual({
      ...USER,
      passwordHash: 'hash',
      isActive: true,
    });
  });
});
