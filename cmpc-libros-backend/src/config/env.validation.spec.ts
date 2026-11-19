import { validateEnv } from './env.validation.js';

const VALID = {
  DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
  JWT_SECRET: 'x'.repeat(32),
};

describe('validateEnv', () => {
  it('aplica valores por defecto y convierte tipos', () => {
    const env = validateEnv({ ...VALID, PORT: '4000' });
    expect(env.PORT).toBe(4000);
    expect(env.JWT_EXPIRES_IN).toBe('12h');
    expect(env).toMatchObject({
      COOKIE_SECURE: false,
      LOGIN_MAX_ATTEMPTS: 5,
      LOGIN_LOCK_SECONDS: 30,
      LOG_LEVEL: 'info',
      NODE_ENV: 'development',
    });
    expect(env.UPLOADS_DIR).toBe('uploads');
    expect(env.UPLOAD_MAX_BYTES).toBe(2 * 1024 * 1024);
  });

  it('interpreta COOKIE_SECURE como booleano ("false" no es verdadero)', () => {
    expect(validateEnv({ ...VALID, COOKIE_SECURE: 'true' }).COOKIE_SECURE).toBe(
      true,
    );
    expect(validateEnv({ ...VALID, COOKIE_SECURE: '1' }).COOKIE_SECURE).toBe(
      true,
    );
    expect(
      validateEnv({ ...VALID, COOKIE_SECURE: 'false' }).COOKIE_SECURE,
    ).toBe(false);
  });

  it('rechaza un nivel de log desconocido', () => {
    expect(() => validateEnv({ ...VALID, LOG_LEVEL: 'verbose' })).toThrow(
      /Configuración de entorno inválida/,
    );
  });

  it('falla si el secreto JWT es demasiado corto', () => {
    expect(() => validateEnv({ ...VALID, JWT_SECRET: 'corto' })).toThrow(
      /Configuración de entorno inválida/,
    );
  });

  it('falla si falta DATABASE_URL o el formato de expiración es inválido', () => {
    expect(() =>
      validateEnv({ JWT_SECRET: VALID.JWT_SECRET, JWT_EXPIRES_IN: '1 hora' }),
    ).toThrow(
      /DATABASE_URL[\s\S]*JWT_EXPIRES_IN|JWT_EXPIRES_IN[\s\S]*DATABASE_URL/,
    );
  });
});
