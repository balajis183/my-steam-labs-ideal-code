# ⚠️ CRITICAL: Pin Mapping Update Required

## Current Status

**The pin mappings in the code are PLACEHOLDERS and MUST be updated with exact GPIO pin numbers from PIN MAPPING.pdf before use.**

## What Needs to Be Updated

You need to update pin mappings in **TWO files** to match PIN MAPPING.pdf exactly:

1. **`config/pin_mapping.json`** - JSON configuration file
2. **`config/code_generator.js`** - JavaScript PIN_MAPPING object (lines 27-50)

Both files must have **identical pin numbers** matching PIN MAPPING.pdf.

## Quick Update Guide

### Step 1: Open PIN MAPPING.pdf
Locate: `my-steam-labs-ideal-code/PIN MAPPING.pdf`

### Step 2: Extract Pin Numbers
Find GPIO pin numbers for:
- **Motors M1, M2, M3, M4**: pinA, pinB, enable pins
- **Sensors**: LDR, IR, Temperature, Ultrasonic (TRIG/ECHO), Touch, Buzzer
- **Joysticks**: Joystick1 (V, H), Joystick2 (V, H)
- **OLED**: SDA, SCL pins
- **Servo**: Servo1, Servo2 pins

### Step 3: Update Files

**File 1: `config/pin_mapping.json`**
```json
{
  "motors": {
    "M1": {
      "pinA": <FROM_PDF>,  // Replace with actual GPIO from PDF
      "pinB": <FROM_PDF>,  // Replace with actual GPIO from PDF
      "enable": <FROM_PDF> // Replace with actual GPIO from PDF
    },
    ...
  }
}
```

**File 2: `config/code_generator.js`** (around line 27)
```javascript
const PIN_MAPPING = {
  motors: {
    M1: { pinA: <FROM_PDF>, pinB: <FROM_PDF>, enable: <FROM_PDF> },
    ...
  }
}
```

### Step 4: Verify
1. Generate Python code
2. Check generated code shows correct GPIO pins
3. Verify pins match your hardware wiring

## Example

If PIN MAPPING.pdf shows:
- Motor M1: GPIO 12 (A), GPIO 13 (B), GPIO 14 (Enable)

Update both files:
- `pin_mapping.json`: `"pinA": 12, "pinB": 13, "enable": 14`
- `code_generator.js`: `M1: { pinA: 12, pinB: 13, enable: 14 }`

## Files Location

- Pin mapping config: `my-steam-labs-ideal-code/config/pin_mapping.json`
- Code generator: `my-steam-labs-ideal-code/config/code_generator.js`
- PDF reference: `my-steam-labs-ideal-code/PIN MAPPING.pdf`

## Need Help?

If you can provide the pin mappings from PIN MAPPING.pdf, I can update both files for you. Just share:
- Motor pins (M1-M4)
- Sensor pins
- Joystick pins
- OLED pins
- Servo pins

---

**Remember:** The code generator will only work correctly when pin mappings match PIN MAPPING.pdf exactly!

