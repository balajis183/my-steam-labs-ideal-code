console.log('⚡ renderer.js loaded');

let currentPort = null;
let currentLanguage = 'python'; // Default language
let lastGeneratedLanguage = 'python'; // Track last generated language
let lastCompiledPath = null;
let lastCompiledSuccess = false;
let isRunning = false;
let isUploading = false;

// Terminal output functions
function appendTerminalOutput(message) {
  const terminalOutput = document.getElementById('terminal-output');
  if (terminalOutput) {
    terminalOutput.textContent += message + '\n';
    terminalOutput.scrollTop = terminalOutput.scrollHeight;
  }
}

function clearTerminal() {
  const terminalOutput = document.getElementById('terminal-output');
  if (terminalOutput) {
    terminalOutput.textContent = '';
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
    appendTerminalOutput('❌ No code to analyze. Please generate some code first.');
    return;
  }
  
  appendTerminalOutput('🔍 Auto-detecting language and hardware requirements...');
  
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
  appendTerminalOutput(`✅ Language detected: ${detectedLanguage.toUpperCase()}`);
  appendTerminalOutput(`🔧 Hardware type: ${hardwareType}`);
  
  if (needsHardware) {
    if (currentPort) {
      appendTerminalOutput(`✅ Hardware port selected: ${currentPort}`);
      appendTerminalOutput(`💡 Ready to upload and run on hardware!`);
    } else {
      appendTerminalOutput(`⚠️ Hardware code detected but no port selected`);
      appendTerminalOutput(`💡 Please select a port to upload to hardware`);
    }
  } else {
    appendTerminalOutput(`✅ Standard code - can run locally`);
    appendTerminalOutput(`💡 Use "Run" button to execute locally`);
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
    appendTerminalOutput('❌ No code to compile. Please generate some code first.');
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
    appendTerminalOutput('⚠️ Python/MicroPython is an interpreted language - no compilation needed!');
    appendTerminalOutput('💡 Use "Upload" button to upload MicroPython code to ESP32');
    appendTerminalOutput('💡 Or use "Run" button to execute the code');
    showTerminal();
    return;
  }
  
  // Automatically show terminal when compiling
  showTerminal();
  
  appendTerminalOutput(`🔄 Compiling ${language} code...`);
  
  try {
    let result;
    switch (language) {
      case 'python':
        // Should not reach here, but handle just in case
        appendTerminalOutput('⚠️ Python code does not need compilation. Use Upload or Run instead.');
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
        appendTerminalOutput(`❌ Unsupported language: ${language}`);
        return;
    }
    
    if (result.success) {
      appendTerminalOutput(`✅ Compilation successful!`);
      appendTerminalOutput(result.output || 'No output');
      lastCompiledPath = result.compiledPath;
      lastCompiledSuccess = true;
    } else {
      appendTerminalOutput(`❌ Compilation failed:`);
      appendTerminalOutput(result.error);
      lastCompiledSuccess = false;
    }
  } catch (error) {
    appendTerminalOutput(`❌ Compilation error: ${error.message}`);
    lastCompiledSuccess = false;
  }
}

