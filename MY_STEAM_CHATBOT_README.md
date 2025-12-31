# My STEAM Chatbot - Quick Guide

## Overview
The **My STEAM Chatbot** is an AI-powered code generator integrated into the MY STEAM LABS IDE. It generates executable MicroPython code for ESP32 boards with exact pin mappings.

## Pin Configuration

### Sensors
- **LDR Light Sensor**: GPIO34
- **IR Sensor**: GPIO35
- **Temperature Sensor**: GPIO32
- **Ultrasonic Trig**: GPIO33
- **Ultrasonic Echo**: GPIO32
- **Touch Sensor**: GPIO12

### Display
- **OLED SCL**: GPIO15
- **OLED SDA**: GPIO13

### Motors
- **Motor M1**: GPIO19 (A), GPIO18 (B)
- **Motor M2**: GPIO5 (A), GPIO17 (B)
- **Motor M3**: GPIO23 (A), GPIO22 (B)
- **Motor M4**: GPIO21 (A), GPIO16 (B)

### Joysticks
- **Joystick 1**: V-axis GPIO4, H-axis GPIO2
- **Joystick 2**: V-axis GPIO26, H-axis GPIO25

## How to Use

1. Click on the **"My STEAM Chatbot"** tab
2. Either:
   - Type a question: `"Write micropython code for touch sensors for pin io12"`
   - Click one of the 6 quick example buttons
3. The chatbot generates code instantly
4. Use **Copy** to copy code to clipboard
5. Use **Insert to Editor** to add code directly to the editor

## Supported Commands

- `"Write micropython code for temperature sensor at pin io32"`
- `"Write micropython code for LDR sensor at pin io34"`
- `"Write micropython code for touch sensors for pin io12"`
- `"Write micropython code for motor M1 control at pins io19 and io18"`
- `"Write micropython code for ultrasonic sensor trig io33 echo io32"`
- `"Write micropython code for OLED display SCL io15 SDA io13"`
- `"Write micropython code for joystick at io4 and io2"`
- And more sensor-specific queries...

## Key Features

✅ **Exact Pin Mappings** - Uses real MY STEAM LABS pin configuration  
✅ **Smart Prompt Engineering** - Detects sensor type and adds hardware guidelines  
✅ **Instant Code Generation** - Direct SambaNova API integration  
✅ **Copy & Paste** - One-click code copying  
✅ **Direct Editor Integration** - Insert code directly into Monaco editor  
✅ **Smooth Scrollbars** - Proper scrolling without UI conflicts  
✅ **Quick Examples** - 6 pre-configured sensor examples  

## Technical Details

- **API**: SambaNova Llama-3.3-Swallow-70B-Instruct-v0.4
- **Communication**: Electron IPC → Direct API calls
- **Response Time**: 1-3 seconds per request
- **Timeout**: 60 seconds
- **Language**: MicroPython for ESP32

## Tips

- Be specific with sensor names and pin numbers
- Use the format: "Write micropython code for [sensor] at pin [io#]"
- The chatbot will automatically include proper imports and initialization
- Generated code is ready to run on ESP32 without modifications
