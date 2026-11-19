import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { DragEvent } from 'react'
import { ImageUp, X } from 'lucide-react'
import { cn } from '../../../components/ui/cn'
import { toAssetUrl } from '../../../config/env'
import { validateImage } from '../book.schema'

interface ImageDropzoneProps {
  file: File | null
  currentUrl: string | null
  onChange: (file: File | null) => void
  disabled?: boolean
}

/** Ventana troquelada para cargar la portada: arrastrar o elegir archivo. */
export function ImageDropzone({ file, currentUrl, onChange, disabled }: ImageDropzoneProps) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)

  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file])
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview)
    },
    [preview],
  )

  const shown = preview ?? toAssetUrl(currentUrl)

  function accept(candidate: File | undefined) {
    if (!candidate) return
    const problem = validateImage(candidate)
    setError(problem)
    if (!problem) onChange(candidate)
  }

  function onDrop(event: DragEvent) {
    event.preventDefault()
    setDragging(false)
    if (!disabled) accept(event.dataTransfer.files[0])
  }

  return (
    <div>
      <label htmlFor={inputId} className="type-label mb-1.5 block text-ink-2">
        Portada <span className="normal-case tracking-normal font-normal text-ink-3">(opcional)</span>
      </label>
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          'die-line relative flex aspect-[3/4] w-full max-w-60 flex-col items-center justify-center gap-2 overflow-hidden rounded-sheet bg-sheet p-4 text-center transition-colors',
          dragging && 'bg-flexo-pale',
          error && 'border-alert',
        )}
      >
        {shown ? (
          <img src={shown} alt="Vista previa de la portada" className="absolute inset-0 size-full object-cover" />
        ) : (
          <>
            <ImageUp aria-hidden className="size-7 text-ink-2" />
            <p className="text-sm text-ink-2">Arrastra una imagen o</p>
          </>
        )}
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className={cn(
            'relative rounded-sheet border-[1.5px] border-ink bg-sheet px-3 py-1.5 text-sm font-semibold hover:bg-ink hover:text-sheet',
            shown && 'mt-auto',
          )}
        >
          {shown ? 'Cambiar imagen' : 'Elegir archivo'}
        </button>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          disabled={disabled}
          aria-describedby={`${inputId}-hint`}
          onChange={(e) => {
            accept(e.target.files?.[0])
            e.target.value = ''
          }}
        />
      </div>
      {error ? (
        <p role="alert" className="mt-1.5 text-[13px] font-medium text-alert">
          {error}
        </p>
      ) : (
        <p id={`${inputId}-hint`} className="mt-1.5 text-[13px] text-ink-3">
          JPG, PNG o WebP · máximo 2 MB
        </p>
      )}
      {file && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="mt-1 inline-flex items-center gap-1 text-[13px] font-semibold text-ink-2 hover:text-ink"
        >
          <X aria-hidden className="size-3.5" /> Descartar imagen nueva
        </button>
      )}
    </div>
  )
}
