import { useCallback, useEffect, useRef, useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { useBeforeUnload, useBlocker, useLocation, useNavigate, useParams } from 'react-router'
import { Button } from '../../../components/ui/Button'
import { Modal } from '../../../components/ui/Modal'
import { Spinner } from '../../../components/ui/Spinner'
import { ErrorState } from '../../../components/ui/States'
import { formatDateTime, formatPrice } from '../../../lib/format'
import { notify } from '../../notifications/toast.store'
import { useBook } from '../hooks'
import type { Book } from '../types'
import { BookCover, GenreStamp, StockRamp } from './BookBits'
import { FIELD_LABELS, IDLE_EDITOR } from '../editor-state'
import type { EditorState } from '../editor-state'
import { BookEditor } from './BookEditor'
import { DeleteBookDialog } from './DeleteBookDialog'

/** Desde dónde se abrió el formulario: al guardar o cancelar se vuelve ahí (con `navigate(-1)`). */
export interface BookModalState {
  returnTo?: 'detail' | 'catalog'
}

const FORM_ID = 'book-form'

/**
 * Rutas `/books/:id` (detalle), `/books/:id/edit` y `/books/new` (formulario), sobre el catálogo.
 *
 * Las tres usan este mismo componente, así que pasar del detalle a la edición (y volver) cambia
 * el contenido del modal sin cerrarlo. Atrás, Esc, la X o un clic fuera lo cierran; con cambios
 * sin guardar, antes se pide confirmación.
 */
export function BookModal() {
  const { id } = useParams()
  const { pathname, search, state } = useLocation()
  const navigate = useNavigate()
  const mode = !id ? 'new' : pathname.endsWith('/edit') ? 'edit' : 'detail'
  const editing = mode !== 'detail'
  const returnTo = (state as BookModalState | null)?.returnTo
  const { data: book, loading, error } = useBook(id)

  const [confirmDelete, setConfirmDelete] = useState(false)
  const [editor, setEditor] = useState<EditorState>(IDLE_EDITOR)
  // Tras guardar se sale sin preguntar.
  const leaving = useRef(false)
  useEffect(() => {
    leaving.current = false
  }, [pathname])

  const dirty = editing && editor.dirty
  // Cualquier salida del formulario con cambios (Cancelar, Esc, la X, Atrás) pasa por aquí.
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty && !leaving.current && currentLocation.pathname !== nextLocation.pathname,
  )
  // Recargar o cerrar la pestaña con cambios: aviso del navegador.
  useBeforeUnload(
    useCallback(
      (event: BeforeUnloadEvent) => {
        if (dirty) event.preventDefault()
      },
      [dirty],
    ),
  )

  const catalog = { pathname: '/books', search }
  const closeDetail = () => navigate(catalog)
  /** Vuelve a donde se abrió el formulario; si se llegó por enlace directo, al catálogo. */
  const leaveEditor = () => (returnTo ? navigate(-1) : navigate(catalog, { replace: true }))

  function handleSaved({ book: saved, imageFailed }: { book: Book; imageFailed: boolean }) {
    if (imageFailed) {
      // El libro nuevo ya existe: se sigue editando (para reintentar la imagen) en su ruta.
      if (mode === 'new') {
        leaving.current = true
        navigate({ pathname: `/books/${saved.id}/edit`, search }, { replace: true, state })
      }
      return
    }
    leaving.current = true
    notify.success(mode === 'edit' ? `«${saved.title}» se actualizó.` : `«${saved.title}» se agregó al catálogo.`)
    leaveEditor()
  }

  const title =
    mode === 'new'
      ? 'Nuevo libro'
      : mode === 'edit'
        ? 'Editar libro'
        : (book?.title ?? (error ? 'Libro no disponible' : 'Cargando libro…'))

  const pending = id && !book && (
    <>
      {loading && (
        <div className="grid place-items-center py-16">
          <Spinner className="size-6" label="Cargando libro" />
        </div>
      )}
      {error && <ErrorState message={error} />}
    </>
  )

  let body
  let footer
  if (!editing) {
    body = pending || (book && <BookDetails book={book} />)
    footer = book && (
      <>
        <Button
          variant="ghost"
          icon={<Trash2 aria-hidden className="size-4" />}
          onClick={() => setConfirmDelete(true)}
          className="mr-auto text-alert"
        >
          Eliminar
        </Button>
        <Button
          variant="primary"
          icon={<Pencil aria-hidden className="size-4" />}
          onClick={() =>
            navigate(
              { pathname: `/books/${book.id}/edit`, search },
              { state: { returnTo: 'detail' } satisfies BookModalState },
            )
          }
        >
          Editar
        </Button>
      </>
    )
  } else if (mode === 'edit' && !book) {
    body = pending
  } else {
    body = (
      // `key`: el formulario se reinicia si cambia el libro (p. ej. de «nuevo» a su edición).
      <BookEditor
        key={book?.id ?? 'new'}
        book={mode === 'edit' ? book : undefined}
        formId={FORM_ID}
        onStateChange={setEditor}
        onSaved={handleSaved}
      />
    )
    footer = <EditorActions state={editor} creating={mode === 'new'} onCancel={leaveEditor} />
  }

  return (
    <>
      <Modal
        open={!confirmDelete}
        onClose={editing ? leaveEditor : closeDetail}
        size="lg"
        title={title}
        footer={footer}
      >
        {body}
      </Modal>
      <DeleteBookDialog
        book={confirmDelete && book ? book : null}
        onClose={() => setConfirmDelete(false)}
        onDeleted={closeDetail}
      />
      {blocker.state === 'blocked' && (
        <Modal
          open
          onClose={() => blocker.reset()}
          title="¿Descartar los cambios?"
          footer={
            <>
              <Button onClick={() => blocker.reset()}>Seguir editando</Button>
              <Button variant="danger" onClick={() => blocker.proceed()}>
                Descartar cambios
              </Button>
            </>
          }
        >
          <p className="text-[15px] text-ink-2">Los cambios que hiciste en el libro no se guardaron y se perderán.</p>
        </Modal>
      )}
    </>
  )
}

