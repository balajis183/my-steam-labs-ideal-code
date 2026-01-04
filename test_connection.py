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

def test_esptool_connection(port):
    """Test the esptool connection to ESP32 (Steam Labs uses esptool + pyserial)"""
    print(f"\n🎯 Testing esptool connection to {port}")
    success, output = run_command(f'python -m esptool --port {port} chip_id', f"Reading chip_id on {port}")
    if not success:
        print("❌ esptool connection failed")
        return False
    print("✅ esptool connection OK")
    return True

def cleanup_port(port):
    """Clean up any processes using the port"""
    print(f"\n🧹 Cleaning up {port}...")
    
    # Kill Python processes
    run_command('taskkill /f /im "python.exe" 2>nul', "Killing Python processes")
        
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
    
    # Check if esptool is available
    print("\n🔍 Checking esptool availability...")
    success, output = run_command('python -m esptool version', "Checking esptool version")
    if not success:
        print("❌ esptool not found. Please install it with: pip install esptool")
        return
    
    # Clean up port first
    cleanup_port(port)
    
    # Test connection
    if test_esptool_connection(port):
        print("\n🎉 Connection test successful! Your ESP32 is working properly.")
        print("\n💡 If Steam Labs still can't upload:")
        print("   1. Make sure Steam Labs is not running twice")
        print("   2. Close any other programs using the serial port")
        print("   3. Try unplug/replug USB, then Upload again")
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
