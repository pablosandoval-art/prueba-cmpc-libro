import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { BOOKS } from '../../../test/fixtures'
import { renderApp, signIn } from '../../../test/render'
import { API, requests, server } from '../../../test/server'

type User = Awaited<ReturnType<typeof renderApp>>['user']

describe('Modal del libro: detalle', () => {
  beforeEach(signIn)

  it('abre el detalle sobre el listado y lo cierra conservando los filtros', async () => {
    const { user, router } = await renderApp('/books?genreId=1')
    await user.click(await screen.findByRole('link', { name: 'Ver detalle de Fundación' }))
    const dialog = await screen.findByRole('dialog', { name: 'Fundación' })
    expect(within(dialog).getByText('Isaac Asimov')).toBeInTheDocument()
    expect(within(dialog).getByText('$14.990')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe(`/books/${BOOKS[2].id}`)
    await user.click(within(dialog).getByRole('button', { name: 'Cerrar' }))
    expect(router.state.location).toMatchObject({ pathname: '/books', search: '?genreId=1' })
  })

  it('desde el detalle se puede eliminar', async () => {
    const { user, router } = await renderApp(`/books/${BOOKS[0].id}`)
    const dialog = await screen.findByRole('dialog', { name: BOOKS[0].title })
    await user.click(within(dialog).getByRole('button', { name: 'Eliminar' }))
    await user.click(
      within(screen.getByRole('dialog', { name: '¿Eliminar este libro?' })).getByRole('button', { name: 'Eliminar' }),
    )
    await waitFor(() => expect(router.state.location.pathname).toBe('/books'))
  })

  it('informa si el libro no existe', async () => {
    await renderApp('/books/no-existe')
    expect(await screen.findByRole('dialog', { name: 'Libro no disponible' })).toHaveTextContent('Libro no encontrado')
  })
})

describe('Modal del libro: crear y editar', () => {
  beforeEach(signIn)

  const form = () => screen.getByRole('dialog', { name: /Nuevo libro|Editar libro/ })
  const field = (label: string) => within(form()).getByLabelText(label)

  async function fillValid(user: User) {
    await user.type(field('Título'), 'Altazor')
    // Autor nuevo: se crea al vuelo desde el combobox.
    await user.type(field('Autor'), 'Vicente Huidobro')
    await user.click(await screen.findByRole('option', { name: 'Crear el autor «Vicente Huidobro»' }))
    // Editorial existente: se elige de la lista.
    await user.type(field('Editorial'), 'alfa')
    await user.click(await screen.findByRole('option', { name: 'Alfaguara' }))
    await user.type(field('Precio (CLP)'), '12990')
    await user.type(field('Disponibilidad'), '5')
    await within(form()).findByRole('option', { name: 'Poesía' })
    await user.selectOptions(field('Género'), 'Poesía')
  }

  it('«Nuevo libro» abre el formulario en un modal sobre el catálogo filtrado, con el foco en el título', async () => {
    const { user, router } = await renderApp('/books?genreId=3')
    await user.click(await screen.findByRole('link', { name: 'Nuevo libro' }))
    expect(await screen.findByRole('dialog', { name: 'Nuevo libro' })).toBeInTheDocument()
    expect(router.state.location).toMatchObject({ pathname: '/books/new', search: '?genreId=3' })
    // El catálogo sigue detrás.
    expect(screen.getByRole('heading', { name: 'Catálogo' })).toBeInTheDocument()
    expect(field('Título')).toHaveFocus()
  })

  it('valida en tiempo real e indica qué falta en el pie', async () => {
    const { user } = await renderApp('/books/new')
    const title = field('Título')
    await user.type(title, 'x')
    await user.clear(title)
    expect(await within(form()).findByText('Ingresa el título')).toBeInTheDocument()
    await user.click(within(form()).getByRole('button', { name: 'Crear libro' }))
    expect(
      await within(form()).findByText(/Falta completar: título, autor, editorial, precio, disponibilidad, género/),
    ).toBeInTheDocument()
    expect(requests.create).toBeUndefined()
  })

  it('crea un libro con imagen, vuelve al catálogo y lo refresca', async () => {
    const { user, router } = await renderApp('/books?genreId=3')
    await user.click(await screen.findByRole('link', { name: 'Nuevo libro' }))
    await screen.findByRole('dialog', { name: 'Nuevo libro' })
    const listRequests = () => requests.list
    const before = listRequests()
    await fillValid(user)
    expect(within(form()).getByText('$12.990')).toBeInTheDocument()
    await user.upload(field('Portada (opcional)'), new File(['x'], 'a.png', { type: 'image/png' }))
    await user.click(within(form()).getByRole('button', { name: 'Crear libro' }))
    expect(await screen.findByText('«Altazor» se agregó al catálogo.')).toBeInTheDocument()
    expect(await requests.create.json()).toEqual({
      title: 'Altazor',
      authorId: 100,
      publisherId: 2,
      price: 12990,
      stock: 5,
      genreId: 3,
    })
    expect(requests.image).toBeDefined()
    await waitFor(() => expect(router.state.location).toMatchObject({ pathname: '/books', search: '?genreId=3' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    // El catálogo, que siguió montado detrás, vuelve a pedir su listado.
    await waitFor(() => expect(listRequests()).not.toBe(before))
  })

  it('si la imagen falla, el libro queda guardado y se sigue editando para reintentar', async () => {
    server.use(http.post(`${API}/books/:id/image`, () => HttpResponse.json({}, { status: 413 })))
    const { user, router } = await renderApp('/books/new')
    await fillValid(user)
    await user.upload(field('Portada (opcional)'), new File(['x'], 'a.png', { type: 'image/png' }))
    await user.click(within(form()).getByRole('button', { name: 'Crear libro' }))
    expect(await screen.findByText(/El libro se guardó, pero la imagen no se pudo subir/)).toBeInTheDocument()
    await waitFor(() => expect(router.state.location.pathname).toMatch(/\/edit$/))
  })

  it('muestra el error del servidor sin perder lo escrito', async () => {
    server.use(
      http.post(`${API}/books`, () =>
        HttpResponse.json({ statusCode: 400, message: ['price must not be less than 0'] }, { status: 400 }),
      ),
    )
    const { user } = await renderApp('/books/new')
    await fillValid(user)
    await user.click(within(form()).getByRole('button', { name: 'Crear libro' }))
    expect(
      await within(form()).findByText(/Revisa los datos ingresados\. price must not be less than 0/),
    ).toBeInTheDocument()
    expect(field('Título')).toHaveValue('Altazor')
  })

  it('«Editar» transforma el mismo modal en el formulario y, al guardar, vuelve al detalle actualizado', async () => {
    const { user, router } = await renderApp(`/books/${BOOKS[0].id}`)
    const detail = await screen.findByRole('dialog', { name: BOOKS[0].title })
    await user.click(within(detail).getByRole('button', { name: 'Editar' }))
    const editing = await screen.findByRole('dialog', { name: 'Editar libro' })
    // No se cerró y reabrió: es el mismo <dialog>.
    expect(editing).toBe(detail)
    expect(router.state.location.pathname).toBe(`/books/${BOOKS[0].id}/edit`)
    await waitFor(() => expect(field('Título')).toHaveFocus())

    const price = field('Precio (CLP)')
    expect(price).toHaveValue(18990)
    await user.clear(price)
    await user.type(price, '20000')
    await user.click(within(editing).getByRole('button', { name: 'Guardar cambios' }))
    expect(await screen.findByText(`«${BOOKS[0].title}» se actualizó.`)).toBeInTheDocument()
    expect(await requests.update.json()).toMatchObject({ price: 20000 })
    await waitFor(() => expect(router.state.location.pathname).toBe(`/books/${BOOKS[0].id}`))
    expect(screen.getByRole('dialog', { name: BOOKS[0].title })).toBe(detail)
  })

  it('cancelar sin cambios vuelve al detalle si se entró desde ahí, sin preguntar', async () => {
    const { user, router } = await renderApp(`/books/${BOOKS[0].id}`)
    await user.click(
      within(await screen.findByRole('dialog', { name: BOOKS[0].title })).getByRole('button', { name: 'Editar' }),
    )
    await user.click(
      within(await screen.findByRole('dialog', { name: 'Editar libro' })).getByRole('button', { name: 'Cancelar' }),
    )
    await waitFor(() => expect(router.state.location.pathname).toBe(`/books/${BOOKS[0].id}`))
    expect(screen.queryByRole('dialog', { name: '¿Descartar los cambios?' })).not.toBeInTheDocument()
  })

  it('el lápiz de la tabla abre la edición y, al cancelar, vuelve al catálogo', async () => {
    const { user, router } = await renderApp('/books?genreId=1')
    await user.click(await screen.findByRole('link', { name: 'Editar Rayuela' }))
    expect(await screen.findByRole('dialog', { name: 'Editar libro' })).toBeInTheDocument()
    expect(router.state.location).toMatchObject({ pathname: `/books/${BOOKS[1].id}/edit`, search: '?genreId=1' })
    await user.click(within(form()).getByRole('button', { name: 'Cerrar' }))
    await waitFor(() => expect(router.state.location).toMatchObject({ pathname: '/books', search: '?genreId=1' }))
  })

  it('con cambios sin guardar pide confirmación: seguir editando conserva lo escrito', async () => {
    const { user, router } = await renderApp('/books')
    await user.click(await screen.findByRole('link', { name: 'Nuevo libro' }))
    await screen.findByRole('dialog', { name: 'Nuevo libro' })
    await user.type(field('Título'), 'Borrador')
    await user.click(within(form()).getByRole('button', { name: 'Cancelar' }))

    const confirm = await screen.findByRole('dialog', { name: '¿Descartar los cambios?' })
    expect(router.state.location.pathname).toBe('/books/new')
    await user.click(within(confirm).getByRole('button', { name: 'Seguir editando' }))
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: '¿Descartar los cambios?' })).not.toBeInTheDocument(),
    )
    expect(field('Título')).toHaveValue('Borrador')
    expect(router.state.location.pathname).toBe('/books/new')
  })

  it('con cambios sin guardar, descartar cierra el formulario', async () => {
    const { user, router } = await renderApp('/books')
    await user.click(await screen.findByRole('link', { name: 'Nuevo libro' }))
    await screen.findByRole('dialog', { name: 'Nuevo libro' })
    await user.type(field('Título'), 'Borrador')
    // Esc, la X o un clic fuera también pasan por la confirmación.
    await user.click(within(form()).getByRole('button', { name: 'Cerrar' }))
    await user.click(
      within(await screen.findByRole('dialog', { name: '¿Descartar los cambios?' })).getByRole('button', {
        name: 'Descartar cambios',
      }),
    )
    await waitFor(() => expect(router.state.location.pathname).toBe('/books'))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('una imagen elegida también cuenta como cambio sin guardar', async () => {
    const { user } = await renderApp(`/books/${BOOKS[0].id}/edit`)
    await screen.findByRole('dialog', { name: 'Editar libro' })
    await user.upload(field('Portada (opcional)'), new File(['x'], 'a.png', { type: 'image/png' }))
    await user.click(within(form()).getByRole('button', { name: 'Cancelar' }))
    expect(await screen.findByRole('dialog', { name: '¿Descartar los cambios?' })).toBeInTheDocument()
  })

  it('entrando por enlace directo, guardar vuelve al catálogo', async () => {
    const { user, router } = await renderApp(`/books/${BOOKS[0].id}/edit`)
    const price = await within(await screen.findByRole('dialog', { name: 'Editar libro' })).findByLabelText(
      'Precio (CLP)',
    )
    await user.clear(price)
    await user.type(price, '21000')
    await user.click(within(form()).getByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/books'))
  })

  it('edición de un libro inexistente muestra el error', async () => {
    await renderApp('/books/no-existe/edit')
    expect(await screen.findByText('Libro no encontrado')).toBeInTheDocument()
  })
})
