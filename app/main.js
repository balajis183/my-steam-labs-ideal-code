const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec, spawn } = require('child_process');
const { SerialPort } = require('serialport');
const os = require('os');

let mainWindow;
let currentPort = null;

// Utility: wait for ms
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Utility: find Python executable path dynamically
async function findPythonPath() {
  const possiblePaths = [
    'python',
    'python3',
    'py',
    'C:\\Program Files\\Python313\\python.exe',
    'C:\\Program Files\\Python312\\python.exe',
    'C:\\Program Files\\Python311\\python.exe',
    'C:\\Program Files\\Python310\\python.exe',
    'C:\\Program Files\\Python39\\python.exe',
    'C:\\Users\\' + process.env.USERNAME + '\\AppData\\Local\\Programs\\Python\\Python313\\python.exe',
    'C:\\Users\\' + process.env.USERNAME + '\\AppData\\Local\\Programs\\Local\\Python\\Python312\\python.exe',
    'C:\\Users\\' + process.env.USERNAME + '\\AppData\\Local\\Programs\\Python\\Python311\\python.exe',
    'C:\\Users\\' + process.env.USERNAME + '\\AppData\\Local\\Programs\\Python\\Python310\\python.exe',
    'C:\\Users\\' + process.env.USERNAME + '\\AppData\\Local\\Programs\\Python\\Python39\\python.exe'
  ];

  for (const pythonPath of possiblePaths) {
    try {
      const result = await new Promise((resolve) => {
        exec(`"${pythonPath}" --version`, { timeout: 5000 }, (err, stdout, stderr) => {
          if (!err && stdout) {
            resolve({ success: true, path: pythonPath, version: stdout.trim() });
          } else {
            resolve({ success: false, path: pythonPath, error: err?.message || stderr });
          }
        });
      });
      
      if (result.success) {
        console.log(`✅ Found Python: ${result.path} - ${result.version}`);
        return result.path;
      }
    } catch (error) {
      console.log(`❌ Python path ${pythonPath} failed: ${error.message}`);
    }
  }
  
  throw new Error('No Python installation found. Please install Python and ensure it\'s in your PATH.');
}

// Utility: check and install mpremote if needed
async function ensureMpremoteInstalled(pythonPath) {
  try {
    console.log('🔍 Checking if mpremote is installed...');
    
    const result = await new Promise((resolve) => {
      exec(`"${pythonPath}" -m mpremote --version`, { timeout: 10000 }, (err, stdout, stderr) => {
        if (!err && stdout) {
          resolve({ success: true, version: stdout.trim() });
        } else {
          resolve({ success: false, error: err?.message || stderr });
        }
      });
    });
    
    if (result.success) {
      console.log(`✅ mpremote is installed: ${result.version}`);
      return true;
    }
    
    console.log('📦 mpremote not found, installing...');
    safeSend('terminal-output', '📦 Installing mpremote...');
    
    const installResult = await new Promise((resolve) => {
      exec(`"${pythonPath}" -m pip install mpremote`, { timeout: 60000 }, (err, stdout, stderr) => {
        if (!err) {
          resolve({ success: true, output: stdout });
        } else {
          resolve({ success: false, error: err?.message || stderr });
        }
      });
    });
    
    if (installResult.success) {
      console.log('✅ mpremote installed successfully');
      safeSend('terminal-output', '✅ mpremote installed successfully');
      return true;
    } else {
      console.error('❌ Failed to install mpremote:', installResult.error);
      safeSend('terminal-output', `❌ Failed to install mpremote: ${installResult.error}`);
      return false;
    }
  } catch (error) {
    console.error('❌ Error checking/installing mpremote:', error.message);
    safeSend('terminal-output', `❌ Error checking/installing mpremote: ${error.message}`);
    return false;
  }
}

