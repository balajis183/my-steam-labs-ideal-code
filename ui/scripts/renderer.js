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

// Get current code from Monaco editor
function getCurrentCode() {
  const editorWindow = document.getElementById('monacoEditor').contentWindow;
  console.log('🔍 Editor window:', editorWindow);
  console.log('🔍 Editor window methods:', Object.getOwnPropertyNames(editorWindow || {}));
  
  if (editorWindow && editorWindow.getEditorValue) {
    const code = editorWindow.getEditorValue();
    console.log('🔍 Retrieved code length:', code ? code.length : 0);
    console.log('🔍 Code preview:', code ? code.substring(0, 200) : 'No code');
    return code;
  }
  
  console.log('❌ Could not get code from editor');
  return '';
}

// Get current language from Monaco editor or last generated language
function getCurrentLanguage() {
  const editorWindow = document.getElementById('monacoEditor').contentWindow;
  if (editorWindow && editorWindow.getEditorLanguage) {
    const editorLang = editorWindow.getEditorLanguage();
    if (editorLang && editorLang !== 'javascript') {
      return editorLang;
    }
  }
  // Fallback to last generated language
  return lastGeneratedLanguage;
}

// Set the current language when code is generated
function setCurrentLanguage(language) {
  lastGeneratedLanguage = language;
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
  
  return hardwareModules.some(module => code.includes(module));
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
  const langSelect = document.getElementById('languageSelect');
  if (langSelect) {
    const selected = langSelect.value;
    if (selected === 'auto') {
      // Auto-detect language
      return detectLanguageFromCode(code);
    } else if (selected === 'python' || selected === 'cpp' || selected === 'javascript' || selected === 'c') {
      return selected;
    }
  }
  // Fallback to auto-detect
  return detectLanguageFromCode(code);
}

