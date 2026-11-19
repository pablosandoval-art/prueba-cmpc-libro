import { useState } from 'react'
import { ArrowDown, ArrowUp, SlidersHorizontal, X } from 'lucide-react'
import { Button } from '../../../components/ui/Button'
import { cn } from '../../../components/ui/cn'
import { SelectField, TextField } from '../../../components/ui/Field'
import { Toggle } from '../../../components/ui/Toggle'
import { COLUMN_LABELS } from '../columns'
import { useDebouncedFilter, useGenres } from '../hooks'
import { hasActiveFilters } from '../query'
import type { BookListQuery } from '../types'

interface BookFiltersProps {
  query: BookListQuery
  onChange: (patch: Partial<BookListQuery>) => void
}

export function BookFilters({ query, onChange }: BookFiltersProps) {
  const { genres, loading: genresLoading } = useGenres()
  const [title, setTitle] = useDebouncedFilter(query.title ?? '', (title) => onChange({ title }))
  const [author, setAuthor] = useDebouncedFilter(query.author ?? '', (author) => onChange({ author }))
  const [publisher, setPublisher] = useDebouncedFilter(query.publisher ?? '', (publisher) => onChange({ publisher }))
  // En móvil el título queda a la vista y el resto se pliega.
  const [expanded, setExpanded] = useState(false)
  const secondaryActive = [query.author, query.publisher, query.genreId, query.available].filter(Boolean).length

  return (
    <search aria-label="Filtros del catálogo" className="mt-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[1.6fr_1.2fr_1.2fr_1fr_auto] lg:items-end">
        <TextField
          label="Título"
          type="search"
          placeholder="Buscar por título"
          value={title}
          active={!!query.title}
          onChange={(e) => setTitle(e.target.value)}
          containerClassName="sm:col-span-2 lg:col-span-1"
        />
        <Button
          variant="outline"
          size="sm"
          aria-expanded={expanded}
          aria-controls="more-filters"
          icon={<SlidersHorizontal aria-hidden className="size-4" />}
          onClick={() => setExpanded((v) => !v)}
          className="justify-self-start sm:hidden"
        >
          {expanded ? 'Menos filtros' : 'Más filtros'}
          {secondaryActive > 0 && ` (${secondaryActive})`}
        </Button>
        <div id="more-filters" className={cn(expanded ? 'contents' : 'hidden', 'sm:contents')}>
          <TextField
            label="Autor"
            type="search"
            placeholder="Buscar por autor"
            value={author}
            active={!!query.author}
            onChange={(e) => setAuthor(e.target.value)}
          />
          <TextField
            label="Editorial"
            type="search"
            placeholder="Buscar por editorial"
            value={publisher}
            active={!!query.publisher}
            onChange={(e) => setPublisher(e.target.value)}
          />
          <SelectField
            label="Género"
            value={query.genreId ?? ''}
            active={!!query.genreId}
            disabled={genresLoading && genres.length === 0}
            onChange={(e) => onChange({ genreId: e.target.value ? Number(e.target.value) : undefined })}
          >
            <option value="">Todos los géneros</option>
            {genres.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </SelectField>
          <Toggle
            label="Sólo con stock"
            checked={!!query.available}
            active={!!query.available}
            onChange={(available) => onChange({ available: available || undefined })}
          />
        </div>
      </div>
      {/* Altura reservada: que aparezcan o desaparezcan los botones no mueve el resto de la pantalla. */}
      <div className="mt-1 flex min-h-9 flex-wrap items-center gap-x-4 gap-y-1">
        {hasActiveFilters(query) && (
          <Button
            variant="ghost"
            size="sm"
            className="motion-fade-in -ml-3"
            icon={<X aria-hidden className="size-4" />}
            onClick={() =>
              onChange({
                title: undefined,
                author: undefined,
                publisher: undefined,
                genreId: undefined,
                available: undefined,
              })
            }
          >
            Limpiar filtros
          </Button>
        )}
        {query.sort.length > 0 && (
          <div className="motion-fade-in flex flex-wrap items-center gap-x-3 gap-y-1">
            <p className="flex flex-wrap items-center gap-x-1.5 text-[13px] text-ink-2">
              Orden:
              {query.sort.map((term, index) => (
                <span key={term.field} className="inline-flex items-center gap-1 font-semibold text-ink">
                  {index > 0 && (
                    <span aria-hidden className="mr-0.5 font-normal text-ink-3">
                      ·
                    </span>
                  )}
                  {COLUMN_LABELS[term.field]}
                  {term.direction === 'asc' ? (
                    <ArrowUp aria-label="ascendente" className="size-3.5" />
                  ) : (
                    <ArrowDown aria-label="descendente" className="size-3.5" />
                  )}
                </span>
              ))}
            </p>
            <Button
              variant="ghost"
              size="sm"
              icon={<X aria-hidden className="size-4" />}
              onClick={() => onChange({ sort: [] })}
            >
              Quitar orden
            </Button>
          </div>
        )}
      </div>
    </search>
  )
}
