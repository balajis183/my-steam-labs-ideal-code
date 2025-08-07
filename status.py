import serial.tools.list_ports
import subprocess
import sys

def is_board_connected():
    """Check if a development board is connected via serial port"""
    ports = serial.tools.list_ports.comports()
    
    # Common board identifiers
    board_identifiers = [
        'USB', 'UART', 'COM', 'Serial', 'ESP32', 'ESP8266', 
        'Arduino', 'Raspberry', 'MicroPython', 'CircuitPython'
    ]
    
    for port in ports:
        # Check port description and manufacturer for board identifiers
        description = port.description.lower()
        manufacturer = (port.manufacturer or '').lower()
        
        for identifier in board_identifiers:
            if identifier.lower() in description or identifier.lower() in manufacturer:
                return True
    
    # Also check if mpremote can find any devices
    try:
        result = subprocess.run(['mpremote', 'list'], 
                              capture_output=True, text=True, timeout=5)
        if result.returncode == 0 and result.stdout.strip():
            return True
    except (subprocess.TimeoutExpired, FileNotFoundError):
        pass
    
    return False

def get_connected_ports():
    """Get list of connected serial ports"""
    ports = serial.tools.list_ports.comports()
    return [port.device for port in ports]

if __name__ == "__main__":
    try:
        if is_board_connected():
            print("connected")
        else:
            print("disconnected")
    except Exception as e:
        print(f"error: {str(e)}")
        sys.exit(1)
