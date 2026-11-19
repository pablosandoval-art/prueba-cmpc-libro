import { plainToInstance, Transform } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsString,
  Matches,
  Max,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

/**
 * Variables de entorno tipadas y validadas al arrancar.
 * Si falta o es inválida alguna, la aplicación no inicia (fail fast).
 */
export class EnvironmentVariables {
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT: number = 3000;

  @IsString()
  @IsNotEmpty()
  DATABASE_URL: string;

  /** Secreto HS256: mínimo 32 caracteres (256 bits) según RFC 7518 §3.2. */
  @IsString()
  @MinLength(32)
  JWT_SECRET: string;

  /** Duración del token (y de la sesión), p. ej. `15m`, `12h`, `1d`. */
  @IsString()
  @Matches(/^\d+[smhd]$/, {
    message: 'JWT_EXPIRES_IN debe tener el formato <número><s|m|h|d>',
  })
  JWT_EXPIRES_IN: string = '12h';

  /**
   * Orígenes del frontend, separados por coma. Se usan para CORS y para rechazar
   * escrituras que vengan de otro origen (protección CSRF de la cookie de sesión).
   */
  @IsString()
  CORS_ORIGINS: string = 'http://localhost:5173';

  /**
   * Marca la cookie de sesión como `Secure` (sólo viaja por HTTPS).
   * Debe ser `true` en cualquier despliegue servido por HTTPS.
   */
  @Transform(({ obj, key }: { obj: Record<string, unknown>; key: string }) =>
    ['true', '1'].includes(String(obj[key]).toLowerCase()),
  )
  @IsBoolean()
  COOKIE_SECURE: boolean = false;

  /** Logins fallidos (mismo email y misma IP) antes de bloquear. */
  @IsInt()
  @Min(1)
  LOGIN_MAX_ATTEMPTS: number = 5;

  /** Segundos de bloqueo tras agotar los intentos. */
  @IsInt()
  @Min(1)
  LOGIN_LOCK_SECONDS: number = 30;

  /** `production` emite logs JSON; cualquier otro valor, logs legibles. */
  @IsString()
  NODE_ENV: string = 'development';

  @IsIn(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
  LOG_LEVEL: string = 'info';

  @IsString()
  @IsNotEmpty()
  UPLOADS_DIR: string = 'uploads';

  @IsInt()
  @Min(1)
  UPLOAD_MAX_BYTES: number = 2 * 1024 * 1024;
}

export function validateEnv(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated);
  if (errors.length > 0) {
    const details = errors
      .map((error) => Object.values(error.constraints ?? {}).join(', '))
      .join('\n- ');
    throw new Error(`Configuración de entorno inválida:\n- ${details}`);
  }
  return validated;
}
