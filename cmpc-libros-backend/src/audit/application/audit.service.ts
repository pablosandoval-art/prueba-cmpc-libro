import { Injectable, Logger } from '@nestjs/common';
import type { Page } from '../../common/pagination/pagination.js';
import type { TransactionContext } from '../../database/unit-of-work.js';
import type {
  AuditAction,
  AuditLog,
  AuditLogQuery,
  AuditSnapshot,
} from '../domain/audit-log.js';
import { AuditLogsRepository } from '../domain/audit-logs.repository.js';

export interface AuditEntry {
  entityType: string;
  entityId: string;
  action: AuditAction;
  userId: string;
  before: object | null;
  after: object | null;
}

/** Convierte una entidad a JSON plano (fechas → ISO 8601). */
export function toSnapshot(value: object | null): AuditSnapshot | null {
  return value === null
    ? null
    : (JSON.parse(JSON.stringify(value)) as AuditSnapshot);
}

/**
 * Auditoría reutilizable por cualquier módulo.
 *
 * `record` recibe el contexto transaccional del UnitOfWork: el registro de
 * auditoría se confirma o se revierte junto con la operación auditada.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly auditLogs: AuditLogsRepository) {}

  async record(
    ctx: Pick<TransactionContext, 'auditLogs'>,
    entry: AuditEntry,
  ): Promise<void> {
    await ctx.auditLogs.create({
      ...entry,
      before: toSnapshot(entry.before),
      after: toSnapshot(entry.after),
    });
    // Rastro operativo de cada escritura; el detalle (antes/después) queda en audit_logs.
    this.logger.log(
      {
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        userId: entry.userId,
      },
      `Auditoría: ${entry.action} ${entry.entityType} ${entry.entityId}`,
    );
  }

  findAll(query: AuditLogQuery): Promise<Page<AuditLog>> {
    return this.auditLogs.findMany(query);
  }
}
