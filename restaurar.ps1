# Restaura la base de "Mis gastos" desde una copia de seguridad.
# Se usa con doble clic en restaurar.cmd. Reemplaza TODOS los datos actuales por los de la copia.

$ErrorActionPreference = 'Continue'
$raiz    = $PSScriptRoot
$compose = Join-Path $raiz 'docker-compose.yml'
$Host.UI.RawUI.WindowTitle = 'Mis gastos - Restaurar copia'
. (Join-Path $raiz 'copias.ps1')

function Salir($texto, $color = 'Red') {
    Write-Host "`n$texto" -ForegroundColor $color
    Read-Host 'Apretá Enter para cerrar'
    exit
}

# La app tiene que estar cerrada para poder reemplazar la base
try {
    Invoke-WebRequest 'http://localhost:5080/health' -UseBasicParsing -TimeoutSec 2 | Out-Null
    Salir 'La app está abierta. Cerrá la ventana "Mis gastos" y volvé a abrir este archivo.'
} catch { }

docker info *> $null
if ($LASTEXITCODE -ne 0) { Salir 'Docker Desktop no está abierto. Abrilo y volvé a intentar.' }
docker compose -f $compose up -d *> $null

$carpeta = Get-CarpetaCopias
$copias = @(Get-ChildItem $carpeta -Filter 'gastos-*.dump' | Sort-Object Name -Descending)
if ($copias.Count -eq 0) { Salir "No hay copias en $carpeta." }

Write-Host "Copias disponibles en $carpeta`n"
for ($i = 0; $i -lt [Math]::Min($copias.Count, 15); $i++) {
    Write-Host ("  {0,2}. {1}" -f ($i + 1), $copias[$i].BaseName.Replace('gastos-', ''))
}
$eleccion = Read-Host "`n¿Cuál restaurar? (número, Enter para la más reciente)"
if (-not $eleccion) { $eleccion = '1' }
$numero = 0
if (-not [int]::TryParse($eleccion, [ref]$numero) -or $numero -lt 1 -or $numero -gt $copias.Count) {
    Salir 'Número inválido. No se cambió nada.'
}
$copia = $copias[$numero - 1]

Write-Host "`nVas a reemplazar TODOS los datos actuales por los de la copia del $($copia.BaseName.Replace('gastos-', ''))." -ForegroundColor Yellow
if ((Read-Host 'Para confirmar escribí SI') -ne 'SI') { Salir 'Cancelado. No se cambió nada.' 'Yellow' }

# Por las dudas, antes se guarda una copia del estado actual
try {
    $resguardo = Guardar-Copia -Compose $compose
    $nombreResguardo = $resguardo -replace '\.dump$', '-antes-de-restaurar.dump'
    Move-Item $resguardo $nombreResguardo -Force
    Write-Host "Copia del estado actual guardada en $nombreResguardo"
} catch {
    Salir "No se pudo guardar una copia del estado actual ($($_.Exception.Message)). No se cambió nada."
}

docker compose -f $compose cp $copia.FullName db:/tmp/restaurar.dump *> $null
if ($LASTEXITCODE -ne 0) { Salir 'No se pudo pasar la copia a Docker. No se cambió nada.' }
docker compose -f $compose exec -T db pg_restore -U gastos -d gastos --clean --if-exists --no-owner --single-transaction /tmp/restaurar.dump
$resultado = $LASTEXITCODE
docker compose -f $compose exec -T db rm -f /tmp/restaurar.dump *> $null

if ($resultado -ne 0) { Salir 'La restauración falló y no se aplicó ningún cambio (se hace todo o nada).' }
Salir 'Listo: los datos quedaron como en la copia. Ya podés abrir la app.' 'Green'
