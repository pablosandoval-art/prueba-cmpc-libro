import { memo } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { ArrowDown, ArrowUp, ChevronsUpDown, Eye, Pencil, Trash2 } from 'lucide-react'
import { Link, useLocation } from 'react-router'
import { TableLayout } from '../../../components/table/TableLayout'
import type { TableLoadState } from '../../../components/table/TableLayout'
import { cn } from '../../../components/ui/cn'
import { formatPrice } from '../../../lib/format'
import { COLUMN_LABELS } from '../columns'
import type { Book, SortField, SortTerm } from '../types'
import { BookCover, GenreStamp, StockRamp } from './BookBits'
import type { BookModalState } from './BookModal'

interface Column {
  field: SortField
  align?: 'right'
}

const COLUMNS: Column[] = [
  { field: 'title' },
  { field: 'author' },
  { field: 'publisher' },
  { field: 'genre' },
  { field: 'price', align: 'right' },
  { field: 'stock' },
]

interface BooksTableProps {
  books: Book[]
  sort: SortTerm[]
  /** Filas por página: la tabla siempre ocupa este alto, aunque haya menos resultados. */
  limit: number
  onSort: (field: SortField) => void
  onDelete: (book: Book) => void
  load: TableLoadState
  overlay?: ReactNode
  refreshError?: string | null
  footer?: ReactNode
}

function SortHeader({ column, sort, onSort }: { column: Column; sort: SortTerm[]; onSort: (f: SortField) => void }) {
  const label = COLUMN_LABELS[column.field]
  const index = sort.findIndex((t) => t.field === column.field)
  const term = index >= 0 ? sort[index] : undefined
  const Icon = !term ? ChevronsUpDown : term.direction === 'asc' ? ArrowUp : ArrowDown
  const next = !term ? 'ascendente' : term.direction === 'asc' ? 'descendente' : 'sin orden'
  return (
    <th
      scope="col"
      aria-sort={term ? (term.direction === 'asc' ? 'ascending' : 'descending') : undefined}
      className={cn('lg:px-3.5 lg:py-0 lg:text-left', column.align === 'right' && 'lg:text-right')}
    >
      <button
        type="button"
        onClick={() => onSort(column.field)}
        title={`Ordenar por ${label.toLowerCase()}: ${next}`}
        className={cn(
          'type-label inline-flex h-8 items-center gap-1 rounded-sheet px-2 whitespace-nowrap transition-colors duration-150 lg:h-auto lg:px-0',
          term ? 'die-line text-ink lg:border-0' : 'text-ink-2 hover:text-ink',
        )}
      >
        {label}
        <Icon aria-hidden className={cn('size-3.5 shrink-0', !term && 'opacity-50')} />
        {term && sort.length > 1 && (
          <span className="text-[11px] tabular-nums" aria-label={`prioridad ${index + 1}`}>
            {index + 1}
          </span>
        )}
      </button>
    </th>
  )
}

const iconAction =
  'grid size-8 place-items-center rounded-sheet text-ink-2 transition-colors duration-150 hover:bg-board hover:text-ink'

