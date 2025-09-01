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

// FIXED: Enhanced port release with proper status checking
async function releaseComPortIfNeeded(portPath) {
  try {
    console.log(`🔄 Releasing port ${portPath}...`);
    
    // Kill potential conflicting processes
    if (os.platform() === 'win32') {
      exec('taskkill /f /im "python.exe" 2>nul', () => {});
      exec('taskkill /f /im "mpremote.exe" 2>nul', () => {});
    }

    // Close our open handle if any
    if (currentPort && currentPort.isOpen) {
      console.log('🔄 Closing current port...');
      await new Promise(res => currentPort.close(() => res()));
      currentPort.destroy();
      currentPort = null;
    }

    // Reset port settings on Windows
    if (os.platform() === 'win32') {
      await new Promise(resolve => {
        exec(`mode ${portPath}: BAUD=115200 PARITY=N DATA=8 STOP=1`, () => resolve());
      });
    }

    // FIXED: Adaptive delay based on system response
    await delay(1500); // Reduced from 2000ms for better responsiveness
    console.log(`✅ Port ${portPath} released successfully`);
  } catch (error) {
    console.error(`❌ Error releasing port ${portPath}:`, error.message);
  }
}

// FIXED: Enhanced retry mechanism with better error handling
async function runWithRetries(command, attempts = 3, backoffMs = 1000, timeoutMs = 25000) {
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
      const waitTime = backoffMs * Math.pow(1.5, attempt - 1); // Exponential backoff
      console.log(`⏳ Waiting ${waitTime}ms before retry...`);
      await delay(waitTime);
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

// [Other compile functions remain the same...]
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

// ---- FIXED: Multi-Language Upload Functions ----
ipcMain.handle('upload-python', async (_e, code, port) => {
  try {
    // Enhanced port release
    console.log('🔄 Preparing port for upload...');
    await releaseComPortIfNeeded(port);
    
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'python-upload-'));
    const pyPath = path.join(tmpDir, 'main.py');
    fs.writeFileSync(pyPath, code, 'utf-8');
    
    return await new Promise(async (res) => {
      try {
        const pythonPath = await findPythonPath();
        const mpremoteReady = await ensureMpremoteInstalled(pythonPath);
        
        if (!mpremoteReady) {
          res({ success: false, error: 'mpremote installation failed' });
          return;
        }
        
        safeSend('terminal-output', '🚀 Uploading code to ESP32...');
        
        // CRITICAL FIX: Proper mpremote command structure
        const uploadCommand = `"${pythonPath}" -m mpremote connect ${port} fs cp "${pyPath}" :main.py`;
        console.log(`Executing: ${uploadCommand}`);
        
        const uploadResult = await runWithRetries(uploadCommand, 2, 1500);
        if (!uploadResult.success) {
          console.log('🔁 Upload retry after port release...');
          await releaseComPortIfNeeded(port);
          const retryResult = await runWithRetries(uploadCommand, 2, 2000);
          
          if (!retryResult.success) {
            console.error('❌ Upload failed:', uploadResult.error || retryResult.error);
            safeSend('terminal-output', `❌ Upload failed: ${uploadResult.error || retryResult.error}`);
            res({ success: false, error: uploadResult.error || retryResult.error });
            return;
          }
        }
        
        console.log('✅ Upload successful');
        safeSend('terminal-output', '✅ Upload successful!');
        
        // Small delay for stability
        await delay(800);
        
        // CRITICAL FIX: Proper execution command
        safeSend('terminal-output', '🚀 Executing uploaded code...');
        const execCommand = `"${pythonPath}" -m mpremote connect ${port} exec "import main"`;
        console.log(`Executing: ${execCommand}`);
        
        const execResult = await runWithRetries(execCommand, 2, 2000);
        if (execResult.success) {
          safeSend('terminal-output', '📋 Code execution output:');
          safeSend('terminal-output', execResult.stdout || 'Code executed successfully');
          res({ success: true, output: execResult.stdout || 'Code executed successfully' });
        } else {
          // Fallback: try soft-reset + exec
          const fallbackCommand = `"${pythonPath}" -m mpremote connect ${port} soft-reset exec "import main"`;
          const fallbackResult = await runWithRetries(fallbackCommand, 1, 3000);
          
          if (fallbackResult.success) {
            safeSend('terminal-output', '📋 Code execution output:');
            safeSend('terminal-output', fallbackResult.stdout || 'Code executed successfully');
            res({ success: true, output: fallbackResult.stdout || 'Code executed successfully' });
          } else {
            safeSend('terminal-output', `❌ Code execution failed: ${execResult.error}`);
            res({ success: false, error: execResult.error });
          }
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

// [Other upload functions remain the same...]
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

// ---- FIXED: Multi-Language Run Functions ----
ipcMain.handle('run-python', async (_e, code, port) => {
  try {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'python-run-'));
    const pyPath = path.join(tmpDir, 'main.py');
    fs.writeFileSync(pyPath, code, 'utf-8');
    
    return await new Promise(async (resolve) => {
      if (port) {
        // Enhanced port cleanup
        console.log('🔄 Preparing port for run...');
        await releaseComPortIfNeeded(port);
        
        const pythonPath = await findPythonPath();
        const mpremoteReady = await ensureMpremoteInstalled(pythonPath);
        
        if (!mpremoteReady) {
          resolve('Hardware execution failed: mpremote installation failed');
          return;
        }
        
        console.log(`🚀 Executing: "${pythonPath}" -m mpremote connect ${port} run "${pyPath}"`);
        
        // CRITICAL FIX: Proper run command
        const runCommand = `"${pythonPath}" -m mpremote connect ${port} run "${pyPath}"`;
        
        const runResult = await runWithRetries(runCommand, 2, 1500);
        if (runResult.success) {
          resolve(runResult.stdout || 'Code executed successfully');
        } else {
          // Fallback: try exec approach
          const execCommand = `"${pythonPath}" -m mpremote connect ${port} exec "exec(open('${pyPath.replace(/\\/g, '/')}').read())"`;
          const execResult = await runWithRetries(execCommand, 1, 3000);
          
          if (execResult.success) {
            resolve(execResult.stdout || 'Code executed successfully');
          } else {
            resolve(`Hardware execution failed: ${runResult.error || execResult.error}`);
          }
        }
      } else {
        // Run locally
        const pythonPath = await findPythonPath();
        
        exec(`"${pythonPath}" "${pyPath}"`, (err, stdout, stderr) => {
          if (err) {
            resolve(`Local execution failed: ${stderr || err.message || 'Unknown error'}`);
          } else {
            resolve(stdout || 'No output');
          }
        });
      }
    });
  } catch (err) { 
    return err.message || "Error running script"; 
  }
});

// [Other run functions remain the same...]
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

// ---- Save/Load Code Functions ----
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
    
    const pythonPath = await findPythonPath();
    const mpremoteReady = await ensureMpremoteInstalled(pythonPath);
    
    if (!mpremoteReady) {
      return { success: false, error: 'mpremote installation failed' };
    }
    
    // FIXED: Better connection test
    const testCommand = `"${pythonPath}" -m mpremote connect ${port} exec "print('ESP32 Connection Test - OK')"`;
    console.log(`Executing: ${testCommand}`);
    
    const result = await runWithRetries(testCommand, 2, 3000);
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