import { screen, waitFor, within } from '@testing-library/react'
import { delay, http, HttpResponse } from 'msw'
import { BOOKS, page } from '../../../test/fixtures'
import { renderApp, signIn } from '../../../test/render'
import { API, requests, server } from '../../../test/server'

describe('BooksPage (listado)', () => {
  beforeEach(signIn)

  it('carga el listado y muestra el total', async () => {
    await renderApp('/books')
    expect(await screen.findByRole('link', { name: 'Cien años de soledad' })).toBeInTheDocument()
    expect(screen.getByText('3 libros')).toBeInTheDocument()
    // La sesión viaja en la cookie: la petición se hace con credenciales y sin cabecera Authorization.
    expect(requests.list.credentials).toBe('include')
    expect(requests.list.headers.get('Authorization')).toBeNull()
  })

  it('busca en tiempo real con debounce y lo refleja en la URL', async () => {
    const { user, router } = await renderApp('/books')
    await screen.findByRole('link', { name: 'Rayuela' })
    await user.type(screen.getByLabelText('Título'), 'rayu')
    await waitFor(() => expect(router.state.location.search).toBe('?title=rayu'))
    // La petición sale con el texto ya aplicado y, al llegar, la tabla muestra sólo lo filtrado.
    await waitFor(() => expect(new URL(requests.list.url).searchParams.get('title')).toBe('rayu'))
    await waitFor(() => expect(screen.queryByRole('link', { name: 'Cien años de soledad' })).not.toBeInTheDocument())
    expect(screen.getByRole('link', { name: 'Rayuela' })).toBeInTheDocument()
    expect(screen.getByLabelText('Título')).toHaveValue('rayu')
  })

  it('filtra por género y disponibilidad, y limpia los filtros', async () => {
    const { user, router } = await renderApp('/books')
    await screen.findByRole('option', { name: 'Ficción' })
    await user.selectOptions(screen.getByLabelText('Género'), 'Ficción')
    await user.click(screen.getByRole('switch', { name: 'Sólo con stock' }))
    await waitFor(() => expect(router.state.location.search).toBe('?genreId=1&available=true'))
    await user.click(screen.getByRole('button', { name: 'Limpiar filtros' }))
    expect(router.state.location.search).toBe('')
  })

  it('ordena por varias columnas', async () => {
    const { user, router } = await renderApp('/books')
    await screen.findByRole('link', { name: 'Rayuela' })
    await user.click(screen.getByRole('button', { name: /^Precio/ }))
    await user.click(screen.getByRole('button', { name: /^Precio/ }))
    await user.click(screen.getByRole('button', { name: /^Título/ }))
    await waitFor(() => expect(router.state.location.search).toBe('?sort=price%3Adesc%2Ctitle%3Aasc'))
    await waitFor(() => expect(new URL(requests.list.url).searchParams.get('sort')).toBe('price:desc,title:asc'))
  })

  it('pagina en el servidor', async () => {
    server.use(
      http.get(`${API}/books`, ({ request }) => {
        requests.list = request
        const p = Number(new URL(request.url).searchParams.get('page') ?? 1)
        return HttpResponse.json(page(BOOKS, 25, p))
      }),
    )
    const { user } = await renderApp('/books')
    await user.click(await screen.findByRole('button', { name: 'Página 3' }))
    await waitFor(() => expect(new URL(requests.list.url).searchParams.get('page')).toBe('3'))
  })

  it('exporta CSV con los filtros activos', async () => {
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const { user } = await renderApp('/books?genreId=2&sort=title:asc')
    await screen.findByRole('link', { name: 'Rayuela' })
    await user.click(screen.getByRole('button', { name: 'Exportar CSV' }))
    expect(await screen.findByText('Exportación lista: revisa tus descargas.')).toBeInTheDocument()
    expect(Object.fromEntries(new URL(requests.export.url).searchParams)).toEqual({ genreId: '2', sort: 'title:asc' })
  })

  it('informa si la exportación falla', async () => {
    server.use(http.get(`${API}/books/export`, () => HttpResponse.json({}, { status: 500 })))
    const { user } = await renderApp('/books')
    await screen.findByRole('link', { name: 'Rayuela' })
    await user.click(screen.getByRole('button', { name: 'Exportar CSV' }))
    expect(await screen.findByText(/error inesperado/)).toBeInTheDocument()
  })

  it('muestra estado vacío y estado de error con reintento', async () => {
    await renderApp('/books?title=zzzz')
    expect(await screen.findByText('Sin resultados')).toBeInTheDocument()
  })

  it('error de carga permite reintentar', async () => {
    server.use(http.get(`${API}/books`, () => HttpResponse.error(), { once: true }))
    const { user } = await renderApp('/books')
    await user.click(await screen.findByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByRole('link', { name: 'Rayuela' })).toBeInTheDocument()
  })

  it('elimina un libro tras confirmar', async () => {
    const { user } = await renderApp('/books')
    await user.click(await screen.findByRole('button', { name: 'Eliminar Rayuela' }))
    const dialog = screen.getByRole('dialog', { name: '¿Eliminar este libro?' })
    await user.click(within(dialog).getByRole('button', { name: 'Eliminar' }))
    expect(await screen.findByText('«Rayuela» se eliminó del catálogo.')).toBeInTheDocument()
    expect(new URL(requests.delete.url).pathname).toBe(`/api/books/${BOOKS[1].id}`)
  })

  it('si eliminar falla lo informa', async () => {
    server.use(
      http.delete(`${API}/books/:id`, () => HttpResponse.json({ message: 'Libro no encontrado' }, { status: 404 })),
    )
    const { user } = await renderApp('/books')
    await user.click(await screen.findByRole('button', { name: 'Eliminar Rayuela' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Eliminar' }))
    expect(await screen.findByText('Libro no encontrado')).toBeInTheDocument()
  })

  it('conserva las filas anteriores (atenuadas) mientras llega el resultado de un filtro nuevo', async () => {
    server.use(
      http.get(`${API}/books`, async ({ request }) => {
        requests.list = request
        const title = new URL(request.url).searchParams.get('title')
        if (title) await delay(400)
        return HttpResponse.json(page(title ? [BOOKS[1]] : BOOKS))
      }),
    )
    const { user } = await renderApp('/books')
    await screen.findByRole('link', { name: 'Cien años de soledad' })

    await user.type(screen.getByLabelText('Título'), 'rayu')
    // El filtro ya se aplicó pero la respuesta aún no llega: la tabla no se vacía ni salta.
    await waitFor(() => expect(screen.getByRole('progressbar')).toBeInTheDocument())
    expect(screen.getByRole('link', { name: 'Cien años de soledad' })).toBeInTheDocument()
    expect(screen.getByRole('table')).toHaveAttribute('aria-busy', 'true')

    await waitFor(() => expect(screen.queryByRole('link', { name: 'Cien años de soledad' })).not.toBeInTheDocument())
    expect(screen.getByRole('link', { name: 'Rayuela' })).toBeInTheDocument()
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  })

  it('la tabla conserva siempre las filas de la página, con filas en blanco', async () => {
    const { container } = await renderApp('/books?limit=20')
    await screen.findByRole('link', { name: 'Rayuela' })
    expect(container.querySelectorAll('tbody tr[aria-hidden="true"]')).toHaveLength(20 - BOOKS.length)
  })

  it('con 0 resultados mantiene la tabla y centra el mensaje sobre las filas en blanco', async () => {
    const { container } = await renderApp('/books?title=zzzz')
    expect(await screen.findByText('Sin resultados')).toBeInTheDocument()
    expect(container.querySelectorAll('tbody tr[aria-hidden="true"]')).toHaveLength(10)
  })

  it('muestra el orden activo y permite quitarlo con un clic', async () => {
    const { user, router } = await renderApp('/books?sort=price:desc,title:asc')
    await screen.findByRole('link', { name: 'Rayuela' })

    const summary = screen.getByText(/^Orden:/).closest('p') as HTMLElement
    expect(within(summary).getByText('Precio')).toBeInTheDocument()
    expect(within(summary).getByText('Título')).toBeInTheDocument()
    expect(within(summary).getByLabelText('descendente')).toBeInTheDocument()
    expect(within(summary).getByLabelText('ascendente')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Quitar orden' }))
    expect(router.state.location.search).toBe('')
    expect(screen.queryByRole('button', { name: 'Quitar orden' })).not.toBeInTheDocument()
    expect(screen.queryByText(/^Orden:/)).not.toBeInTheDocument()
    await waitFor(() => expect(new URL(requests.list.url).searchParams.has('sort')).toBe(false))
  })

  it('sin orden activo no hay botón para quitarlo', async () => {
    await renderApp('/books')
    await screen.findByRole('link', { name: 'Rayuela' })
    expect(screen.queryByRole('button', { name: 'Quitar orden' })).not.toBeInTheDocument()
  })

  it('quitar el orden conserva los filtros activos', async () => {
    const { user, router } = await renderApp('/books?genreId=1&sort=stock:asc')
    await screen.findByRole('link', { name: 'Rayuela' })
    await user.click(screen.getByRole('button', { name: 'Quitar orden' }))
    expect(router.state.location.search).toBe('?genreId=1')
  })
})
