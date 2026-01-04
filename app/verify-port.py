#!/usr/bin/env python3
"""
Verify if a COM port exists and is accessible
Quick check before attempting operations
"""

import sys
import json
import serial.tools.list_ports

def verify_port(port_path):
    """Check if port exists in system"""
    try:
        # List all ports
        ports = serial.tools.list_ports.comports()
        port_exists = any(p.device == port_path for p in ports)
        
        if port_exists:
            print(json.dumps({'success': True, 'exists': True, 'message': f'Port {port_path} exists'}))
        else:
            available_ports = [p.device for p in ports]
            print(json.dumps({
                'success': False, 
                'exists': False,
                'message': f'Port {port_path} not found',
                'available_ports': available_ports
            }))
    except Exception as e:
        print(json.dumps({'success': False, 'exists': False, 'error': str(e)}))

def main():
    if len(sys.argv) < 2:
        print(json.dumps({'success': False, 'error': 'Port path required'}))
        sys.exit(1)
    
    verify_port(sys.argv[1])

if __name__ == '__main__':
    main()

