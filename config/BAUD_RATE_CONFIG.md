# Baud Rate Configuration - ESP32 Board

## ⚠️ CRITICAL: Fixed Baud Rate Setting

**Baud Rate: 115200** (FIXED - DO NOT CHANGE)

This is the **fixed serial communication speed** for the ESP32 board used in MY STEAM LAB project.

## Where Baud Rate is Used

### 1. Serial Port Communication
- **Location**: `app/main.js`
- **Function**: `captureSerialOutput()`, `open-serial-port` handler
- **Setting**: `baudRate: 115200`
- **Purpose**: Serial communication with ESP32 for monitoring and data transfer

### 2. Serial Monitor
- **Location**: `ui/scripts/renderer.js`
- **Function**: `selectPort()`
- **Setting**: `115200`
- **Purpose**: Opening serial monitor to view ESP32 output

### 3. mpremote Communication
- **Tool**: `mpremote` (MicroPython remote)
- **Default**: Uses 115200 automatically
- **Note**: mpremote detects baud rate automatically, but ESP32 must be configured for 115200

## Why 115200 is Fixed

1. **Hardware Requirement**: The ESP32 board is configured to communicate at 115200 baud
2. **MicroPython Default**: Standard MicroPython firmware uses 115200 baud for REPL
3. **Stability**: This baud rate provides reliable communication without errors
4. **Compatibility**: All tools (mpremote, serial monitors) expect 115200

## Important Notes

- ⚠️ **DO NOT CHANGE** the baud rate to any other value (9600, 57600, etc.)
- ✅ All serial communication **MUST** use 115200 baud
- ✅ This is set automatically in the code - no user configuration needed
- ✅ If you see communication errors, check that ESP32 firmware is set to 115200

## Verification

To verify baud rate is correct:

1. **Check Serial Monitor**: Should connect at 115200
2. **Check mpremote**: Should connect automatically at 115200
3. **Check ESP32 Firmware**: MicroPython REPL should respond at 115200

## Files Using 115200 Baud Rate

- `app/main.js` - Serial port initialization
- `ui/scripts/renderer.js` - Serial monitor connection
- All mpremote commands (automatic)

## Troubleshooting

If you experience communication errors:

1. **Verify baud rate**: Make sure ESP32 firmware is set to 115200
2. **Check serial port**: Ensure no other program is using the port at different baud rate
3. **Reset ESP32**: Press reset button to ensure clean communication
4. **Check USB cable**: Use a good quality data cable (not charging-only)

---

**Last Updated**: Based on client specification - 115200 is fixed for this board.

