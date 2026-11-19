# CLAUDE.md — cmpc-libros-stack

Orquestación Docker del sistema CMPC Libros. Contiene sólo `docker-compose.yml` (que **incluye** los de cada proyecto con `include:`), `.env.example` y documentación. El código está en dos repositorios independientes, ubicados como carpetas hermanas e ignorados por este repo:

- `cmpc-libros-backend/` — API NestJS + Prisma (`Dockerfile` y `docker-compose.yml` con `postgres` + `migrate` + `api`, usable solo; `docker-compose.override.yml` sólo para dev).
- `cmpc-libros-frontend/` — SPA React + Vite (`Dockerfile`, `nginx/` y `docker-compose.yml` con `web`, usable solo).

## Regla de trabajo (prioritaria)

Ante cualquier decisión funcional, de diseño, de arquitectura o de implementación: **consultar al usuario** con explicación, alternativas y recomendación antes de avanzar.

## Decisiones confirmadas (2026-11-18)

1. El compose del stack vive en la **carpeta padre**, en un repositorio propio; cada proyecto aporta su Dockerfile **y su docker-compose.yml**, de modo que cada uno se puede usar por separado (decidido el 2026-11-19). El del padre sólo hace `include:` de ambos con `env_file: ./.env` (si no, cada uno leería su `.env` de desarrollo, p. ej. un `CORS_ORIGINS` sin el 8080).
2. El frontend se sirve con **nginx en un puerto aparte** (`WEB_PORT`, 8080) y el navegador llama a la API en `API_PORT` (3000) con **CORS**. La URL de la API se fija al compilar (`VITE_API_URL` ← `PUBLIC_API_URL`); cambiarla exige reconstruir.
3. CORS por defecto del backend: `http://localhost:${WEB_PORT:-8080}` y `http://localhost:5173` (decidido el 2026-11-19).
4. La base se inicializa sola: el servicio `migrate` (un solo uso) aplica migraciones y seed (idempotente) antes de que arranque la API.

## Reglas al modificar

- La imagen de la API **no debe llevar** `prisma` ni `typescript` (`npm prune --omit=dev --omit=optional --omit=peer`): `@prisma/client` los declara como peers opcionales y suman ~300 MB.
- `migrate` usa el target `migrate` del Dockerfile del backend (con devDependencies: necesita `prisma` y `tsx`).
- Postgres **no publica puerto** en el stack: el `include` sólo carga `docker-compose.yml` del backend, no su `docker-compose.override.yml` (que publica el 5432 del host y fija `container_name` para el desarrollo). No añadir ahí nada del stack.
- Los `docker-compose.yml` de los proyectos no pueden depender entre sí (el `web` no espera a la `api`): cada uno debe funcionar solo. `include` no admite sobrescribir servicios incluidos.
- Para probar cada modo sin pisar el desarrollo: `docker compose -p <otro> --env-file <ports> ...` dentro de cada repo (en el backend con `-f docker-compose.yml` para omitir el override y no chocar con `cmpc-libros-postgres`).
- Para probar sin pisar el entorno de desarrollo: `docker compose -p cmpc-verify --env-file <env con otros puertos> ...` y limpiar con `down -v --rmi local`.
- **Documentación sin duplicar** (2026-11-19): este README sólo explica el stack (servicios, variables propias del stack, comandos, problemas). Las variables de la API se documentan una sola vez, en la tabla del README del backend, y aquí sólo se enlazan; lo mismo con los detalles de cada imagen.
- La sesión es una cookie `SameSite=Strict`: web y API deben abrirse con el mismo host (`localhost`), y `COOKIE_SECURE=true` sólo detrás de HTTPS.
- `JWT_SECRET` es obligatorio (`${JWT_SECRET:?...}`); `.env.example` trae un valor **sólo local**.
