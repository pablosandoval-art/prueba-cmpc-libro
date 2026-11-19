# CLAUDE.md — cmpc-libros-frontend

SPA en React + TypeScript (Vite) para visualizar y gestionar los libros de CMPC. Consume la API del proyecto hermano `../cmpc-libros-backend` (NestJS).

## Regla de trabajo (prioritaria)

Ante **cualquier** duda funcional, decisión de diseño, decisión de arquitectura o duda de implementación: **detenerse y consultar al usuario** antes de avanzar, explicando el contexto, las alternativas, sus trade-offs y una recomendación. No asumir silenciosamente. Las decisiones ya tomadas se registran en la sección "Decisiones" de este archivo.

## Skills

- `impeccable` (global, `~/.claude/skills/impeccable`): superficie **Operate**. Contexto en `PRODUCT.md`; contrato de dirección en `.impeccable/surfaces/`; `DESIGN.md` documenta el sistema construido. Toda UI nueva **hereda** el mundo «Cartulina y tinta» (no reinventar). Correr `impeccable detect --json src` tras cambios de UI.
- `react-expert` (`.claude/skills/react-expert`, jeffallan/claude-skills @ 67c1961): componentes, hooks, estado con Zustand, rendimiento, testing. Ignorar lo de Server Components/Next.js: esto es una SPA con Vite.
- `typescript-pro` (`.claude/skills/typescript-pro`, mismo origen): tipado estricto, type guards, utilidades.

## Stack

- React **19**, TypeScript 6, Vite 8, ESLint 10 (incluye reglas del React Compiler: nada de `setState` síncrono en efectos, nada de leer refs en render; archivos de componentes sólo exportan componentes).
- React Router **8** (`createBrowserRouter`, rutas con `lazy` = code-splitting), Zustand 5, axios, React Hook Form + Zod 4 (`{ error: '...' }` en vez de `message`), Tailwind CSS 4 (`@theme` en `src/index.css`), `lucide-react`, `@fontsource-variable/archivo`.
- Tests: Vitest 5 + jsdom + Testing Library + **MSW 3** (opción `onUnhandledFrame`, no `onUnhandledRequest`).
- `tsconfig.app.json`: `verbatimModuleSyntax` (usar `import type`), `erasableSyntaxOnly` (**no** `enum` ni parameter properties).

## Comandos

```bash
npm run dev       # http://localhost:5173 (requiere backend en VITE_API_URL, por defecto http://localhost:3000)
npm run build     # tsc -b && vite build
npm run lint
npm run format    # Prettier (.prettierrc.json: sin `;`, comillas simples, 120 columnas); format:check sólo revisa
npm test          # unit + componentes (MSW simula la API)
npm run test:cov  # umbral 80% configurado en vite.config.ts
```

## Arquitectura implementada

```
src/
├── app/            routes.tsx (rutas lazy), AppShell (barra kraft + guard de sesión), NotFound, RouteFallback
├── components/table/ TableLayout (marco común de los listados), Pagination, useStaleWhileLoading, paging (PAGE_SIZES, pageWindow), types (Paginated)
├── components/ui/  Button, Field (TextField/SelectField), Toggle, Modal (<dialog> nativo), Toaster, States, Spinner
├── config/env.ts   API_URL / API_BASE_URL / toAssetUrl
├── lib/            http/api-client (axios + interceptores), http/api-error (ApiError), cache (TTL + inflight), format (CLP), download
├── features/
│   ├── auth/       auth.service (login, me, logout), auth.store (status checking/authenticated/anonymous, sin token, bloqueo del login, expiración programada, puente con axios), LoginPage
│   ├── books/      types, query (URL ⇄ consulta, cycleSort), book.schema (Zod), api/books.service + api/catalog.service, store/books.store + store/catalog.store
│   │               (caché por clave), store/genres.store, hooks (useBookListQuery, useBooksList, useBook, useGenres,
│   │               useDebouncedFilter), components/* (BookModal, BookEditor, CatalogCombobox…), editor-state.ts, pages/BooksPage
│   └── notifications/toast.store
└── test/           setup (MSW, polyfill <dialog>), server (handlers), fixtures, render (renderApp/signIn)
```

Reglas:
- La **URL es la fuente de verdad** del listado (`useBookListQuery`); los componentes no guardan filtros propios salvo el texto en curso del debounce.
- Los componentes leen stores con **selectores** (`useBooksStore((s) => s.x)`), nunca el store completo.
- Las llamadas HTTP viven en `*.service.ts` y lanzan `ApiError`; los stores orquestan servicios y caché.
- Toda acción de escritura da feedback: estado de carga en el botón + toast de resultado.
- Tests de componentes/páginas con `renderApp(path)` (router real + MSW); es async por las rutas lazy.

## Requerimientos del proyecto

