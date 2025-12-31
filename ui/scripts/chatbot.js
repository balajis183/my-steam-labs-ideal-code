// ==============================
// CHATBOT CORE LOGIC
// ==============================
// Handles API calls and code generation
// Uses SambaNova API to generate MicroPython code for ESP32

class ChatbotEngine {
  constructor(config) {
    this.config = config;
    this.conversationHistory = [];
    this.isLoading = false;
    this.requestAbortController = null;
  }

  // ==============================
  // SYSTEM PROMPT BUILDER
  // ==============================
  buildSystemPrompt(question) {
    let rules = this.config.BASE_SYSTEM_PROMPT + "\n\n";
    const q = question.toLowerCase();

    // Add relevant hardware rules based on question keywords
    Object.entries(this.config.HARDWARE_RULES).forEach(([keyword, rule]) => {
      if (q.includes(keyword)) {
        rules += rule + "\n\n";
      }
    });

    return rules;
  }

  // ==============================
  // API CALL - GENERATE CODE
  // ==============================
  async generateCode(userQuestion) {
    if (!userQuestion || userQuestion.trim().length === 0) {
      throw new Error("Question cannot be empty");
    }

    if (!this.config.API_KEY || this.config.API_KEY === "") {
      throw new Error("API Key not configured. Please set SAMBANOVA_API_KEY environment variable.");
    }

    try {
      this.isLoading = true;
      const systemPrompt = this.buildSystemPrompt(userQuestion);

      const payload = {
        model: this.config.MODEL_NAME,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userQuestion }
        ],
        temperature: this.config.LLM_SETTINGS.temperature,
        max_tokens: this.config.LLM_SETTINGS.max_tokens,
        top_p: this.config.LLM_SETTINGS.top_p,
      };

      const response = await fetch(this.config.API_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.config.API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload),
        signal: this.requestAbortController?.signal,
      });

      if (response.status === 401) {
        throw new Error("❌ Unauthorized – check API key");
      }

      if (response.status === 429) {
        throw new Error("⏱️ Rate limited – too many requests. Wait a moment and try again.");
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`API Error (${response.status}): ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      let code = data.choices[0].message.content;

      // Clean output - remove markdown formatting
      code = code.replace(/```python\n?/g, "").replace(/```\n?/g, "").trim();

      return {
        success: true,
        code: code,
        model: this.config.MODEL_NAME,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      if (error.name === 'AbortError') {
        return {
          success: false,
          error: "Request cancelled",
          code: null
        };
      }

      return {
        success: false,
        error: error.message || "Unknown error occurred",
        code: null
      };
    } finally {
      this.isLoading = false;
    }
  }

  // ==============================
  // CONVERSATION MANAGEMENT
  // ==============================
  addToHistory(role, content) {
    this.conversationHistory.push({
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      role: role, // 'user' or 'bot'
      content: content,
      timestamp: new Date().toISOString(),
      codeBlock: false
    });

    // Keep history size manageable
    if (this.conversationHistory.length > this.config.UI.MAX_HISTORY_MESSAGES) {
      this.conversationHistory = this.conversationHistory.slice(-this.config.UI.MAX_HISTORY_MESSAGES);
    }

    return this.conversationHistory[this.conversationHistory.length - 1];
  }

  addCodeBlock(code) {
    this.conversationHistory.push({
      id: `code_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      role: 'bot',
      content: code,
      timestamp: new Date().toISOString(),
      codeBlock: true
    });

    return this.conversationHistory[this.conversationHistory.length - 1];
  }

  getHistory() {
    return this.conversationHistory;
  }

  clearHistory() {
    this.conversationHistory = [];
  }

  // ==============================
  // UTILITY METHODS
  // ==============================
  isLoadingResponse() {
    return this.isLoading;
  }

  cancelRequest() {
    if (this.requestAbortController) {
      this.requestAbortController.abort();
      this.isLoading = false;
    }
  }

  setAbortController(controller) {
    this.requestAbortController = controller;
  }

  // Get last few messages for context
  getContextMessages(limit = 3) {
    return this.conversationHistory.slice(-limit);
  }

  // Validate API key
  validateConfig() {
    const errors = [];
    
    if (!this.config.API_KEY) {
      errors.push("Missing API_KEY in configuration");
    }
    
    if (!this.config.API_URL) {
      errors.push("Missing API_URL in configuration");
    }
    
    if (!this.config.MODEL_NAME) {
      errors.push("Missing MODEL_NAME in configuration");
    }

    return {
      valid: errors.length === 0,
      errors: errors
    };
  }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ChatbotEngine;
}