async function uploadCode() {
  if (isUploading) {
    appendTerminalOutput('⏳ Upload already in progress...');
    return;
  }
  isUploading = true;
  const runBtn = document.getElementById('runBtn');
  const uploadBtn = document.getElementById('uploadBtn');
  if (uploadBtn) uploadBtn.disabled = true;
  if (runBtn) runBtn.disabled = true;
  const code = getCurrentCode();
  // Auto-detect language first
  autoDetectLanguageFromCode();
  const language = getSelectedLanguage(code);
  setCurrentLanguage(language);
  
  if (!code.trim()) {
    appendTerminalOutput('❌ No code to upload. Please generate some code first.');
    isUploading = false;
    if (uploadBtn) uploadBtn.disabled = false;
    if (runBtn) runBtn.disabled = false;
    return;
  }
  
  // For Python: Compile first before uploading
  if (language === 'python') {
    appendTerminalOutput('🔄 Compiling Python code before upload...');
    try {
      const compileResult = await window.electronAPI.compilePython(code);
      if (!compileResult.success) {
        appendTerminalOutput('❌ Compilation failed. Please fix errors before uploading.');
        appendTerminalOutput(compileResult.error);
        isUploading = false;
        if (uploadBtn) uploadBtn.disabled = false;
        if (runBtn) runBtn.disabled = false;
        return;
      }
      appendTerminalOutput('✅ Compilation successful. Proceeding with upload...');
    } catch (compileError) {
      appendTerminalOutput(`❌ Compilation error: ${compileError.message}`);
      isUploading = false;
      if (uploadBtn) uploadBtn.disabled = false;
      if (runBtn) runBtn.disabled = false;
      return;
    }
  }
  
  // Check if Python code needs hardware for upload
  if (language === 'python') {
    const needsHardware = needsHardwarePort(code);
    
    if (needsHardware && !currentPort) {
      appendTerminalOutput('❌ No port selected. Please select a port first.');
      appendTerminalOutput('💡 This code uses hardware-specific modules and needs to be uploaded to hardware.');
      isUploading = false;
      if (uploadBtn) uploadBtn.disabled = false;
      if (runBtn) runBtn.disabled = false;
      return;
    }
    
    if (!needsHardware) {
      appendTerminalOutput('💡 This is standard Python code. Use "Run" instead of "Upload" to execute locally.');
      isUploading = false;
      if (uploadBtn) uploadBtn.disabled = false;
      if (runBtn) runBtn.disabled = false;
      return;
    }
  } else if (language === 'cpp') {
    const needsHardware = needsHardwarePortCpp(code);
    
    if (needsHardware && !currentPort) {
      appendTerminalOutput('❌ No port selected. Please select a port first.');
      appendTerminalOutput('💡 This C++ code uses hardware-specific modules (Arduino/ESP32) and needs to be uploaded to hardware.');
      isUploading = false;
      if (uploadBtn) uploadBtn.disabled = false;
      if (runBtn) runBtn.disabled = false;
      return;
    }
    
    if (!needsHardware) {
      appendTerminalOutput('💡 This is standard C++ code. Use "Run" instead of "Upload" to execute locally.');
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
  
  appendTerminalOutput(`📤 Uploading ${language} code to ${currentPort}...`);
  
  try {
    let result;
    switch (language) {
      case 'python':
        result = await window.electronAPI.uploadPython(code, currentPort);
        break;
      case 'javascript':
        result = await window.electronAPI.uploadJavaScript(code, currentPort);
        break;
      case 'cpp':
        result = await window.electronAPI.uploadCpp(code, currentPort);
        break;
      case 'c':
        result = await window.electronAPI.uploadC(code, currentPort);
        break;
      default:
        appendTerminalOutput(`❌ Unsupported language for upload: ${language}`);
        isUploading = false;
        if (uploadBtn) uploadBtn.disabled = false;
        if (runBtn) runBtn.disabled = false;
        return;
    }
    
    if (result.success) {
      appendTerminalOutput(`✅ Upload successful!`);
      appendTerminalOutput(result.output || 'No output');
    } else {
      appendTerminalOutput(`❌ Upload failed:`);
      appendTerminalOutput(result.error);
    }
  } catch (error) {
    appendTerminalOutput(`❌ Upload error: ${error.message}`);
  }
  finally {
    isUploading = false;
    if (uploadBtn) uploadBtn.disabled = false;
    if (runBtn) runBtn.disabled = false;
  }
}

async function runCode() {
  if (isRunning) {
    appendTerminalOutput('⏳ A run is already in progress...');
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
    appendTerminalOutput('❌ No code to run. Please generate some code first.');
    return;
  }
  
  // Check if Python code needs hardware (contains hardware-specific imports/modules)
  if (language === 'python') {
    const needsHardware = needsHardwarePort(code);
    
    if (needsHardware && !currentPort) {
      console.log('❌ Port validation failed: Python code uses hardware modules but no port selected');
      appendTerminalOutput('❌ No port selected. Please select a port first.');
      appendTerminalOutput('💡 This code uses hardware-specific modules (machine, os.uname, etc.)');
      return;
    }
    
    if (needsHardware) {
      console.log('✅ Python code uses hardware modules, port validation passed');
      appendTerminalOutput('🔧 Hardware execution mode: Code will run on ESP32');
    } else {
      console.log('✅ Standard Python code, will run locally');
      appendTerminalOutput('💻 Local execution mode: Code will run on your computer');
    }
  } else if (language === 'cpp') {
    const needsHardware = needsHardwarePortCpp(code);
    
    if (needsHardware && !currentPort) {
      console.log('❌ Port validation failed: C++ code uses hardware modules but no port selected');
      appendTerminalOutput('❌ No port selected. Please select a port first.');
      appendTerminalOutput('💡 This C++ code uses hardware-specific modules (Arduino/ESP32)');
      return;
    }
    
    if (needsHardware) {
      console.log('✅ C++ code uses hardware modules, port validation passed');
      appendTerminalOutput('🔧 Hardware execution mode: Code will run on ESP32/Arduino');
    } else {
      console.log('✅ Standard C++ code, will run locally');
      appendTerminalOutput('💻 Local execution mode: Code will run on your computer');
    }
  }
  
  appendTerminalOutput(`▶️ Running ${language} code...`);
  
  try {
    let result;
    switch (language) {
      case 'python':
        // Only pass port if code actually needs hardware
        const needsHardware = needsHardwarePort(code);
        const portToUse = needsHardware ? currentPort : null;
        console.log(`🎯 Python execution: needsHardware=${needsHardware}, portToUse=${portToUse}`);
        if (needsHardware) {
          appendTerminalOutput(`🔌 Using hardware port: ${portToUse}`);
        } else {
          appendTerminalOutput(`💻 Running locally (no port needed)`);
        }
        result = await window.electronAPI.runPython(code, portToUse);
        break;
      case 'javascript':
        result = await window.electronAPI.runJavaScript(code);
        break;
      case 'cpp':
        result = await window.electronAPI.runCpp(code);
        break;
      case 'c':
        result = await window.electronAPI.runC(code);
        break;
      default:
        appendTerminalOutput(`❌ Unsupported language for running: ${language}`);
        return;
    }
    
    appendTerminalOutput(`📋 Execution output:`);
    appendTerminalOutput(result);
  } catch (error) {
    appendTerminalOutput(`❌ Execution error: ${error.message}`);
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
      // Enhanced display format: COM3 (ESP32 - Silicon Labs)
      const displayName = port.manufacturer 
        ? `${port.path} (${port.manufacturer})`
        : port.friendlyName 
        ? `${port.path} (${port.friendlyName})`
        : `${port.path}`;
      option.text = displayName;
      portSelect.appendChild(option);
      console.log(`  - ${port.path} (${port.manufacturer || port.friendlyName || 'Unknown'})`);
    });
    
    // Restore previous selection if it still exists
    if (currentSelection && ports.some(p => p.path === currentSelection)) {
      portSelect.value = currentSelection;
    }
  }
}