// Utility: check if port is available
async function isPortAvailable(portPath) {
  return new Promise((resolve) => {
    try {
      console.log(`🔍 Testing port availability for ${portPath}...`);
      const testPort = new SerialPort({ 
        path: portPath, 
        baudRate: 115200, 
        autoOpen: false,
        timeout: 1000
      });
      
      testPort.open((err) => {
        if (err) {
          console.log(`❌ Port ${portPath} is not available: ${err.message}`);
          try {
            testPort.destroy();
          } catch (destroyErr) {
            console.log(`Warning: Error destroying test port: ${destroyErr.message}`);
          }
          resolve(false);
        } else {
          console.log(`✅ Port ${portPath} is available`);
          testPort.close((closeErr) => {
            try {
              testPort.destroy();
            } catch (destroyErr) {
              console.log(`Warning: Error destroying test port: ${destroyErr.message}`);
            }
            resolve(true);
          });
        }
      });
    } catch (error) {
      console.log(`❌ Error creating test port for ${portPath}: ${error.message}`);
      resolve(false);
    }
  });
}

// Utility: best-effort COM port release on Windows and wait for readiness
async function releaseComPortIfNeeded(portPath) {
  try {
    console.log(`🔄 Releasing port ${portPath}...`);
    
    // Close our open handle if any
    if (currentPort && currentPort.isOpen) {
      console.log('🔄 Closing current port...');
      try {
        await new Promise(res => currentPort.close(() => res()));
        currentPort.destroy();
        currentPort = null;
      } catch (closeErr) {
        console.log(`Warning: Error closing current port: ${closeErr.message}`);
      }
    }

    // Kill potential conflicting processes (Python/mpremote) silently
    if (os.platform() === 'win32') {
      try {
        exec('taskkill /f /im "python.exe" 2>nul', () => {});
        exec('taskkill /f /im "mpremote.exe" 2>nul', () => {});
      } catch (killErr) {
        console.log(`Warning: Error killing processes: ${killErr.message}`);
      }
    }

    // Give the OS time to actually free the handle
    await delay(2000);
    console.log(`✅ Port ${portPath} released successfully`);
  } catch (error) {
    console.error(`❌ Error releasing port ${portPath}:`, error.message);
  }
}

// Utility: capture serial output during mpremote execution
async function captureSerialOutput(portPath, command, timeoutMs = 30000) {
  return new Promise(async (resolve) => {
    let output = '';
    let commandCompleted = false;
    let serialPort = null;
    
    try {
      // Open serial port to capture ESP32 output
      serialPort = new SerialPort({ 
        path: portPath, 
        baudRate: 115200, 
        autoOpen: false 
      });
      
      // Set up serial data handler
      serialPort.on('data', (data) => {
        const dataStr = data.toString();
        output += dataStr;
        safeSend('serial-data', dataStr);
      });
      
      // Open serial port
      await new Promise((res, rej) => {
        serialPort.open((err) => {
          if (err) rej(err);
          else res();
        });
      });
      
      // Wait a moment for port to stabilize
      await delay(1000);
      
      // Execute the mpremote command
      exec(command, { timeout: timeoutMs }, (err, stdout, stderr) => {
        commandCompleted = true;
        
        if (err) {
          safeSend('serial-data', `\n[Command Error]: ${stderr || stdout || err.message}\n`);
          resolve({ success: false, error: stderr || stdout || err.message, output });
        } else {
          safeSend('serial-data', `\n[Command Output]: ${stdout}\n`);
          resolve({ success: true, stdout: stdout, output });
        }
      });
      
      // Set timeout to close serial port
      setTimeout(() => {
        if (!commandCompleted) {
          commandCompleted = true;
          resolve({ success: false, error: 'Command timed out', output });
        }
      }, timeoutMs);
      
    } catch (error) {
      commandCompleted = true;
      safeSend('serial-data', `\n[Execution Error]: ${error.message}\n`);
      resolve({ success: false, error: error.message, output });
    } finally {
      // Clean up serial port
      if (serialPort && serialPort.isOpen) {
        try {
          serialPort.close();
          serialPort.destroy();
        } catch (closeErr) {
          console.log(`Warning: Error closing serial port: ${closeErr.message}`);
        }
      }
    }
  });
}

