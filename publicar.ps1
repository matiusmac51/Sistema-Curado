# ═══════════════════════════════════════════════════
#  AgroSeed — Script de Publicación Automática
#  Doble clic para subir cambios a GitHub → Vercel
# ═══════════════════════════════════════════════════

$folder = $PSScriptRoot
Set-Location $folder

Write-Host ""
Write-Host "  ╔══════════════════════════════════╗" -ForegroundColor Green
Write-Host "  ║   AgroSeed — Publicar Cambios    ║" -ForegroundColor Green
Write-Host "  ╚══════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

# Verificar si hay cambios
$status = git status --short
if (-not $status) {
    Write-Host "  ✓ No hay cambios nuevos para publicar." -ForegroundColor Yellow
    Write-Host ""
    Read-Host "  Presioná ENTER para cerrar"
    exit
}

# Mostrar archivos modificados
Write-Host "  Archivos modificados detectados:" -ForegroundColor Cyan
git status --short | ForEach-Object { Write-Host "    $_" -ForegroundColor White }
Write-Host ""

# Mensaje del commit
$msg = Read-Host "  Descripción del cambio (ENTER para 'Actualización de sistema')"
if (-not $msg) { $msg = "Actualizacion de sistema" }

# Subir a GitHub
Write-Host ""
Write-Host "  Publicando en GitHub..." -ForegroundColor Cyan
git add .
git commit -m $msg
git push origin main

Write-Host ""
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✓ ¡Publicado con éxito! Vercel actualizará en ~30 segundos." -ForegroundColor Green
    Write-Host "  → https://github.com/matiusmac51/Sistema-Curado" -ForegroundColor Cyan
} else {
    Write-Host "  ✗ Hubo un error. Verificá tu conexión a internet o credenciales de GitHub." -ForegroundColor Red
}

Write-Host ""
Read-Host "  Presioná ENTER para cerrar"
