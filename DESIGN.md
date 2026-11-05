---
name: Mis gastos
description: Gastos e ingresos del mes, planificados semana por semana, con estética de billetera.
colors:
  papel: "#edf0ea"
  superficie: "#ffffff"
  superficie-2: "#f5f7f3"
  tinta: "#16211c"
  tinta-2: "#4b5a53"
  tinta-3: "#5e6a64"
  linea: "#d6ddd7"
  linea-suave: "#e6ebe6"
  billete: "#1d5a48"
  billete-hover: "#174a3b"
  billete-tinte: "#e1ede6"
  billete-texto: "#ffffff"
  laton: "#c3922a"
  laton-tinte: "#f6ecd2"
  positivo: "#1e7a52"
  alerta: "#b4432f"
  alerta-tinte: "#f7e4df"
  alerta-en-billete: "#ffb4a2"
  tarjeta-billete: "#18493b"
  tarjeta-billete-2: "#123a2f"
  tarjeta-texto: "#f1f6f2"
  tarjeta-texto-2: "#b9d2c6"
  serie-ingresos: "#2a78d6"
  serie-gastos: "#eb6834"
typography:
  display:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "clamp(3.5rem, 8vw, 5.25rem)"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.01em"
    fontFeature: "tnum"
  cifra:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 600
    lineHeight: 1.1
    fontFeature: "tnum"
  headline:
    fontFamily: "Schibsted Grotesk, system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Schibsted Grotesk, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 700
    lineHeight: 1.5
  body:
    fontFamily: "Schibsted Grotesk, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Schibsted Grotesk, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 700
    lineHeight: 1.5
rounded:
  chico: "8px"
  medio: "12px"
  grande: "18px"
  billete: "22px"
  pildora: "999px"
components:
  boton-primario:
    backgroundColor: "{colors.billete}"
    textColor: "{colors.billete-texto}"
    typography: "{typography.body}"
    rounded: "{rounded.chico}"
    padding: "0 18px"
    height: "42px"
  boton-primario-hover:
    backgroundColor: "{colors.billete-hover}"
    textColor: "{colors.billete-texto}"
  boton-secundario:
    backgroundColor: "{colors.superficie}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.chico}"
    padding: "0 18px"
    height: "42px"
  boton-fantasma:
    backgroundColor: "transparent"
    textColor: "{colors.tinta-2}"
    rounded: "{rounded.chico}"
    padding: "0 18px"
    height: "42px"
  boton-fantasma-hover:
    backgroundColor: "{colors.superficie-2}"
    textColor: "{colors.tinta}"
  boton-peligro:
    backgroundColor: "transparent"
    textColor: "{colors.alerta}"
    rounded: "{rounded.chico}"
    padding: "0 18px"
    height: "42px"
  boton-peligro-hover:
    backgroundColor: "{colors.alerta-tinte}"
    textColor: "{colors.alerta}"
  campo:
    backgroundColor: "{colors.superficie}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.chico}"
    padding: "0 12px"
    height: "44px"
  chip:
    backgroundColor: "{colors.superficie}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.pildora}"
    padding: "0 14px"
    height: "38px"
  chip-activo:
    backgroundColor: "{colors.billete-tinte}"
    textColor: "{colors.billete}"
  etiqueta-en-curso:
    backgroundColor: "{colors.billete}"
    textColor: "{colors.billete-texto}"
    rounded: "{rounded.pildora}"
    padding: "2px 10px"
  etiqueta-obligatoria:
    backgroundColor: "{colors.laton-tinte}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.pildora}"
    padding: "2px 10px"
  enlace-lateral-activo:
    backgroundColor: "{colors.billete-tinte}"
    textColor: "{colors.billete}"
    rounded: "{rounded.chico}"
    padding: "9px 10px"
  panel:
    backgroundColor: "{colors.superficie}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.grande}"
    padding: "20px 22px"
  tarjeta-billete:
    backgroundColor: "{colors.tarjeta-billete}"
    textColor: "{colors.tarjeta-texto}"
    rounded: "{rounded.billete}"
    padding: "28px 32px"
