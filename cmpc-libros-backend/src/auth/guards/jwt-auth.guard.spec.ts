import { UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { AuthenticatedRequest } from '../../common/auth/authenticated-user.js';
import { USER } from '../../testing/fixtures.js';
import {
  JwtAuthGuard,
  extractBearerToken,
  extractToken,
} from './jwt-auth.guard.js';

function contextFor(request: AuthenticatedRequest): ExecutionContext {
  return {
    getHandler: () => function handler() {},
    getClass: () => class Controller {},
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('extractBearerToken', () => {
  it.each([
    [undefined, null],
    ['', null],
    ['Basic abc', null],
    ['Bearer', null],
    ['Bearer abc', 'abc'],
    ['bearer abc', 'abc'],
  ])('%j → %j', (header, expected) => {
    expect(extractBearerToken(header)).toBe(expected);
  });
});

describe('extractToken', () => {
  it('prefiere Authorization: Bearer y, si no está, usa la cookie de sesión', () => {
    expect(
      extractToken({
        headers: { authorization: 'Bearer cabecera' },
        cookies: { cmpc_session: 'cookie' },
      }),
    ).toBe('cabecera');
    expect(
      extractToken({ headers: {}, cookies: { cmpc_session: 'cookie' } }),
    ).toBe('cookie');
    expect(extractToken({ headers: {}, cookies: {} })).toBeNull();
    expect(extractToken({ headers: {} })).toBeNull();
  });
});

describe('JwtAuthGuard', () => {
  const jwt = { verifyAsync: vi.fn() };
  const reflector = { getAllAndOverride: vi.fn() };
  const guard = new JwtAuthGuard(
    jwt as unknown as JwtService,
    reflector as unknown as Reflector,
  );

  beforeEach(() => vi.resetAllMocks());

  it('deja pasar endpoints @Public() sin token', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    await expect(guard.canActivate(contextFor({ headers: {} }))).resolves.toBe(
      true,
    );
    expect(jwt.verifyAsync).not.toHaveBeenCalled();
  });

  it('rechaza requests sin token', async () => {
    await expect(
      guard.canActivate(contextFor({ headers: {} })),
    ).rejects.toThrow(new UnauthorizedException('Token de acceso requerido'));
  });

  it('valida el token y adjunta el usuario a la request', async () => {
    jwt.verifyAsync.mockResolvedValue({
      sub: USER.id,
      email: USER.email,
      name: USER.name,
    });
    const request: AuthenticatedRequest = {
      headers: { authorization: 'Bearer valid.jwt' },
    };

    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);
    expect(jwt.verifyAsync).toHaveBeenCalledWith('valid.jwt');
    expect(request.user).toEqual(USER);
  });

  it('acepta el token de la cookie y guarda su expiración', async () => {
    jwt.verifyAsync.mockResolvedValue({
      sub: USER.id,
      email: USER.email,
      name: USER.name,
      exp: 1_800_000_000,
    });
    const request: AuthenticatedRequest = {
      headers: {},
      cookies: { cmpc_session: 'cookie.jwt' },
    };

    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);
    expect(jwt.verifyAsync).toHaveBeenCalledWith('cookie.jwt');
    expect(request.tokenExpiresAt).toEqual(new Date(1_800_000_000_000));
  });

  it('rechaza tokens inválidos o expirados', async () => {
    jwt.verifyAsync.mockRejectedValue(new Error('jwt expired'));
    await expect(
      guard.canActivate(
        contextFor({ headers: { authorization: 'Bearer expired.jwt' } }),
      ),
    ).rejects.toThrow(new UnauthorizedException('Token inválido o expirado'));
  });
});
