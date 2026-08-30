@echo off
:: ============================================================
::   AKLI Shop Manager — Uninstall
:: ============================================================
::   This script triggers the standard Windows uninstall for
::   AKLI Shop Manager via the MSI/Bootstrapper mechanism.
::
::   It searches the Windows registry for the installed product
::   and invokes msiexec to perform a clean uninstall.
:: ============================================================

title AKLI Shop Manager — Uninstall
echo.
echo   ============================================================
echo     AKLI Shop Manager — Uninstall
echo   ============================================================
echo.

:: Check for administrator privileges
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo   [!] Administrator privileges required for uninstall.
    echo       Please right-click this file and select "Run as administrator".
    echo.
    pause
    exit /b 1
)

:: Ask for confirmation
echo   This will uninstall AKLI Shop Manager from your computer.
echo.
set /p "CONFIRM=  Are you sure you want to uninstall? (Y/N): "
if /i not "%CONFIRM%"=="Y" (
    echo.
    echo   Uninstall cancelled.
    echo.
    pause
    exit /b 0
)

echo.
echo   [1/2] Looking for AKLI Shop Manager installation...

:: Try to find the product via the Bootstrapper (setup.exe) UpgradeCode
:: Bootstrapper UpgradeCode: C1D2E3F4-0000-0000-0000-000000000001
set "BUNDLE_FOUND=0"
for /f "tokens=*" %%A in ('reg query "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall" /s /f "AKLI Shop Manager" /d 2^>nul ^| findstr /i "HKEY_"') do (
    for /f "tokens=2*" %%B in ('reg query "%%A" /v "UninstallString" 2^>nul ^| findstr /i "UninstallString"') do (
        set "UNINSTALL_CMD=%%C"
        set "BUNDLE_FOUND=1"
    )
)

if "%BUNDLE_FOUND%"=="1" (
    echo   [OK] Found AKLI Shop Manager installation.
    echo.
    echo   [2/2] Starting uninstall...
    echo.
    %UNINSTALL_CMD%
    goto :done
)

:: Fallback: Try MSI UpgradeCode directly
:: MSI UpgradeCode: {A1B2C3D4-E5F6-7890-ABCD-EF1234567890}
echo   [INFO] Bootstrapper entry not found, trying MSI directly...

for /f "tokens=*" %%A in ('reg query "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall" /s /f "AKLI Hybrid Store Manager" /d 2^>nul ^| findstr /i "HKEY_"') do (
    for /f "tokens=2*" %%B in ('reg query "%%A" /v "UninstallString" 2^>nul ^| findstr /i "UninstallString"') do (
        set "UNINSTALL_CMD=%%C"
        set "BUNDLE_FOUND=1"
    )
)

if "%BUNDLE_FOUND%"=="1" (
    echo   [OK] Found AKLI Shop Manager MSI installation.
    echo.
    echo   [2/2] Starting uninstall...
    echo.
    %UNINSTALL_CMD%
    goto :done
)

:: Last resort: try wmic
echo   [INFO] Registry entry not found, trying WMIC...
for /f "tokens=2 delims==" %%A in ('wmic product where "Name like '%%AKLI%%'" get IdentifyingNumber /value 2^>nul ^| findstr "IdentifyingNumber"') do (
    set "PRODUCT_CODE=%%A"
)

if defined PRODUCT_CODE (
    echo   [OK] Found product code: %PRODUCT_CODE%
    echo.
    echo   [2/2] Starting uninstall...
    echo.
    msiexec /x %PRODUCT_CODE%
    goto :done
)

:: Nothing found
echo.
echo   [ERROR] Could not find AKLI Shop Manager installation.
echo           The software may have already been uninstalled.
echo           You can also uninstall via Windows Settings ^> Apps.
echo.
pause
exit /b 1

:done
echo.
echo   Uninstall process initiated.
echo   Follow the on-screen prompts to complete the removal.
echo.
pause
exit /b 0
