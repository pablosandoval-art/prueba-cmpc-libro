import { toApiError } from './api-error'

/** Ejecuta una petición HTTP y normaliza sus errores a `ApiError`. */
export async function call<T>(request: () => Promise<{ data: T }>): Promise<T> {
  try {
    return (await request()).data
  } catch (error) {
    throw toApiError(error)
  }
}
