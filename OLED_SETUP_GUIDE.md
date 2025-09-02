# OLED Display Setup Guide
# Step-by-step instructions to get your OLED working

## 🎯 Your Goal: Interactive OLED Display

You want to create an OLED display that can show text from your computer. Here's how to do it:

## 📋 Step-by-Step Process

### Step 1: Find Working Pins
First, we need to find which pins work on your ESP32:

1. **Upload `quick_oled_test.py`** to your ESP32
2. **Run it** and see which pins work
3. **Note the working pin numbers** (e.g., SDA=21, SCL=22)

### Step 2: Test Simple Display
Once you have working pins:

1. **Upload `simple_oled_demo.py`** to your ESP32
2. **Change the pins** at the top of the file:
   ```python
   SDA_PIN = 21  # Change to your working SDA pin
   SCL_PIN = 22  # Change to your working SCL pin
   ```
3. **Run it** to see if OLED works

### Step 3: Create Interactive Display
When OLED is working:

1. **Upload `interactive_oled_display.py`** to your ESP32
2. **Change the pins** at the top:
   ```python
   SDA_PIN = 21  # Your working SDA pin
   SCL_PIN = 22  # Your working SCL pin
   ```
3. **Run it** and send text from Serial Monitor

## 🔧 How to Modify Your Code

### Change Pins
```python
# At the top of any file, change these:
SDA_PIN = 21  # Your working SDA pin
SCL_PIN = 22  # Your working SCL pin
```

### Change Text
```python
# In simple_oled_demo.py, change these messages:
messages = [
    "Hello World!",
    "ESP32 OLED",
    "MicroPython",
    "Working Great!",
    "Pin Test Success"
]
```

### Add Your Own Text
```python
# Add this to display your own text:
oled.fill(0)
oled.text("Your message here", 0, 0)
oled.show()
```

## 📡 Serial Monitor Commands

When using `interactive_oled_display.py`:

- **Type any text** → Shows on OLED
- **Type `clear`** → Clears OLED
- **Type `quit`** → Exits program

## 🔌 Hardware Connections

### Standard OLED Connection:
```
OLED Display -> ESP32
VCC -> 3.3V
GND -> GND
SDA -> GPIO 21 (or your working pin)
SCL -> GPIO 22 (or your working pin)
```

## 🚀 Quick Start Commands

1. **Test pins**: Run `quick_oled_test.py`
2. **Simple demo**: Run `simple_oled_demo.py`
3. **Interactive**: Run `interactive_oled_display.py`

## 💡 Troubleshooting

### If OLED doesn't work:
1. **Check connections** (VCC, GND, SDA, SCL)
2. **Try different pins** (21,22 or 4,5 or 18,19)
3. **Make sure OLED is powered** (3.3V)
4. **Upload ssd1306.py library**

### If pins don't work:
1. **Run `pin_finder.py`** for comprehensive testing
2. **Check your ESP32 board** for available pins
3. **Try hardware I2C** instead of SoftI2C

## 🎉 Success Indicators

You'll know it's working when you see:
- ✅ "OLED working with pins X,Y"
- 📺 Text appears on OLED display
- 💻 Serial Monitor shows "Displayed: [your text]"

## 📝 Next Steps

Once OLED is working:
1. **Modify the text** in your code
2. **Add more features** (scrolling, graphics, etc.)
3. **Connect sensors** and display their data
4. **Create a menu system**

Good luck! 🚀
