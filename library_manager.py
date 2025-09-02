#!/usr/bin/env python3
"""
Comprehensive MicroPython Library Manager
Handles all library operations: install, test, manage
"""

import os
import subprocess
import sys
import urllib.request
import time

# Configuration
LIBRARIES_FOLDER = "micropython_libraries"
DEFAULT_PORT = "COM6"

# Available libraries with their information
LIBRARIES = {
    'ssd1306': {
        'description': 'OLED Display Driver',
        'size': '4.8KB',
        'category': 'Display',
        'pins': 'I2C (SDA=4, SCL=5)',
        'test_code': '''
# Test OLED Display
from machine import Pin, SoftI2C
import ssd1306

i2c = SoftI2C(sda=Pin(4), scl=Pin(5))
oled = ssd1306.SSD1306_I2C(128, 64, i2c)

oled.fill(0)
oled.text("Hello World!", 0, 0)
oled.text("OLED Working!", 0, 16)
oled.show()
print("OLED test successful!")
'''
    },
    'dht': {
        'description': 'DHT Temperature/Humidity Sensor',
        'size': '1.1KB',
        'category': 'Sensor',
        'pins': 'Digital (Pin 4)',
        'test_code': '''
# Test DHT Sensor
from machine import Pin
import dht
import time

d = dht.DHT22(Pin(4))
d.measure()
temp = d.temperature()
hum = d.humidity()
print(f"Temperature: {temp}°C")
print(f"Humidity: {hum}%")
'''
    },
    'ds18x20': {
        'description': 'DS18B20 Temperature Sensor',
        'size': '1.4KB',
        'category': 'Sensor',
        'pins': 'OneWire (Pin 4)',
        'test_code': '''
# Test DS18B20 Sensor
from machine import Pin
import ds18x20
import onewire
import time

ow = onewire.OneWire(Pin(4))
ds = ds18x20.DS18X20(ow)
roms = ds.scan()
print(f"Found {len(roms)} devices")

ds.convert_temp()
time.sleep_ms(750)
for rom in roms:
    temp = ds.read_temp(rom)
    print(f"Temperature: {temp}°C")
'''
    },
    'onewire': {
        'description': 'OneWire Protocol',
        'size': '1.0KB',
        'category': 'Protocol',
        'pins': 'Digital (Pin 4)',
        'test_code': '''
# Test OneWire Protocol
from machine import Pin
import onewire

ow = onewire.OneWire(Pin(4))
devices = ow.scan()
print(f"OneWire devices found: {devices}")
'''
    },
    'servo': {
        'description': 'Servo Motor Control',
        'size': '778B',
        'category': 'Motor',
        'pins': 'PWM (Pin 2)',
        'test_code': '''
# Test Servo Motor
from machine import PWM, Pin
import servo
import time

s = servo.Servo(2)
s.write(90)  # Center position
time.sleep(1)
s.write(0)   # Left position
time.sleep(1)
s.write(180) # Right position
print("Servo test complete!")
'''
    },
    'neopixel': {
        'description': 'NeoPixel LED Control',
        'size': '923B',
        'category': 'Display',
        'pins': 'Digital (Pin 2)',
        'test_code': '''
# Test NeoPixel LEDs
from machine import Pin
import neopixel
import time

np = neopixel.NeoPixel(Pin(2), 8)
np[0] = (255, 0, 0)    # Red
np[1] = (0, 255, 0)    # Green
np[2] = (0, 0, 255)    # Blue
np.write()
print("NeoPixel test complete!")
'''
    },
    'pca9685': {
        'description': 'PCA9685 PWM Controller',
        'size': '1.8KB',
        'category': 'Motor',
        'pins': 'I2C (SDA=4, SCL=5)',
        'test_code': '''
# Test PCA9685 PWM Controller
from machine import SoftI2C, Pin
import pca9685

i2c = SoftI2C(sda=Pin(4), scl=Pin(5))
pwm = pca9685.PCA9685(i2c)
pwm.set_pwm(0, 0, 2048)  # 50% duty cycle
print("PCA9685 test complete!")
'''
    },
    'utils': {
        'description': 'Utility Functions',
        'size': '3.3KB',
        'category': 'Utility',
        'pins': 'None',
        'test_code': '''
# Test Utility Functions
import utils
import time

# Test timer
timer = utils.Timer()
time.sleep(1)
print(f"Elapsed: {timer.elapsed()}ms")

# Test map function
value = utils.map_value(512, 0, 1023, 0, 100)
print(f"Mapped value: {value}")

# Test constrain
constrained = utils.constrain(150, 0, 100)
print(f"Constrained: {constrained}")
'''
    }
}

