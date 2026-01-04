@echo off
SETLOCAL EnableDelayedExpansion
COLOR 0A
TITLE My Steam Labs - Driver & Environment Setup

echo ========================================
echo   MY STEAM LABS - SETUP WIZARD
echo ========================================
echo.

REM Check if running as administrator
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [WARNING] Not running as Administrator
    echo Some operations may fail. Right-click and "Run as Administrator" recommended.
    echo.
    pause
)

echo [Step 1/5] Checking Python installation...
echo ----------------------------------------
python --version >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] Python not found!
    echo.
    echo Please install Python 3.9 or later from:
    echo https://www.python.org/downloads/
    echo.
    echo IMPORTANT: Check "Add Python to PATH" during installation!
    echo.
    pause
    start https://www.python.org/downloads/
    exit /b 1
) else (
    python --version
    echo [SUCCESS] Python is installed
)
echo.

echo [Step 2/5] Checking pip...
echo ----------------------------------------
pip --version >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] pip not found!
    echo Installing pip...
    python -m ensurepip --default-pip
    python -m pip install --upgrade pip
) else (
    pip --version
    echo [SUCCESS] pip is available
)
echo.

echo [Step 3/5] Installing/Updating esptool...
echo ----------------------------------------
pip show esptool >nul 2>&1
if %errorLevel% neq 0 (
    echo Installing esptool...
    pip install esptool
) else (
    echo Updating esptool...
    pip install --upgrade esptool
)

python -m esptool version
if %errorLevel% neq 0 (
    echo [ERROR] esptool installation failed!
    echo Try running: pip install esptool
    pause
    exit /b 1
) else (
    echo [SUCCESS] esptool is ready
)
echo.

echo [Step 4/5] Checking COM ports and drivers...
echo ----------------------------------------
echo Scanning for connected devices...

REM List COM ports
powershell -Command "Get-PnpDevice -Class Ports | Where-Object {$_.Name -like '*COM*'} | Format-Table -Property Name, Status, InstanceId -AutoSize"

echo.
echo Checking for USB-Serial drivers...
powershell -Command "Get-PnpDevice | Where-Object {$_.Name -like '*USB*Serial*' -or $_.Name -like '*CH340*' -or $_.Name -like '*CP210*'} | Format-Table -Property Name, Status -AutoSize"

echo.
echo [INFO] Common USB-to-Serial chips:
echo   - CH340/CH341: http://www.wch.cn/downloads/CH341SER_ZIP.html
echo   - CP2102/CP2104: https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers
echo.

REM Check if any CH340 or CP210x device is present
powershell -Command "$devices = Get-PnpDevice | Where-Object {$_.Name -like '*CH340*' -or $_.Name -like '*CP210*'}; if ($devices.Count -gt 0) { exit 0 } else { exit 1 }" >nul 2>&1
if %errorLevel% equ 0 (
    echo [SUCCESS] USB-Serial driver detected
) else (
    echo [WARNING] No USB-Serial driver detected
    echo Please install the appropriate driver:
    echo   1. Check Device Manager for your USB chip model
    echo   2. Download driver from links above
    echo   3. Install and restart computer
    echo.
    choice /C YN /M "Open driver download pages now?"
    if !errorLevel! equ 1 (
        start https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers
        start http://www.wch.cn/downloads/CH341SER_ZIP.html
    )
)
echo.

echo [Step 5/5] Testing ESP32 connection...
echo ----------------------------------------
echo.
echo Looking for ESP32 boards on COM ports...
echo.

REM Try to detect COM ports
for /f "tokens=*" %%A in ('powershell -Command "Get-PnpDevice -Class Ports | Where-Object {$_.Name -like '*COM*' -and $_.Status -eq 'OK'} | ForEach-Object { $_.Name -match 'COM(\d+)' | Out-Null; $Matches[0] }"') do (
    set COMPORT=%%A
    echo Testing !COMPORT!...
    python -m esptool --port !COMPORT! chip_id --no-stub 2>nul
    if !errorLevel! equ 0 (
        echo [SUCCESS] ESP32 found on !COMPORT!
        goto :found_board
    )
)

echo [WARNING] No ESP32 board detected
echo.
echo Troubleshooting steps:
echo   1. Make sure ESP32 is connected via USB
echo   2. Check if LED on ESP32 board lights up
echo   3. Try a different USB cable (must support data, not just power)
echo   4. Try a different USB port
echo   5. Install correct driver (see above)
echo   6. Manually enter bootloader mode:
echo      - Hold BOOT button
echo      - Press and release RESET button
echo      - Release BOOT button
echo.
goto :skip_found

:found_board
echo.
echo ========================================
echo   SETUP COMPLETE!
echo ========================================
echo.
echo Your system is ready to use My Steam Labs.
echo You can now:
echo   1. Launch "My Steam Labs" application
echo   2. Select your COM port
echo   3. Start coding!
echo.
goto :end

:skip_found

:end
echo.
echo ========================================
echo   SETUP SUMMARY
echo ========================================
echo.
python --version 2>nul && echo [OK] Python installed || echo [FAIL] Python not found
pip --version 2>nul && echo [OK] pip installed || echo [FAIL] pip not found
python -m esptool version 2>nul && echo [OK] esptool installed || echo [FAIL] esptool not found
echo.
echo See DRIVER_SETUP_GUIDE.md for detailed troubleshooting.
echo.
pause

