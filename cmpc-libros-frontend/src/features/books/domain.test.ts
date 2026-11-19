import { bookFormSchema, MAX_IMAGE_BYTES, toBookInput, validateImage } from './book.schema'
import { normalizeName, sameName } from './catalog'
import { pageWindow } from '../../components/table/paging'
import { stockLevel } from './stock'

const valid = {
  title: 'Rayuela',
  author: { id: 2, name: 'Julio Cortázar' },
  publisher: { id: 2, name: 'Alfaguara' },
  price: 15990,
  stock: 3,
  genreId: 1,
}

function messages(values: Record<string, unknown>) {
  const result = bookFormSchema.safeParse(values)
  return result.success ? {} : Object.fromEntries(result.error.issues.map((i) => [i.path[0], i.message]))
}

describe('bookFormSchema', () => {
  it('acepta un libro válido y recorta espacios', () => {
    const result = bookFormSchema.parse({ ...valid, title: '  Rayuela  ' })
    expect(result.title).toBe('Rayuela')
  })

  it('pide los campos faltantes con mensajes breves', () => {
    expect(
      messages({
        title: ' ',
        author: null,
        publisher: undefined,
        price: Number.NaN,
        stock: Number.NaN,
        genreId: Number.NaN,
      }),
    ).toEqual({
      title: 'Ingresa el título',
      author: 'Selecciona o crea un autor',
      publisher: 'Selecciona o crea una editorial',
      price: 'Ingresa el precio',
      stock: 'Ingresa la disponibilidad',
      genreId: 'Selecciona un género',
    })
  })

  it('valida rangos y enteros', () => {
    expect(messages({ ...valid, price: -1 }).price).toBe('No puede ser negativo')
    expect(messages({ ...valid, stock: 1.5 }).stock).toBe('Debe ser un número entero')
    expect(messages({ ...valid, price: 100_000_001 }).price).toMatch(/Máximo/)
    expect(messages({ ...valid, title: 'x'.repeat(201) }).title).toBe('Máximo 200 caracteres')
  })
})

describe('validateImage', () => {
  it('acepta JPG, PNG o WebP de hasta 2 MB', () => {
    expect(validateImage(new File(['x'], 'a.png', { type: 'image/png' }))).toBeNull()
    expect(validateImage(new File(['x'], 'a.gif', { type: 'image/gif' }))).toMatch(/JPG, PNG o WebP/)
    const big = new File([new Uint8Array(MAX_IMAGE_BYTES + 1)], 'a.jpg', { type: 'image/jpeg' })
    expect(validateImage(big)).toMatch(/2 MB/)
  })
})

describe('stockLevel', () => {
  it.each([
    [0, 0],
    [2, 1],
    [5, 2],
    [15, 3],
    [40, 4],
  ])('stock %i → nivel %i', (stock, level) => expect(stockLevel(stock)).toBe(level))
})

describe('pageWindow', () => {
  it('muestra todas las páginas si son pocas', () => {
    expect(pageWindow(1, 4)).toEqual([1, 2, 3, 4])
  })

  it('usa elipsis alrededor de la página actual', () => {
    expect(pageWindow(5, 10)).toEqual([1, null, 4, 5, 6, null, 10])
    expect(pageWindow(1, 10)).toEqual([1, 2, null, 10])
  })
})

describe('toBookInput', () => {
  it('convierte autor y editorial elegidos en sus ids', () => {
    expect(toBookInput(bookFormSchema.parse(valid))).toEqual({
      title: 'Rayuela',
      authorId: 2,
      publisherId: 2,
      price: 15990,
      stock: 3,
      genreId: 1,
    })
  })
})

describe('nombres de catálogo', () => {
  it('normaliza espacios y compara sin distinguir mayúsculas', () => {
    expect(normalizeName('  Isabel   Allende ')).toBe('Isabel Allende')
    expect(sameName('isabel  ALLENDE', ' Isabel Allende')).toBe(true)
    expect(sameName('Isabel Allende', 'Isabel Allende Llona')).toBe(false)
  })
})