def setup_libraries_folder():
    """Create and setup the libraries folder"""
    if not os.path.exists(LIBRARIES_FOLDER):
        os.makedirs(LIBRARIES_FOLDER)
        print(f"Created folder: {LIBRARIES_FOLDER}")
    
    # Create comprehensive README
    readme_content = """# MicroPython Libraries Collection

This folder contains all MicroPython libraries for ESP32.

## Available Libraries:

### Display Libraries:
- `ssd1306.py` - OLED Display Driver (4.8KB)
- `neopixel.py` - NeoPixel LED Control (923B)

### Sensor Libraries:
- `dht.py` - DHT Temperature/Humidity Sensor (1.1KB)
- `ds18x20.py` - DS18B20 Temperature Sensor (1.4KB)

### Motor Control:
- `servo.py` - Servo Motor Control (778B)
- `pca9685.py` - PCA9685 PWM Controller (1.8KB)

### Protocol Libraries:
- `onewire.py` - OneWire Protocol (1.0KB)

### Utility Libraries:
- `utils.py` - Utility Functions (3.3KB)

## Usage:

### Install Library:
```bash
python library_manager.py install <library_name>
```

### Test Library:
```bash
python library_manager.py test <library_name>
```

### List Libraries:
```bash
python library_manager.py list
```

### Install All:
```bash
python library_manager.py install-all
```

## Hardware Connections:

### I2C Devices (OLED, PCA9685):
- SDA -> GPIO 4
- SCL -> GPIO 5
- VCC -> 3.3V
- GND -> GND

### Digital Sensors:
- DHT22 -> GPIO 4
- DS18B20 -> GPIO 4
- Servo -> GPIO 2
- NeoPixel -> GPIO 2

## Examples:

### OLED Display:
```python
from machine import Pin, SoftI2C
import ssd1306

i2c = SoftI2C(sda=Pin(4), scl=Pin(5))
oled = ssd1306.SSD1306_I2C(128, 64, i2c)
oled.text("Hello!", 0, 0)
oled.show()
```

### Temperature Sensor:
```python
from machine import Pin
import dht

d = dht.DHT22(Pin(4))
d.measure()
print(f"Temp: {d.temperature()}°C")
```
"""
    
    with open(os.path.join(LIBRARIES_FOLDER, "README.md"), "w") as f:
        f.write(readme_content)

def list_libraries():
    """List all available libraries"""
    print("MicroPython Libraries Collection")
    print("=" * 50)
    
    if not os.path.exists(LIBRARIES_FOLDER):
        print(f"Libraries folder '{LIBRARIES_FOLDER}' not found!")
        return
    
    files = os.listdir(LIBRARIES_FOLDER)
    py_files = [f.replace('.py', '') for f in files if f.endswith('.py')]
    
    print(f"Available libraries in {LIBRARIES_FOLDER}:")
    print("-" * 50)
    
    categories = {}
    for lib_name in sorted(py_files):
        if lib_name in LIBRARIES:
            lib_info = LIBRARIES[lib_name]
            category = lib_info['category']
            if category not in categories:
                categories[category] = []
            categories[category].append(lib_name)
    
    for category in sorted(categories.keys()):
        print(f"\n{category} Libraries:")
        for lib_name in categories[category]:
            lib_info = LIBRARIES[lib_name]
            file_path = os.path.join(LIBRARIES_FOLDER, f"{lib_name}.py")
            if os.path.exists(file_path):
                size = os.path.getsize(file_path)
                print(f"  {lib_name:<15} ({size:>6} bytes) - {lib_info['description']}")
                print(f"    Pins: {lib_info['pins']}")
    
    print(f"\nTotal: {len(py_files)} libraries")
    print(f"Use: python library_manager.py install <library_name>")

