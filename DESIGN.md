---
name: Mis gastos
description: Gastos e ingresos del mes, planificados semana por semana, en un tablero de bloques oscuro.
colors:
  background: "oklch(0.15 0.014 300)"
  card: "oklch(0.205 0.015 300)"
  popover: "oklch(0.23 0.015 300)"
  muted: "oklch(0.27 0.016 300)"
  foreground: "oklch(0.97 0.005 300)"
  foreground-soft: "oklch(0.83 0.012 300)"
  muted-foreground: "oklch(0.73 0.014 300)"
  border: "oklch(1 0 0 / 0.1)"
  input: "oklch(1 0 0 / 0.14)"
  primary: "oklch(0.89 0.2 128)"
  primary-hover: "oklch(0.93 0.17 128)"
  primary-foreground: "oklch(0.24 0.06 135)"
  primary-tint: "color-mix(in oklch, oklch(0.89 0.2 128) 14%, oklch(0.205 0.015 300))"
  secondary: "oklch(0.74 0.12 300)"
  secondary-foreground: "oklch(0.2 0.05 295)"
  secondary-tint: "color-mix(in oklch, oklch(0.74 0.12 300) 16%, oklch(0.205 0.015 300))"
  destructive: "oklch(0.7 0.19 22)"
  destructive-foreground: "oklch(0.98 0 0)"
typography:
  display:
    fontFamily: "Geist Mono Variable, ui-monospace, monospace"
    fontSize: "56px"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.04em"
    fontFeature: "\"tnum\" 1"
  headline:
    fontFamily: "Geist Variable, system-ui, sans-serif"
    fontSize: "2rem"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.03em"
  title:
    fontFamily: "Geist Variable, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1.4
  amount:
    fontFamily: "Geist Mono Variable, ui-monospace, monospace"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.02em"
    fontFeature: "\"tnum\" 1"
  body:
    fontFamily: "Geist Variable, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Geist Variable, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.4
  caption:
    fontFamily: "Geist Variable, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.4
rounded:
  tile: "26px"
  lg: "16px"
  md: "10px"
  sm: "6px"
  pill: "9999px"
spacing:
  grid-gap: "12px"
  tile-padding: "20px"
  tile-header: "16px"
  page-x: "48px"
  page-x-narrow: "16px"
  sidebar: "248px"
components:
  tile:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.tile}"
    padding: "{spacing.tile-padding}"
  tile-ahorro:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.tile}"
    padding: "{spacing.tile-padding}"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.pill}"
    padding: "0 18px"
    height: "42px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-secondary:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.pill}"
    padding: "0 18px"
    height: "42px"
  button-ghost:
    textColor: "{colors.foreground-soft}"
    rounded: "{rounded.pill}"
    padding: "0 18px"
    height: "42px"
  button-ghost-hover:
    backgroundColor: "{colors.muted}"
    textColor: "{colors.foreground}"
  button-destructive:
    textColor: "{colors.destructive}"
    rounded: "{rounded.pill}"
    padding: "0 18px"
    height: "42px"
  pills-option:
    textColor: "{colors.muted-foreground}"
    typography: "{typography.caption}"
    rounded: "{rounded.pill}"
    padding: "4px 12px"
  pills-option-selected:
    backgroundColor: "{colors.foreground}"
    textColor: "{colors.background}"
    rounded: "{rounded.pill}"
    padding: "4px 12px"
  insignia:
    rounded: "{rounded.pill}"
    padding: "2px 10px"
  input:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "44px"
  nav-link:
    textColor: "{colors.foreground-soft}"
    rounded: "{rounded.md}"
    padding: "9px 10px"
  nav-link-active:
    backgroundColor: "{colors.primary-tint}"
    textColor: "{colors.primary}"
    rounded: "{rounded.md}"
    padding: "9px 10px"
---

# Design System: Mis gastos

## Overview

**Creative North Star: "El tablero de noche"**

Mis gastos es un tablero de bloques oscuro que se lee de un vistazo. El fondo es casi negro con un tinte lila; encima, bloques un punto más claros, con borde de 1px y esquinas grandes, separados por un canal angosto. Cada bloque responde una sola pregunta sobre la plata del mes y la responde con una cifra grande en mono, no con un párrafo. La referencia visual fue un tablero bento oscuro que eligió Andres; de él se tomó la estructura, la densidad y el movimiento, no su contenido.

El color está racionado y tiene sentido fijo. Lima es lo principal: la acción, lo activo y lo que todavía queda. Lila es lo que se pasó. Rojo aparece solo para borrar y para errores. Todo lo demás es gris lila en tres o cuatro escalones de luz. La app es siempre oscura: Andres eligió no tener modo claro.

