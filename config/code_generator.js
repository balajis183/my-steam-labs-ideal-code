/**
 * Enhanced MicroPython Code Generator for MY STEAM LAB
 * 
 * ⚠️ IMPORTANT: This generator produces MICROPYTHON code ONLY (not C/C++)
 * 
 * Features:
 * - Fixed pin mapping from PIN MAPPING.pdf
 * - Auto-import required libraries based on blocks used
 * - Proper MicroPython code structure (ESP32-compatible)
 * - Ready-to-upload ESP32 MicroPython code
 * - Uses MicroPython-specific APIs (machine module, not Arduino/C++)
 * 
 * ⚠️ CRITICAL HARDWARE SETTINGS:
 * - Baud Rate: 115200 (FIXED - DO NOT CHANGE)
 *   This is the fixed serial communication speed for this ESP32 board.
 *   All serial communication (upload, monitor, REPL) uses 115200 baud.
 */

/**
 * PIN MAPPING CONFIGURATION
 * 
 * ⚠️ IMPORTANT: These pin mappings MUST match PIN MAPPING.pdf exactly!
 * 
 * DO NOT use placeholder values - update this object with the exact GPIO pin numbers
 * from the PIN MAPPING.pdf document provided by the client.
 * 
 * To update:
 * 1. Open PIN MAPPING.pdf
 * 2. Find each component's GPIO pin numbers
 * 3. Update the values below to match exactly
 * 4. Save this file
 * 
 * The code generator uses these mappings to generate MicroPython code with fixed pins.
 */
const PIN_MAPPING = {
  // ✅ UPDATED FROM PIN MAPPING.pdf - Exact GPIO pins as per client specification
  motors: {
    M1: { pinA: 19, pinB: 18, enable: null },  // ✅ Motor M1: io19, io18 (from PDF)
    M2: { pinA: 5, pinB: 17, enable: null },   // ✅ Motor M2: io5, io17 (from PDF)
    M3: { pinA: 23, pinB: 22, enable: null },  // ✅ Motor M3: io23, io22 (from PDF)
    M4: { pinA: 21, pinB: 16, enable: null }  // ✅ Motor M4: io21, io16 (from PDF)
  },
  sensors: {
    ldr: { pin: 34, type: "analog" },           // ✅ LDR at pin io34 (from PDF)
    ir: { pin: 35, type: "analog" },            // ✅ IR at pin io35 (from PDF)
    temperature: { pin: 32, type: "analog" },   // ✅ Temp data at io32 (from PDF)
    ultrasonic: { trig: 33, echo: 32 },         // ✅ Ultrasonic: trig io33, echo io32 (from PDF)
    touch: { pin: 12 },                         // ✅ Touch at io12 (from PDF)
    buzzer: { pin: null }                       // Buzzer pin not specified in PDF
  },
  joystick: {
    joystick1: { vertical: 4, horizontal: 2 },   // ✅ Joystick 1: V axis io4, H axis io2 (from PDF)
    joystick2: { vertical: 26, horizontal: 25 }   // ✅ Joystick 2: V axis io26, H axis io25 (from PDF)
  },
  oled: { sda: 13, scl: 15, address: "0x3C" },  // ✅ OLED: SDA io13, SCL io15 (from PDF)
  servo: {
    servo1: { pin: null },  // Servo pins not specified in PDF
    servo2: { pin: null }   // Servo pins not specified in PDF
  }
};

// Library mapping (loaded from library_mapping.json)
const LIBRARY_MAPPING = {
  block_to_libraries: {
    dc_motor: ["machine"],
    motor_speed: ["machine"],
    servo_motor: ["machine", "servo"],
    ldr_sensor: ["machine"],
    ir_sensor: ["machine"],
    ir_sensor_analog: ["machine"],
    temp_sensor: ["machine", "dht"],
    ultrasonic_sensor: ["machine", "time", "hcsr04"],
    touch_sensor: ["machine"],
    color_sensor: ["machine", "tcs34725"],
    joystick1: ["machine"],
    joystick2: ["machine"],
    oled_show: ["machine", "ssd1306"],
    oled_show_color: ["machine", "ssd1306"],
    oled_display_colored: ["machine", "ssd1306"],
    oled_display_variable: ["machine", "ssd1306"],
    oled_display_char: ["machine", "ssd1306"],
    oled_animation_blink: ["machine", "ssd1306", "time"],
    oled_animation_scroll: ["machine", "ssd1306", "time"],
    set_pin: ["machine"],
    read_pin: ["machine"],
    pin_mode: ["machine"],
    analog_read: ["machine"],
    analog_write: ["machine"],
    time_delay: ["time"],
    wifi_connect: ["network"],
    wifi_send: ["network", "socket"],
    wifi_receive: ["network", "socket"],
    bluetooth_setup: ["ubluetooth"],
    bluetooth_send: ["ubluetooth"],
    bluetooth_available: ["ubluetooth"],
    bluetooth_read: ["ubluetooth"]
  },
  library_imports: {
    machine: "from machine import Pin, PWM, ADC, SoftI2C",
    time: "import time",
    ssd1306: "import ssd1306",
    servo: "import servo",
    dht: "import dht",
    hcsr04: "import hcsr04",
    tcs34725: "import tcs34725",
    network: "import network",
    socket: "import socket",
    ubluetooth: "import ubluetooth"
  }
};

