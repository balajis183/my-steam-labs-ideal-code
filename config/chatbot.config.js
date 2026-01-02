// Chatbot Configuration for MY STEAM LAB
// SambaNova API Integration

console.log('📝 Loading chatbot.config.js...');

const CHATBOT_CONFIG = {
  API_KEY: "9d06bc2c-7d40-42d4-9fac-8a1d3d3f9a54",
  API_URL: "https://api.sambanova.ai/v1/chat/completions",
  MODEL_NAME: "Llama-3.3-Swallow-70B-Instruct-v0.4",
  
  // API Settings
  TEMPERATURE: 0.2,
  MAX_TOKENS: 600,
  TIMEOUT: 30000, // 30 seconds
  
  // Base System Prompt
  BASE_SYSTEM_PROMPT: `You generate ONLY executable MicroPython code for ESP32.
No explanations.
No markdown.
No triple backticks.
Use only valid MicroPython libraries.
Code must run directly on ESP32.`,

  // Example questions to show users
  EXAMPLE_QUESTIONS: [
    "How to read temperature from ADC?",
    "Control a motor with PWM",
    "Read ultrasonic sensor distance"
  ]
};

// Rule Builder Function
function buildSystemPrompt(question) {
  const q = question.toLowerCase();
  let rules = CHATBOT_CONFIG.BASE_SYSTEM_PROMPT;

  if (q.includes("temperature") || q.includes("temp") || q.includes("analog") || q.includes("adc")) {
    rules += `

Use ADC on GPIO32.
Configure:
ADC.ATTN_11DB
ADC.WIDTH_12BIT
Read continuously in a loop.`;
  }

  if (q.includes("ultrasonic") || q.includes("distance")) {
    rules += `

Ultrasonic sensor rules:
TRIG = GPIO33
ECHO = GPIO32
Import:
from machine import Pin, time_pulse_us
import time
Use get_distance() function.
Send 10us trigger pulse.
Use time_pulse_us(echo, 1, 30000).
Distance = (duration * 0.034) / 2`;
  }

  if (q.includes("motor")) {
    rules += `

Motor rules:
Use Pin.OUT
Use PWM for speed
Never set both direction pins HIGH`;
  }

  if (q.includes("touch") || q.includes("touchpad")) {
    rules += `

Touch sensor rules:
Use TouchPad for capacitive touch
Import from machine import TouchPad, Pin
Example: touch = TouchPad(Pin(12))
Read with touch.read()`;
  }

  if (q.includes("servo")) {
    rules += `

Servo motor rules:
Use PWM for servo control
Frequency: 50 Hz
Duty cycle: 40-115 for 0-180 degrees
Import from machine import Pin, PWM`;
  }

  return rules;
}

// Make available globally for browser use
window.CHATBOT_CONFIG = CHATBOT_CONFIG;
window.buildSystemPrompt = buildSystemPrompt;

// Export for use in other modules (Node.js)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CHATBOT_CONFIG, buildSystemPrompt };
}

console.log('✅ Chatbot config loaded:', {
  apiKey: CHATBOT_CONFIG.API_KEY ? 'SET' : 'NOT SET',
  apiUrl: CHATBOT_CONFIG.API_URL,
  model: CHATBOT_CONFIG.MODEL_NAME
});

