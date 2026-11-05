# Mis gastos

App personal de Andres para registrar y planificar sus gastos mensuales. Corre solo en su computadora (Windows), en `http://localhost:5080`. Respondé siempre en castellano rioplatense.

## Reglas del proyecto

- **El proyecto es de Andres.** Los commits van solo a su nombre: nunca agregues `Co-Authored-By`, "Generated with Claude Code" ni ninguna mención a Claude en commits, PRs o código.
- **Privacidad:** el repo es público y tiene solo código. Los datos viven en la base de Docker local; no se suben datos reales, dumps ni capturas con montos reales.
- No leas ni muestres `.env.local` (tiene credenciales viejas de Neon) ni otros archivos de secretos.
- La app escucha solo en `localhost` y no tiene login; mantenelo así.
- Hacé los cambios en una rama, verificá (ver abajo) y recién después mergeá a `main`.

## Arquitectura

- **Backend** (`backend/Gastos.Api`): ASP.NET Core 10, EF Core 10 + Npgsql, PostgreSQL 17 en Docker (`docker-compose.yml`, volumen `gastos-db`). Sirve el build de React desde `wwwroot`. Al arrancar aplica las migraciones (reintenta 20 veces cada 3 s).
  - Modelos: `Categoria` (con `Obligatoria`), `Gasto`, `Ingreso`, `CierreSemana` (`DecisionSobrante`: Ahorrar / Repartir).
  - Controladores: Gastos (CRUD + `buscar`), Categorias, Ingresos (+ `copiar-mes-anterior`), Resumen, Plan (`GET api/plan`, `PUT api/plan/decisiones`), Historial.
- **Frontend** (`frontend`): React 19, TypeScript, Vite (build a `../backend/Gastos.Api/wwwroot`), react-router con `HashRouter`.
  - `src/Acciones.tsx`: diálogos globales de gasto/ingreso, atajos N e I, y `version`/`refrescar` para que las páginas recarguen.
  - `src/plan.ts`: lógica del plan semanal (semanas 1–7, 8–14, 15–21, 22–fin; ingresos y obligatorios se reparten desde su semana; el exceso se descuenta de las semanas que quedan; el sobrante se ahorra o se reparte). Tiene pruebas en `pruebas/plan.test.ts`.
  - `src/formato.ts`: formato de montos argentino (`1.234.567,50`).
  - Estilo: tablero de bloques oscuro (siempre oscuro), lima para lo principal y lo que alcanza, lila para excesos, rojo solo para borrar y errores; cifras en Geist Mono. Detalle en `DESIGN.md`.
  - `src/index.css`: tema con Tailwind 4 y variables al estilo shadcn (`@theme inline`). Alias `@/` → `src/`; estructura shadcn en `components.json`, `src/lib/utils.ts` (`cn`) y `src/components/ui/` (`bento.tsx`, `cifra.tsx`).
  - `src/styles.css`: clases propias de las pantallas que todavía no pasaron a Tailwind; se importa en la capa `components`, así las utilidades de Tailwind le ganan.
- **Scripts de Windows** (CRLF, UTF-8 con BOM): `iniciar.cmd/.ps1` (levanta Docker, copia diaria a OneDrive con `copias.ps1`, compila si hubo cambios y abre la app), `restaurar.cmd/.ps1`.

## Comandos

- Pruebas del front: `npm test` en `frontend`.
- Build del front: `npm run build` en `frontend`.
- Tipos: `npx tsc --noEmit` en `frontend`.
- API: `dotnet run` en `backend/Gastos.Api`.
- Front con recarga: `npm run dev` en `frontend` (puerto 5173, reenvía `/api` a 5080).
- Migraciones: `dotnet ef migrations add <Nombre>` en `backend/Gastos.Api`. El CI corre `dotnet ef migrations has-pending-model-changes`.

## Verificación antes de mergear

1. `npm test`, `npx tsc --noEmit` y `npm run build` en `frontend`; `dotnet build` si tocaste el backend.
2. Probá la pantalla cambiada en el navegador, en ancho de escritorio y con la ventana angosta (la app es siempre oscura).
3. No dejes datos de prueba en la base real: si creás algo para probar, borralo al terminar.

## Ideas pendientes (cuando Andres las pida)

Cuotas, gastos fijos automáticos, dólar en el plan, aviso al cargar un gasto que se pasa del plan.
