const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec, spawn } = require('child_process');
const os = require('os');

// ========================================
// NO MORE SERIALPORT - Using Python instead!
// ========================================

let mainWindow;
let currentPort = null;
let serialMonitorProcess = null;

// ========================================
// Path Helper for Packaged App
// ========================================

/**
 * Get correct path for Python scripts in both dev and production
 * @param {string} scriptName - Name of Python script
 * @returns {string} Full path to script
 */
function getScriptPath(scriptName) {
  // Check if app is packaged
  if (app.isPackaged) {
    // In packaged app, scripts are in resources/app/
    return path.join(process.resourcesPath, 'app', scriptName);
  } else {
    // In development, scripts are in app/
    return path.join(__dirname, scriptName);
  }
}

// Utility: wait for ms
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ========================================
// Python-based Serial Port Helper Functions
// (Replaces node-serialport completely)
// ========================================

/**
 * Execute Python serial helper script
 * @param {string} pythonPath - Path to Python executable
 * @param {Array} args - Arguments for serial-helper.py
 * @returns {Promise<Object>} Result object
 */
async function executePythonSerial(pythonPath, args) {
  return new Promise((resolve) => {
    const scriptPath = getScriptPath('serial-helper.py');
    const command = `"${pythonPath}" "${scriptPath}" ${args.map(a => `"${a}"`).join(' ')}`;
    
    // Use spawn for better process control
    const pythonProcess = spawn(pythonPath, [scriptPath, ...args], {
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    let stdout = '';
    let stderr = '';
    
    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        console.error(`Python serial error (code ${code}): ${stderr}`);
        resolve({ success: false, error: stderr || `Exit code ${code}` });
        return;
      }
      
      try {
        const result = JSON.parse(stdout.trim());
        resolve(result);
      } catch (parseErr) {
        console.error(`Failed to parse Python output: ${stdout}`);
        resolve({ success: false, error: 'Failed to parse Python output', raw: stdout });
      }
    });
    
    pythonProcess.on('error', (err) => {
      console.error(`Python process error: ${err.message}`);
      resolve({ success: false, error: err.message });
    });
    
    // Timeout after 10 seconds
    setTimeout(() => {
      try {
        pythonProcess.kill('SIGKILL');
      } catch (e) {}
      resolve({ success: false, error: 'Timeout after 10 seconds' });
    }, 10000);
  });
}

/**
 * List all serial ports using Python
 * @param {string} pythonPath - Path to Python executable
 * @returns {Promise<Array>} Array of port objects
 */
async function listSerialPorts(pythonPath) {
  try {
    const result = await executePythonSerial(pythonPath, ['list']);
    if (result.success && result.ports) {
      return result.ports;
    }
    console.error('Failed to list ports:', result.error);
    return [];
  } catch (error) {
    console.error('Exception listing ports:', error);
    return [];
  }
}

/**
 * Hardware reset ESP32 using Python
 * @param {string} pythonPath - Path to Python executable
 * @param {string} portPath - COM port path
 * @param {string} mode - 'normal' or 'bootloader'
 * @returns {Promise<boolean>} Success status
 */
async function hardwareResetPython(pythonPath, portPath, mode = 'normal') {
  try {
    const result = await executePythonSerial(pythonPath, ['reset', portPath, mode]);
    return result.success === true;
  } catch (error) {
    console.error(`Hardware reset error: ${error.message}`);
    return false;
  }
}

/**
 * Test serial port connection using Python
 * @param {string} pythonPath - Path to Python executable
 * @param {string} portPath - COM port path
 * @returns {Promise<boolean>} Success status
 */
async function testSerialConnection(pythonPath, portPath) {
  try {
    const result = await executePythonSerial(pythonPath, ['test', portPath]);
    return result.success === true;
  } catch (error) {
    console.error(`Port test error: ${error.message}`);
    return false;
  }
}

/**
 * Verify if port exists in system using Python
 * @param {string} pythonPath - Path to Python executable
 * @param {string} portPath - COM port path
 * @returns {Promise<Object>} Result with exists status
 */
