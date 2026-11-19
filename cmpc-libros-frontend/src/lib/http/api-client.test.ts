import { http, HttpResponse } from 'msw'
import { API, server } from '../../test/server'
import { createApiClient, registerSession } from './api-client'
import { toApiError } from './api-error'

describe('apiClient', () => {
  const client = createApiClient(API)

  it('envía la cookie de sesión (credenciales) y nunca una cabecera Authorization', async () => {
    let credentials: RequestCredentials | undefined
    let auth: string | null = 'x'
    server.use(
      http.get(`${API}/ping`, ({ request }) => {
        credentials = request.credentials
        auth = request.headers.get('Authorization')
        return HttpResponse.json({ ok: true })
      }),
    )
    registerSession({ isAuthenticated: () => true, onUnauthorized: vi.fn() })
    await client.get('/ping')
    expect(credentials).toBe('include')
    expect(auth).toBeNull()
  })

  it('notifica un 401 sólo si había sesión y no es una ruta de auth', async () => {
    server.use(
      http.get(`${API}/ping`, () => new HttpResponse(null, { status: 401 })),
      http.get(`${API}/auth/me`, () => new HttpResponse(null, { status: 401 })),
    )
    const onUnauthorized = vi.fn()

    registerSession({ isAuthenticated: () => true, onUnauthorized })
    await expect(client.get('/ping')).rejects.toThrow()
    expect(onUnauthorized).toHaveBeenCalledTimes(1)

    await expect(client.get('/auth/me')).rejects.toThrow()
    expect(onUnauthorized).toHaveBeenCalledTimes(1)

    registerSession({ isAuthenticated: () => false, onUnauthorized })
    await expect(client.get('/ping')).rejects.toThrow()
    expect(onUnauthorized).toHaveBeenCalledTimes(1)
  })

  it('un 429 trae los segundos de espera (cuerpo o cabecera Retry-After)', async () => {
    server.use(
      http.post(`${API}/body`, () =>
        HttpResponse.json({ statusCode: 429, message: 'Espera', retryAfter: 12 }, { status: 429 }),
      ),
      http.post(`${API}/header`, () =>
        HttpResponse.json({ statusCode: 429 }, { status: 429, headers: { 'Retry-After': '7' } }),
      ),
      http.post(`${API}/sin-dato`, () => HttpResponse.json({}, { status: 429 })),
    )
    const err = async (path: string) => toApiError(await client.post(path).catch((e: unknown) => e))
    await expect(err('/body')).resolves.toMatchObject({ status: 429, retryAfter: 12, message: 'Espera' })
    await expect(err('/header')).resolves.toMatchObject({ retryAfter: 7 })
    await expect(err('/sin-dato')).resolves.toMatchObject({
      retryAfter: undefined,
      message: 'Demasiados intentos. Espera unos segundos e inténtalo de nuevo.',
    })
  })
})
