import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { IS_PUBLIC_KEY } from '../../common/auth/authenticated-user.js';
import type { AuthenticatedRequest } from '../../common/auth/authenticated-user.js';
import type { JwtPayload } from '../domain/jwt-payload.js';
import { AUTH_COOKIE } from '../http/auth-cookie.js';

export function extractBearerToken(header: string | undefined): string | null {
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  return scheme?.toLowerCase() === 'bearer' && token ? token : null;
}

/** El token viaja en la cookie de sesión (navegador) o en `Authorization: Bearer` (clientes de API). */
export function extractToken(request: AuthenticatedRequest): string | null {
  return (
    extractBearerToken(request.headers.authorization) ??
    request.cookies?.[AUTH_COOKIE] ??
    null
  );
}

/**
 * Guard global: exige un JWT HS256 válido (cookie de sesión o `Authorization: Bearer`)
 * salvo en endpoints marcados con `@Public()`. El algoritmo queda fijado en
 * la verificación (JwtModule.verifyOptions) para evitar ataques de
 * confusión de algoritmo (p. ej. `alg: none`).
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean | undefined>(
      IS_PUBLIC_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = extractToken(request);
    if (!token) {
      throw new UnauthorizedException('Token de acceso requerido');
    }

    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(token);
      request.user = {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
      };
      if (payload.exp) request.tokenExpiresAt = new Date(payload.exp * 1000);
      return true;
    } catch {
      throw new UnauthorizedException('Token inválido o expirado');
    }
  }
}
