# Hardware Configuration - MY STEAM LAB ESP32 Board

## ⚠️ CRITICAL: Fixed Hardware Settings

These settings are **FIXED** for the ESP32 board and **MUST NOT** be changed.

### 1. Baud Rate: 115200

**Value**: 115200 baud  
**Status**: FIXED - DO NOT CHANGE  
**Used For**: All serial communication with ESP32

- Serial port communication
- Serial monitor
- mpremote uploads
- REPL communication

**Location in Code**:
- `app/main.js`: `ESP32_BAUD_RATE = 115200`
- `ui/scripts/renderer.js`: `ESP32_BAUD_RATE = 115200`
- All serial port initializations use this constant

### 2. Pin Mappings

**Source**: PIN MAPPING.pdf  
**Status**: FIXED - DO NOT MODIFY

See `config/pin_mapping.json` and `config/code_generator.js` for complete pin mappings.

#### Key Pin Mappings:
- **Joystick 1**: V=GPIO4, H=GPIO2
- **Joystick 2**: V=GPIO26, H=GPIO25
- **Motors**: M1(19/18), M2(5/17), M3(23/22), M4(21/16)
- **Sensors**: LDR(34), IR(35), Temp(32), Ultrasonic(33/32), Touch(12)
- **OLED**: SDA(13), SCL(15)

## Why These Are Fixed

1. **Hardware Requirement**: The ESP32 board is configured for these specific settings
2. **Firmware Compatibility**: MicroPython firmware expects 115200 baud
3. **Stability**: These settings provide reliable communication
4. **Client Specification**: Based on PIN MAPPING.pdf and board specifications

## Important Notes

- ⚠️ **DO NOT CHANGE** baud rate to any other value
- ⚠️ **DO NOT MODIFY** pin mappings in generated code
- ✅ All settings are automatically applied - no user configuration needed
- ✅ Code generator uses these fixed values automatically

## Verification

To verify settings are correct:

1. **Baud Rate**: Check serial monitor connects at 115200
2. **Pins**: Verify generated code uses correct GPIO pins from PIN MAPPING.pdf
3. **Upload**: Should work with automatic reset and retry logic

## Files Containing Hardware Settings

- `app/main.js` - Baud rate constant and serial port settings
- `ui/scripts/renderer.js` - Serial monitor baud rate
- `config/code_generator.js` - Pin mappings
- `config/pin_mapping.json` - Pin configuration
- `config/BAUD_RATE_CONFIG.md` - Detailed baud rate documentation

---

**Last Updated**: Based on client specifications and PIN MAPPING.pdf

