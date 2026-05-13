# RunForACause — full-stack launcher.
# Idempotent: the first run installs everything; subsequent runs just start the servers.
#
# Usage:
#   .\start.ps1            launch the full stack (default)
#   .\start.ps1 -Setup     setup only (no server launch)
#   .\start.ps1 -Seed      seed sample data after setup
#   .\start.ps1 -Reset     drop venv + node_modules, re-install everything
#
# Requires: Python 3.11+, Node 20+, PostgreSQL running on localhost:5432
# with the database `runforacause` already created (one-time setup).

param(
    [switch]$Setup,
    [switch]$Seed,
    [switch]$Reset
)

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$backendPath = Join-Path $root "backend"
$frontendPath = Join-Path $root "frontend"
$venvPath = Join-Path $backendPath ".venv"
$nodeModules = Join-Path $frontendPath "node_modules"
$envFile = Join-Path $root ".env"

function Step($number, $message) {
    Write-Host ""
    Write-Host "[$number] $message" -ForegroundColor Cyan
}

function Ok($message) {
    Write-Host "    $([char]0x2713) $message" -ForegroundColor Green
}

function Skip($message) {
    Write-Host "    $message" -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "==============================================" -ForegroundColor Magenta
Write-Host "  RunForACause - full-stack launcher" -ForegroundColor Magenta
Write-Host "==============================================" -ForegroundColor Magenta

# --- Reset cleanup ---
if ($Reset) {
    Step "0" "Resetting environment (venv + node_modules)..."
    if (Test-Path $venvPath) { Remove-Item -Recurse -Force $venvPath; Ok ".venv deleted" }
    if (Test-Path $nodeModules) { Remove-Item -Recurse -Force $nodeModules; Ok "node_modules deleted" }
}

# --- Sanity checks ---
Step "1" "Checking prerequisites..."

if (-not (Test-Path $envFile)) {
    Write-Host "    .env file is missing at $envFile" -ForegroundColor Red
    Write-Host "    Create it from .env.example first:" -ForegroundColor Yellow
    Write-Host "      Copy-Item .env.example .env" -ForegroundColor Yellow
    exit 1
}

try {
    $null = Get-Command python -ErrorAction Stop
    Ok "Python: $((python --version 2>&1).Trim())"
} catch {
    Write-Host "    Python is not on PATH. Install Python 3.11+." -ForegroundColor Red
    exit 1
}

try {
    $null = Get-Command npm -ErrorAction Stop
    Ok "Node:   $((node --version 2>&1).Trim())"
} catch {
    Write-Host "    Node/npm is not on PATH. Install Node 20+." -ForegroundColor Red
    exit 1
}

# --- Backend deps ---
Step "2" "Backend dependencies..."
if (-not (Test-Path $venvPath)) {
    Write-Host "    Creating .venv and installing requirements (this takes ~2 minutes)..." -ForegroundColor Yellow
    Push-Location $backendPath
    python -m venv .venv
    & ".venv\Scripts\python.exe" -m pip install --upgrade pip --quiet
    & ".venv\Scripts\pip.exe" install -r requirements.txt
    Pop-Location
    Ok "Backend installed"
} else {
    Skip ".venv exists - skipping install"
}

# --- Frontend deps ---
Step "3" "Frontend dependencies..."
if (-not (Test-Path $nodeModules)) {
    Write-Host "    Running npm install (this takes ~2 minutes)..." -ForegroundColor Yellow
    Push-Location $frontendPath
    npm install --legacy-peer-deps
    Pop-Location
    Ok "Frontend installed"
} else {
    Skip "node_modules exists - skipping install"
}

# --- Migrations (idempotent) ---
Step "4" "Applying database migrations..."
Push-Location $backendPath
try {
    & ".venv\Scripts\python.exe" -m alembic upgrade head
    Ok "Database is up to date"
} catch {
    Write-Host "    Migration failed. Common causes:" -ForegroundColor Red
    Write-Host "      * Postgres not running" -ForegroundColor Yellow
    Write-Host "      * Database 'runforacause' does not exist" -ForegroundColor Yellow
    Write-Host "      * Wrong DATABASE_URL in .env" -ForegroundColor Yellow
    Pop-Location
    exit 1
}
Pop-Location

# --- Seed (only if requested) ---
if ($Seed) {
    Step "5" "Seeding sample data..."
    Push-Location $backendPath
    & ".venv\Scripts\python.exe" -m app.seed
    Pop-Location
}

# --- Setup-only mode ---
if ($Setup) {
    Write-Host ""
    Write-Host "Setup complete. Run .\start.ps1 to launch the servers." -ForegroundColor Green
    exit 0
}

# --- Launch servers ---
Step "5" "Launching servers..."

$backendTitle = "RunForACause - Backend (8000)"
$frontendTitle = "RunForACause - Frontend (3000)"

$backendCmd = @"
`$Host.UI.RawUI.WindowTitle = '$backendTitle'
Set-Location '$backendPath'
& '.venv\Scripts\Activate.ps1'
Write-Host 'Backend starting on http://localhost:8000' -ForegroundColor Green
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
"@

$frontendCmd = @"
`$Host.UI.RawUI.WindowTitle = '$frontendTitle'
Set-Location '$frontendPath'
Write-Host 'Frontend starting on http://localhost:3000' -ForegroundColor Green
npm run dev
"@

Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendCmd
Start-Sleep -Seconds 2
Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendCmd

Write-Host ""
Write-Host "==============================================" -ForegroundColor Green
Write-Host "  Stack launched in two new windows" -ForegroundColor Green
Write-Host "==============================================" -ForegroundColor Green
Write-Host ""
Write-Host "  API:      http://localhost:8000/docs"
Write-Host "  App:      http://localhost:3000"
Write-Host ""
Write-Host "  Wait ~15 seconds for both to compile, then open the App URL."
Write-Host "  To stop: close those two PowerShell windows (or Ctrl-C in each)."
Write-Host ""
