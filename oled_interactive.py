# Interactive OLED Display - Runs for 30 seconds
# Perfect for Steam Labs with timeout

from machine import Pin, SoftI2C
import ssd1306
import sys
import time
import uselect as select

print("Starting Interactive OLED Display...")
print("Program will run for 30 seconds...")

# I2C setup - CORRECTED PINS
i2c = SoftI2C(sda=Pin(4), scl=Pin(5))

# OLED setup (128x64)
oled = ssd1306.SSD1306_I2C(128, 64, i2c)

def show_lines(lines, start_y=0):
    """Render up to 8 lines (8px each) within 64px height."""
    oled.fill(0)
    y = start_y
    for line in lines[:8]:
        oled.text(line, 0, y)
        y += 8
    oled.show()

def wrap_text(text, width=16):
    """Simple word wrap for ~16 chars per line on 128px width."""
    words = text.split()
    lines, cur = [], ""
    for w in words:
        if len(cur) + (1 if cur else 0) + len(w) <= width:
            cur = (cur + " " + w) if cur else w
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines

# Show startup message
show_lines(["Interactive OLED", "Ready for input!", "30 seconds left"])

# Setup polling
poller = select.poll()
poller.register(sys.stdin, select.POLLIN)

# Run for 30 seconds
start_time = time.time()
timeout = 30  # 30 seconds

print("💡 Type messages in the terminal to display on OLED")
print("⏰ Program will automatically stop after 30 seconds")

while (time.time() - start_time) < timeout:
    # Calculate remaining time
    remaining = int(timeout - (time.time() - start_time))
    
    # Non-blocking check for incoming serial text
    if poller.poll(0):  # data available
        msg = sys.stdin.readline().strip()
        if msg:
            lines = wrap_text(msg, width=16)
            show_lines(lines)
            print(f"Displayed on OLED: {msg}")
            print(f"⏰ {remaining} seconds remaining")
    
    # Show remaining time every 5 seconds
    if int(time.time() - start_time) % 5 == 0 and int(time.time() - start_time) > 0:
        show_lines([f"Time left: {remaining}s", "Type messages below"])
    
    time.sleep(0.1)

# Show completion message
show_lines(["Session Complete!", "OLED Working!", "Goodbye!"])
time.sleep(2)

# Clear display
oled.fill(0)
oled.show()

print("✅ Interactive session completed!")
print("OLED is working perfectly!")
print("You can now use OLED in your projects!")
