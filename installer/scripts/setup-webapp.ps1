<#
.SYNOPSIS
    AKLI Shop Manager — Web Application Setup
.DESCRIPTION
    Configures the Next.js web application: generates .env.local with a
    random session secret, installs npm dependencies, and runs the
    production build.
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
Write-Host "   AKLI Shop Manager — Web Application Setup                " -ForegroundColor Cyan
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
$webAppDir  = Join-Path $InstallDir "WebApp"

Write-Host "[INFO] Install directory : $InstallDir" -ForegroundColor Gray
Write-Host "[INFO] WebApp directory  : $webAppDir" -ForegroundColor Gray
Write-Host ""

# ── Validate directory ──────────────────────────────────────────────────────
if (-not (Test-Path $webAppDir)) {
    Write-Host "[ERROR] WebApp directory not found: $webAppDir" -ForegroundColor Red
    exit 1603
}

# ── Verify Node.js / npm are available ──────────────────────────────────────
try {
    $nodeVer = & node --version 2>&1
    $npmVer  = & npm --version 2>&1
    Write-Host "[OK] Node.js $nodeVer / npm $npmVer" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Node.js or npm not found. Please install Node.js first." -ForegroundColor Red
    exit 1603
}

# ── Main Setup ──────────────────────────────────────────────────────────────
try {
    # Step 1: Generate .env.local
    Write-Host ""
    Write-Host "[Step 1/4] Creating .env.local..." -ForegroundColor Cyan

    # Generate a cryptographically random 64-character hex string
    $rng   = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $bytes = New-Object byte[] 32
    $rng.GetBytes($bytes)
    $sessionSecret = ($bytes | ForEach-Object { $_.ToString("x2") }) -join ''

    $envContent = @"
# ── AKLI Shop Manager — Web Application Environment ──
# Generated on $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')

DB_HOST=localhost
DB_PORT=3306
DB_NAME=hybrid_store
DB_USER=root
DB_PASSWORD=
SESSION_SECRET=$sessionSecret
"@

    $envFile = Join-Path $webAppDir ".env.local"
    Set-Content -Path $envFile -Value $envContent -Encoding UTF8
    Write-Host "  [OK] .env.local created" -ForegroundColor Green
    Write-Host "  [OK] SESSION_SECRET generated (64 hex chars)" -ForegroundColor Green

    # Step 2: npm install
    Write-Host ""
    Write-Host "[Step 2/4] Installing npm dependencies..." -ForegroundColor Cyan
    Write-Host "  This may take a few minutes..." -ForegroundColor Gray

    $npmInstallResult = & npm install --production 2>&1 | Out-String
    if ($LASTEXITCODE -ne 0) {
        # Retry without --production in case devDependencies are needed for build
        Write-Host "  [WARN] npm install --production failed, retrying with full install..." -ForegroundColor Yellow
        $npmInstallResult = & npm install 2>&1 | Out-String
        if ($LASTEXITCODE -ne 0) {
            throw "npm install failed (exit $LASTEXITCODE):`n$npmInstallResult"
        }
    }
    Write-Host "  [OK] npm dependencies installed" -ForegroundColor Green

    # Step 3: Verify node_modules
    Write-Host ""
    Write-Host "[Step 3/4] Verifying installation..." -ForegroundColor Cyan

    $nodeModulesDir = Join-Path $webAppDir "node_modules"
    if (-not (Test-Path $nodeModulesDir)) {
        throw "node_modules directory was not created — npm install may have failed silently."
    }
    Write-Host "  [OK] node_modules directory exists" -ForegroundColor Green

    # Step 4: Build
    Write-Host ""
    Write-Host "[Step 4/4] Running production build (npm run build)..." -ForegroundColor Cyan
    Write-Host "  This may take a few minutes..." -ForegroundColor Gray

    # Set working directory for npm
    Push-Location $webAppDir
    try {
        $buildResult = & npm run build 2>&1 | Out-String
        if ($LASTEXITCODE -ne 0) {
            Write-Host "  [WARN] Build exited with code $LASTEXITCODE. The app may still work in dev mode." -ForegroundColor Yellow
            Write-Host "         You can retry later with: npm run build" -ForegroundColor Yellow
        } else {
            Write-Host "  [OK] Production build completed successfully" -ForegroundColor Green
        }
    } finally {
        Pop-Location
    }

    # ── Success ─────────────────────────────────────────────────────────────
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Green
    Write-Host "   Web Application Setup Complete                           " -ForegroundColor Green
    Write-Host "============================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "   Directory : $webAppDir" -ForegroundColor White
    Write-Host "   Env file  : .env.local" -ForegroundColor White
    Write-Host "   Status    : SUCCESS" -ForegroundColor Green
    Write-Host ""
    Write-Host "   To start the application:" -ForegroundColor Yellow
    Write-Host "     Run start-webapp.bat  or use:  npm run dev" -ForegroundColor Yellow
    Write-Host ""

    exit 0
}
catch {
    Write-Host ""
    Write-Host "[ERROR] Web application setup failed!" -ForegroundColor Red
    Write-Host "        $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    exit 1603
}

