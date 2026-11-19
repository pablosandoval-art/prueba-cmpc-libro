import { useEffect, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { SelectField, TextField } from '../../../components/ui/Field'
import { formatPrice } from '../../../lib/format'
import { ApiError } from '../../../lib/http/api-error'
import { notify } from '../../notifications/toast.store'
import { bookFormSchema, toBookInput } from '../book.schema'
import type { BookFormValues } from '../book.schema'
import type { EditorState } from '../editor-state'
import { useGenres } from '../hooks'
import { useBooksStore } from '../store/books.store'
import type { Book } from '../types'
import { CatalogCombobox } from './CatalogCombobox'
import { ImageDropzone } from './ImageDropzone'

function toFormValues(book: Book): BookFormValues {
  return {
    title: book.title,
    author: book.author,
    publisher: book.publisher,
    price: book.price,
    stock: book.stock,
    genreId: book.genre.id,
  }
}

interface BookEditorProps {
  /** Libro a editar; sin libro, crea uno nuevo. */
  book?: Book
  /** `id` del `<form>`: el botón de guardar vive en el pie del modal (`form={formId}`). */
  formId: string
  onStateChange: (state: EditorState) => void
  /** Guardado. `imageFailed`: el libro se guardó pero la portada no se pudo subir. */
  onSaved: (result: { book: Book; imageFailed: boolean }) => void
}

/**
 * Campos del libro con la misma distribución que el detalle: portada a la izquierda y, a la
 * derecha, una ficha con la etiqueta de cada campo a su izquierda. Bajo `sm` todo se apila.
 */
export function BookEditor({ book, formId, onStateChange, onSaved }: BookEditorProps) {
  const { genres, loading: genresLoading } = useGenres()
  const createBook = useBooksStore((s) => s.createBook)
  const updateBook = useBooksStore((s) => s.updateBook)
  const uploadImage = useBooksStore((s) => s.uploadImage)
  const [image, setImage] = useState<File | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    control,
    reset,
    setFocus,
    formState: { errors, isSubmitting, isSubmitted, isDirty },
  } = useForm<BookFormValues>({
    resolver: zodResolver(bookFormSchema),
    // Validación en tiempo real mientras se escribe.
    mode: 'onChange',
    defaultValues: book ? toFormValues(book) : undefined,
  })

  const price = useWatch({ control, name: 'price' })
  const missingKey = isSubmitted ? Object.keys(errors).join(',') : ''
  const dirty = isDirty || image !== null

  // Si el modal ya estaba abierto (del detalle a editar), el foco va al título al montar el formulario.
  useEffect(() => {
    setFocus('title')
  }, [setFocus])

  useEffect(() => {
    onStateChange({
      dirty,
      submitting: isSubmitting,
      missing: missingKey ? (missingKey.split(',') as Array<keyof BookFormValues>) : [],
      serverError,
    })
  }, [dirty, isSubmitting, missingKey, serverError, onStateChange])

  async function onSubmit(values: BookFormValues) {
    setServerError(null)
    let saved: Book
    try {
      const input = toBookInput(values)
      saved = book ? await updateBook(book.id, input) : await createBook(input)
    } catch (error) {
      const apiError = error as ApiError
      setServerError(apiError.details?.length ? `${apiError.message} ${apiError.details.join('. ')}` : apiError.message)
      return
    }
    if (image) {
      try {
        await uploadImage(saved.id, image)
      } catch (error) {
        notify.error(`El libro se guardó, pero la imagen no se pudo subir: ${(error as Error).message}`)
        // Los datos ya están guardados: sólo queda pendiente la imagen.
        reset(toFormValues(saved))
        onSaved({ book: saved, imageFailed: true })
        return
      }
    }
    onSaved({ book: saved, imageFailed: false })
  }

  return (
    <form id={formId} noValidate onSubmit={handleSubmit(onSubmit)} className="grid gap-6 sm:grid-cols-[200px_1fr]">
      <div className="grid content-start gap-y-3.5 sm:grid-cols-[auto_1fr]">
        <TextField
          layout="inline"
          label="Título"
          autoComplete="off"
          // El foco entra al primer campo: al abrir el modal (`data-autofocus`, ver Modal) o al pasar del detalle a editar.
          data-autofocus
          error={errors.title?.message}
          {...register('title')}
        />
        <Controller
          control={control}
          name="author"
          render={({ field }) => (
            <CatalogCombobox
              layout="inline"
              kind="authors"
              label="Autor"
              noun="el autor"
              placeholder="Busca o crea un autor"
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              error={errors.author?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="publisher"
          render={({ field }) => (
            <CatalogCombobox
              layout="inline"
              kind="publishers"
              label="Editorial"
              noun="la editorial"
              placeholder="Busca o crea una editorial"
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              error={errors.publisher?.message}
            />
          )}
        />
        <SelectField
          layout="inline"
          label="Género"
          error={errors.genreId?.message}
          disabled={genresLoading && genres.length === 0}
          defaultValue=""
          {...register('genreId', { valueAsNumber: true })}
        >
          <option value="" disabled>
            {genresLoading ? 'Cargando géneros…' : 'Selecciona un género'}
          </option>
          {genres.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </SelectField>
        <TextField
          layout="inline"
          label="Precio (CLP)"
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          error={errors.price?.message}
          hint={Number.isFinite(price) ? formatPrice(price) : 'Entero, sin puntos ni decimales'}
          {...register('price', { valueAsNumber: true })}
        />
        <TextField
          layout="inline"
          label="Disponibilidad"
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          error={errors.stock?.message}
          hint="Unidades en stock"
          {...register('stock', { valueAsNumber: true })}
        />
      </div>
      {/* En escritorio la portada va a la izquierda, como en el detalle; en móvil, después de los
          campos (que es lo que se completa primero). El orden del DOM sigue al del tabulador. */}
      <div className="sm:order-first">
        <ImageDropzone file={image} currentUrl={book?.imageUrl ?? null} onChange={setImage} disabled={isSubmitting} />
      </div>
    </form>
  )
}
