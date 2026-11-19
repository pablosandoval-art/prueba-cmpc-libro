/** URL base del backend (sin `/api`), configurable con `VITE_API_URL`. */
export const API_URL: string = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000').replace(/\/+$/, '')

export const API_BASE_URL = `${API_URL}/api`

/** Convierte una ruta relativa del backend (p. ej. `/uploads/x.png`) en URL absoluta. */
export function toAssetUrl(path: string | null | undefined): string | null {
  if (!path) return null
  return /^https?:\/\//.test(path) ? path : `${API_URL}${path}`
}
