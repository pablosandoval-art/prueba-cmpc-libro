import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user.js';
import { UsersRepository } from '../../users/domain/users.repository.js';
import type { JwtPayload } from '../domain/jwt-payload.js';
import {
  LoginThrottle,
  TooManyLoginAttemptsException,
} from '../domain/login-throttle.js';
import { PasswordHasher } from '../domain/password-hasher.js';

export interface LoginResult {
  accessToken: string;
  expiresAt: string;
  user: AuthenticatedUser;
}

/**
 * Hash bcrypt de un valor aleatorio descartado. Se compara contra él cuando el
 * email no existe, para que el tiempo de respuesta no revele qué emails están
 * registrados (enumeración de usuarios por timing).
 */
const DUMMY_HASH =
  '$2b$12$AhM.0T41U0VLohanKx5VkO1fYDdPPLw9Lk3fQzdUiplPADHM8.8y6';

const INVALID_CREDENTIALS = 'Credenciales inválidas';

/** `admin@cmpc.cl` → `a***@cmpc.cl`: los logs identifican el intento sin exponer el email completo. */
export function maskEmail(email: string): string {
  const [local = '', domain = ''] = email.split('@');
  return `${local.slice(0, 1)}***@${domain}`;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly users: UsersRepository,
    private readonly hasher: PasswordHasher,
    private readonly jwt: JwtService,
    private readonly throttle: LoginThrottle,
  ) {}

  /**
   * Valida credenciales y firma el token. Los fallos se cuentan por IP + email:
   * al agotar los intentos responde 429 hasta que pase el bloqueo.
   */
  async login(
    email: string,
    password: string,
    clientIp = 'unknown',
  ): Promise<LoginResult> {
    const key = `${clientIp}|${email.toLowerCase()}`;
    const context = { email: maskEmail(email), ip: clientIp };

    const blockedFor = this.throttle.retryAfter(key);
    if (blockedFor > 0) {
      this.logger.warn(
        { ...context, retryAfter: blockedFor },
        'Login bloqueado',
      );
      throw new TooManyLoginAttemptsException(blockedFor);
    }

    const user = await this.users.findByEmail(email);
    const passwordMatches = await this.hasher.compare(
      password,
      user?.passwordHash ?? DUMMY_HASH,
    );
    // Mismo mensaje para "no existe", "inactivo" y "contraseña errónea".
    if (!user || !user.isActive || !passwordMatches) {
      const lockedFor = this.throttle.registerFailure(key);
      if (lockedFor > 0) {
        this.logger.warn(
          { ...context, retryAfter: lockedFor },
          'Login fallido: intentos agotados, se bloquea',
        );
        throw new TooManyLoginAttemptsException(lockedFor);
      }
      this.logger.warn(context, 'Login fallido');
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    this.throttle.reset(key);
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      name: user.name,
    };
    const accessToken = await this.jwt.signAsync(payload);
    const { exp } = this.jwt.decode<Required<JwtPayload>>(accessToken);
    this.logger.log({ userId: user.id, ip: clientIp }, 'Login correcto');

    return {
      accessToken,
      expiresAt: new Date(exp * 1000).toISOString(),
      user: { id: user.id, email: user.email, name: user.name },
    };
  }
}
