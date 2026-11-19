import { useId, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { Check, ChevronDown, Plus } from 'lucide-react'
import { cn } from '../../../components/ui/cn'
import { FieldShell } from '../../../components/ui/Field'
import type { FieldLayout } from '../../../components/ui/Field'
import { controlClass } from '../../../components/ui/field-styles'
import { Spinner } from '../../../components/ui/Spinner'
import { useAnchoredPanel } from '../../../components/ui/useAnchoredPanel'
import { notify } from '../../notifications/toast.store'
import type { CatalogKind } from '../api/catalog.service'
import { normalizeName, sameName } from '../catalog'
import { useCatalogSearch, useDebouncedValue } from '../hooks'
import { useCatalogStore } from '../store/catalog.store'
import type { CatalogItem } from '../types'

export const COMBOBOX_DEBOUNCE_MS = 250

type Option = { type: 'item'; item: CatalogItem } | { type: 'create'; name: string }

interface CatalogComboboxProps {
  kind: CatalogKind
  label: string
  /** Sustantivo para el texto de crear: «Crear el autor «…»». */
  noun: string
  value: CatalogItem | null | undefined
  onChange: (item: CatalogItem | null) => void
  onBlur?: () => void
  error?: string
  placeholder?: string
  layout?: FieldLayout
}

/**
 * Combobox accesible (patrón ARIA 1.2 «list autocomplete»): busca mientras se
 * escribe y, si el nombre no existe, ofrece crearlo en el momento.
 *
 * - Mientras se escribe se conserva el valor elegido; al terminar (salir del campo o Esc) el texto
 *   vuelve al valor elegido, o lo quita si se dejó vacío. Así el error de «obligatorio» sólo aparece
 *   cuando de verdad falta elegir algo, no en medio de una búsqueda ni al crear.
 * - Flechas ↑/↓ navegan, Enter elige la opción activa y Esc cierra.
 */
export function CatalogCombobox({
  kind,
  label,
  noun,
  value,
  onChange,
  onBlur,
  error,
  placeholder,
  layout,
}: CatalogComboboxProps) {
  const id = useId()
  const listboxId = `${id}-list`
  const createInStore = useCatalogStore((s) => s.create)

  const [text, setText] = useState(value?.name ?? '')
  const [seenId, setSeenId] = useState<number | null>(value?.id ?? null)
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [creating, setCreating] = useState(false)
  // La lista se posiciona `fixed` junto al campo: así no la recorta un modal ni un contenedor con scroll.
  const { anchorRef, panelRef, listRef } = useAnchoredPanel<HTMLDivElement, HTMLDivElement, HTMLUListElement>(open)

  // Un valor elegido desde fuera (p. ej. al editar) se refleja en el texto.
  // Si el valor pasa a null porque el usuario está escribiendo, se conserva lo escrito.
  const currentId = value?.id ?? null
  if (currentId !== seenId) {
    setSeenId(currentId)
    if (value) setText(value.name)
  }

  const term = normalizeName(text)
  const debounced = useDebouncedValue(term, COMBOBOX_DEBOUNCE_MS)
  const { data, loading, error: searchError } = useCatalogSearch(kind, debounced, open)
  // Se conservan los últimos resultados mientras llegan los de la búsqueda nueva: la lista no parpadea.
  const [lastResults, setLastResults] = useState<CatalogItem[]>([])
  if (data && data !== lastResults) setLastResults(data)
  const items = data ?? lastResults

  // Los resultados corresponden a lo que se ve escrito y ya terminaron de cargar.
  const settled = debounced === term && !!data && !loading
  const canCreate = settled && term.length > 0 && !items.some((item) => sameName(item.name, term))
  const options: Option[] = [
    ...items.map((item): Option => ({ type: 'item', item })),
    ...(canCreate ? [{ type: 'create', name: term } satisfies Option] : []),
  ]

  function close() {
    setOpen(false)
    setActiveIndex(-1)
  }

  function select(item: CatalogItem) {
    onChange(item)
    setText(item.name)
    setSeenId(item.id)
    close()
  }

  async function createNew(name: string) {
    setCreating(true)
    try {
      select(await createInStore(kind, name))
    } catch (e) {
      notify.error((e as Error).message)
    } finally {
      setCreating(false)
    }
  }

  function choose(option: Option) {
    if (option.type === 'item') select(option.item)
    else void createNew(option.name)
  }

  function handleInput(next: string) {
    setText(next)
    setOpen(true)
    setActiveIndex(-1)
  }

  /** Se terminó de escribir sin elegir nada: vuelve al valor elegido, o lo quita si se vació el campo. */
  function settle() {
    if (!value) return
    if (term === '') onChange(null)
    else if (text !== value.name) setText(value.name)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setOpen(true)
      setActiveIndex((i) => Math.min(i + 1, options.length - 1))
    } else if (event.key === 'ArrowUp' && open) {
      event.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (event.key === 'Enter' && open) {
      // Con la lista abierta, Enter nunca envía el formulario.
      event.preventDefault()
      const option = options[activeIndex]
      if (option) choose(option)
    } else if (event.key === 'Escape' && open) {
      event.preventDefault()
      close()
      if (value) setText(value.name)
    }
  }

  // Mientras se crea el registro no se muestra el error: el valor está por llegar.
  const shownError = creating ? undefined : error

  const status = !open
    ? ''
    : loading && !data
      ? 'Buscando…'
      : searchError
        ? 'No se pudo buscar'
        : options.length === 0
          ? 'Sin resultados'
          : `${items.length} ${items.length === 1 ? 'resultado' : 'resultados'}`

  return (
    <FieldShell id={id} label={label} error={shownError} layout={layout}>
      <div ref={anchorRef} className="relative">
        <input
          id={id}
          type="text"
          role="combobox"
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-activedescendant={activeIndex >= 0 ? `${id}-opt-${activeIndex}` : undefined}
          aria-invalid={shownError ? true : undefined}
          aria-describedby={shownError ? `${id}-error` : undefined}
          aria-busy={creating || undefined}
          placeholder={placeholder}
          value={text}
          // readOnly (no disabled): el campo conserva el foco mientras se crea el registro.
          readOnly={creating}
          onChange={(e) => handleInput(e.target.value)}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onBlur={() => {
            close()
            settle()
            onBlur?.()
          }}
          onKeyDown={handleKeyDown}
          className={cn(controlClass({ invalid: !!shownError }), 'pr-9', creating && 'bg-board text-ink-3')}
        />
        <span aria-hidden className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-ink-2">
          {loading || creating ? <Spinner /> : <ChevronDown className="size-4" />}
        </span>

        {open && (
          <div ref={panelRef} className="motion-pop-in fixed z-30 rounded-sheet border border-ink bg-sheet">
            <ul ref={listRef} id={listboxId} role="listbox" aria-label={label} className="max-h-64 overflow-auto py-1">
              {options.map((option, index) => {
                const active = index === activeIndex
                const optionId = `${id}-opt-${index}`
                return (
                  <li
                    key={option.type === 'item' ? option.item.id : 'create'}
                    id={optionId}
                    role="option"
                    aria-selected={active}
                    // Evita que el input pierda el foco (y cierre la lista) antes del clic.
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => choose(option)}
                    onMouseEnter={() => setActiveIndex(index)}
                    className={cn(
                      'flex cursor-pointer items-center gap-2 px-3 py-2 text-[15px]',
                      active && 'bg-board die-outline',
                      option.type === 'create' && 'font-semibold text-flexo-deep',
                    )}
                  >
                    {option.type === 'create' ? (
                      <>
                        <Plus aria-hidden className="size-4 shrink-0" />
                        <span>
                          Crear {noun} «{option.name}»
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="flex-1">{option.item.name}</span>
                        {option.item.id === value?.id && <Check aria-hidden className="size-4 shrink-0" />}
                      </>
                    )}
                  </li>
                )
              })}
            </ul>
            {options.length === 0 && (
              <p className="px-3 py-2 text-sm text-ink-2">
                {loading && !data ? 'Buscando…' : (searchError ?? 'Sin resultados.')}
              </p>
            )}
          </div>
        )}
        <p role="status" className="sr-only">
          {status}
        </p>
      </div>
    </FieldShell>
  )
}
