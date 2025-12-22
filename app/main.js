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

// ⚠️ CRITICAL: Fixed Baud Rate for ESP32 Board
// This is the fixed serial communication speed - DO NOT CHANGE
const ESP32_BAUD_RATE = 115200;

// Send Ctrl+C/Ctrl+D to try to drop into raw REPL before mpremote uses the port
async function pokeRawRepl(portPath) {
  return new Promise((resolve) => {
    try {
      const p = new SerialPort({ path: portPath, baudRate: ESP32_BAUD_RATE, autoOpen: false });
      p.open((err) => {
        if (err) {
          console.log(`Warning: pokeRawRepl open failed: ${err.message}`);
          return resolve();
        }
        const payload = Buffer.from([0x03, 0x03, 0x04]); // ctrl-C ctrl-C ctrl-D
        p.write(payload, () => {
          setTimeout(() => {
            p.close(() => {
              try { p.destroy(); } catch {}
              resolve();
            });
          }, 200);
        });
      });
    } catch (e) {
      console.log(`Warning: pokeRawRepl exception: ${e.message}`);
      resolve();
    }
  });
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
        baudRate: ESP32_BAUD_RATE,  // Fixed: 115200 for this ESP32 board
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
    safeSend('terminal-output', `🔄 Closing serial monitor to free COM port...`);
    
    // Close our open handle if any - CRITICAL: Must close before mpremote can use it
    if (currentPort) {
      console.log('🔄 Closing current serial port...');
      try {
        currentPort.removeAllListeners();
        if (currentPort.isOpen) {
          await new Promise((res) => {
            const timeout = setTimeout(() => {
              console.log('⚠️ Port close timeout, forcing destroy...');
              res();
            }, 2000);
            currentPort.close(() => {
              clearTimeout(timeout);
              res();
            });
          });
        }
        try {
          currentPort.destroy();
        } catch (destroyErr) {
          console.log(`Warning: Error destroying port: ${destroyErr.message}`);
        }
        currentPort = null;
        safeSend('terminal-output', '[Serial Port Closed]');
      } catch (closeErr) {
        console.log(`Warning: Error closing current port: ${closeErr.message}`);
        try {
          if (currentPort) {
            currentPort.destroy();
            currentPort = null;
          }
        } catch (e) {
          console.log(`Warning: Error in force destroy: ${e.message}`);
        }
      }
    }

    // Wait for OS to release the handle
    safeSend('terminal-output', `⏳ Waiting for port to be released...`);
    await delay(800); // keep short; Windows usually frees in <1s if handle is destroyed
    
    console.log(`✅ Port ${portPath} released successfully`);
    safeSend('terminal-output', `✅ Port ${portPath} released, ready for upload`);
  } catch (error) {
    console.error(`❌ Error releasing port ${portPath}:`, error.message);
    safeSend('terminal-output', `⚠️ Warning: Port release had issues: ${error.message}`);
  }
}

// Utility: quick hard reset using DTR/RTS (keep GPIO0 high)
async function hardResetPort(portPath) {
  return new Promise((resolve) => {
    try {
      const resetPort = new SerialPort({ path: portPath, baudRate: ESP32_BAUD_RATE, autoOpen: false });
      resetPort.open((err) => {
        if (err) {
          console.log(`Warning: hardResetPort open failed: ${err.message}`);
          return resolve();
        }
        // RTS low (reset), DTR high (GPIO0 high), then release reset
        resetPort.set({ dtr: true, rts: false }, () => {
          setTimeout(() => {
            resetPort.set({ dtr: true, rts: true }, () => {
              setTimeout(() => {
                resetPort.close(() => {
                  try { resetPort.destroy(); } catch {}
                  resolve();
                });
              }, 200);
            });
          }, 120);
        });
      });
    } catch (e) {
      console.log(`Warning: hardResetPort exception: ${e.message}`);
      resolve();
    }
  });
}