---

# Design System: Mis gastos

## Overview

**Creative North Star: "La billetera"**

La app se ve como plata de verdad, cuidada y a mano: papel verde grisáceo de fondo, verde billete como color principal, latón para resaltar, y montos en letra condensada con cifras parejas, como en un ticket. Es una herramienta de uso diario, sobria y prolija: la calma es la regla, y solo hablan fuerte las dos cosas que importan, **cuánto queda** y **si me paso**.

La densidad es media. Cada pantalla abre con un titular grande, sea un monto o la tarjeta billete, y debajo vienen paneles blancos con borde fino sobre el papel. El único adorno de toda la app es el grabado de billete (guilloche) de la tarjeta principal del Plan. Todo lo demás es tipografía, línea y color de categoría.

Hay modo claro y oscuro, que sigue al sistema. En oscuro el papel pasa a casi negro verdoso, el verde billete se vuelve un verde menta claro con texto oscuro encima, y la tarjeta billete sigue siendo oscura. Los valores oscuros viven en `frontend/src/styles.css`, dentro de `@media (prefers-color-scheme: dark)`.

Hay dos cosas que Andres no quiere: **que parezca un banco** (nada de home banking ni look corporativo) y **que se vea apagado** (nada de grises chatos ni pantallas sin vida).

**Key Characteristics:**
- Papel verde grisáceo, paneles blancos, bordes finos y sin sombras en reposo.
- Montos siempre en Barlow Condensed con cifras tabulares. El símbolo de la moneda va más chico y suave.
- Verde billete para la acción principal y lo activo. Latón para el foco y para lo que hay que decidir.
- Rojo terracota solo para el exceso, los errores y las acciones de borrar.
- Una sola pieza con adorno: la tarjeta billete del Plan.

## Colors

La paleta es la de un billete: verdes profundos, latón y neutros que siempre tiran a verde.

### Primary
- **Verde billete** (`billete`): la acción principal ("Nuevo gasto", "Guardar"), el enlace activo del menú, la semana en curso, el borde del campo con foco y las barras de avance. Al pasar el mouse se oscurece a `billete-hover`. Su tinte suave (`billete-tinte`) es el fondo de lo seleccionado: enlace activo, chip elegido, botón "Hoy".
- **Billete de fondo** (`tarjeta-billete` → `tarjeta-billete-2`): un degradé de 135° reservado para la tarjeta principal del Plan, con texto `tarjeta-texto` y datos secundarios en `tarjeta-texto-2`.

### Secondary
- **Latón** (`laton`): el anillo de foco de teclado, el halo de los campos con foco, la barra de lo gastado dentro de la tarjeta billete y el ícono de los avisos flotantes. Su tinte (`laton-tinte`) es el fondo de la tarjeta de decisión ("¿ahorrar o repartir?") y de la etiqueta "Obligatoria".

### Tertiary
- **Verde positivo** (`positivo`): saldos a favor, ingresos y el punto de los movimientos de ingreso.
- **Terracota alerta** (`alerta`, tinte `alerta-tinte`): el exceso del plan, las semanas pasadas, los errores, la comparación "subió" y los botones de borrar. Sobre la tarjeta billete se usa la versión clara `alerta-en-billete`.
- **Series del historial** (`serie-ingresos` azul, `serie-gastos` naranja): solo en los gráficos del Historial, elegidas para que se distingan con daltonismo.
- **Colores de categoría:** los elige Andres de una paleta fija y aparecen como punto, tramo de la regla o franja lateral de la tarjeta de categoría. Nunca como fondo de texto.

### Neutral
- **Papel** (`papel`): el fondo de la página.
- **Superficie** (`superficie`, `superficie-2`): paneles, diálogos y barra lateral en blanco, y `superficie-2` para hover y fondos internos.
- **Tinta** (`tinta`, `tinta-2`, `tinta-3`): texto principal, texto secundario (subtítulos, ayudas) y texto terciario (fechas, rótulos, íconos en reposo).
- **Línea** (`linea`, `linea-suave`): bordes de paneles y campos, y separadores entre filas.

