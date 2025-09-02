# Example: How to Organize Your Current Files

# Current messy structure:
# - adc_test.py
# - test_esp32.py
# - test_esp32_simple.py
# - simple_test.py
# - oled_test_simple.py
# - oled_interactive.py
# - comprehensive_hardware_test.py
# - simple_hardware_test.py

# Organized structure:
# tests/
#   ├── hardware_tests/
#   │   ├── adc_test.py
#   │   ├── comprehensive_hardware_test.py
#   │   └── simple_hardware_test.py
#   ├── esp32_tests/
#   │   ├── test_esp32.py
#   │   ├── test_esp32_simple.py
#   │   └── simple_test.py
#   └── display_tests/
#       ├── oled_test_simple.py
#       └── oled_interactive.py

# Example of how to organize imports:

# Before (messy imports):
from machine import SPI, Pin, ADC
from time import sleep
import random

# After (organized imports):
# Standard library imports
import time
import random

# MicroPython imports
from machine import SPI, Pin, ADC

# Local imports (if you had organized files)
# from hardware.sensors import adc_sensor
# from hardware.displays import oled_display
# from config import SENSOR_PINS

# Example of a well-organized main file:
def main():
    """Main application entry point"""
    print("Starting ESP32 Application...")
    
    # Initialize hardware
    adc = initialize_adc()
    display = initialize_display()
    
    # Main loop
    while True:
        # Read sensors
        temperature = read_temperature(adc)
        
        # Update display
        display.show_temperature(temperature)
        
        # Wait
        time.sleep(1)

def initialize_adc():
    """Initialize ADC sensor"""
    adc = ADC(Pin(35))
    adc.atten(ADC.ATTN_11DB)
    adc.width(ADC.WIDTH_12BIT)
    return adc

def initialize_display():
    """Initialize OLED display"""
    # OLED initialization code here
    pass

def read_temperature(adc):
    """Read temperature from ADC"""
    raw_value = adc.read()
    voltage = raw_value * (3.3 / 4095)
    # Convert voltage to temperature
    temperature = voltage * 100  # Example conversion
    return temperature

if __name__ == "__main__":
    main()
