# Script para iniciar PowerShell como administrador en el directorio del proyecto BetterMind
# Autor: Asistente IA
# Fecha: Creado para el proyecto BetterMind

# Ruta del proyecto
$projectPath = "C:\Users\Camilo\ClonBetter\BetterMind"

# Función para verificar si se está ejecutando como administrador
function Test-Admin {
    $currentUser = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
    return $currentUser.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

# Si no se está ejecutando como administrador, reiniciar el script con privilegios elevados
if (-not (Test-Admin)) {
    Write-Host "Iniciando PowerShell como administrador..." -ForegroundColor Cyan
    Start-Process PowerShell -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`"" -Verb RunAs
    exit
}

# Si llegamos aquí, estamos ejecutando como administrador
Write-Host "PowerShell iniciado con privilegios de administrador" -ForegroundColor Green
Write-Host "Directorio del proyecto: $projectPath" -ForegroundColor Yellow

# Cambiar al directorio del proyecto
Set-Location -Path $projectPath

# Mostrar información útil
Write-Host "`nProyecto BetterMind - Terminal de Administrador" -ForegroundColor Magenta
Write-Host "=============================================" -ForegroundColor Magenta
Write-Host "Rama Git actual: $(git branch --show-current)" -ForegroundColor Cyan
Write-Host "Comandos disponibles:" -ForegroundColor Yellow
Write-Host "  npm start         - Iniciar el servidor de desarrollo" -ForegroundColor White
Write-Host "  npm run reset-project - Reiniciar el proyecto" -ForegroundColor White
Write-Host "=============================================" -ForegroundColor Magenta

# Mantener la terminal abierta
$host.UI.RawUI.WindowTitle = "BetterMind - Terminal de Administrador"

# Mantener la ventana abierta hasta que el usuario decida cerrarla
Write-Host "`nLa terminal está lista para usar. Presiona Ctrl+C o escribe 'exit' para cerrar." -ForegroundColor Green

# Iniciar una sesión interactiva de PowerShell
$Host.UI.RawUI.FlushInputBuffer()
while ($true) {
    $prompt = Read-Host -Prompt "BetterMind Admin"
    if ($prompt -eq "exit") {
        break
    }
    else {
        try {
            Invoke-Expression $prompt
        }
        catch {
            Write-Host "Error al ejecutar el comando: $_" -ForegroundColor Red
        }
    }
}