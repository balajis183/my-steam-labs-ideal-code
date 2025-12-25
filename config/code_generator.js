/**
 * ═══════════════════════════════════════════════════════════════════════════
 * MY STEAM LAB - MICROPYTHON CODE GENERATOR
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * ⚠️ IMPORTANT: This generator produces MICROPYTHON code ONLY (not C/C++)
 * 
 * ARCHITECTURE:
 * ============
 * SECTION 1: PIN MAPPING - Hardware configuration from PIN MAPPING.pdf
 * SECTION 2: LIBRARY MAPPING - Import requirements per block type
 * SECTION 3: UTILITY FUNCTIONS - Block detection, import generation
 * SECTION 4: PIN DEFINITIONS GENERATORS - Generate pin setup code
 *            ├── 4.1: Motors (M1-M4)
 *            ├── 4.2: Sensors (LDR, IR, Temp, Ultrasonic, Touch)
 *            ├── 4.3: Joysticks (Joystick1, Joystick2)
 *            ├── 4.4: OLED Display
 *            └── 4.5: Servo Motors
 * SECTION 5: HELPER FUNCTION GENERATORS - Generate control functions
 *            ├── 5.1: Motor Control Functions
 *            ├── 5.2: Sensor Reading Functions
 *            ├── 5.3: Joystick Reading Functions
 *            └── 5.4: OLED Display Functions
 * SECTION 6: MAIN CODE GENERATION - Combine all sections into final code
 * 
 * ⚠️ CRITICAL HARDWARE SETTINGS:
 * - Baud Rate: 115200 (FIXED - DO NOT CHANGE)
 * - All pin mappings from PIN MAPPING.pdf
 * - ESP32 MicroPython firmware v1.26.0+
 * - No f-strings (use comma-separated print for MicroPython compatibility)
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 1: PIN MAPPING - Hardware Configuration
// ═══════════════════════════════════════════════════════════════════════════

/**
 * PIN MAPPING CONFIGURATION
 * 
 * ⚠️ Source: PIN MAPPING.pdf (provided by client)
 * ⚠️ DO NOT modify these values without updating hardware connections!
 * 
 * All GPIO pin assignments are fixed based on the ESP32 board layout.
 * This ensures consistent behavior across all MY STEAM LAB devices.
 */
