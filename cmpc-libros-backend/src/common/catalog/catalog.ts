/** Entrada de un catálogo simple de nombres únicos (autores, editoriales). */
export interface CatalogItem {
  id: number;
  name: string;
}

export interface CatalogSearch {
  /** Texto a buscar dentro del nombre, sin distinguir mayúsculas. */
  search?: string;
  limit: number;
}

export interface FindOrCreateResult {
  item: CatalogItem;
  /** `false` si ya existía un registro con ese nombre. */
  created: boolean;
}

/**
 * Contrato de persistencia de un catálogo de nombres únicos.
 * Cada catálogo concreto lo extiende para tener su propio token de DI.
 */
export abstract class NamedCatalogRepository {
  abstract search(query: CatalogSearch): Promise<CatalogItem[]>;
  abstract exists(id: number): Promise<boolean>;
  /**
   * Crea el registro o devuelve el existente con el mismo nombre (sin
   * distinguir mayúsculas). Es seguro ante peticiones simultáneas.
   */
  abstract findOrCreate(name: string): Promise<FindOrCreateResult>;
}

/** Quita espacios en los extremos y colapsa los espacios repetidos. */
export function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}
