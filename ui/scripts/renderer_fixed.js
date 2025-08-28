// Fixed Save and Load Code Functions

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

// Save Code Function
async function saveCode() {
  try {
    appendTerminalOutput('⏳ Checking if editor is ready...');
    
    // Wait for Monaco editor to be ready
    if (!await waitForEditor()) {
      appendTerminalOutput('❌ Editor not ready. Please wait a moment and try again.');
      return;
    }
    
    appendTerminalOutput('✅ Editor is ready');

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
window.waitForEditor = waitForEditor;
window.isEditorReady = isEditorReady;
