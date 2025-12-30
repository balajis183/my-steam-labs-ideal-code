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

// Utility: detect board type based on port information (vendor, product, manufacturer)
function detectBoardType(portInfo) {
  const vendor = (portInfo.vendorId || '').toLowerCase();
  const product = (portInfo.productId || '').toLowerCase();
  const manufacturer = (portInfo.manufacturer || '').toLowerCase();
  const friendlyName = (portInfo.friendlyName || '').toLowerCase();
  const pnpId = (portInfo.pnpId || '').toLowerCase();
  
  const combined = `${vendor} ${product} ${manufacturer} ${friendlyName} ${pnpId}`;
  
  // ESP32 detection
  if (combined.includes('esp32') || 
      vendor === '10c4' || // Silicon Labs (common ESP32 USB chip)
      vendor === '1a86' || // QinHeng Electronics (CH340)
      combined.includes('cp210') || 
      combined.includes('ch340')) {
    return 'esp32';
  }
  
  // Arduino detection
  if (combined.includes('arduino') || 
      vendor === '2341' || // Arduino vendor ID
      combined.includes('uno') || 
      combined.includes('mega') || 
      combined.includes('nano')) {
    return 'arduino';
  }
  
  // Raspberry Pi Pico detection
  if (combined.includes('pico') || 
      combined.includes('rp2040') || 
      vendor === '2e8a') {
    return 'pico';
  }
  
  // Generic MicroPython board
  if (combined.includes('micropython') || combined.includes('circuitpython')) {
    return 'generic_micropython';
  }
  
  // Default: unknown board
  return 'unknown';
}

