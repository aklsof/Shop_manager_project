<#
.SYNOPSIS
    AKLI Shop Manager — Installation Launcher

.DESCRIPTION
    Guides the user through installing required software dependencies
    (Node.js, Python, MySQL) before launching the AKLI Shop setup.
    
    This script checks for each prerequisite, displays what is missing,
    offers to open download pages in the browser, and waits for the user
    to install them before proceeding.

.EXAMPLE
    .\install-launcher.ps1
    .\install-launcher.ps1 -SetupExe ".\AKLIShop_Setup.exe"
#>

[CmdletBinding()]
param(
    [string]$SetupExe = ""
)

$ErrorActionPreference = 'Stop'
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition

# ==============================================================
#  Helper Functions
# ==============================================================
function Write-Banner {
    Clear-Host
    Write-Host ""
    Write-Host "  ============================================================" -ForegroundColor Cyan
    Write-Host "   AKLI Shop Manager — Installation Launcher" -ForegroundColor Cyan
    Write-Host "  ============================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "   This tool will check for required software and guide you" -ForegroundColor White
    Write-Host "   through installing any missing dependencies." -ForegroundColor White
    Write-Host ""
}

function Test-CommandAvailable {
    param([string]$Command)
    try {
        $null = Get-Command $Command -ErrorAction Stop
        return $true
    } catch {
        return $false
    }
}

# ==============================================================
#  Prerequisite Check Functions
# ==============================================================
function Test-NodeJS {
    # Check PATH
    if (Test-CommandAvailable 'node') {
        try {
            $ver = & node --version 2>&1
            if ($LASTEXITCODE -eq 0) {
                return @{ Found = $true; Version = "Node.js $ver" }
            }
        } catch { }
    }
    # Check common install paths
    $paths = @(
        "$env:ProgramFiles\nodejs\node.exe",
        "${env:ProgramFiles(x86)}\nodejs\node.exe"
    )
    foreach ($p in $paths) {
        if (Test-Path $p) {
            try {
                $ver = & $p --version 2>&1
                return @{ Found = $true; Version = "Node.js $ver (at $p)" }
            } catch { }
        }
    }
    # Check registry
    try {
        $null = Get-ItemProperty "HKLM:\SOFTWARE\Node.js" -ErrorAction Stop
        return @{ Found = $true; Version = "Node.js (detected via registry)" }
    } catch { }
    
    return @{ Found = $false; Version = $null }
}

function Test-Python {
    foreach ($cmd in @('python', 'py')) {
        if (Test-CommandAvailable $cmd) {
            try {
                $ver = & $cmd --version 2>&1
                if ($LASTEXITCODE -eq 0) {
                    return @{ Found = $true; Version = "$ver" }
                }
            } catch { }
        }
    }
    # Check common install paths
    $paths = @(
        "$env:LOCALAPPDATA\Programs\Python\Python312\python.exe",
        "$env:LOCALAPPDATA\Programs\Python\Python311\python.exe",
        "$env:ProgramFiles\Python312\python.exe",
        "$env:ProgramFiles\Python311\python.exe"
    )
    foreach ($p in $paths) {
        if (Test-Path $p) {
            try {
                $ver = & $p --version 2>&1
                return @{ Found = $true; Version = "$ver (at $p)" }
            } catch { }
        }
    }
    # Check registry
    try {
        $regKeys = Get-ChildItem "HKLM:\SOFTWARE\Python\PythonCore\" -ErrorAction Stop
        if ($regKeys.Count -gt 0) {
            return @{ Found = $true; Version = "Python (detected via registry)" }
        }
    } catch { }
    
    return @{ Found = $false; Version = $null }
}

function Test-MySQL {
    # Check PATH
    if (Test-CommandAvailable 'mysql') {
        try {
            $ver = & mysql --version 2>&1
            if ($LASTEXITCODE -eq 0) {
                return @{ Found = $true; Version = "$ver" }
            }
        } catch { }
    }
    # Check common install paths
    $paths = @(
        "C:\Program Files\MySQL\MySQL Server 9.0\bin\mysql.exe",
        "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe",
        "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe",
        "C:\xampp\mysql\bin\mysql.exe"
    )
    foreach ($p in $paths) {
        if (Test-Path $p) {
            try {
                $ver = & $p --version 2>&1
                return @{ Found = $true; Version = "MySQL ($ver)" }
            } catch { }
        }
    }
    # Check Windows service
    $svcNames = @("MySQL", "MySQL80", "MySQL84", "MySQL90", "MySQL57")
    foreach ($svcName in $svcNames) {
        $svc = Get-Service -Name $svcName -ErrorAction SilentlyContinue
        if ($svc) {
            return @{ Found = $true; Version = "MySQL (service: $svcName — $($svc.Status))" }
        }
    }
    # Check registry
    try {
        $regKeys = Get-ChildItem "HKLM:\SOFTWARE\MySQL AB\" -ErrorAction Stop
        if ($regKeys.Count -gt 0) {
            return @{ Found = $true; Version = "MySQL (detected via registry)" }
        }
    } catch { }
    
    return @{ Found = $false; Version = $null }
}

