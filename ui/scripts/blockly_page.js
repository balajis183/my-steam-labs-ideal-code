let workspace;
let terminalVisible = false;
let isResizing = false;
let startY = 0;
let startHeight = 0;

// Custom prompt function for Electron (Blockly v12 doesn't support browser prompt)
// MUST be defined BEFORE Blockly loads
function customPrompt(message, defaultValue) {
  return new Promise((resolve) => {
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; align-items: center; justify-content: center;';
    
    // Create dialog box
    const dialog = document.createElement('div');
    dialog.style.cssText = 'background: white; padding: 20px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.3); min-width: 300px;';
    
    // Create message
    const msg = document.createElement('div');
    msg.textContent = message;
    msg.style.cssText = 'margin-bottom: 15px; font-size: 14px;';
    dialog.appendChild(msg);
    
    // Create input field
    const input = document.createElement('input');
    input.type = 'text';
    input.value = defaultValue || '';
    input.style.cssText = 'width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px; box-sizing: border-box; margin-bottom: 15px;';
    dialog.appendChild(input);
    
    // Create buttons container
    const buttons = document.createElement('div');
    buttons.style.cssText = 'display: flex; justify-content: flex-end; gap: 10px;';
    
    // Create OK button
    const okBtn = document.createElement('button');
    okBtn.textContent = 'OK';
    okBtn.style.cssText = 'padding: 8px 16px; background: #5A59FF; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;';
    okBtn.onclick = () => {
      const value = input.value.trim();
      document.body.removeChild(overlay);
      resolve(value || null);
    };
    
    // Create Cancel button
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.cssText = 'padding: 8px 16px; background: #ccc; color: #333; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;';
    cancelBtn.onclick = () => {
      document.body.removeChild(overlay);
      resolve(null);
    };
    
    buttons.appendChild(cancelBtn);
    buttons.appendChild(okBtn);
    dialog.appendChild(buttons);
    overlay.appendChild(dialog);
    
    // Add to page
    document.body.appendChild(overlay);
    
    // Focus input and handle Enter key
    input.focus();
    input.select();
    input.onkeydown = (e) => {
      if (e.key === 'Enter') {
        okBtn.click();
      } else if (e.key === 'Escape') {
        cancelBtn.click();
      }
    };
    
    // Close on overlay click
    overlay.onclick = (e) => {
      if (e.target === overlay) {
        cancelBtn.click();
      }
    };
  });
}

// Override Blockly's prompt function IMMEDIATELY when Blockly is available
if (typeof Blockly !== 'undefined') {
  Blockly.prompt = customPrompt;
} else {
  // Wait for Blockly to load
  const checkBlockly = setInterval(() => {
    if (typeof Blockly !== 'undefined') {
      Blockly.prompt = customPrompt;
      clearInterval(checkBlockly);
    }
  }, 50);
}

function defineCustomBlocks() {}

defineCustomBlocks();

fetch('./navbar.html')
  .then(res => res.text())
  .then(html => {
    document.getElementById('navbar-placeholder').innerHTML = html;
    requestAnimationFrame(() => {
      const navbarHeight = document.getElementById('navbar-placeholder').offsetHeight || 0;
      const topbarHeight = document.getElementById('topbar').offsetHeight || 0;
      document.getElementById('main-container').style.height = `calc(100vh - ${navbarHeight + topbarHeight}px)`;
      Blockly.svgResize(workspace);
    });
  });

workspace = Blockly.inject('blocklyDiv', {
  toolbox: document.getElementById('toolbox'),
  trashcan: true,
  scrollbars: true
});

workspace.createVariable('i_count');

// Fix Create Variable button callback - register after workspace is ready
setTimeout(() => {
  try {
    workspace.registerButtonCallback('CREATE_VARIABLE', async function(button) {
      try {
        // Get the target workspace
        let targetWorkspace = workspace;
        if (button && typeof button.getTargetWorkspace === 'function') {
          targetWorkspace = button.getTargetWorkspace();
        } else if (button && button.workspace_) {
          targetWorkspace = button.workspace_;
        }
        
        // Ensure Blockly.prompt is set to our custom function
        Blockly.prompt = customPrompt;
        
        // Use Blockly's built-in variable creation handler
        // It will now use our custom prompt function
        if (Blockly.Variables && typeof Blockly.Variables.createVariableButtonHandler === 'function') {
          Blockly.Variables.createVariableButtonHandler(targetWorkspace);
          return;
        }
        
        // Fallback: Use custom prompt directly
        const name = await customPrompt('Enter variable name:', 'item');
        if (name && name.trim()) {
          const varName = name.trim();
          targetWorkspace.createVariable(varName);
          
          // Force UI update
          if (Blockly.Events) {
            Blockly.Events.fire(new Blockly.Events.VarCreate(null, targetWorkspace, varName));
          }
        }
      } catch (error) {
        console.error('Error in Create Variable callback:', error);
        // Fallback: Use custom prompt directly
        const name = await customPrompt('Enter variable name:', 'item');
        if (name && name.trim()) {
          workspace.createVariable(name.trim());
        }
      }
    });
    console.log('[INFO] Create Variable button callback registered');
  } catch (error) {
    console.error('❌ Failed to register Create Variable callback:', error);
  }
}, 100);

