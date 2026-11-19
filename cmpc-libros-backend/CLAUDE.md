# CLAUDE.md — cmpc-libros-backend

API REST en NestJS + TypeScript para la gestión de libros de CMPC. La consume el proyecto hermano `../cmpc-libros-frontend` (React + Vite).

@AGENTS.md

## Regla de trabajo (prioritaria)

Ante **cualquier** duda funcional, decisión de diseño, decisión de arquitectura o duda de implementación: **detenerse y consultar al usuario** antes de avanzar, explicando el contexto, las alternativas, sus trade-offs y una recomendación. No asumir silenciosamente. Las decisiones ya tomadas se registran en la sección "Decisiones" de este archivo.

## Skills del proyecto

- `nestjs-expert` (`.claude/skills/nestjs-expert`, de jeffallan/claude-skills @ 67c1961): módulos, controladores, servicios, DTOs, guards, Swagger, testing. **Ojo:** sus ejemplos usan Jest, TypeORM e imports CommonJS; en este proyecto se adapta a Vitest (`vi.fn()`), Prisma e imports ESM con `.js`.
- `prisma-cli`, `prisma-client-api`, `prisma-orm-setup`, `prisma-database-setup` (oficiales, `prisma/skills`): API de Prisma 7. Ignorar sus referencias a Prisma 8 (este proyecto usa 7.10.1).

## Stack