// Utility: run a shell command with retries and backoff
async function runWithRetries(command, attempts = 3, backoffMs = 1500, timeoutMs = 30000) {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    console.log(`🔄 Attempt ${attempt}/${attempts}: ${command}`);
    
    const result = await new Promise(resolve => {
      exec(command, { timeout: timeoutMs }, (err, stdout, stderr) => {
        resolve({ err, stdout, stderr });
      });
    });

    if (!result.err) {
      console.log(`✅ Command succeeded on attempt ${attempt}`);
      return { success: true, stdout: result.stdout };
    }

    console.log(`❌ Attempt ${attempt} failed: ${result.err.message || result.stderr}`);
    
    if (attempt < attempts) {
      console.log(`⏳ Waiting ${backoffMs * attempt}ms before retry...`);
      await delay(backoffMs * attempt);
    } else {
      return { success: false, error: result.stderr || result.err?.message || 'Unknown error' };
    }
  }
}

function safeSend(channel, ...args) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  try { mainWindow.webContents.send(channel, ...args); }
  catch (e) { console.error(`Error sending to ${channel}:`, e); }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, '..', 'ui', 'assets', 'logo.jpg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  
  // Load the loading screen first
  mainWindow.loadFile(path.join(__dirname, '..', 'ui', 'pages', 'loading.html'));
  
  // Listen for navigation to main app
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    if (navigationUrl.includes('index.html')) {
      // Allow navigation to main app
      console.log('🔄 Navigating to main application...');
    }
  });
  
  mainWindow.on('closed', () => {
    if (currentPort && currentPort.isOpen) currentPort.close();
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ---- Serial Port Management ----
ipcMain.handle('list-serial-ports', async () => {
  try {
    const ports = await SerialPort.list();
    return ports;
  } catch (err) {
    console.error("SerialPort.list() error:", err);
    return [];
  }
});

ipcMain.handle('open-serial-port', async (_e, portPath, baudRate = 115200) => {
  try {
    if (currentPort && currentPort.isOpen) { 
      await new Promise(r => currentPort.close(r)); 
      currentPort = null; 
    }
    currentPort = new SerialPort({ path: portPath, baudRate, autoOpen: false });
    await new Promise((res, rej) => currentPort.open(err => err ? rej(err) : res()));
    currentPort.on('data', d => safeSend('serial-data', d.toString()));
    currentPort.on('error', e => safeSend('serial-data', `\n[Serial Error]: ${e.message}\n`));
    currentPort.on('close', () => safeSend('serial-data', `\n[Serial Port Closed]\n`));
    return { success: true };
  } catch (err) { 
    return { success: false, error: err.message }; 
  }
});

ipcMain.handle('close-serial-port', async () => {
  try {
    if (currentPort && currentPort.isOpen) { 
      await new Promise(r => currentPort.close(r)); 
      currentPort = null; 
    }
    return { success: true };
  } catch (err) { 
    return { success: false, error: err.message }; 
  }
});

// ---- Multi-Language Compile Functions ----
ipcMain.handle('compile-python', async (_e, code) => {
  try {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'python-compile-'));
    const pyPath = path.join(tmpDir, 'main.py');
    fs.writeFileSync(pyPath, code, 'utf-8');
    
    // For MicroPython, we'll just validate the syntax
    return await new Promise(async (res) => {
      try {
        // Find Python path dynamically
        const pythonPath = await findPythonPath();
        
        exec(`"${pythonPath}" -m py_compile "${pyPath}"`, (err, out, errOut) => {
          if (err) {
            res({ success: false, error: `Python compilation failed: ${errOut || out || err.message}` });
          } else {
            res({ success: true, output: 'Python syntax validation successful', compiledPath: pyPath });
          }
        });
      } catch (pythonError) {
        res({ success: false, error: `Python not found: ${pythonError.message}` });
      }
    });
  } catch (err) { 
    return { success: false, error: err.message }; 
  }
});

