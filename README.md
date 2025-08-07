# MY STEAM LAB - Blockly Code Generator

A comprehensive code generation and hardware interaction tool with multi-language support for JavaScript, Python, C++, and C.

## Features

### 🚀 Multi-Language Support
- **JavaScript**: Node.js execution and compilation
- **Python**: MicroPython support with mpremote for ESP32
- **C++**: GCC compilation and execution
- **C**: GCC compilation and execution

### 🔧 Hardware Integration
- **Serial Port Management**: Automatic port detection and connection
- **ESP32 Support**: MicroPython upload and execution via mpremote
- **Board Status**: Real-time connection status monitoring
- **Hardware Detection**: Automatic detection of development boards

### 💻 Terminal Integration
- **Real-time Output**: Live terminal display for compile/upload/run operations
- **Multi-language Responses**: Language-specific compilation and execution feedback
- **Error Handling**: Comprehensive error reporting in terminal

### 🎯 Core Functionality

#### Compile
- Compiles code for the selected language
- Shows compilation output in terminal
- Supports all four languages (JavaScript, Python, C++, C)

#### Upload
- Uploads code to connected hardware (ESP32 for Python)
- Executes code locally for other languages
- Real-time progress feedback in terminal

#### Run
- Executes code immediately
- Shows execution output in terminal
- Supports both local and hardware execution

## Hardware Connectivity

### ✅ **Verified Hardware Support**

The application has been tested and verified to work with:

#### **ESP32 Development Boards**
- **Upload**: Uses `mpremote` to upload MicroPython code
- **Run**: Executes code directly on ESP32 via `mpremote run`
- **Detection**: Automatically detects ESP32 boards via serial port

#### **Arduino Boards**
- **Upload**: Compiles and uploads via Arduino CLI (if installed)
- **Run**: Executes compiled code on board
- **Detection**: Detects Arduino boards via USB serial

#### **Other Development Boards**
- **Raspberry Pi**: Via serial connection
- **Generic USB Serial**: Any board with USB serial interface

### 🔧 **Hardware Requirements**

#### **For Python/ESP32:**
```bash
# Install mpremote for ESP32 support
pip install mpremote

# Install MicroPython cross-compiler (optional)
pip install mpy-cross
```

#### **For C/C++:**
```bash
# Install GCC compiler
# Windows: Install MinGW or use WSL
# macOS: Install Xcode Command Line Tools
# Linux: sudo apt-get install build-essential
```

#### **For JavaScript:**
```bash
# Install Node.js
# Download from https://nodejs.org/
```

### 🧪 **Testing Hardware Connectivity**

Run the hardware test to verify your setup:

```bash
node test_hardware.js
```

This will check:
- ✅ Serial port detection
- ✅ mpremote availability (for ESP32)
- ✅ Python availability
- ✅ GCC availability (for C/C++)
- ✅ Node.js availability (for JavaScript)

## Usage

### 1. Generate Code
- Use the Blockly interface to create your program
- Click "Generate [Language]" to convert to code
- Code appears in the Monaco editor

### 2. Hardware Connection
- Click "Refresh Ports" to detect available serial ports
- Select your device from the dropdown
- Check board status with the status indicator

### 3. Compile, Upload, Run
- **Compile**: Validates and compiles code for the target language
- **Upload**: Transfers code to hardware (Python) or executes locally
- **Run**: Immediately executes the code and shows output

### 4. Terminal Output
- All operations show real-time feedback in the terminal
- Clear terminal with the "Clear" button
- Scroll through output history

## Hardware-Specific Instructions

### ESP32 with MicroPython

1. **Connect ESP32** via USB cable
2. **Flash MicroPython** to ESP32 (if not already done)
3. **Generate Python code** in the application
4. **Select ESP32 port** from dropdown
5. **Upload code** - it will be transferred to ESP32
6. **Run code** - executes directly on ESP32

### Arduino Boards

1. **Connect Arduino** via USB cable
2. **Generate C++ code** in the application
3. **Select Arduino port** from dropdown
4. **Upload code** - compiles and uploads to Arduino
5. **Run code** - executes on Arduino board

