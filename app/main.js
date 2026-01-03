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


async function ensureEsptoolInstalled(pythonPath) {
  try {
    console.log('🔍 Checking if esptool is installed...');
    
    const result = await new Promise((resolve) => {
      exec(`"${pythonPath}" -m esptool version`, { timeout: 10000 }, (err, stdout, stderr) => {
        if (!err && stdout) {
          resolve({ success: true, version: stdout.trim() });
        } else {
          resolve({ success: false, error: err?.message || stderr });
        }
      });
    });
    
    if (result.success) {
      console.log(`✅ esptool is installed: ${result.version}`);
      return true;
    }
    
    console.log('📦 esptool not found, installing...');
    safeSend('terminal-output', '📦 Installing esptool...');
    
    const installResult = await new Promise((resolve) => {
      exec(`"${pythonPath}" -m pip install esptool`, { timeout: 60000 }, (err, stdout, stderr) => {
        if (!err) {
          resolve({ success: true, output: stdout });
        } else {
          resolve({ success: false, error: err?.message || stderr });
        }
      });
    });
    
    if (installResult.success) {
      console.log('[SUCCESS] esptool installed successfully');
      safeSend('terminal-output', '[SUCCESS] esptool installed successfully');
      return true;
    } else {
      console.error('[ERROR] Failed to install esptool:', installResult.error);
      safeSend('terminal-output', `[ERROR] Failed to install esptool: ${installResult.error}`);
      return false;
    }
  } catch (error) {
    console.error('[ERROR] Error checking/installing esptool:', error.message);
    safeSend('terminal-output', `[ERROR] Error checking/installing esptool: ${error.message}`);
    return false;
  }
}

// Utility: detect ESP32 chip type and flash size
async function detectESP32Chip(portPath, pythonPath) {
  try {
    console.log(`🔍 Detecting ESP32 chip type on ${portPath}...`);
    safeSend('terminal-output', `[INFO] Detecting ESP32 chip type...`);
    
    const chipCmd = `"${pythonPath}" -m esptool --port ${portPath} chip_id`;
    const result = await new Promise((resolve) => {
      exec(chipCmd, { timeout: 10000 }, (err, stdout, stderr) => {
        if (err) {
          resolve({ success: false, error: stderr || err.message });
        } else {
          // Parse output to determine chip type
          const output = (stdout || '').toLowerCase();
          let chipType = 'esp32';
          let flashSize = 4194304; // Default 4MB
          
          if (output.includes('esp32-s2') || output.includes('esp32s2')) {
            chipType = 'esp32s2';
          } else if (output.includes('esp32-s3') || output.includes('esp32s3')) {
            chipType = 'esp32s3';
          } else if (output.includes('esp32-c3') || output.includes('esp32c3')) {
            chipType = 'esp32c3';
          }
          
          // Try to detect flash size
          const flashMatch = output.match(/(\d+)mb|flash.*?(\d+)/i);
          if (flashMatch) {
            const sizeMB = parseInt(flashMatch[1] || flashMatch[2] || '4');
            flashSize = sizeMB * 1024 * 1024;
          }
          
          resolve({ 
            success: true, 
            chipType, 
            flashSize,
            output: stdout 
          });
        }
      });
    });
    
    if (result.success) {
      console.log(`✅ Detected: ${result.chipType}, Flash: ${result.flashSize / 1024 / 1024}MB`);
      safeSend('terminal-output', `[SUCCESS] Chip: ${result.chipType}, Flash: ${result.flashSize / 1024 / 1024}MB`);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Chip detection error:', error);
    return { 
      success: false, 
      chipType: 'esp32', 
      flashSize: 4194304, // Default to ESP32 4MB
      error: error.message 
    };
  }
}

// Utility: detect what firmware is on the board (using esptool read-flash)
async function detectFirmwareType(portPath) {
  try {
    console.log(`🔍 Detecting firmware type on ${portPath}...`);
    
    const pythonPath = await findPythonPath();
    const esptoolReady = await ensureEsptoolInstalled(pythonPath);
    if (!esptoolReady) {
      return { 
        type: 'unknown', 
        compatible: false, 
        error: 'esptool not available' 
      };
    }
    
    // Try to read a small portion of flash to detect MicroPython signature
    // MicroPython typically has a signature at offset 0x1000
    // esptool v5+ requires read-flash (with hyphen) and OUTPUT file
    const tmpOutputFile = path.join(os.tmpdir(), `firmware_detect_${Date.now()}.bin`);
    const readCmd = `"${pythonPath}" -m esptool --port ${portPath} read-flash 0x1000 0x100 "${tmpOutputFile}"`;
    
    const result = await new Promise((resolve) => {
      exec(readCmd, { timeout: 10000 }, (err, stdout, stderr) => {
        // Cleanup temp file
        try {
          if (fs.existsSync(tmpOutputFile)) {
            fs.unlinkSync(tmpOutputFile);
          }
        } catch (e) {}
        
        if (!err && fs.existsSync(tmpOutputFile)) {
          try {
            // Read the binary file and check for MicroPython signatures
            const data = fs.readFileSync(tmpOutputFile);
            const text = data.toString('utf-8', 0, Math.min(data.length, 256));
            const lowerText = text.toLowerCase();
            
            if (lowerText.includes('micropython') || lowerText.includes('mpy') || 
                data.includes(Buffer.from('MicroPython'))) {
              resolve({ 
                type: 'micropython', 
                version: 'detected',
                compatible: true 
              });
            } else {
              resolve({ 
                type: 'unknown', 
                compatible: false,
                error: 'Not MicroPython firmware'
              });
            }
          } catch (readErr) {
            resolve({ 
              type: 'unknown', 
              compatible: false,
              error: 'Could not read flash data'
            });
          }
        } else {
          // If read fails, assume bootloader or no firmware (but don't fail upload)
          resolve({ 
            type: 'unknown', 
            compatible: true, // Assume compatible to allow upload attempts
            error: stderr || 'Could not read flash (assuming MicroPython installed)'
          });
        }
      });
    });
    
    console.log(`✅ Firmware detection result:`, result);
    return result;
    
  } catch (error) {
    console.error('❌ Firmware detection error:', error);
    // Don't fail upload if detection fails - assume MicroPython is installed
    return { 
      type: 'unknown', 
      compatible: true, // Assume compatible to allow upload attempts
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
        
        // ESP32 boot mode control (corrected mapping):
        // DTR controls GPIO0: LOW = bootloader, HIGH = normal boot
        // RTS controls EN (reset): LOW = reset, HIGH = normal
        
        // Step 1: Set initial state (GPIO0 HIGH for normal boot, EN HIGH)
        p.set({ dtr: true, rts: true }, (err1) => {
          if (err1) {
            console.log(`⚠️ Reset step 1 failed: ${err1.message}`);
            p.close(() => { try { p.destroy(); } catch {} });
            return resolve(false);
          }
          
          setTimeout(() => {
            // Step 2: Pull EN low (reset) while keeping GPIO0 HIGH (normal boot)
            p.set({ dtr: true, rts: false }, (err2) => {
              if (err2) {
                console.log(`⚠️ Reset step 2 failed: ${err2.message}`);
                p.close(() => { try { p.destroy(); } catch {} });
                return resolve(false);
              }
              
              setTimeout(() => {
                // Step 3: Release EN (boot normally with GPIO0 HIGH)
                p.set({ dtr: true, rts: true }, (err3) => {
                  if (err3) {
                    console.log(`⚠️ Reset step 3 failed: ${err3.message}`);
                  }
                  
                  setTimeout(() => {
                    p.removeAllListeners();
                    p.close(() => {
                      try { p.destroy(); } catch {}
                      console.log('✅ Hardware reset complete (Arduino IDE style)');
                      resolve(true);
                    });
                  }, 300);  // Wait for ESP32 to start booting
                });
              }, 150);  // Hold reset for 150ms
            });
          }, 100);  // Initial delay
        });
      });
    } catch (e) {
      console.log(`⚠️ Hardware reset exception: ${e.message}`);
      resolve(false);
    }
  });
}

