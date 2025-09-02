# Simple Hardware Connection Test
# This will give you real readings with minimal hardware

from machine import ADC, Pin
from time import sleep

print("🔌 Simple Hardware Test")
print("=" * 30)

# Initialize ADC
adc = ADC(Pin(35))
adc.atten(ADC.ATTN_11DB)
adc.width(ADC.WIDTH_12BIT)

print("📋 Hardware Setup Instructions:")
print("1. Get a 10kΩ potentiometer")
print("2. Connect:")
print("   - 3.3V -> Potentiometer input")
print("   - Pin 35 -> Potentiometer output (middle pin)")
print("   - GND -> Potentiometer ground")
print("3. Turn the potentiometer to see changing values!")

print("\n🎛️  Testing ADC Pin 35...")
print("Turn the potentiometer and watch the values change!")

try:
    while True:
        raw_value = adc.read()
        voltage = raw_value * (3.3 / 4095)
        
        # Create a simple bar graph
        bar_length = int((raw_value / 4095) * 20)
        bar = "█" * bar_length + "░" * (20 - bar_length)
        
        print(f"Raw: {raw_value:4d} | Voltage: {voltage:.3f}V | [{bar}]")
        sleep(0.5)
        
except KeyboardInterrupt:
    print("\n✅ Test completed!")
    print("💡 If you saw changing values, your hardware is working!")
    print("💡 If values stayed at 0, connect a potentiometer to Pin 35")
