@echo off
REM Clean Installation Script for My Steam Labs
REM This removes all old dependencies and reinstalls fresh

echo ========================================
echo   My Steam Labs - Clean Installation
echo ========================================
echo.

echo [Step 1/6] Removing old node_modules...
if exist node_modules (
    rmdir /s /q node_modules
    echo    ✅ Removed old node_modules
) else (
    echo    ℹ️  No node_modules found
)

echo.
echo [Step 2/6] Removing old package-lock.json...
if exist package-lock.json (
    del /q package-lock.json
    echo    ✅ Removed old package-lock.json
) else (
    echo    ℹ️  No package-lock.json found
)

echo.
echo [Step 3/6] Installing Node.js dependencies...
call npm install
if errorlevel 1 (
    echo    ❌ npm install failed!
    pause
    exit /b 1
)
echo    ✅ Node.js dependencies installed

echo.
echo [Step 4/6] Checking Python installation...
python --version >nul 2>&1
if errorlevel 1 (
    echo    ❌ Python not found! Please install Python from https://www.python.org/downloads/
    echo    ⚠️  Make sure to check "Add Python to PATH" during installation
    pause
    exit /b 1
)
python --version
echo    ✅ Python found

echo.
echo [Step 5/6] Installing Python dependencies...
pip install -r requirements.txt
if errorlevel 1 (
    echo    ❌ pip install failed!
    pause
    exit /b 1
)
echo    ✅ Python dependencies installed

echo.
echo [Step 6/6] Verifying installation...
python -m esptool version >nul 2>&1
if errorlevel 1 (
    echo    ❌ esptool not found!
    pause
    exit /b 1
)
echo    ✅ esptool verified

python -c "import serial; print('pyserial OK')" >nul 2>&1
if errorlevel 1 (
    echo    ❌ pyserial not found!
    pause
    exit /b 1
)
echo    ✅ pyserial verified

echo.
echo ========================================
echo   ✅ Installation Complete!
echo ========================================
echo.
echo You can now:
echo   - Run in dev mode: npm start
echo   - Build executable: npm run build
echo.
echo For driver installation, run: setup-drivers.bat
echo.
pause