const BookRow = memo(function BookRow({
  book,
  index,
  onDelete,
  search,
}: {
  book: Book
  index: number
  onDelete: (b: Book) => void
  search: string
}) {
  const out = book.stock <= 0
  return (
    <tr
      style={{ '--i': index } as CSSProperties}
      className={cn(
        'motion-row-in grid grid-cols-[auto_1fr_auto] gap-x-3 gap-y-1 border-b border-rule-soft px-4 py-3 transition-colors duration-150 focus-within:die-outline',
        'lg:table-row lg:h-15 lg:p-0 lg:hover:bg-board/60',
        out && 'text-ink-3',
      )}
    >
      <td className="row-span-3 lg:h-15 lg:pl-3.5 lg:align-middle">
        <BookCover title={book.title} imageUrl={book.imageUrl} muted={out} />
      </td>
      <td className="lg:overflow-hidden lg:px-3.5 lg:align-middle">
        <Link
          to={{ pathname: book.id, search }}
          title={book.title}
          className="line-clamp-2 text-[15px] leading-tight font-[650] text-current hover:underline"
        >
          {book.title}
        </Link>
      </td>
      <td className="col-start-2 text-sm lg:overflow-hidden lg:px-3.5 lg:align-middle lg:text-[15px]">
        <span className="line-clamp-2 leading-tight" title={book.author.name}>
          {book.author.name}
          <span className="text-ink-3 lg:hidden"> · {book.publisher.name}</span>
        </span>
      </td>
      <td className="hidden lg:table-cell lg:overflow-hidden lg:px-3.5 lg:align-middle">
        <span className="line-clamp-2 leading-tight" title={book.publisher.name}>
          {book.publisher.name}
        </span>
      </td>
      <td className="col-start-2 lg:px-3.5 lg:align-middle">
        <GenreStamp name={book.genre.name} muted={out} className="lg:whitespace-normal lg:leading-[1.15]" />
      </td>
      <td className="col-start-3 row-start-1 text-right font-semibold lg:px-3.5 lg:align-middle">
        {formatPrice(book.price)}
      </td>
      <td className="col-start-3 row-start-2 justify-self-end lg:px-3.5 lg:align-middle">
        <StockRamp stock={book.stock} />
      </td>
      <td className="col-start-3 row-start-3 lg:pr-3 lg:align-middle">
        <div className="flex justify-end gap-0.5">
          <Link to={{ pathname: book.id, search }} aria-label={`Ver detalle de ${book.title}`} className={iconAction}>
            <Eye aria-hidden className="size-4.5" />
          </Link>
          <Link
            to={{ pathname: `${book.id}/edit`, search }}
            state={{ returnTo: 'catalog' } satisfies BookModalState}
            aria-label={`Editar ${book.title}`}
            className={iconAction}
          >
            <Pencil aria-hidden className="size-4.5" />
          </Link>
          <button
            type="button"
            onClick={() => onDelete(book)}
            aria-label={`Eliminar ${book.title}`}
            className={cn(iconAction, 'hover:bg-alert-pale hover:text-alert')}
          >
            <Trash2 aria-hidden className="size-4.5" />
          </button>
        </div>
      </td>
    </tr>
  )
})

/** Portada, género, precio, disponibilidad y acciones tienen ancho fijo; título, autor y editorial reparten el resto. */
const WIDTHS = ['w-14', '', '', '', 'w-32', 'w-[100px]', 'w-[164px]', 'w-28']

export function BooksTable({
  books,
  sort,
  limit,
  onSort,
  onDelete,
  load,
  overlay,
  refreshError,
  footer,
}: BooksTableProps) {
  const { search } = useLocation()
  return (
    <TableLayout
      caption="Libros del catálogo"
      columns={WIDTHS}
      // Bajo `lg` el encabezado se ve como una fila de botones de orden.
      headerClassName="block border-b-[1.5px] border-ink lg:table-header-group"
      header={
        <tr className="flex flex-wrap items-center gap-1.5 px-3 py-2.5 lg:table-row lg:h-12 lg:p-0">
          <th scope="col" className="sr-only lg:not-sr-only">
            <span className="sr-only">Portada</span>
          </th>
          {COLUMNS.map((column) => (
            <SortHeader key={column.field} column={column} sort={sort} onSort={onSort} />
          ))}
          <th scope="col" className="sr-only lg:not-sr-only">
            <span className="sr-only">Acciones</span>
          </th>
        </tr>
      }
      rowCount={books.length}
      limit={limit}
      load={load}
      skeleton={
        <>
          <div className="h-11 w-8.25 bg-rule-soft" />
          <div className="h-3.5 w-1/4 bg-rule-soft" />
          <div className="hidden h-3.5 w-1/6 bg-rule-soft lg:block" />
          <div className="ml-auto h-3.5 w-16 bg-rule-soft" />
        </>
      }
      overlay={overlay}
      refreshError={refreshError}
      footer={footer}
    >
      {books.map((book, index) => (
        <BookRow key={book.id} book={book} index={index} onDelete={onDelete} search={search} />
      ))}
    </TableLayout>
  )
}
