let workspace;
let terminalVisible = false;
let isResizing = false;
let startY = 0;
let startHeight = 0;

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

workspace.registerButtonCallback('CREATE_VARIABLE', function(button) {
  Blockly.Variables.createVariableButtonHandler(button.getTargetWorkspace());
});

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
    if (!Blockly.Python) throw new Error('Python generator missing');
    code = Blockly.Python.workspaceToCode(workspace);
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
  if (typeof window.setCurrentLanguage === 'function') window.setCurrentLanguage('python');
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
});


