# AKLI Shop Manager — Installer Build Guide

> **Version:** 1.6.0  
> **Installer Technology:** WiX Toolset v5 (SDK-style, built with `dotnet build`)  
> **Target Platform:** Windows 10/11 (64-bit)

---

## Overview

The AKLI Shop Manager installer packages the complete shop management suite into a single MSI file for easy deployment. It installs and configures:

- **Web Application** — A Next.js-based management dashboard for inventory, sales analytics, and store administration.
- **POS Application** — A Python-based point-of-sale register for in-store transactions.
- **Database Setup** — Initialization scripts for the MySQL database backend.
- **Launcher Scripts** — Batch files and shortcuts to start each component.

The installer places all files under `C:\Program Files\AKLIShop\` and creates Start Menu shortcuts for convenient access.

---

## Prerequisites (Build Machine)

You need the following to **build** the MSI installer:

| Requirement | Minimum Version | Notes |
|---|---|---|
| .NET SDK | 6.0+ | Required to build the WiX project. Download from [dotnet.microsoft.com](https://dotnet.microsoft.com/download) |
| WiX Toolset v5 | 5.0+ | Auto-restored via NuGet when you run `dotnet restore`. No manual install needed. |
| Git | Any | To clone the source repository |

> **Note:** The WiX v5 SDK package is referenced in the `.wixproj` file and will be downloaded automatically during the NuGet restore step. You do **not** need to install WiX globally.

---

## Prerequisites (Target Machine)

The end user's machine needs the following to **run** the installed applications:

| Requirement | Minimum Version | Download |
|---|---|---|
| Windows | 10/11 (64-bit) | — |
| MySQL Server | 8.0+ | [dev.mysql.com/downloads](https://dev.mysql.com/downloads/mysql/) |
| Node.js | 18+ | [nodejs.org](https://nodejs.org) |
| Python | 3.10+ | [python.org](https://www.python.org/downloads/) |

> **Important:** During Python installation, check **"Add Python to PATH"**. During Node.js installation, ensure npm is included (it is by default).

---

## Building the Installer

### Option A: Using the Build Script (Recommended)

Open a PowerShell terminal in the `installer/` directory and run:

```powershell
# Standard release build
.\build.ps1

# Clean build (removes bin/ and obj/ first)
.\build.ps1 -Clean

# Debug build
.\build.ps1 -Configuration Debug

# Clean debug build
.\build.ps1 -Configuration Debug -Clean
```

The script will:
1. Validate that .NET SDK is installed
2. Clean previous build artifacts (if `-Clean` is specified)
3. Restore NuGet packages (including the WiX SDK)
4. Build the MSI installer
5. Copy the MSI to `installer/output/` with a timestamped filename

### Option B: Manual Build

```powershell
cd installer

# Restore packages
dotnet restore

# Build the MSI
dotnet build -c Release

# The MSI will be in bin/Release/
```

### Build Output

After a successful build, the MSI is located at:

```
installer/output/AKLIShop_Setup_v1.6.0_YYYYMMDD.exe
```

---

## What the Installer Does

When a user runs the MSI, the following actions are performed:

### 1. Web App Installation
- Copies the complete Next.js application to `C:\Program Files\AKLIShop\WebApp\`
- Includes all source files, `package.json`, and configuration
- Generates a `.env.local` file with default configuration values
- Dependencies (`node_modules`) are installed on first launch via the launcher script

### 2. POS App Installation
- Copies the Python POS application to `C:\Program Files\AKLIShop\POSApp\`
- Includes all source files and `requirements.txt`
- A Python virtual environment (`venv`) is created on first launch via the launcher script

### 3. Database Setup
- Copies SQL initialization scripts to `C:\Program Files\AKLIShop\Database\`
- Includes schema creation, seed data, and migration scripts
- **Does not** automatically create the database — the user runs the setup script or the app handles first-run initialization

### 4. Shortcut & Script Creation
- Installs launcher batch scripts to `C:\Program Files\AKLIShop\scripts\`
  - `start-webapp.bat` — Starts the Next.js development server
  - `start-pos.bat` — Starts the POS Python application
- Creates Start Menu shortcuts under **AKLI Shop Manager**

---

## Default Configuration

The installer pre-configures the following defaults. These can be changed after installation by editing the relevant `.env` or configuration files.

### Database Connection

| Setting | Default Value |
|---|---|
| Host | `localhost` |
| Port | `3306` |
| Username | `root` |
| Password | *(empty)* |
| Database | `hybrid_store` |

### Web Application

| Setting | Default Value |
|---|---|
| URL | `http://localhost:3000` |
| Environment | `development` |
| API Base URL | `http://localhost:3000/api` |

### Configuration Files

After installation, environment files are located at:

```
C:\Program Files\AKLIShop\WebApp\.env.local
C:\Program Files\AKLIShop\POSApp\.env
```

---

## Post-Install

### Starting the Web Application

1. Open the Start Menu and find **AKLI Shop Manager → Web App**, or
2. Run `C:\Program Files\AKLIShop\scripts\start-webapp.bat`
3. On first launch, the script will automatically run `npm install` (requires internet)
4. Once started, open your browser to **http://localhost:3000**

### Starting the POS Register

