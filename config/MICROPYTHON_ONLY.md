# MicroPython Only - Code Generator

## ✅ Confirmed: MicroPython Code Generation Only

This code generator produces **MICROPYTHON code ONLY** for ESP32 Dev Board.

**NOT supported:**
- ❌ C/C++ code
- ❌ Arduino code
- ❌ Standard Python (CPython)

**ONLY supported:**
- ✅ MicroPython for ESP32
- ✅ Uses `machine` module (MicroPython-specific)
- ✅ ESP32-compatible APIs

## MicroPython-Specific Features

### Pin Control
- Uses `machine.Pin()` (not Arduino `pinMode()`)
- Uses `pin.value()` (not `digitalWrite()`/`digitalRead()`)
- Uses `machine.PWM()` (not `analogWrite()`)
- Uses `machine.ADC()` (not `analogRead()`)

### Timing
- Uses `time.sleep()` and `time.sleep_us()` (MicroPython)
- Uses `time.ticks_us()` for microsecond timing

### Libraries
- `machine` module (MicroPython core)
- `ssd1306` (MicroPython OLED library)
- `dht` (MicroPython DHT sensor library)
- `servo` (MicroPython servo library)

### Code Structure
```python
# MicroPython imports
from machine import Pin, PWM, ADC, SoftI2C
import time

# Pin definitions (MicroPython style)
M1_PIN_A = Pin(25, Pin.OUT)  # MicroPython Pin constructor
M1_PWM = PWM(Pin(14))        # MicroPython PWM constructor

# Main loop (MicroPython style)
def main():
    # Your code here
    pass

while True:
    main()
    time.sleep(0.1)  # MicroPython time.sleep()
```

## Generated Code is Ready For

- ✅ ESP32 Dev Board
- ✅ MicroPython firmware
- ✅ Direct upload via mpremote or Thonny
- ✅ No compilation needed (interpreted language)

## Verification

All generated code:
- Uses MicroPython APIs only
- No C/C++ syntax
- No Arduino functions
- ESP32-compatible
- Ready to run on ESP32 with MicroPython firmware

