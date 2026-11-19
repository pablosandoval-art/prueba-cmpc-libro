import type { Page } from '../../common/pagination/pagination.js';
import type { AuditLog, AuditLogQuery, NewAuditLog } from './audit-log.js';

/** Contrato de persistencia de la bitácora de auditoría (token DI). */
export abstract class AuditLogsRepository {
  abstract create(entry: NewAuditLog): Promise<void>;
  abstract findMany(query: AuditLogQuery): Promise<Page<AuditLog>>;
}