### Pantallas

1. **Login**: autenticación contra el endpoint de login del backend; el JWT devuelto se usa en todas las llamadas a endpoints de libros. Rutas privadas protegidas.
2. **Listado de libros (principal)**: tabla con
   - Filtros: título (input), género (dropdown), editorial (input), autor (input), disponibilidad (toggle).
   - Búsqueda en tiempo real con **debounce**.
   - Ordenamiento dinámico por **múltiples columnas**.
   - **Paginación del lado del servidor**.
   - Botón **exportar CSV** (generado en el servidor) aplicando los filtros activos; nombre de archivo `CMPC-LIBROS-${timestamp}` con la fecha/hora de la descarga.
3. **Formulario de creación/edición de libro**: inputs para todos los campos, **validación en tiempo real**, mensajes breves y claros de lo que falta, **carga de una imagen** por libro.
4. **Modal de detalle** de un libro.

### Estado y datos

- **Zustand** para el estado global y para cachear llamadas repetidas (evitar refetch del mismo query/página/libro).
- Una capa de servicios (cliente HTTP) separada de los componentes; los stores orquestan servicios, los componentes consumen stores con selectores (evitar re-renders innecesarios).

### UX / calidad

- **Responsive** para cualquier dispositivo (la tabla debe tener una estrategia para móvil).
- Gestión eficiente del renderizado (selectores de Zustand, memoización donde aporte, sin efectos para estado derivado).
- **Feedback constante**: indicadores de carga en lecturas y escrituras, estados vacíos y de error, confirmaciones de acciones.
- Tests unitarios para **componentes y servicios**; cobertura **≥ 80%**.

### Documentación (entregables)

- `README.md`: instalación, configuración (variables de entorno, URL de la API), requisitos, guía básica de uso, arquitectura y decisiones de diseño.

## Decisiones

> Registrar aquí cada decisión confirmada por el usuario (fecha, decisión, motivo).

Confirmadas el 2026-11-18:

1. **Estilos**: Tailwind CSS v4 (`@tailwindcss/vite`) + tokens de diseño propios + componentes propios (sin librería de componentes). Accesibilidad de modal/dropdown/toggle a cargo nuestro.
2. **Formularios**: React Hook Form + Zod (esquema espejo de los DTO del backend; validación en tiempo real; tipos inferidos del esquema).
3. **Sesión** (actualizada el 2026-11-19; antes era JWT en sessionStorage): el backend guarda el JWT en una **cookie HttpOnly de sesión**; el frontend **nunca** ve ni guarda el token. `auth.store` sólo tiene `status`, `user`, `expiresAt` y el bloqueo del login; al arrancar `restoreSession()` llama a `GET /auth/me` (mientras tanto `status: 'checking'` y `AppShell`/`LoginPage` muestran `RouteFallback`). Logout llama a `POST /auth/logout`. Cierre automático al vencer `expiresAt` o ante un 401 de una ruta no-`/auth/`. Login bloqueado (429): `lockedUntil` + cuenta atrás en `LoginPage` (`useLockCountdown`). Las cachés se descartan cuando `user` pasa a `null`.
4. **Cliente HTTP**: **axios** (instancia única con `withCredentials: true` para enviar la cookie; interceptor de response → 401 cierra sesión; `ApiError` normaliza errores y trae `retryAfter` en un 429; `AbortController`/`signal` para cancelar búsquedas obsoletas). La API y la web deben estar en el mismo sitio (`localhost` con `localhost`) por `SameSite=Strict`.
5. **Router**: React Router con rutas `/login`, `/books`, `/books/new`, `/books/:id`, `/books/:id/edit` y `/audit`. Las tres de un libro son hijas de `books` y abren un modal sobre el catálogo (ver decisión 16). Filtros, orden y página **sincronizados con la query string** (la URL es la fuente de verdad del listado).
6. **Caché Zustand**: listado por clave (filtros+orden+página) con **TTL 60 s** + stale-while-revalidate; detalle por id; géneros por sesión; deduplicación de requests en vuelo; **invalidación** tras crear/editar/eliminar/subir imagen.
7. **Testing**: Vitest + jsdom + Testing Library + **MSW** (intercepta axios a nivel de red). Cobertura ≥ 80%.
8. **Producto**: usuarios internos de CMPC que gestionan el catálogo (escritorio y móvil), UI en español, sin identidad de marca obligatoria (ver `PRODUCT.md`). La dirección visual se define con impeccable y se muestra al usuario antes de construir pantallas.

