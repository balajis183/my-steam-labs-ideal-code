# 🚀 TEST YOUR CHATBOT NOW!

## ✅ INTEGRATION COMPLETE with Debugging

I've added **extensive debugging** to help you see exactly what's happening.

---

## 🧪 TEST METHOD 1: Standalone Test Page

### Step 1: Open Test Page
1. Navigate to: `my-steam-labs-ideal-code/`
2. Double-click `test_chatbot_api.html`
3. It will open in your browser

### Step 2: Run Tests
1. Click "Check API Config" button
   - ✅ All items should be GREEN
   - ❌ If RED, the config is not set correctly

2. Type a question in the input field (or use the default)
   - Example: "How to read temperature from ADC?"

3. Click "Send Test Request"
   - ⏳ Wait 2-5 seconds
   - ✅ You should see generated MicroPython code
   - ❌ If error, check console (F12)

---

## 🧪 TEST METHOD 2: In Your Main App

### Step 1: Start the App
```bash
cd my-steam-labs-ideal-code
npm start
```

### Step 2: Open Browser Console FIRST
1. Press **F12** (or Ctrl+Shift+I)
2. Click the "Console" tab
3. **KEEP IT OPEN** - you'll see all the debug messages

### Step 3: Click Chatbot Tab
1. Look for "💬 Chatbot" tab in the right panel
2. Click it to switch from "Code Editor"

**What to look for in console:**
```
📝 Loading chatbot.config.js...
✅ Chatbot config loaded: {apiKey: "SET", apiUrl: "...", model: "..."}
📝 Chatbot script loaded, waiting for DOM...
📝 DOM loaded, initializing chatbot...
🔥 Initializing chatbot...
✅ Chatbot initialized successfully!
🔍 Verifying chatbot setup...
✅ CHATBOT_CONFIG exists
✅ API_KEY set
✅ API_URL set
✅ sendChatbotMessage defined
... (more checks)
🎉 All checks passed! Chatbot is ready to use.
```

### Step 4: Type a Question
1. Type in the input field: "How to read temperature from ADC?"
2. Press **Enter** or click the ➤ button

**What to look for in console:**
```
📤 sendChatbotMessage called
Input field: <input...>
Send button: <button...>
Question: How to read temperature from ADC?
✅ All checks passed, sending to API...
🔧 Generating system prompt...
📡 Sending API request to: https://api.sambanova.ai/v1/chat/completions
📦 Payload: {model: "...", messages: [...], ...}
📥 Response status: 200
✅ API Response: {...}
📝 Generated code: ...
```

---

## ❌ If It Doesn't Work

### Check #1: Console Errors
Press F12 and look for **RED error messages**. Common ones:

**Error:** `CHATBOT_CONFIG is not defined`
- **Fix:** chatbot.config.js didn't load
- Check if the file exists: `config/chatbot.config.js`

**Error:** `sendChatbotMessage is not a function`
- **Fix:** chatbot.js didn't load
- Check if the file exists: `ui/scripts/chatbot.js`

**Error:** `Failed to fetch` or `CORS error`
- **Fix:** You're opening HTML directly in browser (not Electron)
- Run `npm start` instead

**Error:** `401 Unauthorized`
- **Fix:** API key is wrong
- Check `config/chatbot.config.js` line 5

### Check #2: Verify Setup
Open console (F12) and type:
```javascript
verifyChatbotSetup()
```

This will run all checks and show you what's wrong.

### Check #3: Manual Test
Open console (F12) and try each step:

```javascript
// 1. Check config exists
console.log(CHATBOT_CONFIG)
// Should show: {API_KEY: "...", API_URL: "...", ...}

// 2. Check function exists
console.log(typeof sendChatbotMessage)
// Should show: "function"

// 3. Check elements exist
console.log(document.getElementById('chatbot-input'))
// Should show: <input...>

// 4. Try to send a message manually
// (Type something in the input field first, then run:)
sendChatbotMessage()
```

---

## 📊 What Each File Does

