@echo off
setlocal EnableDelayedExpansion

:: ============================================================
::  AKLI Shop Manager — POS Register Launcher
::  Starts the Python-based Point-of-Sale application
:: ============================================================

title AKLI POS Register

echo.
echo  =============================================
echo   _    _  _ _    ___   ___  _  _  ___  ___
echo  / \  ^| ^|/ / ^|  ^|_ _^| / __^|^| ^|^| ^|/ _ \^| _ \
echo  \_/  ^|   ^<^| ^|__ ^| ^|  \__ \^| __ ^| (_) ^|  _/
echo       ^|_^|\_\____^|___^| ^|___/^|_^|^|_^|\___/^|_^|
echo.
echo   AKLI Shop Manager - POS Register
echo  =============================================
echo.

:: -------------------------------------------------------
::  Navigate to the POSApp directory (relative to script)
:: -------------------------------------------------------
set "POSAPP_DIR=%~dp0..\POSApp"
cd /d "%POSAPP_DIR%" 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Could not find POSApp directory:
    echo         %POSAPP_DIR%
    echo.
    echo  Please verify the installation is intact.
    goto :error_exit
)

echo  [INFO] Working directory: %CD%
echo.

:: -------------------------------------------------------
::  Check that Python is available
:: -------------------------------------------------------
where python >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Python is not installed or not in PATH.
    echo         Please install Python 3.10+ from https://python.org
    echo         Make sure to check "Add Python to PATH" during install.
    goto :error_exit
)

for /f "tokens=*" %%v in ('python --version 2^>nul') do set "PY_VER=%%v"
echo  [INFO] %PY_VER%
echo.

:: -------------------------------------------------------
::  Create virtual environment if it doesn't exist
:: -------------------------------------------------------
if not exist "venv\" (
    echo  [INFO] Virtual environment not found — creating venv...
    echo.
    python -m venv venv
    if !ERRORLEVEL! neq 0 (
        echo.
        echo [ERROR] Failed to create virtual environment.
        echo         Common fixes:
        echo           - Ensure Python 3.10+ is installed
        echo           - Run: python -m pip install --upgrade pip
        echo           - Check write permissions in this directory
        goto :error_exit
    )
    echo  [OK]   Virtual environment created.
    echo.

    :: Activate and install requirements
    call venv\Scripts\activate.bat
    if !ERRORLEVEL! neq 0 (
        echo [ERROR] Failed to activate virtual environment.
        goto :error_exit
    )

    if exist "requirements.txt" (
        echo  [INFO] Installing dependencies from requirements.txt...
        echo.
        pip install -r requirements.txt
        if !ERRORLEVEL! neq 0 (
            echo.
            echo [ERROR] pip install failed. Check the output above.
            echo         Common fixes:
            echo           - Check your internet connection
            echo           - Try: pip install --upgrade pip
            echo           - Delete the venv folder and relaunch
            goto :error_exit
        )
        echo.
        echo  [OK]   Dependencies installed successfully.
    ) else (
        echo  [WARN] No requirements.txt found — skipping dependency install.
    )
    echo.
) else (
    :: Activate existing virtual environment
    echo  [INFO] Activating virtual environment...
    call venv\Scripts\activate.bat
    if !ERRORLEVEL! neq 0 (
        echo [ERROR] Failed to activate virtual environment.
        echo         Try deleting the venv folder and relaunching.
        goto :error_exit
    )
    echo  [OK]   Virtual environment activated.
    echo.
)

:: -------------------------------------------------------
::  Launch the POS application
:: -------------------------------------------------------
echo  [INFO] Starting POS Register application...
echo  [INFO] Press Ctrl+C to stop the application.
echo.
echo  =============================================
echo.

python main.py
if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] The POS application exited with an error (code: %ERRORLEVEL%).
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