ipcMain.handle('compile-javascript', async (_e, code) => {
  try {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'js-compile-'));
    const jsPath = path.join(tmpDir, 'main.js');
    fs.writeFileSync(jsPath, code, 'utf-8');
    
    return await new Promise(res => {
      exec(`node "${jsPath}"`, (err, out, errOut) => {
        if (err) res({ success: false, error: errOut || out });
        else res({ success: true, output: out + errOut, compiledPath: jsPath });
      });
    });
  } catch (err) { 
    return { success: false, error: err.message }; 
  }
});

ipcMain.handle('compile-cpp', async (_e, code) => {
  try {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cpp-compile-'));
    const cppPath = path.join(tmpDir, 'main.cpp');
    const exePath = path.join(tmpDir, 'main.exe');
    fs.writeFileSync(cppPath, code, 'utf-8');
    
    return await new Promise(res => {
      exec(`g++ "${cppPath}" -o "${exePath}"`, (err, out, errOut) => {
        if (err) res({ success: false, error: errOut || out });
        else res({ success: true, output: out + errOut, compiledPath: exePath });
      });
    });
  } catch (err) { 
    return { success: false, error: err.message }; 
  }
});

ipcMain.handle('compile-c', async (_e, code) => {
  try {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'c-compile-'));
    const cPath = path.join(tmpDir, 'main.c');
    const exePath = path.join(tmpDir, 'main.exe');
    fs.writeFileSync(cPath, code, 'utf-8');
    
    return await new Promise(res => {
      exec(`gcc "${cPath}" -o "${exePath}"`, (err, out, errOut) => {
        if (err) res({ success: false, error: errOut || out });
        else res({ success: true, output: out + errOut, compiledPath: exePath });
      });
    });
  } catch (err) { 
    return { success: false, error: err.message }; 
  }
});

// ---- Multi-Language Upload Functions ----
ipcMain.handle('upload-python', async (_e, code, port) => {
  try {
    if (!port) {
      return { success: false, error: 'No port specified for upload' };
    }
    
    console.log('📤 Starting Python upload...');
    
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'python-upload-'));
    const pyPath = path.join(tmpDir, 'main.py');
    fs.writeFileSync(pyPath, code, 'utf-8');
    
    return await new Promise(async (res) => {
      try {
        // Find Python path dynamically
        const pythonPath = await findPythonPath();
        
        // Ensure mpremote is installed
        const mpremoteReady = await ensureMpremoteInstalled(pythonPath);
        if (!mpremoteReady) {
          res({ success: false, error: 'mpremote installation failed' });
          return;
        }
        
        // Simple port release
        await releaseComPortIfNeeded(port);
        
        // Upload with simple error handling
        safeSend('terminal-output', '🚀 Uploading code to ESP32...');
        
                 const uploadCommand = `"${pythonPath}" -m mpremote connect ${port} fs cp "${pyPath.replace(/\\/g, '/')}" :main.py`;
        console.log(`Executing: ${uploadCommand}`);
        
        const uploadResult = await captureSerialOutput(port, uploadCommand, 15000);
        if (!uploadResult.success) {
          console.error('❌ Upload failed:', uploadResult.error);
          safeSend('terminal-output', `❌ Upload failed: ${uploadResult.error}`);
          res({ success: false, error: uploadResult.error });
          return;
        }
        
        console.log('✅ Upload successful');
        safeSend('terminal-output', '✅ Upload successful!');
        
        // Small delay to ensure port stability
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Now execute the uploaded code and capture output
        safeSend('terminal-output', '🚀 Executing uploaded code...');
        const execCommand = `"${pythonPath}" -m mpremote connect ${port} exec "exec(open('main.py').read())"`;
        console.log(`Executing: ${execCommand}`);
        
        const execResult = await captureSerialOutput(port, execCommand, 30000);
        if (execResult.success) {
          safeSend('terminal-output', '📋 Code execution output:');
          safeSend('terminal-output', execResult.stdout || 'No output');
          res({ success: true, output: execResult.stdout || 'No output' });
        } else {
          safeSend('terminal-output', `❌ Code execution failed: ${execResult.error}`);
          res({ success: false, error: execResult.error });
        }
      } catch (pythonError) {
        safeSend('terminal-output', `❌ Python not found: ${pythonError.message}`);
        res({ success: false, error: `Python not found: ${pythonError.message}` });
      }
    });
  } catch (err) {
    console.error('❌ Upload error:', err.message);
    return { success: false, error: err.message }; 
  }
});