- NestJS **12** (más nuevo que el conocimiento base: consultar https://docs.nestjs.com/llms.txt ante dudas de API).
- TypeScript 6, `module: nodenext`, **ESM** (`"type": "module"`): imports relativos terminan en `.js`, no existe `__dirname` (usar `import.meta.dirname`).
- **Prisma 7.10.1** con driver adapter `@prisma/adapter-pg`; generador `prisma-client` → `src/generated/prisma` (gitignored, se regenera en `postinstall`). Config en `prisma.config.ts` (seed con `tsx`). En Prisma 7 `migrate dev` **no** regenera el cliente: correr `npm run db:generate`.
- PostgreSQL 17 vía `docker-compose.yml`. Extensión `pg_trgm`.
- `@nestjs/jwt` (HS256), `@nestjs/swagger`, `@nestjs/config` (validación de env con class-validator), `class-validator`/`class-transformer`, `bcrypt`, `cookie-parser`, `nestjs-pino` (+ `pino-http`; `pino-pretty` sólo en desarrollo).
- Tests: **Vitest 4** (`vitest.config.ts` unit, `vitest.config.e2e.ts` e2e) + `@vitest/coverage-v8` + supertest. `setupFiles: ['reflect-metadata']`.
- Lint: **oxlint** type-aware; formato: Prettier (`npm run format`).

## Comandos

```bash
npm run db:up         # levanta sólo PostgreSQL (docker compose up -d postgres)
npm run docker:up     # PostgreSQL + migraciones/seed + API en Docker (sin frontend)
npm run db:migrate    # crea/aplica migraciones (dev)
npm run db:generate   # regenera el cliente Prisma
npm run db:seed       # usuario inicial + géneros + 40 libros (idempotente)
npm run start:dev     # API en http://localhost:3000/api, Swagger en /docs
npm run build && npm run lint
npm test              # unit
npm run test:cov      # cobertura (umbral 80% configurado en vitest.config.ts)
npm run test:e2e      # e2e de solo lectura (requiere BD con seed)
```

## Arquitectura implementada

Módulos por feature, cada uno en capas: `domain/` (tipos + contratos abstractos usados como tokens DI) → `application/` (servicios con la lógica) → `infrastructure/` (implementaciones Prisma) → `http/` (controladores + DTOs con class-validator y Swagger).

```
src/
├── config/        env.validation.ts (fail fast al arrancar)
├── logging/       nestjs-pino: X-Request-Id, nivel por estado, redacción de datos sensibles (logging.options.ts)
├── common/        @Public, @CurrentUser, paginación, transformers (Trim, ToBoolean), http/ (API_PREFIX, originCheck CSRF)
├── database/      PrismaService, UnitOfWork (abstracto) + PrismaUnitOfWork, PrismaExceptionFilter (global)
├── auth/          POST /auth/login (fija la cookie), POST /auth/logout, GET /auth/me; JwtAuthGuard global (cookie o Bearer);
│                  LoginThrottle → InMemoryLoginThrottle; PasswordHasher → BcryptPasswordHasher
├── users/         UsersRepository (sólo lectura por email)
├── genres/        GET /genres (catálogo para el dropdown)
├── books/         CRUD + GET /books/export (CSV en streaming por lotes con cursor) + POST /books/:id/image
├── audit/         AuditService.record(ctx, entry) + GET /audit-logs (filtros: entityType, entityId, userId, action, from/to ISO 8601 inclusivos; lo consume la pestaña «Auditoría» del frontend)
├── storage/       ImageStorage (abstracto) → LocalDiskImageStorage; servido en /uploads
├── health/        GET /health (público)
└── testing/       fixtures de tests (excluido de cobertura)
```

Reglas para extender:
- Los servicios **nunca** importan Prisma: dependen de clases abstractas del `domain/`. Las implementaciones Prisma se registran con `useFactory` en el módulo.
- Toda escritura auditada va dentro de `unitOfWork.run(async (ctx) => { ... await audit.record(ctx, {...}) })`. Para auditar una entidad nueva: agregar su repositorio a `TransactionContext` y a `PrismaUnitOfWork`.
- Lecturas de libros siempre filtran `deletedAt: null` (en el repositorio).
- Todo endpoint es privado por defecto; usar `@Public()` sólo cuando corresponda.
- Contrato API: prefijo `/api`; listados responden `{ data, meta: { page, limit, total, totalPages } }`; orden `?sort=campo:dir,campo2:dir`; filtros `title, author, publisher, genreId, available`.
- Cada servicio, controlador y repositorio tiene su `*.spec.ts` al lado.

## Requerimientos del proyecto

### Dominio: Libro

| Campo | Tipo | Descripción |
|---|---|---|
| titulo | string | Título del libro |
| autor | string | Autor |
| editorial | string | Editorial |
| precio | int | Precio |
| disponibilidad | int | Stock disponible |
| genero | string | Género |

Además, el frontend permite **cargar una imagen por libro** (requiere soporte en el backend; ver decisiones pendientes).

### Funcionalidades

1. **CRUD de libros** protegido por JWT.
2. **Listado** con paginación del lado del servidor, filtros (título, género, editorial, autor, disponibilidad) y ordenamiento por múltiples campos (lo exige el frontend).
3. **Autenticación JWT HS256**: endpoint de login que devuelve el token firmado; guard que lo valida en todo el CRUD. Sin roles: sólo "tiene acceso o no".
   - Entregable adicional: evaluación de qué implica migrar a **RS256** y recomendaciones del proceso de autenticación (va al README).
4. **Exportación CSV** de libros, respetando los mismos filtros activos del listado.
5. **Swagger/OpenAPI** documentando cada endpoint (`@nestjs/swagger`).
6. **Soft delete** de libros (nunca borrado físico).
7. **Auditoría**: registro de todas las operaciones de creación, edición y eliminación, consultable.
8. **PostgreSQL + Prisma ORM**: justificar tablas y relaciones, **índices** para las consultas frecuentes (filtros/orden del listado) y **transacciones** en escrituras (p. ej. escritura de libro + registro de auditoría de forma atómica).

### Calidad

- Uso correcto de decoradores de NestJS, principios **SOLID**, arquitectura **modular y escalable** (un módulo por feature: `auth`, `books`, `audit`, infraestructura compartida como `prisma`/`config`).
- Tests unitarios para **cada servicio y controlador**; cobertura **≥ 80%**.
- Configuración vía `@nestjs/config` y variables de entorno; nunca hardcodear secretos, hosts ni puertos.
- DTOs validados en todas las entradas; excepciones HTTP tipadas; sin `any` salvo justificado.

### Documentación (entregables)

- `README.md`: instalación, configuración, requisitos, guía básica de uso, descripción de arquitectura y decisiones de diseño.
- Diagrama de arquitectura del sistema en JSON importable en **draw.io**.
- Modelo relacional de la BD en formato importable en **dbdiagram.io**.

## Decisiones

> Registrar aquí cada decisión confirmada por el usuario (fecha, decisión, motivo).

Confirmadas el 2026-11-18:

1. **Repositorios separados** para backend y frontend (cada uno con su git).
2. **Usuarios**: tabla `users` con usuario seed; contraseñas con **bcrypt**.
3. **Imágenes**: endpoint dedicado de subida (multipart); archivos en **disco local** detrás de una abstracción de storage; la **URL** de la imagen se guarda en BD.
4. **Modelo**: `users`, `books` (soft delete con `deleted_at`), `genres` (catálogo, FK desde `books`), `audit_logs`. Autor y editorial como texto en `books` con índices trigram (`pg_trgm`) para búsqueda parcial.
5. **Auditoría**: tabla genérica `audit_logs` (entidad, id, acción, usuario, before/after en JSONB). Mecanismo: módulo `audit` con `AuditService.record(tx, entry)`, invocado por cada servicio **dentro de su `prisma.$transaction`** (atómico, reutilizable, testeable). Se descartó interceptor (no atómico) y extensión de Prisma (implícita, difícil de testear).
6. **Librerías**: `@nestjs/jwt` + guard propio (HS256), `class-validator`/`class-transformer` para DTOs, PostgreSQL local vía **Docker Compose**.
7. **Nomenclatura en inglés** en código, BD (snake_case vía `@map`) y API: `title`, `author`, `publisher`, `price`, `stock` (= disponibilidad), `genre`. El README documenta la equivalencia con el enunciado; la UI se muestra en español.
8. **Prisma 7.10.1** (estable; la etiqueta `latest` del CLI apunta a una RC de v8). Skills oficiales de Prisma conservadas en `.claude/skills/`: `prisma-cli`, `prisma-client-api`, `prisma-orm-setup`, `prisma-database-setup`.

9. **Acceso a datos: Repositorio + UnitOfWork.** Los servicios dependen de abstracciones (clases abstractas usadas como tokens DI: `BooksRepository`, `UnitOfWork`, etc.), nunca de Prisma. Las implementaciones Prisma viven en `infrastructure/`. `UnitOfWork.run(ctx => ...)` abre la transacción y entrega repositorios ligados a ella; la auditoría se escribe con `AuditService.record(ctx, entry)` dentro de ese `run`.
10. **Guard JWT global** (`APP_GUARD`), seguro por defecto; endpoints abiertos se marcan con `@Public()`.
11. **Imagen**: `POST /books/:id/image` (multipart, campo `image`) sobre un libro existente; reemplaza y borra la imagen anterior; se audita como `UPDATE`. En BD se guarda la ruta relativa (`/uploads/<archivo>`), servida estáticamente.

12. **CSV**: separador coma (RFC 4180) + BOM UTF-8 + CRLF; neutralización de fórmulas. Nombre `CMPC-LIBROS-<timestamp ms>.csv`.
13. Menores aceptadas: Prisma 7.10.1 (no RC v8); `available=true|false|ausente`; `imageUrl` relativa (`/uploads/...`).

14. **Autores y editoriales como tablas** (`authors`, `publishers`; decidido el 2026-11-18, revierte la decisión 4 en ese punto): un autor por libro (`books.author_id`, sin N:M); nombre único sin distinguir mayúsculas (índice único sobre `lower(name)` creado en SQL); `ON DELETE RESTRICT`. El formulario usa combobox con búsqueda y **crear al vuelo**: la API de libros recibe `authorId`/`publisherId`; `GET /authors|/publishers?search=&limit=` y `POST /authors|/publishers {name}` (busca o crea; 201 si crea, 200 si ya existía; la creación se audita). Gestión mínima: sin editar ni eliminar. Los filtros del listado siguen siendo de **texto sobre el nombre** (ILIKE vía relación) y el orden por `author`/`publisher` ordena por nombre.

15. **Sesión en cookie** (2026-11-19): el JWT viaja en la cookie `cmpc_session` (HttpOnly, SameSite=Strict, `Path=/api`, **de sesión**: sin `Max-Age`; `Secure` según `COOKIE_SECURE`). El login responde `{ expiresAt, user }` **sin el token**; `POST /auth/logout` la borra; `GET /auth/me` devuelve `{ expiresAt, user }`. El guard sigue aceptando `Authorization: Bearer` (Swagger, clientes de API). CORS con `credentials: true`.
16. **CSRF** (2026-11-19): middleware `originCheck` (en `app.setup.ts`): las escrituras con `Origin`/`Referer` ajeno a `CORS_ORIGINS` y a la propia API → 403; sin ninguna de las dos cabeceras sólo pasan si no traen la cookie. Por eso las escrituras de los e2e y de scripts usan Bearer o envían `Origin`.
17. **Límite de login** (2026-11-19): sólo cuentan los **fallidos por IP + email**; al 5º (`LOGIN_MAX_ATTEMPTS`) se bloquea 30 s (`LOGIN_LOCK_SECONDS`) con 429 + `Retry-After` (el 5º fallo ya responde 429). Un login correcto reinicia; los fallos se olvidan a los 15 min. En memoria (una instancia); con réplicas, otra implementación de `LoginThrottle` (Redis).
18. **Token de 12 h** (`JWT_EXPIRES_IN` por defecto `12h`, 2026-11-19).
19. **Logs** (2026-11-19): `nestjs-pino`. JSON con `NODE_ENV=production`, legible en otro caso; `LOG_LEVEL`. Una línea por petición (`requestId`, usuario, estado, duración), sin `/api/health`; `Authorization`, cookies, `Set-Cookie`, `password` y `accessToken` redactados. Eventos: login correcto/fallido/bloqueado (email enmascarado con `maskEmail`), `Auditoría: <acción> <entidad> <id>`. Usar `new Logger(Clase.name)` con el estilo `logger.warn({ datos }, 'mensaje')`. Las pruebas unitarias silencian los logs (`src/testing/silence-logs.ts`) y los e2e corren con `LOG_LEVEL=silent`.

## Docker

- `Dockerfile` multi-etapa: `build` → `migrate` (migraciones + seed, un solo uso) | `runtime` (API sin `prisma` ni `typescript`: `npm prune --omit=dev --omit=optional --omit=peer`). 
- `docker-compose.yml`: `postgres` + `migrate` + `api`; **independiente del frontend** (CORS por defecto: `WEB_PORT` y 5173). El stack completo (carpeta padre, repo `cmpc-libros-stack`) lo incluye con `include:` y le pasa su propio `.env` (`env_file`), así que aquí no debe haber nada específico del stack.
- `docker-compose.override.yml` (se carga solo, sólo en este repo): `container_name: cmpc-libros-postgres` y publica el 5432 para el desarrollo con `npm run start:dev`. El stack incluye únicamente el `docker-compose.yml` base, por eso allí la base no publica puerto.
- `npm run db:up` levanta **sólo** `postgres`; no cambiar a `up -d` a secas (arrancaría también `api` en el 3000).

## Documentación entregada

- `README.md`: puesta en marcha, **tabla única de variables de entorno** (la referencia para todos los modos; el README del stack enlaza aquí), endpoints, seguridad (cookie, CSRF, límite de login, RS256), logs, arquitectura, modelo de datos, decisiones y pruebas. **Mantenerlo al día** al cambiar endpoints, variables o el esquema, sin repetir lo que ya explican el README del frontend o el del stack.
- `docs/arquitectura.drawio` (XML nativo de draw.io; copia idéntica en el frontend), `docs/modelo-datos.dbml` / `.sql` / `.json` (JSON de DBML, verificado con `@dbml/core`). Si cambia `schema.prisma`, regenerar los tres archivos del modelo.
- Nota de formato: dbdiagram.io no importa JSON (sólo DBML/SQL) y draw.io importa XML `.drawio`; por eso se entregan esos formatos además del JSON.

## Decisiones pendientes (consultar antes de implementar)

_Ninguna por ahora._
