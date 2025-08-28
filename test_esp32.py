#!/usr/bin/env python3
"""
Simple ESP32 Test Script
This script will help verify that your ESP32 upload is working properly.
"""

print("=" * 50)
print("🧪 ESP32 CODE EXECUTION TEST")
print("=" * 50)

# Test 1: Basic print statements
print("✅ Basic print statements working")

# Test 2: Variables and math
x = 15
y = 25
result = x + y
print(f"✅ Math operations: {x} + {y} = {result}")

# Test 3: Loops
print("✅ Loop test:")
for i in range(1, 4):
    print(f"  Count: {i}")

# Test 4: Functions
def test_function():
    return "Function call successful!"

print(f"✅ Function test: {test_function()}")

# Test 5: Hardware detection (if running on ESP32)
try:
    import machine
    print("✅ Hardware modules available (ESP32 detected)")
    print(f"  CPU Frequency: {machine.freq()} Hz")
except ImportError:
    print("ℹ️  Running on standard Python (no hardware modules)")

print("=" * 50)
print("🎯 TEST COMPLETED SUCCESSFULLY!")
print("=" * 50)
print("If you see this output, your ESP32 code execution is working!")
