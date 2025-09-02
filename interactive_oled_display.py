# Interactive OLED Display - Receive Text from Serial Monitor
# This allows you to send text from your computer to display on OLED

from machine import Pin, SoftI2C, I2C
import ssd1306
import sys
import time
import uselect

# ===== CONFIGURATION =====
# Change these pins based on your setup
SDA_PIN = 21  # Try 21, 22, 4, 5, 18, 19, 25, 26
SCL_PIN = 22  # Try 22, 21, 5, 4, 19, 18, 26, 25
I2C_TYPE = "SoftI2C"  # "SoftI2C" or "Hardware I2C"

# ===== OLED SETUP =====
def setup_oled():
    """Setup OLED display with error handling"""
    try:
        # Create I2C object
        if I2C_TYPE == "SoftI2C":
            i2c = SoftI2C(sda=Pin(SDA_PIN), scl=Pin(SCL_PIN))
        else:
            i2c = I2C(0, sda=Pin(SDA_PIN), scl=Pin(SCL_PIN))
        
        # Create OLED object
        oled = ssd1306.SSD1306_I2C(128, 64, i2c)
        
        # Test the display
        oled.fill(0)
        oled.text("OLED Ready!", 0, 0)
        oled.text(f"Pins: {SDA_PIN},{SCL_PIN}", 0, 10)
        oled.text("Send text via", 0, 20)
        oled.text("Serial Monitor", 0, 30)
        oled.show()
        
        print(f"✅ OLED initialized with {I2C_TYPE}")
        print(f"📍 Using pins: SDA={SDA_PIN}, SCL={SCL_PIN}")
        print("💡 Send text from Serial Monitor to display on OLED")
        
        return oled
        
    except ImportError:
        print("❌ ssd1306 library not found!")
        print("💡 Upload ssd1306.py to your ESP32")
        return None
    except Exception as e:
        print(f"❌ OLED setup failed: {e}")
        print("💡 Try different pins or check connections")
        return None

def display_text(oled, text, clear=True):
    """Display text on OLED with word wrapping"""
    if clear:
        oled.fill(0)
    
    # Word wrapping for OLED display
    words = text.split()
    lines = []
    current_line = ""
    
    for word in words:
        if len(current_line + " " + word) <= 16:  # 16 characters per line
            current_line += (" " + word) if current_line else word
        else:
            if current_line:
                lines.append(current_line)
            current_line = word
    
    if current_line:
        lines.append(current_line)
    
    # Display lines (max 8 lines for 64px height)
    for i, line in enumerate(lines[:8]):
        y_pos = i * 8
        oled.text(line, 0, y_pos)
    
    oled.show()

def main():
    """Main interactive OLED program"""
    print("🔍 Interactive OLED Display")
    print("=" * 40)
    
    # Setup OLED
    oled = setup_oled()
    if not oled:
        print("❌ Cannot start without OLED")
        return
    
    # Setup serial input
    select = uselect.select
    stdin = sys.stdin
    
    print("\n📺 OLED Display Active!")
    print("💻 Send text from Serial Monitor:")
    print("   - Type any text and press Enter")
    print("   - Text will appear on OLED display")
    print("   - Type 'clear' to clear display")
    print("   - Type 'quit' to exit")
    print("=" * 40)
    
    # Main loop
    while True:
        try:
            # Check for serial input (non-blocking)
            if select([stdin], [], [], 0)[0]:
                msg = stdin.readline().strip()
                
                if not msg:
                    continue
                
                print(f"📤 Received: '{msg}'")
                
                # Handle special commands
                if msg.lower() == 'quit':
                    print("👋 Goodbye!")
                    oled.fill(0)
                    oled.text("Goodbye!", 0, 0)
                    oled.show()
                    break
                elif msg.lower() == 'clear':
                    oled.fill(0)
                    oled.show()
                    print("🧹 Display cleared")
                else:
                    # Display the message
                    display_text(oled, msg)
                    print(f"✅ Displayed: '{msg}'")
            
            time.sleep(0.1)  # Small delay to prevent busy waiting
            
        except KeyboardInterrupt:
            print("\n👋 Interrupted by user")
            break
        except Exception as e:
            print(f"❌ Error: {e}")
            time.sleep(1)

# Alternative simple version without serial input
def simple_demo():
    """Simple demo without serial input"""
    print("🎬 Simple OLED Demo")
    
    oled = setup_oled()
    if not oled:
        return
    
    messages = [
        "Hello World!",
        "ESP32 OLED",
        "MicroPython",
        "Working Great!",
        "Pin Test Success"
    ]
    
    for i, msg in enumerate(messages):
        print(f"📺 Displaying: {msg}")
        display_text(oled, msg)
        time.sleep(2)
    
    # Final message
    oled.fill(0)
    oled.text("Demo Complete!", 0, 0)
    oled.text("Try interactive", 0, 10)
    oled.text("version!", 0, 20)
    oled.show()

# Run the program
if __name__ == "__main__":
    try:
        main()
    except:
        print("💡 Running simple demo instead...")
        simple_demo()
