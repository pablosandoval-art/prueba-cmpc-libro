import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { sameName } from '../features/books/catalog'
import type { CatalogItem } from '../features/books/types'
import { AUDIT_LOGS, AUTHORS, BOOKS, GENRES, PUBLISHERS, SESSION_USER, auditPage, makeBook, page } from './fixtures'

export const API = 'http://localhost:3000/api'

/** Contraseña con la que el login simulado responde 429 (bloqueo por intentos fallidos). */
export const BLOCKED_PASSWORD = 'bloqueada'

/** Sesión vigente (12 h) tal como la devuelven login y /auth/me. */
export function session() {
  return { expiresAt: new Date(Date.now() + 12 * 3_600_000).toISOString(), user: SESSION_USER }
}

/** Último request recibido por endpoint, para verificar parámetros y headers. */
export const requests: Record<string, Request> = {}

/** Nombre nuevo que devuelve el POST de catálogos cuando no existía. */
export const CREATED_CATALOG_ID = 100

/** GET (búsqueda) y POST (busca o crea) de un catálogo de nombres. */
function catalogHandlers(kind: 'authors' | 'publishers', items: CatalogItem[]) {
  return [
    http.get(`${API}/${kind}`, ({ request }) => {
      requests[`${kind}List`] = request
      const search = new URL(request.url).searchParams.get('search')?.toLowerCase()
      return HttpResponse.json(search ? items.filter((i) => i.name.toLowerCase().includes(search)) : items)
    }),
    http.post(`${API}/${kind}`, async ({ request }) => {
      requests[`${kind}Create`] = request.clone()
      const { name } = (await request.json()) as { name: string }
      const existing = items.find((i) => sameName(i.name, name))
      return existing
        ? HttpResponse.json(existing)
        : HttpResponse.json({ id: CREATED_CATALOG_ID, name }, { status: 201 })
    }),
  ]
}

export const handlers = [
  ...catalogHandlers('authors', AUTHORS),
  ...catalogHandlers('publishers', PUBLISHERS),

  http.post(`${API}/auth/login`, async ({ request }) => {
    requests.login = request.clone()
    const body = (await request.json()) as { email: string; password: string }
    if (body.password === BLOCKED_PASSWORD) {
      return HttpResponse.json(
        {
          statusCode: 429,
          message: 'Demasiados intentos fallidos. Vuelve a intentarlo en 30 s.',
          error: 'Too Many Requests',
          retryAfter: 30,
        },
        { status: 429, headers: { 'Retry-After': '30' } },
      )
    }
    if (body.password !== 'Admin1234!') {
      return HttpResponse.json({ statusCode: 401, message: 'Credenciales inválidas' }, { status: 401 })
    }
    // El token real viaja en una cookie HttpOnly: el cuerpo sólo trae la sesión.
    return HttpResponse.json(session())
  }),

  http.get(`${API}/auth/me`, () =>
    HttpResponse.json({ statusCode: 401, message: 'Token de acceso requerido' }, { status: 401 }),
  ),

  http.post(`${API}/auth/logout`, ({ request }) => {
    requests.logout = request
    return new HttpResponse(null, { status: 204 })
  }),

  http.get(`${API}/genres`, () => HttpResponse.json(GENRES)),

  http.get(`${API}/audit-logs`, ({ request }) => {
    requests.audit = request
    const params = new URL(request.url).searchParams
    const action = params.get('action')
    const entityType = params.get('entityType')
    const data = AUDIT_LOGS.filter(
      (l) => (!action || l.action === action) && (!entityType || l.entityType === entityType),
    )
    return HttpResponse.json(auditPage(data))
  }),

  http.get(`${API}/books/export`, ({ request }) => {
    requests.export = request
    return new HttpResponse('﻿ID,Título\r\n', { headers: { 'Content-Type': 'text/csv' } })
  }),

  http.get(`${API}/books`, ({ request }) => {
    requests.list = request
    const title = new URL(request.url).searchParams.get('title')?.toLowerCase()
    const data = title ? BOOKS.filter((b) => b.title.toLowerCase().includes(title)) : BOOKS
    return HttpResponse.json(page(data))
  }),

  http.get(`${API}/books/:id`, ({ params }) => {
    const book = BOOKS.find((b) => b.id === params.id)
    return book
      ? HttpResponse.json(book)
      : HttpResponse.json({ statusCode: 404, message: 'Libro no encontrado' }, { status: 404 })
  }),

  http.post(`${API}/books`, async ({ request }) => {
    requests.create = request.clone()
    const body = (await request.json()) as Record<string, unknown>
    return HttpResponse.json(makeBook({ ...body, id: '99999999-9999-4999-8999-999999999999' }), { status: 201 })
  }),

  http.patch(`${API}/books/:id`, async ({ request, params }) => {
    requests.update = request.clone()
    const body = (await request.json()) as Record<string, unknown>
    const base = BOOKS.find((b) => b.id === params.id) ?? makeBook()
    return HttpResponse.json({ ...base, ...body })
  }),

  http.delete(`${API}/books/:id`, ({ request }) => {
    requests.delete = request
    return new HttpResponse(null, { status: 204 })
  }),

  http.post(`${API}/books/:id/image`, ({ request, params }) => {
    requests.image = request
    const base = BOOKS.find((b) => b.id === params.id) ?? makeBook({ id: String(params.id) })
    return HttpResponse.json({ ...base, imageUrl: '/uploads/nueva.png' }, { status: 201 })
  }),
]

export const server = setupServer(...handlers)