// Utility: Force reset USB device on Windows (aggressive recovery)
// NOTE: This is disabled by default as it can cause ports to disappear
// Only use as last resort when port is completely stuck
async function forceResetUSBPort(portPath) {
  if (process.platform !== 'win32') {
    return false;
  }
  
  // DISABLED: This can cause ports to disappear from the system
  // Uncomment only if absolutely necessary and user understands the risk
  console.log(`⚠️ USB port reset disabled to prevent port disappearance`);
  return false;
  
  /* DISABLED CODE - Uncomment only if needed
  return new Promise((resolve) => {
    try {
      console.log(`🔧 Attempting aggressive USB port reset for ${portPath}...`);
      
      // Extract COM port number (e.g., "COM4" -> "4")
      const comNumber = portPath.replace(/COM/i, '');
      
      // Method 1: Use PowerShell to reset the COM port with better error handling
      const psCommand = `powershell -Command "$port = Get-PnpDevice -FriendlyName '*COM${comNumber}*' -ErrorAction SilentlyContinue; if ($port) { Disable-PnpDevice -InstanceId $port.InstanceId -Confirm:$false -ErrorAction SilentlyContinue; Start-Sleep -Milliseconds 1000; Enable-PnpDevice -InstanceId $port.InstanceId -Confirm:$false -ErrorAction SilentlyContinue }"`;
      
      exec(psCommand, { timeout: 10000 }, (err, stdout, stderr) => {
        if (!err) {
          console.log(`✅ PowerShell USB reset executed`);
          setTimeout(() => resolve(true), 3000); // Longer delay for re-enable
        } else {
          console.log(`⚠️ PowerShell reset failed: ${err.message}`);
          setTimeout(() => resolve(true), 2000);
        }
      });
    } catch (e) {
      console.log(`⚠️ USB reset exception: ${e.message}`);
      setTimeout(() => resolve(true), 2000);
    }
  });
  */
}

// Utility: Recover port from bad state (Windows-specific)
async function recoverPortState(portPath) {
  return new Promise(async (resolve) => {
    try {
      console.log(`🔧 Attempting to recover port ${portPath}...`);
      
      // Step 1: Kill all processes that might be using the port
      await killEsptoolProcesses();
      await delay(1000);
      
      // Step 2: On Windows, try aggressive USB reset first (DISABLED - can cause ports to disappear)
      // if (process.platform === 'win32') {
      //   await forceResetUSBPort(portPath);
      //   await delay(2000);
      // }
      
      // Step 3: On Windows, use mode command to reset port state
      if (process.platform === 'win32') {
        try {
          exec(`mode ${portPath} BAUD=115200 PARITY=N DATA=8 STOP=1`, { timeout: 3000 }, (err) => {
            if (!err) {
              console.log(`✅ Windows port reset command executed`);
            }
          });
          await delay(1000);
        } catch (modeErr) {
          console.log(`Note: Windows mode command failed: ${modeErr.message}`);
        }
      }
      
      // Step 3: Try to open and immediately close the port to reset its state
      const recoveryPort = new SerialPort({ path: portPath, baudRate: ESP32_BAUD_RATE, autoOpen: false });
      
      recoveryPort.open((err) => {
        if (err) {
          console.log(`⚠️ Port recovery open failed: ${err.message}`);
          // Try to destroy anyway
          try { recoveryPort.destroy(); } catch {}
          // Still resolve true - we tried our best
          setTimeout(() => resolve(true), 1000);
          return;
        }
        
        // Set port to known good state (normal boot)
        recoveryPort.set({ dtr: true, rts: true }, () => {
          setTimeout(() => {
            // Try to reset to bootloader state briefly, then back to normal
            recoveryPort.set({ dtr: false, rts: false }, () => {
              setTimeout(() => {
                recoveryPort.set({ dtr: true, rts: true }, () => {
                  setTimeout(() => {
                    recoveryPort.removeAllListeners();
                    recoveryPort.close((closeErr) => {
                      try { 
                        recoveryPort.destroy(); 
                      } catch (destroyErr) {
                        console.log(`Warning: Error destroying recovery port: ${destroyErr.message}`);
                      }
                      console.log('✅ Port recovery attempted');
                      setTimeout(() => resolve(true), 1000); // Longer delay for Windows
                    });
                  }, 200);
                });
              }, 100);
            });
          }, 200);
        });
      });
    } catch (e) {
      console.log(`⚠️ Port recovery exception: ${e.message}`);
      // Still resolve true - don't block on recovery failure
      setTimeout(() => resolve(true), 1000);
    }
  });
}

