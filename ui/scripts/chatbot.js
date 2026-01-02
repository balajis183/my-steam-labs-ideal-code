// CHATBOT_CONFIG and buildSystemPrompt are loaded from ../../config/chatbot.config.js
// They will be available as window.CHATBOT_CONFIG and window.buildSystemPrompt

// Chat history
let chatHistory = [];

// Add message to chat UI
function addMessageToChat(role, content) {
  const chatMessages = document.getElementById('chatbot-messages');
  if (!chatMessages) return;

  const messageDiv = document.createElement('div');
  messageDiv.className = `chat-message ${role}-message`;

  if (role === 'user') {
    messageDiv.innerHTML = `
      <div class="message-icon">👤</div>
      <div class="message-content">${escapeHtml(content)}</div>
    `;
  } else if (role === 'assistant') {
    // Check if content is code
    const isCode = content.includes('import ') || content.includes('from ') || content.includes('def ') || content.includes('Pin(');
    
    if (isCode) {
      messageDiv.innerHTML = `
        <div class="message-icon">🤖</div>
        <div class="message-content">
          <div class="code-header">
            <span>Generated Code</span>
            <div class="code-actions">
              <button class="code-action-btn copy-btn" onclick="copyGeneratedCode(this)">
                📋 Copy
              </button>
              <button class="code-action-btn insert-btn" onclick="insertGeneratedCode(this)">
                ✅ Insert
              </button>
            </div>
          </div>
          <pre class="generated-code">${escapeHtml(content)}</pre>
        </div>
      `;
    } else {
      messageDiv.innerHTML = `
        <div class="message-icon">🤖</div>
        <div class="message-content">${escapeHtml(content)}</div>
      `;
    }
  } else if (role === 'system') {
    messageDiv.innerHTML = `
      <div class="message-content system-message">${escapeHtml(content)}</div>
    `;
  }

  chatMessages.appendChild(messageDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  // Store in history
  chatHistory.push({ role, content });
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Copy generated code
window.copyGeneratedCode = function(button) {
  const codeBlock = button.closest('.message-content').querySelector('.generated-code');
  const code = codeBlock.textContent;

  // Try modern clipboard API first
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(code).then(() => {
      const originalText = button.textContent;
      button.textContent = '✓ Copied!';
      button.style.background = '#73C991';
      setTimeout(() => {
        button.textContent = originalText;
        button.style.background = '';
      }, 2000);
    }).catch(err => {
      console.error('Failed to copy code:', err);
      fallbackCopy(code, button);
    });
  } else {
    // Fallback for older browsers or Electron
    fallbackCopy(code, button);
  }
};

// Fallback copy method
function fallbackCopy(text, button) {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.left = '-999999px';
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  
  try {
    document.execCommand('copy');
    const originalText = button.textContent;
    button.textContent = '✓ Copied!';
    button.style.background = '#73C991';
    setTimeout(() => {
      button.textContent = originalText;
      button.style.background = '';
    }, 2000);
  } catch (err) {
    console.error('Fallback copy failed:', err);
    alert('Failed to copy code. Please select and copy manually.');
  }
  
  document.body.removeChild(textArea);
}

// Insert generated code into editor
window.insertGeneratedCode = function(button) {
  const codeBlock = button.closest('.message-content').querySelector('.generated-code');
  const code = codeBlock.textContent;

  // Send code to Monaco editor
  if (typeof sendCodeToMonaco === 'function') {
    sendCodeToMonaco(code, 'python');
    
    // Switch to Code Editor tab
    if (typeof switchToTab === 'function') {
      switchToTab('editor');
    }
    
    // Visual feedback
    const originalText = button.textContent;
    button.textContent = '✓ Inserted!';
    button.style.background = '#73C991';
    setTimeout(() => {
      button.textContent = originalText;
      button.style.background = '';
    }, 2000);
  } else {
    alert('Editor not available. Please try again.');
  }
};

// Send question to chatbot
async function sendChatbotMessage() {
  console.log('📤 sendChatbotMessage called');
  
  const inputField = document.getElementById('chatbot-input');
  const sendButton = document.getElementById('chatbot-send-btn');
  
  console.log('Input field:', inputField);
  console.log('Send button:', sendButton);
  
  if (!inputField || !sendButton) {
    console.error('❌ Input field or send button not found!');
    alert('Error: Chatbot UI elements not found. Please reload the page.');
    return;
  }

  const question = inputField.value.trim();
  console.log('Question:', question);
  
  if (!question) {
    console.log('⚠️ Empty question, not sending');
    inputField.focus();
    return;
  }

  console.log('✅ All checks passed, sending to API...');

  // Disable input while processing
  inputField.disabled = true;
  sendButton.disabled = true;
  sendButton.textContent = '⏳';

  // Add user message to chat
  addMessageToChat('user', question);

  // Clear input
  inputField.value = '';

  try {
    console.log('🔧 Generating system prompt...');
    // Generate system prompt with rules (from global scope)
    const systemPrompt = window.buildSystemPrompt ? window.buildSystemPrompt(question) : CHATBOT_CONFIG.BASE_SYSTEM_PROMPT;

    // Prepare API request
    const payload = {
      model: CHATBOT_CONFIG.MODEL_NAME,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: question }
      ],
      temperature: CHATBOT_CONFIG.TEMPERATURE,
      max_tokens: CHATBOT_CONFIG.MAX_TOKENS
    };

    console.log('📡 Sending API request to:', CHATBOT_CONFIG.API_URL);
    console.log('Payload:', payload);

    // Make API request
    const response = await fetch(CHATBOT_CONFIG.API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CHATBOT_CONFIG.API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    console.log('📥 Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error Response:', errorText);
      
      if (response.status === 401) {
        throw new Error('Unauthorized - check API key');
      }
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ API Response:', data);
    
    let code = data.choices[0].message.content;

    // Clean output (remove markdown if present)
    code = code.replace(/```python\n?/g, '').replace(/```\n?/g, '').trim();

    console.log('📝 Generated code:', code);

    // Add assistant message
    addMessageToChat('assistant', code);

  } catch (error) {
    console.error('❌ Chatbot error:', error);
    console.error('Error stack:', error.stack);
    addMessageToChat('system', `❌ Error: ${error.message}\n\nPlease check:\n• Internet connection\n• API key is valid (currently: ${CHATBOT_CONFIG.API_KEY ? 'SET' : 'NOT SET'})\n• Browser console (F12) for details\n• Try the test page: test_chatbot_api.html`);
  } finally {
    // Re-enable input
    inputField.disabled = false;
    sendButton.disabled = false;
    sendButton.textContent = '➤';
    inputField.focus();
  }
}

