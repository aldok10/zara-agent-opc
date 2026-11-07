@echo off
rem zara-cli launcher for cmd.exe and PowerShell.
setlocal
python "%~dp0zara-cli.py" %*
exit /b %ERRORLEVEL%