### Named Rules
**La regla de los neutros verdes.** Ningún neutro es gris puro: papel, tinta y línea llevan siempre un tono verde. Es lo que evita que la app se vea apagada.

**La regla del rojo justificado.** El terracota aparece solo cuando hay un exceso, un error o una acción destructiva. Si algo está en rojo, Andres tiene que hacer algo.

**La regla del latón como señal.** El latón marca foco y decisión. No se usa como color de texto sobre el papel, porque no tiene contraste suficiente.

## Typography

**Fuente de cifras:** Barlow Condensed (con Arial Narrow), pesos 500 y 600.
**Fuente de interfaz:** Schibsted Grotesk (con system-ui), pesos 400, 500 y 700.

**Carácter:** una grotesca firme y legible para todo el texto, y una condensada de ticket para la plata. La condensada hace que los montos grandes entren y que las columnas de números queden alineadas.

Las dos se cargan locales con `@fontsource`, sin pedir nada a internet.

### Hierarchy
- **Display** (Barlow Condensed 600, `clamp(3.5rem, 8vw, 5.25rem)`, interlineado 1): el monto protagonista, "te queda" en la tarjeta billete. En Gastos e Ingresos el titular usa la misma letra un poco más chica (`clamp(3.25rem, 7vw, 4.75rem)`).
- **Cifra** (Barlow Condensed 600, 1.875rem): los datos clave en celdas, las cifras de cada semana (1.5rem) y los montos de filas y rankings (1.125–1.375rem, peso 500).
- **Headline** (Schibsted 700, 1.75rem, -0.01em): el título de cada página.
- **Title** (Schibsted 700, 1.0625rem): títulos de panel, tarjeta, diálogo (1.1875rem) y sección (1.125rem).
- **Body** (Schibsted 400/500, 0.9375rem, interlineado 1.5): todo el texto corrido. Las ayudas largas se cortan en 60ch.
- **Label** (Schibsted 700, 0.8125rem): etiquetas de campo. Los rótulos y fechas usan el mismo tamaño en peso 400–500 y color `tinta-3`. No se usan mayúsculas sostenidas.

### Named Rules
**La regla de las cifras.** Todo monto se muestra con el componente `Monto`: Barlow Condensed, cifras tabulares, sin cortes de línea, formato argentino (`1.234.567,50`) y el símbolo `$` o `US$` al 62 % del tamaño y con 70 % de opacidad. El texto que no es plata nunca va en condensada, salvo el nombre "Mis gastos" en la barra lateral.

## Layout

- **Estructura:** barra lateral fija de 248px a la izquierda y contenido a la derecha, con un máximo de 920px de lectura más el relleno (36px arriba, 48px a los costados, 96px abajo).
- **Ritmo:** el espaciado no usa una escala de tokens, pero se repite:
  - 8–14px entre controles hermanos.
  - 20px entre paneles.
  - 28–36px entre secciones y debajo del encabezado.
  - 20–22px de relleno interno en paneles y tarjetas.
- **Grillas que se acomodan solas:**
  - Celdas de cifras: de 170px mínimo.
  - Semanas: de 300px.
  - Tarjetas de categoría: de 220px.
  - El Plan pasa de dos columnas de paneles a una por debajo de 1100px.
- **Ventana angosta:**
  - **900px o menos:** la barra lateral pasa a ser una franja arriba, con la marca, los botones de nuevo gasto o ingreso a la derecha y los enlaces en una fila que se desliza de costado. El contenido queda con 16px de margen lateral.
  - **760px o menos:** la tarjeta billete apila sus datos debajo del monto y los filtros de Buscar pasan a dos columnas.
  - **560px o menos:** los botones de nuevo gasto o ingreso quedan solo con el ícono.

## Elevation & Depth

