#!/usr/bin/env python3
"""
MicroPython Firmware Installation Script for ESP32
This script helps download and install MicroPython firmware on your ESP32.
"""

import os
import sys
import subprocess
import urllib.request
import zipfile
import tempfile

def download_file(url, filename):
    """Download a file from URL"""
    print(f"📥 Downloading {filename}...")
    try:
        urllib.request.urlretrieve(url, filename)
        print(f"✅ Downloaded {filename}")
        return True
    except Exception as e:
        print(f"❌ Download failed: {e}")
        return False

def install_esptool():
    """Install esptool if not available"""
    print("🔧 Checking esptool availability...")
    try:
        result = subprocess.run(['esptool', '--version'], capture_output=True, text=True)
        if result.returncode == 0:
            print("✅ esptool is already installed")
            return True
    except FileNotFoundError:
        pass
    
    print("📦 Installing esptool...")
    try:
        subprocess.run([sys.executable, '-m', 'pip', 'install', 'esptool'], check=True)
        print("✅ esptool installed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to install esptool: {e}")
        return False

def get_esp32_info(port):
    """Get ESP32 chip information"""
    print(f"🔍 Getting ESP32 information from {port}...")
    try:
        result = subprocess.run([
            'esptool', '--port', port, 'chip-id'
        ], capture_output=True, text=True, timeout=30)
        
        if result.returncode == 0:
            print("✅ ESP32 detected:")
            print(result.stdout)
            return True
        else:
            print(f"❌ Failed to get chip info: {result.stderr}")
            return False
    except Exception as e:
        print(f"❌ Error getting chip info: {e}")
        return False

def install_firmware(port, firmware_path):
    """Install MicroPython firmware"""
    print(f"🚀 Installing MicroPython firmware on {port}...")
    print("⚠️  This will erase all data on your ESP32!")
    
    try:
        # Erase flash
        print("🧹 Erasing flash...")
        subprocess.run([
            'esptool', '--port', port, 'erase_flash'
        ], check=True, timeout=60)
        
        # Write firmware
        print("📝 Writing firmware...")
        subprocess.run([
            'esptool', '--port', port, 'write_flash', '0x1000', firmware_path
        ], check=True, timeout=120)
        
        print("✅ Firmware installation completed!")
        return True
        
    except subprocess.CalledProcessError as e:
        print(f"❌ Firmware installation failed: {e}")
        return False
    except Exception as e:
        print(f"❌ Error during installation: {e}")
        return False

def main():
    """Main function"""
    print("🚀 MicroPython Firmware Installation for ESP32")
    print("=" * 50)
    
    # Check port argument
    if len(sys.argv) < 2:
        print("Usage: python install_micropython.py <COM_PORT>")
        print("Example: python install_micropython.py COM5")
        return
    
    port = sys.argv[1]
    print(f"Target port: {port}")
    
    # Install esptool
    if not install_esptool():
        print("❌ Cannot proceed without esptool")
        return
    
    # Get ESP32 info
    if not get_esp32_info(port):
        print("❌ Cannot communicate with ESP32")
        print("💡 Make sure:")
        print("   1. ESP32 is connected to the correct port")
        print("   2. USB cable is working")
        print("   3. Hold BOOT button while connecting if needed")
        return
    
    # Download firmware
    firmware_url = "https://micropython.org/resources/firmware/esp32-20231220-v1.21.0.bin"
    firmware_file = "esp32-firmware.bin"
    
    if not download_file(firmware_url, firmware_file):
        print("❌ Firmware download failed")
        return
    
    # Install firmware
    if install_firmware(port, firmware_file):
        print("\n🎉 MicroPython firmware installed successfully!")
        print("\n💡 Next steps:")
        print("   1. Disconnect and reconnect your ESP32")
        print("   2. Test with: python -m mpremote connect " + port)
        print("   3. Try running your Steam Labs application")
        
        # Clean up
        try:
            os.remove(firmware_file)
            print("🧹 Cleaned up temporary files")
        except:
            pass
    else:
        print("\n❌ Firmware installation failed!")
        print("\n🔧 Troubleshooting:")
        print("   1. Make sure ESP32 is in download mode")
        print("   2. Hold BOOT button while connecting")
        print("   3. Check USB cable and drivers")
        print("   4. Try a different USB port")

if __name__ == "__main__":
    main()

