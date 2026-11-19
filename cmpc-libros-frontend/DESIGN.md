---
name: CMPC Libros
description: Catálogo interno de libros impreso como un pliego de cartulina white-top con marco kraft y tinta flexo.
colors:
  kraft: "#b48a5a"
  kraft-deep: "#7d5b35"
  kraft-pale: "#e9dccb"
  board: "#eef0eb"
  sheet: "#ffffff"
  ink: "#1e1e1c"
  ink-2: "#45453f"
  ink-3: "#61615a"
  rule: "#cfd1ca"
  rule-soft: "#e3e5df"
  field: "#8a8c85"
  flexo: "#1f6b3a"
  flexo-deep: "#16502b"
  flexo-pale: "#e3efe6"
  alert: "#c2362b"
  alert-pale: "#fbeae8"
  amber: "#8a5600"
  amber-bar: "#c98318"
typography:
  display:
    fontFamily: "Archivo Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2.75rem"
    fontWeight: 850
    lineHeight: 1
    letterSpacing: "-0.005em"
    fontVariation: "'wdth' 68"
  headline:
    fontFamily: "Archivo Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 850
    lineHeight: 1
    letterSpacing: "-0.005em"
    fontVariation: "'wdth' 68"
  title:
    fontFamily: "Archivo Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 650
    lineHeight: 1.5
  body:
    fontFamily: "Archivo Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: "'tnum' 1"
  label:
    fontFamily: "Archivo Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 700
    letterSpacing: "0.1em"
    fontVariation: "'wdth' 80"
  stamp:
    fontFamily: "Archivo Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 750
    letterSpacing: "0.08em"
    fontVariation: "'wdth' 72"
  button:
    fontFamily: "Archivo Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
rounded:
  sheet: "2px"
  pill: "9999px"
spacing:
  label-gap: "6px"
  action-gap: "10px"
  field-gap: "12px"
  cell-x: "14px"
  gutter-mobile: "16px"
  panel-sm: "20px"
  modal: "24px"
  gutter-desktop: "32px"
components:
  button-primary:
    backgroundColor: "{colors.flexo}"
    textColor: "{colors.sheet}"
    typography: "{typography.button}"
    rounded: "{rounded.sheet}"
    padding: "0 16px"
    height: "40px"
  button-primary-hover:
    backgroundColor: "{colors.flexo-deep}"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.sheet}"
    padding: "0 16px"
    height: "40px"
  button-outline-hover:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.sheet}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.sheet}"
    padding: "0 12px"
    height: "32px"
  button-danger:
    backgroundColor: "{colors.alert}"
    textColor: "{colors.sheet}"
    typography: "{typography.button}"
    rounded: "{rounded.sheet}"
    padding: "0 16px"
    height: "40px"
  input-field:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.sheet}"
    padding: "0 12px"
    height: "40px"
  genre-stamp:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.stamp}"
    padding: "2px 6px"
  top-bar:
    backgroundColor: "{colors.kraft}"
    textColor: "{colors.ink}"
    height: "60px"
  sheet-panel:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sheet}"
  pagination-page:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.sheet}"
    height: "36px"
    width: "36px"
---

# Design System: CMPC Libros

## Overview

**Creative North Star: "Cartulina y tinta"**

La herramienta se imprime como un pliego de embalaje: una cara blanca de cartulina white-top donde se trabaja, un marco kraft que la sostiene, y tinta flexo negra para todo lo que se lee. El verde flexo marca la única acción primaria por vista; el rojo y el ámbar aparecen sólo cuando hay un estado que comunicar. No hay gradientes, ni vidrio, ni sombras de adorno: la profundidad la dan filetes de 1 px y el cambio de material (kraft, board, sheet).

El gesto distintivo viene del troquel: una línea punteada de 1,5 px marca lo que está activo (un filtro con valor, la columna que ordena, la página actual, la fila con foco, la ventana de carga de portada) y también el foco de teclado. Una sola familia, Archivo de ancho variable, hace de voz condensada en mayúsculas para marca, títulos y etiquetas, y de texto normal con cifras tabulares para los datos. La densidad es de herramienta de trabajo: filas de 60 px, controles de 40 px, nada que decore sin informar.

El sistema rechaza el panel gris con acento azul y barra lateral propio de la categoría de admin.