El sistema es plano: la profundidad sale del contraste entre el papel y los paneles blancos con borde fino, no de sombras. Las sombras aparecen solo en lo que flota sobre la página.

### Shadow Vocabulary
- **Flotante** (`--sombra-flotante`): diálogos, avisos flotantes y el cartel del gráfico. En oscuro se vuelve más densa.
- **Opción elegida** (`0 1px 2px rgb(0 0 0 / 0.12), 0 0 0 1px var(--linea)`): la opción marcada de un control segmentado, que se levanta apenas.

### Named Rules
**La regla de lo plano en reposo.** Paneles, tarjetas, semanas y filas no llevan sombra. Si algo necesita destacarse, cambia el borde (verde billete en la semana en curso, latón en la decisión), no la elevación.

## Shapes

Las esquinas son suaves y van de menor a mayor según el tamaño de la pieza:
- **8px:** botones, campos, enlaces del menú y filas con hover.
- **12px:** selector de mes, tarjetas de categoría, avisos y buscador.
- **18px:** paneles, semanas, diálogos y estados vacíos.
- **22px:** solo la tarjeta billete.

Chips, etiquetas y sugerencias son píldoras. Los puntos de categoría y los colores de la paleta son círculos.

Los bordes miden 1px en paneles y 1.5px en controles y tarjetas de acción. La línea punteada se reserva para lo que todavía no existe o es opcional: estados vacíos, sugerencias y el aviso de fin de mes.

## Components

### Buttons
Firmes y sin estridencias: el color dice qué tan importante es la acción.
- **Forma:** esquinas de 8px, 42px de alto (36px en la versión chica), relleno lateral de 18px, peso 700.
- **Primario:** verde billete con texto blanco. Hay uno por contexto: "Nuevo gasto" en la barra lateral, "Guardar" en el diálogo.
- **Secundario:** blanco con borde `linea`. Al pasar el mouse el borde se oscurece a `tinta-3`.
- **Fantasma:** transparente con texto `tinta-2` y fondo `superficie-2` al pasar el mouse. Se usa para "Cancelar".
- **Peligro:** texto terracota con borde terracota al 45 % y tinte al pasar el mouse. La versión llena, terracota con texto blanco, va solo en la confirmación final de borrar.
- **Botón texto:** verde billete sin fondo, subrayado al pasar el mouse, para acciones secundarias dentro de un texto.
- **Botón ícono:** 36×36, transparente.
- **Foco:** anillo de latón de 3px con 2px de separación. La transición es de 120ms, solo de color, y se desactiva con movimiento reducido.
- **Atajos:** "Nuevo gasto" y "Nuevo ingreso" muestran su tecla (N, I) en una cajita al 80 % de opacidad con borde suave, alineada a la derecha.

### Chips
- **Estilo:** píldora blanca de 38px con borde `linea` de 1.5px y, para las categorías, un punto de color de 10px.
- **Estado:** elegido es borde y texto verde billete sobre `billete-tinte`, en negrita. La versión compacta mide 32px. Las sugerencias son píldoras más chicas con borde punteado.

### Segmented control
Una cápsula `superficie-2` con opciones de texto en negrita. La opción marcada se vuelve blanca y se levanta con la sombra de opción elegida. Sirve para pesos o dólares, "todo el mes o por semanas" y filtros cortos.

### Cards / Containers
- **Panel:** blanco, 18px de esquina, borde de 1px `linea` y relleno de 20–22px. El título va arriba y un pie opcional queda separado por `linea-suave`.
- **Tarjeta de acción:** igual que el panel pero con borde de 1.5px. La variante **paso** tiene borde verde billete. La variante **decisión** tiene borde latón y fondo `laton-tinte`.
- **Celdas de cifras:** una grilla de celdas unidas dentro de un mismo borde, separadas por líneas de 1px. Arriba va el rótulo chico y debajo el monto en condensada 1.875rem.
- **Estado vacío:** borde punteado de 1.5px, título, texto de hasta 60ch y acciones.

