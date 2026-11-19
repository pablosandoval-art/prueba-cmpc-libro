import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Params } from 'nestjs-pino';
import type { AuthenticatedRequest } from '../common/auth/authenticated-user.js';

/** Cabecera con la que se correlacionan los logs de una petición (entrada y salida). */
export const REQUEST_ID_HEADER = 'x-request-id';

/** Rutas que no se registran: el healthcheck de Docker las llama cada pocos segundos. */
const SILENT_PATHS = ['/api/health'];

/** Nunca deben llegar a los logs, aunque alguien los serialice por error. */
export const REDACTED_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
  '*.password',
  '*.accessToken',
];

/** Reutiliza un id de petición válido que llegue del cliente o del proxy; si no, genera uno. */
export function requestIdFor(
  req: IncomingMessage,
  res: ServerResponse,
): string {
  const incoming = req.headers[REQUEST_ID_HEADER];
  const id =
    typeof incoming === 'string' && /^[\w.-]{1,64}$/.test(incoming)
      ? incoming
      : randomUUID();
  res.setHeader('X-Request-Id', id);
  return id;
}

/** 5xx o excepción → error; 4xx → warn; el resto → info. */
export function levelFor(
  _req: IncomingMessage,
  res: ServerResponse,
  error?: Error,
): 'error' | 'warn' | 'info' {
  if (error || res.statusCode >= 500) return 'error';
  if (res.statusCode >= 400) return 'warn';
  return 'info';
}

const userIdOf = (req: IncomingMessage) =>
  (req as IncomingMessage & AuthenticatedRequest).user?.id;

/**
 * Configuración de pino-http:
 * - una línea por petición con método, ruta, estado, duración, id de petición y usuario;
 * - JSON en producción (para un agregador de logs) y formato legible en desarrollo;
 * - cabeceras de autenticación, cookies y contraseñas ocultas.
 */
export function buildLoggerParams(options: {
  level: string;
  pretty: boolean;
}): Params {
  return {
    pinoHttp: {
      level: options.level,
      transport: options.pretty
        ? {
            target: 'pino-pretty',
            options: {
              singleLine: true,
              translateTime: 'SYS:HH:MM:ss.l',
              // El mensaje ya dice método, ruta, estado y duración: en consola sobra el detalle.
              ignore: 'pid,hostname,req,res,responseTime',
            },
          }
        : undefined,
      genReqId: requestIdFor,
      customAttributeKeys: { reqId: 'requestId' },
      // Los logs que se emiten dentro de una petición llevan sólo su id, no la petición entera.
      quietReqLogger: true,
      autoLogging: {
        ignore: (req) => SILENT_PATHS.includes((req.url ?? '').split('?')[0]),
      },
      customLogLevel: levelFor,
      customSuccessMessage: (req, res, responseTime) =>
        `${req.method} ${req.url} ${res.statusCode} ${Math.round(responseTime)}ms`,
      customErrorMessage: (req, res) =>
        `${req.method} ${req.url} ${res.statusCode} falló`,
      // El usuario se conoce recién al terminar (lo fija el guard), por eso se agrega aquí.
      customSuccessObject: (req, _res, value: object) => ({
        ...value,
        userId: userIdOf(req),
      }),
      customErrorObject: (req, _res, _error, value: object) => ({
        ...value,
        userId: userIdOf(req),
      }),
      serializers: {
        req: (req: {
          id: string;
          method: string;
          url: string;
          remoteAddress?: string;
        }) => ({
          id: req.id,
          method: req.method,
          url: req.url,
          ip: req.remoteAddress,
        }),
        res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),
      },
      redact: { paths: REDACTED_PATHS, censor: '[oculto]' },
    },
  };
}
