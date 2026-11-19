import { createParamDecorator, SetMetadata } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';

/** Usuario autenticado extraído del JWT y adjuntado a la request por el guard. */
export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
}

export interface AuthenticatedRequest {
  headers: { authorization?: string };
  /** Cookies parseadas por `cookie-parser`. */
  cookies?: Record<string, string | undefined>;
  user?: AuthenticatedUser;
  /** Expiración del token con el que se autenticó la petición. */
  tokenExpiresAt?: Date;
}

export const IS_PUBLIC_KEY = 'isPublic';

/** Marca un endpoint (o controlador) como accesible sin token. */
export const Public = (): MethodDecorator & ClassDecorator =>
  SetMetadata(IS_PUBLIC_KEY, true);

export function extractCurrentUser(ctx: ExecutionContext): AuthenticatedUser {
  const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
  if (!request.user) {
    throw new Error('CurrentUser usado en un endpoint sin autenticación');
  }
  return request.user;
}

/** Inyecta el usuario autenticado en un parámetro del handler. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => extractCurrentUser(ctx),
);
