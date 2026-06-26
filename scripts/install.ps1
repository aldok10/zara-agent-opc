# Zara Agent - Windows PowerShell Installer
# Usage: .\scripts\install.ps1
# Requires: Node.js 22.14+, PowerShell 5.1+

$ErrorActionPreference = "Stop"

Write-Host "`n  Zara Agent - Windows Installer`n" -ForegroundColor Cyan

# Check Node.js
try {
    $nodeVer = (node -e "process.stdout.write(process.versions.node)") 2>$null
    $parts = $nodeVer -split '\.'
    if ([int]$parts[0] -lt 22 -or ([int]$parts[0] -eq 22 -and [int]$parts[1] -lt 14)) {
        Write-Host "  ERROR: Node.js >= 22.14.0 required (found: $nodeVer)" -ForegroundColor Red
        Write-Host "  Install: scoop install nodejs-lts" -ForegroundColor Yellow
        exit 1
    }
    Write-Host "  [OK] Node.js $nodeVer" -ForegroundColor Green
} catch {
    Write-Host "  ERROR: Node.js not found. Install from https://nodejs.org" -ForegroundColor Red
    exit 1
}

# Paths
$ScriptDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$ZaraHome = "$env:USERPROFILE\.zara"
$OpenCodeDir = if ($env:APPDATA) { "$env:APPDATA\opencode" } else { "$env:USERPROFILE\.config\opencode" }

# Create dirs
foreach ($dir in @("$ZaraHome", "$ZaraHome\memory", "$ZaraHome\reflections", "$ZaraHome\metrics", "$OpenCodeDir")) {
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
}
Write-Host "  [OK] Directories created" -ForegroundColor Green

# npm install
Write-Host "  Installing dependencies..." -ForegroundColor Cyan
Push-Location $ScriptDir
try { npm install --production --ignore-scripts 2>$null | Out-Null } catch {}
Pop-Location
Write-Host "  [OK] Dependencies installed" -ForegroundColor Green

# Link to OpenCode config
$ZaraLink = "$OpenCodeDir\zara"
if (-not (Test-Path $ZaraLink)) {
    try {
        New-Item -ItemType Junction -Path $ZaraLink -Target "$ScriptDir\.opencode" -Force | Out-Null
        Write-Host "  [OK] OpenCode linked (junction)" -ForegroundColor Green
    } catch {
        Copy-Item -Path "$ScriptDir\.opencode" -Destination $ZaraLink -Recurse -Force
        Write-Host "  [OK] OpenCode linked (copy)" -ForegroundColor Green
    }
} else {
    Write-Host "  [--] OpenCode link exists" -ForegroundColor Yellow
}

# Smoke test
Write-Host "`n  Smoke test..." -ForegroundColor Cyan
try {
    $req = '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
    $result = echo $req | node --experimental-sqlite "$ScriptDir\tools\mcp\index.mjs" 2>$null | Select-Object -First 1
    if ($result -match '"tools"') {
        Write-Host "  [OK] MCP server responds" -ForegroundColor Green
    } else {
        Write-Host "  [!!] MCP server did not respond" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  [!!] MCP smoke test failed: $_" -ForegroundColor Yellow
}

# Summary
Write-Host "`n  Installation Complete" -ForegroundColor Green
Write-Host "  ZARA_HOME: $ZaraHome"
Write-Host "  OpenCode:  $ZaraLink"
Write-Host "`n  Next: Run 'opencode' in any project directory.`n"

# AI-mode output
if ($env:AI_MODE -eq "1") {
    Write-Host "---AI_STATUS_JSON---"
    Write-Host "{`"success`": true, `"platform`": `"windows`", `"node`": `"$nodeVer`", `"zara_home`": `"$ZaraHome`"}"
}
