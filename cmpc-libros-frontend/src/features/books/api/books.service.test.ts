import { http, HttpResponse } from 'msw'
import { ApiError } from '../../../lib/http/api-error'
import { BOOKS, GENRES } from '../../../test/fixtures'
import { API, requests, server } from '../../../test/server'
import { authService } from '../../auth/auth.service'
import { booksService, genresService } from './books.service'

describe('booksService', () => {
  it('list envía filtros, orden y paginación como query params', async () => {
    const result = await booksService.list({
      title: 'cien',
      available: true,
      page: 2,
      limit: 20,
      sort: [{ field: 'price', direction: 'desc' }],
    })
    expect(result.meta.total).toBe(1)
    const params = new URL(requests.list.url).searchParams
    expect(Object.fromEntries(params)).toEqual({
      title: 'cien',
      available: 'true',
      sort: 'price:desc',
      page: '2',
      limit: '20',
    })
  })

  it('get, create, update y remove usan los verbos REST', async () => {
    await expect(booksService.get(BOOKS[0].id)).resolves.toMatchObject({ title: BOOKS[0].title })
    const input = { title: 'T', authorId: 1, publisherId: 2, price: 1, stock: 1, genreId: 1 }
    await expect(booksService.create(input)).resolves.toMatchObject({ title: 'T' })
    expect(await requests.create.json()).toEqual(input)
    await expect(booksService.update(BOOKS[0].id, { price: 5 })).resolves.toMatchObject({ price: 5 })
    await expect(booksService.remove(BOOKS[0].id)).resolves.toBeUndefined()
    expect(requests.delete.method).toBe('DELETE')
  })

  it('uploadImage envía multipart con el campo image', async () => {
    const file = new File(['png'], 'portada.png', { type: 'image/png' })
    const book = await booksService.uploadImage(BOOKS[0].id, file)
    expect(book.imageUrl).toBe('/uploads/nueva.png')
    expect(requests.image.headers.get('content-type')).toMatch(/^multipart\/form-data; boundary=/)
    const body = await requests.image.text()
    expect(body).toContain('name="image"; filename="portada.png"')
  })

  it('exportCsv pide el CSV con los filtros activos', async () => {
    const blob = await booksService.exportCsv({ genreId: 2, sort: [{ field: 'title', direction: 'asc' }] })
    expect(blob).toBeInstanceOf(Blob)
    expect(Object.fromEntries(new URL(requests.export.url).searchParams)).toEqual({ genreId: '2', sort: 'title:asc' })
  })

  it('normaliza los errores a ApiError', async () => {
    const error = await booksService.get('nope').catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 404, message: 'Libro no encontrado' })
  })
})

describe('genresService / authService', () => {
  it('lista géneros', async () => {
    await expect(genresService.list()).resolves.toEqual(GENRES)
  })

  it('login devuelve la sesión (sin token) o ApiError', async () => {
    const session = await authService.login('admin@cmpc.cl', 'Admin1234!')
    expect(session).toMatchObject({ user: { email: 'admin@cmpc.cl' } })
    expect(session).not.toHaveProperty('accessToken')
    await expect(authService.login('admin@cmpc.cl', 'mala')).rejects.toMatchObject({
      status: 401,
      message: 'Credenciales inválidas',
    })
  })

  it('error de servidor en géneros', async () => {
    server.use(http.get(`${API}/genres`, () => HttpResponse.json({}, { status: 503 })))
    await expect(genresService.list()).rejects.toBeInstanceOf(ApiError)
  })
})
