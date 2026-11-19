/** Página de resultados devuelta por los repositorios. */
export interface Page<T> {
  items: T[];
  total: number;
}

export interface PageRequest {
  page: number;
  limit: number;
}

export interface PaginationMeta extends PageRequest {
  total: number;
  totalPages: number;
}

export function buildPaginationMeta(
  { page, limit }: PageRequest,
  total: number,
): PaginationMeta {
  return { page, limit, total, totalPages: Math.ceil(total / limit) };
}

export function toSkip({ page, limit }: PageRequest): number {
  return (page - 1) * limit;
}