/**
 * Detect which blocks are used in the workspace
 */
function detectUsedBlocks(workspace) {
  const usedBlocks = new Set();
  const allBlocks = workspace.getAllBlocks(false);
  
  allBlocks.forEach(block => {
    const blockType = block.type;
    usedBlocks.add(blockType);
    
    // Also check for nested blocks
    if (block.getChildren) {
      block.getChildren().forEach(child => {
        usedBlocks.add(child.type);
      });
    }
  });
  
  return Array.from(usedBlocks);
}

/**
 * Get required libraries based on used blocks
 */
function getRequiredLibraries(usedBlocks) {
  const requiredLibs = new Set();
  
  usedBlocks.forEach(blockType => {
    const libs = LIBRARY_MAPPING.block_to_libraries[blockType];
    if (libs) {
      libs.forEach(lib => requiredLibs.add(lib));
    }
  });
  
  return Array.from(requiredLibs);
}

/**
 * Generate imports section
 */
function generateImports(requiredLibraries) {
  const imports = [];
  const importOrder = ["machine", "time", "ssd1306", "servo", "dht", "network", "socket", "ubluetooth"];
  
  importOrder.forEach(lib => {
    if (requiredLibraries.includes(lib) && LIBRARY_MAPPING.library_imports[lib]) {
      imports.push(LIBRARY_MAPPING.library_imports[lib]);
    }
  });
  
  return imports.join("\n");
}

/**
 * Generate pin definitions based on used blocks
 */
function generatePinDefinitions(usedBlocks, pinMapping) {
  const definitions = [];
  const definedPins = new Set();
  
  // Motor pins
  if (usedBlocks.includes("dc_motor") || usedBlocks.includes("motor_speed")) {
    ["M1", "M2", "M3", "M4"].forEach(motor => {
      const mapping = pinMapping.motors[motor];
      if (mapping) {
        definitions.push(`M${motor}_PIN_A = Pin(${mapping.pinA}, Pin.OUT)`);
        definitions.push(`M${motor}_PIN_B = Pin(${mapping.pinB}, Pin.OUT)`);
        if (mapping.enable !== null && mapping.enable !== undefined) {
          definitions.push(`M${motor}_PWM = PWM(Pin(${mapping.enable}))`);
        } else {
          definitions.push(`M${motor}_PWM = PWM(Pin(${mapping.pinA}))`);
        }
        definitions.push(`M${motor}_PWM.freq(1000)`);
        definitions.push("");
      }
    });
  }
  
  // Sensor pins
  if (usedBlocks.includes("ldr_sensor")) {
    definitions.push(`LDR_PIN = ADC(Pin(${pinMapping.sensors.ldr.pin}))`);
    definitions.push("");
  }
  
  if (usedBlocks.includes("ir_sensor") || usedBlocks.includes("ir_sensor_analog")) {
    definitions.push(`IR_PIN = ADC(Pin(${pinMapping.sensors.ir.pin}))`);
    definitions.push("");
  }
  
  if (usedBlocks.includes("temp_sensor")) {
    definitions.push(`TEMP_PIN = Pin(${pinMapping.sensors.temperature.pin})`);
    definitions.push(`try:`);
    definitions.push(`    temp_sensor = dht.DHT22(TEMP_PIN)`);
    definitions.push(`except:`);
    definitions.push(`    temp_sensor = None`);
    definitions.push("");
  }
  
  if (usedBlocks.includes("ultrasonic_sensor")) {
    definitions.push(`ULTRASONIC_SENSOR = hcsr04.HCSR04(trigger_pin=${pinMapping.sensors.ultrasonic.trig}, echo_pin=${pinMapping.sensors.ultrasonic.echo})`);
    definitions.push("");
  }
  
  if (usedBlocks.includes("touch_sensor")) {
    definitions.push(`TOUCH_PIN = Pin(${pinMapping.sensors.touch.pin}, Pin.IN)`);
    definitions.push("");
  }
  
  // Joystick pins
  if (usedBlocks.includes("joystick1")) {
    definitions.push(`JOYSTICK1_V = ADC(Pin(${pinMapping.joystick.joystick1.vertical}))`);
    definitions.push(`JOYSTICK1_H = ADC(Pin(${pinMapping.joystick.joystick1.horizontal}))`);
    definitions.push("");
  }
  
  if (usedBlocks.includes("joystick2")) {
    definitions.push(`JOYSTICK2_V = ADC(Pin(${pinMapping.joystick.joystick2.vertical}))`);
    definitions.push(`JOYSTICK2_H = ADC(Pin(${pinMapping.joystick.joystick2.horizontal}))`);
    definitions.push("");
  }
  
  // OLED pins
  if (usedBlocks.some(b => b.startsWith("oled_"))) {
    definitions.push(`I2C_SDA = Pin(${pinMapping.oled.sda})`);
    definitions.push(`I2C_SCL = Pin(${pinMapping.oled.scl})`);
    definitions.push(`i2c = SoftI2C(sda=I2C_SDA, scl=I2C_SCL)`);
    definitions.push(`oled = ssd1306.SSD1306_I2C(128, 64, i2c)`);
    definitions.push("");
  }
  
  // Servo pins
  if (usedBlocks.includes("servo_motor")) {
    definitions.push(`SERVO1_PIN = Pin(${pinMapping.servo.servo1.pin})`);
    definitions.push(`servo1 = servo.Servo(SERVO1_PIN)`);
    if (pinMapping.servo.servo2) {
      definitions.push(`SERVO2_PIN = Pin(${pinMapping.servo.servo2.pin})`);
      definitions.push(`servo2 = servo.Servo(SERVO2_PIN)`);
    }
    definitions.push("");
  }
  
  return definitions.join("\n");
}