// Utility: capture output from mpremote command (DO NOT open serial port - mpremote handles it)
async function captureSerialOutput(portPath, command, timeoutMs = 30000) {
  return new Promise(async (resolve) => {
    let commandCompleted = false;
    
    try {
      // CRITICAL: Close any existing serial port connection BEFORE mpremote uses it
      // mpremote needs exclusive access to the COM port
      if (currentPort && currentPort.isOpen) {
        console.log('🔄 Closing existing serial port before mpremote...');
        try {
          await new Promise(r => {
            currentPort.close(() => {
              currentPort.destroy();
              currentPort = null;
              r();
            });
          });
          // Give OS time to release the port
          await delay(1000);
        } catch (closeErr) {
          console.log(`Warning: Error closing port: ${closeErr.message}`);
        }
      }
      
      // Execute the mpremote command (mpremote handles serial communication itself)
      exec(command, { timeout: timeoutMs }, (err, stdout, stderr) => {
        commandCompleted = true;
        
        if (err) {
          const errorMsg = stderr || stdout || err.message;
          safeSend('terminal-output', `\n[Command Error]: ${errorMsg}\n`);
          resolve({ success: false, error: errorMsg, output: stdout || stderr });
        } else {
          safeSend('terminal-output', `\n[Command Output]: ${stdout || ''}\n`);
          resolve({ success: true, stdout: stdout, output: stdout });
        }
      });
      
      // Set timeout
      setTimeout(() => {
        if (!commandCompleted) {
          commandCompleted = true;
          resolve({ success: false, error: 'Command timed out', output: '' });
        }
      }, timeoutMs);
      
    } catch (error) {
      commandCompleted = true;
      safeSend('terminal-output', `\n[Execution Error]: ${error.message}\n`);
      resolve({ success: false, error: error.message, output: '' });
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

ipcMain.handle('open-serial-port', async (_e, portPath, baudRate = ESP32_BAUD_RATE) => {
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

// Send data to serial port (Serial Monitor functionality)
ipcMain.handle('send-serial-data', async (_e, portPath, data) => {
  try {
    if (!currentPort || !currentPort.isOpen) {
      return { success: false, error: 'Port not open' };
    }
    
    // Write data to serial port and wait for completion
    return new Promise((resolve) => {
      currentPort.write(data + '\n', (err) => {
        if (err) {
          safeSend('serial-data', `\n[Send Error]: ${err.message}\n`);
          resolve({ success: false, error: err.message });
        } else {
          resolve({ success: true });
        }
      });
      
      // Timeout after 2 seconds
      setTimeout(() => {
        resolve({ success: true }); // Assume success if no error callback
      }, 2000);
    });
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

// ---- Python Formatter (black) ----
ipcMain.handle('format-python', async (_e, code) => {
  try {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'python-format-'));
    const pyPath = path.join(tmpDir, 'main.py');
    fs.writeFileSync(pyPath, code, 'utf-8');

    return await new Promise(async (res) => {
      try {
        const pythonPath = await findPythonPath();
        const formatCmd = `"${pythonPath}" -m black --quiet --fast "${pyPath}"`;
        exec(formatCmd, { timeout: 15000 }, (err, out, errOut) => {
          if (err) {
            res({ success: false, error: errOut || out || err.message });
          } else {
            try {
              const formatted = fs.readFileSync(pyPath, 'utf-8');
              res({ success: true, code: formatted });
            } catch (readErr) {
              res({ success: false, error: readErr.message });
            }
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
    const helperFiles = [
      { key: 'hcsr04', path: path.join(__dirname, '..', 'micropython_libraries', 'hcsr04.py') },
      { key: 'tcs34725', path: path.join(__dirname, '..', 'micropython_libraries', 'tcs34725.py') },
      { key: 'ssd1306', path: path.join(__dirname, '..', 'micropython_libraries', 'ssd1306.py') },
      { key: 'servo', path: path.join(__dirname, '..', 'micropython_libraries', 'servo.py') },
      { key: 'dht', path: path.join(__dirname, '..', 'micropython_libraries', 'dht.py') },
      { key: 'onewire', path: path.join(__dirname, '..', 'micropython_libraries', 'onewire.py') },
      { key: 'ds18x20', path: path.join(__dirname, '..', 'micropython_libraries', 'ds18x20.py') },
      { key: 'utils', path: path.join(__dirname, '..', 'micropython_libraries', 'utils.py') },
    ];
    const detectHelperFiles = (codeStr) => {
      const needed = [];
      helperFiles.forEach(f => {
        if (codeStr.includes(`import ${f.key}`)) {
          needed.push(f);
        }
      });
      return needed;
    };
    
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
        
        // CRITICAL: Release port FIRST before any mpremote operations
        await releaseComPortIfNeeded(port);
        await delay(600);
        // Hardware reset to ensure we are out of user loops
        safeSend('terminal-output', '🔄 Resetting ESP32 to ensure clean connection...');
        await hardResetPort(port);
        await delay(300);

        // Upload with retry logic for "could not enter raw repl" error
        safeSend('terminal-output', '🚀 Uploading code to ESP32...');
        
        // Upload helper libraries if referenced in code
        const helpersNeeded = detectHelperFiles(code);
        for (const helper of helpersNeeded) {
          try {
            safeSend('terminal-output', `📦 Uploading dependency: ${helper.key}.py`);
            const uploadHelperCmd = `"${pythonPath}" -m mpremote connect ${port} fs cp "${helper.path.replace(/\\/g, '/')}" :${helper.key}.py`;
            const helperResult = await captureSerialOutput(port, uploadHelperCmd, 15000);
            if (!helperResult.success) {
              safeSend('terminal-output', `⚠️ Failed to upload ${helper.key}.py: ${helperResult.error || 'Unknown error'}`);
            }
          } catch (helperErr) {
            safeSend('terminal-output', `⚠️ Error uploading ${helper.key}.py: ${helperErr.message}`);
          }
          // small gap
          await delay(500);
        }
        
        // Deterministic, single-pass sequence (no parallel attempts)
        // Small pause after hard reset to let MicroPython boot
        await delay(1200);
        await pokeRawRepl(port);

        // Push main.py with one retry on raw repl failure
        const fsCpCmd = `"${pythonPath}" -m mpremote connect ${port} fs cp "${pyPath.replace(/\\/g, '/')}" :main.py`;
        let fsResult = await captureSerialOutput(port, fsCpCmd, 20000);
        if (!fsResult.success && (fsResult.error || '').includes('could not enter raw repl')) {
          // Retry after another hard reset and longer delay
          await hardResetPort(port);
          await delay(1400);
          await pokeRawRepl(port);
          fsResult = await captureSerialOutput(port, fsCpCmd, 20000);
        }
        if (!fsResult.success) {
          res({ success: false, error: fsResult.error || 'Upload failed (fs cp)' });
          return;
        }
        await delay(300);

        // Execute once (optional; keeps monitor closed until we reopen)
        const execCmd = `"${pythonPath}" -m mpremote connect ${port} exec "exec(open('main.py').read())"`;
        let execResult = await captureSerialOutput(port, execCmd, 20000);
        if (!execResult.success && (execResult.error || '').includes('could not enter raw repl')) {
          await hardResetPort(port);
          await delay(1400);
          await pokeRawRepl(port);
          execResult = await captureSerialOutput(port, execCmd, 20000);
        }
        if (!execResult.success) {
          res({ success: false, error: execResult.error || 'Execution failed' });
          return;
        }

        console.log('✅ Upload + exec successful');
        safeSend('terminal-output', '✅ Upload successful!');
        res({ success: true, output: 'Upload and execution completed' });
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