// Enhanced language detection function
function detectLanguageFromCode(code) {
  if (!code || !code.trim()) {
    return lastGeneratedLanguage || 'python';
  }
  
  // C++ detection (more comprehensive)
  if (code.includes('#include') || 
      code.includes('int main()') || 
      code.includes('void main()') ||
      code.includes('void setup()') || 
      code.includes('void loop()') ||
      code.includes('Arduino.h') ||
      code.includes('ESP32') ||
      code.includes('std::cout') ||
      code.includes('std::cin') ||
      code.includes('namespace std') ||
      code.includes('class ') ||
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
    return 'cpp';
  }
  
  // C detection
  if (code.includes('#include <stdio.h>') || 
      code.includes('printf(') || 
      code.includes('scanf(') ||
      code.includes('main()') ||
      code.includes('malloc(') ||
      code.includes('free(')) {
    return 'c';
  }
  
  // Python detection
  if (code.includes('import ') || 
      code.includes('print(') || 
      code.includes('def ') ||
      code.includes('if __name__') ||
      code.includes('class ') ||
      code.includes('try:') ||
      code.includes('except:') ||
      code.includes('with open(')) {
    return 'python';
  }
  
  // JavaScript detection
  if (code.includes('function') || 
      code.includes('console.log') || 
      code.includes('var ') || 
      code.includes('let ') ||
      code.includes('const ') ||
      code.includes('=>') ||
      code.includes('async ') ||
      code.includes('await ')) {
    return 'javascript';
  }
  
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
  // Auto-detect language first
  autoDetectLanguageFromCode();
  const language = getSelectedLanguage(code);
  setCurrentLanguage(language);
  
  // Debug: Show what language was detected
  console.log(`🔍 Code content preview: ${code.substring(0, 100)}...`);
  console.log(`🎯 Detected language: ${language}`);
  console.log(`📝 Language dropdown value: ${document.getElementById('languageSelect')?.value}`);
  
  if (!code.trim()) {
    appendTerminalOutput('❌ No code to compile. Please generate some code first.');
    return;
  }
  
  // Automatically show terminal when compiling
  showTerminal();
  
  appendTerminalOutput(`🔄 Compiling ${language} code...`);
  
  try {
    let result;
    switch (language) {
      case 'python':
        result = await window.electronAPI.compilePython(code);
        break;
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
    return;
  }
  
  // Check if Python code needs hardware for upload
  if (language === 'python') {
    const needsHardware = needsHardwarePort(code);
    
    if (needsHardware && !currentPort) {
      appendTerminalOutput('❌ No port selected. Please select a port first.');
      appendTerminalOutput('💡 This code uses hardware-specific modules and needs to be uploaded to hardware.');
      return;
    }
    
    if (!needsHardware) {
      appendTerminalOutput('💡 This is standard Python code. Use "Run" instead of "Upload" to execute locally.');
      return;
    }
  } else if (language === 'cpp') {
    const needsHardware = needsHardwarePortCpp(code);
    
    if (needsHardware && !currentPort) {
      appendTerminalOutput('❌ No port selected. Please select a port first.');
      appendTerminalOutput('💡 This C++ code uses hardware-specific modules (Arduino/ESP32) and needs to be uploaded to hardware.');
      return;
    }
    
    if (!needsHardware) {
      appendTerminalOutput('💡 This is standard C++ code. Use "Run" instead of "Upload" to execute locally.');
      return;
    }
  } else if (!currentPort) {
    // For other languages, still require port
    appendTerminalOutput('❌ No port selected. Please select a port first.');
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
    } else {
      console.log('✅ Standard Python code, will run locally');
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
    } else {
      console.log('✅ Standard C++ code, will run locally');
    }
  }
  
  appendTerminalOutput(`▶️ Running ${language} code...`);
  
  try {
    let result;
    switch (language) {
      case 'python':
        result = await window.electronAPI.runPython(code, currentPort);
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

// Serial port management
async function refreshPorts() {
  const portSelect = document.getElementById('portSelect');
  if (!portSelect) {
    console.error('❌ #portSelect element not found');
    return;
  }

  console.log('🔄 Refreshing available ports...');
  const ports = await window.electronAPI.listSerialPorts();
  console.log('🔌 Ports found:', ports);

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
      option.text = `${port.path} (${port.manufacturer || 'Unknown'})`;
      portSelect.appendChild(option);
      console.log(`  - ${port.path} (${port.manufacturer || 'Unknown'})`);
    });
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
  const result = await window.electronAPI.openSerialPort(portPath, 115200);
  
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

// Event listeners for serial data
window.electronAPI.onSerialData((data) => {
  appendTerminalOutput(`📡 Serial: ${data}`);
});

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

// Board status check
function setupBoardStatusCheck() {
  const checkConnectionBtn = document.getElementById('checkConnectionBtn');
  const statusIndicator = document.getElementById('connection-status');
  
  if (checkConnectionBtn && statusIndicator) {
    checkConnectionBtn.addEventListener('click', async () => {
      statusIndicator.style.backgroundColor = 'grey';
      try {
        const status = await window.electronAPI.checkBoard();
        console.log('🟡 Board status:', status);
        
        if (status === 'connected') {
          statusIndicator.style.backgroundColor = 'green';
        } else if (status === 'disconnected') {
          statusIndicator.style.backgroundColor = 'red';
        } else {
          statusIndicator.style.backgroundColor = 'grey';
        }
      } catch (error) {
        console.error('❌ Board status check failed:', error);
        statusIndicator.style.backgroundColor = 'grey';
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
    const code = getCurrentCode();
    const language = getCurrentLanguage();
    
    // if (!code || code.trim() === '') {
    //   alert('No code to save. Please generate some code first.');
    //   return;
    // }
    
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
    const language = getCurrentLanguage();
    const result = await window.electronAPI.loadCode(language);
    
    if (result.success) {
      // Set the loaded code in the Monaco editor
      const editorWindow = document.getElementById('monacoEditor').contentWindow;
      if (editorWindow && editorWindow.setEditorValue) {
        editorWindow.setEditorValue(result.code);
        appendTerminalOutput(`✅ Code loaded successfully from: ${result.filePath}`);
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

// Wait for portSelect after navbar loads
waitForElement('portSelect', () => {
  setupPortSelection();
  refreshPorts();
});

// Wait for checkConnectionBtn after navbar loads
waitForElement('checkConnectionBtn', () => {
  setupBoardStatusCheck();
});

