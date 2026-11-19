import type { ReactNode } from 'react'
import { cn } from '../ui/cn'

/** Estado visual de un listado mientras pide datos (ver `useStaleWhileLoading`). */
export interface TableLoadState {
  /** Primera carga sin nada que mostrar: filas esqueleto. */
  firstLoad: boolean
  /** Hay filas visibles y se está pidiendo información nueva: barra de progreso arriba. */
  refreshing: boolean
  /** Las filas visibles son las del resultado anterior: se atenúan hasta que llegue el nuevo. */
  stale: boolean
}

interface TableLayoutProps {
  /** Título accesible de la tabla (lectores de pantalla). */
  caption: string
  /**
   * Ancho de cada columna desde `lg` (clases de Tailwind); `''` reparte el espacio restante.
   * Su cantidad define también el `colSpan` de las filas esqueleto y en blanco.
   */
  columns: readonly string[]
  /** Fila(s) del encabezado. */
  header: ReactNode
  /** Clases del `<thead>`: cada tabla decide cómo se ve el encabezado bajo `lg`. */
  headerClassName?: string
  /** Filas de datos ya renderizadas. */
  children: ReactNode
  /** Cuántas filas de datos hay en `children` (para completar la página con filas en blanco). */
  rowCount: number
  /** Filas por página: la tabla siempre ocupa este alto, aunque haya menos resultados. */
  limit: number
  load: TableLoadState
  /** Silueta de una fila mientras carga por primera vez. */
  skeleton: ReactNode
  /** Mensaje (vacío o error) centrado sobre las filas en blanco. */
  overlay?: ReactNode
  /** Error al refrescar con datos ya visibles: se avisa sin vaciar la tabla. */
  refreshError?: string | null
  /** Pie (paginación). Sin pie se reserva su alto para que nada salte al llegar los datos. */
  footer?: ReactNode
}

/**
 * Marco común de los listados (catálogo y auditoría). Desde `lg` es una tabla de verdad
 * con layout fijo y filas de 60 px: los anchos no dependen del contenido y el alto es
 * siempre el de una página completa, así filtrar, ordenar o paginar no mueve nada.
 * Bajo `lg` cada fila se dibuja como tarjeta (lo decide cada tabla en sus filas).
 */
export function TableLayout({
  caption,
  columns,
  header,
  headerClassName,
  children,
  rowCount,
  limit,
  load,
  skeleton,
  overlay,
  refreshError,
  footer,
}: TableLayoutProps) {
  const span = columns.length
  const blanks = load.firstLoad ? 0 : Math.max(0, limit - rowCount)

  return (
    <section aria-label="Resultados" className="mt-2 overflow-hidden rounded-sheet border border-rule bg-sheet">
      <div className="relative">
        {load.refreshing && (
          <div
            role="progressbar"
            aria-label="Actualizando listado"
            className="motion-fade-in absolute inset-x-0 top-0 z-10 h-0.75 overflow-hidden bg-rule-soft"
          >
            <div className="h-full w-1/3 animate-[slide_1s_ease-in-out_infinite] bg-flexo motion-reduce:animate-none" />
          </div>
        )}
        <table
          className="block w-full border-collapse lg:table lg:table-fixed"
          aria-busy={load.firstLoad || load.refreshing || undefined}
        >
          <caption className="sr-only">{caption}</caption>
          <colgroup className="hidden lg:table-column-group">
            {columns.map((width, i) => (
              <col key={i} className={width || undefined} />
            ))}
          </colgroup>
          <thead className={headerClassName ?? 'hidden border-b-[1.5px] border-ink lg:table-header-group'}>
            {header}
          </thead>
          <tbody
            className={cn(
              'block transition-opacity duration-200 ease-out lg:table-row-group',
              load.stale && 'opacity-55',
            )}
          >
            {load.firstLoad ? (
              Array.from({ length: limit }, (_, i) => (
                <tr
                  key={i}
                  aria-hidden
                  className="block border-b border-rule-soft px-4 py-3 lg:table-row lg:h-15 lg:p-0"
                >
                  <td className="lg:px-3.5" colSpan={span}>
                    <div className="flex animate-pulse items-center gap-4 motion-reduce:animate-none">{skeleton}</div>
                  </td>
                </tr>
              ))
            ) : (
              <>
                {children}
                {/* Filas en blanco que completan la página (sólo en escritorio, donde el alto es fijo). */}
                {Array.from({ length: blanks }, (_, i) => (
                  <tr key={`blank-${i}`} aria-hidden className="hidden h-15 border-b border-rule-soft lg:table-row">
                    <td colSpan={span} />
                  </tr>
                ))}
              </>
            )}
          </tbody>
        </table>
        {overlay && (
          <div className="motion-fade-in lg:absolute lg:inset-x-0 lg:top-12 lg:bottom-0 lg:z-1 lg:grid lg:place-items-center lg:bg-sheet/70">
            {overlay}
          </div>
        )}
      </div>
      {refreshError && (
        <p role="alert" className="border-b border-rule-soft bg-alert-pale px-4 py-2.5 text-sm font-medium text-alert">
          No se pudo actualizar: {refreshError}
        </p>
      )}
      {footer ?? <div aria-hidden className="h-16" />}
    </section>
  )
}