### Inputs / Fields
- **Estilo:** 44px de alto, borde `linea` de 1.5px, 8px de esquina, fondo blanco y etiqueta en label 700 encima.
- **Foco:** el borde pasa a verde billete y aparece un halo de latón al 45 % de 3px.
- **Campo de monto:** sin caja. Es un número grande en condensada de 3.25rem alineado a la derecha, sobre una línea inferior de 2px que se pone verde billete con el foco.
- **Error:** texto terracota de peso 500 debajo del campo.

### Navigation
- **Barra lateral:** blanca, con la marca arriba (ícono más "Mis gastos" en condensada), los dos botones de alta y tres grupos ("Este mes", "Análisis", "Ajustes"). Cada grupo tiene su nombre en `tinta-3` y enlaces con ícono de trazo de 20px.
- **Estados:** en reposo `tinta-2`. Con el mouse encima, fondo `superficie-2`. Activo, fondo `billete-tinte` con texto e ícono verde billete, peso 700 y trazo más grueso.
- **Ventana angosta:** ver Layout.

### Tarjeta billete (signature)
Es el corazón del Plan: un billete oscuro con degradé, el grabado guilloche en blanco al 7,5 % de opacidad, el monto disponible en Display y una barra de 8px que se llena en latón (o en `alerta-en-billete` si hay exceso). A la derecha lleva una columna de datos separada por una línea translúcida. Aparece una sola vez en toda la app.

### Semanas
Una tarjeta por semana del plan con tres cifras (asignado, gastado, queda) y una barra de 6px. La semana en curso lleva borde de 2px verde billete y la etiqueta "En curso". Las semanas terminadas pierden el fondo blanco. Una semana excedida pone la barra y la cifra negativa en terracota.

### Libro de movimientos
Los gastos e ingresos se agrupan por día. Cada día tiene un encabezado con la fecha y el total, y cada movimiento es una fila con:
- un punto de color de categoría;
- la descripción, cortada con puntos suspensivos si no entra;
- la categoría o fecha debajo, en `tinta-3`;
- el monto a la derecha en condensada.

Al pasar el mouse, la fila se vuelve blanca y aparece un chevron.

### Regla de categorías
Una barra horizontal de 12px dividida en tramos del color de cada categoría, con 2px de separación. Si sobra plata, el último tramo queda vacío y solo con borde.

### Diálogos y avisos
- **Diálogo:** nativo (`<dialog>`), blanco, 18px de esquina, hasta 540px de ancho (420px para confirmar), con sombra flotante y fondo oscurecido con un desenfoque de 2px. Entra en 180ms subiendo 12px.
- **Aviso flotante:** abajo a la derecha, fondo `tinta` con texto `papel` y el ícono en latón. Si es un error, va en terracota.

## Do's and Don'ts

### Do:
- **Do** mostrar todo monto con `Monto`, en Barlow Condensed tabular y formato `1.234.567,50`.
- **Do** dejar que la respuesta principal de cada pantalla (cuánto queda, cuánto se gastó) sea lo más grande de la vista.
- **Do** dar foco visible con el anillo de latón de 3px a todo lo que se puede usar con teclado.
- **Do** usar verde billete para una sola acción principal por contexto.
- **Do** mantener los neutros verdosos y tomar los colores de `:root`, sin poner hex sueltos en los componentes.
- **Do** probar cada cambio en claro, en oscuro y con la ventana angosta (900px y 560px).

### Don't:
- **Don't** hacer que parezca un banco: nada de azules corporativos, degradés de home banking, íconos de monedas o tarjetas brillantes.
- **Don't** dejar que una pantalla se vea apagada: nada de grises puros, paneles sin jerarquía ni titulares chicos.
- **Don't** sumar adornos: el guilloche de la tarjeta billete es el único y no se repite en otras pantallas.
- **Don't** usar el terracota para algo que no sea exceso, error o borrar.
- **Don't** poner sombras a paneles, tarjetas o filas en reposo.
- **Don't** usar el latón como color de texto sobre el papel ni los colores de categoría como fondo de texto.
