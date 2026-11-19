---
version: 1
slug: "src-features-books-pages-bookspage-tsx"
primary_target: "src/features/books/pages/BooksPage.tsx"
related_targets: ["src/features/books/pages/BookFormPage.tsx","src/features/auth/LoginPage.tsx"]
---

# Catálogo de libros (listado, formulario, detalle, login)

Mode: operate. Audience: personal interno de CMPC que gestiona el catálogo. Task: encontrar, revisar, crear/editar/eliminar y exportar libros. Constraints: español de Chile, CLP, responsive, WCAG 2.2 AA, feedback de carga en toda lectura/escritura.

## Direction contract

THESIS: El catálogo como un pliego de cartulina white-top: cara blanca para trabajar, kraft para el marco, tinta flexo negra. Rechaza el panel gris con acento azul y barra lateral de la categoría.

OWN-WORLD: Kraft #B48A5A solo en barra superior y tapas sin imagen; zona de trabajo blanca de cartulina; tinta #1E1E1C; verde flexo #1F6B3A para la acción primaria; rojo #C2362B y ámbar solo para estados. Archivo de ancho variable como única familia: condensada en mayúsculas para marca, títulos y etiquetas; normal para datos. Filetes de 1 px; esquinas de 2 px; sin sombras decorativas. Géneros como sello entintado (rectángulo con contorno).

STORY: El usuario entiende de inmediato qué está viendo (filtros activos marcados), encuentra un libro en segundos, ve su estado de stock sin leer números y actúa (detalle, editar, eliminar, exportar) sin perder la vista.

FIRST VIEWPORT: Barra kraft de 60 px (marca a la izquierda, usuario y salir a la derecha). Debajo, sobre cartulina: título «Catálogo» condensado a 44 px con el conteo; a la derecha «Exportar CSV» (contorno) y «Nuevo libro» (verde). Franja de 5 filtros en una fila; tabla con orden por columnas y prioridad numerada; paginación al pie.

FORM: candidato 4 de 7 (embalaje kraft/flexo con troquel). seed: seed:49d0fe904e2a6e31. Movimiento distintivo: la línea de troquel punteada marca lo activo (filtros con valor, fila enfocada, página actual, ventana de carga de imagen). Raises: el estado reestiliza la fila sin romper la grilla; rampa fija de 4 pasos para stock; portadas a escala fija; nada se etiqueta dos veces; una sola familia tipográfica.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
