/**
 * Smoke test e2e contra la aplicación completa y la base de datos real.
 * Requiere PostgreSQL levantado (`npm run db:up`), migrado y con seed.
 * Sólo realiza lecturas: no modifica datos.
 */
import 'dotenv/config';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';

describe('CMPC Libros API (e2e)', () => {
  let app: NestExpressApplication;
  let token: string;
  /** `cmpc_session=<jwt>`, tal como la enviaría el navegador. */
  let sessionCookie: string;
  let loginSetCookie: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>();
    configureApp(app);
    await app.init();

    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: process.env.SEED_USER_EMAIL,
        password: process.env.SEED_USER_PASSWORD,
      })
      .expect(200);
    loginSetCookie = ([] as string[]).concat(
      login.headers['set-cookie'] ?? [],
    )[0];
    sessionCookie = loginSetCookie.split(';')[0];
    token = sessionCookie.split('=')[1];
    expect(login.body).toEqual({
      expiresAt: expect.any(String),
      user: expect.objectContaining({ email: process.env.SEED_USER_EMAIL }),
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/health es público', () =>
    request(app.getHttpServer())
      .get('/api/health')
      .expect(200, { status: 'ok' }));

  it('POST /api/auth/login fija una cookie HttpOnly, SameSite=Strict, sin el token en el cuerpo', () => {
    expect(loginSetCookie).toMatch(/^cmpc_session=[\w-]+\.[\w-]+\.[\w-]+;/);
    expect(loginSetCookie).toMatch(/HttpOnly/i);
    expect(loginSetCookie).toMatch(/SameSite=Strict/i);
    expect(loginSetCookie).toMatch(/Path=\/api/i);
    // Cookie de sesión: sin Expires ni Max-Age, el navegador la borra al cerrarse.
    expect(loginSetCookie).not.toMatch(/Expires|Max-Age/i);
  });

  it('GET /api/auth/me acepta la cookie y devuelve usuario y expiración', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Cookie', sessionCookie)
      .expect(200);
    expect(res.body.user.email).toBe(process.env.SEED_USER_EMAIL);
    // Token de 12 h por defecto (JWT_EXPIRES_IN).
    const hours =
      (Date.parse(res.body.expiresAt as string) - Date.now()) / 3.6e6;
    expect(hours).toBeGreaterThan(0);
  });

  it('cada respuesta lleva un X-Request-Id (y respeta el que envía el cliente)', async () => {
    const generated = await request(app.getHttpServer()).get('/api/health');
    expect(generated.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
    const echoed = await request(app.getHttpServer())
      .get('/api/health')
      .set('X-Request-Id', 'soporte-123');
    expect(echoed.headers['x-request-id']).toBe('soporte-123');
  });

  it('rechaza (403) escrituras con la cookie desde un origen ajeno (CSRF)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/logout')
      .set('Cookie', sessionCookie)
      .set('Origin', 'https://sitio-malicioso.example')
      .expect(403);
    expect(res.body.message).toBe('Origen no permitido');
  });

  it('POST /api/auth/logout desde el frontend borra la cookie', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/logout')
      .set('Cookie', sessionCookie)
      .set(
        'Origin',
        process.env.CORS_ORIGINS?.split(',')[0] ?? 'http://localhost:5173',
      )
      .expect(204);
    const cleared = ([] as string[]).concat(res.headers['set-cookie'] ?? [])[0];
    expect(cleared).toMatch(/^cmpc_session=;/);
    expect(cleared).toMatch(/Expires=Thu, 01 Jan 1970/);
  });

  it('bloquea el login tras 5 fallos con el mismo email e IP (429 + Retry-After)', async () => {
    // Email inexistente y único: no afecta al usuario real ni a otras pruebas.
    const email = `bloqueo-${Date.now()}@cmpc.cl`;
    const attempt = () =>
      request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email, password: 'incorrecta' });

    for (let i = 0; i < 4; i++) await attempt().expect(401);
    const fifth = await attempt().expect(429);
    expect(fifth.headers['retry-after']).toBe('30');
    expect(fifth.body.message).toMatch(/Demasiados intentos/);
    const sixth = await attempt().expect(429);
    expect(Number(sixth.headers['retry-after'])).toBeLessThanOrEqual(30);
  });

  it('POST /api/auth/login rechaza credenciales inválidas', () =>
    request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'nadie@cmpc.cl', password: 'x' })
      .expect(401));

  it('GET /api/books exige token', () =>
    request(app.getHttpServer()).get('/api/books').expect(401));

  it('GET /api/books lista con paginación, filtros y orden', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/books')
      .query({ limit: 5, available: true, sort: 'price:desc' })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.meta).toMatchObject({ page: 1, limit: 5 });
    const prices = (res.body.data as { price: number; stock: number }[]).map(
      (b) => b.price,
    );
    expect(prices).toEqual([...prices].sort((a, b) => b - a));
    for (const book of res.body.data as { stock: number }[]) {
      expect(book.stock).toBeGreaterThan(0);
    }
  });

  it('GET /api/books valida los query params', () =>
    request(app.getHttpServer())
      .get('/api/books')
      .query({ sort: 'password:asc', limit: 1000 })
      .set('Authorization', `Bearer ${token}`)
      .expect(400));

  it('GET /api/books/export devuelve un CSV descargable', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/books/export')
      .query({ genreId: 1 })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.headers['content-disposition']).toMatch(
      /attachment; filename="CMPC-LIBROS-\d+\.csv"/,
    );
    expect(res.text).toContain('Título,Autor,Editorial');
  });

  it('GET /api/authors y /api/publishers buscan por nombre', async () => {
    const authors = await request(app.getHttpServer())
      .get('/api/authors')
      .query({ search: 'garcía', limit: 5 })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(authors.body[0]).toMatchObject({
      name: expect.stringContaining('García'),
    });

    const publishers = await request(app.getHttpServer())
      .get('/api/publishers')
      .query({ limit: 3 })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(publishers.body).toHaveLength(3);
    expect(publishers.body[0]).toEqual({
      id: expect.any(Number),
      name: expect.any(String),
    });
  });

  it('GET /api/authors exige token y valida el límite', async () => {
    await request(app.getHttpServer()).get('/api/authors').expect(401);
    await request(app.getHttpServer())
      .get('/api/authors')
      .query({ limit: 999 })
      .set('Authorization', `Bearer ${token}`)
      .expect(400);
  });

  it('GET /api/books filtra por el nombre del autor y devuelve autor y editorial como objetos', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/books')
      .query({ author: 'garcía', sort: 'author:asc,publisher:desc' })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.data.length).toBeGreaterThan(0);
    for (const book of res.body.data as {
      author: { id: number; name: string };
      publisher: { id: number; name: string };
    }[]) {
      expect(book.author.name.toLowerCase()).toContain('garcía');
      expect(book.publisher).toEqual({
        id: expect.any(Number),
        name: expect.any(String),
      });
    }
  });

  it('GET /api/audit-logs exige token y filtra por rango de fechas', async () => {
    await request(app.getHttpServer()).get('/api/audit-logs').expect(401);

    const wide = await request(app.getHttpServer())
      .get('/api/audit-logs')
      .query({ from: '2000-01-01T00:00:00Z', to: '2999-01-01T00:00:00Z' })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(wide.body.meta.total).toBeGreaterThanOrEqual(0);

    const past = await request(app.getHttpServer())
      .get('/api/audit-logs')
      .query({ from: '2000-01-01T00:00:00Z', to: '2000-01-02T00:00:00Z' })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(past.body).toMatchObject({ data: [], meta: { total: 0 } });
  });

  it('GET /api/audit-logs valida las fechas y el rango', async () => {
    const get = (query: Record<string, string>) =>
      request(app.getHttpServer())
        .get('/api/audit-logs')
        .query(query)
        .set('Authorization', `Bearer ${token}`);

    await get({ from: 'ayer' }).expect(400);
    await get({
      from: '2026-11-19T00:00:00Z',
      to: '2026-11-18T00:00:00Z',
    }).expect(400);
    await get({ action: 'EXPLODE' }).expect(400);
  });

  it('GET /api/genres devuelve el catálogo', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/genres')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.length).toBeGreaterThan(0);
  });
});
