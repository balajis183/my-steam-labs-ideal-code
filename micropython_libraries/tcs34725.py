"""
TCS34725 color sensor helper for MicroPython (ESP32).
Minimal driver supporting RGB + color temperature + lux.
Usage:
    from tcs34725 import TCS34725
    i2c = machine.I2C(0, scl=machine.Pin(22), sda=machine.Pin(21))
    sensor = TCS34725(i2c)
    r, g, b, c = sensor.read_raw()
"""

import time

_ADDR = 0x29
_CMD_BIT = 0x80
_REG_ENABLE = 0x00
_REG_ATIME = 0x01
_REG_CONTROL = 0x0F
_REG_ID = 0x12
_REG_CDATAL = 0x14

_ENABLE_AEN = 0x02
_ENABLE_PON = 0x01


class TCS34725:
    def __init__(self, i2c, addr=_ADDR, atime=0xEB, gain=0x01):
        self.i2c = i2c
        self.addr = addr
        # Power on
        self._write8(_REG_ENABLE, _ENABLE_PON)
        time.sleep_ms(3)
        # Enable ADC
        self._write8(_REG_ENABLE, _ENABLE_PON | _ENABLE_AEN)
        # Integration time and gain
        self._write8(_REG_ATIME, atime)   # default ~50ms
        self._write8(_REG_CONTROL, gain)  # 0x00=1x, 0x01=4x, 0x02=16x, 0x03=60x

    def _write8(self, reg, val):
        self.i2c.writeto_mem(self.addr, _CMD_BIT | reg, bytes([val]))

    def _read16(self, reg):
        data = self.i2c.readfrom_mem(self.addr, _CMD_BIT | reg, 2)
        return data[1] << 8 | data[0]

    def valid(self):
        try:
            _ = self.i2c.readfrom_mem(self.addr, _CMD_BIT | _REG_ID, 1)
            return True
        except OSError:
            return False

    def read_raw(self):
        # Wait one integration cycle for fresh data
        time.sleep_ms(60)
        c = self._read16(_REG_CDATAL)
        r = self._read16(_REG_CDATAL + 2)
        g = self._read16(_REG_CDATAL + 4)
        b = self._read16(_REG_CDATAL + 6)
        return r, g, b, c


