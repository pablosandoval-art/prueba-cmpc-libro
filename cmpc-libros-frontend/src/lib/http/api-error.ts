import { isAxiosError, isCancel } from 'axios'

/** Error normalizado de la API: un mensaje legible y, si aplica, el detalle por campo. */
export class ApiError extends Error {
  readonly status: number
  readonly details: string[]
  /** Segundos a esperar antes de reintentar (429: login bloqueado por intentos fallidos). */
  readonly retryAfter?: number

  constructor(message: string, status: number, details: string[] = [], retryAfter?: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
    this.retryAfter = retryAfter
  }
}

interface BackendErrorBody {
  statusCode?: number
  message?: string | string[]
  error?: string
  retryAfter?: number
}

const STATUS_MESSAGES: Record<number, string> = {
  400: 'Revisa los datos ingresados.',
  401: 'Tu sesión expiró. Inicia sesión nuevamente.',
  403: 'No tienes permiso para realizar esta acción.',
  404: 'El recurso solicitado no existe.',
  409: 'El registro ya existe.',
  413: 'El archivo supera el tamaño máximo permitido.',
  429: 'Demasiados intentos. Espera unos segundos e inténtalo de nuevo.',
}

const NETWORK_MESSAGE = 'No se pudo conectar con el servidor. Verifica tu conexión e inténtalo de nuevo.'
const GENERIC_MESSAGE = 'Ocurrió un error inesperado. Inténtalo de nuevo.'

/** Convierte cualquier error (axios, red, desconocido) en un `ApiError`. */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error
  if (isAxiosError<BackendErrorBody>(error)) {
    if (!error.response) return new ApiError(NETWORK_MESSAGE, 0)
    const { status, data } = error.response
    const raw = data?.message
    const details = Array.isArray(raw) ? raw : []
    const message = typeof raw === 'string' && status < 500 ? raw : (STATUS_MESSAGES[status] ?? GENERIC_MESSAGE)
    const header = Number(error.response.headers?.['retry-after'])
    const retryAfter = data?.retryAfter ?? (Number.isFinite(header) && header > 0 ? header : undefined)
    return new ApiError(message, status, details, status === 429 ? retryAfter : undefined)
  }
  return new ApiError(GENERIC_MESSAGE, 0)
}

/** `true` si la petición fue cancelada (búsqueda reemplazada por otra más nueva). */
export function isCancelledRequest(error: unknown): boolean {
  return isCancel(error)
}