ipcMain.handle('upload-javascript', async (_e, code, port) => {
  try {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'js-upload-'));
    const jsPath = path.join(tmpDir, 'main.js');
    fs.writeFileSync(jsPath, code, 'utf-8');
    
    return await new Promise(res => {
      exec(`node "${jsPath}"`, (err, out, errOut) => {
        safeSend('terminal-output', out + errOut);
        if (err) res({ success: false, error: out + errOut });
        else res({ success: true, output: out });
      });
    });
  } catch (err) { 
    return { success: false, error: err.message }; 
  }
});

ipcMain.handle('upload-cpp', async (_e, code, port) => {
  try {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cpp-upload-'));
    const cppPath = path.join(tmpDir, 'main.cpp');
    const exePath = path.join(tmpDir, 'main.exe');
    fs.writeFileSync(cppPath, code, 'utf-8');
    
    return await new Promise(res => {
      exec(`g++ "${cppPath}" -o "${exePath}" && "${exePath}"`, (err, out, errOut) => {
        safeSend('terminal-output', out + errOut);
        if (err) res({ success: false, error: out + errOut });
        else res({ success: true, output: out });
      });
    });
  } catch (err) { 
    return { success: false, error: err.message }; 
  }
});

ipcMain.handle('upload-c', async (_e, code, port) => {
  try {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'c-upload-'));
    const cPath = path.join(tmpDir, 'main.c');
    const exePath = path.join(tmpDir, 'main.exe');
    fs.writeFileSync(cPath, code, 'utf-8');
    
    return await new Promise(res => {
      exec(`gcc "${cPath}" -o "${exePath}" && "${exePath}"`, (err, out, errOut) => {
        safeSend('terminal-output', out + errOut);
        if (err) res({ success: false, error: out + errOut });
        else res({ success: true, output: out });
      });
    });
  } catch (err) {
    return { success: false, error: err.message }; 
  }
});

// ---- Multi-Language Run Functions ----
ipcMain.handle('run-python', async (_e, code, port) => {
  try {
    console.log('🚀 Starting Python execution...');
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'python-run-'));
    const pyPath = path.join(tmpDir, 'main.py');
    fs.writeFileSync(pyPath, code, 'utf-8');
    
    return await new Promise(async (resolve) => {
      if (port) {
        try {
          console.log(`🔧 Hardware execution mode: Code will run on ESP32 via ${port}`);
          
          // Find Python path dynamically
          const pythonPath = await findPythonPath();
          
          // Ensure mpremote is installed
          const mpremoteReady = await ensureMpremoteInstalled(pythonPath);
          if (!mpremoteReady) {
            resolve('Hardware execution failed: mpremote installation failed');
            return;
          }
          
          // Simple port release
          await releaseComPortIfNeeded(port);
           
          // Simple mpremote execution
          const mpremoteCommand = `"${pythonPath}" -m mpremote connect ${port} run "${pyPath}"`;
          console.log(`Executing: ${mpremoteCommand}`);
          
          const result = await captureSerialOutput(port, mpremoteCommand, 20000);
          if (result.success) {
            resolve(result.stdout || 'No output');
          } else {
            resolve(`Hardware execution failed: ${result.error || 'Unknown error'}`);
          }
        } catch (hardwareError) {
          console.error('❌ Hardware execution error:', hardwareError.message);
          resolve(`Hardware execution failed: ${hardwareError.message}`);
        }
      } else {
        try {
          console.log('💻 Local execution mode: Code will run on your computer');
          
          // Run locally with Python using full path
          const pythonPath = await findPythonPath();
          
          exec(`"${pythonPath}" "${pyPath}"`, (err, stdout, stderr) => {
            if (err) {
              resolve(`Local execution failed: ${stderr || err.message || 'Unknown error'}`);
            } else {
              resolve(stdout || 'No output');
            }
          });
        } catch (localError) {
          console.error('❌ Local execution error:', localError.message);
          resolve(`Local execution failed: ${localError.message}`);
        }
      }
    });
  } catch (err) { 
    console.error('❌ Run Python error:', err.message);
    return err.message || "Error running script"; 
  }
});