# ==============================================================
#  Locate Setup EXE
# ==============================================================
function Find-SetupExe {
    if ($SetupExe -ne "" -and (Test-Path $SetupExe)) {
        return (Resolve-Path $SetupExe).Path
    }

    # Look in common locations relative to this script
    $candidates = @(
        (Join-Path $ScriptDir "..\output\*.exe"),
        (Join-Path $ScriptDir "..\bootstrapper\bin\x64\Release\*.exe"),
        (Join-Path $ScriptDir "..\bootstrapper\bin\Release\*.exe"),
        (Join-Path $ScriptDir "..\..\AKLIShop_Setup.exe"),
        (Join-Path $ScriptDir "..\AKLIShop_Setup.exe")
    )

    foreach ($pattern in $candidates) {
        $files = Get-ChildItem -Path $pattern -File -ErrorAction SilentlyContinue | 
                 Sort-Object LastWriteTime -Descending
        if ($files.Count -gt 0) {
            return $files[0].FullName
        }
    }

    return $null
}

# ==============================================================
#  Main Loop
# ==============================================================
$prerequisites = @(
    @{
        Name     = "Node.js (LTS)"
        TestFunc = "Test-NodeJS"
        Url      = "https://nodejs.org/"
        Note     = "Download and run the LTS installer. Use default settings."
    },
    @{
        Name     = "Python 3.12+"
        TestFunc = "Test-Python"
        Url      = "https://www.python.org/downloads/"
        Note     = "Check 'Add python.exe to PATH' during installation."
    },
    @{
        Name     = "MySQL Server 8.0+"
        TestFunc = "Test-MySQL"
        Url      = "https://dev.mysql.com/downloads/installer/"
        Note     = "Install MySQL Server via the MySQL Installer. Remember your root password."
    }
)

$attempt = 0

while ($true) {
    $attempt++
    
    if ($attempt -eq 1) {
        Write-Banner
    }

    Write-Host "  ------------------------------------------------------------" -ForegroundColor DarkGray
    Write-Host "   Checking Prerequisites (Attempt $attempt)" -ForegroundColor Yellow
    Write-Host "  ------------------------------------------------------------" -ForegroundColor DarkGray
    Write-Host ""

    $missing = @()
    $allFound = $true

    foreach ($prereq in $prerequisites) {
        $result = & $prereq.TestFunc
        
        if ($result.Found) {
            Write-Host "   [OK]      $($prereq.Name)" -ForegroundColor Green
            Write-Host "             $($result.Version)" -ForegroundColor DarkGray
        } else {
            Write-Host "   [MISSING] $($prereq.Name)" -ForegroundColor Red
            Write-Host "             $($prereq.Note)" -ForegroundColor DarkGray
            $missing += $prereq
            $allFound = $false
        }
        Write-Host ""
    }

    # ── All prerequisites found ──────────────────────────────────
    if ($allFound) {
        Write-Host "  ============================================================" -ForegroundColor Green
        Write-Host "   All prerequisites are installed!" -ForegroundColor Green
        Write-Host "  ============================================================" -ForegroundColor Green
        Write-Host ""

        $setupPath = Find-SetupExe
        if ($setupPath) {
            Write-Host "   Launching AKLI Shop Manager Setup..." -ForegroundColor Cyan
            Write-Host "   $setupPath" -ForegroundColor DarkGray
            Write-Host ""
            Start-Process -FilePath $setupPath
            Write-Host "   Setup launched successfully." -ForegroundColor Green
            Write-Host "   You can close this window." -ForegroundColor White
            Write-Host ""
            Read-Host "   Press Enter to exit"
            exit 0
        } else {
            Write-Host "   [WARN] Could not find AKLIShop_Setup.exe automatically." -ForegroundColor Yellow
            Write-Host "          Please run the setup EXE manually from the installer output folder." -ForegroundColor Yellow
            Write-Host ""
            Read-Host "   Press Enter to exit"
            exit 0
        }
    }

    # ── Missing prerequisites ────────────────────────────────────
    Write-Host "  ------------------------------------------------------------" -ForegroundColor DarkGray
    Write-Host "   $($missing.Count) prerequisite(s) missing. Please install them to continue." -ForegroundColor Yellow
    Write-Host "  ------------------------------------------------------------" -ForegroundColor DarkGray
    Write-Host ""

    # List download URLs
    Write-Host "   Download pages:" -ForegroundColor White
    foreach ($item in $missing) {
        Write-Host "     - $($item.Name): $($item.Url)" -ForegroundColor Cyan
    }
    Write-Host ""

    # Offer to open download pages
    $openChoice = Read-Host "   Open download pages in your browser? (Y/N)"
    if ($openChoice -match '^[Yy]') {
        foreach ($item in $missing) {
            try { Start-Process $item.Url } catch { }
            Start-Sleep -Milliseconds 500
        }
        Write-Host ""
        Write-Host "   Download pages opened in your browser." -ForegroundColor Green
    }

    Write-Host ""
    Write-Host "  ============================================================" -ForegroundColor Yellow
    Write-Host "   Please install the missing software, then come back here." -ForegroundColor Yellow
    Write-Host "  ============================================================" -ForegroundColor Yellow
    Write-Host ""
    $retry = Read-Host "   Press Enter to re-check, or type Q to quit"

    if ($retry -match '^[Qq]') {
        Write-Host ""
        Write-Host "   Installation cancelled." -ForegroundColor Red
        Write-Host ""
        exit 1
    }

    Write-Host ""
}
