import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { USER } from '../../testing/fixtures.js';
import { UsersRepository } from '../../users/domain/users.repository.js';
import {
  LoginThrottle,
  TooManyLoginAttemptsException,
} from '../domain/login-throttle.js';
import { PasswordHasher } from '../domain/password-hasher.js';
import { AuthService, maskEmail } from './auth.service.js';

describe('AuthService', () => {
  let service: AuthService;
  const users = { findByEmail: vi.fn() };
  const hasher = { hash: vi.fn(), compare: vi.fn() };
  const jwt = { signAsync: vi.fn(), decode: vi.fn() };
  const throttle = {
    retryAfter: vi.fn(),
    registerFailure: vi.fn(),
    reset: vi.fn(),
  };
  const storedUser = { ...USER, passwordHash: '$2b$12$hash', isActive: true };

  beforeEach(async () => {
    vi.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersRepository, useValue: users },
        { provide: PasswordHasher, useValue: hasher },
        { provide: JwtService, useValue: jwt },
        { provide: LoginThrottle, useValue: throttle },
      ],
    }).compile();
    service = moduleRef.get(AuthService);
    throttle.retryAfter.mockReturnValue(0);
    throttle.registerFailure.mockReturnValue(0);
  });

  it('devuelve el token firmado, su expiración y el usuario, y reinicia el contador', async () => {
    users.findByEmail.mockResolvedValue(storedUser);
    hasher.compare.mockResolvedValue(true);
    jwt.signAsync.mockResolvedValue('signed.jwt.token');
    jwt.decode.mockReturnValue({ exp: 1_800_000_000 });

    const result = await service.login(USER.email, 'secreta', '10.0.0.1');

    expect(hasher.compare).toHaveBeenCalledWith(
      'secreta',
      storedUser.passwordHash,
    );
    expect(jwt.signAsync).toHaveBeenCalledWith({
      sub: USER.id,
      email: USER.email,
      name: USER.name,
    });
    expect(result).toEqual({
      accessToken: 'signed.jwt.token',
      expiresAt: new Date(1_800_000_000_000).toISOString(),
      user: USER,
    });
    expect(throttle.reset).toHaveBeenCalledWith(
      `10.0.0.1|${USER.email.toLowerCase()}`,
    );
  });

  it('cuenta los fallos por IP + email (sin distinguir mayúsculas)', async () => {
    users.findByEmail.mockResolvedValue(storedUser);
    hasher.compare.mockResolvedValue(false);

    await expect(
      service.login('Admin@CMPC.cl', 'mala', '10.0.0.1'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(throttle.registerFailure).toHaveBeenCalledWith(
      '10.0.0.1|admin@cmpc.cl',
    );
    expect(throttle.reset).not.toHaveBeenCalled();
  });

  it('al agotar los intentos responde 429 con los segundos de espera', async () => {
    users.findByEmail.mockResolvedValue(storedUser);
    hasher.compare.mockResolvedValue(false);
    throttle.registerFailure.mockReturnValue(30);

    const error = await service
      .login(USER.email, 'mala', '10.0.0.1')
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(TooManyLoginAttemptsException);
    expect((error as TooManyLoginAttemptsException).retryAfterSeconds).toBe(30);
    expect((error as TooManyLoginAttemptsException).getStatus()).toBe(429);
  });

  it('mientras está bloqueado no verifica la contraseña', async () => {
    throttle.retryAfter.mockReturnValue(12);

    await expect(
      service.login(USER.email, 'Admin1234!', '10.0.0.1'),
    ).rejects.toMatchObject({ retryAfterSeconds: 12 });
    expect(users.findByEmail).not.toHaveBeenCalled();
    expect(hasher.compare).not.toHaveBeenCalled();
  });

  it('enmascara el email en los logs', () => {
    expect(maskEmail('admin@cmpc.cl')).toBe('a***@cmpc.cl');
    expect(maskEmail('sin-arroba')).toBe('s***@');
  });

  it('con un email inexistente igual ejecuta bcrypt (evita enumeración por timing)', async () => {
    users.findByEmail.mockResolvedValue(null);
    hasher.compare.mockResolvedValue(false);

    await expect(service.login('nadie@cmpc.cl', 'x')).rejects.toThrow(
      new UnauthorizedException('Credenciales inválidas'),
    );
    expect(hasher.compare).toHaveBeenCalledWith(
      'x',
      expect.stringMatching(/^\$2b\$12\$/),
    );
    expect(jwt.signAsync).not.toHaveBeenCalled();
  });

  it('rechaza una contraseña incorrecta', async () => {
    users.findByEmail.mockResolvedValue(storedUser);
    hasher.compare.mockResolvedValue(false);

    await expect(service.login(USER.email, 'mala')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rechaza un usuario inactivo aunque la contraseña sea correcta', async () => {
    users.findByEmail.mockResolvedValue({ ...storedUser, isActive: false });
    hasher.compare.mockResolvedValue(true);

    await expect(service.login(USER.email, 'secreta')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(jwt.signAsync).not.toHaveBeenCalled();
  });
});
