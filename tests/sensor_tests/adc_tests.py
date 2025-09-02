# Sensor Tests - ADC and Analog Input
# Tests for ADC functionality and analog sensor readings

import time
import machine

def test_adc_basic():
    """Test basic ADC functionality on pin 35"""
    print("📊 Testing ADC Basic (Pin 35)")
    print("-" * 30)
    
    try:
        from machine import ADC, Pin
        
        adc = ADC(Pin(35))
        adc.atten(ADC.ATTN_11DB)  # Full range: 0-3.3V
        adc.width(ADC.WIDTH_12BIT)  # 12-bit resolution
        
        print("Reading ADC pin 35...")
        for i in range(5):
            raw_value = adc.read()
            voltage = raw_value * (3.3 / 4095)
            print(f"  Sample {i+1}: {raw_value:4d} -> {voltage:.3f}V")
            time.sleep(0.5)
        
        print("✅ ADC Basic Test PASSED")
        return True
    except Exception as e:
        print(f"❌ ADC Basic Test FAILED: {e}")
        return False

def test_adc_dual():
    """Test dual ADC pins (34 and 35)"""
    print("📊 Testing ADC Dual (Pins 34,35)")
    print("-" * 30)
    
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
            voltage34 = val34 * (3.3 / 4095)
            voltage35 = val35 * (3.3 / 4095)
            print(f"  Sample {i+1}:")
            print(f"    IO34: {val34:4d} -> {voltage34:.3f}V")
            print(f"    IO35: {val35:4d} -> {voltage35:.3f}V")
            time.sleep(1)
        
        print("✅ ADC Dual Test PASSED")
        return True
    except Exception as e:
        print(f"❌ ADC Dual Test FAILED: {e}")
        return False

def test_adc_multiple_pins():
    """Test multiple ADC pins"""
    print("📊 Testing ADC Multiple Pins")
    print("-" * 30)
    
    try:
        from machine import ADC, Pin
        
        # ESP32 ADC pins: 32, 33, 34, 35, 36, 39
        adc_pins = [32, 33, 34, 35, 36, 39]
        adc_objects = []
        
        print("Initializing ADC pins...")
        for pin_num in adc_pins:
            try:
                adc = ADC(Pin(pin_num))
                adc.atten(ADC.ATTN_11DB)
                adc.width(ADC.WIDTH_12BIT)
                adc_objects.append((pin_num, adc))
                print(f"  Pin {pin_num}: OK")
            except Exception as e:
                print(f"  Pin {pin_num}: FAILED - {e}")
        
        print("Reading all ADC pins...")
        for i in range(3):
            print(f"  Sample {i+1}:")
            for pin_num, adc in adc_objects:
                raw_value = adc.read()
                voltage = raw_value * (3.3 / 4095)
                print(f"    Pin {pin_num}: {raw_value:4d} -> {voltage:.3f}V")
            time.sleep(1)
        
        print("✅ ADC Multiple Pins Test PASSED")
        return True
    except Exception as e:
        print(f"❌ ADC Multiple Pins Test FAILED: {e}")
        return False

def test_adc_with_potentiometer():
    """Test ADC with potentiometer (if connected)"""
    print("📊 Testing ADC with Potentiometer")
    print("-" * 30)
    
    try:
        from machine import ADC, Pin
        
        adc = ADC(Pin(35))
        adc.atten(ADC.ATTN_11DB)
        adc.width(ADC.WIDTH_12BIT)
        
        print("If you have a potentiometer connected to pin 35:")
        print("Turn it slowly and watch the values change!")
        print("Reading for 10 seconds...")
        
        for i in range(20):  # 10 seconds with 0.5s intervals
            raw_value = adc.read()
            voltage = raw_value * (3.3 / 4095)
            
            # Create a simple bar graph
            bar_length = int((raw_value / 4095) * 20)
            bar = "█" * bar_length + "░" * (20 - bar_length)
            
            print(f"  {i+1:2d}: {raw_value:4d} -> {voltage:.3f}V [{bar}]")
            time.sleep(0.5)
        
        print("✅ ADC Potentiometer Test PASSED")
        return True
    except Exception as e:
        print(f"❌ ADC Potentiometer Test FAILED: {e}")
        return False

# Run all sensor tests
def run_sensor_tests():
    """Run all sensor-related tests"""
    print("📊 SENSOR TESTS")
    print("=" * 50)
    
    tests = [
        ("ADC Basic (Pin 35)", test_adc_basic),
        ("ADC Dual (Pins 34,35)", test_adc_dual),
        ("ADC Multiple Pins", test_adc_multiple_pins),
        ("ADC with Potentiometer", test_adc_with_potentiometer)
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        print(f"\n🧪 Running: {test_name}")
        if test_func():
            passed += 1
        print()
    
    print("=" * 50)
    print(f"📊 Sensor Tests: {passed}/{total} PASSED")
    print("=" * 50)
    
    return passed == total

if __name__ == "__main__":
    run_sensor_tests()