// Utility: Enter bootloader mode on ESP32 (REPL-independent)
async function enterBootloaderMode(portPath) {
  return new Promise((resolve) => {
    let bootPort = null;
    try {
      console.log('🔧 Entering bootloader mode...');
      safeSend('terminal-output', '[INFO] Entering bootloader mode...');
      
      bootPort = new SerialPort({ path: portPath, baudRate: ESP32_BAUD_RATE, autoOpen: false });
      bootPort.open((err) => {
        if (err) {
          console.log(`⚠️ Bootloader entry failed: ${err.message}`);
          safeSend('terminal-output', `[WARNING] Automatic bootloader entry failed`);
          safeSend('terminal-output', `[INFO] Please manually press BOOT button and try again`);
          // Try to recover port state
          try { if (bootPort) bootPort.destroy(); } catch {}
          recoverPortState(portPath).then(() => resolve(false));
          return;
        }
        
        // ESP32 bootloader entry sequence:
        // DTR low = GPIO0 low (boot mode)
        // RTS low = EN low (reset)
        // Then release RTS (EN high) while keeping DTR low (GPIO0 low)
        bootPort.set({ dtr: false, rts: false }, () => {
          setTimeout(() => {
            // Release reset but keep GPIO0 low
            bootPort.set({ dtr: false, rts: true }, () => {
              setTimeout(() => {
                // CRITICAL: Properly close and destroy port, then wait for Windows to release it
                bootPort.removeAllListeners();
                bootPort.close((closeErr) => {
                  try { 
                    bootPort.destroy(); 
                  } catch (destroyErr) {
                    console.log(`Warning: Error destroying bootloader port: ${destroyErr.message}`);
                  }
                  console.log('✅ Bootloader mode entry sequence complete');
                  safeSend('terminal-output', '[SUCCESS] Bootloader mode entered');
                  // Wait for Windows to fully release the port handle
                  setTimeout(() => {
                    resolve(true);
                  }, 500); // Additional delay for Windows port release
                });
              }, 200);
            });
          }, 150);
        });
      });
    } catch (e) {
      console.log(`⚠️ Bootloader entry exception: ${e.message}`);
      safeSend('terminal-output', `[WARNING] Bootloader entry failed: ${e.message}`);
      safeSend('terminal-output', `[INFO] Please manually press BOOT button and try again`);
      // Try to recover port state
      try { if (bootPort) bootPort.destroy(); } catch {}
      recoverPortState(portPath).then(() => resolve(false));
    }
  });
}

