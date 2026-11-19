import type { AuditLog } from '../audit/domain/audit-log.js';
import type { Book } from '../books/domain/book.js';
import type { AuthenticatedUser } from '../common/auth/authenticated-user.js';

export const USER: AuthenticatedUser = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'admin@cmpc.cl',
  name: 'Administrador',
};

export const AUTHOR = { id: 1, name: 'Gabriel García Márquez' };
export const PUBLISHER = { id: 1, name: 'Sudamericana' };

export const BOOK_ID = '22222222-2222-4222-8222-222222222222';

export function makeBook(overrides: Partial<Book> = {}): Book {
  return {
    id: BOOK_ID,
    title: 'Cien años de soledad',
    author: AUTHOR,
    publisher: PUBLISHER,
    price: 18990,
    stock: 14,
    genre: { id: 1, name: 'Ficción' },
    imageUrl: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    deletedAt: null,
    ...overrides,
  };
}

export function makeAuditLog(overrides: Partial<AuditLog> = {}): AuditLog {
  return {
    id: '33333333-3333-4333-8333-333333333333',
    entityType: 'Book',
    entityId: BOOK_ID,
    action: 'CREATE',
    userId: USER.id,
    before: null,
    after: { title: 'Cien años de soledad' },
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    user: USER,
    ...overrides,
  };
}

/** Async generator a partir de lotes, para simular `findAllInBatches`. */
export async function* batches<T>(...items: T[][]): AsyncGenerator<T[]> {
  for (const batch of items) yield batch;
}
