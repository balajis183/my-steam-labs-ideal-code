# MY STEAM LAB - Blockly Code Generator

A code-generation workspace powered by Blockly with multi-language output (JavaScript, Python, C++, C) and optional hardware adapters.

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

#ideal code till save code and load code 

## Repository Layout (What lives where)

```
my-steam-labs-ideal-code/
├─ blockly/
│  ├─ blocks/                 # Block shape/fields (no language semantics)
│  │  └─ index.js
│  └─ generators/            # Per-language code emission for blocks
│     ├─ javascript/index.js  # JS generators (+ forBlock proxies)
│     ├─ python/index.js      # Python generators (+ forBlock proxies)
│     ├─ cpp/index.js         # C++ generators (+ forBlock proxies)
│     └─ c/index.js           # C generators (+ forBlock proxies)
│
├─ ui/
│  ├─ pages/index.html        # App shell, toolbox categories and buttons
│  ├─ pages/monaco.html       # Embedded Monaco editor
│  ├─ scripts/blockly_page.js # Injects Blockly, handles Generate buttons
│  ├─ scripts/renderer.js     # Terminal, compile/upload/run wiring
│  └─ styles/*.css            # Styling
│
├─ hardware/                  # Optional board/IO adapters used at runtime
│  ├─ pin_io.js
│  ├─ sensors.js
│  ├─ motor_control.js
│  └─ oled_display.js
│
├─ app/                       # App host integration (if used)
├─ tests/                     # Workspace/codegen tests (optional)
├─ code_export.js             # Save/export helpers
├─ status.py                  # Connection status utility
└─ README.md
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

### Adding a New Block (step‑by‑step)

1) Define the block UI in `blockly/blocks/index.js`

```js
// Example: simple digital write block
{
  "type": "set_pin",
  "message0": "set pin %1 to %2",
  "args0": [
    { "type": "input_value", "name": "PIN", "check": "Number" },
    { "type": "input_value", "name": "VALUE", "check": ["Boolean","Number"] }
  ],
  "previousStatement": null,
  "nextStatement": null,
  "colour": 230
}
```

2) Implement generators per language in:
   - `blockly/generators/javascript/index.js`
   - `blockly/generators/python/index.js`
   - `blockly/generators/cpp/index.js`
   - `blockly/generators/c/index.js`

Minimal JS example:
```js
Blockly.JavaScript['set_pin'] = function(block){
  const pin = Blockly.JavaScript.valueToCode(block,'PIN',Blockly.JavaScript.ORDER_ATOMIC)||'0';
  const value = Blockly.JavaScript.valueToCode(block,'VALUE',Blockly.JavaScript.ORDER_ATOMIC)||'0';
  return `setPin(${pin}, ${value});\n`;
};
```

3) Ensure forBlock proxies exist

If Blockly uses the new `forBlock` API, our generator files already auto‑proxy to classic handlers. If you want explicit `forBlock` logic, add:
```js
Blockly.JavaScript.forBlock['set_pin'] = (block, gen) => Blockly.JavaScript['set_pin'](block);
```

4) Add the block to the toolbox

In `ui/pages/index.html`, find the `<xml id="toolbox">` and add:
```html
<category name="Pin I/O" colour="230">
  <block type="set_pin"></block>
  ...
</category>
```

5) Test generation

- Open the app, drop the block, click Generate per language
- If a language is missing a handler, the console will show it

6) Wire to real hardware (optional)

- Keep stable API shims in `hardware/*.js` (e.g., `setPin`, `setMotor`)
- Map those shims to libraries/boards used by clients

### Adding a New Category
- Update the toolbox in `ui/pages/index.html`
- Add block definitions in `blockly/blocks/index.js`
- Implement per-language generators in `blockly/generators/*/index.js`
- If needed, extend `hardware/*` adapters

### Adding New Languages
1. Add compile/upload/run paths in your app host (if applicable)
2. Create `blockly/generators/<lang>/index.js` with a `Blockly.<Lang>` generator
3. Provide `forBlock` or classic handlers for all blocks
4. Update UI buttons to call `<Lang>.workspaceToCode(workspace)`
5. Add syntax/compile validation for the language

### Production Tips
- Prefer native per‑language generators over fallbacks
- Enforce a stable API surface (e.g., `setPin`, `oledDisplay`)
- Add snapshot tests: generate code from sample workspaces and compare
- Optionally run compilers/linters on generated code in CI

### Terminal Integration
The terminal system uses IPC communication to display real-time output from main process operations. All compile, upload, and run operations send output to the terminal for user feedback.

### Hardware Testing
Run `node test_hardware.js` to verify your hardware setup and dependencies are properly configured. 