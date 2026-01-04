"""
HC-SR04 ultrasonic sensor helper for MicroPython (ESP32).
Usage:
    from hcsr04 import HCSR04
    sensor = HCSR04(trigger_pin=33, echo_pin=32, echo_timeout_us=30000)
    distance_cm = sensor.distance_cm()
"""

import machine
import time


class HCSR04:
    def __init__(self, trigger_pin, echo_pin, echo_timeout_us=30000):
        self.trigger = machine.Pin(trigger_pin, machine.Pin.OUT)
        # Try without pull-down to improve 5V signal detection (not ideal, but may work)
        self.echo = machine.Pin(echo_pin, machine.Pin.IN)
        self.echo_timeout_us = echo_timeout_us

    def _send_pulse_and_wait(self):
        # Ensure trigger is low initially
        self.trigger.value(0)
        time.sleep_us(2)
        
        # Send trigger pulse (10us high pulse)
        self.trigger.value(1)
        time.sleep_us(10)
        self.trigger.value(0)
        
        # Small delay to allow echo pin to stabilize
        time.sleep_us(2)

        # Wait for echo to go high (start of echo pulse)
        timeout_start = time.ticks_us()
        while self.echo.value() == 0:
            if time.ticks_diff(time.ticks_us(), timeout_start) > self.echo_timeout_us:
                return None
        
        # Record when echo goes high (this is pulse_start)
        pulse_start = time.ticks_us()

        # Measure how long echo stays high
        while self.echo.value() == 1:
            if time.ticks_diff(time.ticks_us(), pulse_start) > self.echo_timeout_us:
                return None
        
        # Record when echo goes low (this is pulse_end)
        pulse_end = time.ticks_us()

        pulse_duration = time.ticks_diff(pulse_end, pulse_start)
        return pulse_duration

    def distance_cm(self):
        pulse_duration = self._send_pulse_and_wait()
        if pulse_duration is None:
            return None
        # Speed of sound: 340 m/s => 0.034 cm/us. Divide by 2 for round trip.
        return (pulse_duration * 0.0343) / 2