El movimiento es parte del sistema: los montos cuentan hasta su valor, las barras crecen desde la base y los segmentos se acomodan a su proporción, todo con una única curva de salida. Con movimiento reducido todo aparece ya en su lugar, pero el foco y el hover se siguen viendo.

**Key Characteristics:**
- Siempre oscuro, fondo y superficies teñidos hacia el lila (tono 300).
- Bloques con esquinas de 26px, borde de 1px y sin sombras.
- Lima = lo que queda y lo principal; lila = exceso; rojo = solo borrar y errores.
- Toda cifra en Geist Mono con números tabulares; la interfaz en Geist.
- Selectores, botones e insignias en píldora.
- Barras que crecen, montos que cuentan y una sola curva de salida.

## Colors

Una noche gris lila con dos acentos de sentido fijo: lima para lo que alcanza y lila para lo que se pasó.

### Primary
- **Lima** (`primary`): acción principal (botón "Cargar", "Guardar"), enlace de texto, opción activa del menú lateral, anillo de foco, el arco del medidor que muestra lo que queda, el tramo de una barra que entra en el plan y los días que quedaron debajo de su tope. Es también el único bloque de color: el de Ahorro.
- **Lima encendido** (`primary-hover`): hover del botón principal.
- **Tinta sobre lima** (`primary-foreground`): texto y controles sobre lima, incluido todo el bloque de Ahorro.
- **Tinte lima** (`primary-tint`): fondo de la opción activa del menú, de chips elegidos y del botón "Hoy" del selector de mes.

### Secondary
- **Lila** (`secondary`): exceso. La cifra cuando la semana o el mes da negativo, el tramo de la barra que se pasó de lo asignado, los días que superaron su tope, el medidor cuando ya no queda nada y la insignia "Te pasaste".
- **Tinte lila** (`secondary-tint`): fondo de los avisos suaves de exceso.
- **Tinta sobre lila** (`secondary-foreground`): texto sobre lila lleno, cuando lo hay.

### Tertiary
- **Rojo** (`destructive`): solo borrar y errores (botón de borrar, mensajes de error, aviso flotante de error). Con `destructive-foreground` como texto sobre rojo lleno.

### Neutral
- **Noche lila** (`background`): fondo de la app.
- **Bloque** (`card`): superficie de los bloques, la barra lateral, los campos y los botones secundarios.
- **Bloque alto** (`popover`): diálogos y menús.
- **Apagado** (`muted`): pista de barras y medidores, días sin gastos, fondo de hover, esqueleto de carga.
- **Tinta** (`foreground`): texto principal y aguja del medidor; también el fondo de la píldora elegida.
- **Tinta suave** (`foreground-soft`): texto de enlaces del menú, subtítulos y botones fantasma.
- **Tinta apagada** (`muted-foreground`): títulos de bloque, etiquetas, notas al pie y el símbolo `$` de los montos.
- **Borde** (`border`): el borde de 1px de cada bloque y los divisores entre filas. Los campos de Tailwind usan el un poco más visible `input`.

### Named Rules
**The Sentido Fijo Rule.** Lima significa "dentro del plan / lo que queda / lo principal", lila significa "lo que se pasó" y rojo significa "borrar o error". Un color nunca cambia de significado entre pantallas, y el rojo nunca marca un exceso.

**The Un Solo Bloque de Color Rule.** El bloque de Ahorro es el único bloque lleno de color en el tablero. Los demás son `card`; el acento vive en cifras, barras e insignias dentro de ellos.

**The Colores de Categoría Rule.** El color de cada categoría aparece solo como punto o como segmento de barra, nunca como fondo de texto ni como color de texto.

## Typography

**Display Font:** Geist Mono Variable (con ui-monospace, monospace)
**Body Font:** Geist Variable (con system-ui, sans-serif)
**Label/Mono Font:** Geist Mono Variable para toda cifra

**Character:** Geist pone una interfaz neutra y precisa; Geist Mono le da a cada monto el peso de una lectura de instrumento. Los dos vienen de la misma familia, así que conviven sin fricción.

### Hierarchy
- **Display** (600, 56px; 46px en ventana angosta; interlineado 1; -0.04em): la cifra principal del tablero ("Esta semana te quedan") y la del bloque de Ahorro (46px, -0.05em). Los montos de cierre de mes usan 40px.
- **Headline** (600, 2rem, 1.1, -0.03em): el título de cada pantalla ("Plan").
- **Title** (600, 14px): títulos de fila, como "Semana 2". Los títulos de paso ("Empezá cargando tus ingresos") van a 18px con tracking ajustado.
- **Amount** (600, 20px, -0.02em, mono): cifras secundarias dentro de un bloque. Las de las filas de semanas van a 18px; el medidor, a 26px; las listas, a 13px.
- **Body** (400, 15px, 1.5): texto corrido; los párrafos explicativos se cortan en 60 a 70ch.
- **Label** (500, 13px): título chico de cada bloque, en `muted-foreground`, en minúscula de oración.
- **Caption** (400, 12px): notas al pie de bloque, etiquetas de datos y el texto de las píldoras.

