import { http, HttpResponse } from 'msw'
import { BOOKS, SESSION_USER, page } from '../../../test/fixtures'
import { API, server } from '../../../test/server'
import { useAuthStore } from '../../auth/auth.store'
import { notify, TOAST_DURATION_MS, useToastStore } from '../../notifications/toast.store'
import { listKey } from '../query'
import type { BookListQuery } from '../types'
import { useBooksStore } from './books.store'
import { useGenresStore } from './genres.store'

const query: BookListQuery = { page: 1, limit: 10, sort: [] }
const key = listKey(query)

function countListRequests() {
  const counter = { n: 0 }
  server.use(
    http.get(`${API}/books`, () => {
      counter.n++
      return HttpResponse.json(page(BOOKS))
    }),
  )
  return counter
}

describe('useBooksStore — caché del listado', () => {
  it('cachea por consulta y no repite la petición dentro del TTL', async () => {
    const counter = countListRequests()
    await useBooksStore.getState().fetchList(query)
    await useBooksStore.getState().fetchList(query)
    expect(counter.n).toBe(1)
    expect(useBooksStore.getState().lists[key]).toMatchObject({ loading: false, data: { meta: { total: 3 } } })
  })

  it('deduplica peticiones simultáneas y respeta force', async () => {
    const counter = countListRequests()
    await Promise.all([useBooksStore.getState().fetchList(query), useBooksStore.getState().fetchList(query)])
    expect(counter.n).toBe(1)
    await useBooksStore.getState().fetchList(query, { force: true })
    expect(counter.n).toBe(2)
  })

  it('vuelve a pedir cuando vence el TTL', async () => {
    const counter = countListRequests()
    await useBooksStore.getState().fetchList(query)
    const entry = useBooksStore.getState().lists[key]
    useBooksStore.setState({ lists: { [key]: { ...entry, fetchedAt: Date.now() - 61_000 } } })
    await useBooksStore.getState().fetchList(query)
    expect(counter.n).toBe(2)
  })

  it('guarda el error y conserva los datos previos', async () => {
    await useBooksStore.getState().fetchList(query)
    server.use(http.get(`${API}/books`, () => HttpResponse.json({ message: 'x' }, { status: 500 })))
    await useBooksStore.getState().fetchList(query, { force: true })
    const entry = useBooksStore.getState().lists[key]
    expect(entry.error).toMatch(/error inesperado/)
    expect(entry.data?.data).toHaveLength(3)
  })

  it('cancela el listado anterior al pedir otro distinto', async () => {
    let release: () => void = () => {}
    server.use(
      http.get(`${API}/books`, async ({ request }) => {
        if (new URL(request.url).searchParams.get('title') === 'lento') {
          await new Promise<void>((r) => (release = r))
        }
        return HttpResponse.json(page(BOOKS))
      }),
    )
    const slowQuery = { ...query, title: 'lento' }
    const slow = useBooksStore.getState().fetchList(slowQuery)
    await useBooksStore.getState().fetchList({ ...query, title: 'rápido' })
    release()
    await slow
    const slowEntry = useBooksStore.getState().lists[listKey(slowQuery)]
    expect(slowEntry).toMatchObject({ loading: false, error: undefined })
    expect(slowEntry.data).toBeUndefined()
  })
})

describe('useBooksStore — detalle y mutaciones', () => {
  it('fetchBook cachea el detalle y registra errores', async () => {
    await useBooksStore.getState().fetchBook(BOOKS[0].id)
    expect(useBooksStore.getState().details[BOOKS[0].id].data?.title).toBe(BOOKS[0].title)
    await useBooksStore.getState().fetchBook('no-existe')
    expect(useBooksStore.getState().details['no-existe'].error).toBe('Libro no encontrado')
  })

  it('crear, actualizar y subir imagen invalidan los listados', async () => {
    await useBooksStore.getState().fetchList(query)
    const input = { title: 'Nuevo', authorId: 1, publisherId: 2, price: 1, stock: 1, genreId: 1 }
    const created = await useBooksStore.getState().createBook(input)
    expect(useBooksStore.getState().lists[key].fetchedAt).toBe(0)
    expect(useBooksStore.getState().details[created.id].data?.title).toBe('Nuevo')

    await useBooksStore.getState().updateBook(BOOKS[0].id, { price: 1 })
    expect(useBooksStore.getState().details[BOOKS[0].id].data?.price).toBe(1)

    const withImage = await useBooksStore
      .getState()
      .uploadImage(BOOKS[0].id, new File(['x'], 'a.png', { type: 'image/png' }))
    expect(withImage.imageUrl).toBe('/uploads/nueva.png')
  })

  it('eliminar quita el libro de los listados cacheados', async () => {
    await useBooksStore.getState().fetchList(query)
    await useBooksStore.getState().fetchList({ ...query, title: 'zzz' })
    await useBooksStore.getState().fetchBook(BOOKS[1].id)
    await useBooksStore.getState().deleteBook(BOOKS[1].id)
    const entry = useBooksStore.getState().lists[key]
    expect(entry.data?.data.map((b) => b.title)).toEqual(['Cien años de soledad', 'Fundación'])
    expect(entry.data?.meta.total).toBe(2)
    expect(entry.fetchedAt).toBe(0)
    expect(useBooksStore.getState().details[BOOKS[1].id]).toBeUndefined()
  })

  it('exportCsv marca el estado de exportación y descarga', async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const promise = useBooksStore.getState().exportCsv({ sort: [] })
    expect(useBooksStore.getState().exporting).toBe(true)
    await promise
    expect(useBooksStore.getState().exporting).toBe(false)
    expect(click).toHaveBeenCalled()
  })

  it('cerrar sesión descarta la caché', async () => {
    useAuthStore.setState({ status: 'authenticated', user: SESSION_USER })
    await useBooksStore.getState().fetchList(query)
    useAuthStore.getState().logout()
    expect(useBooksStore.getState().lists).toEqual({})
  })
})

describe('useGenresStore', () => {
  it('pide los géneros una sola vez por sesión', async () => {
    let calls = 0
    server.use(
      http.get(`${API}/genres`, () => {
        calls++
        return HttpResponse.json([{ id: 1, name: 'Ficción' }])
      }),
    )
    await useGenresStore.getState().fetchGenres()
    await useGenresStore.getState().fetchGenres()
    expect(calls).toBe(1)
    expect(useGenresStore.getState().genres).toHaveLength(1)
  })

  it('registra el error', async () => {
    server.use(http.get(`${API}/genres`, () => HttpResponse.error()))
    await useGenresStore.getState().fetchGenres()
    expect(useGenresStore.getState().error).toMatch(/No se pudo conectar/)
  })

  it('se limpia al cerrar sesión', async () => {
    useAuthStore.setState({ status: 'authenticated', user: SESSION_USER })
    await useGenresStore.getState().fetchGenres()
    useAuthStore.getState().logout()
    expect(useGenresStore.getState().genres).toBeNull()
  })
})

describe('useToastStore', () => {
  it('agrega, limita a 4 y descarta automáticamente', () => {
    vi.useFakeTimers()
    for (let i = 0; i < 5; i++) notify.info(`m${i}`)
    notify.success('ok')
    notify.error('mal')
    expect(useToastStore.getState().toasts).toHaveLength(4)
    vi.advanceTimersByTime(TOAST_DURATION_MS)
    expect(useToastStore.getState().toasts).toHaveLength(0)
    vi.useRealTimers()
  })
})
