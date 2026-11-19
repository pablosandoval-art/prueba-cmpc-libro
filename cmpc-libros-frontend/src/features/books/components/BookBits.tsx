import { cn } from '../../../components/ui/cn'
import { toAssetUrl } from '../../../config/env'
import { formatNumber } from '../../../lib/format'
import { stockLevel } from '../stock'

/**
 * Portada a escala fija (3:4). Sin imagen, se imprime una tapa kraft (con el
 * título en la versión grande): el catálogo nunca muestra un hueco vacío.
 */
export function BookCover({
  title,
  imageUrl,
  size = 'sm',
  muted = false,
}: {
  title: string
  imageUrl: string | null
  size?: 'sm' | 'lg'
  muted?: boolean
}) {
  const src = toAssetUrl(imageUrl)
  const box = size === 'sm' ? 'w-[33px] h-11' : 'w-full max-w-52 aspect-[3/4]'
  if (src) {
    return (
      <img
        src={src}
        alt={size === 'lg' ? `Portada de ${title}` : ''}
        loading="lazy"
        className={cn(box, 'shrink-0 border border-rule object-cover', muted && 'opacity-50 grayscale')}
      />
    )
  }
  return (
    <div
      aria-hidden
      className={cn(
        box,
        'flex shrink-0 flex-col justify-end overflow-hidden text-ink',
        muted ? 'bg-rule-soft text-ink-3' : 'bg-kraft',
        size === 'sm' ? 'p-0.75' : 'p-4',
      )}
    >
      {/* La miniatura no repite el título (ya está en la fila): nada se etiqueta dos veces. */}
      {size === 'lg' && <span className="type-display text-2xl leading-[0.95] uppercase hyphens-auto">{title}</span>}
    </div>
  )
}

/** Género como sello entintado. */
export function GenreStamp({ name, muted = false, className }: { name: string; muted?: boolean; className?: string }) {
  return (
    <span
      className={cn(
        'inline-block border-[1.5px] px-1.5 py-0.5 whitespace-nowrap uppercase font-stretch:72% font-[750] text-[11px] tracking-[0.08em]',
        muted ? 'border-ink-3 text-ink-3' : 'border-ink text-ink',
        className,
      )}
    >
      {name}
    </span>
  )
}

export function StockRamp({ stock }: { stock: number }) {
  const level = stockLevel(stock)
  if (level === 0) {
    return (
      <span className="inline-block border-[1.5px] border-alert px-1.5 py-0.5 uppercase font-stretch:72% font-[750] text-[11px] tracking-[0.08em] text-alert">
        Sin stock
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-2" title={`${formatNumber(stock)} en stock`}>
      <span aria-hidden className="flex gap-0.5">
        {[1, 2, 3, 4].map((step) => (
          <i
            key={step}
            className={cn('block h-3.5 w-1.5', step > level ? 'bg-rule' : level === 1 ? 'bg-amber-bar' : 'bg-ink')}
          />
        ))}
      </span>
      <span className={cn('font-semibold', level === 1 && 'text-amber')}>
        {formatNumber(stock)}
        <span className="sr-only"> en stock</span>
      </span>
    </span>
  )
}
