import { AuditService } from '../../audit/application/audit.service.js';
import type { TransactionContext } from '../../database/unit-of-work.js';
import { UnitOfWork } from '../../database/unit-of-work.js';
import { normalizeName } from './catalog.js';
import type {
  CatalogItem,
  CatalogSearch,
  FindOrCreateResult,
  NamedCatalogRepository,
} from './catalog.js';

/**
 * Lógica común de los catálogos de nombres (autores, editoriales).
 * Las lecturas van directo al repositorio; el alta se hace dentro de una
 * transacción junto con su registro de auditoría.
 */
export abstract class NamedCatalogService {
  protected constructor(
    private readonly repository: NamedCatalogRepository,
    private readonly unitOfWork: UnitOfWork,
    private readonly audit: AuditService,
    private readonly entityType: string,
    private readonly pick: (ctx: TransactionContext) => NamedCatalogRepository,
  ) {}

  search(query: CatalogSearch): Promise<CatalogItem[]> {
    return this.repository.search(query);
  }

  exists(id: number): Promise<boolean> {
    return this.repository.exists(id);
  }

  /** Busca por nombre o lo crea. Sólo la creación real queda auditada. */
  findOrCreate(name: string, userId: string): Promise<FindOrCreateResult> {
    const clean = normalizeName(name);
    return this.unitOfWork.run(async (ctx) => {
      const result = await this.pick(ctx).findOrCreate(clean);
      if (result.created) {
        await this.audit.record(ctx, {
          entityType: this.entityType,
          entityId: String(result.item.id),
          action: 'CREATE',
          userId,
          before: null,
          after: result.item,
        });
      }
      return result;
    });
  }
}
