# GPIO34 LDR DIAGNOSTIC TEST
# Copy this code to the Monaco editor and upload to ESP32

from machine import Pin, ADC
import time

print("=" * 50)
print("GPIO34 LDR DIAGNOSTIC TEST")
print("=" * 50)
print()

# Test 1: Basic ADC Setup
print("TEST 1: Setting up GPIO34 as ADC...")
try:
    ldr = ADC(Pin(34))
    ldr.atten(ADC.ATTN_11DB)
    ldr.width(ADC.WIDTH_12BIT)
    print("✅ GPIO34 ADC setup successful!")
except Exception as e:
    print("❌ ERROR setting up GPIO34:", str(e))
    print("SOLUTION: Try a different pin (GPIO32, GPIO33, GPIO35)")

print()

# Test 2: Read Raw Values
print("TEST 2: Reading raw ADC values...")
print("(Reading 10 times, 500ms interval)")
print()

for i in range(10):
    try:
        raw_value = ldr.read()
        voltage = (raw_value / 4095) * 3.3
        print(f"Reading {i+1}: Raw={raw_value:4d}  Voltage={voltage:.3f}V")
        time.sleep(0.5)
    except Exception as e:
        print(f"❌ ERROR reading: {str(e)}")
        break

print()
print("=" * 50)
print("ANALYSIS:")
print("=" * 50)

# Get final reading
final_raw = ldr.read()
final_voltage = (final_raw / 4095) * 3.3

print(f"Final Reading: {final_raw}")
print(f"Final Voltage: {final_voltage:.3f}V")
print()

if final_raw == 0:
    print("❌ PROBLEM: Reading 0")
    print()
    print("POSSIBLE CAUSES:")
    print("1. LDR is NOT connected to GPIO34")
    print("2. LDR VCC (power) is NOT connected")
    print("3. LDR is broken/faulty")
    print("4. Wires are loose")
    print()
    print("TRY THIS:")
    print("- Check all 3 wires (3.3V, GND, GPIO34)")
    print("- Try connecting GPIO34 directly to 3.3V")
    print("  (should read ~4095)")
    print("- Try connecting GPIO34 directly to GND")
    print("  (should read 0)")
    
elif final_raw == 4095:
    print("⚠️ PROBLEM: Reading maximum (4095)")
    print()
    print("POSSIBLE CAUSES:")
    print("1. LDR OUT pin is NOT connected (floating)")
    print("2. Wire from LDR OUT to GPIO34 is loose/broken")
    print()
    print("TRY THIS:")
    print("- Check the OUT wire connection")
    print("- Make sure OUT pin is firmly in GPIO34")
    
elif 100 < final_raw < 3900:
    print("✅ SUCCESS: GPIO34 is working!")
    print()
    print("Your sensor is reading values correctly.")
    print("Try covering the LDR or shining light on it.")
    print("Values should change between ~500-3500")
    
else:
    print("⚠️ UNUSUAL: Reading is at the edge")
    print("This might indicate a wiring issue.")

print()
print("=" * 50)
print("TEST COMPLETE")
print("=" * 50)

