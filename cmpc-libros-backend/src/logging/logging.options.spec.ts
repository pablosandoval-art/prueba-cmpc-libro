import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Options } from 'pino-http';
import {
  REDACTED_PATHS,
  buildLoggerParams,
  levelFor,
  requestIdFor,
} from './logging.options.js';

const res = (statusCode = 200) =>
  ({ statusCode, setHeader: vi.fn() }) as unknown as ServerResponse & {
    setHeader: ReturnType<typeof vi.fn>;
  };
const req = (headers: Record<string, string> = {}, extra: object = {}) =>
  ({
    headers,
    method: 'GET',
    url: '/api/books?page=2',
    ...extra,
  }) as unknown as IncomingMessage;

const httpOptions = (pretty = false) =>
  buildLoggerParams({ level: 'debug', pretty }).pinoHttp as Options;

describe('requestIdFor', () => {
  it('reutiliza un X-Request-Id válido y lo devuelve en la respuesta', () => {
    const r = res();
    expect(requestIdFor(req({ 'x-request-id': 'abc-123' }), r)).toBe('abc-123');
    expect(r.setHeader).toHaveBeenCalledWith('X-Request-Id', 'abc-123');
  });

  it('genera uno nuevo si falta o trae caracteres raros', () => {
    expect(requestIdFor(req(), res())).toMatch(/^[0-9a-f-]{36}$/);
    expect(
      requestIdFor(req({ 'x-request-id': 'a b\n<script>' }), res()),
    ).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe('levelFor', () => {
  it('error para 5xx o excepción, warn para 4xx, info para el resto', () => {
    expect(levelFor(req(), res(500))).toBe('error');
    expect(levelFor(req(), res(200), new Error('x'))).toBe('error');
    expect(levelFor(req(), res(404))).toBe('warn');
    expect(levelFor(req(), res(201))).toBe('info');
  });
});

describe('buildLoggerParams', () => {
  it('JSON en producción, legible en desarrollo', () => {
    expect(httpOptions(false).transport).toBeUndefined();
    expect(httpOptions(true).transport).toMatchObject({
      target: 'pino-pretty',
    });
    expect(httpOptions().level).toBe('debug');
  });

  it('oculta credenciales y cookies', () => {
    expect(httpOptions().redact).toEqual({
      paths: REDACTED_PATHS,
      censor: '[oculto]',
    });
    expect(REDACTED_PATHS).toEqual(
      expect.arrayContaining([
        'req.headers.authorization',
        'req.headers.cookie',
        '*.password',
      ]),
    );
  });

  it('no registra el healthcheck', () => {
    const { ignore } = httpOptions().autoLogging as {
      ignore: (r: IncomingMessage) => boolean;
    };
    expect(ignore(req({}, { url: '/api/health' }))).toBe(true);
    expect(ignore(req({}, { url: '/api/health?x=1' }))).toBe(true);
    expect(ignore(req({}, { url: '/api/books' }))).toBe(false);
    expect(ignore(req({}, { url: undefined }))).toBe(false);
  });

  it('mensaje de una línea con método, ruta, estado y duración, y el usuario al terminar', () => {
    const o = httpOptions();
    const r = req({}, { user: { id: 'u1' } });
    expect(o.customSuccessMessage!(r, res(200), 12.6)).toBe(
      'GET /api/books?page=2 200 13ms',
    );
    expect(o.customErrorMessage!(r, res(500), new Error('x'))).toBe(
      'GET /api/books?page=2 500 falló',
    );
    expect(o.customSuccessObject!(r, res(), { a: 1 })).toEqual({
      a: 1,
      userId: 'u1',
    });
    expect(
      o.customErrorObject!(req(), res(500), new Error('x'), { a: 1 }),
    ).toEqual({
      a: 1,
      userId: undefined,
    });
  });

  it('serializa la petición y la respuesta sin cabeceras', () => {
    const { req: sReq, res: sRes } = httpOptions().serializers as Record<
      string,
      (v: object) => object
    >;
    expect(
      sReq({
        id: 'r1',
        method: 'POST',
        url: '/api/auth/login',
        remoteAddress: '::1',
        headers: {},
      }),
    ).toEqual({ id: 'r1', method: 'POST', url: '/api/auth/login', ip: '::1' });
    expect(sRes({ statusCode: 201, headers: {} })).toEqual({ statusCode: 201 });
  });
});
