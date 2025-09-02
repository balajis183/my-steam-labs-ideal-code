# NeoPixel Library for MicroPython
# Simple RGB LED control

from machine import Pin
import time

class NeoPixel:
    def __init__(self, pin, n):
        self.pin = Pin(pin, Pin.OUT)
        self.n = n
        self.buf = bytearray(n * 3)
    
    def __setitem__(self, index, val):
        if index >= self.n:
            return
        self.buf[index * 3] = val[1]  # Green
        self.buf[index * 3 + 1] = val[0]  # Red
        self.buf[index * 3 + 2] = val[2]  # Blue
    
    def fill(self, color):
        for i in range(self.n):
            self[i] = color
    
    def write(self):
        # Simple implementation - can be improved
        for i in range(self.n * 3):
            if self.buf[i]:
                self.pin.value(1)
                time.sleep_us(1)
                self.pin.value(0)
            else:
                self.pin.value(0)
                time.sleep_us(1)
