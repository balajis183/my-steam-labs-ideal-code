# Simple OLED Test - Copy and paste this into your ESP32
# This will test if your OLED is connected and working

from machine import Pin, SoftI2C
import time

print("🔍 Simple OLED Test")
print("=" * 30)

# Test different pin combinations
pin_combinations = [
    (21, 22),  # Most common
    (4, 5),    # Alternative
    (18, 19),  # Alternative
    (25, 26),  # Alternative
]

for sda_pin, scl_pin in pin_combinations:
    print(f"\n🔍 Testing pins SDA={sda_pin}, SCL={scl_pin}:")
    
    try:
        # Try to create I2C
        i2c = SoftI2C(sda=Pin(sda_pin), scl=Pin(scl_pin))
        
        # Scan for devices
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
                
                # Test display
                oled.fill(0)
                oled.text("OLED Test", 0, 0)
                oled.text(f"Pins: {sda_pin},{scl_pin}", 0, 10)
                oled.text("Working!", 0, 20)
                oled.show()
                
                print(f"  🎉 OLED WORKING!")
                print(f"  💻 Use these pins: SDA={sda_pin}, SCL={scl_pin}")
                
                time.sleep(3)
                oled.fill(0)
                oled.show()
                break
                
            except Exception as e:
                print(f"  ⚠️ I2C works but OLED failed: {e}")
        else:
            print(f"  ⚠️ No devices found")
            
    except Exception as e:
        print(f"  ❌ Failed: {e}")

print("\n" + "=" * 30)
print("📊 TEST COMPLETE")
print("=" * 30)
