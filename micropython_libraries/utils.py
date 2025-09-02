# MicroPython Utilities Library
# Collection of useful functions for ESP32 projects

import time
import math
import random

def map_value(x, in_min, in_max, out_min, out_max):
    """Map a value from one range to another"""
    return (x - in_min) * (out_max - out_min) // (in_max - in_min) + out_min

def constrain(value, min_val, max_val):
    """Constrain a value between min and max"""
    return max(min_val, min(value, max_val))

def smooth(value, previous_value, smoothing_factor=0.1):
    """Smooth a value using exponential smoothing"""
    return previous_value + smoothing_factor * (value - previous_value)

def debounce(pin, delay_ms=50):
    """Simple debounce for a pin"""
    time.sleep_ms(delay_ms)
    return pin.value()

def millis():
    """Get current time in milliseconds"""
    return time.ticks_ms()

def delay(ms):
    """Delay for specified milliseconds"""
    time.sleep_ms(ms)

def random_range(min_val, max_val):
    """Generate random number in range"""
    return random.randint(min_val, max_val)

def is_even(num):
    """Check if number is even"""
    return num % 2 == 0

def is_odd(num):
    """Check if number is odd"""
    return num % 2 == 1

def clamp(value, min_val, max_val):
    """Clamp value between min and max"""
    return max(min_val, min(value, max_val))

def lerp(start, end, factor):
    """Linear interpolation between two values"""
    return start + (end - start) * factor

def distance(x1, y1, x2, y2):
    """Calculate distance between two points"""
    return math.sqrt((x2 - x1)**2 + (y2 - y1)**2)

class Timer:
    """Simple timer class"""
    def __init__(self):
        self.start_time = time.ticks_ms()
    
    def elapsed(self):
        """Get elapsed time in milliseconds"""
        return time.ticks_diff(time.ticks_ms(), self.start_time)
    
    def reset(self):
        """Reset the timer"""
        self.start_time = time.ticks_ms()
    
    def has_passed(self, ms):
        """Check if specified time has passed"""
        return self.elapsed() >= ms

class Debouncer:
    """Button debouncer class"""
    def __init__(self, pin, delay_ms=50):
        self.pin = pin
        self.delay_ms = delay_ms
        self.last_state = pin.value()
        self.last_change = time.ticks_ms()
    
    def read(self):
        """Read debounced pin state"""
        current_state = self.pin.value()
        current_time = time.ticks_ms()
        
        if current_state != self.last_state:
            if time.ticks_diff(current_time, self.last_change) > self.delay_ms:
                self.last_state = current_state
                self.last_change = current_time
        
        return self.last_state

class MovingAverage:
    """Moving average filter"""
    def __init__(self, window_size=10):
        self.window_size = window_size
        self.values = []
    
    def add(self, value):
        """Add a new value to the filter"""
        self.values.append(value)
        if len(self.values) > self.window_size:
            self.values.pop(0)
    
    def get_average(self):
        """Get the current average"""
        if not self.values:
            return 0
        return sum(self.values) / len(self.values)
    
    def reset(self):
        """Reset the filter"""
        self.values.clear()
