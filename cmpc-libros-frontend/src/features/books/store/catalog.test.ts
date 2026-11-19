import { http, HttpResponse } from 'msw'
import { AUTHORS, PUBLISHERS, SESSION_USER } from '../../../test/fixtures'
import { API, CREATED_CATALOG_ID, requests, server } from '../../../test/server'
import { useAuthStore } from '../../auth/auth.store'
import { catalogService } from '../api/catalog.service'
import { catalogKey, useCatalogStore } from './catalog.store'

describe('catalogService', () => {
  it('search envía el texto y el límite', async () => {
    await expect(catalogService.search('authors', 'cort')).resolves.toEqual([AUTHORS[1]])
    expect(Object.fromEntries(new URL(requests.authorsList.url).searchParams)).toEqual({
      search: 'cort',
      limit: '20',
    })
  })

  it('search sin texto no envía el parámetro search', async () => {
    await expect(catalogService.search('publishers', '')).resolves.toEqual(PUBLISHERS)
    expect(Object.fromEntries(new URL(requests.publishersList.url).searchParams)).toEqual({ limit: '20' })
  })

  it('create envía el nombre y devuelve el registro (creado o existente)', async () => {
    await expect(catalogService.create('authors', 'Vicente Huidobro')).resolves.toEqual({
      id: CREATED_CATALOG_ID,
      name: 'Vicente Huidobro',
    })
    expect(await requests.authorsCreate.json()).toEqual({ name: 'Vicente Huidobro' })
    await expect(catalogService.create('authors', 'julio cortázar')).resolves.toEqual(AUTHORS[1])
  })

  it('normaliza los errores a ApiError', async () => {
    server.use(http.get(`${API}/authors`, () => HttpResponse.json({ message: 'x' }, { status: 500 })))
    await expect(catalogService.search('authors', 'a')).rejects.toMatchObject({ status: 500 })
  })
})

describe('catalogKey', () => {
  it('no distingue mayúsculas ni espacios sobrantes', () => {
    expect(catalogKey('authors', '  Isabel   ALLENDE ')).toBe('authors|isabel allende')
    expect(catalogKey('publishers', '')).toBe('publishers|')
  })
})

describe('useCatalogStore', () => {
  let calls = 0
  beforeEach(() => {
    calls = 0
    server.use(
      http.get(`${API}/authors`, () => {
        calls++
        return HttpResponse.json(AUTHORS)
      }),
    )
  })

  it('cachea por texto buscado y no repite la petición dentro del TTL', async () => {
    await useCatalogStore.getState().search('authors', 'a')
    await useCatalogStore.getState().search('authors', ' A ')
    expect(calls).toBe(1)
    expect(useCatalogStore.getState().searches[catalogKey('authors', 'a')]).toMatchObject({
      loading: false,
      data: AUTHORS,
    })
    await useCatalogStore.getState().search('authors', 'b')
    expect(calls).toBe(2)
  })

  it('deduplica búsquedas simultáneas iguales', async () => {
    await Promise.all([
      useCatalogStore.getState().search('authors', 'a'),
      useCatalogStore.getState().search('authors', 'a'),
    ])
    expect(calls).toBe(1)
  })

  it('vuelve a pedir cuando vence el TTL y conserva los datos mientras carga', async () => {
    await useCatalogStore.getState().search('authors', 'a')
    const key = catalogKey('authors', 'a')
    const entry = useCatalogStore.getState().searches[key]
    useCatalogStore.setState({ searches: { [key]: { ...entry, fetchedAt: Date.now() - 61_000 } } })
    await useCatalogStore.getState().search('authors', 'a')
    expect(calls).toBe(2)
  })

  it('guarda el error sin perder los resultados anteriores', async () => {
    await useCatalogStore.getState().search('authors', 'a')
    server.use(http.get(`${API}/authors`, () => HttpResponse.error()))
    const key = catalogKey('authors', 'a')
    useCatalogStore.setState({
      searches: { [key]: { ...useCatalogStore.getState().searches[key], fetchedAt: 0 } },
    })
    await useCatalogStore.getState().search('authors', 'a')
    expect(useCatalogStore.getState().searches[key].error).toMatch(/No se pudo conectar/)
    expect(useCatalogStore.getState().searches[key].data).toEqual(AUTHORS)
  })

  it('crear invalida las búsquedas de ese catálogo, pero no las de otro', async () => {
    await useCatalogStore.getState().search('authors', 'a')
    await useCatalogStore.getState().search('publishers', 'a')

    const created = await useCatalogStore.getState().create('authors', '  Vicente   Huidobro ')
    expect(created).toEqual({ id: CREATED_CATALOG_ID, name: 'Vicente Huidobro' })
    expect(await requests.authorsCreate.json()).toEqual({ name: 'Vicente Huidobro' })

    const { searches } = useCatalogStore.getState()
    expect(searches[catalogKey('authors', 'a')].fetchedAt).toBe(0)
    expect(searches[catalogKey('publishers', 'a')].fetchedAt).toBeGreaterThan(0)
  })

  it('cerrar sesión descarta la caché', async () => {
    useAuthStore.setState({ status: 'authenticated', user: SESSION_USER })
    await useCatalogStore.getState().search('authors', 'a')
    useAuthStore.getState().logout()
    expect(useCatalogStore.getState().searches).toEqual({})
  })
})
