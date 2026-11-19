import type { NextFunction, Request, Response } from 'express';

/** Métodos que modifican datos: son los que un ataque CSRF intentaría disparar. */
const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function originOf(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

/**
 * Un origen es de confianza si es uno de los del frontend (`allowed`) o el de la propia
 * API (mismo host: p. ej. Swagger en /docs).
 */
export function isTrustedOrigin(
  origin: string,
  host: string | undefined,
  allowed: readonly string[],
): boolean {
  if (allowed.includes(origin)) return true;
  try {
    return !!host && new URL(origin).host === host;
  } catch {
    return false;
  }
}

/**
 * Protección CSRF complementaria a `SameSite=Strict` de la cookie de sesión:
 * rechaza (403) las escrituras cuyo `Origin` (o, en su defecto, `Referer`) no sea de
 * confianza. Sin ninguna de las dos cabeceras sólo se admite la petición si no lleva la
 * cookie de sesión (clientes de API que se autentican con `Authorization: Bearer`).
 */
export function originCheck(allowed: readonly string[], sessionCookie: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!UNSAFE_METHODS.has(req.method)) return next();

    const source =
      originOf(req.headers.origin) ?? originOf(req.headers.referer);
    const trusted = source
      ? isTrustedOrigin(source, req.headers.host, allowed)
      : !req.headers.cookie?.includes(`${sessionCookie}=`);

    if (trusted) return next();
    res.status(403).json({
      statusCode: 403,
      message: 'Origen no permitido',
      error: 'Forbidden',
    });
  };
}
