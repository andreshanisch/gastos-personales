# Mis gastos

App personal para registrar y analizar gastos mensuales. Se usa desde la compu y desde el celular (se instala como app, es una PWA).

- **Backend:** ASP.NET Core 10, Entity Framework Core, PostgreSQL
- **Frontend:** React 19 + TypeScript + Vite, instalable como PWA

## Privacidad

Este repositorio es público, pero **solo contiene código**. Ningún dato de gastos ni credencial se guarda acá:

| Qué | Dónde vive |
|---|---|
| Gastos y categorías | Base de datos PostgreSQL (Neon en producción, Docker en local) |
| Usuario, hash de la contraseña, clave de los tokens, conexión a la base | Variables de entorno del hosting / `dotnet user-secrets` en local |

Además, la API exige login en todos sus endpoints (salvo `/health` y el propio login), limita los intentos de login a 5 por minuto y solo acepta pedidos desde el front configurado (CORS). El `.gitignore` excluye archivos `.env` y `appsettings.*.local.json` por si alguno se crea por error.

## Correr en local

### Requisitos

- [.NET 10 SDK](https://dotnet.microsoft.com/download)
- Node.js 22 o superior
- Docker (para la base local) o una base de Neon de desarrollo
- La herramienta de EF: `dotnet tool install --global dotnet-ef`

### 1. Base de datos

```bash
docker compose up -d
```

### 2. Configurar los secretos del backend

Desde `backend/Gastos.Api`:

```bash
# Generá el hash de tu contraseña (te la pide sin mostrarla en pantalla)
dotnet run -- hash-password

dotnet user-secrets set "ConnectionStrings:Default" "Host=localhost;Database=gastos;Username=gastos;Password=gastos_local"
dotnet user-secrets set "Auth:Usuario" "andres"
dotnet user-secrets set "Auth:PasswordHash" "<el valor que imprimió hash-password>"
dotnet user-secrets set "Auth:JwtKey" "<una cadena aleatoria de 32 caracteres o más>"
```

Para generar la `JwtKey` podés usar `openssl rand -base64 48`.

Los user-secrets se guardan fuera de la carpeta del proyecto, así que nunca terminan en el repo.

### 3. Crear la base (primera vez y cada vez que cambie el modelo)

```bash
dotnet ef migrations add Inicial   # solo la primera vez; después, un nombre descriptivo
dotnet run
```

Al arrancar, la API aplica las migraciones pendientes y crea las categorías iniciales. Queda en `http://localhost:5080`.

### 4. Frontend

Desde `frontend`:

```bash
cp .env.example .env.local
npm install
npm run dev
```

Abrí `http://localhost:5173`.

## Variables de entorno en producción

| Variable | Ejemplo |
|---|---|
| `ConnectionStrings__Default` | La conexión de Neon (acepta el formato `postgresql://...`) |
| `Auth__Usuario` | `andres` |
| `Auth__PasswordHash` | Salida de `dotnet run -- hash-password` |
| `Auth__JwtKey` | Cadena aleatoria de 32+ caracteres |
| `Cors__Origenes` | URL del front, por ejemplo `https://andres.github.io` |

Del lado del front, `VITE_API_URL` con la URL pública de la API.

## Estructura

```
backend/Gastos.Api/
  Auth/          login de un solo usuario (hash PBKDF2 + JWT)
  Controllers/   gastos, categorías, resumen mensual
  Data/          DbContext, categorías iniciales
  Models/        entidades
frontend/src/
  pages/         Gastos, Resumen, Categorías, Login
  components/    selector de mes, panel de carga, barra por categoría
```

## Próximas etapas

1. Compras en cuotas repartidas en los meses que corresponden
2. Cotización del dólar para unificar totales
3. Presupuesto por categoría y medios de pago
4. Gastos fijos que se cargan solos cada mes
5. Comparación con la inflación
