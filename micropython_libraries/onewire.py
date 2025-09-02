# OneWire Library for MicroPython
# Simplified version for DS18B20 temperature sensors

import time

class OneWire:
    def __init__(self, pin):
        self.pin = pin
        self.pin.init(pin.OPEN_DRAIN, pin.PULL_UP)
    
    def reset(self):
        """Reset the bus"""
        self.pin.value(0)
        time.sleep_us(480)
        self.pin.value(1)
        time.sleep_us(70)
        return self.pin.value() == 0
    
    def writebyte(self, data):
        """Write a byte"""
        for i in range(8):
            self.pin.value(0)
            time.sleep_us(2)
            self.pin.value((data >> i) & 1)
            time.sleep_us(60)
            self.pin.value(1)
            time.sleep_us(2)
    
    def readbyte(self):
        """Read a byte"""
        data = 0
        for i in range(8):
            self.pin.value(0)
            time.sleep_us(2)
            self.pin.value(1)
            time.sleep_us(8)
            data |= (self.pin.value() << i)
            time.sleep_us(50)
        return data
