import { resolve } from 'node:path';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AUTH_COOKIE } from './auth/http/auth-cookie.js';
import { API_PREFIX } from './common/http/api-prefix.js';
import { originCheck } from './common/http/origin-check.js';
import type { EnvironmentVariables } from './config/env.validation.js';
import { UPLOADS_PUBLIC_PATH } from './storage/image-storage.js';

export { API_PREFIX };
export const DOCS_PATH = 'docs';

/** Configuración HTTP compartida por `main.ts` y los tests e2e. */
export function configureApp(app: NestExpressApplication): void {
  const config =
    app.get<ConfigService<EnvironmentVariables, true>>(ConfigService);

  const origins = config
    .get('CORS_ORIGINS', { infer: true })
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.setGlobalPrefix(API_PREFIX);
  app.enableCors({
    origin: origins,
    // La sesión viaja en una cookie: el navegador sólo la envía si CORS lo permite.
    credentials: true,
    // Nombre del CSV exportado, espera del límite de login e id de petición (soporte).
    exposedHeaders: ['Content-Disposition', 'Retry-After', 'X-Request-Id'],
  });
  app.use(cookieParser());
  // CSRF: las escrituras sólo se aceptan desde el frontend o desde la propia API.
  app.use(originCheck(origins, AUTH_COOKIE));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useStaticAssets(resolve(config.get('UPLOADS_DIR', { infer: true })), {
    prefix: `${UPLOADS_PUBLIC_PATH}/`,
  });
  app.enableShutdownHooks();
}

export function setupSwagger(app: NestExpressApplication): void {
  const document = new DocumentBuilder()
    .setTitle('CMPC Libros API')
    .setDescription(
      'API de gestión de libros: CRUD con soft delete, exportación CSV, carga de imágenes y auditoría. ' +
        'Autenticación JWT (HS256): POST /api/auth/login fija la cookie HttpOnly `cmpc_session`, ' +
        'que el navegador (y esta página) envía sola en las peticiones siguientes. ' +
        'Los clientes de API pueden enviar el mismo token en `Authorization: Bearer`.',
    )
    .setVersion('1.0.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' })
    .addCookieAuth(AUTH_COOKIE)
    .build();

  SwaggerModule.setup(
    DOCS_PATH,
    app,
    () => SwaggerModule.createDocument(app, document),
    {
      swaggerOptions: { persistAuthorization: true },
    },
  );
}
