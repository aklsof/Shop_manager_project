<#
.SYNOPSIS
    AKLI Shop Manager — POS Application Setup
.DESCRIPTION
    Configures the Python POS (Point of Sale) application: generates the
    .env configuration file, creates a virtual environment, and installs
    pip dependencies from requirements.txt.
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
Write-Host "   AKLI Shop Manager — POS Application Setup                " -ForegroundColor Cyan
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
$posAppDir  = Join-Path $InstallDir "POSApp"

Write-Host "[INFO] Install directory : $InstallDir" -ForegroundColor Gray
Write-Host "[INFO] POSApp directory  : $posAppDir" -ForegroundColor Gray
Write-Host ""

# ── Validate directory ──────────────────────────────────────────────────────
if (-not (Test-Path $posAppDir)) {
    Write-Host "[ERROR] POSApp directory not found: $posAppDir" -ForegroundColor Red
    exit 1603
}

# ── Locate Python executable ────────────────────────────────────────────────
$pythonExe = $null

foreach ($cmd in @('python', 'py')) {
    try {
        $found = Get-Command $cmd -ErrorAction Stop
        # Verify it actually runs
        $ver = & $found.Source --version 2>&1
        $pythonExe = $found.Source
        Write-Host "[OK] Python found: $cmd ($ver)" -ForegroundColor Green
        break
    } catch { <# try next #> }
}

if (-not $pythonExe) {
    Write-Host "[ERROR] Python not found. Please install Python 3.x first." -ForegroundColor Red
    exit 1603
}

# ── Main Setup ──────────────────────────────────────────────────────────────
try {
    # Step 1: Create .env file
    Write-Host ""
    Write-Host "[Step 1/4] Creating .env configuration..." -ForegroundColor Cyan

    $envContent = @"
# ── AKLI Shop Manager — POS Application Environment ──
# Generated on $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')

# --- DATABASE CONNECTION ---
DB_HOST=localhost
DB_PORT=3306
DB_NAME=hybrid_store
DB_USER=root
DB_PASSWORD=
DB_SSL=false
"@

    $envFile = Join-Path $posAppDir ".env"
    Set-Content -Path $envFile -Value $envContent -Encoding UTF8
    Write-Host "  [OK] .env file created" -ForegroundColor Green

    # Step 2: Create virtual environment
    Write-Host ""
    Write-Host "[Step 2/4] Creating Python virtual environment..." -ForegroundColor Cyan

    $venvDir = Join-Path $posAppDir "venv"

    if (Test-Path $venvDir) {
        Write-Host "  [INFO] Virtual environment already exists, recreating..." -ForegroundColor Yellow
        Remove-Item -Path $venvDir -Recurse -Force -ErrorAction SilentlyContinue
    }

    Push-Location $posAppDir
    try {
        & $pythonExe -m venv venv 2>&1 | Out-String | ForEach-Object {
            if ($_.Trim()) { Write-Host "  $_" -ForegroundColor Gray }
        }
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to create virtual environment (exit $LASTEXITCODE)."
        }
    } finally {
        Pop-Location
    }

    Write-Host "  [OK] Virtual environment created at: $venvDir" -ForegroundColor Green

    # Step 3: Install dependencies
    Write-Host ""
    Write-Host "[Step 3/4] Installing Python dependencies..." -ForegroundColor Cyan
    Write-Host "  This may take a few minutes..." -ForegroundColor Gray

    $pipExe          = Join-Path $venvDir "Scripts\pip.exe"
    $requirementsFile = Join-Path $posAppDir "requirements.txt"

    if (-not (Test-Path $pipExe)) {
        throw "pip.exe not found at $pipExe — virtual environment creation may have failed."
    }

    if (-not (Test-Path $requirementsFile)) {
        Write-Host "  [WARN] requirements.txt not found at $requirementsFile" -ForegroundColor Yellow
        Write-Host "  [WARN] Skipping dependency installation." -ForegroundColor Yellow
    } else {
        $pipResult = & $pipExe install -r $requirementsFile 2>&1 | Out-String
        if ($LASTEXITCODE -ne 0) {
            throw "pip install failed (exit $LASTEXITCODE):`n$pipResult"
        }
        Write-Host "  [OK] Dependencies installed" -ForegroundColor Green
    }

    # Step 4: Verify
    Write-Host ""
    Write-Host "[Step 4/4] Verifying installation..." -ForegroundColor Cyan

    $venvPython = Join-Path $venvDir "Scripts\python.exe"
    if (-not (Test-Path $venvPython)) {
        throw "venv python.exe not found at $venvPython — setup may have failed."
    }

    $venvPyVer = & $venvPython --version 2>&1
    Write-Host "  [OK] venv Python: $venvPyVer" -ForegroundColor Green

    # ── Success ─────────────────────────────────────────────────────────────
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Green
    Write-Host "   POS Application Setup Complete                           " -ForegroundColor Green
    Write-Host "============================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "   Directory : $posAppDir" -ForegroundColor White
    Write-Host "   Env file  : .env" -ForegroundColor White
    Write-Host "   Venv      : $venvDir" -ForegroundColor White
    Write-Host "   Status    : SUCCESS" -ForegroundColor Green
    Write-Host ""

    exit 0
}
catch {
    Write-Host ""
    Write-Host "[ERROR] POS application setup failed!" -ForegroundColor Red
    Write-Host "        $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    exit 1603
}

