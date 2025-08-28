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

// Utility: best-effort COM port release on Windows and wait for readiness
async function releaseComPortIfNeeded(portPath) {
  try {
    // Kill potential conflicting processes (Python/mpremote) silently
    exec('taskkill /f /im "python.exe" 2>nul', () => {});
    exec('taskkill /f /im "mpremote.exe" 2>nul', () => {});
  } catch (_) {}

  // Close our open handle if any
  try {
    if (currentPort) {
      if (currentPort.isOpen) {
        await new Promise(res => currentPort.close(() => res()));
      }
      currentPort.destroy();
      currentPort = null;
    }
  } catch (_) {}

  // Ask Windows to reset the line settings and wait for completion
  await new Promise(resolve => {
    exec(`mode ${portPath}: BAUD=115200 PARITY=N DATA=8 STOP=1`, () => resolve());
  });

  // Give the OS time to actually free the handle
  await delay(2500);
}

// Utility: run a shell command with retries and backoff
async function runWithRetries(command, attempts = 3, backoffMs = 1500, timeoutMs = 20000) {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const result = await new Promise(resolve => {
      exec(command, { timeout: timeoutMs }, (err, stdout, stderr) => {
        resolve({ err, stdout, stderr });
      });
    });

    if (!result.err) {
      return { success: true, stdout: result.stdout };
    }

    if (attempt < attempts) {
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
    return await new Promise(res => {
      // Use full path to Python for Windows compatibility
      const pythonPath = 'C:\\Program Files\\Python313\\python.exe';
      
      exec(`"${pythonPath}" -m py_compile "${pyPath}"`, (err, out, errOut) => {
        if (err) {
          res({ success: false, error: `Python compilation failed: ${errOut || out || err.message}` });
        } else {
          res({ success: true, output: 'Python syntax validation successful', compiledPath: pyPath });
        }
      });
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
    // Robust port release before mpremote
    console.log('🔄 Preparing port for upload...');
    await releaseComPortIfNeeded(port);
    
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'python-upload-'));
    const pyPath = path.join(tmpDir, 'main.py');
    fs.writeFileSync(pyPath, code, 'utf-8');
    
    return await new Promise(res => {
      // Use full Python path to run mpremote
      const pythonPath = 'C:\\Program Files\\Python313\\python.exe';
      
      // Upload with enhanced error handling
      safeSend('terminal-output', '🚀 Uploading code to ESP32...');
      
      const uploadCommand = `"${pythonPath}" -m mpremote connect ${port} fs cp "${pyPath}" :main.py`;
      console.log(`Executing: ${uploadCommand}`);
      
      (async () => {
        const firstTry = await runWithRetries(uploadCommand, 2, 1500);
        if (!firstTry.success) {
          console.log('🔁 Upload retry after aggressive port release...');
          await releaseComPortIfNeeded(port);
          const secondTry = await runWithRetries(uploadCommand, 2, 2000);
          if (!secondTry.success) {
            console.error('❌ Upload failed:', firstTry.error || secondTry.error);
            safeSend('terminal-output', `❌ Upload failed: ${firstTry.error || secondTry.error}`);
            res({ success: false, error: firstTry.error || secondTry.error });
            return;
          }
        }
        console.log('✅ Upload successful');
        safeSend('terminal-output', '✅ Upload successful!');
        res({ success: true });
      })();
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
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'python-run-'));
    const pyPath = path.join(tmpDir, 'main.py');
    fs.writeFileSync(pyPath, code, 'utf-8');
    
    return await new Promise(async (resolve) => {
      if (port) {
        // Enhanced port cleanup before using mpremote
        console.log('🔄 Preparing port for run...');
        await releaseComPortIfNeeded(port);
        
        // Run on hardware via mpremote using full Python path
        const pythonPath = 'C:\\Program Files\\Python313\\python.exe';
        
        console.log(`🚀 Executing: "${pythonPath}" -m mpremote connect ${port} run "${pyPath}"`);
        
        // Enhanced mpremote execution with better error handling
        const mpremoteCommand = `"${pythonPath}" -m mpremote connect ${port} run "${pyPath}"`;
        
        (async () => {
          // Try direct run with retries
          let attempt = await runWithRetries(mpremoteCommand, 2, 1500);
          if (!attempt.success) {
            console.log('🔄 Trying alternative approach with soft-reset...');
            const alternativeCommand = `"${pythonPath}" -m mpremote connect ${port} soft-reset && "${pythonPath}" -m mpremote connect ${port} run "${pyPath}"`;
            attempt = await runWithRetries(alternativeCommand, 2, 2000);
          }
          if (!attempt.success) {
            console.log('🔄 Trying final fallback with exec after aggressive port release...');
            await releaseComPortIfNeeded(port);
            const fallbackCommand = `"${pythonPath}" -m mpremote connect ${port} exec "exec(open('${pyPath}').read())"`;
            attempt = await runWithRetries(fallbackCommand, 2, 2000);
          }
          if (!attempt.success) {
            resolve(`Hardware execution failed: ${attempt.error || 'Unknown error'}`);
          } else {
            resolve(attempt.stdout || 'No output');
          }
        })();
      } else {
        // Run locally with Python using full path
        const pythonPath = 'C:\\Program Files\\Python313\\python.exe';
        
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
    return { success: true, code, filePath };
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
