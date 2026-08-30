<#
.SYNOPSIS
    AKLI Shop Manager - MSI Installer Build Script

.DESCRIPTION
    Builds the WiX v5 MSI installer package for AKLI Shop Manager.
    This script validates prerequisites, cleans previous output,
    restores NuGet packages, builds the installer project, and
    copies the final MSI to an output directory with a timestamped name.

.PARAMETER Configuration
    Build configuration. Default: Release

.PARAMETER Clean
    If specified, performs a clean build by removing bin/ and obj/ first.

.EXAMPLE
    .\build.ps1
    .\build.ps1 -Configuration Debug
    .\build.ps1 -Clean
    .\build.ps1 -Configuration Release -Clean
#>

[CmdletBinding()]
param(
    [ValidateSet("Debug", "Release")]
    [string]$Configuration = "Release",

    [switch]$Clean
)

# ==============================================================
#  Configuration
# ==============================================================
$ErrorActionPreference = 'Stop'
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$ProjectDir = $ScriptDir  # The installer .wixproj lives here
$OutputDir = Join-Path $ScriptDir "output"
$Version = "1.6.0"
$ProductName = "AKLI Shop"
$BuildStart = Get-Date

# ==============================================================
#  Helper Functions
# ==============================================================
function Write-Banner {
    Write-Host ""
    Write-Host "  =============================================" -ForegroundColor Cyan
    Write-Host "   AKLI Shop Manager - MSI Installer Build" -ForegroundColor Cyan
    Write-Host "  =============================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "   Configuration : $Configuration" -ForegroundColor White
    Write-Host "   Version       : $Version" -ForegroundColor White
    Write-Host "   Timestamp     : $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor White
    Write-Host "   Clean Build   : $($Clean.IsPresent)" -ForegroundColor White
    Write-Host ""
}

function Write-Step {
    param([string]$Number, [string]$Message)
    Write-Host "  [$Number] $Message" -ForegroundColor Yellow
}

function Write-Success {
    param([string]$Message)
    Write-Host "  [OK] $Message" -ForegroundColor Green
}

function Write-Failure {
    param([string]$Message)
    Write-Host "[FAIL] $Message" -ForegroundColor Red
}

function Write-Detail {
    param([string]$Message)
    Write-Host "       $Message" -ForegroundColor Gray
}

function Get-FriendlySize {
    param([long]$Bytes)
    if ($Bytes -ge 1MB) { return "{0:N2} MB" -f ($Bytes / 1MB) }
    if ($Bytes -ge 1KB) { return "{0:N2} KB" -f ($Bytes / 1KB) }
    return "$Bytes bytes"
}

