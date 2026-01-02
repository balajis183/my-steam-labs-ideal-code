// ========================================
// CHATBOT UI - MicroPython Code Generator
// ========================================

class ChatbotUI {
  constructor() {
    this.container = null;
    this.messagesDiv = null;
    this.inputField = null;
    this.sendBtn = null;
  }

  init(containerSelector) {
    this.container = document.querySelector(containerSelector);
    if (!this.container) {
      console.error("❌ Chatbot container not found:", containerSelector);
      return false;
    }

    this.setupDOM();
    this.attachEventListeners();
    this.showWelcome();
    
    console.log("✅ Chatbot UI initialized");
    return true;
  }

  setupDOM() {
    this.container.innerHTML = `
      <div class="chatbot-wrapper">
        <div class="chatbot-header">
          <div class="chatbot-header-top">
            <div>
              <h3>💻 My STEAM Chatbot</h3>
              <p class="subtitle">Generate code in seconds</p>
            </div>
            <button id="chatbot-clear-btn" class="chatbot-clear-btn" title="Clear chat history">🗑️ Clear</button>
          </div>
        </div>
        
        <div class="chatbot-messages" id="chatbot-messages"></div>
        
        <div class="chatbot-input-section">
          <input 
            type="text" 
            id="chatbot-input" 
            class="chatbot-input" 
            placeholder="e.g., Write code for LDR sensor at pin io34" 
            autocomplete="off"
          />
          <button id="chatbot-send-btn" class="chatbot-send-btn">📤</button>
        </div>
        
        <div class="chatbot-examples" id="chatbot-examples"></div>
      </div>
    `;
    
    this.messagesDiv = this.container.querySelector('#chatbot-messages');
    this.inputField = this.container.querySelector('#chatbot-input');
    this.sendBtn = this.container.querySelector('#chatbot-send-btn');
    this.clearBtn = this.container.querySelector('#chatbot-clear-btn');
  }

