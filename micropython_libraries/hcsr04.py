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
        self.echo = machine.Pin(echo_pin, machine.Pin.IN)
        self.echo_timeout_us = echo_timeout_us

    def _send_pulse_and_wait(self):
        self.trigger.value(0)
        time.sleep_us(5)
        self.trigger.value(1)
        time.sleep_us(10)
        self.trigger.value(0)

        # Wait for echo to go high
        pulse_start = time.ticks_us()
        while self.echo.value() == 0:
            if time.ticks_diff(time.ticks_us(), pulse_start) > self.echo_timeout_us:
                return None

        # Measure how long echo stays high
        pulse_end = time.ticks_us()
        while self.echo.value() == 1:
            if time.ticks_diff(time.ticks_us(), pulse_end) > self.echo_timeout_us:
                return None
        pulse_end = time.ticks_us()

        pulse_duration = time.ticks_diff(pulse_end, pulse_start)
        return pulse_duration

    def distance_cm(self):
        pulse_duration = self._send_pulse_and_wait()
        if pulse_duration is None:
            return None
        # Speed of sound: 340 m/s => 0.034 cm/us. Divide by 2 for round trip.
        return (pulse_duration * 0.0343) / 2


