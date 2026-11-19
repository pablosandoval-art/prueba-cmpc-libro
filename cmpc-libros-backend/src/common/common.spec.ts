import type { ExecutionContext } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { HealthController } from '../health/health.controller.js';
import { USER } from '../testing/fixtures.js';
import { extractCurrentUser } from './auth/authenticated-user.js';
import { buildPaginationMeta, toSkip } from './pagination/pagination.js';
import { ToBoolean, Trim } from './transformers/trim.transformer.js';

const contextWith = (user?: typeof USER) =>
  ({
    switchToHttp: () => ({ getRequest: () => ({ headers: {}, user }) }),
  }) as unknown as ExecutionContext;

describe('extractCurrentUser', () => {
  it('devuelve el usuario adjuntado por el guard', () => {
    expect(extractCurrentUser(contextWith(USER))).toBe(USER);
  });

  it('falla si se usa en un endpoint sin autenticación', () => {
    expect(() => extractCurrentUser(contextWith())).toThrow(
      /sin autenticación/,
    );
  });
});

describe('paginación', () => {
  it('calcula skip y metadatos', () => {
    expect(toSkip({ page: 3, limit: 10 })).toBe(20);
    expect(buildPaginationMeta({ page: 1, limit: 10 }, 0)).toEqual({
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 0,
    });
    expect(buildPaginationMeta({ page: 1, limit: 10 }, 21).totalPages).toBe(3);
  });
});

describe('transformadores', () => {
  class Sample {
    @Trim() text: unknown;
    @ToBoolean() flag: unknown;
  }

  it.each([
    [
      { text: '  hola ', flag: 'true' },
      { text: 'hola', flag: true },
    ],
    [
      { text: 5, flag: 'false' },
      { text: 5, flag: false },
    ],
    [
      { text: null, flag: true },
      { text: null, flag: true },
    ],
    [
      { text: '', flag: 'quizás' },
      { text: '', flag: 'quizás' },
    ],
  ])('%j → %j', (input, expected) => {
    expect(plainToInstance(Sample, input)).toEqual(expected);
  });
});

describe('HealthController', () => {
  it('responde ok', () => {
    expect(new HealthController().check()).toEqual({ status: 'ok' });
  });
});