# ==============================================================
#  Main Build Pipeline
# ==============================================================
try {
    Write-Banner

    # ----------------------------------------------------------
    #  Step 1: Check Prerequisites
    # ----------------------------------------------------------
    Write-Step "1/6" "Checking build prerequisites..."

    # .NET SDK
    try {
        $dotnetVersion = & dotnet --version 2>&1
        if ($LASTEXITCODE -ne 0) { throw ".NET SDK check returned non-zero exit code." }
        Write-Success ".NET SDK found: v$dotnetVersion"
    }
    catch {
        Write-Failure ".NET SDK is not installed or not in PATH."
        Write-Detail "Download from: https://dotnet.microsoft.com/download"
        Write-Host ""
        exit 1
    }

    # WiX Toolset (check for wix CLI or note that SDK-style will auto-restore)
    $wixCliAvailable = $false
    try {
        $wixVersion = & wix --version 2>&1
        if ($LASTEXITCODE -eq 0) {
            $wixCliAvailable = $true
            Write-Success "WiX CLI found: $wixVersion"
        }
    }
    catch {
        # wix CLI not found - that's fine for SDK-style projects
    }

    if (-not $wixCliAvailable) {
        Write-Success "WiX CLI not found (OK - WiX SDK will auto-restore via NuGet)"
    }

    Write-Host ""

    # ----------------------------------------------------------
    #  Step 2: Clean Previous Build Output
    # ----------------------------------------------------------
    Write-Step "2/6" "Cleaning previous build output..."

    $binDir = Join-Path $ProjectDir "bin"
    $objDir = Join-Path $ProjectDir "obj"

    if ($Clean) {
        foreach ($dir in @("bin", "obj", "bootstrapper\bin", "bootstrapper\obj")) {
            $cleanDir = Join-Path $ProjectDir $dir
            if (Test-Path $cleanDir) {
                Remove-Item -Path $cleanDir -Recurse -Force
                Write-Detail "Removed: $dir/"
            }
        }
        Write-Success "Clean completed."
    }
    else {
        Write-Success "Skipped (use -Clean to force a clean build)."
    }

    Write-Host ""

    # (Step 3 — Prerequisite download removed: dependencies are no longer
    #  bundled in the installer. Users install them manually via the
    #  install-launcher.ps1 script before running the setup.)

    # ----------------------------------------------------------
    #  Step 3: Restore NuGet Packages
    # ----------------------------------------------------------
    Write-Step "3/6" "Restoring NuGet packages..."

    Push-Location $ProjectDir
    try {
        & dotnet restore bootstrapper/Bootstrapper.wixproj 2>&1 | ForEach-Object { Write-Detail $_ }
        if ($LASTEXITCODE -ne 0) {
            throw "dotnet restore failed with exit code $LASTEXITCODE."
        }
        Write-Success "Packages restored successfully."
    }
    finally {
        Pop-Location
    }

    Write-Host ""

    # ----------------------------------------------------------
    #  Step 4: Compile Applications
    # ----------------------------------------------------------
    Write-Step "4/6" "Compiling Applications (Next.js & Python)..."

    # Build Next.js Web App
    Write-Detail "Building Next.js Web App (npm install & npm run build)..."
    $webAppDir = Join-Path $ScriptDir "..\Web_App"
    Push-Location $webAppDir
    try {
        & npm install 2>&1 | ForEach-Object { Write-Detail $_ }
        if ($LASTEXITCODE -ne 0) { throw "npm install failed." }
        & npm run build 2>&1 | ForEach-Object { Write-Detail $_ }
        if ($LASTEXITCODE -ne 0) { throw "npm run build failed." }
        
        Write-Detail "Copying static assets to standalone folder..."
        $standaloneDir = Join-Path $webAppDir ".next\standalone"
        Copy-Item -Path "public" -Destination "$standaloneDir\public" -Recurse -Force -ErrorAction SilentlyContinue
        
        $standaloneNextDir = Join-Path $standaloneDir ".next"
        if (-not (Test-Path $standaloneNextDir)) { New-Item -ItemType Directory -Path $standaloneNextDir | Out-Null }
        Copy-Item -Path ".next\static" -Destination "$standaloneNextDir\static" -Recurse -Force
        
        Write-Detail "Patching server.js to load .env.local..."
        $serverJsPath = Join-Path $standaloneDir "server.js"
        $patchScript = Join-Path $ScriptDir "scripts\patch_server.js"
        & node $patchScript $serverJsPath
    }
    finally { Pop-Location }

    # Compile C# Web App Launcher
    Write-Detail "Compiling C# WebApp Launcher..."
    $launcherCs = Join-Path $ScriptDir "scripts\run_webapp.cs"
    $launcherExe = Join-Path $webAppDir "AKLI_WebApp.exe"
    $cscPath = "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
    & $cscPath /nologo /out:"$launcherExe" "$launcherCs" 2>&1 | ForEach-Object { Write-Detail $_ }
    if ($LASTEXITCODE -ne 0) { throw "Failed to compile run_webapp.cs" }

    # Build Python POS App
    Write-Detail "Building Python POS App (PyInstaller)..."
    $posAppDir = Join-Path $ScriptDir "..\POS_App"
    Push-Location $posAppDir
    try {
        & python -m pip install -r requirements.txt --trusted-host pypi.org --trusted-host files.pythonhosted.org --no-warn-script-location
        if ($LASTEXITCODE -ne 0) { throw "pip install requirements failed." }
        
        & python -m pip install pyinstaller --trusted-host pypi.org --trusted-host files.pythonhosted.org --no-warn-script-location
        if ($LASTEXITCODE -ne 0) { throw "pip install pyinstaller failed." }
        
        & python -m PyInstaller AKLIShop.spec -y
        if ($LASTEXITCODE -ne 0) { throw "pyinstaller failed." }
    }
    finally { Pop-Location }

    Write-Success "Applications compiled successfully."

    Write-Host ""

    # ----------------------------------------------------------
    #  Step 5: Build the Installer
    # ----------------------------------------------------------
    Write-Step "5/6" "Building installer (Configuration: $Configuration)..."

    Push-Location $ProjectDir
    try {
        & dotnet build bootstrapper/Bootstrapper.wixproj -c $Configuration --no-restore 2>&1 | ForEach-Object { Write-Detail $_ }
        if ($LASTEXITCODE -ne 0) {
            throw "dotnet build failed with exit code $LASTEXITCODE."
        }
        Write-Success "Build completed successfully."
    }
    finally {
        Pop-Location
    }

    Write-Host ""

    # ----------------------------------------------------------
    #  Step 5b: Locate the Setup EXE
    # ----------------------------------------------------------
    Write-Detail "Locating Setup EXE output..."

    $bootstrapperOutputDir = Join-Path $ProjectDir "bootstrapper\bin\x64\$Configuration"
    if (-not (Test-Path $bootstrapperOutputDir)) {
        # Fallback to the default architecture path if x64 isn't used
        $bootstrapperOutputDir = Join-Path $ProjectDir "bootstrapper\bin\$Configuration"
    }
    $msiFiles = @()

    if (Test-Path $bootstrapperOutputDir) {
        $msiFiles = Get-ChildItem -Path $bootstrapperOutputDir -Filter "*.exe" -Recurse -File
    }

    if ($msiFiles.Count -eq 0) {
        Write-Failure "No setup EXE file found in: $msiSearchDir"
        Write-Detail "The build may have succeeded but produced no EXE."
        Write-Detail "Check the Bootstrapper.wixproj configuration and build logs."
        Write-Host ""
        exit 1
    }

    $sourceMsi = $msiFiles[0].FullName
    $msiSize = $msiFiles[0].Length
    Write-Success "Found Setup EXE: $sourceMsi"
    Write-Detail "Size: $(Get-FriendlySize $msiSize)"

    Write-Host ""

    # ----------------------------------------------------------
    #  Step 6: Copy to Output Directory
    # ----------------------------------------------------------
    Write-Step "6/6" "Copying to output directory..."

    if (-not (Test-Path $OutputDir)) {
        New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
        Write-Detail "Created: output/"
    }

    $timestamp = Get-Date -Format "yyyyMMdd"
    $outputFileName = "${ProductName}_Setup_v${Version}_${timestamp}.exe"
    $outputPath = Join-Path $OutputDir $outputFileName

    # If a file with the same name exists, add a sequence number
    if (Test-Path $outputPath) {
        $counter = 1
        do {
            $outputFileName = "${ProductName}_Setup_v${Version}_${timestamp}_${counter}.exe"
            $outputPath = Join-Path $OutputDir $outputFileName
            $counter++
        } while (Test-Path $outputPath)
        Write-Detail "File already existed - using sequential name."
    }

    Copy-Item -Path $sourceMsi -Destination $outputPath -Force
    Write-Success "Setup EXE copied to: $outputPath"

    # Copy the installation launcher script
    $launcherSrc = Join-Path $ScriptDir "Install AKLI Shop.bat"
    if (Test-Path $launcherSrc) {
        $launcherDst = Join-Path $OutputDir "Install AKLI Shop.bat"
        Copy-Item -Path $launcherSrc -Destination $launcherDst -Force
        # Also copy the launcher PowerShell script
        $launcherScriptsDir = Join-Path $OutputDir "scripts"
        if (-not (Test-Path $launcherScriptsDir)) {
            New-Item -ItemType Directory -Path $launcherScriptsDir -Force | Out-Null
        }
        $launcherPs1Src = Join-Path $ScriptDir "scripts\install-launcher.ps1"
        if (Test-Path $launcherPs1Src) {
            Copy-Item -Path $launcherPs1Src -Destination (Join-Path $launcherScriptsDir "install-launcher.ps1") -Force
        }
        Write-Success "Installation launcher copied to output directory."
    }

    Write-Host ""

    # ----------------------------------------------------------
    #  Build Summary
    # ----------------------------------------------------------
    $BuildEnd = Get-Date
    $BuildDuration = $BuildEnd - $BuildStart

    Write-Host "  =============================================" -ForegroundColor Green
    Write-Host "   BUILD SUCCESSFUL" -ForegroundColor Green
    Write-Host "  =============================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "   Setup EXE     : $outputPath" -ForegroundColor White
    Write-Host "   File Size     : $(Get-FriendlySize $msiSize)" -ForegroundColor White
    Write-Host "   Launcher      : Install AKLI Shop.bat" -ForegroundColor White
    Write-Host "   Configuration : $Configuration" -ForegroundColor White
    Write-Host "   Version       : $Version" -ForegroundColor White
    Write-Host "   Build Time    : $("{0:mm\:ss\.fff}" -f $BuildDuration)" -ForegroundColor White
    Write-Host ""
    Write-Host "   To install, run 'Install AKLI Shop.bat' from the output folder." -ForegroundColor Cyan
    Write-Host ""

    exit 0
}
catch {
    Write-Host ""
    Write-Host "  =============================================" -ForegroundColor Red
    Write-Host "   BUILD FAILED" -ForegroundColor Red
    Write-Host "  =============================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""

    if ($_.ScriptStackTrace) {
        Write-Host "   Stack Trace:" -ForegroundColor DarkGray
        $_.ScriptStackTrace -split "`n" | ForEach-Object {
            Write-Host "     $_" -ForegroundColor DarkGray
        }
        Write-Host ""
    }

    exit 1
}

