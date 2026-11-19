import type { NextFunction, Request, Response } from 'express';
import { isTrustedOrigin, originCheck } from './origin-check.js';

const ALLOWED = ['http://localhost:5173', 'http://localhost:8080'];

function run(req: Partial<Request> & { headers: Request['headers'] }) {
  const next = vi.fn() as unknown as NextFunction;
  const json = vi.fn();
  const status = vi.fn(() => ({ json }));
  const res = { status } as unknown as Response;
  originCheck(ALLOWED, 'cmpc_session')(req as Request, res, next);
  return { next, status, json };
}

describe('isTrustedOrigin', () => {
  it('acepta los orígenes del frontend y el de la propia API', () => {
    expect(
      isTrustedOrigin('http://localhost:5173', 'localhost:3000', ALLOWED),
    ).toBe(true);
    expect(
      isTrustedOrigin('http://localhost:3000', 'localhost:3000', ALLOWED),
    ).toBe(true);
    expect(
      isTrustedOrigin('https://malo.example', 'localhost:3000', ALLOWED),
    ).toBe(false);
    expect(isTrustedOrigin('https://malo.example', undefined, ALLOWED)).toBe(
      false,
    );
    expect(isTrustedOrigin('no-es-url', 'localhost:3000', ALLOWED)).toBe(false);
  });
});

describe('originCheck (CSRF)', () => {
  it('no revisa las lecturas', () => {
    const { next } = run({
      method: 'GET',
      headers: { origin: 'https://malo.example' },
    });
    expect(next).toHaveBeenCalled();
  });

  it('deja pasar escrituras desde el frontend', () => {
    const { next } = run({
      method: 'POST',
      headers: { origin: 'http://localhost:5173', cookie: 'cmpc_session=x' },
    });
    expect(next).toHaveBeenCalled();
  });

  it('rechaza con 403 escrituras desde otro origen', () => {
    const { next, status, json } = run({
      method: 'DELETE',
      headers: {
        origin: 'https://malo.example',
        host: 'localhost:3000',
        cookie: 'cmpc_session=x',
      },
    });
    expect(next).not.toHaveBeenCalled();
    expect(status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Origen no permitido' }),
    );
  });

  it('sin Origin usa el Referer', () => {
    expect(
      run({
        method: 'PATCH',
        headers: { referer: 'http://localhost:8080/books/1/edit' },
      }).next,
    ).toHaveBeenCalled();
    expect(
      run({
        method: 'PATCH',
        headers: { referer: 'https://malo.example/x', host: 'localhost:3000' },
      }).status,
    ).toHaveBeenCalledWith(403);
  });

  it('sin Origin ni Referer sólo pasa si no lleva la cookie de sesión (cliente con Bearer)', () => {
    expect(
      run({ method: 'POST', headers: { authorization: 'Bearer t' } }).next,
    ).toHaveBeenCalled();
    expect(
      run({ method: 'POST', headers: { cookie: 'otra=1; cmpc_session=x' } })
        .status,
    ).toHaveBeenCalledWith(403);
  });

  it('un Origin "null" (iframe aislado) cuenta como ausente', () => {
    expect(
      run({
        method: 'POST',
        headers: { origin: 'null', cookie: 'cmpc_session=x' },
      }).status,
    ).toHaveBeenCalledWith(403);
  });
});
