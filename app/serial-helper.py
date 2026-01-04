#!/usr/bin/env python3
"""
Serial Port Helper for Electron App
Replaces node-serialport with Python-based serial operations
"""

import sys
import json
import time
import serial
import serial.tools.list_ports

def list_ports():
    """List all available serial ports"""
    try:
        ports = serial.tools.list_ports.comports()
        result = []
        for port in ports:
            result.append({
                'path': port.device,
                'manufacturer': port.manufacturer or '',
                'serialNumber': port.serial_number or '',
                'pnpId': port.hwid or '',
                'locationId': '',
                'productId': hex(port.pid) if port.pid else '',
                'vendorId': hex(port.vid) if port.vid else '',
                'friendlyName': port.description or ''
            })
        print(json.dumps({'success': True, 'ports': result}))
    except Exception as e:
        print(json.dumps({'success': False, 'error': str(e)}))
        sys.exit(1)

def hardware_reset(port_path, boot_mode='normal'):
    """
    Perform hardware reset on ESP32
    boot_mode: 'normal' or 'bootloader'
    """
    ser = None
    try:
        # Open port with short timeout for quick operations
        ser = serial.Serial(port_path, 115200, timeout=0.5, write_timeout=0.5)
        
        if boot_mode == 'bootloader':
            # Enter bootloader: DTR low (GPIO0), RTS low (EN)
            ser.dtr = False  # GPIO0 LOW
            ser.rts = False  # EN LOW (reset)
            time.sleep(0.1)
            ser.rts = True   # EN HIGH (release reset, boot with GPIO0 LOW)
            time.sleep(0.15)
        else:
            # Normal boot: DTR high (GPIO0), cycle EN
            ser.dtr = True   # GPIO0 HIGH
            ser.rts = True   # EN HIGH
            time.sleep(0.05)
            ser.rts = False  # EN LOW (reset)
            time.sleep(0.1)
            ser.rts = True   # EN HIGH (release reset, boot normal)
            time.sleep(0.15)
        
        # CRITICAL: Properly close and release the port
        if ser.is_open:
            ser.close()
        del ser
        ser = None
        time.sleep(0.3)  # Increased wait for OS to release port handle
        
        print(json.dumps({'success': True}), flush=True)
        sys.stdout.flush()
        sys.exit(0)  # Clean exit
        
    except serial.SerialException as e:
        # Serial-specific error (port busy, doesn't exist, etc.)
        error_msg = f"Serial error: {str(e)}"
        print(json.dumps({'success': False, 'error': error_msg}), flush=True)
        sys.stdout.flush()
        sys.exit(1)
    except Exception as e:
        # Other errors
        error_msg = f"Unexpected error: {str(e)}"
        print(json.dumps({'success': False, 'error': error_msg}), flush=True)
        sys.stdout.flush()
        sys.exit(1)
    finally:
        # ALWAYS ensure port is closed, no matter what
        if ser is not None:
            try:
                if ser.is_open:
                    ser.close()
                del ser
            except:
                pass
        # Force flush output before exit
        sys.stdout.flush()
        sys.stderr.flush()

def read_serial(port_path, baudrate=115200, timeout_seconds=5):
    """Read from serial port for specified time"""
    try:
        ser = serial.Serial(port_path, baudrate, timeout=0.1)
        start_time = time.time()
        output_lines = []
        
        while time.time() - start_time < timeout_seconds:
            if ser.in_waiting > 0:
                line = ser.readline().decode('utf-8', errors='ignore').strip()
                if line:
                    output_lines.append(line)
        
        ser.close()
        print(json.dumps({'success': True, 'output': output_lines}))
    except Exception as e:
        print(json.dumps({'success': False, 'error': str(e)}))
        sys.exit(1)

def write_serial(port_path, data, baudrate=115200):
    """Write data to serial port"""
    try:
        ser = serial.Serial(port_path, baudrate, timeout=1)
        ser.write((data + '\n').encode('utf-8'))
        ser.flush()
        time.sleep(0.1)
        ser.close()
        print(json.dumps({'success': True}))
    except Exception as e:
        print(json.dumps({'success': False, 'error': str(e)}))
        sys.exit(1)

def test_connection(port_path):
    """Test if port can be opened"""
    ser = None
    try:
        ser = serial.Serial(port_path, 115200, timeout=0.5)
        ser.close()
        del ser
        time.sleep(0.1)  # Give OS time to release port
        print(json.dumps({'success': True}))
    except Exception as e:
        print(json.dumps({'success': False, 'error': str(e)}))
        sys.exit(1)
    finally:
        # Be defensive: never raise from cleanup (Windows COM ports can error here)
        try:
            if ser is not None and getattr(ser, "is_open", False):
                ser.close()
        except Exception:
            pass

def main():
    if len(sys.argv) < 2:
        print(json.dumps({'success': False, 'error': 'No command specified'}))
        sys.exit(1)
    
    command = sys.argv[1]
    
    if command == 'list':
        list_ports()
    elif command == 'reset':
        if len(sys.argv) < 3:
            print(json.dumps({'success': False, 'error': 'Port path required'}))
            sys.exit(1)
        port_path = sys.argv[2]
        boot_mode = sys.argv[3] if len(sys.argv) > 3 else 'normal'
        hardware_reset(port_path, boot_mode)
    elif command == 'test':
        if len(sys.argv) < 3:
            print(json.dumps({'success': False, 'error': 'Port path required'}))
            sys.exit(1)
        test_connection(sys.argv[2])
    elif command == 'read':
        if len(sys.argv) < 3:
            print(json.dumps({'success': False, 'error': 'Port path required'}))
            sys.exit(1)
        port_path = sys.argv[2]
        timeout = int(sys.argv[3]) if len(sys.argv) > 3 else 5
        read_serial(port_path, timeout_seconds=timeout)
    elif command == 'write':
        if len(sys.argv) < 4:
            print(json.dumps({'success': False, 'error': 'Port path and data required'}))
            sys.exit(1)
        write_serial(sys.argv[2], sys.argv[3])
    else:
        print(json.dumps({'success': False, 'error': f'Unknown command: {command}'}))
        sys.exit(1)

if __name__ == '__main__':
    main()