### Named Rules
**The Toda Cifra en Mono Rule.** Todo monto, porcentaje o número de día va en Geist Mono con números tabulares y sin cortes de línea. El símbolo `$` va más chico (0.55em) y apagado; el número, entero.

**The Montos Accesibles Rule.** Cuando un monto cuenta hasta su valor, el lector de pantalla lee solo el valor final, nunca los pasos de la cuenta.

**The Sin Palabras Sueltas Rule.** Párrafos y elementos de lista usan `text-wrap: pretty`; los títulos, `text-wrap: balance`.

## Layout

La estructura es una barra lateral fija de 248px a la izquierda y el contenido a la derecha, con hasta 1440px de ancho útil, centrado en el espacio que queda a la derecha de la barra, y 36px arriba y 48px a los costados. Por debajo de 900px la barra lateral pasa arriba, pegada, con la navegación en una fila que se desplaza de costado, y el contenido baja a 16px de margen. Por debajo de 560px el botón de cargar queda solo con el ícono.

El Plan es una grilla bento: una columna en ventana angosta, dos desde 640px y cuatro desde 1024px, con un canal de 12px entre bloques. Los bloques ocupan una, dos o cuatro columnas, y algunos dos filas, según cuánto tengan que mostrar. Adentro, cada bloque tiene 20px de relleno, el título chico arriba con 16px hasta el contenido, y la nota al pie empujada al fondo del bloque para que las filas queden parejas.

El encabezado de página lleva el título a la izquierda y, a la derecha, los controles que cambian toda la pantalla (el mes y "Calcular con"), no los de un solo bloque.

## Elevation & Depth

El tablero es plano. La profundidad sale del escalonado de luz: `background` abajo, `card` para los bloques y la barra lateral, `popover` para lo que flota y `muted` para pistas y hovers; el borde de 1px blanco translúcido separa cada capa. Solo lo que flota por encima de la página (diálogos y aviso flotante) lleva sombra, y el fondo del diálogo se oscurece al 60% con un desenfoque de 4px.

### Shadow Vocabulary
- **Flotante** (`box-shadow: 0 24px 60px -20px oklch(0 0 0 / 0.75), 0 0 0 1px oklch(1 0 0 / 0.06)`): diálogos de gasto, ingreso y confirmación, y el aviso flotante.

### Named Rules
**The Plano por Capas Rule.** Los bloques no llevan sombra: se separan por luz y por borde. La sombra queda reservada a lo que tapa la página.

## Shapes

Esquinas grandes en los bloques y píldora en todo lo que se toca. Los bloques usan 26px; los paneles y diálogos de las otras pantallas, también. Los botones internos de un bloque y las filas que se pueden tocar usan 16px; campos, enlaces del menú e íconos de botón, 10px. Botones, selectores, insignias, chips y el selector de mes son píldoras completas. Las barras de uso son píldoras con los extremos redondos y un hueco de 3px entre el tramo lima y el tramo lila; los segmentos de categoría usan 8px y las barras de los días 4px. El medidor es un semicírculo de trazo grueso (10px) con extremos redondos.

## Components

### Buttons
Píldoras sólidas y directas.
- **Shape:** píldora completa (9999px), 42px de alto; la variante chica, 36px.
- **Primary:** fondo lima con tinta oscura, 600, 15px, 18px a los costados. Hover a `primary-hover`.
- **Hover / Focus:** cambio de color en 120ms; foco con contorno lima de 3px separado 2px (en las piezas del tablero, anillo lima de 2px).
- **Secondary / Ghost / Destructive:** secundario en `card` con borde `border` que se aclara al hover; fantasma sin fondo que toma `muted` al hover; borrar con texto rojo y borde rojo translúcido, y su versión llena en rojo para confirmar. Los enlaces de texto ("Ver todos", "Cambiar") van en lima, 600, con subrayado al hover.
- **Dentro del bloque de Ahorro:** el botón principal se invierte (fondo tinta, texto lima), ocupa todo el ancho y usa 16px de esquina; el secundario es solo borde en tinta translúcida.

### Chips
- **Pills (selector):** grupo en píldora con borde de 1px y 2px de relleno; cada opción en 12px, 500. La elegida invierte a fondo `foreground` con texto `background`. Se recorre con flechas como un grupo de radios, con un solo Tab.
- **Insignia:** píldora de 11px, 600, con el texto en el color de estado y el fondo en ese mismo color al 18%. Lima para "En curso", lila para "Te pasaste", gris para "Terminada" o "Próxima".
- **Chips de categoría:** píldora de 38px con punto de color; elegida, borde lima y fondo `primary-tint`.

