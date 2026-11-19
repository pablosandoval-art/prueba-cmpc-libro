import type { LoginThrottle } from '../domain/login-throttle.js';

interface Entry {
  failures: number;
  /** Epoch ms del último fallo: los fallos viejos se olvidan. */
  lastFailureAt: number;
  /** Epoch ms hasta el que la clave está bloqueada (0 = no). */
  lockedUntil: number;
}

export interface InMemoryLoginThrottleOptions {
  maxAttempts: number;
  lockSeconds: number;
  /** Tras este tiempo sin fallos, el contador vuelve a cero. */
  failureWindowMs?: number;
  now?: () => number;
}

/** Más claves que esto y se purgan las vencidas (acota la memoria ante muchas IPs). */
const SWEEP_THRESHOLD = 10_000;

/**
 * Contador en memoria del proceso. Suficiente para una instancia de la API; con
 * varias réplicas habría que compartirlo (p. ej. en Redis) detrás del mismo contrato.
 */
export class InMemoryLoginThrottle implements LoginThrottle {
  private readonly entries = new Map<string, Entry>();
  private readonly maxAttempts: number;
  private readonly lockMs: number;
  private readonly failureWindowMs: number;
  private readonly now: () => number;

  constructor(options: InMemoryLoginThrottleOptions) {
    this.maxAttempts = options.maxAttempts;
    this.lockMs = options.lockSeconds * 1000;
    this.failureWindowMs = options.failureWindowMs ?? 15 * 60 * 1000;
    this.now = options.now ?? Date.now;
  }

  retryAfter(key: string): number {
    const entry = this.entries.get(key);
    const remaining = entry ? entry.lockedUntil - this.now() : 0;
    return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
  }

  registerFailure(key: string): number {
    const now = this.now();
    const previous = this.entries.get(key);
    const stale =
      !previous || now - previous.lastFailureAt > this.failureWindowMs;
    const failures = (stale ? 0 : previous.failures) + 1;

    if (failures >= this.maxAttempts) {
      // Al agotar los intentos se bloquea y, al terminar la espera, vuelve a tener todos.
      this.entries.set(key, {
        failures: 0,
        lastFailureAt: now,
        lockedUntil: now + this.lockMs,
      });
      this.sweepIfNeeded(now);
      return Math.ceil(this.lockMs / 1000);
    }
    this.entries.set(key, { failures, lastFailureAt: now, lockedUntil: 0 });
    this.sweepIfNeeded(now);
    return 0;
  }

  reset(key: string): void {
    this.entries.delete(key);
  }

  private sweepIfNeeded(now: number): void {
    if (this.entries.size <= SWEEP_THRESHOLD) return;
    for (const [key, entry] of this.entries) {
      const expired =
        entry.lockedUntil <= now &&
        now - entry.lastFailureAt > this.failureWindowMs;
      if (expired) this.entries.delete(key);
    }
  }
}