// Utility: detect what firmware is on the board
async function detectFirmwareType(portPath) {
  try {
    console.log(`🔍 Detecting firmware type on ${portPath}...`);
    
    const pythonPath = await findPythonPath();
    
    // Try to connect with mpremote (MicroPython)
    const mpTestCmd = `"${pythonPath}" -m mpremote connect ${portPath} exec "import sys; print(sys.implementation.name)"`;
    
    const result = await new Promise((resolve) => {
      exec(mpTestCmd, { timeout: 5000 }, (err, stdout, stderr) => {
        if (!err && stdout && stdout.includes('micropython')) {
          resolve({ 
            type: 'micropython', 
            version: stdout.trim(),
            compatible: true 
          });
        } else {
          // Not MicroPython - could be Arduino, ESP-IDF, or bootloader
          resolve({ 
            type: 'unknown', 
            compatible: false,
            error: stderr || 'Not MicroPython firmware'
          });
        }
      });
    });
    
    console.log(`✅ Firmware detection result:`, result);
    return result;
    
  } catch (error) {
    console.error('❌ Firmware detection error:', error);
    return { 
      type: 'unknown', 
      compatible: false, 
      error: error.message 
    };
  }
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

// AGGRESSIVE HARDWARE RESET - Physically resets ESP32 EXACTLY like Arduino IDE
async function hardwareResetESP32(portPath) {
  return new Promise((resolve) => {
    try {
      console.log('🔨 Performing HARDWARE RESET on ESP32 (Arduino IDE style)...');
      const p = new SerialPort({ path: portPath, baudRate: ESP32_BAUD_RATE, autoOpen: false });
      
      p.open((err) => {
        if (err) {
          console.log(`⚠️ Hardware reset failed: ${err.message}`);
          return resolve(false);
        }
        
        // EXACT Arduino IDE reset sequence (from esptool.py)
        // DTR controls ESP32 EN pin (reset)
        // RTS controls ESP32 GPIO0 pin (bootloader mode)
        
        // Step 1: Set initial state
        p.set({ dtr: true, rts: false }, (err1) => {
          if (err1) {
            console.log(`⚠️ Reset step 1 failed: ${err1.message}`);
            p.close(() => { 
              try { p.destroy(); } catch {} 
              // Wait for Windows to release port
              setTimeout(() => resolve(false), 300);
            });
            return;
          }
          
          setTimeout(() => {
            // Step 2: Pull EN low (reset)
            p.set({ dtr: false, rts: false }, (err2) => {
              if (err2) {
                console.log(`⚠️ Reset step 2 failed: ${err2.message}`);
                p.close(() => { 
                  try { p.destroy(); } catch {} 
                  setTimeout(() => resolve(false), 300);
                });
                return;
              }
              
              setTimeout(() => {
                // Step 3: Release EN (boot normally)
                p.set({ dtr: true, rts: false }, (err3) => {
                  if (err3) {
                    console.log(`⚠️ Reset step 3 failed: ${err3.message}`);
                  }
                  
                  setTimeout(() => {
                    p.close(() => {
                      try { p.destroy(); } catch {}
                      console.log('✅ Hardware reset complete (Arduino IDE style)');
                      // Wait for Windows to release port before resolving
                      setTimeout(() => resolve(true), 500);
                    });
                  }, 250);  // Wait for ESP32 to start booting
                });
              }, 100);  // Hold reset for 100ms
            });
          }, 50);  // Initial delay
        });
      });
    } catch (e) {
      console.log(`⚠️ Hardware reset exception: ${e.message}`);
      resolve(false);
    }
  });
}

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
        // Send MULTIPLE Ctrl+C to interrupt running code, then Ctrl+D to soft reset
        // This is more aggressive than before (6 interrupts instead of 2)
        const payload = Buffer.from([0x03, 0x03, 0x03, 0x03, 0x03, 0x03, 0x04]); // 6x ctrl-C + ctrl-D
        p.write(payload, () => {
          setTimeout(() => {
            p.close(() => {
              try { p.destroy(); } catch {}
              // Wait for Windows to release port before resolving
              setTimeout(() => resolve(), 500);
            });
          }, 300); // Slightly longer delay
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
      console.log('[SUCCESS] mpremote installed successfully');
      safeSend('terminal-output', '[SUCCESS] mpremote installed successfully');
      return true;
    } else {
      console.error('[ERROR] Failed to install mpremote:', installResult.error);
      safeSend('terminal-output', `[ERROR] Failed to install mpremote: ${installResult.error}`);
      return false;
    }
  } catch (error) {
    console.error('[ERROR] Error checking/installing mpremote:', error.message);
    safeSend('terminal-output', `[ERROR] Error checking/installing mpremote: ${error.message}`);
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
    safeSend('terminal-output', `[INFO] Closing serial monitor...`);
    
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

    // Wait for OS to release the handle - Windows needs more time
    safeSend('terminal-output', `[INFO] Waiting for port to be released...`);
    await delay(1500); // Increased from 800ms for Windows port release
    
    // Verify port is actually available (Windows-specific check)
    let attempts = 0;
    const maxAttempts = 5;
    while (attempts < maxAttempts) {
      const available = await isPortAvailable(portPath);
      if (available) {
        console.log(`[SUCCESS] Port ${portPath} released successfully (verified)`);
        safeSend('terminal-output', `[SUCCESS] Port ${portPath} released, ready for upload`);
        return;
      }
      attempts++;
      if (attempts < maxAttempts) {
        console.log(`⚠️ Port still locked, waiting longer (attempt ${attempts}/${maxAttempts})...`);
        await delay(500); // Wait 500ms between checks
      }
    }
    
    // If port still not available after retries, log warning but continue
    console.log(`⚠️ Port ${portPath} may still be locked, but proceeding anyway...`);
    safeSend('terminal-output', `[WARNING] Port ${portPath} may still be in use, but proceeding...`);
  } catch (error) {
      console.error(`[ERROR] Error releasing port ${portPath}:`, error.message);
    safeSend('terminal-output', `[WARNING] Port release had issues: ${error.message}`);
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
                  // Wait for Windows to release port before resolving
                  setTimeout(() => resolve(), 500);
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

// Utility: EMERGENCY reset - puts ESP32 in bootloader mode (DTR low = GPIO0 low)
// This is MORE AGGRESSIVE than hardResetPort and can interrupt stuck code
async function emergencyResetToBootloader(portPath) {
  return new Promise((resolve) => {
    try {
      console.log('🚨 EMERGENCY RESET: Putting ESP32 in bootloader mode...');
      const resetPort = new SerialPort({ path: portPath, baudRate: ESP32_BAUD_RATE, autoOpen: false });
      resetPort.open((err) => {
        if (err) {
          console.log(`Warning: emergencyReset open failed: ${err.message}`);
          return resolve();
        }
        // DTR low + RTS low = GPIO0 low + RESET = Bootloader mode
        resetPort.set({ dtr: false, rts: false }, () => {
          setTimeout(() => {
            // Release RESET but keep GPIO0 low
            resetPort.set({ dtr: false, rts: true }, () => {
              setTimeout(() => {
                // Now release GPIO0 - ESP32 should be in bootloader
                resetPort.set({ dtr: true, rts: true }, () => {
                  setTimeout(() => {
                    resetPort.close(() => {
                      try { resetPort.destroy(); } catch {}
                      console.log('✅ ESP32 should now be in bootloader mode');
                      // Wait for Windows to release port before resolving
                      setTimeout(() => resolve(), 500);
                    });
                  }, 300);
                });
              }, 200);
            });
          }, 150);
        });
      });
    } catch (e) {
      console.log(`Warning: emergencyReset exception: ${e.message}`);
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
          await delay(1500);
        } catch (closeErr) {
          console.log(`Warning: Error closing port: ${closeErr.message}`);
        }
      }
      
      // Verify port is available before mpremote tries to use it
      console.log(`🔍 Verifying port ${portPath} is available before mpremote...`);
      let portAvailable = false;
      let attempts = 0;
      const maxAttempts = 3;
      
      while (attempts < maxAttempts && !portAvailable) {
        portAvailable = await isPortAvailable(portPath);
        if (!portAvailable) {
          attempts++;
          if (attempts < maxAttempts) {
            console.log(`⚠️ Port ${portPath} not available yet, waiting... (attempt ${attempts}/${maxAttempts})`);
            await delay(500);
          }
        }
      }
      
      if (!portAvailable) {
        console.log(`⚠️ Port ${portPath} may still be locked, but proceeding with mpremote...`);
      } else {
        console.log(`✅ Port ${portPath} verified available`);
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

// ---- Serial Port Management with Firmware Detection ----
ipcMain.handle('list-serial-ports', async () => {
  try {
    const ports = await SerialPort.list();
    
    // Enhance port information with firmware detection and board type
    const enhancedPorts = await Promise.all(ports.map(async (port) => {
      try {
        // Detect board type based on port information
        const boardType = detectBoardType(port);
        
        // Quick firmware check (with short timeout)
        const firmwareInfo = await detectFirmwareType(port.path);
        return {
          ...port,
          boardType: boardType, // NEW: Add board type (esp32, arduino, pico, etc.)
          hasMicroPython: firmwareInfo.compatible,
          firmwareType: firmwareInfo.type,
          recommended: firmwareInfo.compatible // Mark MicroPython ports as recommended
        };
      } catch (error) {
        return {
          ...port,
          boardType: detectBoardType(port), // NEW: Add board type even if firmware detection fails
          hasMicroPython: false,
          firmwareType: 'unknown',
          recommended: false
        };
      }
    }));
    
    // Sort: MicroPython ports first
    enhancedPorts.sort((a, b) => {
      if (a.hasMicroPython && !b.hasMicroPython) return -1;
      if (!a.hasMicroPython && b.hasMicroPython) return 1;
      return 0;
    });
    
    return enhancedPorts;
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
// Enhanced auto-fix Python indentation (handles complex student code)
function autoFixPythonIndentation(code) {
  try {
    const lines = code.split('\n');
    const fixed = [];
    let indentStack = [0]; // Track nested indentation levels
    
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      const trimmed = line.trim();
      
      // Skip empty lines and preserve comments with current indent
      if (!trimmed) {
        fixed.push('');
        continue;
      }
      if (trimmed.startsWith('#')) {
        const currentIndent = indentStack[indentStack.length - 1];
        fixed.push('    '.repeat(currentIndent) + trimmed);
        continue;
      }
      
      // Dedent keywords (else, elif, except, finally)
      if (trimmed.match(/^(else:|elif |except:|finally:)/)) {
        if (indentStack.length > 1) {
          indentStack.pop(); // Go back one level
        }
      }
      
      // Dedent for return/break/continue/pass if next line is dedented
      if (trimmed.match(/^(return |break|continue|pass)/) && !trimmed.endsWith(':')) {
        const nextLine = lines[i + 1];
        if (nextLine) {
          const nextTrimmed = nextLine.trim();
          // Check if next line is a block keyword
          if (nextTrimmed && nextTrimmed.match(/^(def |class |if |elif |else:|while |for |with |try:|except:|finally:|import |from |@)/)) {
            if (indentStack.length > 1) {
              indentStack.pop();
            }
          }
        }
      }
      
      // Top-level keywords reset to indent 0
      if (trimmed.match(/^(import |from )/)) {
        indentStack = [0];
      }
      
      // Function/class definitions at appropriate level
      if (trimmed.match(/^(def |class |@)/)) {
        // If we're deep in nested blocks, reset to top level for new function
        if (indentStack.length > 2 && !trimmed.startsWith('@')) {
          indentStack = [0];
        }
      }
      
      // Apply current indentation
      const currentIndent = indentStack[indentStack.length - 1];
      const indentedLine = '    '.repeat(currentIndent) + trimmed;
      fixed.push(indentedLine);
      
      // Increase indent after block-starting colons
      if (trimmed.endsWith(':')) {
        const newIndent = currentIndent + 1;
        indentStack.push(newIndent);
      }
    }
    
    console.log('✅ Auto-fixed indentation');
    return fixed.join('\n');
  } catch (err) {
    console.error('❌ Auto-fix indentation error:', err);
    return code; // Return original if fixing fails
  }
}

ipcMain.handle('format-python', async (_e, code) => {
  try {
    // IMPORTANT: Auto-indentation DISABLED - it was breaking correct code!
    // Blockly generates correct code, don't try to "fix" it
    console.log('✅ Using code as-is (auto-indentation disabled)');
    
    let fixedCode = code;
    
    // STEP 2: Try black formatter for additional polish (optional)
    console.log('🔧 Step 2: Applying black formatter (if available)...');
    
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'python-format-'));
    const pyPath = path.join(tmpDir, 'main.py');
    fs.writeFileSync(pyPath, fixedCode, 'utf-8'); // Use auto-fixed code

    return await new Promise(async (res) => {
      try {
        const pythonPath = await findPythonPath();
        // Format with black (optional - won't break code if black not installed)
        const formatCmd = `"${pythonPath}" -m black --quiet --fast "${pyPath}"`;
        exec(formatCmd, { timeout: 15000 }, (err, out, errOut) => {
          if (err) {
            // If black fails or not installed, return original code
            console.log('⚠️ Black formatter not available, using code as-is');
            safeSend('terminal-output', '[SUCCESS] Code ready for upload');
            res({ success: true, code: fixedCode });
          } else {
            try {
              const formatted = fs.readFileSync(pyPath, 'utf-8');
              safeSend('terminal-output', '[SUCCESS] Code formatted successfully');
              res({ success: true, code: formatted });
            } catch (readErr) {
              res({ success: true, code: fixedCode });
            }
          }
        });
      } catch (pythonError) {
        // Return auto-fixed code if Python not available
        safeSend('terminal-output', '[SUCCESS] Indentation auto-fixed');
        res({ success: true, code: fixedCode });
      }
    });
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ---- Multi-Language Upload Functions ----
ipcMain.handle('upload-python', async (_e, code, port, boardType = 'unknown') => {
  try {
    if (!port) {
      return { success: false, error: 'No port specified for upload' };
    }
    
    console.log(`[UPLOAD] Starting Python upload to ${boardType} board...`);
    safeSend('terminal-output', `\n========================================`);
    safeSend('terminal-output', `  Board Type: ${boardType.toUpperCase()}`);
    safeSend('terminal-output', `========================================`);
    
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
        
        // CRITICAL: Detect firmware type first (but skip if port is busy with serial monitor)
        safeSend('terminal-output', '\n[INFO] Detecting firmware...');
        
        // Try firmware detection, but don't fail if port is busy
        let firmwareInfo;
        try {
          firmwareInfo = await detectFirmwareType(port);
        } catch (detectError) {
          console.log('⚠️ Firmware detection failed (port may be busy), assuming MicroPython is installed');
          firmwareInfo = { compatible: true, type: 'micropython', version: 'assumed' };
        }
        
        // Only show error if we're SURE it's not MicroPython (not just port busy)
        if (!firmwareInfo.compatible && firmwareInfo.type !== 'unknown') {
          safeSend('terminal-output', '');
          safeSend('terminal-output', '❌ INCOMPATIBLE FIRMWARE DETECTED');
          safeSend('terminal-output', '');
          safeSend('terminal-output', '🎯 Your ESP32 does NOT have MicroPython firmware!');
          safeSend('terminal-output', '   It may have Arduino, ESP-IDF, or other firmware.');
          safeSend('terminal-output', '');
          safeSend('terminal-output', '💡 SOLUTION: Flash MicroPython firmware first');
          safeSend('terminal-output', '');
          safeSend('terminal-output', '📝 Quick Installation Steps:');
          safeSend('terminal-output', '   1. Close this application');
          safeSend('terminal-output', '   2. Open Command Prompt as Administrator');
          safeSend('terminal-output', '   3. Run: pip install esptool');
          safeSend('terminal-output', `   4. Run: esptool.py --port ${port} erase_flash`);
          safeSend('terminal-output', `   5. Run: esptool.py --chip esp32 --port ${port} write_flash -z 0x1000 ESP32_GENERIC-D2WD-20250809-v1.26.0.bin`);
          safeSend('terminal-output', '   6. Restart this application and try again');
          safeSend('terminal-output', '');
          safeSend('terminal-output', '📄 The firmware file (ESP32_GENERIC-D2WD-20250809-v1.26.0.bin) is in your project folder');
          safeSend('terminal-output', '');
          res({ 
            success: false, 
            error: 'MicroPython firmware not installed. Please flash MicroPython firmware first.',
            needsFirmware: true
          });
          return;
        }
        
        // If detection uncertain (port busy), assume MicroPython and continue
        if (firmwareInfo.version === 'assumed') {
          safeSend('terminal-output', `[WARNING] Firmware detection skipped (port busy)`);
          safeSend('terminal-output', `[INFO] If upload fails, close Serial Monitor and try again`);
        } else {
          safeSend('terminal-output', `[SUCCESS] MicroPython firmware detected: ${firmwareInfo.version || 'micropython'}`);
        }
        await delay(300);
        
        // CRITICAL: Release port FIRST before any mpremote operations
        await releaseComPortIfNeeded(port);
        await delay(1000); // Increased delay after port release
        
        // Board-specific reset logic
        const isESP32 = boardType === 'esp32';
        
        if (isESP32) {
          // ESP32-specific aggressive hardware reset (like Arduino IDE)
          safeSend('terminal-output', '[INFO] Resetting ESP32 board...');
          const resetSuccess = await hardwareResetESP32(port);
          // hardwareResetESP32 now includes delay for port release
          if (resetSuccess) {
            safeSend('terminal-output', '[SUCCESS] Board reset complete. Waiting for boot...');
            await delay(3000);  // Wait for ESP32 to fully boot MicroPython (longer delay!)
          } else {
            safeSend('terminal-output', '[WARNING] Hardware reset incomplete, trying software reset...');
            await delay(1500);
          }
        } else {
          // For non-ESP32 boards, use gentler reset approach
          safeSend('terminal-output', `[INFO] Preparing ${boardType} board for upload...`);
          await hardResetPort(port);
          // hardResetPort now includes delay for port release
          await delay(1500);  // Additional delay for non-ESP32 boards
        }
        
        // Send interrupt signals to stop any running code
        safeSend('terminal-output', '[INFO] Stopping any running programs...');
        await pokeRawRepl(port);
        // pokeRawRepl now includes delay for port release
        await delay(800);  // Additional delay
        
        // CRITICAL FIX: Upload a BLANK main.py FIRST to stop old code from running
        // This is the key difference from Arduino IDE - we need to erase old code first
        safeSend('terminal-output', `[INFO] Clearing previous code from board...`);
        const blankCode = 'pass\n'; // Minimal Python code that does nothing
        const blankTmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'blank-upload-'));
        const blankPyPath = path.join(blankTmpDir, 'main.py');
        fs.writeFileSync(blankPyPath, blankCode, 'utf-8');
        
        // Upload blank main.py with retry logic
        const blankCmd = `"${pythonPath}" -m mpremote connect ${port} fs cp "${blankPyPath.replace(/\\/g, '/')}" :main.py`;
        let blankResult = await captureSerialOutput(port, blankCmd, 20000);
        
        // Retry logic - more aggressive for ESP32, gentler for others
        if (!blankResult.success && (blankResult.error || '').includes('could not enter raw repl')) {
          safeSend('terminal-output', '⚠️ Retrying to clear old code (attempt 1/3)...');
          await hardResetPort(port);
          // hardResetPort includes delay, but add extra for retry
          await delay(1000);
          await pokeRawRepl(port);
          // pokeRawRepl includes delay, but add extra for retry
          await delay(800);
          blankResult = await captureSerialOutput(port, blankCmd, 20000);
        }
        
        // Level 2: More aggressive retry (ESP32-specific hardware reset only for ESP32)
        if (!blankResult.success) {
          if (isESP32) {
            safeSend('terminal-output', '⚠️ Retrying with ESP32 hardware reset (attempt 2/3)...');
            await hardwareResetESP32(port);  // ESP32-specific hardware reset (includes delay)
            await delay(2000); // Additional delay after reset
          } else {
            safeSend('terminal-output', '⚠️ Retrying with soft reset (attempt 2/3)...');
            await hardResetPort(port); // Includes delay
            await delay(1000); // Additional delay
          }
          await pokeRawRepl(port); // Includes delay
          await delay(800); // Additional delay
          blankResult = await captureSerialOutput(port, blankCmd, 25000);
        }
        
        // Level 3: Emergency reset (ESP32-specific bootloader mode only for ESP32)
        if (!blankResult.success) {
          if (isESP32) {
            safeSend('terminal-output', '🚨 ESP32 Emergency bootloader reset (attempt 3/3)...');
            await emergencyResetToBootloader(port); // Includes delay
            await delay(2000); // Bootloader needs more time
            await hardwareResetESP32(port);  // Hardware reset after bootloader (includes delay)
            await delay(2000); // Additional delay
          } else {
            safeSend('terminal-output', '⚠️ Final retry attempt (3/3)...');
            await hardResetPort(port); // Includes delay
            await delay(1500); // Additional delay
          }
          await pokeRawRepl(port); // Includes delay
          await delay(800); // Additional delay
          blankResult = await captureSerialOutput(port, blankCmd, 30000);
        }
        
        if (blankResult.success) {
          safeSend('terminal-output', '[SUCCESS] Previous code cleared');
          // Reset to run the blank code, stopping any previous loops
          await hardResetPort(port);
          await delay(1500); // Let blank code run (which does nothing)
        } else {
          // Even after 3 retries, board is stuck
          const errorHelp = isESP32 ? `
❌ Could not clear old code after 3 attempts (including emergency bootloader reset).

🔧 The ESP32 is stuck in a loop. Try these steps IN ORDER:

1️⃣ PHYSICAL RESET (Recommended - Try this first):
   - Hold the BOOT button on ESP32
   - While holding BOOT, press and release RESET button
   - Release BOOT button
   - ESP32 should now be in bootloader mode
   - Try uploading again immediately

2️⃣ USB POWER CYCLE:
   - Unplug the USB cable completely
   - Wait 5 seconds
   - Plug USB back in
   - Try uploading immediately

3️⃣ REFLASH FIRMWARE (Last resort):
   - Click "Flash MicroPython" button in toolbar
   - This will erase ALL code and reinstall MicroPython
   - Then try uploading your program again

💡 If Arduino IDE works but this app doesn't, the ESP32 likely has
   code running that blocks mpremote. Physical reset is fastest fix.
` : `
❌ Could not clear old code after 3 attempts.

🔧 The ${boardType} board is not responding. Try these steps:

1️⃣ PHYSICAL RESET:
   - Press the RESET button on your ${boardType} board
   - Wait 3 seconds
   - Try uploading again immediately

2️⃣ USB POWER CYCLE:
   - Unplug the USB cable completely
   - Wait 5 seconds
   - Plug USB back in
   - Try uploading immediately

3️⃣ CHECK CONNECTION:
   - Ensure the USB cable is properly connected
   - Try a different USB port
   - Make sure the board has MicroPython firmware installed

💡 If you recently uploaded code that blocks the board, a physical reset should help.
`;
          safeSend('terminal-output', errorHelp);
          res({ success: false, error: `${boardType} board stuck - physical reset required` });
          return;
        }

        // Upload with retry logic for "could not enter raw repl" error
        safeSend('terminal-output', `\n[UPLOAD] Transferring code to ${boardType}...`);
        
        // Upload helper libraries if referenced in code
        const helpersNeeded = detectHelperFiles(code);
        for (const helper of helpersNeeded) {
          try {
            safeSend('terminal-output', `[INFO] Installing library: ${helper.key}.py`);
            // Extra reset and delay before each helper to avoid raw REPL issues
            await hardResetPort(port);
            await delay(800);
            await pokeRawRepl(port);
            
            const uploadHelperCmd = `"${pythonPath}" -m mpremote connect ${port} fs cp "${helper.path.replace(/\\/g, '/')}" :${helper.key}.py`;
            const helperResult = await captureSerialOutput(port, uploadHelperCmd, 15000);
            if (!helperResult.success) {
              safeSend('terminal-output', `[WARNING] Failed to install ${helper.key}.py: ${helperResult.error || 'Unknown error'}`);
            } else {
              safeSend('terminal-output', `[SUCCESS] ${helper.key}.py installed`);
            }
          } catch (helperErr) {
            safeSend('terminal-output', `[WARNING] Error installing ${helper.key}.py: ${helperErr.message}`);
          }
          // Longer gap between helper uploads
          await delay(800);
        }
        
        // Deterministic, single-pass sequence (no parallel attempts)
        // Longer pause after hard reset to let MicroPython boot fully
        await delay(1500); // Increased from 1200ms
        await pokeRawRepl(port);
        await delay(500); // Wait for poke to take effect

        // Push main.py with TWO retries on raw repl failure (increased from one)
        const fsCpCmd = `"${pythonPath}" -m mpremote connect ${port} fs cp "${pyPath.replace(/\\/g, '/')}" :main.py`;
        let fsResult = await captureSerialOutput(port, fsCpCmd, 20000);
        
        // First retry
        if (!fsResult.success && (fsResult.error || '').includes('could not enter raw repl')) {
          safeSend('terminal-output', '[WARNING] Connection lost, retrying (1/2)...');
          await hardResetPort(port); // Includes delay
          await delay(1000); // Additional delay
          await pokeRawRepl(port); // Includes delay
          await delay(800); // Additional delay
          fsResult = await captureSerialOutput(port, fsCpCmd, 20000);
        }
        
        // Second retry
        if (!fsResult.success && (fsResult.error || '').includes('could not enter raw repl')) {
          safeSend('terminal-output', '[WARNING] Connection lost, retrying (2/2)...');
          await hardResetPort(port); // Includes delay
          await delay(1500); // Additional delay
          await pokeRawRepl(port); // Includes delay
          await delay(800); // Additional delay
          fsResult = await captureSerialOutput(port, fsCpCmd, 25000); // Longer timeout
        }
        if (!fsResult.success) {
          // Provide helpful error message with troubleshooting steps
          const errorMsg = fsResult.error || 'Upload failed (fs cp)';
          const helpText = `

❌ Failed to upload code after multiple attempts.

🔧 Troubleshooting steps:
1. Press the physical RESET button on your ${boardType} board
2. Wait 3 seconds, then try uploading again
3. If still failing, click "Flash MicroPython" button to reinstall firmware
4. Unplug and replug the USB cable
5. Try a different USB port

💡 The ${boardType} board may be running code that blocks uploads. 
   ${isESP32 ? 'Flashing MicroPython firmware will clear everything and start fresh.' : 'A physical reset usually resolves this issue.'}`;
          
          safeSend('terminal-output', helpText);
          res({ success: false, error: errorMsg });
          return;
        }
        await delay(300);

        // Optional exec removed to avoid timeout on long-running loops.
        // Instead, reset once more so main.py runs from boot.
        safeSend('terminal-output', '[INFO] Restarting board...');
        await hardResetPort(port);
        await delay(1200); // Give ESP32 time to boot and start executing

        console.log('[SUCCESS] Upload completed');
        safeSend('terminal-output', '\n[SUCCESS] Upload complete. Opening serial monitor...\n');
        safeSend('terminal-output', `========================================\n`);
        res({ success: true, output: 'Upload completed successfully' });
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

// ---- Board Status Check with Firmware Detection ----
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

// ---- Detect Firmware Type on Selected Port ----
ipcMain.handle('detect-firmware', async (_e, port) => {
  try {
    if (!port) {
      return { success: false, error: 'No port specified' };
    }
    
    console.log(`🔍 Checking firmware on ${port}...`);
    safeSend('terminal-output', `🔍 Checking firmware on ${port}...`);
    
    const firmwareInfo = await detectFirmwareType(port);
    
    if (firmwareInfo.compatible) {
      console.log(`✅ MicroPython detected on ${port}`);
      safeSend('terminal-output', `✅ MicroPython firmware detected`);
      safeSend('terminal-output', `   Version: ${firmwareInfo.version}`);
      return { 
        success: true, 
        firmware: 'micropython', 
        compatible: true,
        version: firmwareInfo.version
      };
    } else {
      console.log(`⚠️ Non-MicroPython firmware on ${port}`);
      safeSend('terminal-output', `⚠️ MicroPython firmware NOT detected`);
      safeSend('terminal-output', `   This port may have Arduino or other firmware`);
      safeSend('terminal-output', `   💡 You need to flash MicroPython firmware first`);
      return { 
        success: false, 
        firmware: 'other', 
        compatible: false,
        error: 'MicroPython firmware required'
      };
    }
  } catch (err) {
    console.error('❌ Firmware detection error:', err.message);
    return { 
      success: false, 
      error: err.message,
      firmware: 'unknown',
      compatible: false
    };
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

// ---- MicroPython Firmware Installation ----
ipcMain.handle('install-micropython', async (_e, port) => {
  try {
    console.log(`🚀 Installing MicroPython firmware on ${port}...`);
    safeSend('terminal-output', '');
    safeSend('terminal-output', '🚀 ==================================================');
    safeSend('terminal-output', '   MICROPYTHON FIRMWARE INSTALLATION');
    safeSend('terminal-output', '==================================================');
    safeSend('terminal-output', '');
    
    const pythonPath = await findPythonPath();
    const firmwarePath = path.join(__dirname, '..', 'ESP32_GENERIC-D2WD-20250809-v1.26.0.bin');
    
    // Check if firmware file exists
    if (!fs.existsSync(firmwarePath)) {
      const error = 'Firmware file not found: ESP32_GENERIC-D2WD-20250809-v1.26.0.bin';
      console.error(`❌ ${error}`);
      safeSend('terminal-output', `❌ ${error}`);
      return { success: false, error };
    }
    
    safeSend('terminal-output', `📄 Firmware file: ${path.basename(firmwarePath)}`);
    safeSend('terminal-output', `📡 Target port: ${port}`);
    safeSend('terminal-output', '');
    
    // Step 1: Check if esptool is installed
    safeSend('terminal-output', '🔍 Step 1/4: Checking esptool...');
    const esptoolCheck = await new Promise((resolve) => {
      exec(`"${pythonPath}" -m esptool version`, { timeout: 5000 }, (err, stdout) => {
        if (!err && stdout) {
          resolve({ success: true, version: stdout.trim() });
        } else {
          resolve({ success: false });
        }
      });
    });
    
    if (!esptoolCheck.success) {
      safeSend('terminal-output', '📦 esptool not found, installing...');
      const installResult = await new Promise((resolve) => {
        exec(`"${pythonPath}" -m pip install esptool`, { timeout: 60000 }, (err, stdout, stderr) => {
          if (err) {
            resolve({ success: false, error: stderr || err.message });
          } else {
            resolve({ success: true });
          }
        });
      });
      
      if (!installResult.success) {
        const error = `Failed to install esptool: ${installResult.error}`;
        safeSend('terminal-output', `❌ ${error}`);
        return { success: false, error };
      }
      safeSend('terminal-output', '✅ esptool installed successfully');
    } else {
      safeSend('terminal-output', `✅ esptool found: ${esptoolCheck.version}`);
    }
    
    // Step 2: Erase flash
    safeSend('terminal-output', '');
    safeSend('terminal-output', '🧹 Step 2/4: Erasing flash memory...');
    safeSend('terminal-output', '⏳ This may take 10-30 seconds...');
    
    const eraseCmd = `"${pythonPath}" -m esptool --port ${port} erase_flash`;
    const eraseResult = await new Promise((resolve) => {
      exec(eraseCmd, { timeout: 45000 }, (err, stdout, stderr) => {
        if (err) {
          resolve({ success: false, error: stderr || stdout || err.message });
        } else {
          resolve({ success: true, output: stdout });
        }
      });
    });
    
    if (!eraseResult.success) {
      const error = `Flash erase failed: ${eraseResult.error}`;
      safeSend('terminal-output', `❌ ${error}`);
      return { success: false, error };
    }
    safeSend('terminal-output', '✅ Flash erased successfully');
    
    // Step 3: Flash MicroPython firmware
    safeSend('terminal-output', '');
    safeSend('terminal-output', '📝 Step 3/4: Flashing MicroPython firmware...');
    safeSend('terminal-output', '⏳ This may take 30-60 seconds...');
    
    const flashCmd = `"${pythonPath}" -m esptool --chip esp32 --port ${port} write_flash -z 0x1000 "${firmwarePath}"`;
    const flashResult = await new Promise((resolve) => {
      exec(flashCmd, { timeout: 90000 }, (err, stdout, stderr) => {
        if (err) {
          resolve({ success: false, error: stderr || stdout || err.message });
        } else {
          resolve({ success: true, output: stdout });
        }
      });
    });
    
    if (!flashResult.success) {
      const error = `Firmware flash failed: ${flashResult.error}`;
      safeSend('terminal-output', `❌ ${error}`);
      return { success: false, error };
    }
    safeSend('terminal-output', '✅ MicroPython firmware flashed successfully');
    
    // Step 4: Verify installation
    safeSend('terminal-output', '');
    safeSend('terminal-output', '🔍 Step 4/4: Verifying installation...');
    await delay(2000); // Give ESP32 time to boot
    
    const verifyCmd = `"${pythonPath}" -m mpremote connect ${port} exec "import sys; print(sys.implementation)"`;
    const verifyResult = await new Promise((resolve) => {
      exec(verifyCmd, { timeout: 10000 }, (err, stdout, stderr) => {
        if (!err && stdout && stdout.includes('micropython')) {
          resolve({ success: true, output: stdout });
        } else {
          resolve({ success: false, error: stderr || 'Verification failed' });
        }
      });
    });
    
    safeSend('terminal-output', '');
    safeSend('terminal-output', '==================================================');
    
    if (verifyResult.success) {
      console.log('✅ MicroPython installation completed and verified');
      safeSend('terminal-output', '✅ SUCCESS! MicroPython installed and verified');
      safeSend('terminal-output', '==================================================');
      safeSend('terminal-output', '');
      safeSend('terminal-output', '🎉 Your ESP32 is now ready to use!');
      safeSend('terminal-output', '💡 You can now upload MicroPython code');
      safeSend('terminal-output', '');
      return { success: true, output: 'MicroPython installed successfully' };
    } else {
      console.log('⚠️ Firmware flashed but verification failed');
      safeSend('terminal-output', '⚠️ Firmware flashed but verification incomplete');
      safeSend('terminal-output', '==================================================');
      safeSend('terminal-output', '');
      safeSend('terminal-output', '💡 Try unplugging and replugging the ESP32');
      safeSend('terminal-output', '💡 Then select the port again and try uploading');
      safeSend('terminal-output', '');
      return { success: true, output: 'Firmware flashed (verification incomplete)' };
    }
    
  } catch (err) {
    console.error('❌ MicroPython installation error:', err.message);
    safeSend('terminal-output', '');
    safeSend('terminal-output', '❌ Installation error: ' + err.message);
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
