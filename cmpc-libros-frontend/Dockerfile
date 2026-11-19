# syntax=docker/dockerfile:1
#
# Imagen del frontend: compila la SPA con Vite y la sirve con nginx.
# La URL de la API se fija al compilar (VITE_API_URL); si cambia, hay que reconstruir la imagen.
#
# Se construye desde el docker-compose.yml del stack (carpeta padre).

# ---------- build ----------
FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# URL pública de la API tal como la ve el NAVEGADOR (no el contenedor).
ARG VITE_API_URL=http://localhost:3000
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

# ---------- servidor ----------
FROM nginx:stable-alpine AS runtime
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY nginx/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=5 \
    CMD wget -q -O /dev/null http://127.0.0.1/healthz || exit 1
