# Mis gastos

App personal para registrar y analizar gastos mensuales. Corre solo en mi computadora.

- **Backend:** ASP.NET Core 10, Entity Framework Core, PostgreSQL (en Docker)
- **Frontend:** React 19 + TypeScript + Vite, servido por la misma API

## Uso diario

Doble clic en **`iniciar.cmd`**. El script:

1. Abre Docker Desktop si hace falta y levanta la base de datos.
2. Guarda la copia de seguridad del día.
3. Compila la página si hubo cambios desde la última vez.
4. Arranca la app y abre el navegador en `http://localhost:5080`.

Hay que dejar la ventana abierta mientras se usa la app; al cerrarla, la app se detiene. Los datos quedan guardados en la base de Docker (volumen `gastos-db`).

## Copias de seguridad

Cada vez que se abre la app con `iniciar.cmd` se guarda una copia de la base en la carpeta **`OneDrive\Mis gastos - copias`** (o en Documentos si no hay OneDrive). Se guarda una por día, como `gastos-AAAA-MM-DD.dump`, y se conservan las últimas 30. Si la copia falla, la app abre igual y se reintenta la próxima vez.

Para volver a una copia: cerrar la app y hacer doble clic en **`restaurar.cmd`**. Muestra las copias disponibles, pide confirmación escribiendo `SI` y, antes de restaurar, guarda una copia del estado actual (`...-antes-de-restaurar.dump`). La restauración es todo o nada: si falla, no cambia nada.

## Privacidad

Este repositorio es público, pero **solo contiene código**: los gastos viven en la base de Docker de mi compu. La app escucha únicamente en `localhost`, así que nadie de la red puede conectarse. Por eso no tiene login.

## Requisitos

- [.NET 10 SDK](https://dotnet.microsoft.com/download)
- Node.js 22 o superior
- Docker Desktop

## Desarrollo

- **API:** `dotnet run` desde `backend/Gastos.Api` (queda en `http://localhost:5080`).
- **Página con recarga automática:** `npm run dev` desde `frontend` (queda en `http://localhost:5173` y reenvía `/api` a la API).
- **Cambios en el modelo:** `dotnet ef migrations add <Nombre>` desde `backend/Gastos.Api`. La migración se aplica sola al arrancar.

## Estructura

```
iniciar.cmd / iniciar.ps1   lanzador de doble clic (también guarda la copia del día)
restaurar.cmd / .ps1        volver a una copia de seguridad
copias.ps1                  funciones de copia compartidas
docker-compose.yml          base PostgreSQL local
backend/Gastos.Api/
  Controllers/   gastos, categorías, resumen mensual
  Data/          DbContext, categorías iniciales
  Migrations/    esquema de la base
  Models/        entidades
frontend/src/
  pages/         Gastos, Resumen, Categorías
  components/    selector de mes, panel de carga, barra por categoría
```

## Próximas etapas

1. Compras en cuotas repartidas en los meses que corresponden
2. Cotización del dólar para unificar totales
3. Presupuesto por categoría y medios de pago
4. Gastos fijos que se cargan solos cada mes
5. Comparación con la inflación