async function verifyPortExists(pythonPath, portPath) {
  try {
    const scriptPath = getScriptPath('verify-port.py');
    const command = `"${pythonPath}" "${scriptPath}" "${portPath}"`;
    
    const result = await new Promise((resolve) => {
      exec(command, { timeout: 5000 }, (err, stdout, stderr) => {
        if (err) {
          resolve({ success: false, exists: false, error: err.message });
          return;
        }
        
        try {
          const parsed = JSON.parse(stdout.trim());
          resolve(parsed);
        } catch (parseErr) {
          resolve({ success: false, exists: false, error: 'Failed to parse output' });
        }
      });
    });
    
    return result;
  } catch (error) {
    return { success: false, exists: false, error: error.message };
  }
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
async function detectESP32Chip(portPath, pythonPath, timeoutMs = 10000) {
  try {
    console.log(`🔍 Detecting ESP32 chip type on ${portPath}...`);
    safeSend('terminal-output', `[INFO] Detecting ESP32 chip type...`);
    
    const chipCmd = `"${pythonPath}" -m esptool --port ${portPath} chip_id`;
    const result = await new Promise((resolve) => {
      exec(chipCmd, { timeout: timeoutMs }, (err, stdout, stderr) => {
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

function isTransientComPortError(errorText = '') {
  const t = String(errorText || '').toLowerCase();
  return (
    t.includes('port is busy') ||
    t.includes("busy or doesn't") ||
    t.includes('busy or doesn') ||
    t.includes('permissionerror') ||
    t.includes('cannot configure port') ||
    t.includes('the device attached to the system is not functioning') ||
    t.includes('winerror 31') ||
    t.includes('clearcommerror') ||
    t.includes('file not found') ||
    t.includes('filenotfounderror') ||
    t.includes('could not open com')
  );
}

async function waitForPortPresent(pythonPath, portPath, timeoutMs = 15000, intervalMs = 500, stableHitsRequired = 2) {
  const start = Date.now();
  let stableHits = 0;

  while (Date.now() - start < timeoutMs) {
    const check = await verifyPortExists(pythonPath, portPath);
    if (check && check.exists) {
      stableHits += 1;
      if (stableHits >= stableHitsRequired) return true;
    } else {
      stableHits = 0;
    }
    await delay(intervalMs);
  }
  return false;
}

async function detectESP32ChipWithRetry(portPath, pythonPath, maxAttempts = 5) {
  let lastErr = '';

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      safeSend('terminal-output', `[INFO] Detect attempt ${attempt}/${maxAttempts}...`);

      // Windows sometimes needs time after a reset for the COM device to be healthy again.
      await killEsptoolProcesses();
      await delay(600);

      const present = await waitForPortPresent(pythonPath, portPath, 15000, 500, 2);
      if (!present) {
        lastErr = `Port ${portPath} not ready yet`;
        safeSend('terminal-output', `[WARNING] ${lastErr}`);
        continue;
      }

      const result = await detectESP32Chip(portPath, pythonPath, 15000);
      if (result && result.success) return result;

      lastErr = result?.error || 'Unknown esptool error';
      if (!isTransientComPortError(lastErr)) {
        return { success: false, error: lastErr };
      }

      safeSend('terminal-output', `[WARNING] Transient COM issue detected (will retry): ${lastErr}`);

      // Recovery sequence tuned for flashing reliability:
      // - avoid "normal" resets (can kick the board out of bootloader)
      await recoverPortState(portPath, 'bootloader');
      await delay(1200 + attempt * 400);
    } catch (e) {
      lastErr = e?.message || String(e);
      if (!isTransientComPortError(lastErr)) break;
      safeSend('terminal-output', `[WARNING] Transient COM issue detected (will retry): ${lastErr}`);
      await recoverPortState(portPath, 'bootloader');
      await delay(1200 + attempt * 400);
    }
  }

  return { success: false, error: lastErr || 'ESP32 detection failed after retries' };
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

// AGGRESSIVE HARDWARE RESET - Physically resets ESP32 using Python
async function hardwareResetESP32(portPath) {
  try {
    console.log('🔨 Performing HARDWARE RESET on ESP32 (Python-based)...');
    const pythonPath = await findPythonPath();
    const success = await hardwareResetPython(pythonPath, portPath, 'normal');
    if (success) {
      console.log('✅ Hardware reset complete');
    } else {
      console.log('⚠️ Hardware reset failed');
    }
    return success;
  } catch (e) {
    console.log(`⚠️ Hardware reset exception: ${e.message}`);
    return false;
  }
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
// resetMode:
// - 'normal' (default): reset board to normal boot
// - 'bootloader': reset board into bootloader mode (safer for flashing reliability)
// - 'none': do not toggle DTR/RTS at all (only kill processes + mode reset)
async function recoverPortState(portPath, resetMode = 'normal') {
  try {
    console.log(`🔧 Attempting to recover port ${portPath}...`);
    
    // Step 1: Kill all processes that might be using the port
    await killEsptoolProcesses();
    await delay(1000);
    
    // Step 2: On Windows, use mode command to reset port state
    if (process.platform === 'win32') {
      try {
        await new Promise((resolve) => {
          exec(`mode ${portPath} BAUD=115200 PARITY=N DATA=8 STOP=1`, { timeout: 3000 }, (err) => {
            if (!err) {
              console.log(`✅ Windows port reset command executed`);
            }
            resolve();
          });
        });
        await delay(1000);
      } catch (modeErr) {
        console.log(`Note: Windows mode command failed: ${modeErr.message}`);
      }
    }
    
    // Step 3: Try hardware reset using Python (optional)
    if (resetMode !== 'none') {
      try {
        const pythonPath = await findPythonPath();
        await hardwareResetPython(pythonPath, portPath, resetMode);
        console.log(`✅ Port recovery attempted (${resetMode})`);
      } catch (resetErr) {
        console.log(`Note: Port reset failed: ${resetErr.message}`);
      }
    }
    
    await delay(1000);
    return true;
  } catch (e) {
    console.log(`⚠️ Port recovery exception: ${e.message}`);
    await delay(1000);
    return true; // Don't block on recovery failure
  }
}

// Utility: Enter bootloader mode on ESP32 using Python
async function enterBootloaderMode(portPath) {
  try {
    console.log('🔧 Entering bootloader mode...');
    safeSend('terminal-output', '[INFO] Entering bootloader mode...');
    
    const pythonPath = await findPythonPath();
    const success = await hardwareResetPython(pythonPath, portPath, 'bootloader');
    
    if (success) {
      console.log('✅ Bootloader mode entry sequence complete');
      safeSend('terminal-output', '[SUCCESS] Bootloader mode entered');
      
      // CRITICAL: Kill only serial-related Python processes (smarter approach)
      console.log('🔄 Cleaning up serial processes...');
      await killEsptoolProcesses();
      
      // Verify port still exists after Python cleanup
      console.log('🔍 Verifying port exists...');
      const portCheck = await verifyPortExists(pythonPath, portPath);
      
      if (!portCheck.exists) {
        console.error(`❌ Port ${portPath} disappeared after bootloader entry!`);
        safeSend('terminal-output', `[ERROR] Port ${portPath} is no longer available`);
        safeSend('terminal-output', `[INFO] Please unplug and replug the USB cable`);
        if (portCheck.available_ports && portCheck.available_ports.length > 0) {
          safeSend('terminal-output', `[INFO] Available ports: ${portCheck.available_ports.join(', ')}`);
        }
        return false;
      }
      
      console.log(`✅ Port ${portPath} verified as available`);
      
      // Wait for port to be fully ready
      console.log('⏳ Waiting for port to be ready...');
      await delay(1500);
      
      return true;
    } else {
      console.log(`⚠️ Bootloader entry failed`);
      safeSend('terminal-output', `[WARNING] Automatic bootloader entry failed`);
      safeSend('terminal-output', `[INFO] Please manually press BOOT button and try again`);
      await recoverPortState(portPath, 'normal');
      return false;
    }
  } catch (e) {
    console.log(`⚠️ Bootloader entry exception: ${e.message}`);
    safeSend('terminal-output', `[WARNING] Bootloader entry failed: ${e.message}`);
    safeSend('terminal-output', `[INFO] Please manually press BOOT button and try again`);
    await recoverPortState(portPath, 'bootloader');
    return false;
  }
}

// Utility: Reset ESP32 to normal boot mode using Python
async function normalBootReset(portPath) {
  try {
    console.log('🔄 Resetting ESP32 to normal boot mode...');
    const pythonPath = await findPythonPath();
    const success = await hardwareResetPython(pythonPath, portPath, 'normal');
    if (success) {
      console.log('✅ Normal boot reset complete');
    } else {
      console.log('⚠️ Normal boot reset failed');
    }
    return success;
  } catch (e) {
    console.log(`⚠️ Normal boot reset exception: ${e.message}`);
    return false;
  }
}

// Utility: check if port is available using Python
async function isPortAvailable(portPath) {
  try {
    console.log(`🔍 Testing port availability for ${portPath}...`);
    const pythonPath = await findPythonPath();
    const result = await testSerialConnection(pythonPath, portPath);
    if (result) {
      console.log(`✅ Port ${portPath} is available`);
    } else {
      console.log(`❌ Port ${portPath} is not available`);
    }
    return result;
  } catch (error) {
    console.log(`❌ Error testing port ${portPath}: ${error.message}`);
    return false;
  }
}

// Utility: Kill any lingering Python/esptool processes that might be locking the port
async function killEsptoolProcesses() {
  return new Promise(async (resolve) => {
    try {
      const isWindows = process.platform === 'win32';
      
      if (isWindows) {
        // SMARTER: Only kill Python processes related to serial/esptool
        // Killing ALL Python processes can cause Windows to lose track of COM ports
        console.log('🔄 Killing serial-related Python processes...');
        
        // Method 1: Kill python processes with "serial" in command line
        await new Promise((res) => {
          exec('wmic process where "name=\'python.exe\' and commandline like \'%serial%\'" call terminate 2>nul', 
            { timeout: 2000 }, () => res());
        });
        
        await delay(500);
        
        // Method 2: Kill esptool-specific processes
        await new Promise((res) => {
          exec('wmic process where "name=\'python.exe\' and commandline like \'%esptool%\'" call terminate 2>nul',
            { timeout: 2000 }, () => res());
        });
        
        await delay(500);
        
        // Method 3: Fallback - kill by window title (less aggressive)
        await new Promise((res) => {
          exec('taskkill /F /FI "WINDOWTITLE eq *esptool*" /T 2>nul', { timeout: 1500 }, () => res());
        });
        
        console.log('✅ Serial-related Python processes terminated');
        
      } else {
        // On Unix-like systems, use pkill
        exec('pkill -9 -f "python.*(serial-helper|serial-monitor|esptool)"', { timeout: 3000 }, () => {
          console.log('✅ Cleaned up Python/esptool processes');
        });
      }
      
      // Wait for Windows to release COM port handles
      console.log('⏳ Waiting for Windows to release COM port...');
      await delay(1500); // Reduced - less aggressive killing needs less wait
      console.log('✅ Port should be released');
      
      resolve();
    } catch (e) {
      console.log('Warning: Error killing processes:', e.message);
      await delay(1000);
      resolve();
    }
  });
}

// Utility: AGGRESSIVE COM port release (Arduino IDE style)
async function releaseComPortIfNeeded(portPath) {
  try {
    console.log(`🔄 Releasing port ${portPath}...`);
    safeSend('terminal-output', `[INFO] Closing serial monitor...`);
    
    // STEP 1: Close serial monitor if running
    if (serialMonitorProcess) {
      console.log('🔄 Killing serial monitor process...');
      try {
        serialMonitorProcess.kill('SIGKILL');  // Force kill
        serialMonitorProcess = null;
        safeSend('terminal-output', '[Serial Monitor Closed]');
      } catch (killErr) {
        console.log(`Warning: Error killing serial monitor: ${killErr.message}`);
      }
    }
    currentPort = null;
    
    await delay(500);
    
    // STEP 2: Kill ALL Python processes that might be holding the port
    console.log('🔄 Killing all Python serial processes...');
    await killEsptoolProcesses();
    await delay(1000);  // Critical wait for Windows
    
    // STEP 3: On Windows, use devcon or mode to reset port (if available)
    if (process.platform === 'win32') {
      try {
        // Method 1: Use Windows mode command to force COM port reset
        await new Promise((resolve) => {
          exec(`mode ${portPath} BAUD=115200 PARITY=N DATA=8 STOP=1`, { timeout: 2000 }, (err, stdout, stderr) => {
            if (!err) {
              console.log(`✅ Windows port reset via mode command`);
            }
            resolve();
          });
        });
        await delay(500);
      } catch (modeErr) {
        console.log(`Note: Windows mode command failed: ${modeErr.message}`);
      }
      
      // Method 2: Try to quickly open and close the port to force release
      try {
        const pythonPath = await findPythonPath();
        console.log('🔄 Testing port availability...');
        await testSerialConnection(pythonPath, portPath);
        await delay(1000);  // Extra wait after test
      } catch (testErr) {
        console.log(`Note: Port test failed: ${testErr.message}`);
      }
    }
    
    // STEP 4: Final wait for Windows to fully release the handle
    safeSend('terminal-output', `[INFO] Waiting for port to be released...`);
    await delay(2000); // Critical wait for Windows COM port release
    
    console.log(`✅ Port ${portPath} released successfully`);
    safeSend('terminal-output', `[SUCCESS] Port ${portPath} released, ready for upload`);
  } catch (error) {
    console.error(`❌ Error releasing port ${portPath}:`, error.message);
    safeSend('terminal-output', `[WARNING] Port release had issues: ${error.message}`);
    // Still continue - esptool might work anyway
  }
}

// Utility: quick hard reset using DTR/RTS (keep GPIO0 high)
async function hardResetPort(portPath) {
  try {
    const pythonPath = await findPythonPath();
    await hardwareResetPython(pythonPath, portPath, 'normal');
  } catch (e) {
    console.log(`Warning: hardResetPort exception: ${e.message}`);
  }
}

// Utility: EMERGENCY reset - puts ESP32 in bootloader mode using Python
// This is MORE AGGRESSIVE than hardResetPort and can interrupt stuck code
async function emergencyResetToBootloader(portPath) {
  try {
    console.log('🚨 EMERGENCY RESET: Putting ESP32 in bootloader mode...');
    const pythonPath = await findPythonPath();
    await hardwareResetPython(pythonPath, portPath, 'bootloader');
    console.log('✅ ESP32 should now be in bootloader mode');
  } catch (e) {
    console.log(`Warning: emergencyReset exception: ${e.message}`);
  }
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
async function createFilesystemImage(files, outputPath, pythonPath, fsSizeBytes = (1024 * 1024)) {
  try {
    console.log('📦 Creating filesystem image...');
    safeSend('terminal-output', '[INFO] Creating filesystem image...');
    safeSend('terminal-output', `[INFO] Preparing ${files.length} file(s)...`);
    safeSend('terminal-output', `[INFO] Filesystem size: ${fsSizeBytes} bytes`);
    
    // Create temporary directory with all files
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'esp32-fs-'));
    
    // Copy all files to temp directory
    for (const file of files) {
      const destPath = path.join(tmpDir, file.name);
      const destDir = path.dirname(destPath);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }
      
      // CRITICAL: Write with UTF-8 encoding, NO BOM
      // Convert string to Buffer to ensure no BOM is added
      const buffer = Buffer.from(file.content, 'utf8');
      fs.writeFileSync(destPath, buffer);
      console.log(`  Added: ${file.name} (${buffer.length} bytes)`);
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
    
    const mklittlefsCmd = `"${foundPath}" -c "${tmpDir}" -s ${fsSizeBytes} "${outputPath}"`;
    
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

function parsePartitionTable(partitionTableBin) {
  const entries = [];
  if (!partitionTableBin || partitionTableBin.length < 32) return entries;

  const ENTRY_SIZE = 32;
  const maxEntries = Math.floor(partitionTableBin.length / ENTRY_SIZE);

  for (let i = 0; i < maxEntries; i++) {
    const off = i * ENTRY_SIZE;
    const b0 = partitionTableBin[off + 0];
    const b1 = partitionTableBin[off + 1];

    // End marker (0xFF..)
    if (b0 === 0xFF && b1 === 0xFF) break;

    // Partition entry magic is 0xAA 0x50
    if (b0 !== 0xAA || b1 !== 0x50) continue;

    const type = partitionTableBin[off + 2];
    const subtype = partitionTableBin[off + 3];
    const offset = partitionTableBin.readUInt32LE(off + 4);
    const size = partitionTableBin.readUInt32LE(off + 8);
    // Label is a fixed 16-byte field, typically null-terminated.
    // Be conservative: stop at 0x00 or 0xFF to avoid decoding garbage.
    const labelRaw = partitionTableBin.slice(off + 12, off + 28);
    let label = '';
    for (let j = 0; j < labelRaw.length; j++) {
      const v = labelRaw[j];
      if (v === 0x00 || v === 0xFF) break;
      label += String.fromCharCode(v);
    }
    label = (label || '').trim();
    const flags = partitionTableBin.readUInt32LE(off + 28);

    entries.push({ type, subtype, offset, size, label, flags });
  }

  return entries;
}

function alignUp(value, alignment) {
  return Math.ceil(value / alignment) * alignment;
}

function alignDown(value, alignment) {
  return Math.floor(value / alignment) * alignment;
}

async function detectFilesystemPartition(portPath, chipType, pythonPath, flashSizeBytes = null) {
  const chipArg = chipType === 'esp32s2' ? 'esp32s2' :
                  chipType === 'esp32s3' ? 'esp32s3' :
                  chipType === 'esp32c3' ? 'esp32c3' : 'esp32';

  const tmpPart = path.join(os.tmpdir(), `esp32-partition-${Date.now()}.bin`);
  const readHyphenCmd = `"${pythonPath}" -m esptool --chip ${chipArg} --port ${portPath} read-flash 0x8000 0xC00 "${tmpPart}"`;
  const readUnderscoreCmd = `"${pythonPath}" -m esptool --chip ${chipArg} --port ${portPath} read_flash 0x8000 0xC00 "${tmpPart}"`;

  // Try modern syntax first, then fallback for older esptool variants
  let readRes = await executeEsptoolCommand(readHyphenCmd, 30000);
  if (!readRes.success) {
    readRes = await executeEsptoolCommand(readUnderscoreCmd, 30000);
  }

  try {
    if (!readRes.success || !fs.existsSync(tmpPart)) {
      return { success: false, error: readRes.error || 'Failed to read partition table' };
    }

    const buf = fs.readFileSync(tmpPart);
    const entries = parsePartitionTable(buf);
    const summarize = (e) =>
      `${(e.label || '(no-label)')} type=0x${e.type.toString(16)} sub=0x${e.subtype.toString(16)} off=0x${e.offset.toString(16)} size=0x${e.size.toString(16)}`;

    // Prefer label-based match (MicroPython commonly uses "vfs")
    const preferredLabels = ['vfs', 'littlefs', 'spiffs', 'storage', 'fs'];
    const lower = (s) => (s || '').toLowerCase();

    let match = null;
    for (const lbl of preferredLabels) {
      // Use includes() to tolerate labels like "vfs2" or "vfs_lfs"
      match = entries.find(e => e.type === 0x01 && lower(e.label).includes(lbl));
      if (match) break;
    }

    // If not found by label, try common data subtypes:
    // FAT=0x81, SPIFFS=0x82, (LittleFS often uses 0x83 in some builds)
    if (!match) {
      match = entries.find(e => e.type === 0x01 && [0x81, 0x82, 0x83].includes(e.subtype));
    }

    // If still not found, pick the best candidate: largest data partition that is NOT NVS/PHY/etc.
    if (!match && entries.length > 0) {
      const excludedSubtypes = new Set([
        0x00, // ota data
        0x01, // phy
        0x02, // nvs
        0x03, // coredump
        0x04, // nvs_keys
        0x05, // efuse
      ]);

      const candidates = entries
        .filter(e => e.type === 0x01 && !excludedSubtypes.has(e.subtype))
        .filter(e => e.size >= (256 * 1024)); // filesystem partitions are usually large

      if (candidates.length > 0) {
        candidates.sort((a, b) => b.size - a.size);
        match = candidates[0];
      }
    }

    if (!match) {
      // Provide diagnostics so we can see what the firmware actually uses.
      console.log('❌ No filesystem partition matched. Partition table entries:');
      entries.forEach(e => console.log('  -', summarize(e)));

      // IMPORTANT: Some MicroPython builds do not include a dedicated VFS partition entry.
      // In that case, the filesystem lives in the remaining free flash after the last partition.
      // Compute: fsOffset = end_of_last_partition, fsSize = flashSize - fsOffset
      if (typeof flashSizeBytes === 'number' && flashSizeBytes > 0 && entries.length > 0) {
        const lastEnd = entries.reduce((max, e) => Math.max(max, e.offset + e.size), 0);
        const fsOffset = alignUp(lastEnd, 0x1000);
        const fsSize = alignDown(flashSizeBytes - fsOffset, 0x1000);

        if (fsSize > 0) {
          console.log(`✅ Using computed free-flash filesystem region: off=0x${fsOffset.toString(16)} size=0x${fsSize.toString(16)}`);
          return {
            success: true,
            chipArg,
            offset: fsOffset,
            size: fsSize,
            label: 'free-flash',
            subtype: null,
            computed: true,
            entries
          };
        }
      }

      return { success: false, error: 'No filesystem partition found in partition table', entries };
    }

    return {
      success: true,
      chipArg,
      offset: match.offset,
      size: match.size,
      label: match.label || '',
      subtype: match.subtype
    };
  } finally {
    try { fs.unlinkSync(tmpPart); } catch (e) {}
  }
}


// Utility: Flash filesystem image to ESP32 using esptool
async function flashFilesystem(portPath, fsImagePath, chipType, flashSize, pythonPath, fsOffsetOverride = null, fsSizeOverride = null) {
  try {
    console.log('📤 Flashing filesystem image...');
    safeSend('terminal-output', '[INFO] Flashing filesystem image...');
    
    // CRITICAL: Ensure port is completely released before flashing
    await killEsptoolProcesses();
    await delay(1000); // Increased delay for better cleanup
    
    // CRITICAL: Force port recovery before flashing
    console.log('🔧 Recovering port state before flash...');
    safeSend('terminal-output', '[INFO] Preparing port for flash operation...');
    await recoverPortState(portPath, 'bootloader');
    await delay(1000);
    
    let fsOffset = 0x200000; // fallback heuristic
    let fsSize = 1024 * 1024; // fallback size (1MB)

    // Prefer detected partition values (correct for each firmware/board)
    if (typeof fsOffsetOverride === 'number' && typeof fsSizeOverride === 'number') {
      fsOffset = fsOffsetOverride;
      fsSize = fsSizeOverride;
      console.log(`✅ Using detected filesystem partition: offset=0x${fsOffset.toString(16)}, size=0x${fsSize.toString(16)}`);
      safeSend('terminal-output', `[INFO] Detected filesystem partition: 0x${fsOffset.toString(16)} (size 0x${fsSize.toString(16)})`);
    } else {
      // Heuristic fallback (older behavior)
      if (flashSize <= 2 * 1024 * 1024) {
        fsOffset = 0x100000;
      } else if (flashSize >= 8 * 1024 * 1024) {
        fsOffset = 0x300000;
      }
    }
    
    console.log(`📍 Filesystem offset: 0x${fsOffset.toString(16)}`);
    safeSend('terminal-output', `[INFO] Filesystem offset: 0x${fsOffset.toString(16)}`);
    
    // Build esptool command - use write-flash (esptool v5+ syntax)
    const chipArg = chipType === 'esp32s2' ? 'esp32s2' : 
                    chipType === 'esp32s3' ? 'esp32s3' :
                    chipType === 'esp32c3' ? 'esp32c3' : 'esp32';
    
    // CRITICAL FIX: Erase filesystem region FIRST to remove corrupted boot.py
    // This prevents NameError from leftover garbage data
    console.log('🧹 Erasing filesystem region to remove any corrupted files...');
    safeSend('terminal-output', '[INFO] Erasing old filesystem (removing corrupted files)...');

    const eraseHyphenCmd = `"${pythonPath}" -m esptool --chip ${chipArg} --port ${portPath} erase-region 0x${fsOffset.toString(16)} 0x${fsSize.toString(16)}`;
    const eraseUnderscoreCmd = `"${pythonPath}" -m esptool --chip ${chipArg} --port ${portPath} erase_region 0x${fsOffset.toString(16)} 0x${fsSize.toString(16)}`;
    
    console.log(`Executing erase: ${eraseHyphenCmd}`);
    let eraseResult = await executeEsptoolCommand(eraseHyphenCmd, 30000);
    if (!eraseResult.success) {
      eraseResult = await executeEsptoolCommand(eraseUnderscoreCmd, 30000);
    }
    
    if (eraseResult.success) {
      console.log('✅ Filesystem region erased successfully');
      safeSend('terminal-output', '[SUCCESS] Old filesystem erased');
    } else {
      console.warn('⚠️ Erase failed, will try to overwrite:', eraseResult.error);
      safeSend('terminal-output', '[WARNING] Erase failed, attempting direct overwrite...');
    }
    
    // Wait for ESP32 to stabilize after erase
    await delay(2000);
    
    // Now flash the new clean filesystem with clean boot.py
    const flashCmd = `"${pythonPath}" -m esptool --chip ${chipArg} --port ${portPath} --before default-reset --after hard-reset write-flash 0x${fsOffset.toString(16)} "${fsImagePath}"`;
    
    console.log(`Executing flash: ${flashCmd}`);
    safeSend('terminal-output', `[INFO] Flashing new filesystem with clean boot.py...`);
    
    // Enhanced retry logic with port verification
    let result;
    let maxRetries = 5;
    let retries = maxRetries;
    let lastError = null;
    
    // CRITICAL: Verify port exists BEFORE attempting flash (don't open it)
    console.log(`🔍 Verifying port ${portPath} exists...`);
    const portCheck = await verifyPortExists(pythonPath, portPath);
    
    if (!portCheck.exists) {
      console.error(`❌ Port ${portPath} does not exist!`);
      safeSend('terminal-output', `[ERROR] Port ${portPath} is not available`);
      safeSend('terminal-output', `[CRITICAL] Please unplug and replug the USB cable`);
      if (portCheck.available_ports && portCheck.available_ports.length > 0) {
        safeSend('terminal-output', `[INFO] Available ports: ${portCheck.available_ports.join(', ')}`);
      } else {
        safeSend('terminal-output', `[INFO] No COM ports detected at all`);
      }
      return { success: false, error: 'Port does not exist. Please unplug/replug USB cable.' };
    }
    
    console.log(`✅ Port ${portPath} verified as present in system`);
    
    while (retries > 0) {
      // CLEANUP (but less aggressive - don't kill all Python)
      console.log(`🔧 Cleaning up for flash attempt ${maxRetries - retries + 1}/${maxRetries}...`);
      
      await killEsptoolProcesses();
      await delay(1500);
      
      // Don't test port availability (it opens the port and causes issues)
      // Just wait and try esptool
      if (retries < maxRetries) {
        console.log(`ℹ️  Retry ${maxRetries - retries + 1}/${maxRetries} - attempting flash directly...`);
        safeSend('terminal-output', `[INFO] Retry ${maxRetries - retries + 1}/${maxRetries}...`);
        await delay(2000);
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
        await recoverPortState(portPath, 'bootloader');
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
    icon: path.join(__dirname, '..', 'ui', 'assets', 'logo.ico'),
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
    if (serialMonitorProcess) {
      try {
        serialMonitorProcess.kill();
      } catch (e) {
        console.error('Error killing serial monitor:', e);
      }
    }
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
    console.log('🔍 Listing serial ports...');
    const pythonPath = await findPythonPath();
    const ports = await listSerialPorts(pythonPath);
    console.log(`✅ Found ${ports.length} port(s) from Python serial helper`);
    
    if (ports.length === 0) {
      console.log('⚠️ No ports detected - this might be due to USB port issues');
      console.log('💡 Try: Unplug and replug USB cable, or restart the application');
      return [];
    }
    
    // IMPORTANT: Do NOT probe firmware during port listing.
    // Firmware probing uses esptool (opens COM ports) and can race with Serial Monitor/Upload,
    // triggering Windows PermissionError(31) "device not functioning".
    const basicPorts = ports.map((port) => ({
      ...port,
      boardType: detectBoardType(port),
      hasMicroPython: null,
      firmwareType: 'unknown',
      recommended: false
    }));
    
    console.log(`✅ Returning ${basicPorts.length} port(s) (no firmware probing)`);
    return basicPorts;
  } catch (err) {
    console.error("❌ Serial port listing error:", err);
    console.error("Stack:", err.stack);
    return [];
  }
});

ipcMain.handle('open-serial-port', async (_e, portPath, baudRate = ESP32_BAUD_RATE) => {
  try {
    // Close existing serial monitor if running
    if (serialMonitorProcess) {
      serialMonitorProcess.kill();
      serialMonitorProcess = null;
    }
    
    const pythonPath = await findPythonPath();
    const scriptPath = getScriptPath('serial-monitor.py');
    
    // Start Python serial monitor
    serialMonitorProcess = spawn(pythonPath, [scriptPath, portPath, baudRate.toString()]);
    
    // Handle stdout (serial data)
    serialMonitorProcess.stdout.on('data', (data) => {
      safeSend('serial-data', data.toString());
    });
    
    // Handle stderr (errors)
    serialMonitorProcess.stderr.on('data', (data) => {
      safeSend('serial-data', `\n[Serial Error]: ${data.toString()}\n`);
    });
    
    // Handle process exit
    serialMonitorProcess.on('close', (code) => {
      safeSend('serial-data', `\n[Serial Port Closed]\n`);
      serialMonitorProcess = null;
    });
    
    // Store current port path for reference
    currentPort = portPath;
    
    return { success: true };
  } catch (err) { 
    return { success: false, error: err.message }; 
  }
});

// Send data to serial port (Serial Monitor functionality)
ipcMain.handle('send-serial-data', async (_e, portPath, data) => {
  try {
    if (!currentPort) {
      return { success: false, error: 'Port not open' };
    }
    
    // Use Python to write data to serial port
    const pythonPath = await findPythonPath();
    const result = await executePythonSerial(pythonPath, ['write', portPath, data]);
    
    if (!result.success) {
      safeSend('serial-data', `\n[Send Error]: ${result.error}\n`);
    }
    
    return result;
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('close-serial-port', async () => {
  try {
    if (serialMonitorProcess) {
      console.log('🔄 Closing serial monitor via IPC...');
      try {
        serialMonitorProcess.kill();
        serialMonitorProcess = null;
        console.log('✅ Serial monitor closed successfully');
      } catch (killErr) {
        console.log(`Warning: Error killing serial monitor: ${killErr.message}`);
      }
    }
    currentPort = null;
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
          safeSend('terminal-output', '[INFO] Please manually press BOOT button, then press RESET');
          safeSend('terminal-output', '[INFO] Hold BOOT, press and release RESET, then release BOOT');
          safeSend('terminal-output', '[INFO] Waiting 8 seconds for manual bootloader entry...');
          await delay(8000);

          // After manual bootloader entry, do NOT "normal reset" the device (it can exit bootloader).
          safeSend('terminal-output', '[INFO] Waiting for port to stabilize after manual bootloader entry...');
          await killEsptoolProcesses();
          await delay(800);
          await recoverPortState(port, 'none');
          await delay(1200);
        } else {
          // Small buffer for Windows re-enumeration after automatic bootloader entry
          await delay(1200);
        }
        await delay(1200); // Extra delay after bootloader entry to avoid WinError 31 / busy races
        
        // Step 3: Detect ESP32 chip type and flash size
        safeSend('terminal-output', '[STEP 3/6] Detecting ESP32 chip...');
        const chipInfo = await detectESP32ChipWithRetry(port, pythonPath, 5);
        if (!chipInfo || !chipInfo.success) {
          const msg = chipInfo?.error || 'Could not communicate with ESP32 (chip_id failed)';
          safeSend('terminal-output', `[ERROR] ESP32 detection failed: ${msg}`);
          safeSend('terminal-output', `[INFO] This usually means Windows temporarily glitched the USB serial device after reset.`);
          safeSend('terminal-output', `[INFO] The IDE auto-retried several times. If it still fails, unplug+replug USB, then Upload again.`);
          res({ success: false, error: `ESP32 detection failed: ${msg}` });
          return;
        }
        const chipType = chipInfo.chipType || 'esp32';
        const flashSize = chipInfo.flashSize || 4194304; // Default 4MB
        
        // Step 4: Prepare files for filesystem
        safeSend('terminal-output', '[STEP 4/6] Preparing filesystem...');
        
        // Collect all files to upload
        const filesToUpload = [];
        
        // CRITICAL FIX: Always upload a clean boot.py to prevent NameError corruption
        // boot.py should ONLY contain system initialization, NO user logic
        const cleanBootPy = `# Clean boot file - System initialization only
# Do not remove this file
# User code goes in main.py, NOT here
import gc
gc.collect()
`;
        filesToUpload.push({
          name: 'boot.py',
          content: cleanBootPy
        });
        
        // CRITICAL: Clean code before uploading (remove BOM, normalize line endings)
        let cleanCode = code;
        // Remove BOM (Byte Order Mark) if present
        if (cleanCode.charCodeAt(0) === 0xFEFF) {
          cleanCode = cleanCode.slice(1);
        }
        // Normalize line endings to Unix style (\n)
        cleanCode = cleanCode.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        // Remove any null bytes that might corrupt the file
        cleanCode = cleanCode.replace(/\0/g, '');
        // Ensure code ends with a newline (Python best practice)
        if (!cleanCode.endsWith('\n')) {
          cleanCode += '\n';
        }
        
        // Add main.py (user code goes here)
        filesToUpload.push({
          name: 'main.py',
          content: cleanCode
        });

        // Detect filesystem partition (offset + size) from the device partition table.
        // This avoids writing to the wrong region, which can leave corrupted boot.py and break sensors/libs.
        let fsPartition = null;
        try {
          safeSend('terminal-output', '[INFO] Detecting filesystem partition...');
          const partRes = await detectFilesystemPartition(port, chipType, pythonPath, flashSize);
          if (partRes.success) {
            fsPartition = partRes;
            const tag = partRes.computed ? 'computed' : 'detected';
            safeSend('terminal-output', `[SUCCESS] Filesystem partition (${tag}): ${partRes.label || 'data'} @ 0x${partRes.offset.toString(16)} (size 0x${partRes.size.toString(16)})`);
          } else {
            // If we can't even read partition table, do not continue (avoid flashing wrong region).
            safeSend('terminal-output', `[ERROR] Could not detect filesystem partition: ${partRes.error || 'unknown error'}`);
            safeSend('terminal-output', `[INFO] This usually happens when the COM port is not in bootloader mode or is unstable.`);
            safeSend('terminal-output', `[INFO] Fix: Unplug + replug USB, then Upload again (hold BOOT if needed).`);
            if (partRes.entries && Array.isArray(partRes.entries) && partRes.entries.length) {
              safeSend('terminal-output', `[INFO] Partition table entries detected (for debugging):`);
              partRes.entries.slice(0, 20).forEach(e => {
                safeSend(
                  'terminal-output',
                  `  - ${e.label || '(no-label)'} type=0x${e.type.toString(16)} sub=0x${e.subtype.toString(16)} off=0x${e.offset.toString(16)} size=0x${e.size.toString(16)}`
                );
              });
            }
            res({ success: false, error: `Partition detection failed: ${partRes.error || 'unknown error'}` });
            return;
          }
        } catch (e) {
          safeSend('terminal-output', `[ERROR] Partition detection failed: ${e.message}`);
          safeSend('terminal-output', `[INFO] Fix: Unplug + replug USB, then Upload again.`);
          res({ success: false, error: `Partition detection failed: ${e.message}` });
          return;
        }
        
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
          const needsHelper =
            code.includes(`import ${helper.key}`) ||
            code.includes(`from ${helper.key} import`);

          if (needsHelper && fs.existsSync(helper.path)) {
            try {
              let content = fs.readFileSync(helper.path, 'utf-8');
              // Clean library file content (remove BOM, normalize)
              if (content.charCodeAt(0) === 0xFEFF) {
                content = content.slice(1);
              }
              content = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
              content = content.replace(/\0/g, '');
              if (!content.endsWith('\n')) {
                content += '\n';
              }
              
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
        safeSend('terminal-output', `[INFO] Uploading ${filesToUpload.length} file(s): ${filesToUpload.map(f => f.name).join(', ')}`);
        const fsImagePath = path.join(os.tmpdir(), `esp32-fs-${Date.now()}.bin`);
        
        const fsSizeForImage = (fsPartition && fsPartition.size) ? fsPartition.size : (1024 * 1024);
        const fsImageResult = await createFilesystemImage(filesToUpload, fsImagePath, pythonPath, fsSizeForImage);
        if (!fsImageResult.success) {
          safeSend('terminal-output', `[ERROR] Failed to create filesystem image: ${fsImageResult.error}`);
          res({ success: false, error: `Filesystem creation failed: ${fsImageResult.error}` });
          return;
        }
        
        // Step 6: Flash filesystem image
        safeSend('terminal-output', '[STEP 6/6] Flashing filesystem to ESP32...');
        const flashResult = await flashFilesystem(
          port,
          fsImagePath,
          chipType,
          flashSize,
          pythonPath,
          fsPartition ? fsPartition.offset : null,
          fsPartition ? fsPartition.size : null
        );
        
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
    const pythonPath = await findPythonPath();
    const ports = await listSerialPorts(pythonPath);
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