// Port selection handler
async function selectPort(portPath, silent = false) {
  if (!portPath) {
    console.log('⚠️ No port path provided to selectPort');
    return;
  }
  
  console.log(`🔌 Attempting to select port: ${portPath}`);
  currentPort = portPath;
  // Fixed baud rate: 115200 for ESP32 board (DO NOT CHANGE)
  const ESP32_BAUD_RATE = 115200;
  const result = await window.electronAPI.openSerialPort(portPath, ESP32_BAUD_RATE);
  
  if (result.success) {
    console.log(`✅ Successfully connected to ${portPath}`);
    // Update the port select to show the selected port
    const portSelect = document.getElementById('portSelect');
    if (portSelect) {
      portSelect.value = portPath;
    }
    if (!silent) {
      appendTerminalOutput(`✅ Connected to ${portPath}`);
    }
  } else {
    console.error(`❌ Failed to connect to ${portPath}: ${result.error}`);
    appendTerminalOutput(`❌ Failed to connect to ${portPath}: ${result.error}`);
  }
}

// Event listeners for serial data - Enhanced Serial Monitor
window.electronAPI.onSerialData((data) => {
  // Display serial data in terminal (Serial Monitor)
  appendTerminalOutput(data);
  
  // Auto-scroll to bottom
  const terminalOutput = document.getElementById('terminal-output');
  if (terminalOutput) {
    terminalOutput.scrollTop = terminalOutput.scrollHeight;
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
    appendTerminalOutput(`📤 Sending: ${data}`);
    // The actual sending will be handled by the main process
    // For now, we'll use mpremote to send data
    const result = await window.electronAPI.sendSerialData(currentPort, data);
    if (result && result.success) {
      appendTerminalOutput('✅ Data sent successfully');
    } else {
      appendTerminalOutput(`❌ Failed to send data: ${result?.error || 'Unknown error'}`);
    }
  } catch (error) {
    appendTerminalOutput(`❌ Error sending serial data: ${error.message}`);
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
  appendTerminalOutput(data);
});

window.electronAPI.onReopenPort(async (port) => {
  appendTerminalOutput(`🔄 Reconnecting to ${port}...`);
  await new Promise(resolve => setTimeout(resolve, 1500));
  await selectPort(port, true);
  appendTerminalOutput(`✅ Reconnected to ${port}`);
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
      
      appendTerminalOutput(`🔍 Testing ESP32 connection on ${currentPort}...`);
      
      try {
        const result = await window.electronAPI.testEsp32Connection(currentPort);
        if (result.success) {
          appendTerminalOutput('✅ ESP32 connection test successful!');
          appendTerminalOutput(result.output || 'No output');
        } else {
          appendTerminalOutput(`❌ ESP32 connection test failed: ${result.error}`);
        }
      } catch (error) {
        appendTerminalOutput(`❌ ESP32 connection test error: ${error.message}`);
      }
    });
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('✅ DOM ready, setting up event listeners...');
  
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
      appendTerminalOutput('❌ Editor not ready. Please wait a moment and try again.');
      return;
    }

    // Wait for editor to be fully loaded
    let attempts = 0;
    while (!editorWindow.getEditorValue && attempts < 10) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }

    if (!editorWindow.getEditorValue) {
      appendTerminalOutput('❌ Editor not ready. Please wait a moment and try again.');
      return;
    }

    const code = getCurrentCode();
    const language = getCurrentLanguage();
    
    if (!code || code.trim() === '') {
      appendTerminalOutput('❌ No code to save. Please generate some code first.');
      return;
    }
    
    appendTerminalOutput(`💾 Saving ${language} code...`);
    const result = await window.electronAPI.saveCode(code, language);
    
    if (result.success) {
      appendTerminalOutput(`✅ Code saved successfully!`);
    } else {
      appendTerminalOutput(`❌ Failed to save code: ${result.error}`);
    }
  } catch (error) {
    console.error('Error saving code:', error);
    appendTerminalOutput(`❌ Error saving code: ${error.message}`);
  }
}

// Load Code Function
async function loadCode() {
  try {
    appendTerminalOutput('⏳ Checking if editor is ready...');
    
    // Wait for Monaco editor to be ready
    if (!await waitForEditor()) {
      appendTerminalOutput('❌ Editor not ready. Please wait a moment and try again.');
      return;
    }
    
    appendTerminalOutput('✅ Editor is ready');
    
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
        appendTerminalOutput(`✅ Code loaded successfully from: ${result.filePath}`);
        // Update the current language
        setCurrentLanguage(result.language || language);
      } else {
        appendTerminalOutput(`⚠️ Editor not ready. Please try again.`);
      }
    } else {
      appendTerminalOutput(`❌ Failed to load code: ${result.error}`);
    }
  } catch (error) {
    console.error('Error loading code:', error);
    appendTerminalOutput(`❌ Error loading code: ${error.message}`);
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
  
  appendTerminalOutput('🔍 Editor debug info logged to console');
};

// Listen for editor ready signal from Monaco iframe
window.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'editorReady') {
    console.log('✅ Monaco editor signaled ready');
    appendTerminalOutput('✅ Monaco editor is ready');
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

