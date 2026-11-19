import type { CookieOptions } from 'express';
import { API_PREFIX } from '../../common/http/api-prefix.js';

/** Nombre de la cookie que transporta el JWT de sesión. */
export const AUTH_COOKIE = 'cmpc_session';

/**
 * Opciones de la cookie de sesión:
 * - `httpOnly`: JavaScript no puede leerla (un XSS no roba el token).
 * - `sameSite: 'strict'`: el navegador no la envía en peticiones iniciadas por otros sitios.
 * - sin `maxAge`/`expires`: cookie de sesión, se borra al cerrar el navegador (el JWT vence antes si corresponde).
 * - `path: /api`: sólo viaja a la API, no a `/uploads` ni a `/docs`.
 */
export function authCookieOptions(secure: boolean): CookieOptions {
  return { httpOnly: true, sameSite: 'strict', secure, path: `/${API_PREFIX}` };
}
