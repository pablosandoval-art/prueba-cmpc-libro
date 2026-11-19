import type { AuditLog } from '../features/audit/types'
import type { Book, CatalogItem, Genre, Paginated } from '../features/books/types'

export const GENRES: Genre[] = [
  { id: 1, name: 'Ficción' },
  { id: 2, name: 'Ciencia ficción' },
  { id: 3, name: 'Poesía' },
]

export const AUTHORS: CatalogItem[] = [
  { id: 1, name: 'Gabriel García Márquez' },
  { id: 2, name: 'Julio Cortázar' },
  { id: 3, name: 'Isaac Asimov' },
]

export const PUBLISHERS: CatalogItem[] = [
  { id: 1, name: 'Sudamericana' },
  { id: 2, name: 'Alfaguara' },
  { id: 3, name: 'Debolsillo' },
]

export function makeBook(overrides: Partial<Book> = {}): Book {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    title: 'Cien años de soledad',
    author: AUTHORS[0],
    publisher: PUBLISHERS[0],
    price: 18990,
    stock: 14,
    genre: GENRES[0],
    imageUrl: null,
    createdAt: '2026-01-01T12:00:00.000Z',
    updatedAt: '2026-01-02T12:00:00.000Z',
    ...overrides,
  }
}

export const BOOKS: Book[] = [
  makeBook(),
  makeBook({
    id: '22222222-2222-4222-8222-222222222222',
    title: 'Rayuela',
    author: AUTHORS[1],
    publisher: PUBLISHERS[1],
    price: 15990,
    stock: 0,
  }),
  makeBook({
    id: '33333333-3333-4333-8333-333333333333',
    title: 'Fundación',
    author: AUTHORS[2],
    publisher: PUBLISHERS[2],
    price: 14990,
    stock: 2,
    genre: GENRES[1],
    imageUrl: '/uploads/fundacion.png',
  }),
]

export function page(data: Book[], total = data.length, pageNumber = 1, limit = 10): Paginated<Book> {
  return { data, meta: { page: pageNumber, limit, total, totalPages: Math.ceil(total / limit) } }
}

export const SESSION_USER = { id: 'u1', email: 'admin@cmpc.cl', name: 'Administrador' }

const bookSnapshot = (book: Book, extra: Record<string, unknown> = {}) => ({ ...book, deletedAt: null, ...extra })

export function makeAuditLog(overrides: Partial<AuditLog> = {}): AuditLog {
  return {
    id: 'a0000000-0000-4000-8000-000000000001',
    entityType: 'Book',
    entityId: BOOKS[0].id,
    action: 'UPDATE',
    user: SESSION_USER,
    before: bookSnapshot(BOOKS[0]),
    after: bookSnapshot(BOOKS[0], { stock: 20, price: 19990, updatedAt: '2026-01-03T12:00:00.000Z' }),
    createdAt: '2026-11-18T15:30:00.000Z',
    ...overrides,
  }
}

export const AUDIT_LOGS: AuditLog[] = [
  makeAuditLog(),
  makeAuditLog({
    id: 'a0000000-0000-4000-8000-000000000002',
    action: 'CREATE',
    entityType: 'Author',
    entityId: '7',
    before: null,
    after: { id: 7, name: 'Clarice Lispector' },
    createdAt: '2026-11-18T14:00:00.000Z',
  }),
  makeAuditLog({
    id: 'a0000000-0000-4000-8000-000000000003',
    action: 'DELETE',
    entityId: BOOKS[1].id,
    before: bookSnapshot(BOOKS[1]),
    after: bookSnapshot(BOOKS[1], { deletedAt: '2026-11-18T13:00:00.000Z' }),
    createdAt: '2026-11-18T13:00:00.000Z',
  }),
]

export function auditPage(data: AuditLog[], total = data.length, pageNumber = 1, limit = 10): Paginated<AuditLog> {
  return { data, meta: { page: pageNumber, limit, total, totalPages: Math.ceil(total / limit) } }
}
