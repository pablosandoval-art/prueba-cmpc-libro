import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '../ui/cn'
import { formatNumber } from '../../lib/format'
import { PAGE_SIZES, pageWindow } from './paging'
import type { PaginationMeta } from './types'

interface PaginationProps {
  meta: PaginationMeta
  onPage: (page: number) => void
  onLimit: (limit: number) => void
}

export function Pagination({ meta, onPage, onLimit }: PaginationProps) {
  const { page, limit, total, totalPages } = meta
  const from = total === 0 ? 0 : (page - 1) * limit + 1
  const to = Math.min(page * limit, total)
  const navButton =
    'grid size-9 place-items-center rounded-sheet border border-rule text-ink transition-colors duration-150 hover:border-ink disabled:pointer-events-none disabled:opacity-40'

  return (
    <nav aria-label="Paginación" className="flex flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3.5 text-sm md:px-3.5">
      <p className="text-ink-2" aria-live="polite">
        Mostrando{' '}
        <strong className="font-semibold text-ink">
          {formatNumber(from)}–{formatNumber(to)}
        </strong>{' '}
        de <strong className="font-semibold text-ink">{formatNumber(total)}</strong>
      </p>
      <label className="flex items-center gap-2 text-ink-2">
        Por página
        <select
          value={limit}
          onChange={(e) => onLimit(Number(e.target.value))}
          className="h-9 rounded-sheet border border-field bg-sheet px-2 text-ink"
        >
          {PAGE_SIZES.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </label>
      {totalPages > 1 && (
        <div className="flex items-center gap-1.5 sm:ml-auto">
          <button
            type="button"
            className={navButton}
            disabled={page <= 1}
            onClick={() => onPage(page - 1)}
            aria-label="Página anterior"
          >
            <ChevronLeft aria-hidden className="size-4" />
          </button>
          {pageWindow(page, totalPages).map((p, i) =>
            p === null ? (
              <span key={`gap-${i}`} aria-hidden className="w-5 text-center text-ink-3">
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => onPage(p)}
                aria-current={p === page ? 'page' : undefined}
                aria-label={`Página ${p}`}
                className={cn(
                  'grid h-9 min-w-9 place-items-center rounded-sheet px-2 font-semibold transition-colors duration-150',
                  p === page ? 'die-line' : 'border border-rule hover:border-ink',
                )}
              >
                {p}
              </button>
            ),
          )}
          <button
            type="button"
            className={navButton}
            disabled={page >= totalPages}
            onClick={() => onPage(page + 1)}
            aria-label="Página siguiente"
          >
            <ChevronRight aria-hidden className="size-4" />
          </button>
        </div>
      )}
    </nav>
  )
}