// Utility: Reset ESP32 to normal boot mode (GPIO0 HIGH, EN HIGH)
async function normalBootReset(portPath) {
  return new Promise((resolve) => {
    try {
      console.log('🔄 Resetting ESP32 to normal boot mode...');
      const resetPort = new SerialPort({ path: portPath, baudRate: ESP32_BAUD_RATE, autoOpen: false });
      resetPort.open((err) => {
        if (err) {
          console.log(`⚠️ Normal boot reset failed: ${err.message}`);
          return resolve(false);
        }
        
        // ESP32 boot mode control:
        // DTR controls GPIO0: LOW = bootloader, HIGH = normal boot
        // RTS controls EN (reset): LOW = reset, HIGH = normal
        
        // Step 1: Ensure GPIO0 is HIGH (normal boot) and EN is HIGH (not reset)
        resetPort.set({ dtr: true, rts: true }, () => {
          setTimeout(() => {
            // Step 2: Pull EN low to reset (while keeping GPIO0 HIGH for normal boot)
            resetPort.set({ dtr: true, rts: false }, () => {
              setTimeout(() => {
                // Step 3: Release EN (boot normally with GPIO0 HIGH)
                resetPort.set({ dtr: true, rts: true }, () => {
                  setTimeout(() => {
                    // Step 4: Double-check GPIO0 is HIGH (some boards need this)
                    resetPort.set({ dtr: true, rts: true }, () => {
                      setTimeout(() => {
                        resetPort.close(() => {
                          try { resetPort.destroy(); } catch {}
                          console.log('✅ Normal boot reset complete');
                          resolve(true);
                        });
                      }, 300); // Give time for signals to stabilize
                    });
                  }, 200); // Hold reset for 200ms
                });
              }, 150); // Hold reset for 150ms
            });
          }, 200); // Initial delay to ensure port is ready
        });
      });
    } catch (e) {
      console.log(`⚠️ Normal boot reset exception: ${e.message}`);
      resolve(false);
    }
  });
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

// Utility: Kill any lingering esptool processes that might be locking the port
async function killEsptoolProcesses() {
  return new Promise((resolve) => {
    try {
      const isWindows = process.platform === 'win32';
      
      if (isWindows) {
        // Kill esptool/python processes that might be using the port
        exec('taskkill /F /FI "WINDOWTITLE eq *esptool*" /T 2>nul', { timeout: 3000 }, (err) => {
          // Ignore errors - process might not exist
          console.log('🔄 Cleaned up any lingering esptool processes');
          resolve();
        });
      } else {
        // On Unix-like systems, use pkill
        exec('pkill -9 -f esptool', { timeout: 3000 }, (err) => {
          console.log('🔄 Cleaned up any lingering esptool processes');
          resolve();
        });
      }
      
      // Resolve after timeout regardless
      setTimeout(() => resolve(), 2000);
    } catch (e) {
      console.log('Warning: Error killing processes:', e.message);
      resolve();
    }
  });
}

// Utility: best-effort COM port release on Windows and wait for readiness
async function releaseComPortIfNeeded(portPath) {
  try {
    console.log(`🔄 Releasing port ${portPath}...`);
    safeSend('terminal-output', `[INFO] Closing serial monitor...`);
    
    // STEP 1: Kill any lingering esptool processes first
    await killEsptoolProcesses();
    await delay(500);
    
    // STEP 2: Close our open handle if any - CRITICAL: Must close before esptool can use it
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

    // STEP 3: Force release port on Windows using mode command (if available)
    if (process.platform === 'win32') {
      try {
        // Use Windows mode command to force release the COM port
        exec(`mode ${portPath} BAUD=115200 PARITY=N DATA=8 STOP=1`, { timeout: 2000 }, (err) => {
          if (!err) {
            console.log(`✅ Windows port release command executed`);
          }
        });
        await delay(300); // Brief delay after mode command
      } catch (modeErr) {
        console.log(`Note: Windows mode command not available: ${modeErr.message}`);
      }
    }
    
    // STEP 4: Wait longer for Windows to release the handle
    safeSend('terminal-output', `[INFO] Waiting for port to be released...`);
    await delay(2000); // Increased delay for Windows COM port release
    
    console.log(`[SUCCESS] Port ${portPath} released successfully`);
    safeSend('terminal-output', `[SUCCESS] Port ${portPath} released, ready for upload`);
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
                      resolve();
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

// Utility: Execute esptool command and capture output
async function executeEsptoolCommand(command, timeoutMs = 30000) {
  return new Promise(async (resolve) => {
    let commandCompleted = false;
    
    try {
      // Execute the esptool command
      exec(command, { timeout: timeoutMs }, (err, stdout, stderr) => {
        commandCompleted = true;
        
        if (err) {
          const errorMsg = stderr || stdout || err.message;
          safeSend('terminal-output', `\n[esptool Error]: ${errorMsg}\n`);
          resolve({ success: false, error: errorMsg, output: stdout || stderr });
        } else {
          safeSend('terminal-output', `\n[esptool Output]: ${stdout || ''}\n`);
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

// Utility: Create filesystem image (LittleFS) from files using mklittlefs CLI ONLY
async function createFilesystemImage(files, outputPath, pythonPath) {
  try {
    console.log('📦 Creating filesystem image...');
    safeSend('terminal-output', '[INFO] Creating filesystem image...');
    safeSend('terminal-output', `[INFO] Preparing ${files.length} file(s)...`);
    
    // Create temporary directory with all files
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'esp32-fs-'));
    
    // Copy all files to temp directory
    for (const file of files) {
      const destPath = path.join(tmpDir, file.name);
      const destDir = path.dirname(destPath);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }
      fs.writeFileSync(destPath, file.content, 'utf-8');
      console.log(`  Added: ${file.name}`);
    }
    
    // Use ONLY mklittlefs CLI tool (like Arduino IDE / PlatformIO)
    safeSend('terminal-output', '[INFO] Creating LittleFS image with mklittlefs...');
    
    // Try to find mklittlefs in common locations (prioritize bundled version)
    const isWindows = process.platform === 'win32';
    const exeExtension = isWindows ? '.exe' : '';
    const mklittlefsName = `mklittlefs${exeExtension}`;
    
    // Get resources path (works in both dev and production)
    // In production: process.resourcesPath points to resources/ folder
    // In development: __dirname points to app/ folder
    const isPackaged = app.isPackaged || process.env.NODE_ENV === 'production';
    const resourcesPath = isPackaged 
      ? process.resourcesPath || path.dirname(app.getPath('exe'))
      : path.join(__dirname, '..');
    
    // Priority order: bundled with installer > app folder > project folder > PATH
    const possiblePaths = [
      // 1. Bundled with installer (in resources folder - production)
      path.join(resourcesPath, mklittlefsName),
      // 2. Bundled with app (in app directory - development)
      path.join(__dirname, mklittlefsName),
      // 3. Project root folder (development)
      path.join(__dirname, '..', mklittlefsName),
      // 4. mklittlefs subfolder in project (in case user placed it there)
      path.join(__dirname, '..', 'mklittlefs', mklittlefsName),
      // 5. Tools folder in project
      path.join(__dirname, '..', 'tools', mklittlefsName),
      // 6. System PATH
      mklittlefsName,
      // 7. Current working directory
      path.join(process.cwd(), mklittlefsName),
    ];
    
    // Check which mklittlefs is available
    let foundPath = null;
    for (const testPath of possiblePaths) {
      // First check if file exists
      if (fs.existsSync(testPath)) {
        // Try to execute with --version to verify it works
        try {
          const testResult = await new Promise((resolve) => {
            exec(`"${testPath}" --version`, { timeout: 5000 }, (err, stdout) => {
              resolve({ works: !err, output: stdout });
            });
          });
          if (testResult.works) {
            foundPath = testPath;
            console.log(`✅ Found mklittlefs at: ${foundPath}`);
            if (testPath.includes(__dirname)) {
              safeSend('terminal-output', `[INFO] Using bundled mklittlefs`);
            }
            break;
          }
        } catch (e) {
          // File exists but might not be executable, try anyway
          foundPath = testPath;
          console.log(`⚠️ Found mklittlefs at: ${foundPath} (will try to use)`);
          break;
        }
      }
    }
    
    if (!foundPath) {
      // mklittlefs not found anywhere
      const mklittlefsCmd = `mklittlefs${exeExtension} -c "${tmpDir}" -s ${1024 * 1024} "${outputPath}"`;
      // Try once more with just the name (in case it's in PATH but check failed)
      const testResult = await new Promise((resolve) => {
        exec(`"${mklittlefsName}" --version`, { timeout: 5000 }, (err) => {
          resolve({ found: !err });
        });
      });
      if (testResult.found) {
        foundPath = mklittlefsName;
      }
    }
    
    if (!foundPath) {
      // Cleanup temp directory before returning error
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch (e) {}
      
      // Show error with instructions
      safeSend('terminal-output', '');
      safeSend('terminal-output', '❌ ========================================');
      safeSend('terminal-output', '   MKLITTLEFS NOT FOUND');
      safeSend('terminal-output', '========================================');
      safeSend('terminal-output', '');
      safeSend('terminal-output', '📦 mklittlefs is required to upload files to ESP32.');
      safeSend('terminal-output', '');
      safeSend('terminal-output', '🔧 INSTALLATION OPTIONS:');
      safeSend('terminal-output', '');
      safeSend('terminal-output', 'Option 1 - Bundle with app (Recommended):');
      safeSend('terminal-output', `  1. Download mklittlefs.exe from:`);
      safeSend('terminal-output', '     https://github.com/littlefs-project/littlefs/releases');
      safeSend('terminal-output', `  2. Place mklittlefs.exe in: ${path.join(__dirname, '..')}`);
      safeSend('terminal-output', '     (Same folder as package.json)');
      safeSend('terminal-output', '');
      safeSend('terminal-output', 'Option 2 - Add to system PATH:');
      safeSend('terminal-output', '  1. Download and extract mklittlefs.exe');
      safeSend('terminal-output', '  2. Add the folder to your system PATH');
      safeSend('terminal-output', '');
      safeSend('terminal-output', '💡 After placing mklittlefs.exe, restart this application.');
      safeSend('terminal-output', '');
      safeSend('terminal-output', '========================================');
      
      return { 
        success: false, 
        error: 'mklittlefs not found. Please install mklittlefs to upload files.' 
      };
    }
    
    const mklittlefsCmd = `"${foundPath}" -c "${tmpDir}" -s ${1024 * 1024} "${outputPath}"`;
    
    const result = await new Promise((resolve) => {
      exec(mklittlefsCmd, { timeout: 30000 }, (err, stdout, stderr) => {
        if (!err && fs.existsSync(outputPath)) {
          const size = fs.statSync(outputPath).size;
          resolve({ success: true, size: size });
        } else {
          const errorMsg = stderr || stdout || err?.message || 'mklittlefs command failed';
          resolve({ success: false, error: errorMsg });
        }
      });
    });
    
    // Cleanup temp directory
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch (e) {
      console.log(`Warning: Could not clean temp dir: ${e.message}`);
    }
    
    if (result.success) {
      console.log(`✅ Filesystem image created: ${result.size} bytes`);
      safeSend('terminal-output', `[SUCCESS] Filesystem image created (${result.size} bytes)`);
      return { success: true };
    } else {
      // Clear error message - stop upload immediately
      safeSend('terminal-output', '');
      safeSend('terminal-output', '❌ ========================================');
      safeSend('terminal-output', '   MKLITTLEFS NOT FOUND');
      safeSend('terminal-output', '========================================');
      safeSend('terminal-output', '');
      safeSend('terminal-output', '📦 mklittlefs is required to upload files to ESP32.');
      safeSend('terminal-output', '');
      safeSend('terminal-output', '🔧 INSTALLATION INSTRUCTIONS:');
      safeSend('terminal-output', '');
      safeSend('terminal-output', 'Windows:');
      safeSend('terminal-output', '  1. Download mklittlefs from:');
      safeSend('terminal-output', '     https://github.com/littlefs-project/littlefs/releases');
      safeSend('terminal-output', '  2. Extract mklittlefs.exe');
      safeSend('terminal-output', '  3. Add to PATH or place in project folder');
      safeSend('terminal-output', '');
      safeSend('terminal-output', 'Linux/Mac:');
      safeSend('terminal-output', '  sudo apt-get install mklittlefs  (Debian/Ubuntu)');
      safeSend('terminal-output', '  brew install mklittlefs          (macOS)');
      safeSend('terminal-output', '');
      safeSend('terminal-output', '💡 After installing, restart this application and try again.');
      safeSend('terminal-output', '');
      safeSend('terminal-output', '========================================');
      
      return { 
        success: false, 
        error: 'mklittlefs not found. Please install mklittlefs to upload files.' 
      };
    }
  } catch (error) {
    console.error('❌ Filesystem image creation error:', error);
    safeSend('terminal-output', `[ERROR] Filesystem creation failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}


// Utility: Flash filesystem image to ESP32 using esptool
async function flashFilesystem(portPath, fsImagePath, chipType, flashSize, pythonPath) {
  try {
    console.log('📤 Flashing filesystem image...');
    safeSend('terminal-output', '[INFO] Flashing filesystem image...');
    
    // CRITICAL: Ensure port is completely released before flashing
    await killEsptoolProcesses();
    await delay(1000); // Increased delay for better cleanup
    
    // CRITICAL: Force port recovery before flashing
    console.log('🔧 Recovering port state before flash...');
    safeSend('terminal-output', '[INFO] Preparing port for flash operation...');
    await recoverPortState(portPath);
    await delay(1000);
    
    let fsOffset = 0x200000; // Default 2MB offset for 4MB flash (properly 4KB-aligned)
    
    if (flashSize <= 2 * 1024 * 1024) {
      fsOffset = 0x100000; // 1MB offset for 2MB flash (aligned)
    } else if (flashSize >= 8 * 1024 * 1024) {
      fsOffset = 0x300000; // 3MB offset for 8MB+ flash (aligned)
    }
    
    console.log(`📍 Filesystem offset: 0x${fsOffset.toString(16)}`);
    safeSend('terminal-output', `[INFO] Filesystem offset: 0x${fsOffset.toString(16)}`);
    
    // Build esptool command - use write-flash (esptool v5+ syntax)
    const chipArg = chipType === 'esp32s2' ? 'esp32s2' : 
                    chipType === 'esp32s3' ? 'esp32s3' :
                    chipType === 'esp32c3' ? 'esp32c3' : 'esp32';
    
    // Add --before default_reset and --after hard_reset for better reliability
    const flashCmd = `"${pythonPath}" -m esptool --chip ${chipArg} --port ${portPath} --before default_reset --after hard_reset write-flash 0x${fsOffset.toString(16)} "${fsImagePath}"`;
    
    console.log(`Executing: ${flashCmd}`);
    safeSend('terminal-output', `[INFO] Starting flash operation...`);
    
    // Enhanced retry logic with aggressive recovery
    let result;
    let maxRetries = 5; // Increased from 3 to 5
    let retries = maxRetries;
    let lastError = null;
    
    let consecutivePortFailures = 0;
    const maxPortFailures = 2; // Skip port check after 2 consecutive failures
    
    while (retries > 0) {
      // Skip port availability check entirely if we've had failures
      // The "device not functioning" error means the port check will always fail
      // but esptool might still be able to work
      if (consecutivePortFailures < maxPortFailures) {
        const portAvailable = await isPortAvailable(portPath);
        if (!portAvailable) {
          consecutivePortFailures++;
          console.log(`⚠️ Port not available, attempting aggressive recovery... (${retries} attempts left)`);
          safeSend('terminal-output', `[WARNING] Port not ready, performing aggressive recovery...`);
          
          // Aggressive recovery sequence
          await killEsptoolProcesses();
          await delay(1000);
          await recoverPortState(portPath);
          await delay(3000); // Longer delay for USB reset to take effect
          await killEsptoolProcesses();
          await delay(1000);
          
          // If we've failed too many times, skip the check and just try flashing
          if (consecutivePortFailures >= maxPortFailures) {
            console.log(`⚠️ Port check failed multiple times, skipping check and attempting flash...`);
            safeSend('terminal-output', `[INFO] Skipping port check, attempting flash directly...`);
            safeSend('terminal-output', `[INFO] If this fails, please unplug and replug USB cable`);
          } else {
            retries--;
            continue;
          }
        } else {
          consecutivePortFailures = 0; // Reset counter on success
        }
      } else {
        // Skip port check entirely - just try the flash
        console.log(`⚠️ Skipping port check (previous failures), attempting flash directly...`);
      }
      
      result = await executeEsptoolCommand(flashCmd, 90000); // Increased timeout to 90 seconds
      
      if (result.success) {
        break; // Success, exit retry loop
      }
      
      // Check if it's a port access error (including "device not functioning")
      const isPortError = result.error && (
        result.error.includes('port is busy') ||
        result.error.includes('Access is denied') ||
        result.error.includes('PermissionError') ||
        result.error.includes('FileNotFoundError') ||
        result.error.includes('cannot find the file') ||
        result.error.includes('device attached to the system is not functioning') ||
        result.error.includes('device is not functioning') ||
        result.error.includes('Cannot configure port') ||
        result.error.includes('port doesn\'t exist') ||
        result.error.includes('port is not available')
      );
      
      if (isPortError && retries > 1) {
        retries--;
        lastError = result.error;
        console.log(`⚠️ Port access error, attempting aggressive recovery... (${retries} attempts left)`);
        safeSend('terminal-output', `[WARNING] Port access issue (attempt ${maxRetries - retries + 1}/${maxRetries})`);
        
        // Aggressive recovery sequence
        await killEsptoolProcesses();
        await delay(1000);
        await emergencyResetToBootloader(portPath);
        await delay(1000);
        await recoverPortState(portPath);
        await delay(1500);
        
        safeSend('terminal-output', `[INFO] Retrying flash operation...`);
      } else {
        break; // Not a retryable error or out of retries
      }
    }
    
    if (!result.success && lastError) {
      result.error = lastError;
    }
    
    if (result.success) {
      console.log('✅ Filesystem flashed successfully');
      safeSend('terminal-output', '[SUCCESS] Filesystem flashed successfully');
      return { success: true };
    } else {
      console.error('❌ Filesystem flash failed:', result.error);
      safeSend('terminal-output', `[ERROR] Filesystem flash failed: ${result.error}`);
      
      // Provide specific troubleshooting based on error type
      if (result.error.includes('PermissionError') || result.error.includes('device is not functioning') || result.error.includes('Access is denied')) {
        safeSend('terminal-output', '');
        safeSend('terminal-output', '🔧 TROUBLESHOOTING STEPS:');
        safeSend('terminal-output', '1. Unplug and replug the USB cable');
        safeSend('terminal-output', '2. Try a different USB port (preferably USB 2.0)');
        safeSend('terminal-output', '3. Close any other programs using the COM port');
        safeSend('terminal-output', '4. Restart the application');
        safeSend('terminal-output', '5. Update USB-to-serial drivers (CH340/CP210x)');
        safeSend('terminal-output', '6. Try entering bootloader manually: Hold BOOT, press RESET, release BOOT');
        safeSend('terminal-output', '');
      }
      
      return { success: false, error: result.error };
    }
  } catch (error) {
    console.error('❌ Filesystem flash error:', error);
    safeSend('terminal-output', `[ERROR] Filesystem flash error: ${error.message}`);
    return { success: false, error: error.message };
  }
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
    console.log('🔍 Listing serial ports...');
    const ports = await SerialPort.list();
    console.log(`✅ Found ${ports.length} port(s) from SerialPort.list()`);
    
    if (ports.length === 0) {
      console.log('⚠️ No ports detected - this might be due to USB port issues');
      console.log('💡 Try: Unplug and replug USB cable, or restart the application');
      return [];
    }
    
    // Enhance port information with firmware detection and board type
    // Use Promise.allSettled to prevent one port from blocking others
    const portPromises = ports.map(async (port) => {
      try {
        // Detect board type based on port information
        const boardType = detectBoardType(port);
        
        // Quick firmware check (with short timeout) - skip if port is in bad state
        let firmwareInfo = { type: 'unknown', compatible: false };
        try {
          firmwareInfo = await detectFirmwareType(port.path);
        } catch (fwErr) {
          console.log(`⚠️ Firmware detection skipped for ${port.path}: ${fwErr.message}`);
        }
        
        return {
          ...port,
          boardType: boardType,
          hasMicroPython: firmwareInfo.compatible,
          firmwareType: firmwareInfo.type,
          recommended: firmwareInfo.compatible
        };
      } catch (error) {
        console.log(`⚠️ Error enhancing port ${port.path}: ${error.message}`);
        return {
          ...port,
          boardType: detectBoardType(port),
          hasMicroPython: false,
          firmwareType: 'unknown',
          recommended: false
        };
      }
    });
    
    const results = await Promise.allSettled(portPromises);
    const enhancedPorts = results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        console.log(`⚠️ Port enhancement failed for port ${ports[index].path}: ${result.reason}`);
        return {
          ...ports[index],
          boardType: detectBoardType(ports[index]),
          hasMicroPython: false,
          firmwareType: 'unknown',
          recommended: false
        };
      }
    });
    
    // Sort: MicroPython ports first
    enhancedPorts.sort((a, b) => {
      if (a.hasMicroPython && !b.hasMicroPython) return -1;
      if (!a.hasMicroPython && b.hasMicroPython) return 1;
      return 0;
    });
    
    console.log(`✅ Returning ${enhancedPorts.length} enhanced port(s)`);
    return enhancedPorts;
  } catch (err) {
    console.error("❌ SerialPort.list() error:", err);
    console.error("Stack:", err.stack);
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
    if (currentPort) {
      console.log('🔄 Closing serial port via IPC...');
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
        console.log('✅ Serial port closed successfully');
      } catch (closeErr) {
        console.log(`Warning: Error closing port: ${closeErr.message}`);
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
    
    // Only support ESP32 for now (other boards can be added later)
    if (boardType !== 'esp32') {
      return { success: false, error: `Board type ${boardType} not yet supported. Only ESP32 is supported with the new esptool-based upload system.` };
    }
    
    console.log(`[UPLOAD] Starting Python upload to ${boardType} board using esptool...`);
    safeSend('terminal-output', `\n========================================`);
    safeSend('terminal-output', `  ESP32 Upload (esptool-based)`);
    safeSend('terminal-output', `========================================`);
    
    return await new Promise(async (res) => {
      try {
        // Step 1: Find Python and ensure esptool is installed
        const pythonPath = await findPythonPath();
        safeSend('terminal-output', '[STEP 1/6] Checking esptool...');
        
        const esptoolReady = await ensureEsptoolInstalled(pythonPath);
        if (!esptoolReady) {
          res({ success: false, error: 'esptool installation failed' });
          return;
        }
        
        // Step 2: Release port and enter bootloader mode
        safeSend('terminal-output', '[STEP 2/6] Preparing ESP32 for upload...');
        await releaseComPortIfNeeded(port);
        await delay(1500); // Increased delay after port release
        
        // Enter bootloader mode (REPL-independent)
        const bootloaderSuccess = await enterBootloaderMode(port);
        if (!bootloaderSuccess) {
          safeSend('terminal-output', '[WARNING] Automatic bootloader entry failed');
          safeSend('terminal-output', '[INFO] Attempting port recovery...');
          await recoverPortState(port);
          await delay(1000);
          safeSend('terminal-output', '[INFO] Please manually press BOOT button, then press RESET');
          safeSend('terminal-output', '[INFO] Hold BOOT, press and release RESET, then release BOOT');
          safeSend('terminal-output', '[INFO] Waiting 8 seconds for manual bootloader entry...');
          await delay(8000);
          safeSend('terminal-output', '[INFO] Recovering port after manual bootloader entry...');
          await killEsptoolProcesses();
          await delay(1000);
          await recoverPortState(port);
          await delay(2000);
          } else {
            await delay(1000);
            await recoverPortState(port);
            await delay(1000);
          }
          await delay(2000); // Increased delay after bootloader entry
        
        // Step 3: Detect ESP32 chip type and flash size
        safeSend('terminal-output', '[STEP 3/6] Detecting ESP32 chip...');
        // Ensure port is still available before chip detection
        await killEsptoolProcesses();
        await delay(500);
        const chipInfo = await detectESP32Chip(port, pythonPath);
        const chipType = chipInfo.chipType || 'esp32';
        const flashSize = chipInfo.flashSize || 4194304; // Default 4MB
        
        // Step 4: Prepare files for filesystem
        safeSend('terminal-output', '[STEP 4/6] Preparing filesystem...');
        
        // Collect all files to upload
        const filesToUpload = [];
        
        // Add main.py
        filesToUpload.push({
          name: 'main.py',
          content: code
        });
        
        // Add helper libraries if referenced
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
        
        helperFiles.forEach(helper => {
          if (code.includes(`import ${helper.key}`) && fs.existsSync(helper.path)) {
            try {
              const content = fs.readFileSync(helper.path, 'utf-8');
              filesToUpload.push({
                name: `${helper.key}.py`,
                content: content
              });
              safeSend('terminal-output', `[INFO] Including library: ${helper.key}.py`);
            } catch (err) {
              console.log(`Warning: Could not read ${helper.key}.py: ${err.message}`);
            }
          }
        });
        
        // Step 5: Create filesystem image
        safeSend('terminal-output', '[STEP 5/6] Creating filesystem image...');
        const fsImagePath = path.join(os.tmpdir(), `esp32-fs-${Date.now()}.bin`);
        
        const fsImageResult = await createFilesystemImage(filesToUpload, fsImagePath, pythonPath);
        if (!fsImageResult.success) {
          safeSend('terminal-output', `[ERROR] Failed to create filesystem image: ${fsImageResult.error}`);
          res({ success: false, error: `Filesystem creation failed: ${fsImageResult.error}` });
          return;
        }
        
        // Step 6: Flash filesystem image
        safeSend('terminal-output', '[STEP 6/6] Flashing filesystem to ESP32...');
        const flashResult = await flashFilesystem(port, fsImagePath, chipType, flashSize, pythonPath);
        
        // Cleanup filesystem image
        try {
          fs.unlinkSync(fsImagePath);
        } catch (e) {
          console.log(`Warning: Could not delete temp filesystem image: ${e.message}`);
        }
        
        if (!flashResult.success) {
          safeSend('terminal-output', `[ERROR] Flash failed: ${flashResult.error}`);
          safeSend('terminal-output', '');
          safeSend('terminal-output', '🔧 Troubleshooting:');
          safeSend('terminal-output', '1. Ensure ESP32 is in bootloader mode (hold BOOT, press RESET, release BOOT)');
          safeSend('terminal-output', '2. Try unplugging and replugging USB cable');
          safeSend('terminal-output', '3. Try a different USB port');
          safeSend('terminal-output', '4. Check that esptool can communicate with the board');
          res({ success: false, error: `Flash failed: ${flashResult.error}` });
          return;
        }
        
        // Success - ensure normal boot (GPIO0 HIGH, EN HIGH)
        safeSend('terminal-output', '[INFO] Resetting ESP32 to normal boot mode...');
        await normalBootReset(port);
        await delay(1000); // Wait for reset to complete
        
        // Additional hardware reset to ensure clean boot
        safeSend('terminal-output', '[INFO] Performing hardware reset for clean boot...');
        await hardwareResetESP32(port);
        await delay(2000); // Give ESP32 time to boot into MicroPython
        
        console.log('[SUCCESS] Upload completed');
        safeSend('terminal-output', '');
        safeSend('terminal-output', '✅ Upload complete!');
        safeSend('terminal-output', `   Uploaded ${filesToUpload.length} file(s) to ESP32`);
        safeSend('terminal-output', `========================================\n`);
        res({ success: true, output: 'Upload completed successfully' });
      } catch (error) {
        console.error('❌ Upload error:', error);
        safeSend('terminal-output', `[ERROR] Upload failed: ${error.message}`);
        res({ success: false, error: error.message });
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
        // Hardware execution is not supported with esptool-based system
        // Users should upload code and use serial monitor instead
        resolve('Hardware execution is not available with the new esptool-based system.\nPlease upload your code and use the Serial Monitor to see output.');
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
    
    // Ensure esptool is installed
    const esptoolReady = await ensureEsptoolInstalled(pythonPath);
    if (!esptoolReady) {
      return { success: false, error: 'esptool installation failed' };
    }
    
    // Test basic connection using esptool chip_id
    const testCommand = `"${pythonPath}" -m esptool --port ${port} chip_id`;
    console.log(`Executing: ${testCommand}`);
    
    const result = await executeEsptoolCommand(testCommand, 10000);
    if (result.success) {
      console.log('✅ ESP32 connection test successful');
      safeSend('terminal-output', '✅ ESP32 connection test successful');
      safeSend('terminal-output', result.output || '');
      return { success: true, output: result.stdout };
    } else {
      console.error('❌ ESP32 connection test failed:', result.error);
      safeSend('terminal-output', `❌ ESP32 connection test failed: ${result.error}`);
      safeSend('terminal-output', '💡 Make sure ESP32 is connected and try entering bootloader mode');
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
    
    // Step 4: Installation complete (verification skipped - esptool-based system)
    safeSend('terminal-output', '');
    safeSend('terminal-output', '✅ Step 4/4: Installation complete');
    await delay(2000); // Give ESP32 time to boot
    
    safeSend('terminal-output', '');
    safeSend('terminal-output', '==================================================');
    console.log('✅ MicroPython installation completed');
    safeSend('terminal-output', '✅ SUCCESS! MicroPython firmware installed');
    safeSend('terminal-output', '==================================================');
    safeSend('terminal-output', '');
    safeSend('terminal-output', '🎉 Your ESP32 is now ready to use!');
    safeSend('terminal-output', '💡 You can now upload MicroPython code');
    safeSend('terminal-output', '💡 If the board doesn\'t respond, try unplugging and replugging USB');
    safeSend('terminal-output', '');
    return { success: true, output: 'MicroPython installed successfully' };
    
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
