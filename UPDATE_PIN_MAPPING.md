# IMPORTANT: Update Pin Mappings from PIN MAPPING.pdf

## Current Status

The code generator uses placeholder pin mappings. **You MUST update these with the exact pin numbers from PIN MAPPING.pdf**.

## How to Update

### Option 1: Manual Update (Recommended)

1. Open `PIN MAPPING.pdf` and note all GPIO pin numbers
2. Edit `config/pin_mapping.json` with the exact pin numbers from the PDF
3. Save the file
4. The code generator will automatically use the updated mappings

### Option 2: Provide Pin Mappings

Please provide the pin mappings in this format, and I'll update the file:

```json
{
  "motors": {
    "M1": { "pinA": ?, "pinB": ?, "enable": ? },
    "M2": { "pinA": ?, "pinB": ?, "enable": ? },
    "M3": { "pinA": ?, "pinB": ?, "enable": ? },
    "M4": { "pinA": ?, "pinB": ?, "enable": ? }
  },
  "sensors": {
    "ldr": { "pin": ? },
    "ir": { "pin": ? },
    "temperature": { "pin": ? },
    "ultrasonic": { "trig": ?, "echo": ? },
    "touch": { "pin": ? },
    "buzzer": { "pin": ? }
  },
  "joystick": {
    "joystick1": { "vertical": ?, "horizontal": ? },
    "joystick2": { "vertical": ?, "horizontal": ? }
  },
  "oled": { "sda": ?, "scl": ?, "address": "0x3C" },
  "servo": {
    "servo1": { "pin": ? },
    "servo2": { "pin": ? }
  }
}
```

## File to Update

**File:** `my-steam-labs-ideal-code/config/pin_mapping.json`

This file is used by `config/code_generator.js` to generate code with fixed pin mappings.

## Verification

After updating:
1. Drag a motor block (e.g., M1)
2. Click "Generate Python Code"
3. Check the generated code - it should show the exact GPIO pins from PIN MAPPING.pdf
4. Verify pins match your hardware wiring

## Current Placeholder Mappings

The current mappings in `pin_mapping.json` are **PLACEHOLDERS**. They need to be replaced with actual pin numbers from PIN MAPPING.pdf.

