@echo off
setlocal EnableDelayedExpansion

:: ============================================================
::  AKLI Shop Manager — Web App Launcher
::  Starts the Next.js development server on http://localhost:3000
:: ============================================================

title AKLI Web App Server

echo.
echo  =============================================
echo   _    _  _ _    ___   ___  _  _  ___  ___
echo  / \  ^| ^|/ / ^|  ^|_ _^| / __^|^| ^|^| ^|/ _ \^| _ \
echo  \_/  ^|   ^<^| ^|__ ^| ^|  \__ \^| __ ^| (_) ^|  _/
echo       ^|_^|\_\____^|___^| ^|___/^|_^|^|_^|\___/^|_^|
echo.
echo   AKLI Shop Manager - Web Application
echo  =============================================
echo.

:: -------------------------------------------------------
::  Navigate to the WebApp directory (relative to script)
:: -------------------------------------------------------
set "WEBAPP_DIR=%~dp0..\WebApp"
cd /d "%WEBAPP_DIR%" 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Could not find WebApp directory:
    echo         %WEBAPP_DIR%
    echo.
    echo  Please verify the installation is intact.
    goto :error_exit
)

echo  [INFO] Working directory: %CD%
echo.

:: -------------------------------------------------------
::  Check that Node.js is available
:: -------------------------------------------------------
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH.
    echo         Please install Node.js 18+ from https://nodejs.org
    goto :error_exit
)

for /f "tokens=*" %%v in ('node --version 2^>nul') do set "NODE_VER=%%v"
echo  [INFO] Node.js version: %NODE_VER%

:: -------------------------------------------------------
::  Check that npm is available
:: -------------------------------------------------------
where npm >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] npm is not installed or not in PATH.
    echo         It should come bundled with Node.js.
    goto :error_exit
)

for /f "tokens=*" %%v in ('npm --version 2^>nul') do set "NPM_VER=%%v"
echo  [INFO] npm version:     %NPM_VER%
echo.

:: -------------------------------------------------------
::  Install dependencies if node_modules is missing
:: -------------------------------------------------------
if not exist "node_modules\" (
    echo  [INFO] node_modules not found — running npm install...
    echo  [INFO] This may take a few minutes on first run.
    echo.
    call npm install
    if !ERRORLEVEL! neq 0 (
        echo.
        echo [ERROR] npm install failed. Check the output above for details.
        echo         Common fixes:
        echo           - Check your internet connection
        echo           - Delete package-lock.json and retry
        echo           - Run "npm cache clean --force" then retry
        goto :error_exit
    )
    echo.
    echo  [OK]   Dependencies installed successfully.
    echo.
)

:: -------------------------------------------------------
::  Start the Next.js development server
:: -------------------------------------------------------
echo  [INFO] Starting Next.js development server...
echo  [INFO] The app will be available at: http://localhost:3000
echo  [INFO] Press Ctrl+C to stop the server.
echo.
echo  =============================================
echo.

call npm run dev
if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] The Next.js server exited with an error.
    echo         Check the output above for details.
    goto :error_exit
)

goto :eof

:: -------------------------------------------------------
::  Error handler — pause so the user can read the message
:: -------------------------------------------------------
:error_exit
echo.
echo  Press any key to close this window...
pause >nul
exit /b 1