ipcMain.handle('run-javascript', async (_e, code) => {
  try {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'js-run-'));
    const jsPath = path.join(tmpDir, 'main.js');
    fs.writeFileSync(jsPath, code, 'utf-8');
    
    return await new Promise(resolve => {
      exec(`node "${jsPath}"`, (err, stdout, stderr) => {
        if (err) resolve(stderr || err.message || 'Unknown error');
        else resolve(stdout || 'No output');
    });
  });
  } catch (err) { 
    return err.message || "Error running script"; 
  }
});

ipcMain.handle('run-cpp', async (_e, code) => {
  try {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cpp-run-'));
    const cppPath = path.join(tmpDir, 'main.cpp');
    const exePath = path.join(tmpDir, 'main.exe');
    fs.writeFileSync(cppPath, code, 'utf-8');
    
    return await new Promise(resolve => {
      exec(`g++ "${cppPath}" -o "${exePath}" && "${exePath}"`, (err, stdout, stderr) => {
        if (err) resolve(stderr || err.message || 'Unknown error');
        else resolve(stdout || 'No output');
      });
    });
  } catch (err) { 
    return err.message || "Error running script"; 
  }
});

ipcMain.handle('run-c', async (_e, code) => {
  try {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'c-run-'));
    const cPath = path.join(tmpDir, 'main.c');
    const exePath = path.join(tmpDir, 'main.exe');
    fs.writeFileSync(cPath, code, 'utf-8');
    
    return await new Promise(resolve => {
      exec(`gcc "${cPath}" -o "${exePath}" && "${exePath}"`, (err, stdout, stderr) => {
        if (err) resolve(stderr || err.message || 'Unknown error');
        else resolve(stdout || 'No output');
      });
    });
  } catch (err) {
    return err.message || "Error running script"; 
  }
});

// ---- Save Code Function ----
ipcMain.handle('save-code', async (_e, code, language = 'python') => {
  try {
    const extensions = {
      'python': 'py',
      'javascript': 'js',
      'cpp': 'cpp',
      'c': 'c'
    };
    const ext = extensions[language] || 'txt';
    
    const { filePath } = await dialog.showSaveDialog({
      title: `Save ${language.charAt(0).toUpperCase() + language.slice(1)} Code`,
      defaultPath: `main.${ext}`,
      filters: [{ name: language.charAt(0).toUpperCase() + language.slice(1), extensions: [ext] }]
    });
    if (!filePath) return { success: false, error: 'Save cancelled.' };
    fs.writeFileSync(filePath, code, 'utf-8');
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message }; 
  }
});

// ---- Load Code Function ----
ipcMain.handle('load-code', async (_e, language = 'python') => {
  try {
    const extensions = {
      'python': 'py',
      'javascript': 'js',
      'cpp': 'cpp',
      'c': 'c'
    };
    const ext = extensions[language] || 'txt';
    
    const { filePaths, canceled } = await dialog.showOpenDialog({
      title: `Load ${language.charAt(0).toUpperCase() + language.slice(1)} Code`,
      defaultPath: `main.${ext}`,
      filters: [{ name: language.charAt(0).toUpperCase() + language.slice(1), extensions: [ext] }],
      properties: ['openFile']
    });
    
    if (canceled || !filePaths || filePaths.length === 0) {
      return { success: false, error: 'Load cancelled.' };
    }
    
    const filePath = filePaths[0];
    const code = fs.readFileSync(filePath, 'utf-8');
    
    // Detect language from file extension
    const fileExt = path.extname(filePath).toLowerCase();
    const detectedLanguage = Object.keys(extensions).find(key => extensions[key] === fileExt) || language;
    
    return { success: true, code, filePath, language: detectedLanguage };
  } catch (err) {
    return { success: false, error: err.message }; 
  }
});

