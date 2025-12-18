# ⚠️ CRITICAL: Update Pin Mappings from PIN MAPPING.pdf

## Current Status

**The pin mappings in `pin_mapping.json` are PLACEHOLDERS and MUST be updated with the exact GPIO pin numbers from PIN MAPPING.pdf.**

## Why This Matters

- The code generator uses these pin mappings to generate MicroPython code
- **Wrong pin numbers = code won't work on your ESP32 hardware**
- All GPIO pins are FIXED as per client requirements - they cannot be changed dynamically

## How to Update

### Step 1: Open PIN MAPPING.pdf
Open the PDF file: `my-steam-labs-ideal-code/PIN MAPPING.pdf`

### Step 2: Find Pin Numbers
For each component, find the GPIO pin numbers:
- **Motors M1-M4**: Find pinA, pinB, and enable pins
- **Sensors**: Find GPIO pin for each sensor (LDR, IR, Temperature, Ultrasonic, Touch, Buzzer)
- **Joysticks**: Find vertical (V) and horizontal (H) pins for Joystick1 and Joystick2
- **OLED**: Find SDA and SCL pins
- **Servo**: Find GPIO pins for Servo1 and Servo2

### Step 3: Update pin_mapping.json
Edit: `my-steam-labs-ideal-code/config/pin_mapping.json`

Replace the placeholder values with the exact GPIO pin numbers from the PDF.

### Step 4: Verify
1. Drag a block (e.g., Motor M1)
2. Click "Generate Python Code"
3. Check the generated code - it should show the exact GPIO pins from PIN MAPPING.pdf
4. Verify pins match your hardware wiring

## Example Update

If PIN MAPPING.pdf says:
- Motor M1 uses GPIO 12 (A), GPIO 13 (B), GPIO 14 (Enable)

Then update `pin_mapping.json`:
```json
"M1": {
  "pinA": 12,    // ← Update from PDF
  "pinB": 13,    // ← Update from PDF
  "enable": 14   // ← Update from PDF
}
```

## Files to Update

1. **`config/pin_mapping.json`** - Main pin mapping file (used by code generator)
2. **`config/code_generator.js`** - Also contains PIN_MAPPING object (update both to match)

## After Updating

Once you update the pin mappings:
1. Save `pin_mapping.json`
2. Refresh the application
3. Generate code - it will use the updated pin mappings
4. The generated code will be ready to upload to ESP32

## Need Help?

If you can't find the pin mappings in the PDF, please:
1. Share the pin mappings from PIN MAPPING.pdf
2. Or provide a screenshot of the pin mapping table
3. I'll update the files for you

---

**Remember:** The code generator will ONLY work correctly if pin mappings match PIN MAPPING.pdf exactly!

