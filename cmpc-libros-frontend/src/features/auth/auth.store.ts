import { create } from 'zustand'
import { registerSession } from '../../lib/http/api-client'
import { ApiError } from '../../lib/http/api-error'
import { authService } from './auth.service'
import type { Session, SessionUser } from './auth.service'

/**
 * - `checking`: al abrir la app, mientras se pregunta al backend si la cookie sigue vigente.
 * - `authenticated` / `anonymous`: resultado conocido.
 */
export type AuthStatus = 'checking' | 'authenticated' | 'anonymous'

interface AuthState {
  status: AuthStatus
  user: SessionUser | null
  expiresAt: string | null
  loading: boolean
  error: string | null
  /** La última sesión terminó por expiración (para avisar en el login). */
  expired: boolean
  /** Epoch ms hasta el que el backend bloqueó el login por intentos fallidos. */
  lockedUntil: number | null
  /** Segundos de bloqueo informados por el backend (tope de la cuenta atrás). */
  lockSeconds: number
  restore: () => Promise<void>
  login: (email: string, password: string) => Promise<boolean>
  logout: (reason?: 'expired') => void
  clearLock: () => void
}

let expiryTimer: ReturnType<typeof setTimeout> | undefined

function scheduleExpiry(expiresAt: string, onExpire: () => void): void {
  clearTimeout(expiryTimer)
  const ms = Date.parse(expiresAt) - Date.now()
  // setTimeout no admite más de ~24,8 días; los tokens duran horas.
  expiryTimer = setTimeout(onExpire, Math.max(0, Math.min(ms, 2 ** 31 - 1)))
}

export function isSessionValid(state: Pick<AuthState, 'status' | 'expiresAt'>, now: number = Date.now()): boolean {
  return state.status === 'authenticated' && !!state.expiresAt && Date.parse(state.expiresAt) > now
}

export const ANONYMOUS = {
  status: 'anonymous' as AuthStatus,
  user: null,
  expiresAt: null,
  loading: false,
  error: null,
  expired: false,
  lockedUntil: null,
  lockSeconds: 0,
}

export const useAuthStore = create<AuthState>()((set, get) => {
  const start = (session: Session) => {
    set({ status: 'authenticated', user: session.user, expiresAt: session.expiresAt, expired: false })
    scheduleExpiry(session.expiresAt, () => get().logout('expired'))
  }

  return {
    ...ANONYMOUS,
    status: 'checking',

    async restore() {
      try {
        const session = await authService.me()
        if (Date.parse(session.expiresAt) > Date.now()) return start(session)
      } catch {
        // Sin cookie o vencida: simplemente no hay sesión (no es una expiración que avisar).
      }
      set({ status: 'anonymous' })
    },

    async login(email, password) {
      set({ loading: true, error: null })
      try {
        const session = await authService.login(email, password)
        set({ loading: false, lockedUntil: null, lockSeconds: 0 })
        start(session)
        return true
      } catch (error) {
        const retryAfter = error instanceof ApiError ? error.retryAfter : undefined
        set({
          loading: false,
          error: (error as Error).message,
          ...(retryAfter ? { lockedUntil: Date.now() + retryAfter * 1000, lockSeconds: retryAfter } : {}),
        })
        return false
      }
    },

    logout(reason) {
      clearTimeout(expiryTimer)
      const wasAuthenticated = get().status === 'authenticated'
      set({ ...ANONYMOUS, expired: reason === 'expired' })
      // El backend borra la cookie; si falla (sin red), igual vence con el token.
      if (wasAuthenticated) authService.logout().catch(() => {})
    },

    clearLock() {
      set({ lockedUntil: null, lockSeconds: 0, error: null })
    },
  }
})

// El cliente HTTP avisa a la sesión ante un 401 en una ruta protegida.
registerSession({
  isAuthenticated: () => useAuthStore.getState().status === 'authenticated',
  onUnauthorized: () => useAuthStore.getState().logout('expired'),
})

/** Al abrir la app: pregunta al backend por la sesión de la cookie. */
export function restoreSession(): Promise<void> {
  return useAuthStore.getState().restore()
}
