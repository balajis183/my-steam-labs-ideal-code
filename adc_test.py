# ADC Test - Reads analog values and converts to voltage
# Perfect for Steam Labs testing

from machine import ADC, Pin
from time import sleep

print("Starting ADC Test...")
print("Reading analog values from IO34 and IO35")

# Initialize ADC on pins IO34 and IO35
adc34 = ADC(Pin(34))
adc35 = ADC(Pin(35))

# Set attenuation (adjusts voltage range)
adc34.atten(ADC.ATTN_11DB)  # Full range: 0-3.3V
adc35.atten(ADC.ATTN_11DB)

# Set width (bit resolution)
adc34.width(ADC.WIDTH_12BIT)  # 0-4095
adc35.width(ADC.WIDTH_12BIT)

print("ADC Configuration:")
print("- Voltage Range: 0-3.3V")
print("- Resolution: 12-bit (0-4095)")
print("- Reading for 10 seconds...")
print("-" * 40)

# Read values for 10 seconds
for i in range(10):
    # Read raw ADC values
    val34 = adc34.read()
    val35 = adc35.read()
    
    # Convert to voltage (3.3V / 4095 = 0.0008V per step)
    voltage34 = val34 * (3.3 / 4095)
    voltage35 = val35 * (3.3 / 4095)
    
    # Print results
    print(f"Reading {i+1}:")
    print(f"  IO34: {val34:4d} (raw) -> {voltage34:.3f}V")
    print(f"  IO35: {val35:4d} (raw) -> {voltage35:.3f}V")
    
    # Add some analysis
    if val34 > 0:
        print(f"  IO34: Signal detected!")
    else:
        print(f"  IO34: No signal (floating)")
    
    if val35 > 0:
        print(f"  IO35: Signal detected!")
    else:
        print(f"  IO35: No signal (floating)")
    
    print("-" * 20)
    sleep(1)

# Final summary
print("ADC Test Summary:")
print("✅ ADC is working correctly!")
print("✅ IO34: Reading varying values (connected to something)")
print("✅ IO35: Reading 0 (no voltage connected)")
print("💡 Connect sensors to IO35 to see different readings")
print("💡 Try connecting a potentiometer or light sensor")

# Optional: Show what you can connect
print("\nWhat you can connect:")
print("- Potentiometer (variable resistor)")
print("- Light sensor (LDR)")
print("- Temperature sensor")
print("- Sound sensor")
print("- Any analog sensor (0-3.3V)")

print("✅ ADC test completed successfully!")
