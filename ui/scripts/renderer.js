console.log('⚡ renderer.js loaded');

let currentPort = null;
let currentBoardType = null; // NEW: Track board type
let currentLanguage = 'python'; // Default language
let isSerialMonitorOpen = false; // Track serial monitor state to prevent conflicts
let lastGeneratedLanguage = 'python'; // Track last generated language
let lastCompiledPath = null;
let lastCompiledSuccess = false;
let isRunning = false;
let isUploading = false;
let suppressEsp32Output = false; // When true, ignore incoming serial data (used when editor is empty)
let lastEditorEmptyState = null; // null=unknown, true=empty, false=has code
let lastPortPresenceState = null; // null=unknown, true=present, false=missing

// Terminal output functions
function appendTerminalOutput(message) {
  const terminalOutput = document.getElementById('terminal-output');
  if (terminalOutput) {
    // Apply color coding for professional terminal look
    let styledMessage = message;
    if (message.includes('[SUCCESS]')) {
      styledMessage = message.replace('[SUCCESS]', '<span style="color: #73C991; font-weight: 500;">[SUCCESS]</span>');
    } else if (message.includes('[ERROR]')) {
      styledMessage = message.replace('[ERROR]', '<span style="color: #E06C75; font-weight: 500;">[ERROR]</span>');
    } else if (message.includes('[WARNING]')) {
      styledMessage = message.replace('[WARNING]', '<span style="color: #E5C07B;">[WARNING]</span>');
    } else if (message.includes('[INFO]')) {
      styledMessage = message.replace('[INFO]', '<span style="color: #4FC1FF;">[INFO]</span>');
    } else if (message.includes('[UPLOAD]') || message.includes('[COMPILE]') || message.includes('[RUN]') || message.includes('[SEND]')) {
      styledMessage = message.replace(/\[(UPLOAD|COMPILE|RUN|SEND)\]/, '<span style="color: #ABB2BF; font-weight: 600;">[$1]</span>');
    }
    
    // Append as HTML for colored output
    const lineDiv = document.createElement('div');
    lineDiv.innerHTML = styledMessage;
    terminalOutput.appendChild(lineDiv);
    
    // Auto-scroll to bottom (scroll the container, not the output element)
    const terminalContent = document.getElementById('terminal-content');
    if (terminalContent) {
      terminalContent.scrollTop = terminalContent.scrollHeight;
    }
  }
}

function clearTerminal() {
  const terminalOutput = document.getElementById('terminal-output');
  if (terminalOutput) {
    terminalOutput.innerHTML = ''; // Changed from textContent to innerHTML for colored output
  }
}

// Make clearTerminal globally available
window.clearTerminal = clearTerminal;

// Function to show terminal (used by compile function)
function showTerminal() {
  const terminalPanel = document.getElementById('terminal-panel');
  const toggleBtn = document.getElementById('terminal-toggle');
  
  if (terminalPanel && toggleBtn) {
    terminalPanel.style.display = 'flex';
    toggleBtn.textContent = 'Hide Terminal';
    // Update the global terminalVisible state
    if (typeof window.terminalVisible !== 'undefined') {
      window.terminalVisible = true;
    }
    // Resize Blockly workspace
    setTimeout(() => {
      if (typeof Blockly !== 'undefined' && typeof Blockly.svgResize === 'function') {
        Blockly.svgResize(workspace);
      }
    }, 100);
  }
}

// Make showTerminal globally available
window.showTerminal = showTerminal;

// Check if Monaco editor is ready
function isEditorReady() {
  const editorWindow = document.getElementById('monacoEditor').contentWindow;
  return editorWindow && editorWindow.getEditorValue && editorWindow.setEditorValue;
}

