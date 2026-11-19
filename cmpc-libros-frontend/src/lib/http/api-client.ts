import axios from 'axios'
import type { AxiosInstance } from 'axios'
import { API_BASE_URL } from '../../config/env'

/**
 * Puente con la sesión, inyectado por el store de auth. El cliente HTTP no importa
 * el store (evita dependencias circulares y facilita los tests).
 */
export interface SessionBridge {
  isAuthenticated: () => boolean
  onUnauthorized: () => void
}

let session: SessionBridge = {
  isAuthenticated: () => false,
  onUnauthorized: () => {},
}

export function registerSession(bridge: SessionBridge): void {
  session = bridge
}

/** Las rutas de autenticación gestionan su propio 401 (credenciales, sesión inexistente). */
const isAuthRoute = (url: string | undefined) => !!url && url.startsWith('/auth/')

export function createApiClient(baseURL: string = API_BASE_URL): AxiosInstance {
  // `withCredentials`: el navegador envía (y guarda) la cookie de sesión aunque la API esté en
  // otro puerto. El token nunca pasa por este código.
  const client = axios.create({ baseURL, timeout: 20_000, withCredentials: true })

  client.interceptors.response.use(undefined, (error: unknown) => {
    // Un 401 en una ruta protegida significa token vencido o inválido.
    if (
      axios.isAxiosError(error) &&
      error.response?.status === 401 &&
      !isAuthRoute(error.config?.url) &&
      session.isAuthenticated()
    ) {
      session.onUnauthorized()
    }
    return Promise.reject(error)
  })

  return client
}

/** Instancia única usada por todos los servicios. */
export const apiClient = createApiClient()
