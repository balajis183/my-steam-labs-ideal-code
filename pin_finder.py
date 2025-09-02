# ESP32 Pin Finder - Find Available Pins for OLED
# This will test different pin combinations to find working ones

from machine import Pin, SoftI2C, I2C
import time

print("🔍 ESP32 Pin Finder for OLED Display")
print("=" * 50)

def test_pin_availability():
    """Test which pins are available on your ESP32"""
    print("\n📌 Testing Pin Availability...")
    
    # Common ESP32 GPIO pins (excluding special pins)
    test_pins = [2, 4, 5, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 23, 25, 26, 27, 32, 33]
    
    available_pins = []
    
    for pin_num in test_pins:
        try:
            # Try to create a pin object
            pin = Pin(pin_num, Pin.OUT)
            pin.on()
            pin.off()
            available_pins.append(pin_num)
            print(f"  ✅ Pin {pin_num}: Available")
        except Exception as e:
            print(f"  ❌ Pin {pin_num}: Not available - {e}")
    
    return available_pins

def test_i2c_combinations():
    """Test different I2C pin combinations"""
    print("\n📡 Testing I2C Pin Combinations...")
    
    # Common I2C pin combinations for ESP32
    combinations = [
        (21, 22),  # Most common
        (22, 21),  # Swapped
        (13, 15),  # Original
        (15, 13),  # Swapped
        (4, 5),    # Alternative
        (5, 4),    # Swapped
        (18, 19),  # Alternative
        (19, 18),  # Swapped
        (25, 26),  # Alternative
        (26, 25),  # Swapped
        (32, 33),  # Alternative
        (33, 32),  # Swapped
    ]
    
    working_combinations = []
    
    for sda_pin, scl_pin in combinations:
        print(f"\n🔍 Testing SDA={sda_pin}, SCL={scl_pin}:")
        try:
            # Try SoftI2C first
            i2c = SoftI2C(sda=Pin(sda_pin), scl=Pin(scl_pin))
            devices = i2c.scan()
            
            if devices:
                print(f"  ✅ SoftI2C: Found {len(devices)} device(s)")
                for addr in devices:
                    print(f"    Address: 0x{addr:02X}")
                    if addr in [0x3C, 0x3D, 0x78, 0x7A]:
                        print(f"    ⭐ This looks like an OLED display!")
                working_combinations.append(("SoftI2C", sda_pin, scl_pin, devices))
            else:
                print(f"  ⚠️ SoftI2C: No devices found (but pins work)")
                working_combinations.append(("SoftI2C", sda_pin, scl_pin, []))
                
        except Exception as e:
            print(f"  ❌ SoftI2C: Failed - {e}")
        
        try:
            # Try Hardware I2C
            i2c = I2C(0, sda=Pin(sda_pin), scl=Pin(scl_pin))
            devices = i2c.scan()
            
            if devices:
                print(f"  ✅ Hardware I2C: Found {len(devices)} device(s)")
                for addr in devices:
                    print(f"    Address: 0x{addr:02X}")
                    if addr in [0x3C, 0x3D, 0x78, 0x7A]:
                        print(f"    ⭐ This looks like an OLED display!")
                working_combinations.append(("Hardware I2C", sda_pin, scl_pin, devices))
            else:
                print(f"  ⚠️ Hardware I2C: No devices found (but pins work)")
                working_combinations.append(("Hardware I2C", sda_pin, scl_pin, []))
                
        except Exception as e:
            print(f"  ❌ Hardware I2C: Failed - {e}")
    
    return working_combinations

def test_oled_with_pins(sda_pin, scl_pin, i2c_type="SoftI2C"):
    """Test OLED display with specific pins"""
    print(f"\n📺 Testing OLED with {i2c_type} - SDA={sda_pin}, SCL={scl_pin}")
    
    try:
        from machine import Pin, SoftI2C, I2C
        import ssd1306
        
        # Create I2C object
        if i2c_type == "SoftI2C":
            i2c = SoftI2C(sda=Pin(sda_pin), scl=Pin(scl_pin))
        else:
            i2c = I2C(0, sda=Pin(sda_pin), scl=Pin(scl_pin))
        
        # Try to create OLED object
        oled = ssd1306.SSD1306_I2C(128, 64, i2c)
        
        # Test basic functionality
        oled.fill(0)
        oled.text("OLED Test", 0, 0)
        oled.text(f"Pins: {sda_pin},{scl_pin}", 0, 10)
        oled.text("Working!", 0, 20)
        oled.show()
        
        print(f"  ✅ SUCCESS! OLED working with {i2c_type}")
        print(f"  📍 Use these pins: SDA={sda_pin}, SCL={scl_pin}")
        
        time.sleep(3)
        
        # Clear display
        oled.fill(0)
        oled.show()
        
        return True
        
    except ImportError:
        print(f"  ❌ ssd1306 library not found!")
        return False
    except Exception as e:
        print(f"  ❌ OLED test failed: {e}")
        return False

def find_best_pins():
    """Find the best available pins for OLED"""
    print("🚀 Finding Best Pins for OLED Display")
    print("=" * 50)
    
    # Step 1: Test pin availability
    available_pins = test_pin_availability()
    
    # Step 2: Test I2C combinations
    working_combinations = test_i2c_combinations()
    
    # Step 3: Test OLED with working combinations
    print("\n📺 Testing OLED with Working Combinations...")
    
    oled_working = False
    best_config = None
    
    for i2c_type, sda_pin, scl_pin, devices in working_combinations:
        if test_oled_with_pins(sda_pin, scl_pin, i2c_type):
            oled_working = True
            best_config = (i2c_type, sda_pin, scl_pin)
            break
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 PIN FINDER RESULTS")
    print("=" * 50)
    
    print(f"✅ Available GPIO pins: {len(available_pins)}")
    print(f"   {available_pins}")
    
    print(f"\n📡 Working I2C combinations: {len(working_combinations)}")
    for i2c_type, sda_pin, scl_pin, devices in working_combinations:
        print(f"   {i2c_type}: SDA={sda_pin}, SCL={scl_pin}")
        if devices:
            print(f"     Found devices: {[hex(d) for d in devices]}")
    
    if oled_working and best_config:
        i2c_type, sda_pin, scl_pin = best_config
        print(f"\n🎉 OLED WORKING!")
        print(f"📍 Best configuration:")
        print(f"   I2C Type: {i2c_type}")
        print(f"   SDA Pin: {sda_pin}")
        print(f"   SCL Pin: {scl_pin}")
        
        print(f"\n💻 Use this code:")
        print(f"from machine import Pin, {i2c_type}")
        print(f"import ssd1306")
        print(f"")
        print(f"i2c = {i2c_type}(sda=Pin({sda_pin}), scl=Pin({scl_pin}))")
        print(f"oled = ssd1306.SSD1306_I2C(128, 64, i2c)")
        
    else:
        print(f"\n❌ OLED not working with any combination")
        print(f"💡 Possible issues:")
        print(f"   1. OLED not connected")
        print(f"   2. Wrong voltage (needs 3.3V)")
        print(f"   3. Missing ssd1306 library")
        print(f"   4. OLED display is faulty")

# Run the pin finder
if __name__ == "__main__":
    find_best_pins()
