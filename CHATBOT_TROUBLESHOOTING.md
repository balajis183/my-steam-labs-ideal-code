# 🔧 Chatbot Troubleshooting Guide

## ✅ FIXED ISSUE: `sendCodeToMonaco` not exported

**Problem:** The "Insert" button in chatbot wasn't working because `sendCodeToMonaco` function wasn't accessible globally.

**Solution:** Added `window.sendCodeToMonaco = sendCodeToMonaco;` in `blockly_page.js` line 486.

---

## 🧪 How to Test the Chatbot

### Method 1: Use the Test Page
1. Open `test_chatbot_api.html` in your browser
2. Click "Check API Config" - should show ✅ for all items
3. Click "Send Test Request" - should generate MicroPython code
4. Check browser console (F12) for detailed logs

### Method 2: Test in Main App
1. Run `npm start`
2. Click the "💬 Chatbot" tab
3. Type: "How to read temperature from ADC?"
4. Press Enter or click ➤
5. You should see generated code with Copy and Insert buttons

---

## 🐛 Common Issues & Solutions

### Issue 1: "Cannot send message" or button doesn't respond

**Symptoms:**
- Clicking send button does nothing
- Enter key doesn't work
- No console logs appear

**Solutions:**
1. **Check Browser Console (F12)**
   - Look for JavaScript errors
   - Check if chatbot.js loaded successfully

2. **Verify Script Loading Order**
   - Open `index.html`
   - Ensure scripts are loaded in this order:
     ```html
     <script src="../../config/chatbot.config.js"></script>
     <script src="../scripts/chatbot.js"></script>
     ```

3. **Check if Functions are Defined**
   - Open browser console (F12)
   - Type: `typeof sendChatbotMessage`
   - Should return: `"function"`
   - If returns `"undefined"`, chatbot.js didn't load

---

### Issue 2: API returns 401 Unauthorized

**Symptoms:**
- Error message: "Unauthorized - check API key"
- Status code 401 in console

**Solutions:**
1. **Verify API Key**
   - Open `config/chatbot.config.js`
   - Check `API_KEY: "9d06bc2c-7d40-42d4-9fac-8a1d3d3f9a54"`
   - Make sure it's not empty or modified

2. **Test API Key Manually**
   - Open `test_chatbot_api.html`
   - Click "Check API Config"
   - Should show ✅ for API Key

---

### Issue 3: CORS Error

**Symptoms:**
- Error in console: "Access to fetch... has been blocked by CORS policy"
- Network tab shows (failed) or (blocked)

**Solutions:**
1. **Run in Electron (Recommended)**
   - CORS doesn't apply in Electron apps
   - Run: `npm start`
   - Don't open `index.html` directly in browser

2. **If Testing in Browser**
   - Some browsers block cross-origin requests
   - Use Electron instead: `npm start`

---

### Issue 4: "Insert" button doesn't work

**Symptoms:**
- Code generates successfully
- Copy button works
- Insert button does nothing

**Solutions:**
1. **✅ ALREADY FIXED** - `sendCodeToMonaco` is now exported globally

2. **Verify Fix Applied**
   - Open browser console
   - Type: `typeof sendCodeToMonaco`
   - Should return: `"function"`

3. **Check Monaco Editor is Loaded**
   - Switch to "Code Editor" tab first
   - Wait 1-2 seconds for Monaco to load
   - Then switch back to Chatbot and try Insert

---

### Issue 5: No response from API / Timeout

**Symptoms:**
- Loading spinner appears but never stops
- No code generated after 30+ seconds
- Console shows timeout error

**Solutions:**
1. **Check Internet Connection**
   - Make sure you're connected to internet
   - Try opening https://api.sambanova.ai in browser

2. **Check API Endpoint**
   - Open `config/chatbot.config.js`
   - Verify: `API_URL: "https://api.sambanova.ai/v1/chat/completions"`

3. **Increase Timeout (if needed)**
   - In `chatbot.js`, find the fetch call
   - Add timeout option if needed

---

### Issue 6: Code not displaying properly

**Symptoms:**
- Code appears but formatting is broken
- No scrollbars for long code
- Copy/Insert buttons missing

**Solutions:**
1. **Check CSS Loaded**
   - Open browser DevTools (F12)
   - Go to "Network" tab
   - Reload page
   - Check if `chatbot.css` loaded successfully

