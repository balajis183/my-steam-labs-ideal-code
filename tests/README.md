# ESP32 Test Suite - Complete Testing Framework

## Overview

This test suite organizes all your ESP32 examples into a systematic testing framework. Instead of having scattered test files, everything is now organized into categories with proper reporting.

## Test Structure

```
tests/
├── main_test_runner.py              # Main test runner (run this first!)
├── comprehensive_test_suite.py     # Comprehensive test suite
├── hardware_tests/
│   └── led_gpio_tests.py           # LED and GPIO tests
├── sensor_tests/
│   └── adc_tests.py                # ADC and analog sensor tests
└── communication_tests/
    └── spi_i2c_tests.py            # SPI and I2C communication tests
```

## How to Use

### 1. Quick Start - Run All Tests
```python
# Upload and run this file first
main_test_runner.py
```

This will run all your test examples systematically and give you a comprehensive report.

### 2. Run Individual Test Categories

#### Hardware Tests (LED, GPIO, Buttons)
```python
# Upload and run
tests/hardware_tests/led_gpio_tests.py
```

#### Sensor Tests (ADC, Analog Input)
```python
# Upload and run
tests/sensor_tests/adc_tests.py
```

#### Communication Tests (SPI, I2C, OLED)
```python
# Upload and run
tests/communication_tests/spi_i2c_tests.py
```

### 3. Run Comprehensive Test Suite
```python
# Upload and run
tests/comprehensive_test_suite.py
```

## What Each Test Does

### System Tests
- **System Information**: Shows board name, firmware version, CPU frequency
- **Timing Functions**: Tests time measurement accuracy

### Hardware Tests
- **LED Basic Control**: Tests LED ON/OFF functionality
- **LED Blink Pattern**: Tests LED blinking with timing
- **Button-LED Interaction**: Tests button input with LED output
- **GPIO Pins**: Tests multiple GPIO pin functionality

### Sensor Tests
- **ADC Basic (Pin 35)**: Tests analog-to-digital conversion
- **ADC Dual (Pins 34,35)**: Tests multiple ADC pins
- **ADC Multiple Pins**: Tests all available ADC pins
- **ADC with Potentiometer**: Interactive test with potentiometer

### Communication Tests
- **SPI Basic**: Tests SPI communication protocol
- **SPI Alternative**: Tests different SPI configurations
- **I2C Basic**: Tests I2C device scanning
- **I2C Alternative**: Tests I2C with different pins
- **OLED Display**: Tests OLED display functionality
- **SPI with Device**: Tests SPI with actual devices

## Expected Results

### With No Hardware Connected:
```
System Tests: ✅ PASSED
Hardware Tests: ✅ PASSED (LED works)
Sensor Tests: ✅ PASSED (ADC reads 0 - normal)
Communication Tests: ⚠️ PARTIAL (SPI/I2C work, OLED may fail)
```

### With Hardware Connected:
```
System Tests: ✅ PASSED
Hardware Tests: ✅ PASSED
Sensor Tests: ✅ PASSED (with varying values)
Communication Tests: ✅ PASSED (with devices)
```

## Test Categories Explained

### ✅ PASS
- Test completed successfully
- Hardware is working correctly
- Expected behavior observed

### ❌ FAIL
- Test failed to complete
- Hardware issue detected
- Unexpected behavior

### ⚠️ PARTIAL
- Test partially worked
- Some hardware missing
- Normal for missing components

## Hardware Requirements

### Minimum (Basic Tests)
- ESP32 board
- USB cable
- No additional hardware needed

### Recommended (Full Tests)
- ESP32 board
- USB cable
- 10kΩ potentiometer (for ADC tests)
- Push button (for button tests)
- OLED display (for display tests)
- Breadboard and jumper wires

## Troubleshooting

### Tests Failing?
1. **Check connections**: Ensure wires are properly connected
2. **Check power**: Make sure ESP32 is powered
3. **Check pin numbers**: Verify correct pin assignments
4. **Check hardware**: Ensure components are working

### OLED Test Failing?
- Connect OLED display to pins 13 (SDA) and 15 (SCL)
- Make sure ssd1306 library is available
- Check I2C connections

### ADC Tests Showing 0?
- This is normal for unconnected pins
- Connect potentiometer to see varying values
- Check pin connections

### SPI Tests Showing Zeros?
- This is normal for unconnected SPI devices
- Connect SPI device to see real data
- Check pin assignments

## Benefits of This Organization

1. **Systematic Testing**: All tests run in logical order
2. **Clear Reporting**: Easy to see what passed/failed
3. **Organized Code**: Tests are grouped by functionality
4. **Reusable**: Can run individual test categories
5. **Professional**: Industry-standard testing approach

## Next Steps

1. **Run main_test_runner.py** first to see overall status
2. **Connect hardware** to see real sensor data
3. **Run individual tests** to debug specific issues
4. **Add your own tests** to the framework
5. **Build projects** using the tested components

## Example Output

```
🚀 ESP32 COMPLETE TEST SUITE
============================================================
Testing all your ESP32 examples systematically
============================================================

============================================================
🧪 SYSTEM TESTS
============================================================

🔍 Running: System Information
----------------------------------------
Board name: ESP32
Firmware version: v1.26.0
MicroPython version: 1.26.0
CPU Frequency: 240000000 Hz
Unique ID: 1234567890abcdef
✅ PASS: System Information

📊 System: 2/2 PASSED

============================================================
🧪 HARDWARE TESTS
============================================================
...

📊 FINAL TEST SUMMARY
============================================================
Total Tests: 12
Passed: 11
Failed: 1
Success Rate: 91.7%

🎉 ALL TESTS PASSED! Your ESP32 is working perfectly!
============================================================
```

This organized approach makes testing much more professional and easier to manage!