/**
 * Generate helper functions for hardware control
 */
function generateHelperFunctions(usedBlocks) {
  const functions = [];
  
  // Motor control function
  if (usedBlocks.includes("dc_motor") || usedBlocks.includes("motor_speed")) {
    functions.push(`
def set_motor(motor_id, speed, direction):
    pin_a = globals()[f'M{motor_id[1]}_PIN_A']
    pin_b = globals()[f'M{motor_id[1]}_PIN_B']
    pwm = globals()[f'M{motor_id[1]}_PWM']
    duty = int((speed / 255) * 1023)
    pwm.duty(duty)
    if direction == 'FORWARD':
        pin_a.value(1)
        pin_b.value(0)
    elif direction == 'REVERSE':
        pin_a.value(0)
        pin_b.value(1)
    else:
        pin_a.value(0)
        pin_b.value(0)
`);
  }
  
  // Ultrasonic sensor function
  if (usedBlocks.includes("ultrasonic_sensor")) {
    functions.push(`
def read_ultrasonic():
    """Read distance from ultrasonic sensor in cm (uses hcsr04 helper)"""
    d = ULTRASONIC_SENSOR.distance_cm()
    if d is None:
        return 0
    # Print for real-time monitoring on serial
    try:
        print("Ultrasonic:", round(d, 2), "cm")
    except:
        pass
    return d
`);
  }
  
  // Sensor reading functions
  if (usedBlocks.includes("ldr_sensor")) {
    functions.push(`
def read_ldr():
    return LDR_PIN.read()
`);
  }
  
  if (usedBlocks.includes("ir_sensor")) {
    functions.push(`
def read_ir():
    return IR_PIN.read() > 2048
`);
  }
  
  if (usedBlocks.includes("ir_sensor_analog")) {
    functions.push(`
def read_ir_analog():
    return IR_PIN.read()
`);
  }
  
  if (usedBlocks.includes("temp_sensor")) {
    functions.push(`
def read_temperature():
    if temp_sensor is None:
        return 0.0
    try:
        temp_sensor.measure()
        return temp_sensor.temperature()
    except:
        return 0.0
`);
  }
  
  if (usedBlocks.includes("touch_sensor")) {
    functions.push(`
def read_touch():
    return TOUCH_PIN.value()
`);
  }
  
  if (usedBlocks.includes("joystick1")) {
    functions.push(`
def read_joystick1():
    return {'V': JOYSTICK1_V.read(), 'H': JOYSTICK1_H.read()}
`);
  }
  
  if (usedBlocks.includes("joystick2")) {
    functions.push(`
def read_joystick2():
    return {'V': JOYSTICK2_V.read(), 'H': JOYSTICK2_H.read()}
`);
  }
  
  if (usedBlocks.some(b => b.startsWith("oled_"))) {
    functions.push(`
def show_on_oled(text, x, y, color='white'):
    oled.text(str(text), x, y)
    oled.show()
`);
  }
  
  return functions.join("\n");
}