def install_library(library_name, port=DEFAULT_PORT):
    """Install a specific library to ESP32"""
    file_path = os.path.join(LIBRARIES_FOLDER, f"{library_name}.py")
    
    if not os.path.exists(file_path):
        print(f"Library '{library_name}' not found!")
        return False
    
    try:
        cmd = f'python -m mpremote connect {port} fs cp "{file_path}" :{library_name}.py'
        print(f"Installing {library_name} to ESP32 on {port}...")
        
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=30)
        
        if result.returncode == 0:
            print(f"✅ {library_name} installed successfully!")
            return True
        else:
            print(f"❌ Failed to install {library_name}: {result.stderr}")
            return False
            
    except Exception as e:
        print(f"❌ Error installing {library_name}: {e}")
        return False

def test_library(library_name, port=DEFAULT_PORT):
    """Test a library on ESP32"""
    if library_name not in LIBRARIES:
        print(f"Library '{library_name}' not found!")
        return False
    
    lib_info = LIBRARIES[library_name]
    test_code = lib_info['test_code'].strip()
    
    # Create temporary test file
    test_file = f"test_{library_name}.py"
    try:
        with open(test_file, "w") as f:
            f.write(test_code)
        
        print(f"Testing {library_name}...")
        print(f"Description: {lib_info['description']}")
        print(f"Pins: {lib_info['pins']}")
        print("-" * 40)
        
        # Upload and run test
        cmd = f'python -m mpremote connect {port} fs cp "{test_file}" :test.py'
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=30)
        
        if result.returncode == 0:
            print("Test uploaded successfully!")
            print("Running test...")
            
            # Run the test
            run_cmd = f'python -m mpremote connect {port} run test.py'
            run_result = subprocess.run(run_cmd, shell=True, capture_output=True, text=True, timeout=30)
            
            if run_result.returncode == 0:
                print("Test output:")
                print(run_result.stdout)
                print("✅ Test completed!")
            else:
                print("❌ Test failed:")
                print(run_result.stderr)
        
        # Clean up
        os.remove(test_file)
        return True
        
    except Exception as e:
        print(f"❌ Error testing {library_name}: {e}")
        if os.path.exists(test_file):
            os.remove(test_file)
        return False

def install_all_libraries(port=DEFAULT_PORT):
    """Install all libraries to ESP32"""
    print("Installing all libraries to ESP32...")
    print("=" * 50)
    
    if not os.path.exists(LIBRARIES_FOLDER):
        print(f"Libraries folder '{LIBRARIES_FOLDER}' not found!")
        return
    
    files = os.listdir(LIBRARIES_FOLDER)
    py_files = [f.replace('.py', '') for f in files if f.endswith('.py')]
    
    successful = 0
    failed = 0
    
    for lib_name in sorted(py_files):
        if install_library(lib_name, port):
            successful += 1
        else:
            failed += 1
        time.sleep(1)  # Small delay between installations
    
    print(f"\nInstallation Summary:")
    print(f"✅ Successful: {successful}")
    print(f"❌ Failed: {failed}")
    print(f"📦 Total: {len(py_files)}")

