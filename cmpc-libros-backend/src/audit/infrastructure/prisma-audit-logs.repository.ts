import type { Page } from '../../common/pagination/pagination.js';
import { toSkip } from '../../common/pagination/pagination.js';
import { Prisma } from '../../generated/prisma/client.js';
import type {
  AuditLog,
  AuditLogFilters,
  AuditLogQuery,
  AuditSnapshot,
  NewAuditLog,
} from '../domain/audit-log.js';
import type { AuditLogsRepository } from '../domain/audit-logs.repository.js';

const AUDIT_INCLUDE = {
  user: { select: { id: true, email: true, name: true } },
} satisfies Prisma.AuditLogInclude;

type AuditLogRow = Prisma.AuditLogGetPayload<{ include: typeof AUDIT_INCLUDE }>;

function toJsonInput(snapshot: AuditSnapshot | null) {
  return snapshot === null
    ? Prisma.DbNull
    : (snapshot as Prisma.InputJsonObject);
}

function toDomain(row: AuditLogRow): AuditLog {
  return {
    id: row.id,
    entityType: row.entityType,
    entityId: row.entityId,
    action: row.action,
    userId: row.userId,
    before: row.before as AuditSnapshot | null,
    after: row.after as AuditSnapshot | null,
    createdAt: row.createdAt,
    user: row.user,
  };
}

export function buildAuditWhere(
  filters: AuditLogFilters,
): Prisma.AuditLogWhereInput {
  const where: Prisma.AuditLogWhereInput = {};
  if (filters.entityType) where.entityType = filters.entityType;
  if (filters.entityId) where.entityId = filters.entityId;
  if (filters.userId) where.userId = filters.userId;
  if (filters.action) where.action = filters.action;
  if (filters.from || filters.to) {
    where.createdAt = {
      ...(filters.from && { gte: filters.from }),
      ...(filters.to && { lte: filters.to }),
    };
  }
  return where;
}

export class PrismaAuditLogsRepository implements AuditLogsRepository {
  constructor(private readonly db: Prisma.TransactionClient) {}

  async create(entry: NewAuditLog): Promise<void> {
    await this.db.auditLog.create({
      data: {
        entityType: entry.entityType,
        entityId: entry.entityId,
        action: entry.action,
        userId: entry.userId,
        before: toJsonInput(entry.before),
        after: toJsonInput(entry.after),
      },
    });
  }

  async findMany(query: AuditLogQuery): Promise<Page<AuditLog>> {
    const where = buildAuditWhere(query.filters);
    const [rows, total] = await Promise.all([
      this.db.auditLog.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: toSkip(query),
        take: query.limit,
        include: AUDIT_INCLUDE,
      }),
      this.db.auditLog.count({ where }),
    ]);
    return { items: rows.map(toDomain), total };
  }
}
