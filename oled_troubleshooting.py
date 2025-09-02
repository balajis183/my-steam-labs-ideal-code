# OLED Display Troubleshooting Guide
# This will help you diagnose and fix the OLED connection issue

from machine import Pin, SoftI2C, I2C
import time

print("🔍 OLED Display Troubleshooting")
print("=" * 50)

def test_i2c_scan():
    """Scan for I2C devices to see what's connected"""
    print("\n📡 Scanning for I2C devices...")
    
    # Try different I2C configurations
    i2c_configs = [
        ("SoftI2C - Pins 13,15", SoftI2C(sda=Pin(13), scl=Pin(15))),
        ("SoftI2C - Pins 21,22", SoftI2C(sda=Pin(21), scl=Pin(22))),
        ("Hardware I2C - Pins 21,22", I2C(0, sda=Pin(21), scl=Pin(22))),
        ("Hardware I2C - Pins 22,21", I2C(0, sda=Pin(22), scl=Pin(21)))
    ]
    
    for config_name, i2c in i2c_configs:
        try:
            print(f"\n🔍 Testing {config_name}:")
            devices = i2c.scan()
            if devices:
                print(f"  ✅ Found {len(devices)} device(s):")
                for device in devices:
                    print(f"    Address: 0x{device:02X} ({device})")
                    # Common OLED addresses
                    if device in [0x3C, 0x3D, 0x78, 0x7A]:
                        print(f"    ⭐ This looks like an OLED display!")
            else:
                print(f"  ❌ No devices found")
        except Exception as e:
            print(f"  ❌ Error: {e}")
    
    return devices if 'devices' in locals() else []

def test_oled_connection():
    """Test OLED display connection"""
    print("\n📺 Testing OLED Display Connection")
    
    try:
        from machine import Pin, SoftI2C
        import ssd1306
        
        # Try different pin combinations
        pin_combinations = [
            (13, 15),  # Original pins
            (21, 22),  # Alternative pins
            (22, 21),  # Swapped pins
            (4, 5),    # Another alternative
            (18, 19)   # Another alternative
        ]
        
        for sda_pin, scl_pin in pin_combinations:
            print(f"\n🔍 Testing OLED with SDA={sda_pin}, SCL={scl_pin}:")
            try:
                i2c = SoftI2C(sda=Pin(sda_pin), scl=Pin(scl_pin))
                oled = ssd1306.SSD1306_I2C(128, 64, i2c)
                
                # Test basic functionality
                oled.fill(0)
                oled.text("OLED Test", 0, 0)
                oled.text("Working!", 0, 10)
                oled.show()
                
                print(f"  ✅ SUCCESS! OLED working on pins {sda_pin}, {scl_pin}")
                time.sleep(2)
                
                # Clear display
                oled.fill(0)
                oled.show()
                return True
                
            except Exception as e:
                print(f"  ❌ Failed: {e}")
        
        return False
        
    except ImportError:
        print("❌ ssd1306 library not found!")
        print("💡 Make sure ssd1306.py is uploaded to your ESP32")
        return False
    except Exception as e:
        print(f"❌ General error: {e}")
        return False

def check_hardware_connections():
    """Check hardware connections"""
    print("\n🔌 Hardware Connection Check")
    print("=" * 30)
    
    print("📋 Required Connections:")
    print("  OLED Display -> ESP32")
    print("  VCC -> 3.3V")
    print("  GND -> GND")
    print("  SDA -> GPIO 13 (or 21)")
    print("  SCL -> GPIO 15 (or 22)")
    
    print("\n🔍 Common Issues:")
    print("  1. ❌ OLED not connected")
    print("  2. ❌ Wrong pin numbers")
    print("  3. ❌ Loose connections")
    print("  4. ❌ Wrong voltage (needs 3.3V, not 5V)")
    print("  5. ❌ Missing ssd1306 library")
    
    print("\n💡 Troubleshooting Steps:")
    print("  1. Check all wire connections")
    print("  2. Try different pin combinations")
    print("  3. Make sure OLED is powered (3.3V)")
    print("  4. Upload ssd1306.py library")
    print("  5. Try a different OLED display")

def run_diagnostic():
    """Run complete diagnostic"""
    print("🚀 OLED Display Diagnostic")
    print("=" * 50)
    
    # Step 1: Scan for I2C devices
    devices = test_i2c_scan()
    
    # Step 2: Test OLED connection
    oled_working = test_oled_connection()
    
    # Step 3: Check hardware
    check_hardware_connections()
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 DIAGNOSTIC SUMMARY")
    print("=" * 50)
    
    if devices:
        print(f"✅ I2C devices found: {len(devices)}")
        for device in devices:
            print(f"   Address: 0x{device:02X}")
    else:
        print("❌ No I2C devices found")
    
    if oled_working:
        print("✅ OLED display is working!")
    else:
        print("❌ OLED display not working")
        print("💡 Check hardware connections and try different pins")
    
    print("\n🎯 Next Steps:")
    if not devices:
        print("  1. Check I2C wire connections")
        print("  2. Try different pin combinations")
        print("  3. Make sure OLED is powered")
    elif not oled_working:
        print("  1. Upload ssd1306.py library")
        print("  2. Try different OLED addresses")
        print("  3. Check OLED display type")
    else:
        print("  1. Your OLED is working! 🎉")
        print("  2. You can now use OLED in your projects")

# Run the diagnostic
if __name__ == "__main__":
    run_diagnostic()
