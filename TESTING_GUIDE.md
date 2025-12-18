# Testing Guide - Enhanced Python Code Generator

## ✅ Ready to Test!

All components are in place. Follow these steps to test:

## Test Steps

### 1. **Basic Test - Motor Block**
1. Open the application
2. Drag a **"set motor M1 speed to 80 and direction forward"** block
3. Click **"Generate Python Code"** button
4. **Expected Result:**
   - Code should include:
     - `from machine import Pin, PWM, ADC, SoftI2C`
     - Pin definitions for M1 (GPIO25, GPIO26, GPIO14)
     - `set_motor()` helper function
     - Your block code wrapped in `main()` function and `while True` loop

### 2. **Test - Sensor Block**
1. Drag a **"read LDR sensor"** block
2. Click **"Generate Python Code"**
3. **Expected Result:**
   - Code should include:
     - `LDR_PIN = ADC(Pin(36))` (fixed GPIO36)
     - `read_ldr()` helper function
     - Only `machine` library imported (no unused imports)

### 3. **Test - Multiple Blocks**
1. Drag:
   - Motor M1 block
   - LDR sensor block
   - Ultrasonic sensor block
2. Click **"Generate Python Code"**
3. **Expected Result:**
   - All pin definitions present
   - All helper functions present
   - Only required libraries imported (`machine`, `time`)
   - Code properly structured

### 4. **Test - OLED Display**
1. Drag an **OLED display** block
2. Click **"Generate Python Code"**
3. **Expected Result:**
   - `import ssd1306` included
   - I2C pins defined (GPIO21, GPIO22)
   - `oled` object initialized
   - `show_on_oled()` helper function

### 5. **Test - Empty Workspace**
1. Don't drag any blocks
2. Click **"Generate Python Code"**
3. **Expected Result:**
   - Basic structure with header
   - No pin definitions (no blocks used)
   - Comment: "# No blocks detected - add your code here"

## What to Check

### ✅ Success Indicators:
- [ ] Code includes header with timestamp
- [ ] Pin definitions use **fixed GPIO pins** (not random numbers)
- [ ] Only **required libraries** are imported
- [ ] Pin definitions section marked **"DO NOT EDIT"**
- [ ] Helper functions are generated
- [ ] Code wrapped in `main()` and `while True` loop
- [ ] Console shows: `✅ Enhanced Python code generated...`

### ⚠️ If Issues Occur:

1. **Enhanced generator not loading?**
   - Open browser console (F12)
   - Check for errors
   - Look for: `⚠️ Using standard Python generator...`
   - Verify `code_generator.js` is loaded (check Network tab)

2. **Wrong pins?**
   - Check `config/pin_mapping.json` for correct mappings
   - Verify pin numbers match your hardware

3. **Missing libraries?**
   - Check `config/library_mapping.json`
   - Verify block type is mapped correctly

4. **Code not generating?**
   - Check browser console for JavaScript errors
   - Verify Blockly workspace is initialized
   - Try refreshing the page

## Expected Pin Mappings

| Component | GPIO Pins |
|-----------|-----------|
| Motor M1 | 25, 26, 14 |
| Motor M2 | 27, 32, 15 |
| Motor M3 | 33, 12, 13 |
| Motor M4 | 2, 4, 5 |
| LDR | 36 |
| IR Sensor | 39 |
| Temperature | 34 |
| Ultrasonic | 18 (TRIG), 19 (ECHO) |
| Touch | 0 |
| Joystick1 | 35 (V), 37 (H) |
| Joystick2 | 38 (V), 0 (H) |
| OLED | 21 (SDA), 22 (SCL) |

## Sample Generated Code Structure

```python
# ============================================
# MY STEAM LAB - Generated MicroPython Code
# ============================================
# Generated: [timestamp]
# IMPORTANT: Pin mappings are FIXED as per PIN MAPPING.pdf
# ============================================

from machine import Pin, PWM, ADC, SoftI2C
import time

# Motor Pin Definitions (DO NOT EDIT - Fixed Pin Mapping)
M1_PIN_A = Pin(25, Pin.OUT)
M1_PIN_B = Pin(26, Pin.OUT)
M1_PWM = PWM(Pin(14))
M1_PWM.freq(1000)

def set_motor(motor_id, speed, direction):
    # Implementation...

def main():
    set_motor("M1", 80, "FORWARD")

while True:
    main()
    time.sleep(0.1)
```

## Troubleshooting

### Issue: "Enhanced generator not available"
**Solution:** Check that `code_generator.js` is loaded before `blockly_page.js` in HTML

### Issue: Wrong pin numbers
**Solution:** Update `config/pin_mapping.json` with correct pins

### Issue: Missing imports
**Solution:** Add block-to-library mapping in `config/library_mapping.json`

## Ready to Test! 🚀

Everything should work perfectly. If you encounter any issues, check the browser console for error messages and let me know!

