# File Organization Helper
# This script helps you understand when to create new files

print("📁 File Organization Guide for ESP32 Projects")
print("=" * 50)

print("\n❓ Question: Do I need a new file for this code?")
print("Answer these questions:")

print("\n1. Is this code for a different hardware component?")
print("   ✅ YES → Create new file")
print("   ❌ NO → Continue to question 2")

print("\n2. Is this code for a different functionality?")
print("   ✅ YES → Create new file")
print("   ❌ NO → Continue to question 3")

print("\n3. Is this code reusable in other projects?")
print("   ✅ YES → Create new file in libraries/")
print("   ❌ NO → Continue to question 4")

print("\n4. Is this a complete project?")
print("   ✅ YES → Create new folder in projects/")
print("   ❌ NO → Continue to question 5")

print("\n5. Is this a configuration file?")
print("   ✅ YES → Create config.py")
print("   ❌ NO → Continue to question 6")

print("\n6. Is this a simple test (< 50 lines)?")
print("   ✅ YES → Keep in current file or create simple test")
print("   ❌ NO → Consider splitting into multiple files")

print("\n" + "=" * 50)
print("📋 DECISION TREE:")
print("=" * 50)

print("\n🔧 Hardware Components → Separate files")
print("   - ADC sensors → adc_sensor.py")
print("   - SPI devices → spi_device.py")
print("   - I2C devices → i2c_device.py")
print("   - Displays → oled_display.py")
print("   - Motors → motor_control.py")

print("\n🧪 Tests → Separate files")
print("   - Hardware tests → tests/hardware/")
print("   - Sensor tests → tests/sensors/")
print("   - Integration tests → tests/integration/")

print("\n📚 Libraries → Separate files")
print("   - Utility functions → utils.py")
print("   - Math helpers → math_helpers.py")
print("   - Data logging → data_logger.py")

print("\n⚙️ Configuration → Separate files")
print("   - Pin assignments → config.py")
print("   - WiFi settings → wifi_config.py")
print("   - Sensor calibration → calibration.py")

print("\n🎯 Complete Projects → Separate folders")
print("   - Weather station → projects/weather_station/")
print("   - Robot arm → projects/robot_arm/")
print("   - Smart garden → projects/smart_garden/")

print("\n" + "=" * 50)
print("💡 EXAMPLES:")
print("=" * 50)

print("\n✅ GOOD - Separate files:")
print("   - temperature_sensor.py (hardware component)")
print("   - motor_controller.py (different functionality)")
print("   - data_logger.py (reusable library)")
print("   - config.py (configuration)")

print("\n❌ BAD - Keep in same file:")
print("   - Simple test functions (< 50 lines)")
print("   - Related functions (same hardware)")
print("   - Temporary experiments")

print("\n" + "=" * 50)
print("🚀 NEXT STEPS:")
print("=" * 50)

print("\n1. Create folders:")
print("   mkdir hardware")
print("   mkdir tests")
print("   mkdir libraries")
print("   mkdir projects")

print("\n2. Move existing files:")
print("   - Move test files to tests/")
print("   - Move hardware files to hardware/")
print("   - Move utility files to libraries/")

print("\n3. Create main.py:")
print("   - Main application entry point")
print("   - Import from organized modules")

print("\n4. Create config.py:")
print("   - Pin assignments")
print("   - Configuration settings")

print("\n✅ Your project will be much more organized!")
print("✅ Easier to find and maintain code!")
print("✅ Professional development structure!")