10. **Autor y editorial como catálogos** (2026-11-18): el libro recibe `author`/`publisher` como `{ id, name }` y se escribe con `authorId`/`publisherId`. El formulario usa `CatalogCombobox` (patrón ARIA 1.2): búsqueda con debounce (250 ms) cacheada en `catalog.store`, y **crear al vuelo** (`POST /authors|/publishers`, que busca o crea). Escribir tras elegir deselecciona el valor; el esquema Zod exige un registro elegido («Selecciona o crea un autor»). Los **filtros del listado siguen siendo de texto** sobre el nombre.

11. **Estabilidad visual de los listados** (2026-11-18; centralizada el 2026-11-19 en `components/table/TableLayout`): desde `lg` (1024 px) la tabla es de layout fijo (`table-layout: fixed`, `<colgroup>` a partir de `columns`), con filas de 60 px y alto de página constante (filas en blanco; esqueleto de `limit` filas; vacío/error centrados como overlay; aviso de error al refrescar; pie con la paginación o un hueco de igual alto). `useStaleWhileLoading` conserva el último resultado y lo muestra atenuado mientras llega el nuevo. Toda tabla nueva debe usar `TableLayout` y aportar sólo columnas, encabezado, filas y silueta del esqueleto. Bajo `lg` son tarjetas, sin filas en blanco. La barra bajo los filtros (Limpiar filtros / resumen del orden / Quitar orden) tiene altura reservada. Medido: CLS 0.
12. **Movimiento**: clases `motion-*` en `src/index.css` (salida exponencial, apagadas con `prefers-reduced-motion`). Las filas se animan por montaje (clave = id), así sólo entran las nuevas. `AppShell` re-anima sólo al pasar entre listado y formulario (clave `section`), no al filtrar ni al abrir el detalle.
13. **Combobox**: conserva la selección mientras se escribe y concilia al salir del campo o con Esc (texto vuelve al valor, o se quita si queda vacío); el error se oculta mientras se crea el registro y el campo usa `readOnly` (no `disabled`) para no perder el foco.

## Auditoría (pestaña «Auditoría», 2026-11-19)

Decididas con el usuario: **detalle en modal con diff** (Campo / Antes / Después; creación y baja muestran el registro completo) y filtros **acción, entidad y rango de fechas** (usuario queda fuera: hoy hay un solo usuario y haría falta un endpoint de usuarios).

- `src/features/audit/`: `query.ts` (URL ⇄ consulta: `action`, `entity`, `from`, `to`, `page`, `limit`; días `YYYY-MM-DD`, un rango invertido descarta `to`), `describe.ts` (etiquetas, `changedFields`, `summarize`; oculta `id`, `createdAt`, `updatedAt`; compara autor/editorial por id), `store/audit.store.ts`, `components/` (`AuditTable`, `AuditFilters`, `AuditDetailModal`), `pages/AuditPage.tsx`.
- **Sin TTL en la caché**: la bitácora cambia con cada operación del catálogo, así que `useAuditList` siempre revalida (stale-while-revalidate). No reutilizar el TTL de 60 s de libros.
- Misma estabilidad visual que el catálogo (tabla de layout fijo, filas de 60 px, filas en blanco, esqueleto de `limit` filas, resultado anterior atenuado). El detalle es estado local, no una ruta: la API no tiene `GET /audit-logs/:id`.
- Nueva entidad auditada en el backend → añadirla a `ENTITY_LABELS`/`AUDIT_ENTITIES` y, si tiene campos propios, a `FIELD_LABELS` en `describe.ts`.
- `AppShell`: `NAV_ITEMS` define las pestañas; `scrollbar-gutter: stable` en `html` evita que la cabecera se desplace al pasar de una pantalla con scroll a otra sin él.

## Docker

`Dockerfile` (Vite → nginx) y `nginx/` (fallback de SPA, caché de `/assets/`, cabeceras básicas). `docker-compose.yml` (servicio `web`): **independiente del backend**; `VITE_API_URL` ← `PUBLIC_API_URL` (por defecto `http://localhost:${API_PORT:-3000}`). El stack completo (carpeta padre, repo `cmpc-libros-stack`) lo incluye con `include:` y le pasa su propio `.env`. `VITE_API_URL` se fija al compilar: cambiar la URL de la API exige reconstruir la imagen. El `.env` está ignorado por git.

## Contrato con el backend (resumen)

