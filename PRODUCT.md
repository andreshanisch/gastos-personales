# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Andres, el único usuario. Usa la app en su computadora con Windows, en el navegador, a veces con la ventana angosta al costado de otras cosas.

No carga los gastos en el momento: lo hace **cada tanto, en tanda**, con los tickets juntados o el resumen de la tarjeta, así que carga muchos gastos seguidos de una vez.

Cuando abre la app quiere resolver una de estas tres cosas:

- **Cuánto le queda:** cuánto puede gastar esta semana según el plan.
- **En qué se le va:** qué categorías se están comiendo la plata del mes.
- **Cargar y listo:** entra a registrar gastos o ingresos y cierra.

## Product Purpose

Registrar los gastos e ingresos del mes y planificarlos semana por semana para **llegar a fin de mes** sin pasarse.

La app tiene éxito cuando:

- Andres sabe de un vistazo cuánto puede gastar.
- Ve a tiempo que se está pasando, antes de que sea tarde para corregir.
- Cargar una tanda de gastos le lleva pocos pasos.

## Positioning

Es una herramienta personal con un plan semanal propio, no una app genérica de finanzas:

- El mes se divide en semanas fijas: días 1–7, 8–14, 15–21 y del 22 a fin de mes.
- Las categorías **obligatorias** (alquiler, servicios, tarjeta…) reservan su monto primero, y el resto del ingreso se reparte entre las semanas desde la semana en que entra.
- Lo que se gasta de más en una semana se descuenta de las semanas que quedan.
- Lo que sobra de una semana se decide: **ahorrar** o **repartir** entre las semanas que siguen.

Todo corre en la propia computadora, sin nube ni cuentas: los datos son solo de Andres.

## Operating Context

- Se abre con doble clic en `iniciar.cmd`, que levanta la base en Docker, guarda la copia del día en OneDrive y abre `http://localhost:5080`.
- Carga en tanda a partir de tickets en papel o del resumen de la tarjeta de crédito.
- Atajos de teclado: **N** abre "Nuevo gasto" e **I** abre "Nuevo ingreso", desde cualquier pantalla.
- Secciones actuales: Plan (pantalla de inicio), Gastos, Ingresos y Resumen (este mes), Historial y Buscar (análisis), Categorías (ajustes).

## Capabilities and Constraints

- Gastos e ingresos en **pesos (ARS) y dólares (USD)**. Hoy los totales en dólares van aparte: unificar con la cotización está pendiente.
- Categorías con color, que se pueden marcar como obligatorias. Las categorías con gastos no se borran, se archivan para no perder el historial.
- Los ingresos se pueden copiar del mes anterior.
- Historial mes a mes y evolución por categoría. La búsqueda de gastos se puede exportar a Excel.
- Montos en formato argentino (`1.234.567,50`). Toda la interfaz está en castellano rioplatense.
- La app escucha solo en `localhost` y no tiene login: tiene que seguir así.
- Pendiente, sin decidir cómo: cuotas, gastos fijos que se cargan solos, dólar en el plan y un aviso al cargar un gasto que se pasa del plan.

## Brand Commitments

- Nombre: **Mis gastos**. Ícono: `frontend/public/icon.svg`.
- Voz: castellano rioplatense con voseo ("podés gastar", "tenés hoy"), directa y cercana, como una nota para uno mismo.

## Evidence on Hand

- El repositorio es público y tiene solo código: no hay datos reales, dumps ni capturas con montos reales, y no se deben agregar.
- Las demos, capturas o ejemplos tienen que usar montos inventados.

## Product Principles

1. **Primero, cuánto me queda.** Lo disponible de la semana es la respuesta más importante y nunca hay que buscarla.
2. **Cargar en tanda sin fricción.** Cargar muchos gastos seguidos tiene que ser rápido y poder hacerse solo con el teclado, sin perder el ritmo entre uno y otro.
3. **Todo de un vistazo.** Cada pantalla responde su pregunta sin hacer buscar ni interpretar.
4. **Frenar a tiempo.** La app tiene que mostrar que se viene un exceso antes de que pase, no solo después.
5. **Privado y local.** Nada sale de la computadora de Andres.
