#!/usr/bin/env python3
"""
Serial Monitor for Electron App
Continuously reads from serial port and outputs to stdout
"""

import sys
import time
import serial
import threading

def read_serial_continuous(port_path, baudrate=115200):
    """Continuously read from serial port and print to stdout"""
    # Force UTF-8 encoding on stdout
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')

    ser = None
    backoff = 0.2
    max_backoff = 3.0
    connected_banner_printed = False

    while True:
        try:
            if ser is None:
                # Try to (re)open the port. On Windows, this can fail temporarily during reset/driver hiccups.
                ser = serial.Serial(port_path, baudrate, timeout=0.1)
                if not connected_banner_printed:
                    print(f"[Serial Monitor Connected to {port_path}]", flush=True)
                    connected_banner_printed = True
                else:
                    print(f"\n[Serial Monitor Reconnected to {port_path}]\n", flush=True)
                backoff = 0.2

            if ser.in_waiting > 0:
                data = ser.read(ser.in_waiting)
                # Prefer UTF-8, fallback to latin-1 (accepts all bytes)
                try:
                    text = data.decode('utf-8', errors='replace')
                except Exception:
                    text = data.decode('latin-1', errors='replace')
                text = text.replace('\x00', '')
                print(text, end='', flush=True)

            time.sleep(0.01)

        except KeyboardInterrupt:
            print("\n[Serial Monitor Closed]", flush=True)
            try:
                if ser is not None and getattr(ser, "is_open", False):
                    ser.close()
            except Exception:
                pass
            sys.exit(0)

        except (serial.SerialException, PermissionError, OSError) as e:
            # This is the exact class of error you're seeing:
            # "ClearCommError failed (PermissionError: Access is denied)"
            print(f"\n[Serial Error]: {str(e)}\n", flush=True)
            try:
                if ser is not None:
                    ser.close()
            except Exception:
                pass
            ser = None
            time.sleep(backoff)
            backoff = min(max_backoff, backoff * 2)

        except Exception as e:
            # Unexpected errors: log and attempt to recover like above
            print(f"\n[Unexpected Error]: {str(e)}\n", flush=True)
            try:
                if ser is not None:
                    ser.close()
            except Exception:
                pass
            ser = None
            time.sleep(backoff)
            backoff = min(max_backoff, backoff * 2)

def main():
    if len(sys.argv) < 2:
        print("[Error] Port path required", flush=True)
        sys.exit(1)
    
    port_path = sys.argv[1]
    baudrate = int(sys.argv[2]) if len(sys.argv) > 2 else 115200
    
    read_serial_continuous(port_path, baudrate)

if __name__ == '__main__':
    main()

