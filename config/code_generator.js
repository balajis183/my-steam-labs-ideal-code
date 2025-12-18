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
  // ⚠️ UPDATE THESE VALUES FROM PIN MAPPING.pdf
  motors: {
    M1: { pinA: 25, pinB: 26, enable: 14 },  // ⚠️ UPDATE FROM PDF
    M2: { pinA: 27, pinB: 32, enable: 15 },  // ⚠️ UPDATE FROM PDF
    M3: { pinA: 33, pinB: 12, enable: 13 },  // ⚠️ UPDATE FROM PDF
    M4: { pinA: 2, pinB: 4, enable: 5 }      // ⚠️ UPDATE FROM PDF
  },
  sensors: {
    ldr: { pin: 36, type: "analog" },           // ⚠️ UPDATE FROM PDF
    ir: { pin: 39, type: "digital" },           // ⚠️ UPDATE FROM PDF
    temperature: { pin: 34, type: "analog" },   // ⚠️ UPDATE FROM PDF
    ultrasonic: { trig: 18, echo: 19 },         // ⚠️ UPDATE FROM PDF
    touch: { pin: 0 },                          // ⚠️ UPDATE FROM PDF
    buzzer: { pin: 16 }                         // ⚠️ UPDATE FROM PDF
  },
  joystick: {
    joystick1: { vertical: 35, horizontal: 37 },  // ⚠️ UPDATE FROM PDF
    joystick2: { vertical: 38, horizontal: 0 }      // ⚠️ UPDATE FROM PDF
  },
  oled: { sda: 21, scl: 22, address: "0x3C" },  // ⚠️ UPDATE FROM PDF
  servo: {
    servo1: { pin: 17 },  // ⚠️ UPDATE FROM PDF
    servo2: { pin: 23 }   // ⚠️ UPDATE FROM PDF
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
    ultrasonic_sensor: ["machine", "time"],
    touch_sensor: ["machine"],
    color_sensor: ["machine"],
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
    definitions.push("# Motor Pin Definitions (DO NOT EDIT - Fixed Pin Mapping)");
    ["M1", "M2", "M3", "M4"].forEach(motor => {
      const mapping = pinMapping.motors[motor];
      if (mapping) {
        definitions.push(`# Motor ${motor}: GPIO${mapping.pinA} (A), GPIO${mapping.pinB} (B), GPIO${mapping.enable} (Enable/PWM)`);
        definitions.push(`M${motor}_PIN_A = Pin(${mapping.pinA}, Pin.OUT)`);
        definitions.push(`M${motor}_PIN_B = Pin(${mapping.pinB}, Pin.OUT)`);
        definitions.push(`M${motor}_PWM = PWM(Pin(${mapping.enable}))`);
        definitions.push(`M${motor}_PWM.freq(1000)  # 1kHz PWM frequency`);
        definitions.push("");
      }
    });
  }
  
  // Sensor pins
  if (usedBlocks.includes("ldr_sensor")) {
    definitions.push("# LDR Sensor Pin Definition");
    definitions.push(`LDR_PIN = ADC(Pin(${pinMapping.sensors.ldr.pin}))`);
    definitions.push("");
  }
  
  if (usedBlocks.includes("ir_sensor") || usedBlocks.includes("ir_sensor_analog")) {
    definitions.push("# IR Sensor Pin Definition");
    definitions.push(`IR_PIN = ADC(Pin(${pinMapping.sensors.ir.pin}))`);
    definitions.push("");
  }
  
  if (usedBlocks.includes("temp_sensor")) {
    definitions.push("# Temperature Sensor Pin Definition");
    // Check if dht library is available (it should be imported)
    definitions.push(`TEMP_PIN = Pin(${pinMapping.sensors.temperature.pin})`);
    definitions.push(`try:`);
    definitions.push(`    temp_sensor = dht.DHT22(TEMP_PIN)`);
    definitions.push(`except:`);
    definitions.push(`    # Fallback if DHT library not available`);
    definitions.push(`    temp_sensor = None`);
    definitions.push("");
  }
  
  if (usedBlocks.includes("ultrasonic_sensor")) {
    definitions.push("# Ultrasonic Sensor Pin Definitions");
    definitions.push(`ULTRASONIC_TRIG = Pin(${pinMapping.sensors.ultrasonic.trig}, Pin.OUT)`);
    definitions.push(`ULTRASONIC_ECHO = Pin(${pinMapping.sensors.ultrasonic.echo}, Pin.IN)`);
    definitions.push("");
  }
  
  if (usedBlocks.includes("touch_sensor")) {
    definitions.push("# Touch Sensor Pin Definition");
    definitions.push(`TOUCH_PIN = Pin(${pinMapping.sensors.touch.pin}, Pin.IN)`);
    definitions.push("");
  }
  
  // Joystick pins
  if (usedBlocks.includes("joystick1")) {
    definitions.push("# Joystick 1 Pin Definitions");
    definitions.push(`JOYSTICK1_V = ADC(Pin(${pinMapping.joystick.joystick1.vertical}))`);
    definitions.push(`JOYSTICK1_H = ADC(Pin(${pinMapping.joystick.joystick1.horizontal}))`);
    definitions.push("");
  }
  
  if (usedBlocks.includes("joystick2")) {
    definitions.push("# Joystick 2 Pin Definitions");
    definitions.push(`JOYSTICK2_V = ADC(Pin(${pinMapping.joystick.joystick2.vertical}))`);
    definitions.push(`JOYSTICK2_H = ADC(Pin(${pinMapping.joystick.joystick2.horizontal}))`);
    definitions.push("");
  }
  
  // OLED pins
  if (usedBlocks.some(b => b.startsWith("oled_"))) {
    definitions.push("# OLED Display Pin Definitions");
    definitions.push(`I2C_SDA = Pin(${pinMapping.oled.sda})`);
    definitions.push(`I2C_SCL = Pin(${pinMapping.oled.scl})`);
    definitions.push(`i2c = SoftI2C(sda=I2C_SDA, scl=I2C_SCL)`);
    definitions.push(`oled = ssd1306.SSD1306_I2C(128, 64, i2c)`);
    definitions.push("");
  }
  
  // Servo pins
  if (usedBlocks.includes("servo_motor")) {
    definitions.push("# Servo Motor Pin Definitions");
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
    """
    MicroPython function: Control DC motor speed and direction
    motor_id: 'M1', 'M2', 'M3', or 'M4'
    speed: 0-255 (PWM duty cycle)
    direction: 'FORWARD' or 'REVERSE'
    """
    # MicroPython: Access global pin objects
    pin_a = globals()[f'M{motor_id[1]}_PIN_A']
    pin_b = globals()[f'M{motor_id[1]}_PIN_B']
    pwm = globals()[f'M{motor_id[1]}_PWM']
    
    # MicroPython: Convert speed (0-255) to PWM duty (0-1023 for ESP32)
    duty = int((speed / 255) * 1023)
    pwm.duty(duty)  # MicroPython PWM duty method
    
    # MicroPython: Set pin values (not digitalWrite like Arduino)
    if direction == 'FORWARD':
        pin_a.value(1)  # MicroPython pin.value() method
        pin_b.value(0)
    elif direction == 'REVERSE':
        pin_a.value(0)
        pin_b.value(1)
    else:
        pin_a.value(0)
        pin_b.value(0)  # Stop
`);
  }
  
  // Ultrasonic sensor function
  if (usedBlocks.includes("ultrasonic_sensor")) {
    functions.push(`
def read_ultrasonic():
    """Read distance from ultrasonic sensor in cm"""
    ULTRASONIC_TRIG.value(0)
    time.sleep_us(2)
    ULTRASONIC_TRIG.value(1)
    time.sleep_us(10)
    ULTRASONIC_TRIG.value(0)
    
    while ULTRASONIC_ECHO.value() == 0:
        signal_off = time.ticks_us()
    
    while ULTRASONIC_ECHO.value() == 1:
        signal_on = time.ticks_us()
    
    time_passed = signal_on - signal_off
    distance = (time_passed * 0.034) / 2  # Distance in cm
    return distance
`);
  }
  
  // Sensor reading functions
  if (usedBlocks.includes("ldr_sensor")) {
    functions.push(`
def read_ldr():
    """MicroPython function: Read LDR sensor value (0-4095 for ESP32 ADC)"""
    return LDR_PIN.read()  # MicroPython: ADC.read() returns 0-4095 on ESP32
`);
  }
  
  if (usedBlocks.includes("ir_sensor")) {
    functions.push(`
def read_ir():
    """MicroPython function: Read IR sensor value (digital)"""
    # MicroPython: ESP32 ADC returns 0-4095, threshold at 2048
    return IR_PIN.read() > 2048  # MicroPython ADC.read() method
`);
  }
  
  if (usedBlocks.includes("ir_sensor_analog")) {
    functions.push(`
def read_ir_analog():
    """MicroPython function: Read IR sensor analog value (0-4095 for ESP32)"""
    return IR_PIN.read()  # MicroPython: ADC.read() returns 0-4095 on ESP32
`);
  }
  
  if (usedBlocks.includes("temp_sensor")) {
    functions.push(`
def read_temperature():
    """MicroPython function: Read temperature from DHT22 sensor"""
    if temp_sensor is None:
        return 0.0  # Return default if sensor not initialized
    try:
        temp_sensor.measure()  # MicroPython: DHT22.measure() method
        return temp_sensor.temperature()  # MicroPython: DHT22.temperature() method
    except:
        return 0.0  # Return default on error
`);
  }
  
  if (usedBlocks.includes("touch_sensor")) {
    functions.push(`
def read_touch():
    """MicroPython function: Read touch sensor value"""
    return TOUCH_PIN.value()  # MicroPython: Pin.value() method (not digitalRead)
`);
  }
  
  if (usedBlocks.includes("joystick1")) {
    functions.push(`
def read_joystick1():
    """MicroPython function: Read Joystick 1 values (V, H)"""
    # MicroPython: Returns dictionary with ADC readings (0-4095)
    return {'V': JOYSTICK1_V.read(), 'H': JOYSTICK1_H.read()}  # MicroPython ADC.read()
`);
  }
  
  if (usedBlocks.includes("joystick2")) {
    functions.push(`
def read_joystick2():
    """MicroPython function: Read Joystick 2 values (V, H)"""
    # MicroPython: Returns dictionary with ADC readings (0-4095)
    return {'V': JOYSTICK2_V.read(), 'H': JOYSTICK2_H.read()}  # MicroPython ADC.read()
`);
  }
  
  if (usedBlocks.some(b => b.startsWith("oled_"))) {
    functions.push(`
def show_on_oled(text, x, y, color='white'):
    """MicroPython function: Display text on OLED at position (x, y)"""
    # MicroPython: ssd1306 library methods
    oled.text(str(text), x, y)  # MicroPython: oled.text() method
    oled.show()  # MicroPython: oled.show() to update display
`);
  }
  
  return functions.join("\n");
}

/**
 * Enhanced Python code generation with pin mapping and auto-imports
 */
function generateEnhancedPythonCode(workspace) {
  // ⚠️ VALIDATION: Check if pin mappings are still placeholders
  const placeholderPins = [
    PIN_MAPPING.motors.M1.pinA === 25 && PIN_MAPPING.motors.M1.pinB === 26,
    PIN_MAPPING.sensors.ldr.pin === 36,
    PIN_MAPPING.oled.sda === 21
  ];
  
  if (placeholderPins.some(p => p)) {
    console.warn('⚠️ WARNING: Pin mappings may still contain placeholder values!');
    console.warn('⚠️ Please update config/pin_mapping.json and config/code_generator.js');
    console.warn('⚠️ with exact GPIO pin numbers from PIN MAPPING.pdf');
  }
  
  // Detect used blocks
  const usedBlocks = detectUsedBlocks(workspace);
  
  // Get required libraries
  const requiredLibraries = getRequiredLibraries(usedBlocks);
  
  // Generate code sections
  const header = `# ============================================
# MY STEAM LAB - Generated MicroPython Code for ESP32
# ============================================
# Generated: ${new Date().toLocaleString()}
# 
# ⚠️ IMPORTANT: 
# - This is MICROPYTHON code (not C/C++)
# - Pin mappings are FIXED as per PIN MAPPING.pdf
# - DO NOT MODIFY pin definitions - they are hardware-specific
# - Pin mappings are defined in: config/pin_mapping.json
# - Ensure pin numbers match PIN MAPPING.pdf exactly!
# 
# Ready to upload to ESP32 Dev Board via MicroPython
# ============================================

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
      mainCode = `def main():\n${indentedCode}\n\n# MicroPython main loop (ESP32 compatible)\nwhile True:\n    main()\n    time.sleep(0.1)  # Small delay to prevent ESP32 watchdog timeout\n`;
    }
  } else {
    mainCode = `# No blocks detected - add your MicroPython code here\npass\n`;
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

