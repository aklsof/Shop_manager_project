<#
.SYNOPSIS
    AKLI Shop Manager — Database Setup
.DESCRIPTION
    Creates the hybrid_store MySQL database, applies the main schema, and
    runs migration files in order.  Designed to be called by the MSI
    installer or run standalone.
.PARAMETER InstallDir
    Root installation directory (e.g. C:\Program Files\AKLIShop).
.PARAMETER DbHost
    MySQL hostname (default: localhost).
.PARAMETER DbPort
    MySQL port (default: 3306).
.PARAMETER DbUser
    MySQL user (default: root).
.PARAMETER DbPassword
    MySQL password (default: empty string).
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $false)]
    [string]$InstallDir = "",

    [string]$DbHost     = "localhost",
    [int]   $DbPort     = 3306,
    [string]$DbUser     = "root",
    [string]$DbPassword = ""
)

# ── Strict error handling ────────────────────────────────────────────────────
$ErrorActionPreference = 'Stop'

# ── Banner ───────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "   AKLI Shop Manager — Database Setup                       " -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# ── Resolve InstallDir ───────────────────────────────────────────────────────
if ([string]::IsNullOrWhiteSpace($InstallDir)) {
    # Try the MSI property via environment variable
    if ($env:INSTALLFOLDER) {
        $InstallDir = $env:INSTALLFOLDER
    } elseif ($env:INSTALLDIR) {
        $InstallDir = $env:INSTALLDIR
    } else {
        $InstallDir = "C:\Program Files\AKLIShop"
    }
}

$InstallDir = $InstallDir.TrimEnd('\')
Write-Host "[INFO] Install directory : $InstallDir" -ForegroundColor Gray
Write-Host "[INFO] Database target   : $DbUser@$DbHost`:$DbPort / hybrid_store" -ForegroundColor Gray
Write-Host ""

# ── Locate mysql.exe ─────────────────────────────────────────────────────────
function Find-MySqlExe {
    # 1. Check PATH
    try {
        $cmd = Get-Command mysql -ErrorAction Stop
        return $cmd.Source
    } catch { <# not on PATH #> }

    # 2. Check common install locations (newest first)
    $candidates = @(
        "C:\Program Files\MySQL\MySQL Server 9.0\bin\mysql.exe",
        "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe",
        "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe",
        "C:\Program Files\MySQL\MySQL Server 5.7\bin\mysql.exe",
        "C:\xampp\mysql\bin\mysql.exe"
    )
    foreach ($path in $candidates) {
        if (Test-Path $path) { return $path }
    }

    return $null
}

$mysqlExe = Find-MySqlExe
if (-not $mysqlExe) {
    Write-Host "[ERROR] mysql.exe not found on PATH or in common locations." -ForegroundColor Red
    Write-Host "        Please install MySQL Server and ensure mysql.exe is accessible." -ForegroundColor Red
    Write-Host ""
    Write-Host "        The MySQL Community Installer was installed by the setup wizard." -ForegroundColor Yellow
    Write-Host "        Please run it to install MySQL Server, then re-run this script." -ForegroundColor Yellow
    exit 1603
}

Write-Host "[OK] mysql.exe located at: $mysqlExe" -ForegroundColor Green

# ── Helper: build mysql arguments array ──────────────────────────────────────
function Get-MySqlArgs {
    $args = @(
        "--host=$DbHost",
        "--port=$DbPort",
        "--user=$DbUser",
        "--default-character-set=utf8mb4"
    )
    if ($DbPassword -ne "") {
        $args += "--password=$DbPassword"
    }
    return $args
}

# ── Helper: run a SQL string ────────────────────────────────────────────────
function Invoke-MySql {
    param(
        [string]$Sql,
        [string]$Description
    )
    Write-Host "  -> $Description" -ForegroundColor White

    $mysqlArgs = Get-MySqlArgs
    $mysqlArgs += "-e"
    $mysqlArgs += $Sql

    $output = & $mysqlExe @mysqlArgs 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "MySQL command failed (exit $LASTEXITCODE): $output"
    }
    return $output
}

# ── Helper: run a SQL file using SOURCE (supports DELIMITER) ────────────────
function Invoke-MySqlFile {
    param(
        [string]$FilePath,
        [string]$Database,
        [string]$Description
    )
    if (-not (Test-Path $FilePath)) {
        Write-Host "  [WARN] File not found, skipping: $FilePath" -ForegroundColor Yellow
        return
    }
    Write-Host "  -> $Description ($FilePath)" -ForegroundColor White

    # Use SOURCE command instead of piping. SOURCE is processed by the mysql
    # client itself (not sent to the server), so it supports DELIMITER statements.
    $absPath = (Resolve-Path $FilePath).Path
    # MySQL SOURCE command uses forward slashes
    $mysqlPath = $absPath -replace '\\', '/'

    $mysqlArgs = Get-MySqlArgs
    $mysqlArgs += $Database
    $mysqlArgs += "-e"
    $mysqlArgs += "SOURCE $mysqlPath;"

    $output = & $mysqlExe @mysqlArgs 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "MySQL file execution failed (exit $LASTEXITCODE): $output"
    }
    return $output
}

