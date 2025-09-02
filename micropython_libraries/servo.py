# Servo Library for MicroPython
# Simple servo control using PWM

from machine import PWM, Pin
import time

class Servo:
    def __init__(self, pin, freq=50):
        self.pwm = PWM(Pin(pin), freq=freq)
        self.freq = freq
    
    def write(self, angle):
        """Set servo angle (0-180)"""
        if angle < 0:
            angle = 0
        elif angle > 180:
            angle = 180
        
        # Convert angle to duty cycle
        duty = int((angle / 180) * 1023)
        self.pwm.duty(duty)
    
    def writeMicroseconds(self, us):
        """Set servo position in microseconds"""
        duty = int((us / 20000) * 1023)
        self.pwm.duty(duty)
    
    def detach(self):
        """Detach servo"""
        self.pwm.deinit()
