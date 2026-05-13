---
name: smoke-test-routes
description: Hit every critical public route + API endpoint and report HTTP status + content length. Quick sanity check after big changes (new layouts, route refactors, dependency updates).
allowed-tools: PowerShell, Bash
---

# Smoke test routes

Use after any change that could affect routing or layouts — restructuring
folders, dropping a feature, upgrading Next.js, etc.

Doesn't replace tests; this is a "is anything obviously broken" check.

## Command

```powershell
$urls = @(
    "http://localhost:3000/",
    "http://localhost:3000/events",
    "http://localhost:3000/organisations",
    "http://localhost:3000/causes",
    "http://localhost:3000/transparency",
    "http://localhost:3000/about",
    "http://localhost:3000/privacy",
    "http://localhost:3000/terms",
    "http://localhost:3000/sitemap.xml",
    "http://localhost:3000/robots.txt",
    "http://localhost:3000/manifest.webmanifest",
    "http://localhost:8000/health",
    "http://localhost:8000/docs",
    "http://localhost:8000/api/v1/site-settings/",
    "http://localhost:8000/api/v1/events/",
    "http://localhost:8000/api/v1/organisations/?verified_only=false",
    "http://localhost:8000/api/v1/stats/public",
    "http://localhost:8000/api/v1/audit-feed/public",
    "http://localhost:8000/api/v1/runners/spotlight"
)
$ok = 0
$bad = 0
foreach ($u in $urls) {
    try {
        $r = Invoke-WebRequest -Uri $u -UseBasicParsing -TimeoutSec 10
        Write-Output ("  {0,3}  {1,8}  {2}" -f $r.StatusCode, $r.RawContentLength, $u)
        $ok++
    } catch {
        Write-Output ("  ERR        {0}  ({1})" -f $u, $_.Exception.Message)
        $bad++
    }
}
Write-Output ""
Write-Output ("[{0} OK / {1} ERR]" -f $ok, $bad)
```

## After

If any return ERR or non-200, report which and ask the user if they want
the fix tracked down. Otherwise confirm "all green".
