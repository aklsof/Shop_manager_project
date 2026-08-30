<#
.SYNOPSIS
    AKLI Shop Manager — Prerequisite Checker
.DESCRIPTION
    Validates that MySQL Server, Node.js, and Python are installed on the
    system before the MSI installer proceeds.  When run from the installer
    context, a missing prerequisite causes exit code 1603 (MSI fatal error)
    which halts the installation.
.PARAMETER SkipMissing
    When set, the script exits 0 even when prerequisites are missing.
    Useful for development / testing.
#>

[CmdletBinding()]
param(
    [switch]$SkipMissing
)

# ── Strict error handling ────────────────────────────────────────────────────
$ErrorActionPreference = 'Stop'

# ── Banner ───────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "   AKLI Shop Manager — Prerequisite Check                   " -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# ── Helper: find an executable on PATH or common locations ───────────────────
function Test-CommandAvailable {
    param([string]$Command)
    try {
        $null = Get-Command $Command -ErrorAction Stop
        return $true
    } catch {
        return $false
    }
}

# ── Results accumulator ─────────────────────────────────────────────────────
$missing = @()

# ─────────────────────────────────────────────────────────────────────────────
#  1. MySQL Server
# ─────────────────────────────────────────────────────────────────────────────
Write-Host "Checking MySQL Server..." -ForegroundColor White -NoNewline
$mysqlFound = $false

try {
    if (Test-CommandAvailable 'mysql') {
        $ver = & mysql --version 2>&1
        Write-Host "  [OK]  $ver" -ForegroundColor Green
        $mysqlFound = $true
    }
} catch { <# swallow #> }

if (-not $mysqlFound) {
    # Fallback: check common install paths
    $mysqlPaths = @(
        "C:\Program Files\MySQL\MySQL Server 9.0\bin\mysql.exe",
        "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe",
        "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe",
        "C:\xampp\mysql\bin\mysql.exe"
    )
    foreach ($p in $mysqlPaths) {
        if (Test-Path $p) {
            try {
                $ver = & $p --version 2>&1
                Write-Host "  [OK]  Found at $p — $ver" -ForegroundColor Green
                $mysqlFound = $true
                break
            } catch { <# continue #> }
        }
    }
}

if (-not $mysqlFound) {
    # Fallback: check registry
    try {
        $regKeys = Get-ChildItem "HKLM:\SOFTWARE\MySQL AB\" -ErrorAction Stop
        if ($regKeys.Count -gt 0) {
            Write-Host "  [OK]  Found via registry (MySQL AB)" -ForegroundColor Green
            $mysqlFound = $true
        }
    } catch { <# not found #> }
}

if (-not $mysqlFound) {
    Write-Host "  [MISSING]" -ForegroundColor Red
    $missing += @{
        Name = "MySQL Server"
        Url  = "https://dev.mysql.com/downloads/installer/"
    }
}

# ─────────────────────────────────────────────────────────────────────────────
#  2. Node.js
# ─────────────────────────────────────────────────────────────────────────────
Write-Host "Checking Node.js..." -ForegroundColor White -NoNewline
$nodeFound = $false

try {
    if (Test-CommandAvailable 'node') {
        $ver = & node --version 2>&1
        Write-Host "  [OK]  Node.js $ver" -ForegroundColor Green
        $nodeFound = $true
    }
} catch { <# swallow #> }

if (-not $nodeFound) {
    try {
        $regKey = Get-ItemProperty "HKLM:\SOFTWARE\Node.js" -ErrorAction Stop
        if ($regKey) {
            Write-Host "  [OK]  Found via registry" -ForegroundColor Green
            $nodeFound = $true
        }
    } catch { <# not found #> }
}

if (-not $nodeFound) {
    Write-Host "  [MISSING]" -ForegroundColor Red
    $missing += @{
        Name = "Node.js"
        Url  = "https://nodejs.org/"
    }
}

# ─────────────────────────────────────────────────────────────────────────────
#  3. Python
# ─────────────────────────────────────────────────────────────────────────────
Write-Host "Checking Python..." -ForegroundColor White -NoNewline
$pythonFound = $false

# Try 'python' first, then 'py' launcher
foreach ($cmd in @('python', 'py')) {
    try {
        if (Test-CommandAvailable $cmd) {
            $ver = & $cmd --version 2>&1
            Write-Host "  [OK]  $ver" -ForegroundColor Green
            $pythonFound = $true
            break
        }
    } catch { <# swallow #> }
}

if (-not $pythonFound) {
    try {
        $regKeys = Get-ChildItem "HKLM:\SOFTWARE\Python\PythonCore\" -ErrorAction Stop
        if ($regKeys.Count -gt 0) {
            Write-Host "  [OK]  Found via registry (PythonCore)" -ForegroundColor Green
            $pythonFound = $true
        }
    } catch { <# not found #> }
}

if (-not $pythonFound) {
    Write-Host "  [MISSING]" -ForegroundColor Red
    $missing += @{
        Name = "Python"
        Url  = "https://www.python.org/downloads/"
    }
}

# ─────────────────────────────────────────────────────────────────────────────
#  Summary
# ─────────────────────────────────────────────────────────────────────────────
Write-Host ""

if ($missing.Count -eq 0) {
    Write-Host "All prerequisites are installed." -ForegroundColor Green
    Write-Host ""
    exit 0
}

# Build a human-readable list of missing items
$listText = "The following prerequisites are missing:`n`n"
foreach ($item in $missing) {
    $listText += "  - $($item.Name): $($item.Url)`n"
}
$listText += "`nPlease install them and re-run the installer."

Write-Host $listText -ForegroundColor Yellow

# ── Show a Windows message box (works both from MSI and standalone) ─────────
try {
    Add-Type -AssemblyName System.Windows.Forms -ErrorAction Stop

    $caption = "AKLI Shop Manager — Missing Prerequisites"
    $body    = "The following software must be installed before continuing:`n`n"
    foreach ($item in $missing) {
        $body += "• $($item.Name)`n   $($item.Url)`n`n"
    }
    $body += "Click OK to open the download pages in your browser."

    [System.Windows.Forms.MessageBox]::Show(
        $body,
        $caption,
        [System.Windows.Forms.MessageBoxButtons]::OK,
        [System.Windows.Forms.MessageBoxIcon]::Warning
    ) | Out-Null

    # Open download pages in the default browser
    foreach ($item in $missing) {
        try { Start-Process $item.Url } catch { <# best effort #> }
    }
} catch {
    # If we can't show a GUI (e.g. headless CI), just log it
    Write-Host "[INFO] Could not display message box: $_" -ForegroundColor DarkYellow
}

# ── Exit ────────────────────────────────────────────────────────────────────
if ($SkipMissing) {
    Write-Host "[SkipMissing] Exiting with code 0 despite missing prerequisites." -ForegroundColor Yellow
    exit 0
} else {
    Write-Host "Exiting with code 1603 (MSI fatal error) — install halted." -ForegroundColor Red
    exit 1603
}

