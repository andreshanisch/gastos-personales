# Mis gastos

App personal para registrar y analizar gastos mensuales. Corre solo en mi computadora.

- **Backend:** ASP.NET Core 10, Entity Framework Core, PostgreSQL (en Docker)
- **Frontend:** React 19 + TypeScript + Vite, servido por la misma API

## Uso diario

Doble clic en **`iniciar.cmd`**. El script:

1. Abre Docker Desktop si hace falta y levanta la base de datos.
2. Compila la página si hubo cambios desde la última vez.
3. Arranca la app y abre el navegador en `http://localhost:5080`.

Hay que dejar la ventana abierta mientras se usa la app; al cerrarla, la app se detiene. Los datos quedan guardados en la base de Docker (volumen `gastos-db`).

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
iniciar.cmd / iniciar.ps1   lanzador de doble clic
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
