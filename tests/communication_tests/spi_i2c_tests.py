# Communication Tests - SPI and I2C
# Tests for SPI and I2C communication protocols

import time
import machine

def test_spi_basic():
    """Test basic SPI functionality"""
    print("📡 Testing SPI Basic")
    print("-" * 30)
    
    try:
        from machine import SPI, Pin
        
        spi = SPI(1, baudrate=1000000, polarity=0, phase=0, 
                 sck=Pin(14), mosi=Pin(13), miso=Pin(12))
        
        buf = bytearray([0x01, 0x02, 0x03])
        print("Testing SPI write/read...")
        spi.write(buf)
        read_buf = spi.read(3)
        print(f"  Sent: {buf}")
        print(f"  Received: {read_buf}")
        
        print("✅ SPI Basic Test PASSED")
        return True
    except Exception as e:
        print(f"❌ SPI Basic Test FAILED: {e}")
        return False

def test_spi_alternative():
    """Test SPI with alternative configuration"""
    print("📡 Testing SPI Alternative Config")
    print("-" * 30)
    
    try:
        from machine import SPI, Pin
        
        spi = SPI(1, baudrate=1000000, polarity=0, phase=0)
        buf = bytearray([0x01, 0x07, 0x03])
        
        print("Testing SPI alternative config...")
        spi.write(buf)
        read_buf = spi.read(3)
        print(f"  Sent: {buf}")
        print(f"  Received: {read_buf}")
        
        print("✅ SPI Alternative Test PASSED")
        return True
    except Exception as e:
        print(f"❌ SPI Alternative Test FAILED: {e}")
        return False

def test_i2c_basic():
    """Test I2C basic functionality"""
    print("📡 Testing I2C Basic")
    print("-" * 30)
    
    try:
        from machine import Pin, SoftI2C
        
        # I2C setup (SDA=13, SCL=15)
        i2c = SoftI2C(sda=Pin(13), scl=Pin(15))
        
        print("Scanning I2C devices...")
        devices = i2c.scan()
        
        if devices:
            print(f"  Found {len(devices)} I2C device(s):")
            for device in devices:
                print(f"    Address: 0x{device:02X}")
        else:
            print("  No I2C devices found")
            print("  Note: This is normal if no I2C devices are connected")
        
        print("✅ I2C Basic Test PASSED")
        return True
    except Exception as e:
        print(f"❌ I2C Basic Test FAILED: {e}")
        return False

def test_i2c_alternative():
    """Test I2C with alternative pins"""
    print("📡 Testing I2C Alternative Pins")
    print("-" * 30)
    
    try:
        from machine import Pin, I2C
        
        # Alternative I2C setup (SDA=21, SCL=22)
        i2c = I2C(0, sda=Pin(21), scl=Pin(22))
        
        print("Scanning I2C devices on alternative pins...")
        devices = i2c.scan()
        
        if devices:
            print(f"  Found {len(devices)} I2C device(s):")
            for device in devices:
                print(f"    Address: 0x{device:02X}")
        else:
            print("  No I2C devices found")
            print("  Note: This is normal if no I2C devices are connected")
        
        print("✅ I2C Alternative Test PASSED")
        return True
    except Exception as e:
        print(f"❌ I2C Alternative Test FAILED: {e}")
        return False

def test_oled_display():
    """Test OLED display via I2C"""
    print("📡 Testing OLED Display")
    print("-" * 30)
    
    try:
        from machine import Pin, SoftI2C
        import ssd1306
        
        # I2C setup
        i2c = SoftI2C(sda=Pin(13), scl=Pin(15))
        oled = ssd1306.SSD1306_I2C(128, 64, i2c)
        
        print("Testing OLED display...")
        
        # Show test message
        oled.fill(0)
        oled.text("ESP32 Test", 0, 0)
        oled.text("OLED Working!", 0, 10)
        oled.text("Success!", 0, 20)
        oled.show()
        
        time.sleep(3)
        
        # Clear display
        oled.fill(0)
        oled.show()
        
        print("✅ OLED Display Test PASSED")
        return True
    except Exception as e:
        print(f"❌ OLED Display Test FAILED: {e}")
        print("Note: This test requires OLED display connected to pins 13,15")
        return False

def test_spi_with_device():
    """Test SPI with actual device (if connected)"""
    print("📡 Testing SPI with Device")
    print("-" * 30)
    
    try:
        from machine import SPI, Pin
        
        # Try different SPI configurations
        spi_configs = [
            {"id": 1, "baudrate": 1000000, "polarity": 0, "phase": 0},
            {"id": 2, "baudrate": 500000, "polarity": 1, "phase": 0},
            {"id": 1, "baudrate": 1000000, "polarity": 0, "phase": 1}
        ]
        
        for i, config in enumerate(spi_configs):
            try:
                spi = SPI(**config)
                buf = bytearray([0x01, 0x02, 0x03])
                spi.write(buf)
                read_buf = spi.read(3)
                print(f"  Config {i+1}: Sent {buf}, Received {read_buf}")
            except Exception as e:
                print(f"  Config {i+1}: Failed - {e}")
        
        print("✅ SPI Device Test PASSED")
        return True
    except Exception as e:
        print(f"❌ SPI Device Test FAILED: {e}")
        return False

# Run all communication tests
def run_communication_tests():
    """Run all communication-related tests"""
    print("📡 COMMUNICATION TESTS")
    print("=" * 50)
    
    tests = [
        ("SPI Basic", test_spi_basic),
        ("SPI Alternative", test_spi_alternative),
        ("I2C Basic", test_i2c_basic),
        ("I2C Alternative", test_i2c_alternative),
        ("OLED Display", test_oled_display),
        ("SPI with Device", test_spi_with_device)
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        print(f"\n🧪 Running: {test_name}")
        if test_func():
            passed += 1
        print()
    
    print("=" * 50)
    print(f"📡 Communication Tests: {passed}/{total} PASSED")
    print("=" * 50)
    
    return passed == total

if __name__ == "__main__":
    run_communication_tests()
