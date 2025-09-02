# Simple I2C Scanner - Quick Diagnostic
# This will help you see if your OLED is connected

from machine import Pin, SoftI2C, I2C
import time

print("🔍 I2C Scanner - Quick Diagnostic")
print("=" * 40)

def scan_i2c():
    """Scan for I2C devices"""
    print("Scanning for I2C devices...")
    
    # Try different I2C configurations
    configs = [
        ("SoftI2C - Pins 13,15", SoftI2C(sda=Pin(13), scl=Pin(15))),
        ("SoftI2C - Pins 21,22", SoftI2C(sda=Pin(21), scl=Pin(22))),
        ("Hardware I2C - Pins 21,22", I2C(0, sda=Pin(21), scl=Pin(22)))
    ]
    
    found_devices = []
    
    for name, i2c in configs:
        print(f"\n🔍 {name}:")
        try:
            devices = i2c.scan()
            if devices:
                print(f"  ✅ Found {len(devices)} device(s):")
                for addr in devices:
                    print(f"    Address: 0x{addr:02X} ({addr})")
                    found_devices.append((name, addr))
                    
                    # Check if it's a common OLED address
                    if addr in [0x3C, 0x3D, 0x78, 0x7A]:
                        print(f"    ⭐ This looks like an OLED display!")
            else:
                print(f"  ❌ No devices found")
        except Exception as e:
            print(f"  ❌ Error: {e}")
    
    return found_devices

def check_ssd1306_library():
    """Check if ssd1306 library is available"""
    print("\n📚 Checking ssd1306 library...")
    try:
        import ssd1306
        print("✅ ssd1306 library found!")
        return True
    except ImportError:
        print("❌ ssd1306 library not found!")
        print("💡 You need to upload ssd1306.py to your ESP32")
        return False

# Run the scan
print("Starting I2C scan...")
devices = scan_i2c()
library_ok = check_ssd1306_library()

print("\n" + "=" * 40)
print("📊 SCAN RESULTS")
print("=" * 40)

if devices:
    print(f"✅ Found {len(devices)} I2C device(s):")
    for config, addr in devices:
        print(f"  {config}: 0x{addr:02X}")
else:
    print("❌ No I2C devices found")
    print("💡 Check your connections:")

print(f"\n📚 ssd1306 library: {'✅ Available' if library_ok else '❌ Missing'}")

print("\n🎯 Troubleshooting:")
if not devices:
    print("  1. Check OLED connections (VCC, GND, SDA, SCL)")
    print("  2. Make sure OLED is powered (3.3V)")
    print("  3. Try different pin combinations")
    print("  4. Check for loose wires")
elif not library_ok:
    print("  1. Upload ssd1306.py library to ESP32")
    print("  2. Restart ESP32 after uploading")
else:
    print("  1. Your OLED should be working!")
    print("  2. Try running your OLED code again")