// Handle Enter key
function handleChatbotEnter(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    sendChatbotMessage();
  }
}

// Initialize chatbot with welcome message
function initializeChatbot() {
  console.log('🔥 Initializing chatbot...');
  
  const chatMessages = document.getElementById('chatbot-messages');
  if (!chatMessages) {
    console.error('❌ Chatbot messages container not found!');
    return;
  }
  
  const welcomeMessage = `🔥 ESP32 MicroPython CodeBot Ready

👉 Ask a hardware question

Examples:
• "How to read temperature from ADC?"
• "Control a motor with PWM"
• "Read ultrasonic sensor distance"`;

  addMessageToChat('system', welcomeMessage);
  console.log('✅ Chatbot initialized successfully!');
}

// Clear chat history
function clearChatHistory() {
  const chatMessages = document.getElementById('chatbot-messages');
  if (chatMessages) {
    chatMessages.innerHTML = '';
    chatHistory = [];
    initializeChatbot();
  }
}

// Verification function to check if chatbot is ready
function verifyChatbotSetup() {
  console.log('🔍 Verifying chatbot setup...');
  
  const checks = {
    'CHATBOT_CONFIG exists': typeof CHATBOT_CONFIG !== 'undefined',
    'API_KEY set': typeof CHATBOT_CONFIG !== 'undefined' && CHATBOT_CONFIG.API_KEY && CHATBOT_CONFIG.API_KEY.length > 0,
    'API_URL set': typeof CHATBOT_CONFIG !== 'undefined' && CHATBOT_CONFIG.API_URL && CHATBOT_CONFIG.API_URL.length > 0,
    'sendChatbotMessage defined': typeof sendChatbotMessage === 'function',
    'handleChatbotEnter defined': typeof handleChatbotEnter === 'function',
    'clearChatHistory defined': typeof clearChatHistory === 'function',
    'initializeChatbot defined': typeof initializeChatbot === 'function',
    'sendCodeToMonaco available': typeof sendCodeToMonaco === 'function',
    'switchToTab available': typeof switchToTab === 'function',
    'Input field exists': document.getElementById('chatbot-input') !== null,
    'Send button exists': document.getElementById('chatbot-send-btn') !== null,
    'Messages area exists': document.getElementById('chatbot-messages') !== null
  };
  
  let allPassed = true;
  Object.entries(checks).forEach(([check, passed]) => {
    const icon = passed ? '✅' : '❌';
    console.log(`${icon} ${check}`);
    if (!passed) allPassed = false;
  });
  
  if (allPassed) {
    console.log('🎉 All checks passed! Chatbot is ready to use.');
  } else {
    console.error('❌ Some checks failed. Chatbot may not work correctly.');
  }
  
  return checks;
}

// Export functions for global use
window.sendChatbotMessage = sendChatbotMessage;
window.handleChatbotEnter = handleChatbotEnter;
window.clearChatHistory = clearChatHistory;
window.initializeChatbot = initializeChatbot;
window.verifyChatbotSetup = verifyChatbotSetup;

// Initialize when DOM is ready
console.log('📝 Chatbot script loaded, waiting for DOM...');
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('📝 DOM loaded, initializing chatbot...');
    setTimeout(() => {
      initializeChatbot();
      verifyChatbotSetup();
    }, 100);
  });
} else {
  console.log('📝 DOM already loaded, initializing chatbot...');
  setTimeout(() => {
    initializeChatbot();
    verifyChatbotSetup();
  }, 100);
}

