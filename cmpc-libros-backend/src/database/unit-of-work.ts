import type { AuditLogsRepository } from '../audit/domain/audit-logs.repository.js';
import type { AuthorsRepository } from '../authors/domain/authors.repository.js';
import type { BooksRepository } from '../books/domain/books.repository.js';
import type { PublishersRepository } from '../publishers/domain/publishers.repository.js';

/** Repositorios ligados a una misma transacción. */
export interface TransactionContext {
  readonly books: BooksRepository;
  readonly authors: AuthorsRepository;
  readonly publishers: PublishersRepository;
  readonly auditLogs: AuditLogsRepository;
}

/**
 * Ejecuta un bloque de trabajo de forma atómica: si `work` lanza una
 * excepción, todas las escrituras hechas a través del contexto se revierten.
 */
export abstract class UnitOfWork {
  abstract run<T>(work: (ctx: TransactionContext) => Promise<T>): Promise<T>;
}
