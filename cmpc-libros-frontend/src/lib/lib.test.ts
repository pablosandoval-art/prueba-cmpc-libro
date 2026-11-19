import { AxiosError, AxiosHeaders, CanceledError } from 'axios'
import { toAssetUrl } from '../config/env'
import { createInflight, emptyEntry, isFresh } from './cache'
import { downloadBlob, exportFilename } from './download'
import { formatDateTime, formatNumber, formatPrice, plural } from './format'
import { ApiError, isCancelledRequest, toApiError } from './http/api-error'

function axiosError(status?: number, data?: unknown) {
  const config = { headers: new AxiosHeaders() }
  return new AxiosError(
    'fail',
    undefined,
    config,
    undefined,
    status === undefined ? undefined : { status, data, statusText: '', headers: {}, config },
  )
}

describe('format', () => {
  it('formatea precios CLP sin decimales', () => {
    expect(formatPrice(18990)).toBe('$18.990')
    expect(formatNumber(1234567)).toBe('1.234.567')
  })

  it('pluraliza', () => {
    expect(plural(1, 'libro', 'libros')).toBe('1 libro')
    expect(plural(40, 'libro', 'libros')).toBe('40 libros')
  })

  it('formatea fecha y hora', () => {
    expect(formatDateTime('2026-01-01T12:00:00.000Z')).toMatch(/2026/)
    expect(formatDateTime(new Date('2026-01-01T12:00:00.000Z'))).toMatch(/2026/)
  })
})

describe('download', () => {
  it('nombra la exportación CMPC-LIBROS-<timestamp>.csv', () => {
    expect(exportFilename(1700000000000)).toBe('CMPC-LIBROS-1700000000000.csv')
    expect(exportFilename()).toMatch(/^CMPC-LIBROS-\d{13}\.csv$/)
  })

  it('descarga un blob con un enlace temporal', () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    vi.useFakeTimers()
    downloadBlob(new Blob(['a']), 'x.csv')
    expect(click).toHaveBeenCalledTimes(1)
    expect(document.querySelector('a[download]')).toBeNull()
    vi.runAllTimers()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview')
    vi.useRealTimers()
  })
})

describe('cache', () => {
  it('isFresh respeta el TTL y la invalidación', () => {
    expect(isFresh(undefined, 1000)).toBe(false)
    expect(isFresh(emptyEntry(), 1000)).toBe(false)
    expect(isFresh({ data: 1, loading: false, fetchedAt: 1000 }, 500, 1200)).toBe(true)
    expect(isFresh({ data: 1, loading: false, fetchedAt: 1000 }, 500, 1600)).toBe(false)
    expect(isFresh({ data: 1, loading: false, fetchedAt: 0 }, 500, 100)).toBe(false)
  })

  it('createInflight comparte la promesa de peticiones simultáneas', async () => {
    const inflight = createInflight<number>()
    const task = vi.fn(() => Promise.resolve(1))
    const [a, b] = await Promise.all([inflight.run('k', task), inflight.run('k', task)])
    expect(a).toBe(1)
    expect(b).toBe(1)
    expect(task).toHaveBeenCalledTimes(1)
    expect(inflight.has('k')).toBe(false)
  })
})

describe('toApiError', () => {
  it('usa el mensaje del backend en errores 4xx', () => {
    const error = toApiError(axiosError(400, { message: 'El género 9 no existe' }))
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 400, message: 'El género 9 no existe' })
  })

  it('conserva el detalle de validación por campo', () => {
    const error = toApiError(axiosError(400, { message: ['price must not be less than 0'] }))
    expect(error.message).toBe('Revisa los datos ingresados.')
    expect(error.details).toEqual(['price must not be less than 0'])
  })

  it('oculta mensajes internos de errores 5xx', () => {
    expect(toApiError(axiosError(500, { message: 'stack trace' })).message).toBe(
      'Ocurrió un error inesperado. Inténtalo de nuevo.',
    )
  })

  it('distingue errores de red y desconocidos', () => {
    expect(toApiError(axiosError()).message).toMatch(/No se pudo conectar/)
    expect(toApiError(new Error('x')).status).toBe(0)
    const known = new ApiError('ya normalizado', 404)
    expect(toApiError(known)).toBe(known)
  })

  it('reconoce peticiones canceladas', () => {
    expect(isCancelledRequest(new CanceledError())).toBe(true)
    expect(isCancelledRequest(new Error())).toBe(false)
  })
})

describe('toAssetUrl', () => {
  it('convierte rutas relativas del backend en absolutas', () => {
    expect(toAssetUrl('/uploads/a.png')).toBe('http://localhost:3000/uploads/a.png')
    expect(toAssetUrl('https://cdn/x.png')).toBe('https://cdn/x.png')
    expect(toAssetUrl(null)).toBeNull()
  })
})
