# Simple OLED Test - Runs once and exits
# Perfect for Steam Labs testing

from machine import Pin, SoftI2C
import ssd1306
import time

print("Starting OLED Test...")

# I2C setup - CORRECTED PINS
i2c = SoftI2C(sda=Pin(4), scl=Pin(5))

# OLED setup (128x64)
oled = ssd1306.SSD1306_I2C(128, 64, i2c)

# Test 1: Clear display
print("1. Clearing display...")
oled.fill(0)
oled.show()

# Test 2: Show startup message
print("2. Showing startup message...")
oled.text("Hello World!", 0, 0)
oled.text("OLED Working!", 0, 16)
oled.text("Test Success!", 0, 32)
oled.show()

# Test 3: Wait a moment
time.sleep(2)

# Test 4: Show different message
print("3. Showing second message...")
oled.fill(0)
oled.text("ESP32 + OLED", 0, 0)
oled.text("MicroPython", 0, 16)
oled.text("Steam Labs", 0, 32)
oled.show()

# Test 5: Wait and finish
time.sleep(2)
print("4. Test completed!")
print("OLED is working correctly!")

# Optional: Clear display at end
oled.fill(0)
oled.show()

print("✅ OLED test successful!")
print("You can now use OLED in your projects!")