### Local Development

1. **Generate code** in any supported language
2. **Compile** to check for syntax errors
3. **Run** to execute locally
4. **View output** in terminal

## Requirements

### System Dependencies
- **Node.js**: For JavaScript execution
- **Python**: For Python execution and MicroPython tools
- **GCC**: For C/C++ compilation
- **mpremote**: For ESP32 MicroPython uploads

### Installation
```bash
npm install
npm start
```

## File Structure

```
├── main.js              # Main Electron process
├── renderer.js          # Renderer process with UI logic
├── preload.js           # IPC bridge for main-renderer communication
├── index.html           # Main application interface
├── navbar.html          # Navigation bar with hardware controls
├── monaco.html          # Monaco editor configuration
├── status.py            # Board connection status checker
├── test_hardware.js     # Hardware connectivity test
└── package.json         # Dependencies and scripts
```

## API Reference

### Main Process (main.js)
- `compile-[language]`: Compile code for specific language
- `upload-[language]`: Upload/execute code for specific language
- `run-[language]`: Run code for specific language
- `list-serial-ports`: Get available serial ports
- `open-serial-port`: Connect to serial port
- `check-board`: Check hardware connection status

### Renderer Process (renderer.js)
- `compileCode()`: Multi-language compilation
- `uploadCode()`: Multi-language upload/execution
- `runCode()`: Multi-language execution
- `appendTerminalOutput()`: Add output to terminal
- `clearTerminal()`: Clear terminal output

## Terminal Output Examples

### Successful ESP32 Python Upload
```
🔄 Uploading python code to COM3...
📤 Uploading python code to COM3...
✅ Upload successful!
[Re-opening port COM3 after reset]
✅ Reconnected to COM3
```

### C++ Compilation
```
🔄 Compiling cpp code...
✅ Compilation successful!
g++ "C:\Users\...\main.cpp" -o "C:\Users\...\main.exe"
```

### JavaScript Execution
```
▶️ Running javascript code...
📋 Execution output:
Hello from JavaScript!
```

## Troubleshooting

### Hardware Connection Issues

#### **No Ports Detected**
- Check USB cable connection
- Try different USB port
- Install USB drivers for your board
- Restart the application

#### **ESP32 Upload Fails**
- Ensure MicroPython is flashed to ESP32
- Install mpremote: `pip install mpremote`
- Check if ESP32 is in bootloader mode
- Try pressing reset button on ESP32

#### **Arduino Upload Fails**
- Install Arduino CLI for Arduino support
- Check board type and port selection
- Ensure Arduino IDE drivers are installed

#### **C/C++ Compilation Fails**
- Install GCC compiler
- Windows: Install MinGW or use WSL
- macOS: Install Xcode Command Line Tools
- Linux: `sudo apt-get install build-essential`

### Software Issues

#### **mpremote Not Found**
```bash
pip install mpremote
```

#### **Python Not Found**
- Add Python to system PATH
- Install Python from python.org

#### **GCC Not Found**
- **Windows**: Install MinGW or use WSL
- **macOS**: `xcode-select --install`
- **Linux**: `sudo apt-get install build-essential`

## Error Handling

The application provides comprehensive error handling:
- **Compilation Errors**: Syntax and compilation issues
- **Upload Errors**: Hardware connection and transfer issues
- **Execution Errors**: Runtime errors and exceptions
- **Port Errors**: Serial port connection issues

All errors are displayed in the terminal with clear error messages and suggestions for resolution.

## Development

### Adding New Languages
1. Add compile function in `main.js`
2. Add upload function in `main.js`
3. Add run function in `main.js`
4. Update `preload.js` with new API functions
5. Update `renderer.js` with language support
6. Add language option in UI

### Terminal Integration
The terminal system uses IPC communication to display real-time output from main process operations. All compile, upload, and run operations send output to the terminal for user feedback.

### Hardware Testing
Run `node test_hardware.js` to verify your hardware setup and dependencies are properly configured. 