@echo off
REM Test COM Port Availability

echo ========================================
echo   COM Port Test Utility
echo ========================================
echo.

if "%1"=="" (
    echo Usage: test-comport.bat COMX
    echo Example: test-comport.bat COM4
    echo.
    pause
    exit /b 1
)

set PORT=%1

echo Testing port: %PORT%
echo.

echo [1/4] Checking if Python is available...
python --version
if errorlevel 1 (
    echo ERROR: Python not found!
    pause
    exit /b 1
)
echo.

echo [2/4] Checking if pyserial is installed...
python -c "import serial; print('pyserial version:', serial.VERSION)"
if errorlevel 1 (
    echo ERROR: pyserial not installed!
    echo Run: pip install pyserial
    pause
    exit /b 1
)
echo.

echo [3/4] Listing all available ports...
python -c "import serial.tools.list_ports; ports = list(serial.tools.list_ports.comports()); print('\n'.join([f'{p.device} - {p.description}' for p in ports]))"
echo.

echo [4/4] Testing if %PORT% can be opened...
python app\serial-helper.py test %PORT%
if errorlevel 1 (
    echo.
    echo ERROR: Cannot open %PORT%!
    echo.
    echo Troubleshooting:
    echo 1. Make sure the device is connected
    echo 2. Close any programs using the port (Arduino IDE, PuTTY, etc.)
    echo 3. Try unplugging and replugging the USB cable
    echo 4. Check Device Manager to verify the port exists
    echo.
) else (
    echo.
    echo SUCCESS: %PORT% is available!
    echo.
)

pause

