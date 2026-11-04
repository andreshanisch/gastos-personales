# Funciones compartidas por iniciar.ps1 y restaurar.ps1 para las copias de seguridad de la base.

$script:NombreCarpetaCopias = 'Mis gastos - copias'
$script:CopiasAGuardar = 30

function Get-CarpetaCopias {
    # OneDrive se sincroniza con la nube: si le pasa algo a la compu, las copias siguen ahí
    $base = $env:OneDrive
    if (-not $base -or -not (Test-Path $base)) { $base = Join-Path $env:USERPROFILE 'OneDrive' }
    if (-not (Test-Path $base)) { $base = [Environment]::GetFolderPath('MyDocuments') }
    $carpeta = Join-Path $base $script:NombreCarpetaCopias
    if (-not (Test-Path $carpeta)) { New-Item -ItemType Directory -Path $carpeta | Out-Null }
    return $carpeta
}

function Guardar-Copia {
    param([Parameter(Mandatory)][string]$Compose)

    $carpeta = Get-CarpetaCopias
    # Una copia por día: si se abre la app varias veces, se reemplaza la del día
    $destino = Join-Path $carpeta ("gastos-{0}.dump" -f (Get-Date -Format 'yyyy-MM-dd'))
    $temporal = "$destino.tmp"

    # pg_dump escribe dentro del contenedor y después se copia el archivo a Windows
    # (pasarlo por la consola de PowerShell rompería el formato binario)
    docker compose -f $Compose exec -T db pg_dump -U gastos -d gastos --format=custom --file=/tmp/copia.dump | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'pg_dump falló.' }
    docker compose -f $Compose cp db:/tmp/copia.dump $temporal *> $null
    if ($LASTEXITCODE -ne 0) { throw 'no se pudo copiar el archivo desde Docker.' }
    docker compose -f $Compose exec -T db rm -f /tmp/copia.dump *> $null

    # Se valida antes de reemplazar la copia anterior del día
    $cabecera = [System.Text.Encoding]::ASCII.GetString([System.IO.File]::ReadAllBytes($temporal), 0, 5)
    if ($cabecera -ne 'PGDMP') {
        Remove-Item $temporal -Force -ErrorAction SilentlyContinue
        throw 'el archivo generado no es una copia válida.'
    }
    Move-Item -Path $temporal -Destination $destino -Force

    # Se guardan solo las últimas copias
    Get-ChildItem $carpeta -Filter 'gastos-*.dump' |
        Sort-Object Name -Descending |
        Select-Object -Skip $script:CopiasAGuardar |
        Remove-Item -Force

    return $destino
}
