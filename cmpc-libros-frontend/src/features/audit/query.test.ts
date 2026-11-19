import { describe, expect, it } from 'vitest'
import { auditListKey, hasAuditFilters, parseAuditQuery, toAuditApiParams, toAuditSearchParams } from './query'

const parse = (search: string) => parseAuditQuery(new URLSearchParams(search))

describe('consulta de auditoría (URL ⇄ API)', () => {
  it('usa los valores por defecto cuando la URL no trae nada', () => {
    expect(parse('')).toEqual({ page: 1, limit: 10 })
  })

  it('lee filtros, página y tamaño válidos', () => {
    expect(parse('action=DELETE&entity=Book&from=2026-11-01&to=2026-11-18&page=3&limit=50')).toEqual({
      page: 3,
      limit: 50,
      action: 'DELETE',
      entityType: 'Book',
      from: '2026-11-01',
      to: '2026-11-18',
    })
  })

  it('descarta todo lo que no es válido', () => {
    expect(parse('action=EXPLODE&entity=Users&from=ayer&to=2026-02-31&page=0&limit=7')).toEqual({ page: 1, limit: 10 })
    expect(parse('page=abc')).toEqual({ page: 1, limit: 10 })
  })

  it('descarta el extremo final de un rango invertido, pero acepta uno solo', () => {
    expect(parse('from=2026-11-18&to=2026-11-01')).toEqual({ page: 1, limit: 10, from: '2026-11-18' })
    expect(parse('to=2026-11-01')).toEqual({ page: 1, limit: 10, to: '2026-11-01' })
  })

  it('serializa omitiendo los valores por defecto', () => {
    expect(toAuditSearchParams({ page: 1, limit: 10 }).toString()).toBe('')
    expect(
      toAuditSearchParams({
        page: 2,
        limit: 20,
        action: 'CREATE',
        entityType: 'Author',
        from: '2026-11-01',
        to: '2026-11-02',
      }).toString(),
    ).toBe('action=CREATE&entity=Author&from=2026-11-01&to=2026-11-02&page=2&limit=20')
  })

  it('arma la clave de caché y detecta filtros activos', () => {
    expect(auditListKey({ page: 1, limit: 10 })).toBe('all')
    expect(auditListKey({ page: 2, limit: 10, action: 'UPDATE' })).toBe('action=UPDATE&page=2')
    expect(hasAuditFilters({ page: 1, limit: 10 })).toBe(false)
    expect(hasAuditFilters({ page: 1, limit: 10, to: '2026-11-18' })).toBe(true)
  })

  it('envía los días como instantes ISO que cubren el día local completo', () => {
    const params = toAuditApiParams({
      page: 2,
      limit: 20,
      action: 'UPDATE',
      entityType: 'Book',
      from: '2026-11-18',
      to: '2026-11-18',
    })
    expect(params).toMatchObject({ page: 2, limit: 20, action: 'UPDATE', entityType: 'Book' })
    expect(new Date(params.from as string).getTime()).toBe(new Date(2026, 10, 18, 0, 0, 0, 0).getTime())
    expect(new Date(params.to as string).getTime()).toBe(new Date(2026, 10, 18, 23, 59, 59, 999).getTime())
    expect(toAuditApiParams({ page: 1, limit: 10 })).toEqual({ page: 1, limit: 10 })
  })
})
