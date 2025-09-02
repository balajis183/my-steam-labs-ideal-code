# Main Test Runner - ESP32 Complete Test Suite
# This runs all your test examples in an organized way

import time
import os
import machine

class TestRunner:
    def __init__(self):
        self.results = {}
        self.total_tests = 0
        self.passed_tests = 0
        
    def run_test_category(self, category_name, test_functions):
        """Run a category of tests"""
        print(f"\n{'='*60}")
        print(f"🧪 {category_name.upper()} TESTS")
        print(f"{'='*60}")
        
        category_passed = 0
        category_total = len(test_functions)
        
        for test_name, test_func in test_functions:
            print(f"\n🔍 Running: {test_name}")
            print("-" * 40)
            
            try:
                result = test_func()
                if result:
                    print(f"✅ PASS: {test_name}")
                    category_passed += 1
                    self.passed_tests += 1
                else:
                    print(f"❌ FAIL: {test_name}")
            except Exception as e:
                print(f"❌ ERROR: {test_name} - {str(e)}")
            
            self.total_tests += 1
            time.sleep(0.5)  # Brief pause between tests
        
        print(f"\n📊 {category_name}: {category_passed}/{category_total} PASSED")
        return category_passed == category_total

def test_system_info():
    """Test system information"""
    print("Board name:", os.uname().machine)
    print("Firmware version:", os.uname().version)
    print("MicroPython version:", os.uname().release)
    print("CPU Frequency:", machine.freq(), "Hz")
    print("Unique ID:", machine.unique_id().hex())
    return True

def test_timing():
    """Test timing functions"""
    start = time.ticks_ms()
    time.sleep(2)
    uptime = time.ticks_diff(time.ticks_ms(), start)
    print(f"Measured 2 seconds: {uptime} ms")
    return True

def test_led_basic():
    """Test basic LED functionality"""
    led = machine.Pin(2, machine.Pin.OUT)
    led.on()
    time.sleep(1)
    led.off()
    time.sleep(1)
    return True

def test_led_blink():
    """Test LED blinking"""
    led = machine.Pin(2, machine.Pin.OUT)
    for i in range(5):
        led.on()
        time.sleep(0.5)
        led.off()
        time.sleep(0.5)
    return True

def test_adc_basic():
    """Test basic ADC"""
    from machine import ADC, Pin
    adc = ADC(Pin(35))
    adc.atten(ADC.ATTN_11DB)
    adc.width(ADC.WIDTH_12BIT)
    
    for i in range(3):
        raw_value = adc.read()
        voltage = raw_value * (3.3 / 4095)
        print(f"ADC {i+1}: {raw_value} -> {voltage:.3f}V")
        time.sleep(0.5)
    return True

def test_adc_dual():
    """Test dual ADC pins"""
    from machine import ADC, Pin
    adc34 = ADC(Pin(34))
    adc35 = ADC(Pin(35))
    adc34.atten(ADC.ATTN_11DB)
    adc35.atten(ADC.ATTN_11DB)
    
    for i in range(3):
        val34 = adc34.read()
        val35 = adc35.read()
        print(f"IO34: {val34}, IO35: {val35}")
        time.sleep(1)
    return True

def test_spi_basic():
    """Test basic SPI"""
    from machine import SPI, Pin
    spi = SPI(1, baudrate=1000000, polarity=0, phase=0, 
             sck=Pin(14), mosi=Pin(13), miso=Pin(12))
    buf = bytearray([0x01, 0x02, 0x03])
    spi.write(buf)
    read_buf = spi.read(3)
    print(f"SPI: Sent {buf}, Received {read_buf}")
    return True

def test_spi_alternative():
    """Test SPI alternative config"""
    from machine import SPI, Pin
    spi = SPI(1, baudrate=1000000, polarity=0, phase=0)
    buf = bytearray([0x01, 0x07, 0x03])
    spi.write(buf)
    read_buf = spi.read(3)
    print(f"SPI Alt: Sent {buf}, Received {read_buf}")
    return True

def test_button_led():
    """Test button with LED"""
    from machine import Pin
    led = Pin(2, Pin.OUT)
    button = Pin(0, Pin.IN, Pin.PULL_UP)
    
    print("Testing button-LED (10 seconds)...")
    for i in range(20):
        if button.value() == 0:
            led.on()
        else:
            led.off()
        time.sleep(0.5)
    return True

def test_oled_display():
    """Test OLED display"""
    try:
        from machine import Pin, SoftI2C
        import ssd1306
        
        i2c = SoftI2C(sda=Pin(13), scl=Pin(15))
        oled = ssd1306.SSD1306_I2C(128, 64, i2c)
        
        oled.fill(0)
        oled.text("ESP32 Test", 0, 0)
        oled.text("OLED Working!", 0, 10)
        oled.show()
        time.sleep(3)
        oled.fill(0)
        oled.show()
        return True
    except Exception as e:
        print(f"OLED test failed: {e}")
        return False

def run_complete_test_suite():
    """Run the complete test suite"""
    print("🚀 ESP32 COMPLETE TEST SUITE")
    print("=" * 60)
    print("Testing all your ESP32 examples systematically")
    print("=" * 60)
    
    runner = TestRunner()
    
    # System Tests
    system_tests = [
        ("System Information", test_system_info),
        ("Timing Functions", test_timing)
    ]
    runner.run_test_category("System", system_tests)
    
    # Hardware Tests
    hardware_tests = [
        ("LED Basic Control", test_led_basic),
        ("LED Blink Pattern", test_led_blink),
        ("Button-LED Interaction", test_button_led)
    ]
    runner.run_test_category("Hardware", hardware_tests)
    
    # Sensor Tests
    sensor_tests = [
        ("ADC Basic (Pin 35)", test_adc_basic),
        ("ADC Dual (Pins 34,35)", test_adc_dual)
    ]
    runner.run_test_category("Sensors", sensor_tests)
    
    # Communication Tests
    communication_tests = [
        ("SPI Basic", test_spi_basic),
        ("SPI Alternative", test_spi_alternative),
        ("OLED Display", test_oled_display)
    ]
    runner.run_test_category("Communication", communication_tests)
    
    # Final Summary
    print(f"\n{'='*60}")
    print("📊 FINAL TEST SUMMARY")
    print(f"{'='*60}")
    print(f"Total Tests: {runner.total_tests}")
    print(f"Passed: {runner.passed_tests}")
    print(f"Failed: {runner.total_tests - runner.passed_tests}")
    print(f"Success Rate: {(runner.passed_tests/runner.total_tests)*100:.1f}%")
    
    if runner.passed_tests == runner.total_tests:
        print("\n🎉 ALL TESTS PASSED! Your ESP32 is working perfectly!")
    else:
        print("\n⚠️ Some tests failed. Check hardware connections.")
    
    print(f"\n{'='*60}")
    return runner.passed_tests == runner.total_tests

if __name__ == "__main__":
    success = run_complete_test_suite()
    if success:
        print("✅ Test suite completed successfully!")
    else:
        print("❌ Some tests failed. Review the output above.")
