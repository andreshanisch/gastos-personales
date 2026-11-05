---
version: 1
slug: "frontend-src-pages-planpage-tsx"
primary_target: "frontend/src/pages/PlanPage.tsx"
related_targets: []
---

# Plan (pantalla de inicio)

Modo: Operate. Andres abre el Plan para saber cuánto le queda esta semana, en qué se le va la plata y, a veces, para cargar en tanda.

## Direction contract

THESIS: El Plan es un tablero de bloques oscuro, no una lista de tarjetas apiladas: cada bloque responde una pregunta (cuánto queda, cómo fue cada día, cómo vienen las semanas, en qué se va, cuánto ahorré) y se lee de un vistazo.

OWN-WORLD: Fondo casi negro con un tinte lila, bloques en gris un punto más claro con borde de 1px y esquinas de 26px, separados 12px. Lima para lo principal y lo que alcanza, lila para excesos, rojo solo para borrar y errores. Geist para la interfaz y Geist Mono para toda cifra. Selectores en píldora, barras que crecen al aparecer y montos que cuentan hasta su valor.

STORY: Andres entiende en segundos cuánto le queda esta semana y en el mes, ve qué días se pasó, decide qué hacer con un sobrante y vuelve a cargar gastos.

FIRST VIEWPORT: Barra lateral de siempre a la izquierda. Arriba, título Plan y el mes en píldora. Fila 1: bloque grande de dos columnas con "Esta semana te quedan" en mono grande y la tira de barras día por día del mes; bloque "Calcular con" (píldoras) con lo asignado y lo gastado de la semana; bloque "Queda en el mes" con medidor semicircular. Fila 2: semanas, categorías del mes en barra segmentada y el bloque lima de ahorro.

FORM: Tablero bento tomado de la referencia que eligió Andres (Web3Bento); la estructura de navegación y los controles siguen siendo los estándar. seed: none (dirección fijada por Andres)

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