window.addEventListener('resize', () => Blockly.svgResize(workspace));
Blockly.svgResize(workspace);

function sendCodeToMonaco(code, language = 'javascript') {
  const editorWindow = document.getElementById('monacoEditor').contentWindow;
  editorWindow.postMessage({ code, language }, '*');
}

function copyCode() {
  const iframe = document.querySelector('iframe');
  if (iframe && iframe.contentWindow) {
    const code = iframe.contentWindow.getEditorValue();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(code).catch(err => console.error('Failed to copy code: ', err));
    } else {
      const textArea = document.createElement('textarea');
      textArea.value = code;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try { document.execCommand('copy'); } catch (err) { console.error('Fallback copy failed: ', err); }
      document.body.removeChild(textArea);
    }
  }
}

function indent(code) {
  return code.split('\n').map(line => '  ' + line.trim()).join('\n');
}

function generateJavaScriptCode() {
  const code = Blockly.JavaScript.workspaceToCode(workspace);
  sendCodeToMonaco(code, 'javascript');
  if (typeof window.setCurrentLanguage === 'function') window.setCurrentLanguage('javascript');
}

function generatePythonCode() {
  let code = '';
  try {
    // Use enhanced code generator if available
    if (typeof window.generateEnhancedPythonCode === 'function') {
      code = window.generateEnhancedPythonCode(workspace);
      console.log('[SUCCESS] Enhanced Python code generated with fixed pin mappings');
    } else if (Blockly.Python) {
      // Fallback to standard generator
      code = Blockly.Python.workspaceToCode(workspace);
      
      // Add machine import if hardware functions are used
      if (code.includes('machine.Pin') || code.includes('machine.ADC') || code.includes('machine.PWM') || 
          code.includes('pin') && (code.includes('Pin(') || code.includes('.value('))) {
        if (!code.includes('import machine')) {
          code = 'from machine import Pin, PWM, ADC, SoftI2C\n' + code;
        }
      }
      
      // Add time import if delays are used
      if (code.includes('time.sleep') && !code.includes('import time')) {
        code = 'import time\n' + code;
      }
      
      console.warn('[WARNING] Using standard Python generator. Enhanced generator not loaded.');
    } else {
      throw new Error('Python generator missing');
    }
  } catch (err) {
    console.warn('Python generation failed, using JS->Python fallback:', err?.message || err);
    // Fallback: transform JS-ish code to Python-ish
    const js = Blockly.JavaScript.workspaceToCode(workspace);
    code = js
      .replace(/console\.log/g, 'print')
      .replace(/;\s*$/gm, '')
      .replace(/\b(var|let|const)\s+/g, '')
      .replace(/function\s+(\w+)\s*\(([^)]*)\)\s*\{/g, 'def $1($2):')
      .replace(/\{\s*$/gm, ':')
      .replace(/\}/g, '')
      .replace(/==/g, '==')
      .replace(/!=/g, '!=');
  }
  sendCodeToMonaco(code, 'python');
  
  // CRITICAL: Set language to Python and update dropdown
  if (typeof window.setCurrentLanguage === 'function') {
    window.setCurrentLanguage('python');
  }
  
  // Also update dropdown directly to ensure it's set
  const langSelect = document.getElementById('languageSelect');
  if (langSelect) {
    langSelect.value = 'python';
    console.log('[INFO] Language dropdown set to Python after code generation');
  }
  
  // Show message that Python doesn't need compilation
  console.log('💡 Generated MicroPython code - use Upload or Run, not Compile');
}

// Real-time conversion of Blockly blocks into Python
function setupRealTimePythonConversion() {
  if (!workspace) return;
  
  // Listen for workspace changes
  workspace.addChangeListener(function(event) {
    // Only regenerate on meaningful changes (not just UI updates)
    if (event.type === Blockly.Events.BLOCK_CREATE ||
        event.type === Blockly.Events.BLOCK_DELETE ||
        event.type === Blockly.Events.BLOCK_CHANGE ||
        event.type === Blockly.Events.BLOCK_MOVE ||
        event.type === Blockly.Events.VAR_CREATE ||
        event.type === Blockly.Events.VAR_DELETE ||
        event.type === Blockly.Events.VAR_RENAME) {
      
      // Debounce: wait a bit before regenerating
      if (window.pythonRegenerateTimeout) {
        clearTimeout(window.pythonRegenerateTimeout);
      }
      
      window.pythonRegenerateTimeout = setTimeout(() => {
        try {
          if (Blockly.Python) {
            let code = Blockly.Python.workspaceToCode(workspace);
            
            // Add machine import if hardware functions are used
            if (code.includes('machine.Pin') || code.includes('machine.ADC') || code.includes('machine.PWM') || 
                code.includes('pin') && (code.includes('Pin(') || code.includes('.value('))) {
              // Check if import is already there
              if (!code.includes('import machine')) {
                code = 'import machine\n' + code;
              }
            }
            
            sendCodeToMonaco(code, 'python');
            
            // CRITICAL: Set language to Python and update dropdown
            if (typeof window.setCurrentLanguage === 'function') {
              window.setCurrentLanguage('python');
            }
            
            // Also update dropdown directly to ensure it's set
            const langSelect = document.getElementById('languageSelect');
            if (langSelect) {
              langSelect.value = 'python';
            }
          }
        } catch (err) {
          console.warn('Real-time Python conversion error:', err);
        }
      }, 300); // 300ms debounce
    }
  });
}