1. Open the Start Menu and find **AKLI Shop Manager → POS Register**, or
2. Run `C:\Program Files\AKLIShop\scripts\start-pos.bat`
3. On first launch, the script will create a Python virtual environment and install dependencies
4. The POS application window will open automatically

### Database Initialization

1. Ensure MySQL Server is running on `localhost:3306`
2. Navigate to `C:\Program Files\AKLIShop\Database\`
3. Run the initialization script:
   ```cmd
   mysql -u root -p < init_database.sql
   ```
4. Alternatively, the Web App will attempt to initialize the database on first run if it detects the `hybrid_store` database does not exist

---

## Troubleshooting

### MySQL Not Found or Connection Refused

**Symptoms:** Application shows "Connection refused" or "MySQL not found"

**Solutions:**
1. Verify MySQL is installed: `mysql --version`
2. Verify MySQL service is running:
   ```powershell
   Get-Service -Name 'MySQL*'
   ```
3. Check MySQL is listening on port 3306:
   ```powershell
   Test-NetConnection -ComputerName localhost -Port 3306
   ```
4. If using a non-default port, update the `.env` files accordingly

### npm install Fails

**Symptoms:** `start-webapp.bat` fails during dependency installation

**Solutions:**
1. Check internet connectivity
2. Clear npm cache and retry:
   ```cmd
   npm cache clean --force
   cd "C:\Program Files\AKLIShop\WebApp"
   rd /s /q node_modules
   npm install
   ```
3. If behind a proxy, configure npm:
   ```cmd
   npm config set proxy http://your-proxy:port
   npm config set https-proxy http://your-proxy:port
   ```
4. Verify Node.js version is 18+: `node --version`

### Python venv Creation Fails

**Symptoms:** `start-pos.bat` fails to create virtual environment

**Solutions:**
1. Verify Python version: `python --version` (must be 3.10+)
2. Ensure Python is in PATH: `where python`
3. Delete the broken venv and retry:
   ```cmd
   cd "C:\Program Files\AKLIShop\POSApp"
   rd /s /q venv
   ```
4. Try creating venv manually:
   ```cmd
   python -m venv venv
   ```
5. If `ensurepip` is missing, reinstall Python with the default options

### Port Conflicts

**Symptoms:** "Port 3000 is already in use" or "Address already in use"

**Solutions:**
1. Find what's using the port:
   ```powershell
   netstat -ano | findstr :3000
   ```
2. Stop the conflicting process, or change the port in `.env.local`:
   ```env
   PORT=3001
   ```
3. For MySQL port conflicts, update the database port in all `.env` files

### Permission Errors

**Symptoms:** "Access denied" when running scripts or modifying files

**Solutions:**
1. Run the launcher scripts as Administrator (right-click → Run as administrator)
2. If files in `C:\Program Files\AKLIShop\` are read-only, the scripts may need elevated permissions for first-run setup (npm install, venv creation)
3. Consider installing to a user-writable directory if this is a development setup

---

## Uninstalling

### Via Windows Settings

1. Open **Settings → Apps → Installed apps**
2. Search for **AKLI Shop Manager**
3. Click **Uninstall**

### Via Control Panel

1. Open **Control Panel → Programs → Programs and Features**
2. Find **AKLI Shop Manager**
3. Click **Uninstall**

### What Happens on Uninstall

- All files under `C:\Program Files\AKLIShop\` are removed
- Start Menu shortcuts are removed
- Registry entries created by the installer are cleaned up

### What Is Preserved

- The MySQL database (`hybrid_store`) is **not** dropped — your data is preserved
- Any files created outside the install directory are untouched

### Manual Database Cleanup

If you also want to remove the database:

```sql
DROP DATABASE IF EXISTS hybrid_store;
```

Or from the command line:

```cmd
mysql -u root -p -e "DROP DATABASE IF EXISTS hybrid_store;"
```

---

## Project Structure

```
installer/
├── build.ps1                 # Master build script (PowerShell)
├── README.md                 # This file
├── AKLIShop.Installer.wixproj  # WiX v5 project file
├── Package.wxs               # Main WiX installer definition
├── Directories.wxs           # Directory structure definitions
├── Components.wxs            # File/component definitions
├── Features.wxs              # Feature tree (optional components)
├── UI.wxs                    # Installer UI customization
├── scripts/                  # Launcher scripts (included in MSI)
│   ├── start-webapp.bat      #   Launches the Next.js web app
│   └── start-pos.bat         #   Launches the POS Python app
├── output/                   # Build output (MSI files, git-ignored)
├── bin/                      # Build intermediates (git-ignored)
└── obj/                      # Build intermediates (git-ignored)
```

### Install Directory Layout

After installation, the target machine has:

```
C:\Program Files\AKLIShop\
├── WebApp/                   # Next.js web application
│   ├── package.json
│   ├── .env.local
│   └── ...
├── POSApp/                   # Python POS application
│   ├── main.py
│   ├── requirements.txt
│   ├── .env
│   └── ...
├── Database/                 # SQL scripts
│   ├── init_database.sql
│   └── ...
└── scripts/                  # Launcher batch files
    ├── start-webapp.bat
    └── start-pos.bat
```

---

## License

This installer and its contents are proprietary software. All rights reserved.