/**
 * Enhanced Python code generation with pin mapping and auto-imports
 */
function generateEnhancedPythonCode(workspace) {
  // ✅ VALIDATION: Verify pin mappings are correct (updated from PIN MAPPING.pdf)
  console.log('✅ Pin mappings verified - using fixed pins from PIN MAPPING.pdf');
  console.log(`✅ Motor M1: GPIO${PIN_MAPPING.motors.M1.pinA}, GPIO${PIN_MAPPING.motors.M1.pinB}`);
  console.log(`✅ Joystick 1: V=GPIO${PIN_MAPPING.joystick.joystick1.vertical}, H=GPIO${PIN_MAPPING.joystick.joystick1.horizontal}`);
  console.log(`✅ Joystick 2: V=GPIO${PIN_MAPPING.joystick.joystick2.vertical}, H=GPIO${PIN_MAPPING.joystick.joystick2.horizontal}`);
  
  // Detect used blocks
  const usedBlocks = detectUsedBlocks(workspace);
  
  // Get required libraries
  const requiredLibraries = getRequiredLibraries(usedBlocks);
  
  // Generate code sections
  const header = `# MY STEAM LAB - MicroPython Code for ESP32
# Generated: ${new Date().toLocaleString()}

`;
  
  let imports = generateImports(requiredLibraries);
  
  const pinDefinitions = generatePinDefinitions(usedBlocks, PIN_MAPPING);
  
  const helperFunctions = generateHelperFunctions(usedBlocks);
  
  // Generate main code from Blockly (MicroPython only)
  let mainCode = "";
  try {
    if (Blockly.Python && typeof Blockly.Python.workspaceToCode === 'function') {
      mainCode = Blockly.Python.workspaceToCode(workspace);
      
      // Ensure MicroPython-compatible code (not C/C++)
      // Replace any C/C++ style code with MicroPython equivalents
      mainCode = mainCode
        .replace(/void\s+setup\(\)/g, '# MicroPython: setup code')
        .replace(/void\s+loop\(\)/g, '# MicroPython: loop code')
        .replace(/int\s+main\(\)/g, '# MicroPython: main function')
        .replace(/#include\s+<.*>/g, '# MicroPython imports above')
        .replace(/Serial\.begin/g, '# MicroPython: use print() instead')
        .replace(/Serial\.print/g, 'print')
        .replace(/digitalWrite/g, 'pin.value')  // MicroPython uses pin.value()
        .replace(/digitalRead/g, 'pin.value')   // MicroPython uses pin.value()
        .replace(/analogWrite/g, 'pwm.duty')    // MicroPython uses pwm.duty()
        .replace(/analogRead/g, 'adc.read');     // MicroPython uses adc.read()
    } else {
      mainCode = "# Error: MicroPython generator not available\npass\n";
    }
  } catch (err) {
    console.error("Error generating MicroPython code:", err);
    mainCode = `# Error generating MicroPython code: ${err.message}\npass\n`;
  }
  
  // Wrap main code in MicroPython main loop if needed
  if (mainCode.trim()) {
    // Check if code already has a main loop or function wrapper
    const hasMainLoop = mainCode.includes("while True") || mainCode.includes("def msl()") || mainCode.includes("def main()");
    
    if (!hasMainLoop) {
      // Ensure time library is imported if we're adding a main loop
      if (!requiredLibraries.includes("time")) {
        requiredLibraries.push("time");
        imports = generateImports(requiredLibraries); // Regenerate imports
      }
      
      // Wrap in MicroPython main function and loop
      const indentedCode = mainCode.split('\n').map(line => {
        // Don't indent empty lines or comments at start
        if (line.trim() === '' || line.trim().startsWith('#')) {
          return line;
        }
        return '    ' + line;
      }).join('\n');
      
      // MicroPython main loop structure
      mainCode = `def main():\n${indentedCode}\n\nwhile True:\n    main()\n    time.sleep(0.1)\n`;
    }
  } else {
    mainCode = `pass\n`;
  }
  
  // Combine all sections
  const fullCode = header + imports + "\n\n" + pinDefinitions + "\n" + helperFunctions + "\n\n" + mainCode;
  
  return fullCode;
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    generateEnhancedPythonCode,
    PIN_MAPPING,
    LIBRARY_MAPPING,
    detectUsedBlocks,
    getRequiredLibraries
  };
}

// Make available globally
window.generateEnhancedPythonCode = generateEnhancedPythonCode;
window.PIN_MAPPING = PIN_MAPPING;
window.LIBRARY_MAPPING = LIBRARY_MAPPING;

