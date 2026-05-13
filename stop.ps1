# Stop running uvicorn (port 8000) and Next.js (port 3000) instances.

$ErrorActionPreference = "SilentlyContinue"

function Stop-Port($port) {
    $procs = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    foreach ($p in $procs) {
        Stop-Process -Id $p.OwningProcess -Force
        Write-Host "Stopped process $($p.OwningProcess) on port $port" -ForegroundColor Yellow
    }
}

Stop-Port 8000
Stop-Port 3000

Write-Host "Done." -ForegroundColor Green
