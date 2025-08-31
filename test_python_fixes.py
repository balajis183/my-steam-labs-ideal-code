#!/usr/bin/env python3
"""
Test Script for Python Fixes
This script tests basic Python functionality that should work in the Steam Labs environment.
"""

print("=" * 50)
print("🧪 PYTHON FIXES TEST")
print("=" * 50)

# Test 1: Basic print statements
print("✅ Basic print statements working")

# Test 2: Variables and math
x = 10
y = 20
result = x + y
print(f"✅ Math operations: {x} + {y} = {result}")

# Test 3: Loops
print("✅ Loop test:")
for i in range(1, 4):
    print(f"  Count: {i}")

# Test 4: Functions
def test_function():
    return "Function call successful!"

print(f"✅ Function test: {test_function()}")

# Test 5: List operations
numbers = [1, 2, 3, 4, 5]
squared = [n**2 for n in numbers]
print(f"✅ List comprehension: {numbers} -> {squared}")

# Test 6: Error handling
try:
    result = 10 / 0
except ZeroDivisionError:
    print("✅ Error handling working correctly")

print("=" * 50)
print("🎯 PYTHON FIXES TEST COMPLETED SUCCESSFULLY!")
print("=" * 50)
print("If you see this output, the Python fixes are working!")
