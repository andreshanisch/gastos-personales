# Abre "Mis gastos": levanta la base en Docker, compila la página si cambió,
# arranca la app y abre el navegador. Se usa con doble clic en iniciar.cmd.

$ErrorActionPreference = 'Continue'
$raiz    = $PSScriptRoot
$api     = Join-Path $raiz 'backend\Gastos.Api'
$front   = Join-Path $raiz 'frontend'
$compose = Join-Path $raiz 'docker-compose.yml'
$url     = 'http://localhost:5080'
$Host.UI.RawUI.WindowTitle = 'Mis gastos'

function Paso($texto)   { Write-Host "`n> $texto" -ForegroundColor Cyan }
function Fallar($texto) {
    Write-Host "`n$texto" -ForegroundColor Red
    Read-Host 'Apretá Enter para cerrar'
    exit 1
}
function AppResponde {
    try { Invoke-WebRequest "$url/health" -UseBasicParsing -TimeoutSec 2 | Out-Null; return $true }
    catch { return $false }
}

# Si la app ya está abierta en otra ventana, solo abre el navegador
if (AppResponde) { Start-Process $url; exit 0 }

# ---------- 1. Base de datos ----------
Paso 'Iniciando la base de datos...'
docker info *> $null
if ($LASTEXITCODE -ne 0) {
    $dockerDesktop = Join-Path $env:ProgramFiles 'Docker\Docker\Docker Desktop.exe'
    if (-not (Test-Path $dockerDesktop)) { Fallar 'No encontré Docker Desktop. Abrilo a mano y volvé a intentar.' }
    Write-Host '  Abriendo Docker Desktop (puede tardar un minuto)...'
    Start-Process $dockerDesktop
    $dockerListo = $false
    for ($i = 0; $i -lt 60; $i++) {
        Start-Sleep -Seconds 3
        docker info *> $null
        if ($LASTEXITCODE -eq 0) { $dockerListo = $true; break }
    }
    if (-not $dockerListo) { Fallar 'Docker Desktop no terminó de arrancar. Abrilo a mano y volvé a intentar.' }
}

docker compose -f $compose up -d
if ($LASTEXITCODE -ne 0) { Fallar 'No se pudo levantar la base de datos.' }

# Espera a que PostgreSQL acepte conexiones
for ($i = 0; $i -lt 30; $i++) {
    docker compose -f $compose exec -T db pg_isready -U gastos -d gastos *> $null
    if ($LASTEXITCODE -eq 0) { break }
    Start-Sleep -Seconds 1
}

# Y a que el puerto 5432 responda desde Windows (Docker lo habilita unos segundos después)
for ($i = 0; $i -lt 60; $i++) {
    try {
        $cliente = [System.Net.Sockets.TcpClient]::new()
        $cliente.Connect('127.0.0.1', 5432)
        $cliente.Close()
        break
    } catch { Start-Sleep -Seconds 1 }
}

# ---------- 2. Página (React) ----------
Paso 'Preparando la página...'
Push-Location $front
$dependencias = 'node_modules\.package-lock.json'
if (-not (Test-Path $dependencias) -or (Get-Item 'package-lock.json').LastWriteTime -gt (Get-Item $dependencias).LastWriteTime) {
    Write-Host '  Instalando dependencias...'
    npm install --no-fund --no-audit
    if ($LASTEXITCODE -ne 0) { Pop-Location; Fallar 'Falló la instalación de dependencias (npm install).' }
}

$indice = Join-Path $api 'wwwroot\index.html'
$compilar = -not (Test-Path $indice)
if (-not $compilar) {
    $ultimaCompilacion = (Get-Item $indice).LastWriteTime
    $cambios = @(Get-ChildItem -Recurse -File 'src', 'public', 'index.html', 'vite.config.ts', 'package.json' |
        Where-Object { $_.LastWriteTime -gt $ultimaCompilacion })
    $compilar = $cambios.Count -gt 0
}
if ($compilar) {
    npm run build
    $compilo = $LASTEXITCODE -eq 0
    Pop-Location
    if (-not $compilo) { Fallar 'No se pudo compilar la página.' }
} else {
    Pop-Location
    Write-Host '  Sin cambios, no hace falta compilar.'
}

# ---------- 3. App ----------
Paso 'Arrancando la app (la primera vez tarda un poco más)...'
$proceso = Start-Process dotnet -ArgumentList 'run', '--project', "`"$api`"" -NoNewWindow -PassThru
$lista = $false
for ($i = 0; $i -lt 180; $i++) {
    Start-Sleep -Seconds 1
    if ($proceso.HasExited) { Fallar 'La app se cerró al arrancar. Revisá el error de arriba.' }
    if (AppResponde) { $lista = $true; break }
}
if (-not $lista) {
    Stop-Process -Id $proceso.Id -Force -ErrorAction SilentlyContinue
    Fallar 'La app tardó demasiado en arrancar.'
}

Start-Process $url
Write-Host "`nMis gastos está abierta en $url" -ForegroundColor Green
Write-Host 'Dejá esta ventana abierta mientras la uses. Para cerrar la app, cerrá esta ventana.'
$proceso.WaitForExit()
