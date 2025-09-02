# Simple OLED Text Display - Easy to Modify
# Upload this and change the pins at the top

from machine import Pin, SoftI2C
import ssd1306
import time

# ===== CHANGE THESE PINS =====
SDA_PIN = 21  # Change this to your working SDA pin
SCL_PIN = 22  # Change this to your working SCL pin

# ===== OLED SETUP =====
try:
    # Create I2C and OLED objects
    i2c = SoftI2C(sda=Pin(SDA_PIN), scl=Pin(SCL_PIN))
    oled = ssd1306.SSD1306_I2C(128, 64, i2c)
    
    print(f"✅ OLED working with pins {SDA_PIN},{SCL_PIN}")
    
    # Show startup message
    oled.fill(0)
    oled.text("OLED Ready!", 0, 0)
    oled.text(f"Pins: {SDA_PIN},{SCL_PIN}", 0, 10)
    oled.text("Your text here", 0, 20)
    oled.show()
    
    # Wait a bit
    time.sleep(2)
    
    # Show some example text
    messages = [
        "Hello World!",
        "ESP32 OLED",
        "MicroPython",
        "Working Great!",
        "Pin Test Success"
    ]
    
    for msg in messages:
        print(f"📺 Displaying: {msg}")
        oled.fill(0)
        oled.text(msg, 0, 0)
        oled.show()
        time.sleep(2)
    
    # Final message
    oled.fill(0)
    oled.text("Demo Complete!", 0, 0)
    oled.text("Modify this code", 0, 10)
    oled.text("to change text!", 0, 20)
    oled.show()
    
except ImportError:
    print("❌ ssd1306 library not found!")
    print("💡 Upload ssd1306.py to your ESP32")
except Exception as e:
    print(f"❌ OLED error: {e}")
    print("💡 Try different pins or check connections")
    print(f"💡 Current pins: SDA={SDA_PIN}, SCL={SCL_PIN}")
