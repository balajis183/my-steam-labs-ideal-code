# Quick OLED Pin Test - Try Alternative Pins
# This will quickly test the most common alternative pin combinations

from machine import Pin, SoftI2C, I2C
import time

print("🔍 Quick OLED Pin Test")
print("=" * 40)

def quick_test():
    """Quick test of common pin combinations"""
    
    # Most common alternative pin combinations
    combinations = [
        ("Pins 21,22 (Most Common)", 21, 22),
        ("Pins 22,21 (Swapped)", 22, 21),
        ("Pins 4,5 (Alternative)", 4, 5),
        ("Pins 5,4 (Swapped)", 5, 4),
        ("Pins 18,19 (Alternative)", 18, 19),
        ("Pins 19,18 (Swapped)", 19, 18),
        ("Pins 25,26 (Alternative)", 25, 26),
        ("Pins 26,25 (Swapped)", 26, 25),
    ]
    
    print("Testing common pin combinations...")
    
    for name, sda_pin, scl_pin in combinations:
        print(f"\n🔍 {name} (SDA={sda_pin}, SCL={scl_pin}):")
        
        # Test SoftI2C
        try:
            i2c = SoftI2C(sda=Pin(sda_pin), scl=Pin(scl_pin))
            devices = i2c.scan()
            
            if devices:
                print(f"  ✅ Found {len(devices)} device(s):")
                for addr in devices:
                    print(f"    Address: 0x{addr:02X}")
                    if addr in [0x3C, 0x3D, 0x78, 0x7A]:
                        print(f"    ⭐ This looks like an OLED display!")
                
                # Try to test OLED
                try:
                    import ssd1306
                    oled = ssd1306.SSD1306_I2C(128, 64, i2c)
                    oled.fill(0)
                    oled.text("OLED Working!", 0, 0)
                    oled.text(f"Pins: {sda_pin},{scl_pin}", 0, 10)
                    oled.show()
                    
                    print(f"  🎉 OLED WORKING with pins {sda_pin},{scl_pin}!")
                    print(f"  💻 Use this code:")
                    print(f"     i2c = SoftI2C(sda=Pin({sda_pin}), scl=Pin({scl_pin}))")
                    print(f"     oled = ssd1306.SSD1306_I2C(128, 64, i2c)")
                    
                    time.sleep(3)
                    oled.fill(0)
                    oled.show()
                    return True
                    
                except Exception as e:
                    print(f"  ⚠️ I2C works but OLED failed: {e}")
            else:
                print(f"  ⚠️ No devices found (but pins work)")
                
        except Exception as e:
            print(f"  ❌ Failed: {e}")
    
    return False

def test_hardware_i2c():
    """Test hardware I2C with common pins"""
    print("\n🔍 Testing Hardware I2C...")
    
    combinations = [
        (21, 22),
        (22, 21),
        (4, 5),
        (5, 4),
    ]
    
    for sda_pin, scl_pin in combinations:
        print(f"\n🔍 Hardware I2C - SDA={sda_pin}, SCL={scl_pin}:")
        try:
            i2c = I2C(0, sda=Pin(sda_pin), scl=Pin(scl_pin))
            devices = i2c.scan()
            
            if devices:
                print(f"  ✅ Found {len(devices)} device(s):")
                for addr in devices:
                    print(f"    Address: 0x{addr:02X}")
                    if addr in [0x3C, 0x3D, 0x78, 0x7A]:
                        print(f"    ⭐ This looks like an OLED display!")
                
                # Try to test OLED
                try:
                    import ssd1306
                    oled = ssd1306.SSD1306_I2C(128, 64, i2c)
                    oled.fill(0)
                    oled.text("OLED Working!", 0, 0)
                    oled.text(f"HW I2C: {sda_pin},{scl_pin}", 0, 10)
                    oled.show()
                    
                    print(f"  🎉 OLED WORKING with Hardware I2C!")
                    print(f"  💻 Use this code:")
                    print(f"     i2c = I2C(0, sda=Pin({sda_pin}), scl=Pin({scl_pin}))")
                    print(f"     oled = ssd1306.SSD1306_I2C(128, 64, i2c)")
                    
                    time.sleep(3)
                    oled.fill(0)
                    oled.show()
                    return True
                    
                except Exception as e:
                    print(f"  ⚠️ I2C works but OLED failed: {e}")
            else:
                print(f"  ⚠️ No devices found")
                
        except Exception as e:
            print(f"  ❌ Failed: {e}")
    
    return False

# Run the quick test
print("Starting quick pin test...")
soft_i2c_working = quick_test()

if not soft_i2c_working:
    hardware_i2c_working = test_hardware_i2c()
else:
    hardware_i2c_working = False

print("\n" + "=" * 40)
print("📊 QUICK TEST RESULTS")
print("=" * 40)

if soft_i2c_working or hardware_i2c_working:
    print("✅ OLED display is working!")
    print("🎉 You found working pins!")
else:
    print("❌ OLED not working with common pins")
    print("💡 Try these steps:")
    print("   1. Check OLED connections (VCC, GND, SDA, SCL)")
    print("   2. Make sure OLED is powered (3.3V)")
    print("   3. Upload ssd1306.py library")
    print("   4. Try different OLED display")
    print("   5. Run pin_finder.py for comprehensive testing")
