# Enhanced Python Code Generator - Fixed Pin Mapping

## Overview

This enhanced code generator automatically generates MicroPython code for ESP32 with:
- **Fixed GPIO pin mappings** from PIN MAPPING.pdf
- **Auto-import** of required libraries based on blocks used
- **Proper code structure** ready for ESP32 upload

## Files

### `pin_mapping.json`
Contains fixed GPIO pin mappings for all hardware components:
- Motors (M1-M4)
- Sensors (LDR, IR, Temperature, Ultrasonic, Touch)
- Joysticks (Joystick1, Joystick2)
- OLED Display
- Servo Motors

### `library_mapping.json`
Maps Blockly block types to required MicroPython libraries:
- Detects which blocks are used
- Automatically imports only required libraries
- Prevents unused imports

### `code_generator.js`
Enhanced Python code generator that:
1. Detects used blocks in workspace
2. Determines required libraries
3. Generates imports section
4. Generates pin definitions using fixed mappings
5. Generates helper functions for hardware control
6. Wraps user code in proper structure

## Generated Code Structure

```python
# ============================================
# MY STEAM LAB - Generated MicroPython Code
# ============================================
# Generated: [timestamp]
# 
# IMPORTANT: Pin mappings are FIXED as per PIN MAPPING.pdf
# DO NOT MODIFY pin definitions - they are hardware-specific
# ============================================

# Imports (auto-generated based on blocks used)
from machine import Pin, PWM, ADC, SoftI2C
import time
import ssd1306

# Pin Definitions (DO NOT EDIT - Fixed Pin Mapping)
# Motor M1: GPIO25 (A), GPIO26 (B), GPIO14 (Enable/PWM)
M1_PIN_A = Pin(25, Pin.OUT)
M1_PIN_B = Pin(26, Pin.OUT)
M1_PWM = PWM(Pin(14))
M1_PWM.freq(1000)  # 1kHz PWM frequency

# Helper Functions
def set_motor(motor_id, speed, direction):
    """Control DC motor speed and direction"""
    # Implementation...

# Main Code (from Blockly blocks)
def main():
    # User's block code here
    pass

# Main loop
while True:
    main()
    time.sleep(0.1)
```

## Pin Mappings

### Motors
- **M1**: GPIO25 (A), GPIO26 (B), GPIO14 (Enable/PWM)
- **M2**: GPIO27 (A), GPIO32 (B), GPIO15 (Enable/PWM)
- **M3**: GPIO33 (A), GPIO12 (B), GPIO13 (Enable/PWM)
- **M4**: GPIO2 (A), GPIO4 (B), GPIO5 (Enable/PWM)

### Sensors
- **LDR**: GPIO36 (ADC1_CH0)
- **IR**: GPIO39 (ADC1_CH3)
- **Temperature**: GPIO34 (ADC1_CH6)
- **Ultrasonic**: GPIO18 (TRIG), GPIO19 (ECHO)
- **Touch**: GPIO0

### Joysticks
- **Joystick1**: GPIO35 (V), GPIO37 (H)
- **Joystick2**: GPIO38 (V), GPIO0 (H)

### OLED Display
- **I2C**: GPIO21 (SDA), GPIO22 (SCL), Address 0x3C

### Servo Motors
- **Servo1**: GPIO17 (PWM)
- **Servo2**: GPIO23 (PWM)

## Usage

The enhanced generator is automatically used when clicking "Generate Python Code" button. It:

1. Scans the Blockly workspace for used blocks
2. Determines required libraries
3. Generates complete MicroPython code with:
   - Proper imports
   - Fixed pin definitions
   - Helper functions
   - User's block code wrapped in main loop

## Library Auto-Import

Libraries are automatically imported based on blocks used:

| Block Type | Required Libraries |
|------------|-------------------|
| `dc_motor` | `machine` |
| `servo_motor` | `machine`, `servo` |
| `ldr_sensor` | `machine` |
| `temp_sensor` | `machine`, `dht` |
| `ultrasonic_sensor` | `machine`, `time` |
| `oled_*` | `machine`, `ssd1306` |
| `time_delay` | `time` |

## Important Notes

1. **Pin mappings are FIXED** - Do not modify pin numbers in generated code
2. **Only required libraries are imported** - No unused imports
3. **Code is ready to upload** - Generated code can be directly uploaded to ESP32
4. **Follows ESP32 MicroPython best practices** - Proper pin initialization and PWM setup

## Example Generated Code

When user drags a "set motor M1 speed to 80 and direction forward" block:

```python
# Imports
from machine import Pin, PWM, ADC, SoftI2C

# Pin Definitions
M1_PIN_A = Pin(25, Pin.OUT)
M1_PIN_B = Pin(26, Pin.OUT)
M1_PWM = PWM(Pin(14))
M1_PWM.freq(1000)

# Helper Functions
def set_motor(motor_id, speed, direction):
    pin_a = globals()[f'M{motor_id[1]}_PIN_A']
    pin_b = globals()[f'M{motor_id[1]}_PIN_B']
    pwm = globals()[f'M{motor_id[1]}_PWM']
    duty = int((speed / 255) * 1023)
    pwm.duty(duty)
    if direction == 'FORWARD':
        pin_a.value(1)
        pin_b.value(0)
    elif direction == 'REVERSE':
        pin_a.value(0)
        pin_b.value(1)

# Main Code
def main():
    set_motor("M1", 80, "FORWARD")

while True:
    main()
    time.sleep(0.1)
```

## Troubleshooting

### Enhanced generator not working?
- Check browser console for errors
- Ensure `code_generator.js` is loaded before `blockly_page.js`
- Verify Blockly workspace is initialized

### Wrong pins in generated code?
- Pin mappings are fixed in `pin_mapping.json`
- Update `pin_mapping.json` if hardware wiring changes
- Regenerate code after updating pin mappings

### Missing libraries?
- Check `library_mapping.json` for block-to-library mapping
- Add missing mappings if new blocks are added

