const clp = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
})

const dateTime = new Intl.DateTimeFormat('es-CL', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

const integer = new Intl.NumberFormat('es-CL')

/** `18990` → `$18.990` */
export function formatPrice(value: number): string {
  return clp.format(value)
}

export function formatNumber(value: number): string {
  return integer.format(value)
}

export function formatDateTime(value: string | Date): string {
  return dateTime.format(typeof value === 'string' ? new Date(value) : value)
}

/** Concordancia simple: `1 libro`, `2 libros`. */
export function plural(count: number, singular: string, pluralForm: string): string {
  return `${formatNumber(count)} ${count === 1 ? singular : pluralForm}`
}
