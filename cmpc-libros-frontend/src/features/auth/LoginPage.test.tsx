import { act, screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { renderApp, signIn } from '../../test/render'
import { API, BLOCKED_PASSWORD, requests, server, session } from '../../test/server'
import { useAuthStore } from './auth.store'

describe('LoginPage', () => {
  it('valida el formulario antes de llamar a la API', async () => {
    const { user } = await renderApp('/login')
    await user.click(screen.getByRole('button', { name: 'Ingresar' }))
    expect(await screen.findByText('Ingresa un email válido')).toBeInTheDocument()
    expect(screen.getByText('Ingresa tu contraseña')).toBeInTheDocument()
  })

  it('muestra credenciales inválidas', async () => {
    const { user } = await renderApp('/login')
    await user.type(screen.getByLabelText('Email'), 'admin@cmpc.cl')
    await user.type(screen.getByLabelText('Contraseña'), 'mala')
    await user.click(screen.getByRole('button', { name: 'Ingresar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Credenciales inválidas')
  })

  it('inicia sesión y entra al catálogo', async () => {
    const { user, router } = await renderApp('/login')
    await user.type(screen.getByLabelText('Email'), 'admin@cmpc.cl')
    await user.type(screen.getByLabelText('Contraseña'), 'Admin1234!')
    await user.click(screen.getByRole('button', { name: 'Ingresar' }))
    expect(await screen.findByRole('heading', { name: 'Catálogo' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/books')
    expect(screen.getByText('admin@cmpc.cl')).toBeInTheDocument()
  })

  it('avisa cuando la sesión expiró', async () => {
    useAuthStore.setState({ expired: true })
    await renderApp('/login')
    expect(screen.getByRole('alert')).toHaveTextContent('Tu sesión expiró')
  })

  it('tras agotar los intentos bloquea el formulario con una cuenta atrás', async () => {
    const { user } = await renderApp('/login')
    await user.type(screen.getByLabelText('Email'), 'admin@cmpc.cl')
    await user.type(screen.getByLabelText('Contraseña'), BLOCKED_PASSWORD)
    await user.click(screen.getByRole('button', { name: 'Ingresar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Demasiados intentos fallidos. Podrás intentarlo de nuevo en 30 s.',
    )
    expect(screen.getByRole('button', { name: 'Espera 30 s' })).toBeDisabled()
  })

  it('al terminar la espera vuelve a habilitar el formulario', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    useAuthStore.setState({ lockedUntil: Date.now() + 2_000, lockSeconds: 2, error: 'x' })
    await renderApp('/login')
    expect(screen.getByRole('button', { name: /Espera \d s/ })).toBeDisabled()
    await act(() => vi.advanceTimersByTimeAsync(2_500))
    expect(screen.getByRole('button', { name: 'Ingresar' })).toBeEnabled()
    expect(useAuthStore.getState()).toMatchObject({ lockedUntil: null, error: null })
    vi.useRealTimers()
  })

  it('mientras confirma la sesión de la cookie no muestra el formulario', async () => {
    useAuthStore.setState({ status: 'checking' })
    await renderApp('/login')
    expect(screen.getByLabelText('Cargando')).toBeInTheDocument()
    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument()
  })

  it('con sesión activa redirige al catálogo', async () => {
    signIn()
    const { router } = await renderApp('/login')
    expect(await screen.findByRole('heading', { name: 'Catálogo' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/books')
  })
})

describe('AppShell', () => {
  it('sin sesión redirige al login recordando el destino', async () => {
    const { user, router } = await renderApp('/books?genreId=2')
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'))
    await user.type(await screen.findByLabelText('Email'), 'admin@cmpc.cl')
    await user.type(screen.getByLabelText('Contraseña'), 'Admin1234!')
    await user.click(screen.getByRole('button', { name: 'Ingresar' }))
    await screen.findByRole('heading', { name: 'Catálogo' })
    expect(router.state.location).toMatchObject({ pathname: '/books', search: '?genreId=2' })
  })

  it('salir cierra la sesión', async () => {
    signIn()
    const { user, router } = await renderApp('/')
    await user.click(await screen.findByRole('button', { name: 'Salir' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'))
    expect(useAuthStore.getState()).toMatchObject({ status: 'anonymous', user: null })
    // El backend borra la cookie.
    await waitFor(() => expect(requests.logout).toBeDefined())
  })

  it('restaura la sesión de la cookie al abrir la app', async () => {
    server.use(http.get(`${API}/auth/me`, () => HttpResponse.json(session())))
    useAuthStore.setState({ status: 'checking' })
    const view = await renderApp('/books')
    expect(screen.getByLabelText('Cargando')).toBeInTheDocument()
    await act(() => useAuthStore.getState().restore())
    expect(await view.findByRole('heading', { name: 'Catálogo' })).toBeInTheDocument()
  })

  it('ruta desconocida muestra 404', async () => {
    signIn()
    await renderApp('/no-existe')
    expect(screen.getByRole('heading', { name: 'Página no encontrada' })).toBeInTheDocument()
  })
})
