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
  mainWindow.loadFile('index.html');
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
      exec(`python -m py_compile "${pyPath}"`, (err, out, errOut) => {
        if (err) {
          res({ success: false, error: errOut || out || err.message });
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
    if (currentPort && currentPort.isOpen) { 
      await new Promise(r => currentPort.close(r)); 
      currentPort = null; 
    }
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'python-upload-'));
    const pyPath = path.join(tmpDir, 'main.py');
    fs.writeFileSync(pyPath, code, 'utf-8');
    
    return await new Promise(res => {
      exec(`mpremote connect ${port} fs cp "${pyPath}" :main.py`, (err1, out1, errOut1) => {
        safeSend('terminal-output', out1 + errOut1);
        if (err1) return res({ success: false, error: out1 + errOut1 });
        exec(`mpremote connect ${port} reset soft`, (_e2, out2, errOut2) => {
          safeSend('terminal-output', out2 + errOut2);
          setTimeout(() => {
            safeSend('terminal-output', `[Re-opening port ${port} after reset]`);
            safeSend('reopen-port', port);
            res({ success: true });
          }, 2000);
        });
      });
    });
  } catch (err) {
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
    
    return await new Promise(resolve => {
      if (port) {
        // Run on hardware via mpremote
        exec(`mpremote connect ${port} run "${pyPath}"`, (err, stdout, stderr) => {
          if (err) resolve(stderr || err.message || 'Unknown error');
          else resolve(stdout || 'No output');
        });
      } else {
        // Run locally with Python
        exec(`python "${pyPath}"`, (err, stdout, stderr) => {
          if (err) resolve(stderr || err.message || 'Unknown error');
          else resolve(stdout || 'No output');
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

// ---- Board Status Check ----
ipcMain.handle('check-board', async () => {
  return new Promise((resolve, reject) => {
    const python = spawn('python', ['status.py']);
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
      reject(err);
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
