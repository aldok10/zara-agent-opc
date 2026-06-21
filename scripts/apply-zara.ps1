<#
.SYNOPSIS
    Apply Zara Agent to OpenCode AI (Windows)

.DESCRIPTION
    This script installs the Zara agent configuration into your OpenCode AI setup.
    Works on Windows 10/11 with PowerShell 5.1+ or PowerShell Core 7+.

.PARAMETER Project
    Apply to current project only instead of globally

.PARAMETER Uninstall
    Remove Zara from OpenCode

.EXAMPLE
    .\scripts\apply-zara.ps1           # Global install
    .\scripts\apply-zara.ps1 -Project  # Project-only install
    .\scripts\apply-zara.ps1 -Uninstall # Remove Zara
#>

param(
    [switch]$Project,
    [switch]$Uninstall
)

# Configuration
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectDir = Resolve-Path "$ScriptDir/.."
$ProjectName = Split-Path $ProjectDir -Leaf
$ZaraHome = if ($env:ZARA_HOME) { $env:ZARA_HOME } else { "$env:USERPROFILE\.zara" }

# Colors via Write-Host
$Host.UI.RawUI.ForegroundColor = "Cyan"
Write-Host @"

╔══════════════════════════════════════════════════════════════╗
║              Zara Agent — OpenCode Apply                    ║
╚══════════════════════════════════════════════════════════════╝

"@
$Host.UI.RawUI.ForegroundColor = "White"

Write-Host "Platform: Windows"
Write-Host "Project:  $ProjectName ($ProjectDir)"
Write-Host ""

# Determine OpenCode config directory
$OpenCodeConfigDir = "$env:APPDATA\opencode"
if (-not (Test-Path $OpenCodeConfigDir)) {
    $OpenCodeConfigDir = "$env:USERPROFILE\.config\opencode"
}

$ZaraLinkPath = "$OpenCodeConfigDir\zara"
$OpenCodeJsonPath = "$OpenCodeConfigDir\opencode.json"