2. **Verify CSS File Path**
   - In `index.html`, check:
     ```html
     <link rel="stylesheet" href="../styles/chatbot.css" />
     ```

---

## 🔍 Debugging Checklist

Before asking for help, check these:

- [ ] Browser console (F12) shows no errors
- [ ] `test_chatbot_api.html` works correctly
- [ ] API key is correct in `chatbot.config.js`
- [ ] Internet connection is working
- [ ] Running in Electron (`npm start`), not opening HTML directly
- [ ] All scripts loaded (check Network tab in DevTools)
- [ ] `typeof sendChatbotMessage` returns `"function"` in console
- [ ] `typeof sendCodeToMonaco` returns `"function"` in console
- [ ] Monaco editor loads when switching to "Code Editor" tab

---

## 📝 Console Commands for Debugging

Open browser console (F12) and try these:

```javascript
// Check if chatbot functions exist
typeof sendChatbotMessage  // Should be "function"
typeof handleChatbotEnter  // Should be "function"
typeof clearChatHistory    // Should be "function"
typeof sendCodeToMonaco    // Should be "function"
typeof switchToTab         // Should be "function"

// Check if config is loaded
typeof CHATBOT_CONFIG      // Should be "object"
CHATBOT_CONFIG.API_KEY     // Should show your API key

// Manually test chatbot
sendChatbotMessage()       // Should send whatever is in input field

// Check if elements exist
document.getElementById('chatbot-input')      // Should show input element
document.getElementById('chatbot-send-btn')   // Should show button element
document.getElementById('chatbot-messages')   // Should show messages div
```

---

## 🎯 Expected Behavior

### When Working Correctly:

1. **On Page Load:**
   - Chatbot tab appears next to "Code Editor"
   - Welcome message displays automatically
   - Input field is ready for typing

2. **When Sending Message:**
   - User message appears immediately
   - Loading indicator (⏳) shows on send button
   - Within 2-5 seconds, bot response appears
   - Generated code shows in dark code block
   - Copy and Insert buttons appear above code

3. **When Clicking Copy:**
   - Button text changes to "✓ Copied!"
   - Code is in clipboard
   - Button returns to "📋 Copy" after 2 seconds

4. **When Clicking Insert:**
   - Button text changes to "✓ Inserted!"
   - Automatically switches to "Code Editor" tab
   - Code appears in Monaco editor
   - Button returns to "✅ Insert" after 2 seconds

---

## 🚀 Quick Fix Commands

If chatbot stops working, try these in order:

1. **Reload the page:** `Ctrl+R` or `F5`
2. **Hard reload:** `Ctrl+Shift+R` or `Ctrl+F5`
3. **Restart Electron:** Close app, run `npm start` again
4. **Clear cache:** Delete `node_modules/.cache` folder
5. **Reinstall:** `npm install` then `npm start`

---

## 📞 Still Not Working?

If you've tried everything above and it still doesn't work:

1. **Run the test page:**
   - Open `test_chatbot_api.html`
   - Take a screenshot of the results
   - Note any error messages

2. **Check browser console:**
   - Press F12
   - Go to "Console" tab
   - Take a screenshot of any red errors

3. **Check Network tab:**
   - Press F12
   - Go to "Network" tab
   - Try sending a message
   - Look for the API request
   - Check if it's successful (200) or failed (4xx/5xx)

4. **Provide this information:**
   - What exactly happens when you click send?
   - Any error messages in console?
   - Does `test_chatbot_api.html` work?
   - Are you running in Electron or browser?

---

## ✅ Success Indicators

You'll know the chatbot is working when:

- ✅ Welcome message appears on load
- ✅ Typing in input field works
- ✅ Pressing Enter sends message
- ✅ User message appears immediately
- ✅ Bot response appears within 5 seconds
- ✅ Generated code has syntax highlighting
- ✅ Copy button copies code to clipboard
- ✅ Insert button adds code to editor
- ✅ No errors in browser console

---

## 🎉 Integration Complete!

Your chatbot is fully integrated and ready to use. The architecture is:

```
User Input → chatbot.js → SambaNova API → Generated Code → Display
                                                              ↓
                                                    [Copy] [Insert] buttons
```

**No Python subprocess needed!** Everything runs in JavaScript for simplicity and speed.

