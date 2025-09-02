# Comprehensive ESP32 Test Suite
# This organizes all your test examples into a systematic testing framework

import time
import machine
import os
import sys

class ESP32TestSuite:
    def __init__(self):
        self.test_results = {}
        self.total_tests = 0
        self.passed_tests = 0
        self.failed_tests = 0
        
    def run_test(self, test_name, test_function):
        """Run a single test and record results"""
        self.total_tests += 1
        print(f"\n🧪 Running: {test_name}")
        print("-" * 40)
        
        try:
            result = test_function()
            if result:
                print(f"✅ PASS: {test_name}")
                self.passed_tests += 1
                self.test_results[test_name] = "PASS"
            else:
                print(f"❌ FAIL: {test_name}")
                self.failed_tests += 1
                self.test_results[test_name] = "FAIL"
        except Exception as e:
            print(f"❌ ERROR: {test_name} - {str(e)}")
            self.failed_tests += 1
            self.test_results[test_name] = f"ERROR: {str(e)}"
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 50)
        print("📊 TEST SUMMARY")
        print("=" * 50)
        print(f"Total Tests: {self.total_tests}")
        print(f"Passed: {self.passed_tests}")
        print(f"Failed: {self.failed_tests}")
        print(f"Success Rate: {(self.passed_tests/self.total_tests)*100:.1f}%")
        
        print("\n📋 DETAILED RESULTS:")
        for test_name, result in self.test_results.items():
            status = "✅" if result == "PASS" else "❌"
            print(f"  {status} {test_name}: {result}")

# Test Functions
def test_system_info():
    """Test system information display"""
    try:
        print("Board name:", os.uname().machine)
        print("Firmware version:", os.uname().version)
        print("MicroPython version:", os.uname().release)
        print("CPU Frequency:", machine.freq(), "Hz")
        print("Unique ID:", machine.unique_id().hex())
        return True
    except Exception as e:
        print(f"Error getting system info: {e}")
        return False

def test_led_basic():
    """Test basic LED functionality"""
    try:
        led = machine.Pin(2, machine.Pin.OUT)
        
        print("Testing LED ON...")
        led.on()
        time.sleep(1)
        
        print("Testing LED OFF...")
        led.off()
        time.sleep(1)
        
        return True
    except Exception as e:
        print(f"Error testing LED: {e}")
        return False

def test_led_blink():
    """Test LED blinking pattern"""
    try:
        led = machine.Pin(2, machine.Pin.OUT)
        
        print("Blinking LED 5 times...")
        for i in range(5):
            led.on()
            time.sleep(0.5)
            led.off()
            time.sleep(0.5)
            print(f"  Blink {i+1}/5")
        
        return True
    except Exception as e:
        print(f"Error blinking LED: {e}")
        return False

def test_adc_basic():
    """Test ADC basic functionality"""
    try:
        from machine import ADC, Pin
        
        # Test ADC on pin 35
        adc = ADC(Pin(35))
        adc.atten(ADC.ATTN_11DB)
        adc.width(ADC.WIDTH_12BIT)
        
        print("Reading ADC pin 35...")
        for i in range(5):
            raw_value = adc.read()
            voltage = raw_value * (3.3 / 4095)
            print(f"  Sample {i+1}: {raw_value} -> {voltage:.3f}V")
            time.sleep(0.5)
        
        return True
    except Exception as e:
        print(f"Error testing ADC: {e}")
        return False

def test_adc_dual():
    """Test dual ADC pins"""
    try:
        from machine import ADC, Pin
        
        adc34 = ADC(Pin(34))
        adc35 = ADC(Pin(35))
        adc34.atten(ADC.ATTN_11DB)
        adc35.atten(ADC.ATTN_11DB)
        adc34.width(ADC.WIDTH_12BIT)
        adc35.width(ADC.WIDTH_12BIT)
        
        print("Reading dual ADC pins...")
        for i in range(5):
            val34 = adc34.read()
            val35 = adc35.read()
            print(f"  Sample {i+1}: IO34={val34}, IO35={val35}")
            time.sleep(1)
        
        return True
    except Exception as e:
        print(f"Error testing dual ADC: {e}")
        return False

def test_spi_basic():
    """Test SPI basic functionality"""
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
        
        return True
    except Exception as e:
        print(f"Error testing SPI: {e}")
        return False

def test_spi_alternative():
    """Test SPI with alternative configuration"""
    try:
        from machine import SPI, Pin
        
        spi = SPI(1, baudrate=1000000, polarity=0, phase=0)
        buf = bytearray([0x01, 0x07, 0x03])
        
        print("Testing SPI alternative config...")
        spi.write(buf)
        read_buf = spi.read(3)
        print(f"  Sent: {buf}")
        print(f"  Received: {read_buf}")
        
        return True
    except Exception as e:
        print(f"Error testing SPI alternative: {e}")
        return False

def test_timing():
    """Test timing functions"""
    try:
        print("Testing timing functions...")
        
        start = time.ticks_ms()
        time.sleep(2)
        uptime = time.ticks_diff(time.ticks_ms(), start)
        print(f"  Measured 2 seconds: {uptime} ms")
        
        return True
    except Exception as e:
        print(f"Error testing timing: {e}")
        return False

def test_button_led():
    """Test button with LED interaction"""
    try:
        from machine import Pin
        
        led = Pin(2, Pin.OUT)
        button = Pin(0, Pin.IN, Pin.PULL_UP)
        
        print("Testing button-LED interaction...")
        print("Press button to turn LED on (or simulate with wire)")
        
        for i in range(10):
            if button.value() == 0:
                led.on()
                print("  Button pressed - LED ON")
            else:
                led.off()
                print("  Button released - LED OFF")
            time.sleep(0.5)
        
        return True
    except Exception as e:
        print(f"Error testing button-LED: {e}")
        return False

def test_oled_display():
    """Test OLED display functionality"""
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
        
        return True
    except Exception as e:
        print(f"Error testing OLED: {e}")
        print("Note: This test requires OLED display connected to pins 13,15")
        return False

# Main test runner
def run_all_tests():
    """Run all tests in the suite"""
    print("🚀 ESP32 Comprehensive Test Suite")
    print("=" * 50)
    print("This will test all your ESP32 examples systematically")
    print("=" * 50)
    
    test_suite = ESP32TestSuite()
    
    # System tests
    test_suite.run_test("System Information", test_system_info)
    
    # LED tests
    test_suite.run_test("LED Basic Control", test_led_basic)
    test_suite.run_test("LED Blink Pattern", test_led_blink)
    
    # ADC tests
    test_suite.run_test("ADC Basic (Pin 35)", test_adc_basic)
    test_suite.run_test("ADC Dual (Pins 34,35)", test_adc_dual)
    
    # SPI tests
    test_suite.run_test("SPI Basic", test_spi_basic)
    test_suite.run_test("SPI Alternative", test_spi_alternative)
    
    # Other tests
    test_suite.run_test("Timing Functions", test_timing)
    test_suite.run_test("Button-LED Interaction", test_button_led)
    test_suite.run_test("OLED Display", test_oled_display)
    
    # Print summary
    test_suite.print_summary()
    
    return test_suite.passed_tests == test_suite.total_tests

# Run tests if this file is executed directly
if __name__ == "__main__":
    success = run_all_tests()
    if success:
        print("\n🎉 All tests passed!")
    else:
        print("\n⚠️ Some tests failed. Check hardware connections.")
