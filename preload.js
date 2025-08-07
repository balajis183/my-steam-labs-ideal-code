const { contextBridge, ipcRenderer } = require('electron');

// Expose API for compile/save/etc. under electronAPI
contextBridge.exposeInMainWorld('electronAPI', {
  // Serial Port Management
  listSerialPorts: () => ipcRenderer.invoke('list-serial-ports'),
  openSerialPort: (portPath, baudRate) => ipcRenderer.invoke('open-serial-port', portPath, baudRate),
  closeSerialPort: () => ipcRenderer.invoke('close-serial-port'),
  
  // Multi-Language Compile Functions
  compilePython: (code) => ipcRenderer.invoke('compile-python', code),
  compileJavaScript: (code) => ipcRenderer.invoke('compile-javascript', code),
  compileCpp: (code) => ipcRenderer.invoke('compile-cpp', code),
  compileC: (code) => ipcRenderer.invoke('compile-c', code),
  
  // Multi-Language Upload Functions
  uploadPython: (code, port) => ipcRenderer.invoke('upload-python', code, port),
  uploadJavaScript: (code, port) => ipcRenderer.invoke('upload-javascript', code, port),
  uploadCpp: (code, port) => ipcRenderer.invoke('upload-cpp', code, port),
  uploadC: (code, port) => ipcRenderer.invoke('upload-c', code, port),
  
  // Multi-Language Run Functions
  runPython: (code, port) => ipcRenderer.invoke('run-python', code, port),
  runJavaScript: (code) => ipcRenderer.invoke('run-javascript', code),
  runCpp: (code) => ipcRenderer.invoke('run-cpp', code),
  runC: (code) => ipcRenderer.invoke('run-c', code),
  
  // Save Code
  saveCode: (code, language) => ipcRenderer.invoke('save-code', code, language),
  
  // Board Status
  checkBoard: () => ipcRenderer.invoke('check-board'),
  
  // Terminal Output
  terminalOutput: (message) => ipcRenderer.invoke('terminal-output', message),
  
  // Event Listeners
  onSerialData: (callback) => {
    const listener = (event, data) => callback(data);
    ipcRenderer.on('serial-data', listener);
    return () => ipcRenderer.removeListener('serial-data', listener);
  },
  
  onTerminalOutput: (callback) => {
    const listener = (event, data) => callback(data);
    ipcRenderer.on('terminal-output', listener);
    return () => ipcRenderer.removeListener('terminal-output', listener);
  },
  
  onReopenPort: (callback) => {
    const listener = (event, port) => callback(port);
    ipcRenderer.on('reopen-port', listener);
    return () => ipcRenderer.removeListener('reopen-port', listener);
  }
});

// Expose advanced features like code generation and firmware under electron
contextBridge.exposeInMainWorld('electron', {
  generateCode: (data) => ipcRenderer.send('generateCode', data),

  onGeneratedCode: (callback) => {
    const listener = (event, code) => callback(code);
    ipcRenderer.on('generatedCode', listener);
    return () => ipcRenderer.removeListener('generatedCode', listener);
  },

  flashCode: (port) => ipcRenderer.invoke('flash-code', port),
  listSerialPorts: () => ipcRenderer.invoke('list-serial-ports'),

  uploadFirmware: (port, filePath) => ipcRenderer.invoke('upload-firmware', { port, filePath })
    .catch(err => console.error('Error uploading firmware:', err)),

  checkBoard: () => ipcRenderer.invoke('check-board')
});