function generateCppCode() {
  let core = '';
  try {
    if (!Blockly.Cpp) throw new Error('Cpp generator missing');
    core = Blockly.Cpp.workspaceToCode(workspace);
  } catch (err) {
    console.warn('C++ generation failed, using JS fallback:', err?.message || err);
    core = Blockly.JavaScript.workspaceToCode(workspace);
  }
  const fullCode = `#include <Arduino.h>
#include "BluetoothSerial.h"

#if !defined(CONFIG_BT_ENABLED) || !defined(CONFIG_BLUEDROID_ENABLED)
#error Bluetooth is not enabled! Please run 'make menuconfig' to enable it
#endif

BluetoothSerial btSerial;

void setup() {
  Serial.begin(115200);
}

void loop() {
${indent(core)}
  if (Serial.available()) {
    btSerial.write(Serial.read());
  }
  if (btSerial.available()) {
    Serial.write(btSerial.read());
  }
}`;
  sendCodeToMonaco(fullCode, 'cpp');
  if (typeof window.setCurrentLanguage === 'function') window.setCurrentLanguage('cpp');
}

function generateCCode() {
  let core = '';
  try {
    if (!Blockly.C) throw new Error('C generator missing');
    core = Blockly.C.workspaceToCode(workspace);
  } catch (err) {
    console.warn('C generation failed, using JS fallback:', err?.message || err);
    core = Blockly.JavaScript.workspaceToCode(workspace);
  }
  const fullCode = `#include <stdio.h>
int main() {
${indent(core)}
  return 0;
}`;
  sendCodeToMonaco(fullCode, 'c');
  if (typeof window.setCurrentLanguage === 'function') window.setCurrentLanguage('c');
}

function toggleTerminal() {
  const terminalPanel = document.getElementById('terminal-panel');
  const toggleBtn = document.getElementById('terminal-toggle');
  if (!terminalPanel || !toggleBtn) return;
  if (terminalVisible) {
    terminalPanel.style.display = 'none';
    toggleBtn.textContent = 'Show Terminal';
    terminalVisible = false;
  } else {
    terminalPanel.style.display = 'flex';
    toggleBtn.textContent = 'Hide Terminal';
    terminalVisible = true;
  }
  setTimeout(() => typeof Blockly !== 'undefined' && Blockly.svgResize(workspace), 100);
}

function setupTerminalResize() {
  const resizeHandle = document.getElementById('terminal-resize-handle');
  const terminalPanel = document.getElementById('terminal-panel');
  if (!resizeHandle || !terminalPanel) return;
  resizeHandle.addEventListener('mousedown', (e) => {
    isResizing = true;
    startY = e.clientY;
    startHeight = terminalPanel.offsetHeight;
    document.body.style.cursor = 'ns-resize';
    e.preventDefault();
  });
  document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;
    const deltaY = startY - e.clientY;
    const newHeight = startHeight + deltaY;
    if (newHeight > 100 && newHeight < (window.innerHeight * 0.8)) {
      terminalPanel.style.height = `${newHeight}px`;
      if (typeof Blockly !== 'undefined') Blockly.svgResize(workspace);
    }
  });
  document.addEventListener('mouseup', () => {
    if (isResizing) {
      isResizing = false;
      document.body.style.cursor = '';
      if (typeof Blockly !== 'undefined') Blockly.svgResize(workspace);
    }
  });
}

function clearTerminal() {
  const terminalOutput = document.getElementById('terminal-output');
  if (terminalOutput) terminalOutput.textContent = '';
}

function saveBlocksXML() {
  const xml = Blockly.Xml.workspaceToDom(workspace);
  const xmlText = Blockly.Xml.domToText(xml);
  const blob = new Blob([xmlText], { type: 'text/xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'blockly_program.xml';
  a.click();
  URL.revokeObjectURL(url);
}

function loadBlocksXML() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.xml';
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const xmlText = ev.target.result;
        const xml = Blockly.Xml.textToDom(xmlText);
        workspace.clear();
        Blockly.Xml.domToWorkspace(xml, workspace);
      } catch (error) {
        console.error('Error loading file: ' + error.message);
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

window.toggleTerminal = toggleTerminal;
window.clearTerminal = clearTerminal;
window.saveBlocksXML = saveBlocksXML;
window.loadBlocksXML = loadBlocksXML;

document.addEventListener('DOMContentLoaded', () => {
  setupTerminalResize();
  // Setup real-time Python conversion after workspace is ready
  setTimeout(() => {
    if (workspace) {
      setupRealTimePythonConversion();
    }
  }, 500);
});


