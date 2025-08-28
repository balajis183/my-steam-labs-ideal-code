#!/usr/bin/env python3
"""
ESP32 Connection Test Script
This script helps test and troubleshoot the connection to your ESP32 device.
"""

import subprocess
import time
import sys
import os

def run_command(cmd, description):
    """Run a command and return the result"""
    print(f"\n🔄 {description}")
    print(f"Command: {cmd}")
    
    try:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=30)
        if result.returncode == 0:
            print(f"✅ Success: {result.stdout}")
            return True, result.stdout
        else:
            print(f"❌ Failed: {result.stderr}")
            return False, result.stderr
    except subprocess.TimeoutExpired:
        print("❌ Command timed out")
        return False, "Command timed out"
    except Exception as e:
        print(f"❌ Error: {e}")
        return False, str(e)

def test_mpremote_connection(port):
    """Test the mpremote connection to ESP32"""
    print(f"\n🎯 Testing connection to {port}")
    
    # Test 1: Check if port is available
    print("\n1️⃣ Checking port availability...")
    success, output = run_command(f'python -m mpremote devs', "Listing available devices")
    if not success:
        print("❌ Cannot list devices")
        return False
    
    # Test 2: Try to connect
    print("\n2️⃣ Testing connection...")
    success, output = run_command(f'python -m mpremote connect {port}', f"Connecting to {port}")
    if not success:
        print("❌ Connection failed")
        return False
    
    # Test 3: Try to enter raw REPL
    print("\n3️⃣ Testing raw REPL...")
    success, output = run_command(f'python -m mpremote connect {port} exec "print(\'Hello from ESP32!\')"', "Testing raw REPL execution")
    if not success:
        print("❌ Raw REPL failed")
        return False
    
    print("✅ All connection tests passed!")
    return True

def cleanup_port(port):
    """Clean up any processes using the port"""
    print(f"\n🧹 Cleaning up {port}...")
    
    # Kill Python processes
    run_command('taskkill /f /im "python.exe" 2>nul', "Killing Python processes")
    
    # Kill mpremote processes
    run_command('taskkill /f /im "mpremote.exe" 2>nul', "Killing mpremote processes")
    
    # Force release COM port
    run_command(f'mode {port}: BAUD=115200 PARITY=N DATA=8 STOP=1', f"Force releasing {port}")
    
    print("✅ Port cleanup completed")
    time.sleep(2)

def main():
    """Main function"""
    print("🚀 ESP32 Connection Test Script")
    print("=" * 40)
    
    # Default port
    port = "COM5"
    
    if len(sys.argv) > 1:
        port = sys.argv[1]
    
    print(f"Target port: {port}")
    
    # Check if mpremote is available
    print("\n🔍 Checking mpremote availability...")
    success, output = run_command('python -m mpremote --version', "Checking mpremote version")
    if not success:
        print("❌ mpremote not found. Please install it with: pip install mpremote")
        return
    
    # Clean up port first
    cleanup_port(port)
    
    # Test connection
    if test_mpremote_connection(port):
        print("\n🎉 Connection test successful! Your ESP32 is working properly.")
        print("\n💡 If you still get 'could not enter raw repl' in Steam Labs:")
        print("   1. Make sure Steam Labs is not running")
        print("   2. Close any other programs using the serial port")
        print("   3. Try uploading code first, then running")
        print("   4. Check if your ESP32 has MicroPython firmware installed")
    else:
        print("\n❌ Connection test failed!")
        print("\n🔧 Troubleshooting steps:")
        print("   1. Check if ESP32 is properly connected")
        print("   2. Verify the correct COM port")
        print("   3. Make sure MicroPython is installed on ESP32")
        print("   4. Try pressing the reset button on ESP32")
        print("   5. Check USB cable and drivers")

if __name__ == "__main__":
    main()