- Base: `VITE_API_URL` (por defecto `http://localhost:3000`), prefijo `/api`. Imágenes: `${VITE_API_URL}${book.imageUrl}`.
- `POST /api/auth/login` → `{ expiresAt, user }` + cookie `cmpc_session` (HttpOnly); 429 + `retryAfter` / `Retry-After` tras 5 fallos · `GET /api/auth/me` → `{ expiresAt, user }` · `POST /api/auth/logout` (204). Detalle completo de endpoints: README del backend.
- `GET /api/books?page&limit&title&author&publisher&genreId&available&sort=campo:dir,...` → `{ data, meta: { page, limit, total, totalPages } }`. Campos ordenables: `title, author, publisher, price, stock, genre, createdAt`.
- `GET /api/books/:id`, `POST /api/books`, `PATCH /api/books/:id`, `DELETE /api/books/:id` (204), `POST /api/books/:id/image` (multipart `image`, JPEG/PNG/WebP ≤ 2 MB).
- `GET /api/books/export?<mismos filtros y sort>` → CSV; el frontend nombra el archivo `CMPC-LIBROS-${Date.now()}.csv`.
- `GET /api/genres` → `[{ id, name }]`.
- `GET /api/audit-logs?page&limit&action&entityType&from&to` → `{ data: [{ id, entityType, entityId, action: CREATE|UPDATE|DELETE, user: { id, email, name }, before, after, createdAt }], meta }`, más reciente primero. `from`/`to`: instantes ISO 8601 inclusivos; el frontend los arma desde días `YYYY-MM-DD` en hora local (00:00:00.000 y 23:59:59.999).
- Errores: `{ statusCode, message: string | string[], error }`.
- Campos en inglés: `title, author { id, name }, publisher { id, name }, price (CLP entero), stock (= disponibilidad), genre { id, name }, imageUrl`. Escritura: `authorId`, `publisherId`, `genreId`.
- `GET /api/authors|/api/publishers?search=&limit=` → `[{ id, name }]` (límite ≤ 50); `POST` `{ name }` → 201 si lo crea, 200 si ya existía (sin distinguir mayúsculas).

9. **Dirección visual: «Cartulina y tinta»** (elegida en la ronda de impeccable, seed:49d0fe904e2a6e31). Contrato completo en `.impeccable/surfaces/src-features-books-pages-bookspage-tsx.md`. Resumen: barra kraft `#B48A5A`, zona de trabajo cartulina blanca, tinta `#1E1E1C`, verde flexo `#1F6B3A` (acción primaria), rojo/ámbar sólo para estados; **Archivo** (ancho variable, autoalojada con `@fontsource-variable/archivo`) como única familia; filetes de 1 px; **línea de troquel punteada** marca lo activo (filtros con valor, fila enfocada, página actual, zona de carga de imagen); stock en rampa fija de 4 pasos; fila sin stock atenuada con sello rojo. Íconos: `lucide-react`.

14. **Prettier** (2026-11-19): `.prettierrc.json` respeta el estilo existente (sin `;`, comillas simples, `trailingComma: all`, 120 columnas); `eslint-config-prettier` al final de la config de ESLint. No formatea Markdown (`.prettierignore`). `.gitattributes` fija LF.
15. **Pruebas**: `renderApp` espera a que el router confirme la transición (`act`) antes de devolver; `test/setup.ts` deja la sesión `anonymous` antes de cada prueba (`ANONYMOUS`). El login simulado responde 429 con la contraseña `BLOCKED_PASSWORD`.

16. **Formulario en modal** (2026-11-19, decidido con el usuario): `/books/new`, `/books/:id` y `/books/:id/edit` usan el **mismo componente** `BookModal` (rutas hijas de `books` con el mismo `Component`), así que pasar del detalle a editar cambia el contenido del `<dialog>` sin cerrarlo. `BookEditor` reproduce la distribución del detalle: portada a la izquierda (en móvil, al final) y campos con `layout="inline"` (etiqueta a la izquierda, subgrid de `grid-cols-[auto_1fr]`). El botón de guardar vive en el pie del modal (`form="book-form"`); el editor informa su estado al modal con `onStateChange` (`editor-state.ts`).
    - **Volver al origen**: los enlaces pasan `state.returnTo` (`'detail'` desde el detalle, `'catalog'` desde la tabla o Nuevo libro) y guardar/cancelar hacen `navigate(-1)`; por enlace directo (sin `returnTo`) se va al catálogo con `replace`.
    - **Cambios sin guardar**: `useBlocker` (cubre Cancelar, Esc, X, clic fuera y Atrás) muestra «¿Descartar los cambios?» en un segundo modal; `useBeforeUnload` para recargar o cerrar. Tras guardar, `leaving` evita la confirmación.
    - **Foco**: `Modal` enfoca `[data-autofocus]` justo después de `showModal()` (el `autoFocus` de React llega antes, con el diálogo cerrado); al pasar del detalle a editar, `setFocus('title')`.
    - **Combobox en modal**: la lista se posiciona `fixed` con `useAnchoredPanel` (un `<dialog>` y un cuerpo con scroll recortan los `absolute`); se abre hacia arriba si no cabe abajo.
    - El catálogo queda montado bajo el modal: `useBooksList` vuelve a pedir el listado visible cuando una escritura lo invalida (`fetchedAt === 0`).

## Decisiones pendientes (consultar antes de implementar)

_Ninguna por ahora._
