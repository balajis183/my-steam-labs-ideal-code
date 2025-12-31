#!/usr/bin/env python3
"""
ESP32 MicroPython ChatBot Backend
Runs as a subprocess and communicates via stdin/stdout with Electron app
"""

import requests
import json
import sys
import time

# ==============================
# CONFIGURATION
# ==============================

API_KEY = "9d06bc2c-7d40-42d4-9fac-8a1d3d3f9a54"
API_URL = "https://api.sambanova.ai/v1/chat/completions"
MODEL_NAME = "Llama-3.3-Swallow-70B-Instruct-v0.4"

# ==============================
# BASE SYSTEM PROMPT
# ==============================

BASE_SYSTEM_PROMPT = """
You generate ONLY executable MicroPython code for ESP32.
No explanations. No markdown. No extra text.
Use only valid MicroPython libraries.
Code must run directly on ESP32.
"""

# ==============================
# DYNAMIC RULE BUILDER
# ==============================

def build_system_prompt(question: str) -> str:
    q = question.lower()
    rules = ""

    # ---------- ADC / Temperature ----------
    if "temperature" in q or "temp" in q or "analog" in q:
        rules += """
Use ADC on GPIO32.
Always configure:
ADC.ATTN_11DB
ADC.WIDTH_12BIT
Read values in a loop.
"""

    # ---------- Ultrasonic ----------
    if "ultrasonic" in q or "distance" in q or "hc-sr04" in q:
        rules += """
Ultrasonic sensor rules (MANDATORY):
- TRIG = GPIO33, ECHO = GPIO32
- Import exactly:
  from machine import Pin, time_pulse_us
  import time
- Use function get_distance()
- Pull TRIG LOW before pulse
- Send 10us HIGH pulse
- Use time_pulse_us(echo, 1, 30000)
- If duration < 0: return None
- Distance formula:
  (duration * 0.034) / 2
- Do NOT place ultrasonic logic directly in while True
"""

    # ---------- Motors ----------
    if "motor" in q:
        rules += """
Motor rules:
- Use Pin.OUT
- Never short both pins HIGH
- Use safe delays
"""

    # ---------- Servo ----------
    if "servo" in q:
        rules += """
Servo rules:
- Use PWM at 50Hz
- Pulse width: 1000-2000 microseconds
- 1000 = 0°, 1500 = 90°, 2000 = 180°
"""

    # ---------- NeoPixel/WS2812B ----------
    if "neopixel" in q or "ws2812" in q or "rgb" in q:
        rules += """
NeoPixel rules:
- Use machine.Pin and neopixel.NeoPixel
- Default pin: GPIO5
- Format: (R, G, B) values 0-255
- Call write() to update
"""

    # ---------- OLED Display ----------
    if "oled" in q or "ssd1306" in q or "display" in q:
        rules += """
OLED Display rules:
- I2C on GPIO21 (SDA), GPIO22 (SCL)
- Address: 0x3C
- Use ssd1306.SSD1306_I2C(128, 64, i2c)
- fill(0) to clear, show() to update
"""

    # ---------- WiFi ----------
    if "wifi" in q or "internet" in q:
        rules += """
WiFi rules:
- Use network.WLAN(network.STA_IF)
- connect(ssid, password)
- Check with is_connected()
"""

    # ---------- Bluetooth ----------
    if "bluetooth" in q or "ble" in q:
        rules += """
Bluetooth rules:
- Use ubluetooth module
- Configure advertiser name
- Handle characteristic notifications
"""

    return BASE_SYSTEM_PROMPT + "\n" + rules


# ==============================
# CHATBOT FUNCTION
# ==============================

def generate_code(user_question):
    """Generate MicroPython code from natural language question"""
    system_prompt = build_system_prompt(user_question)

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {API_KEY}"
    }

    payload = {
        "model": MODEL_NAME,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_question}
        ],
        "max_tokens": 600,
        "temperature": 0.2
    }

    try:
        response = requests.post(API_URL, headers=headers, json=payload, timeout=30)
        response.raise_for_status()
        code = response.json()["choices"][0]["message"]["content"].strip()
        return {"success": True, "code": code}
    except requests.exceptions.Timeout:
        return {"success": False, "error": "API timeout - request took too long"}
    except requests.exceptions.HTTPError as e:
        if response.status_code == 401:
            return {"success": False, "error": "Invalid API key"}
        elif response.status_code == 429:
            return {"success": False, "error": "Rate limited - please wait"}
        return {"success": False, "error": f"HTTP {response.status_code}"}
    except Exception as e:
        return {"success": False, "error": str(e)}


# ==============================
# MAIN LOOP - STDIN/STDOUT IPC
# ==============================

def main():
    """Main process loop - reads JSON commands from stdin, writes results to stdout"""
    import sys
    print(json.dumps({"status": "ready", "version": "1.0"}), flush=True)
    sys.stdout.flush()

    while True:
        try:
            # Read JSON command from Electron app
            line = sys.stdin.readline()
            if not line:
                break

            command = json.loads(line.strip())
            response_id = command.get("id", "")
            
            if command.get("action") == "generate_code":
                question = command.get("question", "")
                result = generate_code(question)
                
                # Add ID to response
                if response_id:
                    result["id"] = response_id
                
                print(json.dumps(result), flush=True)
                sys.stdout.flush()
            
            elif command.get("action") == "ping":
                response = {"status": "pong"}
                if response_id:
                    response["id"] = response_id
                print(json.dumps(response), flush=True)
                sys.stdout.flush()
            
            elif command.get("action") == "exit":
                break
        
        except json.JSONDecodeError as e:
            print(json.dumps({"success": False, "error": f"Invalid JSON: {str(e)}"}), flush=True)
            sys.stdout.flush()
        except Exception as e:
            print(json.dumps({"success": False, "error": str(e)}), flush=True)
            sys.stdout.flush()


if __name__ == "__main__":
    main()
