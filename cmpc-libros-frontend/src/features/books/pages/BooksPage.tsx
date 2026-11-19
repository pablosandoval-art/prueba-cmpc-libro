import { useCallback, useState } from 'react'
import type { ReactNode } from 'react'
import { Download, Plus } from 'lucide-react'
import { Link, Outlet, useLocation } from 'react-router'
import { Pagination } from '../../../components/table/Pagination'
import { useStaleWhileLoading } from '../../../components/table/useStaleWhileLoading'
import { Button } from '../../../components/ui/Button'
import { EmptyState, ErrorState } from '../../../components/ui/States'
import { plural } from '../../../lib/format'
import { notify } from '../../notifications/toast.store'
import { BookFilters } from '../components/BookFilters'
import { BooksTable } from '../components/BooksTable'
import { DeleteBookDialog } from '../components/DeleteBookDialog'
import { useBookListQuery, useBooksList } from '../hooks'
import { cycleSort, hasActiveFilters } from '../query'
import type { BookModalState } from '../components/BookModal'
import { useBooksStore } from '../store/books.store'
import type { Book, SortField } from '../types'

export function BooksPage() {
  const { query, update } = useBookListQuery()
  const { data, loading, error, refresh } = useBooksList(query)
  const exporting = useBooksStore((s) => s.exporting)
  const exportCsv = useBooksStore((s) => s.exportCsv)
  const { search } = useLocation()
  const [toDelete, setToDelete] = useState<Book | null>(null)

  const { shown, ...load } = useStaleWhileLoading({ data, error, loading })

  const onSort = useCallback((field: SortField) => update({ sort: cycleSort(query.sort, field) }), [update, query.sort])

  async function onExport() {
    try {
      const { title, author, publisher, genreId, available, sort } = query
      await exportCsv({ title, author, publisher, genreId, available, sort })
      notify.success('Exportación lista: revisa tus descargas.')
    } catch (e) {
      notify.error((e as Error).message)
    }
  }

  let overlay: ReactNode = null
  if (error && !data) {
    overlay = <ErrorState message={error} onRetry={refresh} />
  } else if (data && data.data.length === 0 && !loading) {
    overlay = (
      <EmptyState title="Sin resultados">
        {hasActiveFilters(query)
          ? 'Ningún libro coincide con los filtros. Prueba quitando alguno.'
          : 'Aún no hay libros en el catálogo.'}
      </EmptyState>
    )
  }

  return (
    <>
      <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
        <h1 className="type-display text-[40px] md:text-[44px]">Catálogo</h1>
        <p className="pb-1 text-[15px] text-ink-2" aria-live="polite">
          {shown ? plural(shown.meta.total, 'libro', 'libros') : error ? '' : 'Cargando…'}
        </p>
        <div className="flex w-full gap-2.5 sm:ml-auto sm:w-auto">
          <Button
            onClick={onExport}
            loading={exporting}
            disabled={shown?.meta.total === 0}
            icon={<Download aria-hidden className="size-4" />}
            className="flex-1 sm:flex-none"
          >
            {exporting ? 'Exportando…' : 'Exportar CSV'}
          </Button>
          <Link
            to={{ pathname: '/books/new', search }}
            state={{ returnTo: 'catalog' } satisfies BookModalState}
            className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-sheet border-[1.5px] border-flexo bg-flexo px-4 text-sm font-semibold text-white transition-colors duration-150 hover:border-flexo-deep hover:bg-flexo-deep sm:flex-none"
          >
            <Plus aria-hidden className="size-4" />
            Nuevo libro
          </Link>
        </div>
      </div>

      <BookFilters query={query} onChange={update} />

      <BooksTable
        books={shown?.data ?? []}
        sort={query.sort}
        limit={query.limit}
        onSort={onSort}
        onDelete={setToDelete}
        load={load}
        overlay={overlay}
        refreshError={data ? error : null}
        footer={
          shown && (
            <Pagination
              // Mientras llega el resultado nuevo, la página y el tamaño ya reflejan lo pedido.
              meta={load.stale ? { ...shown.meta, page: query.page, limit: query.limit } : shown.meta}
              onPage={(page) => update({ page })}
              onLimit={(limit) => update({ limit })}
            />
          )
        }
      />

      <DeleteBookDialog book={toDelete} onClose={() => setToDelete(null)} />
      <Outlet />
    </>
  )
}