// Wait for editor to be ready
async function waitForEditor(maxAttempts = 20) {
  for (let i = 0; i < maxAttempts; i++) {
    if (isEditorReady()) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  return false;
}

// Get current code from Monaco editor
function getCurrentCode() {
  const editorWindow = document.getElementById('monacoEditor').contentWindow;
  
  if (!editorWindow) {
    console.log('❌ Editor iframe not found');
    return '';
  }
  
  if (editorWindow.getEditorValue) {
    try {
      const code = editorWindow.getEditorValue();
      console.log('🔍 Retrieved code length:', code ? code.length : 0);
      if (code && code.trim()) {
        console.log('🔍 Code preview:', code.substring(0, 200) + (code.length > 200 ? '...' : ''));
        return code;
      } else {
        console.log('⚠️ Editor contains empty or whitespace-only code');
        return '';
      }
    } catch (error) {
      console.error('❌ Error getting code from editor:', error);
      return '';
    }
  }
  
  console.log('❌ Editor not ready - getEditorValue function not available');
  return '';
}

// Lightweight editor peek (no logging) for frequent polling
function peekEditorCode() {
  try {
    const iframe = document.getElementById('monacoEditor');
    const editorWindow = iframe && iframe.contentWindow;
    if (!editorWindow || !editorWindow.getEditorValue) return '';
    const v = editorWindow.getEditorValue();
    return typeof v === 'string' ? v : '';
  } catch (_e) {
    return '';
  }
}

function setRunUploadButtonsEnabled(enabled) {
  const runBtn = document.getElementById('runBtn');
  const uploadBtn = document.getElementById('uploadBtn');
  if (runBtn) runBtn.disabled = !enabled;
  if (uploadBtn) uploadBtn.disabled = !enabled;
}

async function handleEditorEmptyState(isEmpty) {
  // Only act on transitions
  if (lastEditorEmptyState === isEmpty) return;
  lastEditorEmptyState = isEmpty;

  if (isEmpty) {
    suppressEsp32Output = true;
    setRunUploadButtonsEnabled(false);

    // Student-safe: stop showing ESP32 output by closing the Serial Monitor process.
    if (isSerialMonitorOpen) {
      try {
        appendTerminalOutput('[INFO] Editor is empty. Closing Serial Monitor...');
        await window.electronAPI.closeSerialPort();
      } catch (e) {
        // Best-effort; don’t spam errors
        console.log('Note: closeSerialPort failed:', e?.message || e);
      } finally {
        isSerialMonitorOpen = false;
      }
    }
  } else {
    suppressEsp32Output = false;
    // Re-enable controls when code exists again (user explicitly uploads/runs)
    setRunUploadButtonsEnabled(true);
  }
}

function clearSelectedPortUI() {
  try {
    const portSelect = document.getElementById('portSelect');
    if (portSelect) portSelect.value = '';
  } catch (_e) {}
}

function handlePortDisconnected(reason = 'Port disconnected') {
  // Avoid spam
  if (lastPortPresenceState === false) return;
  lastPortPresenceState = false;

  suppressEsp32Output = true;
  isSerialMonitorOpen = false;
  currentPort = null;
  currentBoardType = null;
  clearSelectedPortUI();

  appendTerminalOutput(`[ERROR] ${reason}`);
  appendTerminalOutput('[INFO] Replug the USB cable, then click Refresh Ports and select the port again.');

  // Disable actions until the user selects a port again (or code changes to local)
  setRunUploadButtonsEnabled(false);
}

function handlePortConnectedAgain(portPath) {
  if (lastPortPresenceState === true) return;
  lastPortPresenceState = true;
  suppressEsp32Output = false;

  if (portPath) {
    appendTerminalOutput(`[SUCCESS] Port detected again: ${portPath}`);
    appendTerminalOutput('[INFO] Select the port and Upload again.');
  }
}

// Get current language from Monaco editor or last generated language
function getCurrentLanguage() {
  const editorWindow = document.getElementById('monacoEditor').contentWindow;
  
  if (editorWindow && editorWindow.getEditorLanguage) {
    try {
      const editorLang = editorWindow.getEditorLanguage();
      if (editorLang && editorLang !== 'javascript') {
        console.log(`🎯 Language detected from editor: ${editorLang}`);
        return editorLang;
      }
    } catch (error) {
      console.error('❌ Error getting language from editor:', error);
    }
  }
  
  // Fallback to last generated language
  console.log(`🎯 Using fallback language: ${lastGeneratedLanguage}`);
  return lastGeneratedLanguage;
}

// Set the current language when code is generated
function setCurrentLanguage(language) {
  currentLanguage = language;
  lastGeneratedLanguage = language;
  
  // Update language dropdown to match
  const langSelect = document.getElementById('languageSelect');
  if (langSelect) {
    langSelect.value = language;
    console.log(`✅ Language dropdown updated to: ${language}`);
  }
  
  console.log(`🎯 Language set to: ${language}`);
}

// Helper function to detect if Python code needs hardware
function needsHardwarePort(code) {
  const hardwareModules = [
    'import machine',
    'from machine',
    'os.uname()',
    'machine.freq()',
    'machine.unique_id()',
    'machine.Pin',
    'machine.ADC',
    'machine.PWM',
    'machine.I2C',
    'machine.SPI',
    'machine.UART',
    'machine.Timer',
    'machine.RTC',
    'machine.WDT'
  ];
  
  // Custom hardware functions from Blockly generators
  const customHardwareFunctions = [
    'set_pin_mode',
    'set_pin(',
    'read_pin(',
    'read_analog_pin',
    'write_analog_pin',
    'set_motor',
    'set_servo',
    'set_motor_speed',
    'read_ldr',
    'read_ir',
    'read_temperature',
    'read_ultrasonic',
    'read_touch',
    'read_color',
    'read_joystick',
    'oled_display',
    'show_on_oled',
    'display_variable_on_oled',
    'display_char_on_oled',
    'blink_text_on_oled',
    'scroll_text_on_oled',
    'wifi_connect',
    'wifi_send',
    'wifi_receive',
    'bluetooth_setup',
    'bluetooth_send',
    'bluetooth_available',
    'bluetooth_read'
  ];
  
  // Check for standard hardware modules
  const hasStandardHardware = hardwareModules.some(module => code.includes(module));
  
  // Check for custom hardware functions
  const hasCustomHardware = customHardwareFunctions.some(func => code.includes(func));
  
  const hasHardware = hasStandardHardware || hasCustomHardware;
  
  console.log(`🔍 Hardware detection for Python code:`, {
    code: code.substring(0, 200) + (code.length > 200 ? '...' : ''),
    hasStandardHardware,
    hasCustomHardware,
    detectedFunctions: customHardwareFunctions.filter(func => code.includes(func)),
    needsHardware: hasHardware
  });
  
  return hasHardware;
}

// Helper function to detect if C++ code needs hardware
function needsHardwarePortCpp(code) {
  const hardwareModules = [
    '#include <Arduino.h>',
    '#include <ESP32.h>',
    '#include <WiFi.h>',
    '#include <BluetoothSerial.h>',
    'Serial.begin',
    'pinMode',
    'digitalWrite',
    'digitalRead',
    'analogRead',
    'analogWrite',
    'WiFi.begin',
    'BluetoothSerial',
    'ESP32',
    'Arduino.h'
  ];
  
  return hardwareModules.some(module => code.includes(module));
}

// Auto-detect language and hardware requirements
async function autoDetectLanguage() {
  const code = getCurrentCode();
  
  if (!code.trim()) {
    appendTerminalOutput('[ERROR] No code to analyze. Please generate some code first.');
    return;
  }
  
  appendTerminalOutput('\n[INFO] Auto-detecting language and hardware requirements...');
  
  // Detect language
  let detectedLanguage = 'unknown';
  let needsHardware = false;
  let hardwareType = 'none';
  
  if (code.includes('import ') || code.includes('print(') || code.includes('def ')) {
    detectedLanguage = 'python';
    needsHardware = needsHardwarePort(code);
    hardwareType = needsHardware ? 'MicroPython (ESP32/Pico)' : 'Standard Python';
  } else if (code.includes('#include') || code.includes('int main()') || code.includes('void setup()')) {
    detectedLanguage = 'cpp';
    needsHardware = needsHardwarePortCpp(code);
    hardwareType = needsHardware ? 'Arduino/ESP32' : 'Standard C++';
  } else if (code.includes('function') || code.includes('console.log') || code.includes('var ') || code.includes('let ')) {
    detectedLanguage = 'javascript';
    needsHardware = false;
    hardwareType = 'Node.js';
  } else if (code.includes('#include <stdio.h>') || code.includes('printf(')) {
    detectedLanguage = 'c';
    needsHardware = false;
    hardwareType = 'Standard C';
  }
  
  // Set the detected language
  setCurrentLanguage(detectedLanguage);
  
  // Display results
  appendTerminalOutput(`[SUCCESS] Language detected: ${detectedLanguage.toUpperCase()}`);
  appendTerminalOutput(`[INFO] Hardware type: ${hardwareType}`);
  
  if (needsHardware) {
    if (currentPort) {
      appendTerminalOutput(`[SUCCESS] Hardware port: ${currentPort}`);
      appendTerminalOutput(`[INFO] Ready to upload and run on hardware\n`);
    } else {
      appendTerminalOutput(`[WARNING] Hardware code detected but no port selected`);
      appendTerminalOutput(`[INFO] Please select a port to upload to hardware\n`);
    }
  } else {
    appendTerminalOutput(`[SUCCESS] Standard code - can run locally`);
    appendTerminalOutput(`[INFO] Use "Run" button to execute locally\n`);
  }
  
  appendTerminalOutput(`🎯 Auto-detection complete!`);
}

// Helper to get selected language from dropdown or auto-detect
function getSelectedLanguage(code) {
  // First, detect language from code (most reliable)
  const detectedLanguage = detectLanguageFromCode(code);
  
  const langSelect = document.getElementById('languageSelect');
  if (langSelect) {
    const selected = langSelect.value;
    
    // If auto-detect is selected, use detected language
    if (selected === 'auto') {
      return detectedLanguage;
    }
    
    // ⚠️ CRITICAL: If detected language is Python but dropdown says C++, trust the code!
    // This prevents trying to compile Python code as C++
    if (detectedLanguage === 'python' && selected === 'cpp') {
      console.warn('⚠️ Language mismatch: Code is Python/MicroPython but dropdown says C++. Using Python.');
      console.warn('⚠️ This prevents C++ compilation errors on Python code.');
      // Update dropdown to match detected language
      langSelect.value = 'python';
      setCurrentLanguage('python');
      return 'python';
    }
    
    // If detected language is C++ but dropdown says Python, trust the code too
    if (detectedLanguage === 'cpp' && selected === 'python') {
      console.warn('⚠️ Language mismatch: Code is C++ but dropdown says Python. Using C++.');
      langSelect.value = 'cpp';
      setCurrentLanguage('cpp');
      return 'cpp';
    }
    
    // Otherwise, use dropdown selection
    if (selected === 'python' || selected === 'cpp' || selected === 'javascript' || selected === 'c') {
      return selected;
    }
  }
  
  // Fallback to auto-detect
  return detectedLanguage;
}

// Enhanced language detection function
// ⚠️ CRITICAL: MicroPython detection MUST come FIRST to prevent false C/C++ detection
function detectLanguageFromCode(code) {
  if (!code || !code.trim()) {
    return lastGeneratedLanguage || 'python';
  }
  
  // ============================================
  // STEP 1: MicroPython Detection (HIGHEST PRIORITY)
  // ============================================
  // Check for MicroPython-specific patterns FIRST before any C/C++ detection
  const microPythonIndicators = [
    'from machine import',
    'import machine',
    'machine.Pin',
    'machine.PWM',
    'machine.ADC',
    'machine.SoftI2C',
    'import ssd1306',
    'import dht',
    'import servo',
    'MicroPython',
    'time.sleep_us',
    'time.ticks_us',
    'Pin.OUT',
    'Pin.IN',
    'PWM(',
    'ADC(',
    'SoftI2C(',
    'MY STEAM LAB - Generated MicroPython Code',  // Header from our generator
    'Ready to upload to ESP32 Dev Board via MicroPython'
  ];
  
  const hasMicroPythonIndicator = microPythonIndicators.some(indicator => 
    code.includes(indicator)
  );
  
  if (hasMicroPythonIndicator) {
    console.log('✅ Detected MicroPython code - returning python');
    return 'python';
  }
  
  // ============================================
  // STEP 2: Standard Python Detection
  // ============================================
  // Check for Python patterns (but not C/C++ patterns)
  const pythonIndicators = [
    'def ',
    'import ',
    'print(',
    'if __name__',
    'try:',
    'except:',
    'with open(',
    'class '  // Python classes (but not C++ classes with public:)
  ];
  
  const hasPythonIndicator = pythonIndicators.some(indicator => 
    code.includes(indicator)
  );
  
  // Only return Python if it's clearly Python (not C/C++)
  // Check that it's NOT C/C++ code
  const isNotCpp = !code.includes('#include') && 
                    !code.includes('void setup()') && 
                    !code.includes('void loop()') &&
                    !code.includes('int main()') &&
                    !code.includes('Arduino.h');
  
  const isNotC = !code.includes('#include <stdio.h>') && 
                 !code.includes('printf(') && 
                 !code.includes('scanf(');
  
  if (hasPythonIndicator && isNotCpp && isNotC) {
    console.log('✅ Detected Python code - returning python');
    return 'python';
  }
  
  // ============================================
  // STEP 3: C++ Detection (only if NOT MicroPython/Python)
  // ============================================
  if (code.includes('#include') || 
      code.includes('int main()') || 
      code.includes('void main()') ||
      code.includes('void setup()') || 
      code.includes('void loop()') ||
      code.includes('Arduino.h') ||
      (code.includes('ESP32') && code.includes('#include')) ||
      code.includes('std::cout') ||
      code.includes('std::cin') ||
      code.includes('namespace std') ||
      (code.includes('class ') && code.includes('public:')) ||
      code.includes('public:') ||
      code.includes('private:') ||
      code.includes('protected:') ||
      code.includes('template<') ||
      code.includes('std::') ||
      code.includes('vector<') ||
      code.includes('string ') ||
      code.includes('cout <<') ||
      code.includes('cin >>') ||
      code.includes('return 0;') ||
      code.includes('using namespace')) {
    console.log('✅ Detected C++ code - returning cpp');
    return 'cpp';
  }
  
  // ============================================
  // STEP 4: C Detection (only if NOT MicroPython/Python/C++)
  // ============================================
  if (code.includes('#include <stdio.h>') || 
      (code.includes('printf(') && !code.includes('print(')) || 
      (code.includes('scanf(') && !code.includes('input(')) ||
      (code.includes('main()') && code.includes('#include'))) {
    console.log('✅ Detected C code - returning c');
    return 'c';
  }
  
  // ============================================
  // STEP 5: JavaScript Detection
  // ============================================
  if (code.includes('function') || 
      code.includes('console.log') || 
      code.includes('var ') || 
      code.includes('let ') ||
      code.includes('const ') ||
      code.includes('=>') ||
      code.includes('async ') ||
      code.includes('await ')) {
    console.log('✅ Detected JavaScript code - returning javascript');
    return 'javascript';
  }
  
  // Default to Python (since we're generating MicroPython)
  console.log(`⚠️ Language unclear, defaulting to: ${lastGeneratedLanguage || 'python'}`);
  return lastGeneratedLanguage || 'python';
}

// Function to update language dropdown based on detected language
function updateLanguageDropdown(detectedLanguage) {
  const langSelect = document.getElementById('languageSelect');
  if (langSelect) {
    langSelect.value = detectedLanguage;
    console.log(`Language dropdown updated to: ${detectedLanguage}`);
  }
}

// Function to auto-detect language when code changes
function autoDetectLanguageFromCode() {
  const code = getCurrentCode();
  if (code && code.trim()) {
    const detectedLanguage = detectLanguageFromCode(code);
    updateLanguageDropdown(detectedLanguage);
    setCurrentLanguage(detectedLanguage);
    console.log(`Auto-detected language: ${detectedLanguage}`);
    // No terminal output - silent detection
  }
}

// Update compileCode, uploadCode, runCode to use getSelectedLanguage
async function compileCode() {
  const code = getCurrentCode();
  
  if (!code.trim()) {
    appendTerminalOutput('[ERROR] No code to compile. Please generate some code first.');
    return;
  }
  
  // Auto-detect language first (force detection from code, ignore dropdown if wrong)
  autoDetectLanguageFromCode();
  const language = getSelectedLanguage(code);
  setCurrentLanguage(language);
  
  // Debug: Show what language was detected
  console.log(`🔍 Code content preview: ${code.substring(0, 100)}...`);
  console.log(`🎯 Detected language: ${language}`);
  console.log(`📝 Language dropdown value: ${document.getElementById('languageSelect')?.value}`);
  
  // ⚠️ IMPORTANT: Python/MicroPython doesn't need compilation!
  if (language === 'python') {
    appendTerminalOutput('[INFO] Python/MicroPython is an interpreted language');
    appendTerminalOutput('[INFO] Use "Upload" to transfer to ESP32 or "Run" to execute locally');
    showTerminal();
    return;
  }
  
  // Automatically show terminal when compiling
  showTerminal();
  
  appendTerminalOutput(`\n[COMPILE] Compiling ${language} code...`);
  
  try {
    let result;
    switch (language) {
      case 'python':
        // Should not reach here, but handle just in case
        appendTerminalOutput('[INFO] Python code does not need compilation. Use Upload or Run instead.');
        return;
      case 'javascript':
        result = await window.electronAPI.compileJavaScript(code);
        break;
      case 'cpp':
        result = await window.electronAPI.compileCpp(code);
        break;
      case 'c':
        result = await window.electronAPI.compileC(code);
        break;
      default:
        appendTerminalOutput(`[ERROR] Unsupported language: ${language}`);
        return;
    }
    
    if (result.success) {
      appendTerminalOutput(`[SUCCESS] Compilation successful!\n`);
      appendTerminalOutput(result.output || 'No output');
      lastCompiledPath = result.compiledPath;
      lastCompiledSuccess = true;
    } else {
      appendTerminalOutput(`[ERROR] Compilation failed:`);
      appendTerminalOutput(result.error);
      lastCompiledSuccess = false;
    }
  } catch (error) {
    appendTerminalOutput(`[ERROR] Compilation error: ${error.message}`);
    lastCompiledSuccess = false;
  }
}

async function uploadCode() {
  // Auto-open terminal when upload is clicked
  const terminalPanel = document.getElementById('terminal-panel');
  const toggleBtn = document.getElementById('terminal-toggle');
  if (terminalPanel && terminalPanel.style.display === 'none') {
    terminalPanel.style.display = 'flex';
    if (toggleBtn) toggleBtn.textContent = 'Hide Terminal';
    if (typeof terminalVisible !== 'undefined') {
      terminalVisible = true;
    }
  }
  
  if (isUploading) {
    appendTerminalOutput('[INFO] Upload already in progress...');
    return;
  }
  isUploading = true;
  const runBtn = document.getElementById('runBtn');
  const uploadBtn = document.getElementById('uploadBtn');
  if (uploadBtn) uploadBtn.disabled = true;
  if (runBtn) runBtn.disabled = true;
  let code = getCurrentCode();
  // Auto-detect language first
  autoDetectLanguageFromCode();
  const language = getSelectedLanguage(code);
  setCurrentLanguage(language);
  
  if (!code.trim()) {
    appendTerminalOutput('[ERROR] No code to upload. Please generate some code first.');
    isUploading = false;
    if (uploadBtn) uploadBtn.disabled = false;
    if (runBtn) runBtn.disabled = false;
    return;
  }
  
  // For Python/MicroPython: auto-fix indentation and format with black
  if (language === 'python') {
    try {
      const fmt = await window.electronAPI.formatPython(code);
      if (fmt && fmt.success && fmt.code) {
        code = fmt.code;
        // Update editor to show formatted code if available
        const editorWindow = document.getElementById('monacoEditor').contentWindow;
        if (editorWindow && editorWindow.setEditorValue) {
          editorWindow.setEditorValue(code);
        }
        appendTerminalOutput('[SUCCESS] Code formatted successfully.');
      } else if (fmt && !fmt.success) {
        appendTerminalOutput(`[WARNING] Formatter not applied: ${fmt.error || 'unknown error'}`);
      }
    } catch (fmtErr) {
      appendTerminalOutput(`[WARNING] Formatter error: ${fmtErr.message}`);
    }
  }
  
  // Check if Python code needs hardware for upload
  if (language === 'python') {
    const needsHardware = needsHardwarePort(code);
    
    if (needsHardware && !currentPort) {
      appendTerminalOutput('[ERROR] No port selected. Please select a port first.');
      appendTerminalOutput('[INFO] This code requires hardware connection.');
      isUploading = false;
      if (uploadBtn) uploadBtn.disabled = false;
      if (runBtn) runBtn.disabled = false;
      return;
    }
    
    if (!needsHardware) {
      appendTerminalOutput('[INFO] This is standard Python code. Use "Run" to execute locally.');
      isUploading = false;
      if (uploadBtn) uploadBtn.disabled = false;
      if (runBtn) runBtn.disabled = false;
      return;
    }
  } else if (language === 'cpp') {
    const needsHardware = needsHardwarePortCpp(code);
    
    if (needsHardware && !currentPort) {
      appendTerminalOutput('[ERROR] No port selected. Please select a port first.');
      appendTerminalOutput('[INFO] This C++ code requires hardware connection.');
      isUploading = false;
      if (uploadBtn) uploadBtn.disabled = false;
      if (runBtn) runBtn.disabled = false;
      return;
    }
    
    if (!needsHardware) {
      appendTerminalOutput('[INFO] This is standard C++ code. Use "Run" to execute locally.');
      isUploading = false;
      if (uploadBtn) uploadBtn.disabled = false;
      if (runBtn) runBtn.disabled = false;
      return;
    }
  } else if (!currentPort) {
    // For other languages, still require port
    appendTerminalOutput('❌ No port selected. Please select a port first.');
    isUploading = false;
    if (uploadBtn) uploadBtn.disabled = false;
    if (runBtn) runBtn.disabled = false;
    return;
  }
  
  // CRITICAL: Close serial monitor before upload (esptool needs exclusive port access)
  if (currentPort && language === 'python') {
    appendTerminalOutput(`[INFO] Closing serial monitor for upload...`);
    try {
      await window.electronAPI.closeSerialPort();
      isSerialMonitorOpen = false;
      await new Promise(resolve => setTimeout(resolve, 500)); // Brief delay
    } catch (closeErr) {
      console.log(`Warning: Error closing serial port: ${closeErr.message}`);
    }
  }
  
  appendTerminalOutput(`\n[UPLOAD] Uploading ${language} code to ${currentPort} (${currentBoardType || 'unknown'})...`);
  
  try {
    let result;
    switch (language) {
      case 'python':
        result = await window.electronAPI.uploadPython(code, currentPort, currentBoardType || 'unknown');
        break;
      case 'javascript':
        result = await window.electronAPI.uploadJavaScript(code, currentPort, currentBoardType || 'unknown');
        break;
      case 'cpp':
        result = await window.electronAPI.uploadCpp(code, currentPort, currentBoardType || 'unknown');
        break;
      case 'c':
        result = await window.electronAPI.uploadC(code, currentPort, currentBoardType || 'unknown');
        break;
      default:
        appendTerminalOutput(`[ERROR] Unsupported language for upload: ${language}`);
        isUploading = false;
        if (uploadBtn) uploadBtn.disabled = false;
        if (runBtn) runBtn.disabled = false;
        return;
    }
    
    console.log('🔍 [UPLOAD RESULT]', result); // DEBUG
    
    if (result && result.success) {
      appendTerminalOutput(`\n[SUCCESS] Upload successful!\n`);
      appendTerminalOutput(result.output || 'No output');
      
      // Open serial monitor after successful upload (for Python/ESP32)
      if (language === 'python' && currentPort) {
        console.log('🔍 [SERIAL MONITOR] Attempting to reopen serial monitor...');
        appendTerminalOutput(`[INFO] Opening serial monitor...`);
        await new Promise(resolve => setTimeout(resolve, 2500)); // wait longer for board to fully boot
        
        try {
          await openSerialMonitor(currentPort, false);
          console.log('🔍 [SERIAL MONITOR] Serial monitor opened successfully');
          
          // CRITICAL: After esptool hard reset, ESP32 needs 2-3 seconds to boot MicroPython
          // DO NOT send commands during boot - this causes [Send Error]: Exit code 1
          await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for MicroPython to fully boot
          
          // MicroPython automatically runs main.py after boot - no commands needed!
          console.log('🔍 [SERIAL MONITOR] MicroPython booted, main.py should be running');
          appendTerminalOutput(`[RESET] ESP32 reset complete. Waiting for MicroPython boot...`);
          appendTerminalOutput(`[SERIAL] Listening for MicroPython output (main.py runs automatically).`);
        } catch (monitorErr) {
          console.error('❌ [SERIAL MONITOR] Error opening:', monitorErr);
          appendTerminalOutput(`[WARNING] Error opening serial monitor: ${monitorErr.message}`);
          appendTerminalOutput(`[INFO] Try pressing the RESET button on your ESP32`);
        }
      }
    } else {
      console.log('❌ [UPLOAD RESULT] Upload failed:', result);
      appendTerminalOutput(`[ERROR] Upload failed:`);
      appendTerminalOutput(result ? (result.error || 'Unknown error') : 'No result returned');
    }
  } catch (error) {
    appendTerminalOutput(`[ERROR] Upload error: ${error.message}`);
  }
  finally {
    isUploading = false;
    if (uploadBtn) uploadBtn.disabled = false;
    if (runBtn) runBtn.disabled = false;
  }
}

async function runCode() {
  if (isRunning) {
    appendTerminalOutput('[INFO] A run is already in progress...');
    return;
  }
  isRunning = true;
  const runBtn = document.getElementById('runBtn');
  const uploadBtn = document.getElementById('uploadBtn');
  if (runBtn) runBtn.disabled = true;
  if (uploadBtn) uploadBtn.disabled = true;
  const code = getCurrentCode();
  // Auto-detect language first
  autoDetectLanguageFromCode();
  const language = getSelectedLanguage(code);
  setCurrentLanguage(language);
  
  console.log(`🎯 Running code in language: ${language}, currentPort: ${currentPort}`);
  
  if (!code.trim()) {
    appendTerminalOutput('[ERROR] No code to run. Please generate some code first.');
    return;
  }
  
  // EXECUTION MODE VALIDATION: Prevent MicroPython from running locally
  if (language === 'python') {
    const needsHardware = needsHardwarePort(code);
    
    if (needsHardware) {
      // MicroPython code detected - BLOCK Run button, force Upload instead
      console.log('🚫 MicroPython code detected - Run button is disabled for hardware code');
      appendTerminalOutput('❌ This is MicroPython code - cannot run locally!');
      appendTerminalOutput('[INFO] Use the UPLOAD button to flash to ESP32');
      appendTerminalOutput('[INFO] The Run button is ONLY for standard Python (no hardware modules)');
      return; // STOP HERE
    } else {
      // Standard Python - safe to run locally
      console.log('✅ Standard Python code detected - safe for local execution');
      appendTerminalOutput('💻 [LOCAL] Running standard Python on your computer...');
    }
  } else if (language === 'cpp') {
    const needsHardware = needsHardwarePortCpp(code);
    
    if (needsHardware) {
      // Arduino/ESP32 C++ code detected - BLOCK Run button, force Upload instead
      console.log('🚫 Arduino/ESP32 C++ code detected - Run button is disabled for hardware code');
      appendTerminalOutput('❌ This is Arduino/ESP32 C++ code - cannot run locally!');
      appendTerminalOutput('[INFO] Use the UPLOAD button to flash to hardware');
      appendTerminalOutput('[INFO] The Run button is ONLY for standard C++ (no Arduino.h/ESP32.h)');
      return; // STOP HERE
    } else {
      // Standard C++ - safe to run locally
      console.log('✅ Standard C++ code detected - safe for local execution');
      appendTerminalOutput('💻 [LOCAL] Running standard C++ on your computer...');
    }
  }
  
  // CRITICAL EXECUTION STATE MACHINE: Prevent dual execution
  try {
    let result;
    switch (language) {
      case 'python':
        const needsHardware = needsHardwarePort(code);
        
        // MUTUALLY EXCLUSIVE MODES:
        if (needsHardware) {
          // MODE 1: ESP32/Hardware Mode - BLOCK local execution
          console.log('🚫 BLOCKING Run: This is MicroPython code - must use Upload button');
          appendTerminalOutput(`\n❌ Cannot run MicroPython code locally!`);
          appendTerminalOutput(`[INFO] This code uses hardware modules (machine, Pin, etc.)`);
          appendTerminalOutput(`[INFO] Use the UPLOAD button to flash code to ESP32`);
          appendTerminalOutput(`[INFO] Then open Serial Monitor to see output from ESP32`);
          return; // STOP HERE - do not execute locally
        } else {
          // MODE 2: Local Python Mode - ONLY if no hardware detected
          console.log('✅ Local Python execution: Standard Python code, no hardware modules');
          appendTerminalOutput(`\n[LOCAL] Running standard Python code on your computer...`);
          result = await window.electronAPI.runPython(code, null); // null = no port = local execution
          appendTerminalOutput(`[LOCAL] Execution output:`);
        }
        break;
      case 'javascript':
        appendTerminalOutput(`\n[LOCAL] Running JavaScript code on your computer...`);
        result = await window.electronAPI.runJavaScript(code);
        appendTerminalOutput(`[LOCAL] Execution output:`);
        break;
      case 'cpp':
        appendTerminalOutput(`\n[LOCAL] Running C++ code on your computer...`);
        result = await window.electronAPI.runCpp(code);
        appendTerminalOutput(`[LOCAL] Execution output:`);
        break;
      case 'c':
        appendTerminalOutput(`\n[LOCAL] Running C code on your computer...`);
        result = await window.electronAPI.runC(code);
        appendTerminalOutput(`[LOCAL] Execution output:`);
        break;
      default:
        appendTerminalOutput(`[ERROR] Unsupported language for running: ${language}`);
        return;
    }
    
    // Display execution result with [LOCAL] prefix for clarity
    if (result && result.trim()) {
      result.split('\n').forEach(line => {
        if (line.trim()) {
          appendTerminalOutput(`[LOCAL] ${line}`);
        }
      });
    }
  } catch (error) {
    appendTerminalOutput(`[ERROR] Execution error: ${error.message}`);
  }
  finally {
    isRunning = false;
    if (runBtn) runBtn.disabled = false;
    if (uploadBtn) uploadBtn.disabled = false;
  }
}

// Safety: force-clear running flag after 30s in case the main process hangs
setInterval(() => {
  const runBtn = document.getElementById('runBtn');
  const uploadBtn = document.getElementById('uploadBtn');
  if (isRunning) {
    // If buttons are enabled but flag stuck, clear it
    if (runBtn && !runBtn.disabled) {
      isRunning = false;
    }
  }
  if (isUploading) {
    if (uploadBtn && !uploadBtn.disabled) {
      isUploading = false;
    }
  }
}, 30000);

// Make functions globally available
window.compileCode = compileCode;
window.uploadCode = uploadCode;
window.runCode = runCode;
window.setCurrentLanguage = setCurrentLanguage;
window.autoDetectLanguage = autoDetectLanguage; // Make autoDetectLanguage globally available

// Test function for debugging language detection
window.testLanguageDetection = function() {
  console.log('🧪 Testing Language Detection...');
  const code = getCurrentCode();
  console.log('📝 Current code:', code);
  const detected = detectLanguageFromCode(code);
  console.log('🎯 Detected language:', detected);
  updateLanguageDropdown(detected);
  console.log('📋 Language dropdown updated to:', detected);
};

// Serial port management - Enhanced COM port detection
async function refreshPorts() {
  const portSelect = document.getElementById('portSelect');
  if (!portSelect) {
    console.error('❌ #portSelect element not found');
    return;
  }

  console.log('🔄 Refreshing available ports...');
  const ports = await window.electronAPI.listSerialPorts();
  console.log('🔌 Ports found:', ports);

  // Store currently selected port
  const currentSelection = portSelect.value;
  
  portSelect.innerHTML = '';
  
  // Add default "Select Port" option
  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.text = 'Select Port';
  portSelect.appendChild(defaultOption);
  
  if (ports.length === 0) {
    console.log('⚠️ No serial ports detected');
    const option = document.createElement('option');
    option.value = '';
    option.text = 'No ports found';
    portSelect.appendChild(option);
  } else {
    console.log(`✅ Found ${ports.length} serial port(s)`);
    ports.forEach(port => {
      const option = document.createElement('option');
      option.value = port.path;
      // Store board type in data attribute
      option.setAttribute('data-board-type', port.boardType || 'unknown');
      // Enhanced display format: COM3 (ESP32 - Silicon Labs)
      const boardLabel = port.boardType ? ` [${port.boardType.toUpperCase()}]` : '';
      const displayName = port.manufacturer 
        ? `${port.path}${boardLabel} (${port.manufacturer})`
        : port.friendlyName 
        ? `${port.path}${boardLabel} (${port.friendlyName})`
        : `${port.path}${boardLabel}`;
      option.text = displayName;
      portSelect.appendChild(option);
      console.log(`  - ${port.path} (Board: ${port.boardType || 'unknown'}, ${port.manufacturer || port.friendlyName || 'Unknown'})`);
    });
    
    // Restore previous selection if it still exists
    if (currentSelection && ports.some(p => p.path === currentSelection)) {
      portSelect.value = currentSelection;
      // Also restore board type
      const selectedOption = portSelect.options[portSelect.selectedIndex];
      currentBoardType = selectedOption.getAttribute('data-board-type') || 'unknown';
    }
  }
}

// Open serial monitor explicitly (after upload)
async function openSerialMonitor(portPath, silent = false) {
  if (!portPath) {
    console.error('❌ [SERIAL MONITOR] No port path provided');
    return;
  }
  const ESP32_BAUD_RATE = 115200;
  console.log(`🔌 [SERIAL MONITOR] Opening port ${portPath} at ${ESP32_BAUD_RATE} baud...`);
  
  const result = await window.electronAPI.openSerialPort(portPath, ESP32_BAUD_RATE);
  console.log(`🔌 [SERIAL MONITOR] Result:`, result);
  
  if (result && result.success) {
    isSerialMonitorOpen = true;
    if (!silent) {
      appendTerminalOutput(`[SUCCESS] Serial monitor opened on ${portPath} at ${ESP32_BAUD_RATE} baud`);
      appendTerminalOutput(`[INFO] Listening for output...\n`);
    }
  } else {
    const errorMsg = result ? (result.error || 'Unknown error') : 'No result';
    console.error(`❌ [SERIAL MONITOR] Failed:`, errorMsg);
    if (!silent) {
      appendTerminalOutput(`[ERROR] Failed to open serial monitor on ${portPath}: ${errorMsg}`);
    }
  }
}

// Manual Serial Monitor function removed - Serial Monitor now opens automatically after upload
// This prevents port conflicts and provides a better user experience

// Port selection handler (no auto monitor)
async function selectPort(portPath, silent = false) {
  if (!portPath) {
    console.log('⚠️ No port path provided to selectPort');
    return;
  }
  console.log(`🔌 Attempting to select port: ${portPath}`);
  currentPort = portPath;
  
  // Get board type from the selected option
  const portSelect = document.getElementById('portSelect');
  if (portSelect) {
    portSelect.value = portPath;
    const selectedOption = portSelect.options[portSelect.selectedIndex];
    currentBoardType = selectedOption.getAttribute('data-board-type') || 'unknown';
    console.log(`🔍 Board type detected: ${currentBoardType}`);
  }
  
  if (!silent) {
    appendTerminalOutput(`\n[INFO] Port selected: ${portPath} (${currentBoardType})`);
    appendTerminalOutput(`[INFO] Serial monitor will open after upload completes.\n`);
  }
}

// Event listeners for serial data - Enhanced Serial Monitor
window.electronAPI.onSerialData((data) => {
  if (suppressEsp32Output) return;
  // Mirror raw data to browser console for debugging
  console.log('🔌 [SERIAL DATA]', data);

  // Display serial data in terminal (Serial Monitor) with [ESP32] prefix
  const trimmedData = (data || '').trim();
  if (trimmedData) {
    // Prefix ESP32 output to distinguish from local execution
    // Skip prefix for meta messages that already have brackets
    if (trimmedData.startsWith('[') || trimmedData.startsWith('>>>')) {
      appendTerminalOutput(trimmedData); // Keep meta messages as-is
    } else {
      appendTerminalOutput(`[ESP32] ${trimmedData}`); // Add prefix to actual ESP32 output
    }
    // Note: appendTerminalOutput already handles auto-scroll
  }
});

// Serial Monitor: Send data to connected port
async function sendSerialData(data) {
  if (!currentPort) {
    appendTerminalOutput('❌ No port selected. Please select a port first.');
    return;
  }
  
  try {
    // Send data via serial port
    // Note: This requires a new IPC handler in main.js
    appendTerminalOutput(`[SEND] ${data}`);
    // The actual sending is handled by the main process via the Python serial helper
    const result = await window.electronAPI.sendSerialData(currentPort, data);
    if (result && result.success) {
      appendTerminalOutput('[SUCCESS] Data sent successfully');
    } else {
      appendTerminalOutput(`[ERROR] Failed to send data: ${result?.error || 'Unknown error'}`);
    }
  } catch (error) {
    appendTerminalOutput(`[ERROR] Error sending serial data: ${error.message}`);
  }
}

// Make sendSerialData globally available
window.sendSerialData = sendSerialData;

// Serial Monitor: Send input from text field
async function sendSerialInput() {
  const inputField = document.getElementById('serial-input');
  if (!inputField) return;
  
  const data = inputField.value.trim();
  if (!data) return;
  
  if (!currentPort) {
    appendTerminalOutput('❌ No port selected. Please select a port first.');
    return;
  }
  
  await sendSerialData(data);
  inputField.value = ''; // Clear input field
}

// Make sendSerialInput globally available
window.sendSerialInput = sendSerialInput;

window.electronAPI.onTerminalOutput((data) => {
  // Also mirror terminal output to console for easier debugging
  console.log('🖥️ [TERMINAL]', data);
  appendTerminalOutput(data);
});

window.electronAPI.onReopenPort(async (port) => {
  appendTerminalOutput(`[INFO] Reconnecting to ${port}...`);
  await new Promise(resolve => setTimeout(resolve, 1500));
  await selectPort(port, true);
  appendTerminalOutput(`[SUCCESS] Reconnected to ${port}`);
});

// Port selection change handler
function setupPortSelection() {
  const portSelect = document.getElementById('portSelect');
  if (portSelect) {
    portSelect.addEventListener('change', (e) => {
      selectPort(e.target.value);
    });
  }
}

// Board status check with auto-refresh
function setupBoardStatusCheck() {
  const checkConnectionBtn = document.getElementById('checkConnectionBtn');
  const statusIndicator = document.getElementById('connection-status');
  
  // Function to update status indicator
  async function updateBoardStatus() {
    if (!statusIndicator) return;
    
    try {
      const status = await window.electronAPI.checkBoard();
      console.log('🟡 Board status:', status);
      
      if (status === 'connected') {
        statusIndicator.style.backgroundColor = 'green';
        statusIndicator.title = 'Board Connected';
      } else if (status === 'disconnected') {
        statusIndicator.style.backgroundColor = 'red';
        statusIndicator.title = 'Board Disconnected';
      } else {
        statusIndicator.style.backgroundColor = 'grey';
        statusIndicator.title = 'Status Unknown';
      }
    } catch (error) {
      console.error('❌ Board status check failed:', error);
      statusIndicator.style.backgroundColor = 'grey';
      statusIndicator.title = 'Status Check Failed';
    }
  }
  
  if (checkConnectionBtn) {
    checkConnectionBtn.addEventListener('click', updateBoardStatus);
  }
  
  // Auto-refresh status every 5 seconds
  setInterval(updateBoardStatus, 5000);
  
  // Initial status check
  updateBoardStatus();
}

// ESP32 connection test
function setupEsp32ConnectionTest() {
  const testEsp32Btn = document.getElementById('testEsp32Btn');
  
  if (testEsp32Btn) {
    testEsp32Btn.addEventListener('click', async () => {
      if (!currentPort) {
        appendTerminalOutput('❌ No port selected. Please select a port first.');
        return;
      }

      // IMPORTANT: This test uses esptool and will conflict with an open serial monitor on Windows.
      if (isSerialMonitorOpen) {
        appendTerminalOutput('❌ Close Serial Monitor before testing ESP32 connection.');
        appendTerminalOutput('[INFO] Reason: avoids COM port conflicts (Access is denied).');
        return;
      }
      
      appendTerminalOutput(`[INFO] Testing ESP32 connection on ${currentPort}...`);
      
      try {
        const result = await window.electronAPI.testEsp32Connection(currentPort);
        if (result.success) {
          appendTerminalOutput('[SUCCESS] ESP32 connection test successful!');
          appendTerminalOutput(result.output || 'No output');
        } else {
          appendTerminalOutput(`[ERROR] ESP32 connection test failed: ${result.error}`);
        }
      } catch (error) {
        appendTerminalOutput(`[ERROR] ESP32 connection test error: ${error.message}`);
      }
    });
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('✅ DOM ready, setting up event listeners...');

  // Poll editor state and auto-stop Serial Monitor when editor becomes empty
  setInterval(() => {
    const code = peekEditorCode();
    const empty = !code || !code.trim();
    handleEditorEmptyState(empty);
  }, 750);

  // Watch for USB disconnects: if the selected port disappears, notify immediately and reset UI.
  // This avoids the confusing "waiting..." state during uploads when the cable is unplugged.
  setInterval(async () => {
    try {
      if (!currentPort) {
        lastPortPresenceState = null;
        return;
      }

      const ports = await window.electronAPI.listSerialPorts();
      const present = Array.isArray(ports) && ports.some(p => p && p.path === currentPort);

      if (!present) {
        handlePortDisconnected(`Port ${currentPort} was disconnected or changed`);
      } else {
        handlePortConnectedAgain(currentPort);
      }
    } catch (e) {
      // Ignore transient listing errors; don't spam the terminal.
      console.log('Note: port presence check failed:', e?.message || e);
    }
  }, 1500);
  
  // Setup port selection
  setupPortSelection();
  
  // Setup board status check
  setupBoardStatusCheck();
  
  // Setup ESP32 connection test
  setupEsp32ConnectionTest();
  
  // Initial port refresh
  refreshPorts();
  
  // Make refreshPorts globally available
  window.refreshPorts = refreshPorts;
});

// Wait for dynamically injected elements
function waitForElement(id, callback) {
  const el = document.getElementById(id);
  if (el) {
    callback(el);
    return;
  }

  const observer = new MutationObserver(() => {
    const el = document.getElementById(id);
    if (el) {
      observer.disconnect();
      callback(el);
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

// Save Code Function
async function saveCode() {
  try {
    // Wait for Monaco editor to be ready
    const editorWindow = document.getElementById('monacoEditor').contentWindow;
    if (!editorWindow) {
      appendTerminalOutput('[ERROR] Editor not ready. Please wait a moment and try again.');
      return;
    }

    // Wait for editor to be fully loaded
    let attempts = 0;
    while (!editorWindow.getEditorValue && attempts < 10) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }

    if (!editorWindow.getEditorValue) {
      appendTerminalOutput('[ERROR] Editor not ready. Please wait a moment and try again.');
      return;
    }

    const code = getCurrentCode();
    const language = getCurrentLanguage();
    
    if (!code || code.trim() === '') {
      appendTerminalOutput('[ERROR] No code to save. Please generate some code first.');
      return;
    }
    
    appendTerminalOutput(`💾 Saving ${language} code...`);
    const result = await window.electronAPI.saveCode(code, language);
    
    if (result.success) {
      appendTerminalOutput(`[SUCCESS] Code saved successfully!`);
    } else {
      appendTerminalOutput(`[ERROR] Failed to save code: ${result.error}`);
    }
  } catch (error) {
    console.error('Error saving code:', error);
    appendTerminalOutput(`[ERROR] Error saving code: ${error.message}`);
  }
}

// Load Code Function
async function loadCode() {
  try {
    appendTerminalOutput('[INFO] Checking if editor is ready...');
    
    // Wait for Monaco editor to be ready
    if (!await waitForEditor()) {
      appendTerminalOutput('[ERROR] Editor not ready. Please wait a moment and try again.');
      return;
    }
    
    appendTerminalOutput('[SUCCESS] Editor is ready');
    
    const editorWindow = document.getElementById('monacoEditor').contentWindow;
    const language = getCurrentLanguage();
    appendTerminalOutput(`📂 Loading ${language} code...`);
    const result = await window.electronAPI.loadCode(language);
    
    if (result.success) {
      // Set the loaded code in the Monaco editor
      if (editorWindow.setEditorValue) {
        editorWindow.setEditorValue(result.code);
        // Also set the language in the editor
        if (editorWindow.setEditorLanguage) {
          editorWindow.setEditorLanguage(result.language || language);
        }
        appendTerminalOutput(`[SUCCESS] Code loaded from: ${result.filePath}`);
        // Update the current language
        setCurrentLanguage(result.language || language);
      } else {
        appendTerminalOutput(`[WARNING] Editor not ready. Please try again.`);
      }
    } else {
      appendTerminalOutput(`[ERROR] Failed to load code: ${result.error}`);
    }
  } catch (error) {
    console.error('Error loading code:', error);
    appendTerminalOutput(`[ERROR] Error loading code: ${error.message}`);
  }
}

// Make functions globally available
window.saveCode = saveCode;
window.loadCode = loadCode;

// Debug function to check editor status
window.debugEditor = function() {
  const editorWindow = document.getElementById('monacoEditor').contentWindow;
  console.log('🔍 Editor Debug Info:');
  console.log('Editor iframe exists:', !!document.getElementById('monacoEditor'));
  console.log('Editor window exists:', !!editorWindow);
  if (editorWindow) {
    console.log('getEditorValue available:', !!editorWindow.getEditorValue);
    console.log('setEditorValue available:', !!editorWindow.setEditorValue);
    console.log('setEditorLanguage available:', !!editorWindow.setEditorLanguage);
    console.log('Editor methods:', Object.getOwnPropertyNames(editorWindow));
  }
  
  appendTerminalOutput('[INFO] Editor debug info logged to console');
};

// Listen for editor ready signal from Monaco iframe
window.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'editorReady') {
    console.log('✅ Monaco editor signaled ready');
    appendTerminalOutput('[SUCCESS] Monaco editor is ready');
  }
});

// Wait for portSelect after navbar loads
waitForElement('portSelect', () => {
  setupPortSelection();
  refreshPorts();
});

// Wait for checkConnectionBtn after navbar loads
waitForElement('checkConnectionBtn', () => {
  setupBoardStatusCheck();
});

// Wait for testEsp32Btn after navbar loads
waitForElement('testEsp32Btn', () => {
  setupEsp32ConnectionTest();
});