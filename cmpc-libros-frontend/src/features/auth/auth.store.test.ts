import { http, HttpResponse } from 'msw'
import { apiClient } from '../../lib/http/api-client'
import { SESSION_USER } from '../../test/fixtures'
import { API, BLOCKED_PASSWORD, requests, server, session } from '../../test/server'
import { isSessionValid, restoreSession, useAuthStore } from './auth.store'

const authenticated = () =>
  useAuthStore.setState({
    status: 'authenticated',
    user: SESSION_USER,
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
  })

describe('useAuthStore', () => {
  it('login exitoso guarda usuario y expiración, nunca el token', async () => {
    await expect(useAuthStore.getState().login('admin@cmpc.cl', 'Admin1234!')).resolves.toBe(true)
    const state = useAuthStore.getState()
    expect(state).toMatchObject({ status: 'authenticated', user: SESSION_USER, loading: false, error: null })
    expect(isSessionValid(state)).toBe(true)
    expect(JSON.stringify(state)).not.toMatch(/token/i)
    expect(sessionStorage.length).toBe(0)
    expect(localStorage.length).toBe(0)
    expect(requests.login.credentials).toBe('include')
  })

  it('login fallido expone el mensaje', async () => {
    await expect(useAuthStore.getState().login('admin@cmpc.cl', 'mala')).resolves.toBe(false)
    expect(useAuthStore.getState()).toMatchObject({
      status: 'anonymous',
      error: 'Credenciales inválidas',
      lockedUntil: null,
    })
  })

  it('un 429 registra hasta cuándo está bloqueado el login', async () => {
    const before = Date.now()
    await useAuthStore.getState().login('admin@cmpc.cl', BLOCKED_PASSWORD)
    const { lockedUntil, lockSeconds, error } = useAuthStore.getState()
    expect(lockSeconds).toBe(30)
    expect(lockedUntil).toBeGreaterThanOrEqual(before + 30_000)
    expect(error).toMatch(/Demasiados intentos/)
    useAuthStore.getState().clearLock()
    expect(useAuthStore.getState()).toMatchObject({ lockedUntil: null, lockSeconds: 0, error: null })
  })

  it('un login correcto quita el bloqueo anterior', async () => {
    useAuthStore.setState({ lockedUntil: Date.now() + 5_000, lockSeconds: 5 })
    await useAuthStore.getState().login('admin@cmpc.cl', 'Admin1234!')
    expect(useAuthStore.getState()).toMatchObject({ lockedUntil: null, lockSeconds: 0 })
  })

  it('logout limpia la sesión, avisa la expiración y pide al backend borrar la cookie', async () => {
    authenticated()
    useAuthStore.getState().logout('expired')
    expect(useAuthStore.getState()).toMatchObject({ status: 'anonymous', user: null, expired: true })
    await vi.waitFor(() => expect(requests.logout).toBeDefined())
  })

  it('logout sin sesión no llama al backend', async () => {
    useAuthStore.getState().logout()
    await new Promise((r) => setTimeout(r, 20))
    expect(requests.logout).toBeUndefined()
  })

  it('si el backend no responde al logout, la sesión local igual se cierra', async () => {
    server.use(http.post(`${API}/auth/logout`, () => HttpResponse.error()))
    authenticated()
    useAuthStore.getState().logout()
    expect(useAuthStore.getState().status).toBe('anonymous')
  })

  it('la sesión expira sola al llegar a expiresAt', async () => {
    vi.useFakeTimers()
    await useAuthStore.getState().login('admin@cmpc.cl', 'Admin1234!')
    vi.advanceTimersByTime(12 * 3_600_000 + 1)
    expect(useAuthStore.getState()).toMatchObject({ status: 'anonymous', expired: true })
    vi.useRealTimers()
  })

  it('isSessionValid exige sesión autenticada y expiración futura', () => {
    expect(isSessionValid({ status: 'anonymous', expiresAt: null })).toBe(false)
    expect(isSessionValid({ status: 'checking', expiresAt: '2999-01-01T00:00:00Z' })).toBe(false)
    expect(isSessionValid({ status: 'authenticated', expiresAt: '2000-01-01T00:00:00Z' })).toBe(false)
    expect(isSessionValid({ status: 'authenticated', expiresAt: '2999-01-01T00:00:00Z' })).toBe(true)
  })
})

describe('restoreSession', () => {
  it('recupera la sesión de la cookie vigente', async () => {
    server.use(http.get(`${API}/auth/me`, () => HttpResponse.json(session())))
    useAuthStore.setState({ status: 'checking' })
    await restoreSession()
    expect(useAuthStore.getState()).toMatchObject({ status: 'authenticated', user: SESSION_USER, expired: false })
  })

  it('sin cookie (401) queda sin sesión y sin aviso de expiración', async () => {
    useAuthStore.setState({ status: 'checking' })
    await restoreSession()
    expect(useAuthStore.getState()).toMatchObject({ status: 'anonymous', expired: false })
  })

  it('descarta una sesión que el backend da por ya vencida', async () => {
    server.use(
      http.get(`${API}/auth/me`, () => HttpResponse.json({ ...session(), expiresAt: '2000-01-01T00:00:00.000Z' })),
    )
    useAuthStore.setState({ status: 'checking' })
    await restoreSession()
    expect(useAuthStore.getState().status).toBe('anonymous')
  })

  it('un 401 de una ruta protegida cierra la sesión como expirada', async () => {
    authenticated()
    server.use(http.get(`${API}/protegido`, () => new HttpResponse(null, { status: 401 })))
    await expect(apiClient.get('/protegido')).rejects.toThrow()
    expect(useAuthStore.getState()).toMatchObject({ status: 'anonymous', expired: true })
  })
})
