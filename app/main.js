const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec, spawn } = require('child_process');
const { SerialPort } = require('serialport');
const os = require('os');

let mainWindow;
let currentPort = null;

function safeSend(channel, ...args) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  try { mainWindow.webContents.send(channel, ...args); }
  catch (e) { console.error(`Error sending to ${channel}:`, e); }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
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
    // Enhanced port cleanup before using mpremote
    if (currentPort) { 
      try {
        console.log('🔄 Enhanced port cleanup before upload...');
        
        // Close the port gracefully
        if (currentPort.isOpen) {
          currentPort.close();
        }
        currentPort.destroy();
        currentPort = null;
        
        // Kill any Python/mpremote processes that might be using the port
        console.log('🔄 Killing conflicting processes...');
        exec('taskkill /f /im "python.exe" 2>nul', () => {});
        exec('taskkill /f /im "mpremote.exe" 2>nul', () => {});
        
        // Wait for processes to fully terminate
        console.log('🔄 Waiting for process cleanup...');
        await new Promise(r => setTimeout(r, 2000));
        
        // Force release the COM port using Windows commands
        console.log('🔄 Force releasing COM port...');
        exec(`mode ${port}: BAUD=115200 PARITY=N DATA=8 STOP=1`, () => {});
        
        // Additional wait for port release
        console.log('🔄 Waiting for port release...');
        await new Promise(r => setTimeout(r, 3000));
        
        console.log('✅ Port cleanup completed');
      } catch (err) {
        console.error('Error during port cleanup:', err);
        currentPort = null;
      }
    }
    
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
      
      exec(uploadCommand, (err1, out1, errOut1) => {
        if (err1) {
          console.error('❌ Upload failed:', err1.message);
          console.error('Stderr:', errOut1);
          safeSend('terminal-output', `❌ Upload failed: ${errOut1 || err1.message}`);
          res({ success: false, error: `Upload failed: ${errOut1 || err1.message}` });
          return;
        }
        
        console.log('✅ Upload successful');
        safeSend('terminal-output', '✅ Upload successful!');
        res({ success: true });
      });
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
        if (currentPort) {
          try {
            console.log('🔄 Enhanced port cleanup before mpremote...');
            
            // Close the port gracefully
            if (currentPort.isOpen) {
              currentPort.close();
            }
            currentPort.destroy();
            currentPort = null;
            
            // Kill any Python/mpremote processes that might be using the port
            console.log('🔄 Killing conflicting processes...');
            exec('taskkill /f /im "python.exe" 2>nul', () => {});
            exec('taskkill /f /im "mpremote.exe" 2>nul', () => {});
            
            // Wait for processes to fully terminate
            console.log('🔄 Waiting for process cleanup...');
            await new Promise(r => setTimeout(r, 2000));
            
            // Force release the COM port using Windows commands
            console.log('🔄 Force releasing COM port...');
            exec(`mode ${port}: BAUD=115200 PARITY=N DATA=8 STOP=1`, () => {});
            
            // Additional wait for port release
            console.log('🔄 Waiting for port release...');
            await new Promise(r => setTimeout(r, 3000));
            
            console.log('✅ Port cleanup completed');
            
          } catch (err) {
            console.error('Error during port cleanup:', err);
            currentPort = null;
          }
        }
        
        // Run on hardware via mpremote using full Python path
        const pythonPath = 'C:\\Program Files\\Python313\\python.exe';
        
        console.log(`🚀 Executing: "${pythonPath}" -m mpremote connect ${port} run "${pyPath}"`);
        
        // Enhanced mpremote execution with better error handling
        const mpremoteCommand = `"${pythonPath}" -m mpremote connect ${port} run "${pyPath}"`;
        
        exec(mpremoteCommand, (err, stdout, stderr) => {
          if (err) {
            console.error('❌ Direct execution failed:', err.message);
            console.error('Stderr:', stderr);
            
            // Try alternative approach with soft-reset first
            console.log('🔄 Trying alternative approach with soft-reset...');
            const alternativeCommand = `"${pythonPath}" -m mpremote connect ${port} soft-reset && "${pythonPath}" -m mpremote connect ${port} run "${pyPath}"`;
            
            exec(alternativeCommand, (err2, stdout2, stderr2) => {
              if (err2) {
                console.error('❌ Alternative execution also failed:', err2.message);
                console.error('Stderr2:', stderr2);
                
                // Final fallback: use exec instead of run
                console.log('🔄 Trying final fallback with exec...');
                const fallbackCommand = `"${pythonPath}" -m mpremote connect ${port} exec "exec(open('${pyPath}').read())"`;
                
                exec(fallbackCommand, (err3, stdout3, stderr3) => {
                  if (err3) {
                    console.error('❌ All execution methods failed:', err3.message);
                    resolve(`Hardware execution failed: ${stderr3 || err3.message || 'All execution methods failed. Check if ESP32 is properly connected and not in use by another program.'}`);
                  } else {
                    console.log('✅ Fallback execution successful');
                    resolve(stdout3 || 'No output');
                  }
                });
              } else {
                console.log('✅ Alternative execution successful');
                resolve(stdout2 || 'No output');
              }
            });
          } else {
            console.log('✅ Direct execution successful');
            resolve(stdout || 'No output');
          }
        });
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
  return new Promise((resolve, reject) => {
    // Use full Python path for Windows compatibility
    const pythonPath = 'C:\\Program Files\\Python313\\python.exe';
    const python = spawn(pythonPath, [path.join(__dirname, '..', 'status.py')]);
    let output = '';

    python.stdout.on('data', data => {
      output += data.toString();
    });

    python.stderr.on('data', err => {
      console.error('Python stderr:', err.toString());
    });

    python.on('close', () => {
      resolve(output.trim().toLowerCase());
    });

    python.on('error', err => {
      reject(new Error(`Python execution failed: ${err.message}`));
    });
  });
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