**Key Characteristics:**
- Tres materiales: kraft (marco), board (mesa), sheet (zona de trabajo).
- Tinta casi negra (#1e1e1c) para texto, contornos de botón y sellos.
- Línea de troquel punteada como único marcador de estado activo y de foco.
- Archivo Variable condensada (wdth 68, peso 850) para títulos; normal para datos.
- Esquinas de 2 px, filetes de 1 px, bordes de control de 1,5 px.
- Color de estado sólo para estado: verde = acción/éxito, rojo = error/sin stock, ámbar = stock bajo.

## Colors

Paleta de embalaje: papel kraft, cartulina blanca, tinta flexo negra y verde, con rojo y ámbar reservados a estados.

### Primary
- **Verde Flexo** (`flexo`): la acción primaria de cada vista («Nuevo libro», «Guardar»), el interruptor encendido, la barra de progreso de recarga y el borde del toast de éxito.
- **Verde Flexo Profundo** (`flexo-deep`): hover de la acción primaria y texto del toast de éxito.
- **Verde Flexo Pálido** (`flexo-pale`): fondo de la ventana de portada mientras se arrastra un archivo encima.

### Secondary
- **Kraft** (`kraft`): la barra superior de 60 px, el panel de marca del login y las tapas sin imagen. Nunca como fondo de la zona de trabajo.
- **Kraft Tostado** (`kraft-deep`): filete inferior de la barra kraft y hover del enlace de navegación.
- **Kraft Pálido** (`kraft-pale`): color de selección de texto.

### Tertiary
- **Rojo Imprenta** (`alert`): errores de campo, alertas, botón de eliminar, sello «Sin stock», hover del icono de papelera.
- **Rojo Pálido** (`alert-pale`): fondo de alertas de error y hover de la papelera.
- **Ámbar de Texto** (`amber`): cifra de stock bajo. Es una adaptación de contraste: el ámbar de la rampa no alcanza AA como texto sobre blanco, así que el texto usa este tono oscurecido.
- **Ámbar de Barra** (`amber-bar`): sólo el primer peldaño de la rampa de stock cuando el nivel es bajo. Nunca como texto.

### Neutral
- **Tinta Flexo** (`ink`): texto principal, contornos de botón y sello, filete grueso bajo la cabecera de tabla, línea de troquel.
- **Tinta Media** (`ink-2`): etiquetas de campo, encabezados de columna inactivos, texto secundario.
- **Tinta Clara** (`ink-3`): hints, placeholders, filas sin stock atenuadas.
- **Cartulina** (`sheet`): superficie de trabajo: tabla, formulario, modal, toasts, controles.
- **Mesa** (`board`): fondo de página bajo el pliego, pie de modal, hover de iconos.
- **Filete** (`rule`): bordes de panel, divisores de modal, peldaños vacíos de la rampa.
- **Filete Suave** (`rule-soft`): separadores entre filas, esqueletos de carga, tapas atenuadas.
- **Borde de Control** (`field`): borde en reposo de inputs y selects; interruptor apagado.

### Named Rules
**The State-Only Color Rule.** Rojo y ámbar existen sólo para comunicar estado (error, sin stock, stock bajo). Nunca decoran.

**The One Green Rule.** El verde flexo marca una sola acción primaria por vista; las demás acciones son de contorno o fantasma.

**The Kraft Frame Rule.** El kraft enmarca (barra, panel de login, tapa sin imagen); la zona de trabajo siempre es cartulina blanca sobre mesa.

## Typography

**Display Font:** Archivo Variable, eje de ancho (con ui-sans-serif, system-ui)
**Body Font:** Archivo Variable (misma familia)
**Label/Mono Font:** Archivo Variable a ancho 80 o 72, en mayúsculas

**Character:** Una sola familia hace las dos voces: condensada y pesada para nombrar (marca, títulos, etiquetas, sellos), de ancho normal para los datos. Las cifras son tabulares en todo el documento para que precios y stock se alineen.

### Hierarchy
- **Display** (850, 44px escritorio / 40px móvil, line-height 1, wdth 68): títulos de página («Catálogo», «Nuevo libro»). En el panel kraft del login sube a 64px con line-height 0.92.
- **Headline** (850, 28px, wdth 68): títulos de modal; 36px en la tarjeta de login; 24px en el estado vacío y en la tapa kraft grande.
- **Title** (650, 15px): título del libro en cada fila, como enlace.
- **Body** (400, 15px, tabular): datos de tabla, descripciones, valores de detalle. Los mensajes de ayuda y error bajan a 13px.
- **Label** (700, 11px, tracking 0.1em, mayúsculas, wdth 80): etiquetas de campo, encabezados de columna, términos de la ficha de detalle, navegación (a 13px).
- **Stamp** (750, 11px, tracking 0.08em, mayúsculas, wdth 72): texto dentro de sellos de género y «Sin stock».
- **Button** (600, 14px; 13px en tamaño pequeño).

### Named Rules
**The One Family Rule.** Archivo Variable es la única familia. La jerarquía se construye con ancho y peso, no con una segunda fuente.

**The Label Once Rule.** Nada se etiqueta dos veces: la miniatura de portada no repite el título que ya está en la fila.

## Layout

Contenedor centrado de hasta 1440px, con márgenes laterales de 16px en móvil y 32px desde `md` (768px). La zona principal tiene 28px de aire vertical. La página es una pila: cabecera (título + conteo a la izquierda, acciones a la derecha), franja de filtros, y un único panel de cartulina con la tabla y la paginación al pie.

Los filtros forman una grilla de cinco columnas en `lg` (1.6fr 1.2fr 1.2fr 1fr auto), dos en `sm` y una en móvil, con 12px de separación. En móvil sólo el título queda a la vista; el resto se pliega tras «Más filtros (n)».

La tabla es una tabla real en escritorio (filas de 60px, celdas con 14px de padding horizontal) y en móvil cada fila se vuelve una grilla de tres columnas (portada | título, autor, sello | precio, stock, acciones) sin perder la semántica. El formulario usa dos columnas de campos más una columna fija de 240px para la portada; el detalle usa 200px de portada y una lista de definiciones. El login divide la pantalla 5:6 entre panel kraft y mesa; en móvil el kraft se reduce a la barra de 60px.

El ritmo usa la escala de 4px de Tailwind: 6px entre etiqueta y control, 10px entre botones de acción, 20/32px de padding de panel, 24px en modales.

## Elevation & Depth

Sistema plano. La profundidad se transmite por material (kraft sobre cartulina sobre mesa) y por filetes de 1px, no por sombras. El modal se separa con un borde de tinta y un velo de tinta al 55% sobre el fondo.

### Shadow Vocabulary
- **Toast flotante** (`box-shadow: 0 8px 24px -12px rgb(30 30 28 / 0.45)`): sólo para notificaciones que flotan sobre el contenido. Es la única sombra del sistema y es funcional, no decorativa.

### Named Rules
**The Flat Sheet Rule.** Ninguna superficie en reposo lleva sombra. Si algo necesita separarse, se le da un filete o un cambio de material.

## Shapes

Esquinas casi rectas de 2px (`sheet`) en todo: botones, controles, paneles, modal, paginación, ventana de portada. La única forma redonda es el interruptor (pista y perilla en píldora). Los sellos de género son rectángulos sin radio con contorno de 1,5px, como un timbre entintado. Las portadas tienen proporción fija 3:4 (33×44px en la fila, hasta 208px de ancho en el detalle). Los bordes son de dos grosores: 1px para filetes y contenedores, 1,5px para lo que se toca o se marca (botones, controles en estado, sellos, troquel).

### Named Rules
**The Die-Line Rule.** Lo activo se marca con una línea punteada de tinta de 1,5px (borde o contorno interior a −4px); el foco de teclado es la misma línea a 2px con 2px de separación. Ningún otro recurso (relleno de color, subrayado, glow) marca selección.

## Components

### Buttons
Rectangulares, firmes, de imprenta.
- **Shape:** esquinas de 2px, borde de 1,5px, alto 40px (32px en tamaño pequeño).
- **Primary:** verde flexo con texto blanco, 16px de padding horizontal.
- **Hover / Focus:** el primario oscurece a flexo profundo; el de contorno se invierte (fondo tinta, texto blanco); transición de color de 150ms. El foco es la línea de troquel global.
- **Outline (por defecto):** transparente con contorno y texto de tinta. Es la variante por defecto de todo botón.
- **Ghost:** sin borde visible; en hover aparece un filete. Para acciones terciarias como «Limpiar filtros».
- **Danger:** rojo imprenta con texto blanco, sólo para confirmar una eliminación.
- **Loading / Disabled:** el icono se reemplaza por un spinner; deshabilitado al 55% de opacidad.
- **Icon buttons:** cuadros de 32px sin borde, tinta media; hover sobre mesa (rojo pálido para eliminar).

### Chips (Sellos)
- **Style:** el género se imprime como sello: rectángulo sin radio, contorno de tinta de 1,5px, tipografía Stamp. Atenuado (tinta clara) en filas sin stock.
- **State:** «Sin stock» usa el mismo sello en rojo imprenta, en lugar de la rampa.

### Cards / Containers
- **Corner Style:** 2px.
- **Background:** cartulina sobre mesa.
- **Shadow Strategy:** ninguna (ver Elevation & Depth).
- **Border:** filete de 1px (`rule`).
- **Internal Padding:** 20px móvil / 32px escritorio en formularios y login; la tabla va a sangre dentro del panel.

### Inputs / Fields
- **Style:** cartulina, borde de 1px `field`, 40px de alto, 12px de padding, texto de 15px; etiqueta Label encima a 6px.
- **Focus:** hover oscurece el borde a tinta; el foco usa la línea de troquel global.
- **Active (filtro con valor):** el borde pasa a línea de troquel de 1,5px.
- **Error / Disabled:** borde rojo de 1,5px con mensaje de 13px e icono de alerta; deshabilitado sobre mesa con texto tinta clara.

### Navigation
- **Barra superior:** kraft, 60px, filete inferior kraft tostado. Marca «CMPC LIBROS» en Display a 22–24px (con «LIBROS» en peso normal). Enlaces en Label a 13px con subrayado inferior de 3px en tinta cuando están activos y en kraft tostado en hover. A la derecha, nombre y email y un botón «Salir» de contorno que se invierte a tinta sobre kraft.
- **Paginación:** cuadros de 36px con filete; la página actual con línea de troquel; flechas al 40% cuando no aplican.

### Rampa de stock (signature)
Cuatro barras de 6×14px separadas 2px, seguidas de la cifra. Los peldaños llenos son tinta; los vacíos, filete. En nivel bajo (1) el único peldaño lleno es ámbar de barra y la cifra va en ámbar de texto. En cero se reemplaza por el sello rojo «Sin stock» y la fila entera se atenúa (tapa en gris, sello en tinta clara).

### Tapa kraft (signature)
Cuando un libro no tiene imagen se imprime una tapa kraft 3:4. En el detalle lleva el título en Display de 24px apoyado abajo; en la fila es una tapa lisa. Las portadas subidas llevan filete de 1px y, sin stock, van en escala de grises al 50%.

### Ventana de portada
Ventana troquelada 3:4 de hasta 240px: línea de troquel, cartulina, icono y botón de contorno; se tiñe de flexo pálido al arrastrar y su borde pasa a rojo con error.

### Modal
Sobre `<dialog>` nativo: cartulina, borde de tinta de 1px, 2px de radio; cabecera con título Headline y filete, pie sobre mesa con las acciones a la derecha. Entra con un desplazamiento de 12px en 220ms (`cubic-bezier(0.16, 1, 0.3, 1)`), sólo si el usuario no pidió reducir movimiento.

### Movimiento y estabilidad

- **Estabilidad primero.** Desde 1024px el listado es una tabla de layout fijo: anchos de columna fijos, filas de 60px y el alto de una página completa (filas en blanco si hay menos resultados). Filtrar, ordenar o paginar nunca reacomoda columnas ni cambia el alto; mientras llega un resultado nuevo se ve el anterior, atenuado.
- **Entradas, no adornos.** Curva de salida exponencial (`cubic-bezier(0.16, 1, 0.3, 1)`) en 140–280ms: las filas nuevas entran en cascada corta (18ms entre una y otra, las 12 primeras), la pantalla entra con 8px de desplazamiento al pasar del listado al formulario, y el panel del combobox, las notificaciones y los avisos bajo los filtros aparecen con una entrada suave. Los cambios de color son de 150ms.
- Todo se apaga con `prefers-reduced-motion: reduce`.

## Do's and Don'ts

### Do:
- **Do** marcar todo estado activo (filtro con valor, orden de columna, página actual, fila con foco) con la línea de troquel punteada de tinta de 1,5px.
- **Do** usar una sola acción verde flexo por vista; el resto, contorno o fantasma.
- **Do** usar `amber` (#8a5600) para texto de stock bajo y `amber-bar` (#c98318) sólo para el peldaño de la rampa.
- **Do** construir jerarquía con el eje de ancho de Archivo Variable (68 para títulos, 80 para etiquetas, 72 para sellos) y cifras tabulares para datos.
- **Do** imprimir una tapa kraft cuando falte la portada, a proporción fija 3:4.
- **Do** mantener 2px de radio y filetes de 1px en toda superficie nueva.

### Don't:
- **Don't** usar el panel gris con acento azul y barra lateral típico de los admin.
- **Don't** poner sombras en superficies en reposo; la única sombra es la del toast flotante.
- **Don't** usar rojo o ámbar como decoración, ni el kraft como fondo de la zona de trabajo.
- **Don't** introducir una segunda familia tipográfica.
- **Don't** repetir una etiqueta que ya se lee en el contexto (la miniatura no repite el título de la fila).
- **Don't** inventar portadas ni imágenes de producto; las portadas son subidas del usuario o la tapa kraft.