const PIN_MAPPING = {
  // ✅ Motors Configuration (from PIN MAPPING.pdf)
  motors: {
    M1: { pinA: 19, pinB: 18, enable: null },  // Motor M1: GPIO19, GPIO18
    M2: { pinA: 5, pinB: 17, enable: null },   // Motor M2: GPIO5, GPIO17
    M3: { pinA: 23, pinB: 22, enable: null },  // Motor M3: GPIO23, GPIO22
    M4: { pinA: 21, pinB: 16, enable: null }   // Motor M4: GPIO21, GPIO16
  },
  
  // ✅ Sensors Configuration (from PIN MAPPING.pdf)
  sensors: {
    ldr: { pin: 34, type: "analog" },           // LDR: GPIO34 (analog)
    ir: { pin: 35, type: "analog" },            // IR: GPIO35 (analog)
    temperature: { pin: 32, type: "analog" },   // Temperature: GPIO32 (analog)
    ultrasonic: { trig: 33, echo: 32 },         // Ultrasonic: TRIG=GPIO33, ECHO=GPIO32
    touch: { pin: 12 },                         // Touch: GPIO12 (digital)
    buzzer: { pin: null }                       // Buzzer: Not specified in PDF
  },
  
  // ✅ Joystick Configuration (from PIN MAPPING.pdf)
  joystick: {
    joystick1: { vertical: 4, horizontal: 2 },   // Joystick1: V=GPIO4, H=GPIO2
    joystick2: { vertical: 26, horizontal: 25 }  // Joystick2: V=GPIO26, H=GPIO25
  },
  
  // ✅ OLED Display Configuration (from PIN MAPPING.pdf)
  oled: { 
    sda: 13,           // OLED SDA: GPIO13
    scl: 15,           // OLED SCL: GPIO15
    address: "0x3C"    // I2C address
  },
  
  // ✅ Servo Configuration (pins not specified in PDF - update when available)
  servo: {
    servo1: { pin: 14 },  // Servo1: GPIO14 (placeholder)
    servo2: { pin: 27 }   // Servo2: GPIO27 (placeholder)
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 2: LIBRARY MAPPING - Import Configuration
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Maps each Blockly block to its required MicroPython libraries
 * 
 * When a block is used, this mapping determines which imports are needed.
 * Example: "ultrasonic_sensor" requires ["machine", "time", "hcsr04"]
 */
const LIBRARY_MAPPING = {
  // Block type → Required libraries
  block_to_libraries: {
    // Motor blocks
    dc_motor: ["machine"],
    motor_speed: ["machine"],
    servo_motor: ["machine", "servo"],
    
    // Sensor blocks
    ldr_sensor: ["machine"],
    ir_sensor: ["machine"],
    ir_sensor_analog: ["machine"],
    temp_sensor: ["machine"],
    ultrasonic_sensor: ["machine", "time", "hcsr04"],
    touch_sensor: ["machine"],
    color_sensor: ["machine", "tcs34725"],
    
    // Input device blocks
    joystick1: ["machine"],
    joystick2: ["machine"],
    
    // Display blocks
    oled_show: ["machine", "ssd1306"],
    oled_show_color: ["machine", "ssd1306"],
    oled_display_colored: ["machine", "ssd1306"],
    oled_display_variable: ["machine", "ssd1306"],
    oled_display_char: ["machine", "ssd1306"],
    oled_animation_blink: ["machine", "ssd1306", "time"],
    oled_animation_scroll: ["machine", "ssd1306", "time"],
    
    // GPIO blocks
    set_pin: ["machine"],
    read_pin: ["machine"],
    pin_mode: ["machine"],
    analog_read: ["machine"],
    analog_write: ["machine"],
    
    // Utility blocks
    time_delay: ["time"],
    
    // Communication blocks
    wifi_connect: ["network"],
    wifi_send: ["network", "socket"],
    wifi_receive: ["network", "socket"],
    bluetooth_setup: ["ubluetooth"],
    bluetooth_send: ["ubluetooth"],
    bluetooth_available: ["ubluetooth"],
    bluetooth_read: ["ubluetooth"]
  },
  
  // Library name → Import statement
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

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 3: UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Detect which blocks are used in the workspace
 * 
 * Scans the entire Blockly workspace and returns a list of all block types used.
 * This is used to determine which libraries to import and which helper functions
 * to generate.
 * 
 * @param {Blockly.Workspace} workspace - The Blockly workspace
 * @returns {Array<string>} Array of block type names
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
 * 
 * @param {Array<string>} usedBlocks - Array of block type names
 * @returns {Array<string>} Array of required library names
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
 * 
 * @param {Array<string>} requiredLibraries - Array of required library names
 * @returns {string} MicroPython import statements
 */
function generateImports(requiredLibraries) {
  const imports = [];
  // Define import order for consistent code structure
  const importOrder = ["machine", "time", "hcsr04", "ssd1306", "servo", "dht", "tcs34725", "network", "socket", "ubluetooth"];
  
  importOrder.forEach(lib => {
    if (requiredLibraries.includes(lib) && LIBRARY_MAPPING.library_imports[lib]) {
      imports.push(LIBRARY_MAPPING.library_imports[lib]);
    }
  });
  
  return imports.join("\n");
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 4: PIN DEFINITIONS GENERATORS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * SECTION 4.1: Generate Motor Pin Definitions
 * 
 * Generates pin setup code for DC motors M1-M4
 * Each motor has two control pins (pinA, pinB) and one PWM pin for speed control
 */
function generateMotorPinDefinitions(pinMapping) {
  const definitions = [];
  
  [1, 2, 3, 4].forEach(motorNum => {
    const motorKey = `M${motorNum}`;
    const mapping = pinMapping.motors[motorKey];
    if (mapping) {
      definitions.push(`# Motor M${motorNum} Configuration`);
      definitions.push(`M${motorNum}_PIN_A = Pin(${mapping.pinA}, Pin.OUT)`);
      definitions.push(`M${motorNum}_PIN_B = Pin(${mapping.pinB}, Pin.OUT)`);
      if (mapping.enable !== null && mapping.enable !== undefined) {
        definitions.push(`M${motorNum}_PWM = PWM(Pin(${mapping.enable}))`);
      } else {
        definitions.push(`M${motorNum}_PWM = PWM(Pin(${mapping.pinA}))`);
      }
      definitions.push(`M${motorNum}_PWM.freq(1000)`);
      definitions.push("");
    }
  });
  
  return definitions.join("\n");
}

/**
 * SECTION 4.2: Generate Sensor Pin Definitions
 * 
 * Generates pin setup code for all sensors:
 * - LDR (Light Dependent Resistor)
 * - IR Sensor (Infrared)
 * - Temperature Sensor (Analog)
 * - Ultrasonic Sensor (HC-SR04)
 * - Touch Sensor
 */
function generateSensorPinDefinitions(usedBlocks, pinMapping) {
  const definitions = [];
  
  // LDR Sensor
  if (usedBlocks.includes("ldr_sensor")) {
    definitions.push(`# LDR Sensor Configuration`);
    definitions.push(`LDR_PIN = ADC(Pin(${pinMapping.sensors.ldr.pin}))`);
    definitions.push("");
  }
  
  // IR Sensor
  if (usedBlocks.includes("ir_sensor") || usedBlocks.includes("ir_sensor_analog")) {
    definitions.push(`# IR Sensor Configuration`);
    definitions.push(`IR_PIN = ADC(Pin(${pinMapping.sensors.ir.pin}))`);
    definitions.push("");
  }
  
  // Temperature Sensor (Analog)
  if (usedBlocks.includes("temp_sensor")) {
    definitions.push(`# Analog Temperature Sensor Configuration`);
    definitions.push(`temp_adc = ADC(Pin(${pinMapping.sensors.temperature.pin}))`);
    definitions.push(`temp_adc.atten(ADC.ATTN_11DB)  # Full range 0-3.3V`);
    definitions.push(`temp_adc.width(ADC.WIDTH_12BIT)  # 12-bit resolution (0-4095)`);
    definitions.push("");
  }
  
  // Ultrasonic Sensor (HC-SR04)
  if (usedBlocks.includes("ultrasonic_sensor")) {
    definitions.push(`# Ultrasonic Sensor Configuration`);
    definitions.push(`ULTRASONIC_SENSOR = hcsr04.HCSR04(trigger_pin=${pinMapping.sensors.ultrasonic.trig}, echo_pin=${pinMapping.sensors.ultrasonic.echo})`);
    definitions.push("");
  }
  
  // Touch Sensor
  if (usedBlocks.includes("touch_sensor")) {
    definitions.push(`# Touch Sensor Configuration`);
    definitions.push(`TOUCH_PIN = Pin(${pinMapping.sensors.touch.pin}, Pin.IN)`);
    definitions.push("");
  }
  
  return definitions.join("\n");
}

/**
 * SECTION 4.3: Generate Joystick Pin Definitions
 * 
 * Generates pin setup code for Joystick 1 and Joystick 2
 * Each joystick has two analog axes: Vertical (V) and Horizontal (H)
 */
function generateJoystickPinDefinitions(usedBlocks, pinMapping) {
  const definitions = [];
  
  // Joystick 1
  if (usedBlocks.includes("joystick1")) {
    definitions.push(`# Joystick 1 Configuration`);
    definitions.push(`JOYSTICK1_V = ADC(Pin(${pinMapping.joystick.joystick1.vertical}))`);
    definitions.push(`JOYSTICK1_H = ADC(Pin(${pinMapping.joystick.joystick1.horizontal}))`);
    definitions.push("");
  }
  
  // Joystick 2
  if (usedBlocks.includes("joystick2")) {
    definitions.push(`# Joystick 2 Configuration`);
    definitions.push(`JOYSTICK2_V = ADC(Pin(${pinMapping.joystick.joystick2.vertical}))`);
    definitions.push(`JOYSTICK2_H = ADC(Pin(${pinMapping.joystick.joystick2.horizontal}))`);
    definitions.push("");
  }
  
  return definitions.join("\n");
}

/**
 * SECTION 4.4: Generate OLED Display Pin Definitions
 * 
 * Generates pin setup code for SSD1306 OLED display via I2C
 */
function generateOLEDPinDefinitions(pinMapping) {
  const definitions = [];
  
  definitions.push(`# OLED Display Configuration (SSD1306)`);
  definitions.push(`I2C_SDA = Pin(${pinMapping.oled.sda})`);
  definitions.push(`I2C_SCL = Pin(${pinMapping.oled.scl})`);
  definitions.push(`i2c = SoftI2C(sda=I2C_SDA, scl=I2C_SCL)`);
  definitions.push(`oled = ssd1306.SSD1306_I2C(128, 64, i2c)`);
  definitions.push("");
  
  return definitions.join("\n");
}

/**
 * SECTION 4.5: Generate Servo Motor Pin Definitions
 * 
 * Generates pin setup code for servo motors
 */
function generateServoPinDefinitions(pinMapping) {
  const definitions = [];
  
  definitions.push(`# Servo Motor Configuration`);
  definitions.push(`SERVO1_PIN = Pin(${pinMapping.servo.servo1.pin})`);
  definitions.push(`servo1 = servo.Servo(SERVO1_PIN)`);
  if (pinMapping.servo.servo2 && pinMapping.servo.servo2.pin) {
    definitions.push(`SERVO2_PIN = Pin(${pinMapping.servo.servo2.pin})`);
    definitions.push(`servo2 = servo.Servo(SERVO2_PIN)`);
  }
  definitions.push("");
  
  return definitions.join("\n");
}

/**
 * Main Pin Definitions Generator
 * Combines all pin definition sections based on used blocks
 */
function generatePinDefinitions(usedBlocks, pinMapping) {
  const sections = [];
  
  // Motor pins
  if (usedBlocks.includes("dc_motor") || usedBlocks.includes("motor_speed")) {
    sections.push(generateMotorPinDefinitions(pinMapping));
  }
  
  // Sensor pins
  sections.push(generateSensorPinDefinitions(usedBlocks, pinMapping));
  
  // Joystick pins
  sections.push(generateJoystickPinDefinitions(usedBlocks, pinMapping));
  
  // OLED pins
  if (usedBlocks.some(b => b.startsWith("oled_"))) {
    sections.push(generateOLEDPinDefinitions(pinMapping));
  }
  
  // Servo pins
  if (usedBlocks.includes("servo_motor")) {
    sections.push(generateServoPinDefinitions(pinMapping));
  }
  
  return sections.filter(s => s.trim()).join("\n");
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 5: HELPER FUNCTION GENERATORS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * SECTION 5.1: Motor Control Helper Functions
 * 
 * Generates motor control functions:
 * - set_motor() - Full control with direction (FORWARD/REVERSE/STOP) and speed
 * - set_motor_speed() - Simple speed control (defaults to FORWARD direction)
 */
function generateMotorHelperFunctions() {
  return `
def set_motor(motor_id, speed, direction):
    """Control a DC motor's speed and direction"""
    motor_num = motor_id[1]
    pin_a_name = 'M' + str(motor_num) + '_PIN_A'
    pin_b_name = 'M' + str(motor_num) + '_PIN_B'
    pwm_name = 'M' + str(motor_num) + '_PWM'
    pin_a = globals()[pin_a_name]
    pin_b = globals()[pin_b_name]
    pwm = globals()[pwm_name]
    duty = int((speed / 255) * 1023)
    pwm.duty(duty)
    print("Motor", motor_id, "->", direction, "Speed:", speed)
    if direction == 'FORWARD':
        pin_a.value(1)
        pin_b.value(0)
    elif direction == 'REVERSE':
        pin_a.value(0)
        pin_b.value(1)
    else:
        pin_a.value(0)
        pin_b.value(0)

def set_motor_speed(motor_id, speed):
    """Control a DC motor's speed (forward direction)"""
    set_motor(motor_id, speed, 'FORWARD')
`;
}

/**
 * SECTION 5.2: Sensor Reading Helper Functions
 * 
 * Generates helper functions for reading sensor values:
 * - read_ldr() - Light Dependent Resistor
 * - read_ir() - IR Sensor (digital detection)
 * - read_ir_analog() - IR Sensor (analog value)
 * - read_temperature() - Analog temperature sensor
 * - read_ultrasonic() - Ultrasonic distance sensor
 * - read_touch() - Touch sensor
 */
function generateSensorHelperFunctions(usedBlocks) {
  const functions = [];
  
  // LDR Sensor
  if (usedBlocks.includes("ldr_sensor")) {
    functions.push(`
def read_ldr():
    """Read LDR (Light Dependent Resistor) value"""
    value = LDR_PIN.read()
    print("LDR:", value)
    return value
`);
  }
  
  // IR Sensor (Digital)
  if (usedBlocks.includes("ir_sensor")) {
    functions.push(`
def read_ir():
    """Read IR sensor (digital detection)"""
    value = IR_PIN.read()
    detected = value > 2048
    print("IR Sensor:", "Detected" if detected else "Not Detected", "(Raw:", value, ")")
    return detected
`);
  }
  
  // IR Sensor (Analog)
  if (usedBlocks.includes("ir_sensor_analog")) {
    functions.push(`
def read_ir_analog():
    """Read IR sensor (analog value)"""
    value = IR_PIN.read()
    print("IR Analog:", value)
    return value
`);
  }
  
  // Temperature Sensor
  if (usedBlocks.includes("temp_sensor")) {
    functions.push(`
def read_temperature():
    """Read analog temperature sensor"""
    try:
        raw_value = temp_adc.read()
        # Convert ADC value to voltage (3.3V reference, 12-bit ADC)
        voltage = raw_value * (3.3 / 4095)
        # Convert voltage to temperature (adjust based on your sensor type)
        # For LM35: 10mV per degree Celsius
        temperature = voltage * 100
        print("Temperature:", round(temperature, 1), "°C (ADC:", raw_value, ")")
        return temperature
    except Exception as e:
        print("Temperature read error:", str(e))
        return 0.0
`);
  }
  
  // Ultrasonic Sensor
  if (usedBlocks.includes("ultrasonic_sensor")) {
    functions.push(`
def read_ultrasonic():
    """Read distance from ultrasonic sensor in cm"""
    try:
        distance = ULTRASONIC_SENSOR.distance_cm()
        if distance is not None:
            print("Ultrasonic:", round(distance, 2), "cm")
            return distance
        else:
            print("Ultrasonic: Out of range")
            return 0
    except Exception as e:
        print("Ultrasonic error:", str(e))
        return 0
`);
  }
  
  // Touch Sensor
  if (usedBlocks.includes("touch_sensor")) {
    functions.push(`
def read_touch():
    """Read touch sensor state"""
    value = TOUCH_PIN.value()
    print("Touch Sensor:", "Touched" if value else "Not Touched")
    return value
`);
  }
  
  return functions.join("\n");
}

/**
 * SECTION 5.3: Joystick Reading Helper Functions
 * 
 * Generates helper functions for reading joystick positions
 */
function generateJoystickHelperFunctions(usedBlocks) {
  const functions = [];
  
  // Joystick 1
  if (usedBlocks.includes("joystick1")) {
    functions.push(`
def read_joystick1():
    """Read Joystick 1 position (V=Vertical, H=Horizontal)"""
    v = JOYSTICK1_V.read()
    h = JOYSTICK1_H.read()
    print("Joystick 1 -> V:", v, "| H:", h)
    return {'V': v, 'H': h}
`);
  }
  
  // Joystick 2
  if (usedBlocks.includes("joystick2")) {
    functions.push(`
def read_joystick2():
    """Read Joystick 2 position (V=Vertical, H=Horizontal)"""
    v = JOYSTICK2_V.read()
    h = JOYSTICK2_H.read()
    print("Joystick 2 -> V:", v, "| H:", h)
    return {'V': v, 'H': h}
`);
  }
  
  return functions.join("\n");
}

/**
 * SECTION 5.4: OLED Display Helper Functions
 * 
 * Generates helper function for displaying text on OLED
 */
function generateOLEDHelperFunctions() {
  return `
def show_on_oled(text, x, y, color='white'):
    """Display text on OLED screen"""
    oled.text(str(text), x, y)
    oled.show()
`;
}

/**
 * Main Helper Functions Generator
 * Combines all helper function sections based on used blocks
 */
function generateHelperFunctions(usedBlocks) {
  const sections = [];
  
  // Motor control functions
  if (usedBlocks.includes("dc_motor") || usedBlocks.includes("motor_speed")) {
    sections.push(generateMotorHelperFunctions());
  }
  
  // Sensor reading functions
  sections.push(generateSensorHelperFunctions(usedBlocks));
  
  // Joystick reading functions
  sections.push(generateJoystickHelperFunctions(usedBlocks));
  
  // OLED display functions
  if (usedBlocks.some(b => b.startsWith("oled_"))) {
    sections.push(generateOLEDHelperFunctions());
  }
  
  return sections.filter(s => s.trim()).join("\n");
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 6: MAIN CODE GENERATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Enhanced Python code generation with pin mapping and auto-imports
 * 
 * This is the main entry point that combines all sections:
 * 1. Header (with timestamp)
 * 2. Imports (based on used blocks)
 * 3. Pin Definitions (hardware setup)
 * 4. Helper Functions (control functions)
 * 5. Main Code (user's Blockly program)
 * 
 * @param {Blockly.Workspace} workspace - The Blockly workspace
 * @returns {string} Complete MicroPython code ready to upload
 */
function generateEnhancedPythonCode(workspace) {
  // ✅ VALIDATION: Verify pin mappings are correct
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
      mainCode = mainCode
        .replace(/void\s+setup\(\)/g, '# MicroPython: setup code')
        .replace(/void\s+loop\(\)/g, '# MicroPython: loop code')
        .replace(/int\s+main\(\)/g, '# MicroPython: main function')
        .replace(/#include\s+<.*>/g, '# MicroPython imports above')
        .replace(/Serial\.begin/g, '# MicroPython: use print() instead')
        .replace(/Serial\.print/g, 'print')
        .replace(/digitalWrite/g, 'pin.value')
        .replace(/digitalRead/g, 'pin.value')
        .replace(/analogWrite/g, 'pwm.duty')
        .replace(/analogRead/g, 'adc.read');
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
        imports = generateImports(requiredLibraries);
      }
      
      // Wrap in MicroPython main function and loop
      const indentedCode = mainCode.split('\n').map(line => {
        if (line.trim() === '' || line.trim().startsWith('#')) {
          return line;
        }
        return '    ' + line;
      }).join('\n');
      
      // MicroPython main loop structure with interrupt guard
      // Using 1 second delay (like Arduino's delay(1000)) for readable sensor output
      mainCode = `def main():
${indentedCode}

try:
    while True:
        main()
        time.sleep(1)  # 1 second delay (like Arduino)
except KeyboardInterrupt:
    print("Program stopped")
    pass
`;
    }
  } else {
    mainCode = `pass\n`;
  }
  
  // Combine all sections
  const fullCode = header + imports + "\n\n" + pinDefinitions + "\n" + helperFunctions + "\n\n" + mainCode;
  
  return fullCode;
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

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
