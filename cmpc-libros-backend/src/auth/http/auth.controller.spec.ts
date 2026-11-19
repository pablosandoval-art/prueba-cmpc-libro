import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { Request, Response } from 'express';
import { IS_PUBLIC_KEY } from '../../common/auth/authenticated-user.js';
import { USER } from '../../testing/fixtures.js';
import { AuthService } from '../application/auth.service.js';
import { TooManyLoginAttemptsException } from '../domain/login-throttle.js';
import { AuthController } from './auth.controller.js';

describe('AuthController', () => {
  let controller: AuthController;
  const service = { login: vi.fn() };
  const res = { cookie: vi.fn(), clearCookie: vi.fn(), setHeader: vi.fn() };
  const req = { ip: '10.0.0.1' } as Request;
  const response = res as unknown as Response;

  async function build(secure = false) {
    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: service },
        { provide: ConfigService, useValue: { get: () => secure } },
      ],
    }).compile();
    controller = moduleRef.get(AuthController);
  }

  beforeEach(async () => {
    vi.resetAllMocks();
    await build();
  });

  it('login fija la cookie HttpOnly y no devuelve el token en el cuerpo', async () => {
    service.login.mockResolvedValue({
      accessToken: 'signed.jwt',
      expiresAt: '2026-01-01T00:00:00.000Z',
      user: USER,
    });

    await expect(
      controller.login(
        { email: USER.email, password: 'secreta' },
        req,
        response,
      ),
    ).resolves.toEqual({ expiresAt: '2026-01-01T00:00:00.000Z', user: USER });
    expect(service.login).toHaveBeenCalledWith(
      USER.email,
      'secreta',
      '10.0.0.1',
    );
    expect(res.cookie).toHaveBeenCalledWith('cmpc_session', 'signed.jwt', {
      httpOnly: true,
      sameSite: 'strict',
      secure: false,
      path: '/api',
    });
  });

  it('marca la cookie como Secure si así se configura', async () => {
    await build(true);
    service.login.mockResolvedValue({
      accessToken: 't',
      expiresAt: 'x',
      user: USER,
    });
    await controller.login({ email: USER.email, password: 's' }, req, response);
    expect(res.cookie).toHaveBeenCalledWith(
      'cmpc_session',
      't',
      expect.objectContaining({ secure: true }),
    );
  });

  it('al bloquear el login informa la espera en Retry-After', async () => {
    service.login.mockRejectedValue(new TooManyLoginAttemptsException(30));

    await expect(
      controller.login({ email: USER.email, password: 'mala' }, req, response),
    ).rejects.toBeInstanceOf(TooManyLoginAttemptsException);
    expect(res.setHeader).toHaveBeenCalledWith('Retry-After', '30');
    expect(res.cookie).not.toHaveBeenCalled();
  });

  it('otros errores del login no fijan Retry-After', async () => {
    service.login.mockRejectedValue(new Error('x'));
    await expect(
      controller.login({ email: USER.email, password: 'mala' }, req, response),
    ).rejects.toThrow('x');
    expect(res.setHeader).not.toHaveBeenCalled();
  });

  it('logout borra la cookie con las mismas opciones', () => {
    controller.logout(response);
    expect(res.clearCookie).toHaveBeenCalledWith(
      'cmpc_session',
      expect.objectContaining({ path: '/api', httpOnly: true }),
    );
  });

  it('login y logout son públicos; me no', () => {
    const isPublic = (method: keyof AuthController) =>
      Reflect.getMetadata(
        IS_PUBLIC_KEY,
        Object.getOwnPropertyDescriptor(AuthController.prototype, method)!
          .value as object,
      ) as boolean | undefined;
    expect(isPublic('login')).toBe(true);
    expect(isPublic('logout')).toBe(true);
    expect(isPublic('me')).toBeUndefined();
  });

  it('me devuelve el usuario y la expiración del token', () => {
    const exp = new Date('2026-01-01T12:00:00.000Z');
    expect(
      controller.me(USER, { headers: {}, user: USER, tokenExpiresAt: exp }),
    ).toEqual({ user: USER, expiresAt: exp.toISOString() });
    expect(controller.me(USER, { headers: {}, user: USER })).toEqual({
      user: USER,
      expiresAt: '',
    });
  });
});