  attachEventListeners() {
    this.sendBtn.addEventListener('click', () => this.handleSendMessage());
    this.inputField.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.handleSendMessage();
    });
    this.clearBtn.addEventListener('click', () => this.clearHistory());
  }

  clearHistory() {
    this.messagesDiv.innerHTML = '';
    this.messagesDiv.scrollTop = 0;
    this.showWelcome();
  }

  showWelcome() {
    this.addBotMessage('🔥 My STEAM Chatbot Ready!', 'Code for all sensors');
    this.showExamples();
  }

  showExamples() {
    const examples = [
      { label: '🌡️ Temperature (GPIO32)', cmd: 'Write micropython code for temperature sensor at pin io32' },
      { label: '💡 LDR Light (GPIO34)', cmd: 'Write micropython code for LDR sensor at pin io34' },
      { label: '👆 Touch (GPIO12)', cmd: 'Write micropython code for touch sensors for pin io12' },
      { label: '⚙️ Motor M1 (GPIO19,18)', cmd: 'Write micropython code for motor M1 control at pins io19 and io18' },
      { label: '📏 Ultrasonic (GPIO33,32)', cmd: 'Write micropython code for ultrasonic sensor trig io33 echo io32' },
      { label: '📺 OLED (GPIO15,13)', cmd: 'Write micropython code for OLED display SCL io15 SDA io13' }
    ];
    
    let html = '<div class="examples-title">💡 Quick Examples:</div>';
    examples.forEach((ex) => {
      html += `<button class="example-btn" data-cmd="${this.escapeHtml(ex.cmd)}">
        ${ex.label}
      </button>`;
    });
    
    const examplesDiv = this.container.querySelector('#chatbot-examples');
    examplesDiv.innerHTML = html;
    
    examplesDiv.querySelectorAll('.example-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const cmd = e.currentTarget.dataset.cmd;
        this.inputField.value = cmd;
        this.inputField.focus();
      });
    });
  }

  async handleSendMessage() {
    const question = this.inputField.value.trim();
    if (!question) return;

    this.inputField.value = '';
    this.sendBtn.disabled = true;

    // Add user message
    this.addUserMessage(question);

    // Show loading message with unique ID
    const loadingId = `loading_${Date.now()}`;
    const loadingEl = this.addLoadingMessage(loadingId);

    try {
      // Call the IPC handler
      const response = await window.electronAPI.chatbotGenerateCode(question);

      // Remove loading message
      const loading = this.messagesDiv.querySelector(`[data-loading-id="${loadingId}"]`);
      if (loading) loading.remove();

      // Check if we have valid response
      if (response && response.success && response.code && response.code.trim()) {
        // Add success message
        this.addBotMessage('✅ Code Generated!', 'Click buttons below to copy or insert');
        // Add the code block
        this.addCodeBlock(response.code);
      } else if (response && !response.success) {
        this.addErrorMessage(`❌ ${response.error || 'Failed to generate code'}`);
      } else {
        this.addErrorMessage('❌ No code generated - try a different request');
      }
    } catch (error) {
      // Remove loading message if error occurs
      const loading = this.messagesDiv.querySelector(`[data-loading-id="${loadingId}"]`);
      if (loading) loading.remove();
      
      this.addErrorMessage(`❌ ${error.message || 'Unknown error occurred'}`);
    } finally {
      this.sendBtn.disabled = false;
      this.inputField.focus();
      // Scroll to bottom
      setTimeout(() => {
        this.messagesDiv.scrollTop = this.messagesDiv.scrollHeight;
      }, 100);
    }
  }

  addLoadingMessage(id) {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'chatbot-message bot-message loading-message';
    msgDiv.setAttribute('data-loading-id', id);
    msgDiv.innerHTML = `<div class="loading-spinner">⏳ Generating code...</div>`;
    this.messagesDiv.appendChild(msgDiv);
    return msgDiv;
  }

  addUserMessage(text) {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'chatbot-message user-message';
    msgDiv.innerHTML = `<span class="message-text">${this.escapeHtml(text)}</span>`;
    this.messagesDiv.appendChild(msgDiv);
  }

  addBotMessage(text, subtitle = '') {
    const id = `msg_${Date.now()}`;
    const msgDiv = document.createElement('div');
    msgDiv.className = 'chatbot-message bot-message';
    msgDiv.dataset.id = id;
    
    let html = `<div class="bot-text">${this.escapeHtml(text)}</div>`;
    if (subtitle && subtitle !== 'loading') {
      html += `<div class="bot-subtitle">${this.escapeHtml(subtitle)}</div>`;
    }
    
    msgDiv.innerHTML = html;
    this.messagesDiv.appendChild(msgDiv);
    return id;
  }

  addCodeBlock(code) {
    const codeDiv = document.createElement('div');
    codeDiv.className = 'chatbot-code-block';
    
    const safeCode = this.escapeHtml(code);
    
    codeDiv.innerHTML = `
      <pre class="code-content"><code>${safeCode}</code></pre>
      <div class="code-actions">
        <button class="code-btn copy-btn">📋 Copy</button>
        <button class="code-btn insert-btn">➕ Insert to Editor</button>
      </div>
    `;
    
    // Add event listeners
    const copyBtn = codeDiv.querySelector('.copy-btn');
    const insertBtn = codeDiv.querySelector('.insert-btn');
    
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(code).then(() => {
        copyBtn.textContent = '✅ Copied!';
        setTimeout(() => {
          copyBtn.textContent = '📋 Copy';
        }, 2000);
      });
    });
    
    insertBtn.addEventListener('click', () => {
      if (window.editor) {
        const selection = window.editor.getSelection();
        window.editor.executeEdits('chatbot', [{
          range: selection || new (window.monaco.Range)(1, 1, 1, 1),
          text: code + '\n'
        }]);
        insertBtn.textContent = '✅ Inserted!';
        setTimeout(() => {
          insertBtn.textContent = '➕ Insert to Editor';
        }, 2000);
      } else {
        alert('📝 Editor not available');
      }
    });
    
    this.messagesDiv.appendChild(codeDiv);
  }

  addErrorMessage(text) {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'chatbot-message error-message';
    msgDiv.innerHTML = `<span class="message-text">${this.escapeHtml(text)}</span>`;
    this.messagesDiv.appendChild(msgDiv);
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Create singleton instance
window.ChatbotUI = ChatbotUI;
