import { apiClient } from '../../lib/http/api-client'
import { call } from '../../lib/http/call'

export interface SessionUser {
  id: string
  email: string
  name: string
}

/**
 * Sesión según el backend. El JWT no aparece: viaja en una cookie HttpOnly que el
 * navegador guarda y envía solo, y que el JavaScript de la página no puede leer.
 */
export interface Session {
  expiresAt: string
  user: SessionUser
}

export const authService = {
  /** Valida credenciales; el backend responde fijando la cookie de sesión. */
  login(email: string, password: string): Promise<Session> {
    return call(() => apiClient.post<Session>('/auth/login', { email, password }))
  },

  /** Sesión de la cookie actual (para restaurarla al recargar o abrir otra pestaña). */
  me(): Promise<Session> {
    return call(() => apiClient.get<Session>('/auth/me'))
  },

  /** Pide al backend que borre la cookie. */
  async logout(): Promise<void> {
    await call(() => apiClient.post('/auth/logout'))
  },
}
