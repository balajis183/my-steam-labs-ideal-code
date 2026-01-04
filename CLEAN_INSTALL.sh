#!/bin/bash
# Clean Installation Script for My Steam Labs (Linux/Mac)
# This removes all old dependencies and reinstalls fresh

echo "========================================"
echo "  My Steam Labs - Clean Installation"
echo "========================================"
echo ""

echo "[Step 1/6] Removing old node_modules..."
if [ -d "node_modules" ]; then
    rm -rf node_modules
    echo "   ✅ Removed old node_modules"
else
    echo "   ℹ️  No node_modules found"
fi

echo ""
echo "[Step 2/6] Removing old package-lock.json..."
if [ -f "package-lock.json" ]; then
    rm -f package-lock.json
    echo "   ✅ Removed old package-lock.json"
else
    echo "   ℹ️  No package-lock.json found"
fi

echo ""
echo "[Step 3/6] Installing Node.js dependencies..."
npm install
if [ $? -ne 0 ]; then
    echo "   ❌ npm install failed!"
    exit 1
fi
echo "   ✅ Node.js dependencies installed"

echo ""
echo "[Step 4/6] Checking Python installation..."
if ! command -v python3 &> /dev/null; then
    echo "   ❌ Python not found! Please install Python 3.9+"
    exit 1
fi
python3 --version
echo "   ✅ Python found"

echo ""
echo "[Step 5/6] Installing Python dependencies..."
pip3 install -r requirements.txt
if [ $? -ne 0 ]; then
    echo "   ❌ pip install failed!"
    exit 1
fi
echo "   ✅ Python dependencies installed"

echo ""
echo "[Step 6/6] Verifying installation..."
python3 -m esptool version &> /dev/null
if [ $? -ne 0 ]; then
    echo "   ❌ esptool not found!"
    exit 1
fi
echo "   ✅ esptool verified"

python3 -c "import serial; print('pyserial OK')" &> /dev/null
if [ $? -ne 0 ]; then
    echo "   ❌ pyserial not found!"
    exit 1
fi
echo "   ✅ pyserial verified"

echo ""
echo "========================================"
echo "  ✅ Installation Complete!"
echo "========================================"
echo ""
echo "You can now:"
echo "  - Run in dev mode: npm start"
echo "  - Build executable: npm run build"
echo ""
echo "On Linux, you may need to add your user to dialout group:"
echo "  sudo usermod -a -G dialout \$USER"
echo "  (then log out and log back in)"
echo ""

