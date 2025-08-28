#!/usr/bin/env python3
"""
Simple ESP32 Test Script
A basic script to test your ESP32 connection and functionality.
"""

print("Hello from ESP32!")
print("Testing basic functionality...")

# Test basic operations
x = 10
y = 20
result = x + y
print(f"Math test: {x} + {y} = {result}")

# Test loops
print("Counting from 1 to 5:")
for i in range(1, 6):
    print(f"  {i}")

print("Test completed successfully!")