def create_test_script():
    """Create a comprehensive test script"""
    test_code = """# Comprehensive Library Test
# Tests all installed libraries

import time
from machine import Pin, SoftI2C

print("Comprehensive Library Test")
print("=" * 40)

# Test 1: I2C Communication
print("\\n1. Testing I2C Communication...")
try:
    i2c = SoftI2C(sda=Pin(4), scl=Pin(5))
    devices = i2c.scan()
    if devices:
        print(f"   Found {len(devices)} I2C devices: {devices}")
    else:
        print("   No I2C devices found")
except Exception as e:
    print(f"   I2C Error: {e}")

# Test 2: OLED Display
print("\\n2. Testing OLED Display...")
try:
    import ssd1306
    oled = ssd1306.SSD1306_I2C(128, 64, i2c)
    oled.fill(0)
    oled.text("Test Success!", 0, 0)
    oled.text("OLED Working!", 0, 16)
    oled.show()
    print("   OLED test successful!")
except Exception as e:
    print(f"   OLED Error: {e}")

# Test 3: DHT Sensor
print("\\n3. Testing DHT Sensor...")
try:
    import dht
    d = dht.DHT22(Pin(4))
    d.measure()
    temp = d.temperature()
    hum = d.humidity()
    print(f"   Temperature: {temp}°C")
    print(f"   Humidity: {hum}%")
except Exception as e:
    print(f"   DHT Error: {e}")

# Test 4: Servo Motor
print("\\n4. Testing Servo Motor...")
try:
    import servo
    s = servo.Servo(2)
    s.write(90)
    print("   Servo test successful!")
except Exception as e:
    print(f"   Servo Error: {e}")

# Test 5: Utility Functions
print("\\n5. Testing Utility Functions...")
try:
    import utils
    timer = utils.Timer()
    time.sleep(0.1)
    elapsed = timer.elapsed()
    print(f"   Timer test: {elapsed}ms")
    
    mapped = utils.map_value(512, 0, 1023, 0, 100)
    print(f"   Map test: {mapped}")
    
    constrained = utils.constrain(150, 0, 100)
    print(f"   Constrain test: {constrained}")
except Exception as e:
    print(f"   Utils Error: {e}")

print("\\nTest completed!")
"""
    
    try:
        with open("comprehensive_test.py", "w") as f:
            f.write(test_code)
        print("✅ Created comprehensive_test.py")
        return True
    except Exception as e:
        print(f"❌ Failed to create test file: {e}")
        return False

def main():
    """Main function"""
    if len(sys.argv) < 2:
        print("MicroPython Library Manager")
        print("=" * 40)
        print("Usage:")
        print("  python library_manager.py list                    - List all libraries")
        print("  python library_manager.py install <library>      - Install specific library")
        print("  python library_manager.py install-all            - Install all libraries")
        print("  python library_manager.py test <library>         - Test specific library")
        print("  python library_manager.py test-all               - Test all libraries")
        print("  python library_manager.py setup                  - Setup libraries folder")
        return
    
    command = sys.argv[1]
    
    if command == "list":
        list_libraries()
    
    elif command == "install":
        if len(sys.argv) < 3:
            print("Please specify a library name")
            return
        library_name = sys.argv[2]
        port = sys.argv[3] if len(sys.argv) > 3 else DEFAULT_PORT
        install_library(library_name, port)
    
    elif command == "install-all":
        port = sys.argv[2] if len(sys.argv) > 2 else DEFAULT_PORT
        install_all_libraries(port)
    
    elif command == "test":
        if len(sys.argv) < 3:
            print("Please specify a library name")
            return
        library_name = sys.argv[2]
        port = sys.argv[3] if len(sys.argv) > 3 else DEFAULT_PORT
        test_library(library_name, port)
    
    elif command == "test-all":
        port = sys.argv[2] if len(sys.argv) > 2 else DEFAULT_PORT
        create_test_script()
        print("Run: python -m mpremote connect COM6 run comprehensive_test.py")
    
    elif command == "setup":
        setup_libraries_folder()
        print("✅ Libraries folder setup complete!")
    
    else:
        print(f"Unknown command: {command}")

if __name__ == "__main__":
    main()