### `config/chatbot.config.js` (Configuration)
- Stores API key, URL, model name
- Defines hardware-specific rules
- **Now logs:** "Loading chatbot.config.js..." when it runs
- **Now exports:** `window.CHATBOT_CONFIG` and `window.buildSystemPrompt`

### `ui/scripts/chatbot.js` (Main Logic)
- Handles user input
- Calls SambaNova API
- Displays generated code
- **Now includes:** `verifyChatbotSetup()` function
- **Now logs:** Every step of the process

### `ui/scripts/blockly_page.js` (Integration)
- Provides `sendCodeToMonaco()` function
- Handles tab switching
- **Now exports:** `window.sendCodeToMonaco` (line 486)

### `ui/pages/index.html` (UI)
- Contains the chatbot interface
- Loads all scripts in correct order

### `ui/styles/chatbot.css` (Styling)
- Makes chatbot look beautiful
- Dark code blocks, purple theme

---

## 🐛 Common Integration Issues FIXED

### ✅ FIXED: `sendCodeToMonaco is not defined`
- **Was:** Not exported to global scope
- **Now:** `window.sendCodeToMonaco = sendCodeToMonaco` (line 486 of blockly_page.js)

### ✅ FIXED: Config not accessible
- **Was:** Only defined in one file
- **Now:** `window.CHATBOT_CONFIG` and `window.buildSystemPrompt` are global

### ✅ ADDED: Extensive debugging
- Console logs at every step
- `verifyChatbotSetup()` function
- Better error messages with hints

### ✅ ADDED: Error handling
- API key validation
- Element existence checks
- Clear error messages for users

---

## 🎯 Expected Output

### When You Type: "How to read temperature from ADC?"

**Chatbot should generate:**
```python
from machine import ADC, Pin
import time

adc = ADC(Pin(32))
adc.atten(ADC.ATTN_11DB)
adc.width(ADC.WIDTH_12BIT)

while True:
    value = adc.read()
    voltage = (value / 4095) * 3.3
    print("ADC Value:", value, "Voltage:", voltage)
    time.sleep(1)
```

**With buttons:**
- 📋 Copy (copies code to clipboard)
- ✅ Insert (adds code to Monaco editor)

---

## 🔥 Quick Start Commands

```bash
# 1. Start the app
cd my-steam-labs-ideal-code
npm start

# 2. Press F12 to open console
# 3. Click "💬 Chatbot" tab
# 4. Type: "How to read temperature from ADC?"
# 5. Press Enter
# 6. Watch console for debug messages
```

---

## 📞 Still Not Working?

### Run this in console (F12):
```javascript
// Complete diagnostic
verifyChatbotSetup()

// Check API directly
fetch('https://api.sambanova.ai/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer 9d06bc2c-7d40-42d4-9fac-8a1d3d3f9a54',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'Llama-3.3-Swallow-70B-Instruct-v0.4',
    messages: [{role: 'user', content: 'test'}],
    max_tokens: 50
  })
}).then(r => r.json()).then(console.log)
```

### Send me:
1. Screenshot of console (F12)
2. Output of `verifyChatbotSetup()`
3. Any RED error messages
4. What happens when you click send?

---

## ✅ Integration Status

- [x] UI created (chatbot tab, input, buttons)
- [x] CSS styling (purple theme, dark code blocks)
- [x] API integration (SambaNova AI)
- [x] Config file (API key, model, rules)
- [x] Code generation logic
- [x] Copy button functionality
- [x] Insert button functionality (sendCodeToMonaco exported)
- [x] Tab switching (switchToTab exported)
- [x] Debugging (verifyChatbotSetup, extensive logs)
- [x] Error handling (validation, alerts, hints)
- [x] Test page (test_chatbot_api.html)
- [x] Documentation (this file + CHATBOT_TROUBLESHOOTING.md)

**STATUS:** ✅ COMPLETE AND READY TO TEST!

---

## 🎉 YOU'RE DONE!

The chatbot is **fully integrated**. Just run `npm start`, press F12, and test it!

If you see any errors in console, that's GOOD - it means the debugging is working and will tell you exactly what to fix!

