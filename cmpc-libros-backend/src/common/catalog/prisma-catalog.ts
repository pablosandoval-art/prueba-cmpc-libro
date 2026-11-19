import { Prisma } from '../../generated/prisma/client.js';
import type { CatalogItem, FindOrCreateResult } from './catalog.js';

export type CatalogTable = 'authors' | 'publishers';

/**
 * Alta idempotente con SQL nativo: `ON CONFLICT DO NOTHING` sobre el índice
 * único `lower(name)`. A diferencia de capturar el error de unicidad, no
 * aborta la transacción en curso y es seguro ante peticiones simultáneas.
 *
 * `table` es una unión de literales fijada por el código (nunca entrada del
 * usuario); el nombre viaja siempre como parámetro.
 */
export async function insertOrFindByName(
  db: Prisma.TransactionClient,
  table: CatalogTable,
  name: string,
): Promise<FindOrCreateResult> {
  const target = Prisma.raw(`"${table}"`);

  const inserted = await db.$queryRaw<CatalogItem[]>`
    INSERT INTO ${target} ("name") VALUES (${name})
    ON CONFLICT (lower("name")) DO NOTHING
    RETURNING "id", "name"`;
  if (inserted.length > 0) return { item: inserted[0], created: true };

  const existing = await db.$queryRaw<CatalogItem[]>`
    SELECT "id", "name" FROM ${target} WHERE lower("name") = lower(${name})`;
  return { item: existing[0], created: false };
}
