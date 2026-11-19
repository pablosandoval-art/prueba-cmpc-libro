import { z } from 'zod'
import type { BookInput } from './types'

/** Reglas espejo de `CreateBookDto` del backend. */
export const MAX_PRICE = 100_000_000
export const MAX_STOCK = 1_000_000
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

const requiredText = (label: string, max: number) =>
  z
    .string()
    .trim()
    .min(1, { error: `Ingresa ${label}` })
    .max(max, { error: `Máximo ${max} caracteres` })

/** Entero obligatorio. Un input vacío llega como NaN (`valueAsNumber`). */
const requiredInt = (label: string, max: number) =>
  z
    .number({ error: `Ingresa ${label}` })
    .int({ error: 'Debe ser un número entero' })
    .min(0, { error: 'No puede ser negativo' })
    .max(max, { error: `Máximo ${max.toLocaleString('es-CL')}` })

/** Autor o editorial elegido en el combobox (el formulario envía su id). */
const catalogItem = (message: string) => z.object({ id: z.number().int().min(1), name: z.string() }, { error: message })

export const bookFormSchema = z.object({
  title: requiredText('el título', 200),
  author: catalogItem('Selecciona o crea un autor'),
  publisher: catalogItem('Selecciona o crea una editorial'),
  price: requiredInt('el precio', MAX_PRICE),
  stock: requiredInt('la disponibilidad', MAX_STOCK),
  genreId: z.number({ error: 'Selecciona un género' }).int().min(1, { error: 'Selecciona un género' }),
})

export type BookFormValues = z.infer<typeof bookFormSchema>

/** Valores del formulario → cuerpo que espera la API (ids de autor y editorial). */
export function toBookInput(values: BookFormValues): BookInput {
  const { author, publisher, ...rest } = values
  return { ...rest, authorId: author.id, publisherId: publisher.id }
}

/** Valida la imagen antes de subirla; devuelve el mensaje de error o `null`. */
export function validateImage(file: File): string | null {
  if (!(IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return 'La imagen debe ser JPG, PNG o WebP'
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return 'La imagen no puede superar los 2 MB'
  }
  return null
}
