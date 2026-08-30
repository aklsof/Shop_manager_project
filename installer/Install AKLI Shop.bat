@echo off
:: ============================================================
::  AKLI Shop Manager — Installation Launcher
:: ============================================================
::  This script checks for required software (Node.js, Python,
::  MySQL) and guides you through installing any missing
::  dependencies before launching the AKLI Shop setup.
:: ============================================================

echo.
echo   Starting AKLI Shop Manager Installation Launcher...
echo.

powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\install-launcher.ps1"

if %ERRORLEVEL% neq 0 (
    echo.
    echo   Installation was cancelled or encountered an error.
    echo.
    pause
)