### Cards / Containers
- **Corner Style:** 26px.
- **Background:** `card`; el bloque de Ahorro, lima lleno con todo su contenido en `primary-foreground`.
- **Shadow Strategy:** ninguna (ver Elevation & Depth).
- **Border:** 1px `border`; el bloque de Ahorro no lleva borde.
- **Internal Padding:** 20px, con título chico de 13px arriba y nota al pie de 12px abajo.

### Inputs / Fields
- **Style:** 44px de alto, fondo `card`, borde de 1.5px blanco translúcido al 12% y 10px de esquina; etiqueta encima en 13px, 700, `foreground-soft`.
- **Focus:** borde lima y halo lima de 3px al 45%.
- **Error / Disabled:** ayuda y error en rojo; deshabilitado al 45% de opacidad.
- **Campo de monto:** sin caja, solo una línea de 2px abajo que se vuelve lima al enfocar; la cifra va en Geist Mono 52px, 600, alineada a la derecha.

### Navigation
- **Barra lateral:** superficie `card` con borde derecho; marca con ícono, botones de cargar gasto e ingreso con su atajo, y grupos de enlaces con nombre de grupo en 13px apagado. Enlace en `foreground-soft`, 500, con ícono de trazo; hover a `muted`; activo con fondo `primary-tint`, texto e ícono lima y 700. En ventana angosta pasa a una fila arriba.

### Tira diaria (firma)
El gesto propio del sistema. En el bloque principal, debajo de la cifra grande, una barra por día del mes, de 96px de alto y 3px entre barras. La altura es lo gastado ese día; una rayita de 2px en tinta al 45% marca lo que le tocaba. La barra es lima si quedó debajo, lila si la pasó, `muted` si no hubo gastos, y solo un contorno si el día todavía no llegó; hoy lleva un anillo fino. Al pasar el puntero o enfocar un día, los demás bajan al 30% y la línea de abajo dice el detalle. Se recorre con flechas, con un solo Tab. Las barras crecen escalonadas 14ms por día.

### Medidor semicircular
Arco de 10px: lima es lo que queda, lo usado se apaga a `muted` y una aguja en tinta marca el porcentaje. Si ya no queda nada, el arco entero pasa a lila y la cifra también.

### Barras de uso y barra de categorías
La barra de uso muestra lo gastado sobre lo asignado: lima hasta el límite y, si se pasó, un tramo lila aparte que crece después (500ms de demora). La barra de categorías es una fila de segmentos de 36px de alto con el color de cada categoría, con una lista de puntos y porcentajes en mono debajo.

### Movimiento
Una sola curva de salida, `cubic-bezier(0.22, 1, 0.36, 1)`, para todo lo que crece en el tablero: barras en 900ms, segmentos en 1000ms, montos que cuentan en 1100ms, filas de lista que suben 6px y aparecen escalonadas. Con movimiento reducido no hay cuenta ni crecimiento, pero el foco y el hover siguen.

### Pantallas
Todas las pantallas (Plan, Gastos, Ingresos, Resumen, Historial, Buscar y Categorías) están armadas con las piezas del tablero: Tile, Pills, Insignia y Cifra. Cada una abre con un bloque grande con la cifra que responde su pregunta y sigue con bloques de detalle; las listas de movimientos son filas con el punto de la categoría en un cuadrado `muted`, el texto y el monto en mono. Las tarjetas de categoría muestran su color como punto, nunca como franja.

### Lo que sigue con clases propias
La barra lateral, los botones (`.boton`), los campos y chips de los diálogos, los diálogos (`.dialogo`, centrados con `margin: auto`), los avisos y el esqueleto de carga siguen en `styles.css`, con los mismos colores del tema.

## Do's and Don'ts

### Do:
- **Do** poner cada respuesta en su propio bloque de `card` con 26px de esquina, borde de 1px y 20px de relleno, separado 12px de los demás.
- **Do** escribir toda cifra en Geist Mono tabular, con el `$` más chico y apagado.
- **Do** usar lima para lo que queda y lo principal, lila para lo que se pasó y rojo solo para borrar y errores.
- **Do** mostrar el exceso como un tramo lila aparte de lo que entró en el plan, no recolorear toda la barra.
- **Do** animar con la curva `cubic-bezier(0.22, 1, 0.36, 1)` y dejar todo en su lugar con movimiento reducido.
- **Do** hacer recorribles con flechas, con un solo Tab, los grupos de opciones y las tiras de barras.

### Don't:
- **Don't** agregar un modo claro: la app es siempre oscura.
- **Don't** usar rojo para marcar un exceso, ni lila para borrar.
- **Don't** llenar de color otro bloque además del de Ahorro.
- **Don't** usar el color de una categoría como fondo o color de texto; solo como punto o segmento.
- **Don't** poner sombras en los bloques; la sombra es solo para lo que flota.
