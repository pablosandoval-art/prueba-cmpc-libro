# syntax=docker/dockerfile:1
#
# Imagen del backend (NestJS + Prisma). Multi-etapa:
#   build    → dependencias completas, cliente Prisma y compilación
#   migrate  → servicio de un solo uso: aplica migraciones y carga el seed
#   runtime  → imagen final de la API: sólo dependencias de producción, usuario sin privilegios
#
# Se construye desde el docker-compose.yml del stack (carpeta padre).

FROM node:24-bookworm-slim AS base
WORKDIR /app
# openssl lo necesita Prisma (motor de migraciones).
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# ---------- build ----------
FROM base AS build
# prisma.config.ts exige DATABASE_URL incluso para `prisma generate`; en el build es un valor ficticio.
ARG DATABASE_URL=postgresql://build:build@localhost:5432/build
ENV DATABASE_URL=${DATABASE_URL}
# Primero lo necesario para instalar (aprovecha la caché de capas); `postinstall` genera el cliente Prisma.
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci
COPY . .
RUN npx prisma generate && npm run build

# ---------- migrate (migraciones + seed, idempotente) ----------
FROM build AS migrate
CMD ["sh", "-c", "npx prisma migrate deploy && npx prisma db seed"]

# ---------- dependencias de producción ----------
FROM build AS prod-deps
# Sólo lo que la API necesita en ejecución. @prisma/client declara `prisma` y `typescript` como peers
# opcionales y npm los deja en el árbol (CLI, studio…: ~300 MB que la API no usa); `--omit=optional`
# los saca. Lo único opcional de producción que se pierde es pg-cloudflare (Cloudflare Workers).
RUN npm prune --omit=dev --omit=optional --omit=peer --ignore-scripts

# ---------- runtime ----------
FROM base AS runtime
ENV NODE_ENV=production \
    PORT=3000 \
    UPLOADS_DIR=/app/uploads
COPY --chown=node:node package.json ./
COPY --chown=node:node --from=prod-deps /app/node_modules ./node_modules
COPY --chown=node:node --from=build /app/dist ./dist
# Carpeta de portadas subidas (se monta como volumen para que sobreviva a los reinicios).
RUN mkdir -p /app/uploads && chown node:node /app/uploads
USER node
VOLUME ["/app/uploads"]
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=5s --start-period=20s --retries=5 \
    CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/main"]
