// ==============================
// CHATBOT CONFIGURATION
// ==============================
// This file stores API configuration for the chatbot
// DO NOT commit API keys to git - add to .gitignore

const CHATBOT_CONFIG = {
  // ==============================
  // API SETTINGS (Browser doesn't need API key - Python backend handles it)
  // ==============================
  API_KEY: "",  // Not used in browser - Python backend has it in .env
  API_URL: "https://api.sambanova.ai/v1/chat/completions",
  MODEL_NAME: "Llama-3.3-Swallow-70B-Instruct-v0.4",
  API_TIMEOUT: 30000, // 30 seconds
  
  // ==============================
  // BASE SYSTEM PROMPT
  // ==============================
  BASE_SYSTEM_PROMPT: `You generate ONLY executable MicroPython code for ESP32.
No explanations.
No markdown.
No triple backticks.
Use only valid MicroPython libraries.
Code must run directly on ESP32.`,

  // ==============================
  // HARDWARE-SPECIFIC RULES
  // ==============================
  HARDWARE_RULES: {
    temperature: `Use ADC on GPIO32.
Configure:
ADC.ATTN_11DB
ADC.WIDTH_12BIT
Read continuously in a loop.`,

    ultrasonic: `Ultrasonic sensor rules:
TRIG = GPIO33
ECHO = GPIO32
Import:
from machine import Pin, time_pulse_us
import time
Use get_distance() function.
Send 10us trigger pulse.
Use time_pulse_us(echo, 1, 30000).
Distance = (duration * 0.034) / 2`,

    motor: `Motor rules:
Use Pin.OUT
Use PWM for speed
Never set both direction pins HIGH`,

    servo: `Servo motor rules:
Use PWM on appropriate GPIO
Frequency: 50Hz
Duty cycle: 3-12% for 0-180 degrees`,

    neopixel: `NeoPixel/WS2812B rules:
Use Pin for data line
Import neopixel library
Configure number of LEDs
Use appropriate GPIO pin`,

    oled: `OLED Display rules:
Use I2C communication
SDA = GPIO21
SCL = GPIO22
Address: 0x3C
Use ssd1306 library`,

    wifi: `WiFi rules:
Use network module
Configure SSID and password
Handle connection status
Implement timeout for connection attempts`,

    bluetooth: `Bluetooth rules:
Use machine UART
Configure baud rate (9600 typical)
Use appropriate RX/TX pins`,
  },

  // ==============================
  // UI SETTINGS
  // ==============================
  UI: {
    MAX_HISTORY_MESSAGES: 50, // Keep last 50 messages in chat
    MESSAGE_BATCH_SIZE: 10, // Load messages in batches
    AUTO_SCROLL_CHAT: true,
    SHOW_TIMESTAMP: true,
    ENABLE_CODE_COPY: true,
    ENABLE_CODE_INSERT: true,
  },

  // ==============================
  // STYLING
  // ==============================
  COLORS: {
    PRIMARY: "#5A59FF",
    SECONDARY: "#FF5C1B",
    SUCCESS: "#4CAF50",
    WARNING: "#FF8C00",
    ERROR: "#FF6B6B",
    BOT_MESSAGE_BG: "#f0f0f0",
    USER_MESSAGE_BG: "#5A59FF",
    CODE_BLOCK_BG: "#1e1e1e",
  },

  // ==============================
  // TEMPERATURE & SAMPLING
  // ==============================
  LLM_SETTINGS: {
    temperature: 0.2, // Lower = more deterministic code
    max_tokens: 600,
    top_p: 0.9,
  },
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CHATBOT_CONFIG;
}