# ── Main Setup ──────────────────────────────────────────────────────────────
try {
    # Step 0: Ensure MySQL is initialized and running
    Write-Host ""
    Write-Host "[Step 0/5] Checking MySQL Service State..." -ForegroundColor Cyan

    # Find mysqld.exe (same directory as mysql.exe)
    $mysqlBinDir = Split-Path $mysqlExe -Parent
    $mysqldExe = Join-Path $mysqlBinDir "mysqld.exe"

    # Check for MySQL service under common names
    $svcNames = @("MySQL", "MySQL80", "MySQL84", "MySQL90", "MySql57")
    $runningService = $null
    foreach ($svcName in $svcNames) {
        $svc = Get-Service -Name $svcName -ErrorAction SilentlyContinue
        if ($svc) {
            if ($svc.Status -ne 'Running') {
                Write-Host "  -> Starting $svcName service..." -ForegroundColor White
                Start-Service -Name $svcName -ErrorAction SilentlyContinue
                Start-Sleep -Seconds 5
            }
            $runningService = $svcName
            break
        }
    }

    if (-not $runningService) {
        Write-Host "  [WARN] No standard MySQL Windows service found." -ForegroundColor Yellow
        if ($mysqlExe -match "xampp") {
            Write-Host "  [INFO] It looks like you have XAMPP installed." -ForegroundColor Cyan
            Write-Host "         If you haven't already, please open the XAMPP Control Panel" -ForegroundColor Cyan
            Write-Host "         and click 'Start' next to MySQL before continuing." -ForegroundColor Cyan
        }
        Write-Host "  [INFO] Trying to connect anyway (in case it is running manually)..." -ForegroundColor Gray
    } else {
        Write-Host "  [OK] MySQL service '$runningService' is running." -ForegroundColor Green
    }

    # Step 1: Test connectivity
    Write-Host ""
    Write-Host "[Step 1/5] Testing MySQL connectivity..." -ForegroundColor Cyan
    Invoke-MySql -Sql "SELECT 1;" -Description "Ping MySQL server"
    Write-Host "  [OK] MySQL server is reachable." -ForegroundColor Green

    # Step 2: Create database
    Write-Host ""
    Write-Host "[Step 2/5] Creating database..." -ForegroundColor Cyan
    $createSql = "CREATE DATABASE IF NOT EXISTS hybrid_store CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
    Invoke-MySql -Sql $createSql -Description "CREATE DATABASE IF NOT EXISTS hybrid_store"
    Write-Host "  [OK] Database 'hybrid_store' ready." -ForegroundColor Green

    # Step 3: Apply main schema (tables, seed data, views, triggers)
    # Uses SOURCE command to support DELIMITER statements for triggers
    Write-Host ""
    Write-Host "[Step 3/5] Applying main schema..." -ForegroundColor Cyan
    $schemaFile = Join-Path $InstallDir "Database\Hybrid_store_DB_v4.sql"
    Invoke-MySqlFile -FilePath $schemaFile -Database "hybrid_store" -Description "Main schema (tables + views + triggers)"
    Write-Host "  [OK] Main schema applied." -ForegroundColor Green

    # Step 4: Apply migrations in order (idempotent — safe to re-run)
    Write-Host ""
    Write-Host "[Step 4/5] Applying migrations..." -ForegroundColor Cyan
    $migrations = @(
        "add_product_categories.sql",
        "fix_category_integrity.sql"
    )
    foreach ($migration in $migrations) {
        $migrationFile = Join-Path $InstallDir "Database\$migration"
        Invoke-MySqlFile -FilePath $migrationFile -Database "hybrid_store" -Description "Migration: $migration"
    }
    Write-Host "  [OK] Migrations applied." -ForegroundColor Green

    # Step 5: Verify
    Write-Host ""
    Write-Host "[Step 5/5] Verifying database..." -ForegroundColor Cyan
    $tables = Invoke-MySql -Sql "SHOW TABLES FROM hybrid_store;" -Description "List tables"

    # Parse table count (skip the header line)
    $tableLines = ($tables | Out-String).Trim().Split("`n") | Where-Object { $_.Trim() -ne "" }
    # First line is the header "Tables_in_hybrid_store", rest are table names
    $tableCount = [Math]::Max(0, $tableLines.Count - 1)

    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Green
    Write-Host "   Database Setup Complete                                   " -ForegroundColor Green
    Write-Host "============================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "   Database : hybrid_store" -ForegroundColor White
    Write-Host "   Host     : $DbHost`:$DbPort" -ForegroundColor White
    Write-Host "   User     : $DbUser" -ForegroundColor White
    Write-Host "   Tables   : $tableCount table(s) created" -ForegroundColor White
    Write-Host "   Status   : SUCCESS" -ForegroundColor Green
    Write-Host ""

    exit 0
}
catch {
    Write-Host ""
    Write-Host "[ERROR] Database setup failed!" -ForegroundColor Red
    Write-Host "        $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Troubleshooting:" -ForegroundColor Yellow
    Write-Host "  1. Is MySQL Server running? (check Services > MySQL)" -ForegroundColor Yellow
    Write-Host "  2. Can you connect manually?  mysql -u root -h localhost" -ForegroundColor Yellow
    Write-Host "  3. Is the schema file present at:" -ForegroundColor Yellow
    Write-Host "     $InstallDir\Database\Hybrid_store_DB_v4.sql" -ForegroundColor Yellow
    Write-Host ""
    exit 1603
}
