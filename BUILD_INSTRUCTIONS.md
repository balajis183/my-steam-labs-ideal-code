# Building the Desktop Application

## Prerequisites

1. **Node.js** (v16 or higher)
2. **mklittlefs.exe** in project root (automatically downloaded or manual)

## Building the Installer

### Step 1: Ensure mklittlefs.exe is present

The build process requires `mklittlefs.exe` in the project root folder.

**Automatic download:**
```bash
node download-mklittlefs.js
```

**Manual:**
- Download from: https://github.com/earlephilhower/mklittlefs/releases
- Place `mklittlefs.exe` in project root

### Step 2: Install dependencies

```bash
npm install
```

### Step 3: Build the installer

```bash
npm run build
```

This will create:
- Windows installer: `dist/My Steam Labs Setup 1.0.0.exe`
- Unpacked app: `dist/win-unpacked/`

## What Gets Bundled

When users install the application, the following are automatically included:

✅ **mklittlefs.exe** - Bundled in `resources/` folder
✅ **All Node.js dependencies** - Bundled in `app.asar`
✅ **Electron runtime** - Included in installer
✅ **All UI assets** - Bundled with app

## User Installation Experience

When users download and run the installer:

1. **Windows Installer (NSIS)** will:
   - Show installation wizard
   - Allow custom installation directory
   - Create desktop shortcut
   - Create Start Menu shortcut
   - Install all bundled dependencies automatically

2. **No additional setup required:**
   - ✅ mklittlefs.exe is automatically available
   - ✅ All tools are bundled
   - ✅ Ready to use immediately after installation

## Development vs Production

- **Development** (`npm start`): Looks for mklittlefs.exe in project folder
- **Production** (installed app): Automatically finds mklittlefs.exe in resources folder

Both modes work seamlessly!

