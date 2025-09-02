# Simple ESP32 test script
# This should work on any MicroPython device

print("=== ESP32 Connection Test ===")
print("If you see this, the connection is working!")

# Test basic MicroPython functions
import time
print(f"Current time: {time.time()}")

# Test machine module (ESP32 specific)
try:
    import machine
    print("✅ Machine module imported successfully")
    print(f"CPU Frequency: {machine.freq()}")
except ImportError as e:
    print(f"❌ Machine module import failed: {e}")

print("=== Test Complete ===")
