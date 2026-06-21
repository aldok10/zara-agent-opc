@echo off
REM ============================================================================
REM Zara Agent - Windows Installation Script (CMD)
REM ============================================================================
REM For Windows 10/11. Requires either:
REM   - Git for Windows (bash)
REM   - WSL (Windows Subsystem for Linux)
REM   - PowerShell 5.1+
REM ============================================================================
SETLOCAL ENABLEDELAYEDEXPANSION

title Zara Agent v1.0.0 - Windows Installer

echo.
echo ============================================================
echo       Zara Agent v1.0.0 - Windows Installation
echo ============================================================
echo.

REM --- Check prerequisites ---
echo [1/6] Checking prerequisites...

where bash >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo   [WARN] Bash not found in PATH.
    echo   Zara requires Bash. Install one of:
    echo   - Git for Windows: https://git-scm.com/download/win
    echo   - WSL: wsl --install
    echo.
    echo   Continuing with limited functionality...
) else (
    echo   [OK] Bash found
)

where powershell >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo   [OK] PowerShell found
) else (
    echo   [WARN] PowerShell not found
)

echo.

REM --- Configuration ---
if "%ZARA_HOME%"=="" set ZARA_HOME=%USERPROFILE%\.zara
if "%ZARA_BIN%"=="" set ZARA_BIN=%USERPROFILE%\.local\bin
set SCRIPT_DIR=%~dp0..\
set PROJECT_DIR=%~dp0..\

REM --- Create directories ---
echo [2/6] Creating directory structure...
if not exist "%ZARA_HOME%" mkdir "%ZARA_HOME%"
if not exist "%ZARA_HOME%\knowledge" mkdir "%ZARA_HOME%\knowledge"
if not exist "%ZARA_HOME%\skills" mkdir "%ZARA_HOME%\skills"
if not exist "%ZARA_HOME%\memory" mkdir "%ZARA_HOME%\memory"
if not exist "%ZARA_HOME%\sessions" mkdir "%ZARA_HOME%\sessions"
if not exist "%ZARA_HOME%\agents" mkdir "%ZARA_HOME%\agents"
if not exist "%ZARA_BIN%" mkdir "%ZARA_BIN%"
echo   [OK] Directories created

echo.

REM --- Copy files ---
echo [3/6] Installing Zara files...

REM Copy CLI tool
if exist "%PROJECT_DIR%tools\zara.sh" (
    copy /Y "%PROJECT_DIR%tools\zara.sh" "%ZARA_HOME%\zara.sh" >nul
    echo   [OK] CLI tool copied
)

REM Create CLI wrapper (CMD)
(
echo @echo off
echo REM Zara CLI for Windows
echo if "%%ZARA_HOME%%"=="" set ZARA_HOME=%%USERPROFILE%%\.zara
echo if "%%ZARA_KNOWLEDGE_DIR%%"=="" set ZARA_KNOWLEDGE_DIR=%%ZARA_HOME%%\knowledge
echo.
echo where bash ^>nul 2^>nul
echo if errorlevel 1 (
echo     echo Zara requires Bash. Install Git for Windows or WSL.
echo     echo Download: https://git-scm.com/download/win
echo     pause
echo     exit /b 1
echo )
echo.
echo bash "%%ZARA_HOME%%\zara.sh" %%*
) > "%ZARA_BIN%\zara.cmd"

echo   [OK] CLI wrapper: %ZARA_BIN%\zara.cmd

REM Copy agent definitions
if exist "%PROJECT_DIR%.opencode\agent\*.md" (
    copy /Y "%PROJECT_DIR%.opencode\agent\*.md" "%ZARA_HOME%\agents\" >nul 2>nul
    echo   [OK] Agent definitions copied
)

REM Copy configuration
if not exist "%ZARA_HOME%\.env" (
    if exist "%PROJECT_DIR%.env.example" (
        copy /Y "%PROJECT_DIR%.env.example" "%ZARA_HOME%\.env" >nul 2>nul
        echo   [OK] Configuration template created
    )
)

echo.

REM --- Apply to OpenCode ---
echo [4/6] Applying to OpenCode...

set OPENCODE_CONFIG_DIR=%APPDATA%\opencode
if not exist "!OPENCODE_CONFIG_DIR!" (
    set OPENCODE_CONFIG_DIR=%USERPROFILE%\.config\opencode
)

if not exist "!OPENCODE_CONFIG_DIR!" (
    mkdir "!OPENCODE_CONFIG_DIR!" 2>nul
)

REM Try to create junction
if exist "!OPENCODE_CONFIG_DIR!\zara" (
    echo   [SKIP] Zara already linked to OpenCode
) else (
    mklink /J "!OPENCODE_CONFIG_DIR!\zara" "%PROJECT_DIR%" >nul 2>nul
    if !ERRORLEVEL! EQU 0 (
        echo   [OK] Zara linked to OpenCode
    ) else (
        echo   [WARN] Could not create junction. Run as Administrator or use:
        echo     .\scripts\apply-zara.ps1
    )
)

echo.

REM --- Apply to Claude Code (if available) ---
echo [5/6] Setting up Claude Code (if available)...

set CLAUDE_CONFIG_DIR=%USERPROFILE%\.claude
if exist "!CLAUDE_CONFIG_DIR!" (
    if exist "%PROJECT_DIR%.claude\CLAUDE.md" (
        if exist "!CLAUDE_CONFIG_DIR!\CLAUDE.md" (
            findstr /C:"Zara" "!CLAUDE_CONFIG_DIR!\CLAUDE.md" >nul 2>nul
            if !ERRORLEVEL! EQU 0 (
                echo   [SKIP] Zara already referenced in Claude Code
            ) else (
                echo.>> "!CLAUDE_CONFIG_DIR!\CLAUDE.md"
                echo --->> "!CLAUDE_CONFIG_DIR!\CLAUDE.md"
                type "%PROJECT_DIR%.claude\CLAUDE.md" >> "!CLAUDE_CONFIG_DIR!\CLAUDE.md"
                echo   [OK] Zara added to Claude Code CLAUDE.md
            )
        ) else (
            copy "%PROJECT_DIR%.claude\CLAUDE.md" "!CLAUDE_CONFIG_DIR!\CLAUDE.md" >nul 2>nul
            echo   [OK] Claude Code CLAUDE.md created
        )
    )
) else (
    echo   [SKIP] Claude Code not found
)

echo.

REM --- Summary ---
echo [6/6] Installation Complete
echo.
echo ============================================================
echo       Zara Agent Installation Complete
echo ============================================================
echo.
echo   ZARA_HOME: %ZARA_HOME%
echo   CLI:       %ZARA_BIN%\zara.cmd
echo.
echo   Next steps:
echo   1. Add %ZARA_BIN% to your PATH environment variable
echo   2. Edit %ZARA_HOME%\.env with your settings
echo   3. Run: zara status
echo   4. Restart OpenCode to activate Zara
echo.
echo   For PowerShell installation (recommended on Windows):
echo     .\scripts\apply-zara.ps1
echo.
echo ============================================================

ENDLOCAL