// ---- Board Status Check ----
ipcMain.handle('check-board', async () => {
  try {
    const ports = await SerialPort.list();
    const identifiers = [
      'usb', 'uart', 'com', 'serial', 'esp32', 'esp8266',
      'arduino', 'raspberry', 'micropython', 'circuitpython'
    ];

    const found = ports.some(portInfo => {
      const haystack = [
        portInfo.path,
        portInfo.friendlyName,
        portInfo.pnpId,
        portInfo.manufacturer,
        portInfo.vendorId,
        portInfo.productId
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return identifiers.some(id => haystack.includes(id));
    });

    return found ? 'connected' : 'disconnected';
  } catch (err) {
    console.error('check-board error:', err);
    return 'disconnected';
  }
});

// ---- ESP32 Connection Test ----
ipcMain.handle('test-esp32-connection', async (_e, port) => {
  try {
    console.log(`🔍 Testing ESP32 connection on ${port}...`);
    safeSend('terminal-output', `🔍 Testing ESP32 connection on ${port}...`);
    
    // Find Python path
    const pythonPath = await findPythonPath();
    
    // Ensure mpremote is installed
    const mpremoteReady = await ensureMpremoteInstalled(pythonPath);
    if (!mpremoteReady) {
      return { success: false, error: 'mpremote installation failed' };
    }
    
    // Test basic connection
    const testCommand = `"${pythonPath}" -m mpremote connect ${port} exec "print('ESP32 Connection Test')"`;
    console.log(`Executing: ${testCommand}`);
    
    const result = await captureSerialOutput(port, testCommand, 10000);
    if (result.success) {
      console.log('✅ ESP32 connection test successful');
      safeSend('terminal-output', '✅ ESP32 connection test successful');
      return { success: true, output: result.stdout };
    } else {
      console.error('❌ ESP32 connection test failed:', result.error);
      safeSend('terminal-output', `❌ ESP32 connection test failed: ${result.error}`);
      return { success: false, error: result.error };
    }
  } catch (err) {
    console.error('❌ ESP32 connection test error:', err.message);
    return { success: false, error: err.message };
  }
});

// ---- MicroPython Installation ----
ipcMain.handle('install-micropython', async (_e, port) => {
  try {
    console.log(`🚀 Installing MicroPython on ${port}...`);
    safeSend('terminal-output', `🚀 Installing MicroPython on ${port}...`);
    
    // Run the installation script
    const installCommand = `"${await findPythonPath()}" install_micropython.py ${port}`;
    console.log(`Executing: ${installCommand}`);
    
    const result = await new Promise((resolve) => {
      exec(installCommand, { cwd: __dirname }, (err, stdout, stderr) => {
        if (err) {
          resolve({ success: false, error: stderr || err.message });
        } else {
          resolve({ success: true, output: stdout });
        }
      });
    });
    
    if (result.success) {
      console.log('✅ MicroPython installation completed');
      safeSend('terminal-output', '✅ MicroPython installation completed');
      return { success: true, output: result.output };
    } else {
      console.error('❌ MicroPython installation failed:', result.error);
      safeSend('terminal-output', `❌ MicroPython installation failed: ${result.error}`);
      return { success: false, error: result.error };
    }
  } catch (err) {
    console.error('❌ MicroPython installation error:', err.message);
    return { success: false, error: err.message };
  }
});

// ---- Terminal Output Handler ----
ipcMain.handle('terminal-output', async (_e, message) => {
  safeSend('terminal-output', message);
  return { success: true };
});

// ---- Code Generation Logic ----
ipcMain.on('generateCode', (event, data) => {
  const code = generateSetPinCode(data.pin, data.value);
  event.reply('generatedCode', code);
});

function generateSetPinCode(pin, value) {
  return `void setup() {
  pinMode(${pin}, OUTPUT);
}

void loop() {
  digitalWrite(${pin}, ${value});
}`;
}
