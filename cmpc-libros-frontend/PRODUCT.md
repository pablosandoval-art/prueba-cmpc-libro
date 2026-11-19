# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Personal interno de CMPC que administra el catálogo de libros de la empresa. Entran a la herramienta para encontrar libros rápidamente (por título, autor, editorial, género o disponibilidad), revisar su detalle, mantener el catálogo al día (crear, editar, eliminar, cargar portadas) y exportar listados a CSV para trabajarlos fuera de la plataforma. Usan principalmente escritorio, pero también móvil y tablet.

## Product Purpose

CMPC Libros centraliza la consulta y gestión del catálogo de libros detrás de un acceso autenticado. El éxito es que un usuario encuentre y actualice un libro en segundos, sepa siempre qué está pasando (cargas, guardados, errores) y pueda sacar los datos filtrados a CSV sin fricción.

## Operating Context

- Acceso con email y contraseña; sesión por pestaña del navegador.
- Tarea principal: el listado con filtros combinables, búsqueda en tiempo real, orden por varias columnas y paginación del servidor.
- Tareas secundarias: formulario de creación/edición con validación inmediata y carga de imagen; modal de detalle; exportación CSV de los resultados filtrados.
- Toda modificación queda auditada en el servidor.

## Capabilities and Constraints

- Campos de un libro: título, autor, editorial, precio (pesos chilenos, entero), disponibilidad (unidades en stock), género (catálogo cerrado) e imagen opcional (JPEG, PNG o WebP de hasta 2 MB).
- La eliminación es lógica (soft delete): el libro desaparece del listado.
- Interfaz en español de Chile; precios en formato CLP (`$18.990`).
- Responsive para cualquier dispositivo.
- Sin roles: cualquier usuario autenticado puede hacer todo.

## Brand Commitments

Nombre del producto: "CMPC Libros". No hay logo, paleta ni tipografía corporativa obligatoria.

## Evidence on Hand

Datos de ejemplo del seed del backend: 40 libros reales de 10 géneros. No hay portadas reales cargadas; no inventar imágenes de portadas ni cifras de negocio.

## Product Principles

1. Encontrar primero: el listado y sus filtros son el centro de la herramienta.
2. Feedback constante: toda lectura o escritura muestra su estado, y los errores dicen qué hacer.
3. Precisión sobre ornamento: es una herramienta de trabajo diario; la claridad de los datos manda.
4. Mensajes breves y concretos, sobre todo en el formulario.

## Accessibility & Inclusion

Objetivo WCAG 2.2 AA: navegación completa por teclado (modal con foco atrapado y cierre con Esc), contraste suficiente y etiquetas asociadas a cada campo.