/** Ficha del libro: portada a la izquierda y los datos a la derecha. */
function BookDetails({ book }: { book: Book }) {
  return (
    <div className="grid gap-6 sm:grid-cols-[200px_1fr]">
      <BookCover title={book.title} imageUrl={book.imageUrl} size="lg" />
      <dl className="grid grid-cols-[auto_1fr] content-start gap-x-6 gap-y-3.5 text-[15px]">
        <dt className="type-label pt-1 text-ink-2">Autor</dt>
        <dd className="font-semibold">{book.author.name}</dd>
        <dt className="type-label pt-1 text-ink-2">Editorial</dt>
        <dd>{book.publisher.name}</dd>
        <dt className="type-label pt-1 text-ink-2">Género</dt>
        <dd>
          <GenreStamp name={book.genre.name} />
        </dd>
        <dt className="type-label pt-1 text-ink-2">Precio</dt>
        <dd className="text-xl font-bold">{formatPrice(book.price)}</dd>
        <dt className="type-label pt-1 text-ink-2">Disponibilidad</dt>
        <dd>
          <StockRamp stock={book.stock} />
        </dd>
        <dt className="type-label pt-1 text-ink-2">Creado</dt>
        <dd className="text-ink-2">{formatDateTime(book.createdAt)}</dd>
        <dt className="type-label pt-1 text-ink-2">Actualizado</dt>
        <dd className="text-ink-2">{formatDateTime(book.updatedAt)}</dd>
      </dl>
    </div>
  )
}

/** Pie del formulario: resumen de lo que falta (o error del servidor), Cancelar y Guardar. */
function EditorActions({ state, creating, onCancel }: { state: EditorState; creating: boolean; onCancel: () => void }) {
  const message =
    state.serverError ??
    (state.missing.length > 0 ? `Falta completar: ${state.missing.map((k) => FIELD_LABELS[k]).join(', ')}.` : null)
  return (
    <>
      {message && (
        <p role="alert" className="mr-auto self-center text-sm font-medium text-alert">
          {message}
        </p>
      )}
      <Button onClick={onCancel} disabled={state.submitting}>
        Cancelar
      </Button>
      <Button type="submit" form={FORM_ID} variant="primary" loading={state.submitting}>
        {state.submitting ? 'Guardando…' : creating ? 'Crear libro' : 'Guardar cambios'}
      </Button>
    </>
  )
}
