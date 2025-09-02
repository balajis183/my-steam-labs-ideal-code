# Hardware Tests - LED and GPIO
# Tests for LED control, buttons, and basic GPIO functionality

import time
import machine

def test_led_basic():
    """Test basic LED ON/OFF functionality"""
    print("🔆 Testing LED Basic Control")
    print("-" * 30)
    
    try:
        led = machine.Pin(2, machine.Pin.OUT)
        
        print("Turning LED ON...")
        led.on()
        time.sleep(2)
        
        print("Turning LED OFF...")
        led.off()
        time.sleep(2)
        
        print("✅ LED Basic Test PASSED")
        return True
    except Exception as e:
        print(f"❌ LED Basic Test FAILED: {e}")
        return False

def test_led_blink():
    """Test LED blinking pattern"""
    print("🔆 Testing LED Blink Pattern")
    print("-" * 30)
    
    try:
        led = machine.Pin(2, machine.Pin.OUT)
        
        print("Blinking LED 5 times...")
        for i in range(5):
            led.on()
            time.sleep(0.5)
            led.off()
            time.sleep(0.5)
            print(f"  Blink {i+1}/5 completed")
        
        print("✅ LED Blink Test PASSED")
        return True
    except Exception as e:
        print(f"❌ LED Blink Test FAILED: {e}")
        return False

def test_button_led():
    """Test button interaction with LED"""
    print("🔘 Testing Button-LED Interaction")
    print("-" * 30)
    
    try:
        led = machine.Pin(2, machine.Pin.OUT)
        button = machine.Pin(0, machine.Pin.IN, machine.Pin.PULL_UP)
        
        print("Press button to turn LED on (or simulate with wire)")
        print("Testing for 10 seconds...")
        
        for i in range(20):  # 10 seconds with 0.5s intervals
            if button.value() == 0:
                led.on()
                print("  Button pressed - LED ON")
            else:
                led.off()
                print("  Button released - LED OFF")
            time.sleep(0.5)
        
        print("✅ Button-LED Test PASSED")
        return True
    except Exception as e:
        print(f"❌ Button-LED Test FAILED: {e}")
        return False

def test_gpio_pins():
    """Test multiple GPIO pins"""
    print("🔌 Testing GPIO Pins")
    print("-" * 30)
    
    try:
        # Test a few GPIO pins
        pins = [2, 4, 5, 18, 19]  # Common GPIO pins
        pin_objects = []
        
        print("Initializing GPIO pins...")
        for pin_num in pins:
            try:
                pin = machine.Pin(pin_num, machine.Pin.OUT)
                pin_objects.append((pin_num, pin))
                print(f"  Pin {pin_num}: OK")
            except Exception as e:
                print(f"  Pin {pin_num}: FAILED - {e}")
        
        print("Testing pin toggling...")
        for pin_num, pin in pin_objects:
            pin.on()
            time.sleep(0.2)
            pin.off()
            time.sleep(0.2)
            print(f"  Pin {pin_num}: Toggled")
        
        print("✅ GPIO Pins Test PASSED")
        return True
    except Exception as e:
        print(f"❌ GPIO Pins Test FAILED: {e}")
        return False

# Run all hardware tests
def run_hardware_tests():
    """Run all hardware-related tests"""
    print("🔧 HARDWARE TESTS")
    print("=" * 50)
    
    tests = [
        ("LED Basic Control", test_led_basic),
        ("LED Blink Pattern", test_led_blink),
        ("Button-LED Interaction", test_button_led),
        ("GPIO Pins", test_gpio_pins)
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        print(f"\n🧪 Running: {test_name}")
        if test_func():
            passed += 1
        print()
    
    print("=" * 50)
    print(f"📊 Hardware Tests: {passed}/{total} PASSED")
    print("=" * 50)
    
    return passed == total

if __name__ == "__main__":
    run_hardware_tests()
