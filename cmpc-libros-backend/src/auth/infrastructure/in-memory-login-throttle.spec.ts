import { InMemoryLoginThrottle } from './in-memory-login-throttle.js';

describe('InMemoryLoginThrottle', () => {
  let now = 0;
  const throttle = () =>
    new InMemoryLoginThrottle({
      maxAttempts: 5,
      lockSeconds: 30,
      failureWindowMs: 60_000,
      now: () => now,
    });

  beforeEach(() => {
    now = 1_000_000;
  });

  it('bloquea 30 s al quinto fallo y no antes', () => {
    const t = throttle();
    for (let i = 0; i < 4; i++) expect(t.registerFailure('k')).toBe(0);
    expect(t.retryAfter('k')).toBe(0);
    expect(t.registerFailure('k')).toBe(30);
    expect(t.retryAfter('k')).toBe(30);
    now += 12_500;
    expect(t.retryAfter('k')).toBe(18);
  });

  it('al terminar la espera se vuelve a tener todos los intentos', () => {
    const t = throttle();
    for (let i = 0; i < 5; i++) t.registerFailure('k');
    now += 30_000;
    expect(t.retryAfter('k')).toBe(0);
    for (let i = 0; i < 4; i++) expect(t.registerFailure('k')).toBe(0);
    expect(t.registerFailure('k')).toBe(30);
  });

  it('un login correcto reinicia el contador', () => {
    const t = throttle();
    for (let i = 0; i < 4; i++) t.registerFailure('k');
    t.reset('k');
    expect(t.registerFailure('k')).toBe(0);
  });

  it('cada clave (IP + email) cuenta por separado', () => {
    const t = throttle();
    for (let i = 0; i < 5; i++) t.registerFailure('ip1|a@x.cl');
    expect(t.retryAfter('ip1|a@x.cl')).toBe(30);
    expect(t.retryAfter('ip2|a@x.cl')).toBe(0);
    expect(t.retryAfter('ip1|b@x.cl')).toBe(0);
  });

  it('olvida los fallos viejos (fuera de la ventana)', () => {
    const t = throttle();
    for (let i = 0; i < 4; i++) t.registerFailure('k');
    now += 60_001;
    expect(t.registerFailure('k')).toBe(0);
  });

  it('purga claves vencidas cuando hay demasiadas', () => {
    const t = throttle();
    for (let i = 0; i <= 10_000; i++) t.registerFailure(`old-${i}`);
    now += 120_000;
    t.registerFailure('nueva');
    const entries = (t as unknown as { entries: Map<string, unknown> }).entries;
    expect(entries.size).toBe(1);
    expect(entries.has('nueva')).toBe(true);
  });

  it('usa el reloj real y una ventana de 15 min por defecto', () => {
    const t = new InMemoryLoginThrottle({ maxAttempts: 1, lockSeconds: 1 });
    expect(t.registerFailure('k')).toBe(1);
    expect(t.retryAfter('k')).toBe(1);
  });
});
