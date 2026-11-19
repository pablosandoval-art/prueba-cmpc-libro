import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Límite de intentos de login fallidos (token DI).
 *
 * La clave identifica a quién se limita (p. ej. IP + email). Tras agotar los
 * intentos, la clave queda bloqueada unos segundos; un login correcto la reinicia.
 */
export abstract class LoginThrottle {
  /** Segundos que faltan para poder reintentar (0 = no está bloqueada). */
  abstract retryAfter(key: string): number;
  /** Anota un fallo. Devuelve los segundos de bloqueo si éste agotó los intentos (0 si no). */
  abstract registerFailure(key: string): number;
  /** Olvida los fallos de la clave (tras un login correcto). */
  abstract reset(key: string): void;
}

/** 429 con los segundos de espera; el controlador los copia en la cabecera `Retry-After`. */
export class TooManyLoginAttemptsException extends HttpException {
  constructor(readonly retryAfterSeconds: number) {
    super(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message: `Demasiados intentos fallidos. Vuelve a intentarlo en ${retryAfterSeconds} s.`,
        error: 'Too Many Requests',
        retryAfter: retryAfterSeconds,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