# =============================================================================
# Uninstall mode
# =============================================================================
if ($Uninstall) {
    Write-Host "[Uninstall] Removing Zara from OpenCode..." -ForegroundColor Yellow
    
    if (Test-Path $ZaraLinkPath) {
        if ((Get-Item $ZaraLinkPath).LinkType -eq "Junction") {
            Remove-Item $ZaraLinkPath -Force
        } else {
            Remove-Item $ZaraLinkPath -Recurse -Force
        }
        Write-Host "  [OK] Removed $ZaraLinkPath" -ForegroundColor Green
    }
    
    $cliPath = "$env:USERPROFILE\.local\bin\zara.cmd"
    if (Test-Path $cliPath) {
        Remove-Item $cliPath -Force
        Write-Host "  [OK] Removed $cliPath" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "Zara has been removed from OpenCode." -ForegroundColor Green
    Write-Host "Project files remain at: $ProjectDir" -ForegroundColor Green
    exit 0
}

# =============================================================================
# Project-only mode
# =============================================================================
if ($Project) {
    Write-Host "[Project Install] Applying Zara to current project..." -ForegroundColor Cyan
    
    $openCodeDir = "$ProjectDir\.opencode"
    if (-not (Test-Path $openCodeDir)) {
        Write-Host "  [ERR] .opencode/ directory not found" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "  [OK] Project .opencode/ is ready" -ForegroundColor Green
    Write-Host ""
    Write-Host "To activate, add to your project's opencode.json:"
    Write-Host '  { "agent": { "name": "zara", "prompt": ".opencode/agent/zara.md" } }'
    Write-Host ""
    Write-Host "Or run without -Project to install globally."
    exit 0
}

# =============================================================================
# Global install
# =============================================================================
Write-Host "[Global Install] Applying Zara to OpenCode config..." -ForegroundColor Cyan

# Step 1: Ensure OpenCode config directory exists
if (-not (Test-Path $OpenCodeConfigDir)) {
    New-Item -ItemType Directory -Path $OpenCodeConfigDir -Force | Out-Null
}
Write-Host "  [OK] OpenCode config dir: $OpenCodeConfigDir" -ForegroundColor Green

# Step 2: Create junction symlink
if (Test-Path $ZaraLinkPath) {
    Write-Host "  [..] Removing existing Zara link..." -ForegroundColor Yellow
    if ((Get-Item $ZaraLinkPath).LinkType -eq "Junction") {
        Remove-Item $ZaraLinkPath -Force
    } else {
        Remove-Item $ZaraLinkPath -Recurse -Force
    }
}

try {
    New-Item -ItemType Junction -Path $ZaraLinkPath -Target $ProjectDir -Force | Out-Null
    Write-Host "  [OK] Zara linked: $ZaraLinkPath -> $ProjectDir" -ForegroundColor Green
} catch {
    Write-Host "  [..] Junction failed, copying instead..." -ForegroundColor Yellow
    Copy-Item -Path "$ProjectDir\.opencode" -Destination $ZaraLinkPath -Recurse -Force
    Write-Host "  [OK] Zara copied to $ZaraLinkPath" -ForegroundColor Green
}

# Step 3: Install CLI wrapper
$localBinDir = "$env:USERPROFILE\.local\bin"
if (-not (Test-Path $localBinDir)) {
    New-Item -ItemType Directory -Path $localBinDir -Force | Out-Null
}

@"
@echo off
REM Zara CLI Wrapper for Windows
set ZARA_HOME=%ZARA_HOME%
if "%ZARA_HOME%"=="" set ZARA_HOME=%USERPROFILE%\.zara
set ZARA_KNOWLEDGE_DIR=%ZARA_KNOWLEDGE_DIR%
if "%ZARA_KNOWLEDGE_DIR%"=="" set ZARA_KNOWLEDGE_DIR=%ZARA_HOME%\knowledge

:: Find zara.sh
if exist "%~dp0..\tools\zara.sh" (
    bash "%~dp0..\tools\zara.sh" %*
) else if exist "%USERPROFILE%\.config\opencode\zara\tools\zara.sh" (
    bash "%USERPROFILE%\.config\opencode\zara\tools\zara.sh" %*
) else (
    echo Zara CLI not found. Re-run apply-zara.ps1 to fix.
    exit /b 1
)
"@ | Out-File -FilePath "$localBinDir\zara.cmd" -Encoding ASCII -Force

Write-Host "  [OK] CLI installed: $localBinDir\zara.cmd" -ForegroundColor Green

# Step 4: Ensure opencode.json references Zara
if (-not (Test-Path $OpenCodeJsonPath)) {
    Copy-Item "$ProjectDir\opencode.json" $OpenCodeJsonPath -Force
    Write-Host "  [OK] opencode.json created" -ForegroundColor Green
} else {
    Write-Host "  [..] opencode.json exists. Add Zara reference manually." -ForegroundColor Yellow
}

# Step 5: Create ZARA_HOME directory
if (-not (Test-Path $ZaraHome)) {
    New-Item -ItemType Directory -Path "$ZaraHome\skills" -Force | Out-Null
    New-Item -ItemType Directory -Path "$ZaraHome\memory" -Force | Out-Null
    New-Item -ItemType Directory -Path "$ZaraHome\sessions" -Force | Out-Null
    New-Item -ItemType Directory -Path "$ZaraHome\agents" -Force | Out-Null
}
Write-Host "  [OK] ZARA_HOME created: $ZaraHome" -ForegroundColor Green

# Step 6: Verify
Write-Host ""
Write-Host "Verification" -ForegroundColor Cyan
if (Test-Path "$localBinDir\zara.cmd") {
    Write-Host "  [OK] 'zara' command available at $localBinDir\zara.cmd" -ForegroundColor Green
}
if (Test-Path $ZaraLinkPath) {
    Write-Host "  [OK] Zara linked at OpenCode config" -ForegroundColor Green
}

# Step 7: Summary
$Host.UI.RawUI.ForegroundColor = "Green"
Write-Host @"

╔══════════════════════════════════════════════════════════════╗
║              Zara Applied Successfully                      ║
╠══════════════════════════════════════════════════════════════╣
║  OpenCode:  $ZaraLinkPath
║  CLI:       $localBinDir\zara.cmd
║  Home:      $ZaraHome
║  Project:   $ProjectDir
║                                                             ║
║  Next:                                                      ║
║  1. Restart OpenCode to activate                            ║
║  2. Run: /zara status (in OpenCode chat)                    ║
║  3. Add $ZaraHome to your PATH                 ║
╚══════════════════════════════════════════════════════════════╝

"@
$Host.UI.RawUI.ForegroundColor = "White"
