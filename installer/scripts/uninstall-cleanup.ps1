<#
.SYNOPSIS
    AKLI Shop Manager — Uninstall Cleanup
.DESCRIPTION
    Cleanup script executed during uninstall.  Optionally drops the
    hybrid_store database (after user confirmation) and removes generated
    files and directories such as node_modules, .next, venv, etc.
.PARAMETER InstallDir
    Root installation directory (e.g. C:\Program Files\AKLIShop).
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $false)]
    [string]$InstallDir = ""
)

# ── Strict error handling ────────────────────────────────────────────────────
$ErrorActionPreference = 'Stop'

# ── Banner ───────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "   AKLI Shop Manager — Uninstall Cleanup                    " -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# ── Resolve InstallDir ───────────────────────────────────────────────────────
if ([string]::IsNullOrWhiteSpace($InstallDir)) {
    if ($env:INSTALLFOLDER) {
        $InstallDir = $env:INSTALLFOLDER
    } elseif ($env:INSTALLDIR) {
        $InstallDir = $env:INSTALLDIR
    } else {
        $InstallDir = "C:\Program Files\AKLIShop"
    }
}

$InstallDir = $InstallDir.TrimEnd('\')
Write-Host "[INFO] Install directory: $InstallDir" -ForegroundColor Gray
Write-Host ""

# ── Tracking ────────────────────────────────────────────────────────────────
$removedItems  = @()
$skippedItems  = @()
$failedItems   = @()

# ── Helper: locate mysql.exe ────────────────────────────────────────────────
function Find-MySqlExe {
    try {
        $cmd = Get-Command mysql -ErrorAction Stop
        return $cmd.Source
    } catch { <# not on PATH #> }

    $candidates = @(
        "C:\Program Files\MySQL\MySQL Server 9.0\bin\mysql.exe",
        "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe",
        "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe",
        "C:\xampp\mysql\bin\mysql.exe"
    )
    foreach ($path in $candidates) {
        if (Test-Path $path) { return $path }
    }
    return $null
}

# ── Helper: remove a path safely ────────────────────────────────────────────
function Remove-ItemSafely {
    param(
        [string]$Path,
        [switch]$Recurse
    )
    if (-not (Test-Path $Path)) {
        $script:skippedItems += $Path
        Write-Host "  [SKIP] Not found: $Path" -ForegroundColor DarkGray
        return
    }
    try {
        if ($Recurse) {
            Remove-Item -Path $Path -Recurse -Force -ErrorAction Stop
        } else {
            Remove-Item -Path $Path -Force -ErrorAction Stop
        }
        $script:removedItems += $Path
        Write-Host "  [DEL]  Removed: $Path" -ForegroundColor Green
    } catch {
        $script:failedItems += $Path
        Write-Host "  [FAIL] Could not remove: $Path — $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

# ─────────────────────────────────────────────────────────────────────────────
#  Step 1: Ask about database removal
# ─────────────────────────────────────────────────────────────────────────────
Write-Host "[Step 1/2] Database cleanup..." -ForegroundColor Cyan

$dropDatabase = $false

try {
    Add-Type -AssemblyName System.Windows.Forms -ErrorAction Stop

    $result = [System.Windows.Forms.MessageBox]::Show(
        "Do you want to remove the hybrid_store database?`n`nThis will permanently delete ALL store data (products, sales, etc.).",
        "AKLI Shop Manager — Database Removal",
        [System.Windows.Forms.MessageBoxButtons]::YesNo,
        [System.Windows.Forms.MessageBoxIcon]::Warning
    )

    if ($result -eq [System.Windows.Forms.DialogResult]::Yes) {
        $dropDatabase = $true
    }
} catch {
    # Non-interactive context (CI, headless) — skip database removal
    Write-Host "  [INFO] No GUI available; skipping database removal prompt." -ForegroundColor DarkYellow
    Write-Host "  [INFO] To remove the database manually, run:" -ForegroundColor DarkYellow
    Write-Host "         mysql -u root -e `"DROP DATABASE IF EXISTS hybrid_store;`"" -ForegroundColor DarkYellow
}

if ($dropDatabase) {
    $mysqlExe = Find-MySqlExe
    if ($mysqlExe) {
        Write-Host "  -> Dropping database hybrid_store..." -ForegroundColor White
        try {
            $dropResult = & $mysqlExe --host=localhost --port=3306 --user=root -e "DROP DATABASE IF EXISTS hybrid_store;" 2>&1
            if ($LASTEXITCODE -ne 0) {
                Write-Host "  [WARN] DROP DATABASE returned exit code $LASTEXITCODE" -ForegroundColor Yellow
                $failedItems += "hybrid_store database"
            } else {
                Write-Host "  [OK] Database hybrid_store dropped." -ForegroundColor Green
                $removedItems += "hybrid_store database"
            }
        } catch {
            Write-Host "  [WARN] Failed to drop database: $($_.Exception.Message)" -ForegroundColor Yellow
            $failedItems += "hybrid_store database"
        }
    } else {
        Write-Host "  [WARN] mysql.exe not found — cannot drop database." -ForegroundColor Yellow
        Write-Host "         Remove it manually if needed." -ForegroundColor Yellow
        $failedItems += "hybrid_store database (mysql.exe not found)"
    }
} else {
    Write-Host "  [INFO] Database removal skipped by user." -ForegroundColor Gray
    $skippedItems += "hybrid_store database"
}

# ─────────────────────────────────────────────────────────────────────────────
#  Step 2: Remove generated files and directories
# ─────────────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "[Step 2/2] Removing generated files..." -ForegroundColor Cyan

# WebApp artifacts
Remove-ItemSafely -Path (Join-Path $InstallDir "WebApp\node_modules") -Recurse
Remove-ItemSafely -Path (Join-Path $InstallDir "WebApp\.next")        -Recurse
Remove-ItemSafely -Path (Join-Path $InstallDir "WebApp\.env.local")

# POSApp artifacts
Remove-ItemSafely -Path (Join-Path $InstallDir "POSApp\venv")         -Recurse
Remove-ItemSafely -Path (Join-Path $InstallDir "POSApp\.env")
Remove-ItemSafely -Path (Join-Path $InstallDir "POSApp\__pycache__")  -Recurse

# ─────────────────────────────────────────────────────────────────────────────
#  Summary
# ─────────────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "   Uninstall Cleanup Summary                                " -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "   Removed  : $($removedItems.Count) item(s)" -ForegroundColor Green
Write-Host "   Skipped  : $($skippedItems.Count) item(s)" -ForegroundColor Gray
Write-Host "   Failed   : $($failedItems.Count) item(s)" -ForegroundColor $(if ($failedItems.Count -gt 0) { "Yellow" } else { "Gray" })
Write-Host ""

if ($failedItems.Count -gt 0) {
    Write-Host "   Items that could not be removed:" -ForegroundColor Yellow
    foreach ($item in $failedItems) {
        Write-Host "     - $item" -ForegroundColor Yellow
    }
    Write-Host ""
}

Write-Host "   Cleanup complete." -ForegroundColor Green
Write-Host ""

# Cleanup is best-effort — always exit 0 so uninstall can proceed
exit 0

