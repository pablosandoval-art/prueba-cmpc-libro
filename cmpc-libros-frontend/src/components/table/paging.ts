/** Tamaños de página que ofrecen los listados (y que se aceptan en la URL). */
export const PAGE_SIZES = [10, 20, 50] as const
export const DEFAULT_LIMIT = 10

/** Páginas visibles: primera, última y vecinas de la actual, con `null` como elipsis. */
export function pageWindow(page: number, totalPages: number): Array<number | null> {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
  const pages = new Set([1, totalPages, page - 1, page, page + 1])
  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b)
  const result: Array<number | null> = []
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) result.push(null)
    result.push(p)
  })
  return result
}
