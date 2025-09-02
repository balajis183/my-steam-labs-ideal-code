# MicroPython Libraries Collection

This folder contains all the MicroPython libraries for ESP32.

## Available Libraries:

### Display Libraries:
- `ssd1306.py` - OLED Display Driver
- `sh1106.py` - SH1106 OLED Display Driver
- `lcd1602.py` - LCD1602 Display Driver
- `max7219.py` - MAX7219 LED Matrix Driver
- `ht16k33.py` - HT16K33 LED Matrix Driver
- `neopixel.py` - NeoPixel LED Control

### Sensor Libraries:
- `dht.py` - DHT Temperature/Humidity Sensor
- `ds18x20.py` - DS18B20 Temperature Sensor
- `onewire.py` - OneWire Protocol
- `bmp280.py` - BMP280 Pressure/Temperature Sensor
- `bme280.py` - BME280 Pressure/Temperature/Humidity Sensor
- `mpu6050.py` - MPU6050 Accelerometer/Gyroscope
- `vl53l0x.py` - VL53L0X Distance Sensor

### Motor Control:
- `servo.py` - Servo Motor Control
- `pca9685.py` - PCA9685 PWM Controller

### Utility Libraries:
- `utils.py` - Utility Functions

## Usage:
Copy any library file to your ESP32 using mpremote:
```
python -m mpremote connect COM6 fs cp ssd1306.py :ssd1306.py
```

Then import in your code:
```python
import ssd1306
```
