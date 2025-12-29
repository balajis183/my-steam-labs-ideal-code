const PIN_MAPPING = {
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
    servo1: { pin: 23 }  // ✅ Servo at GPIO23 (IO23) - from client specification
  }
};

// Library mapping (loaded from library_mapping.json)
const LIBRARY_MAPPING = {
  block_to_libraries: {
    dc_motor: ["machine"],
    motor_speed: ["machine"],
    servo_motor: ["machine", "servo"],
    servo_angle: ["machine", "servo"],
    ldr_sensor: ["machine"],
    ir_sensor: ["machine"],
    ir_sensor_analog: ["machine"],
    temp_sensor: ["machine"],
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


function generateImports(requiredLibraries) {
  const imports = [];
  const importOrder = ["machine", "time", "hcsr04", "ssd1306", "servo", "dht", "tcs34725", "network", "socket", "ubluetooth"];
  
  importOrder.forEach(lib => {
    if (requiredLibraries.includes(lib) && LIBRARY_MAPPING.library_imports[lib]) {
      imports.push(LIBRARY_MAPPING.library_imports[lib]);
    }
  });
  
  return imports.join("\n");
}


function generatePinDefinitions(usedBlocks, pinMapping) {
  const definitions = [];
  const definedPins = new Set();
  
  // Motor pins
  if (usedBlocks.includes("dc_motor") || usedBlocks.includes("motor_speed")) {
    ["M1", "M2", "M3", "M4"].forEach(motor => {
      const mapping = pinMapping.motors[motor];
      if (mapping) {
        definitions.push(`${motor}_PIN_A = Pin(${mapping.pinA}, Pin.OUT)`);
        definitions.push(`${motor}_PIN_B = Pin(${mapping.pinB}, Pin.OUT)`);
        if (mapping.enable !== null && mapping.enable !== undefined) {
          definitions.push(`${motor}_PWM = PWM(Pin(${mapping.enable}))`);
        } else {
          definitions.push(`${motor}_PWM = PWM(Pin(${mapping.pinA}))`);
        }
        definitions.push(`${motor}_PWM.freq(1000)`);
        definitions.push("");
      }
    });
  }
  
  // Sensor pins
  if (usedBlocks.includes("ldr_sensor")) {
    definitions.push(`# LDR (Light Dependent Resistor) sensor setup`);
    definitions.push(`LDR_PIN = ADC(Pin(${pinMapping.sensors.ldr.pin}))`);
    definitions.push(`LDR_PIN.atten(ADC.ATTN_11DB)  # Full range 0-3.3V`);
    definitions.push(`LDR_PIN.width(ADC.WIDTH_12BIT)  # 12-bit resolution (0-4095)`);
    definitions.push("");
  }
  
  if (usedBlocks.includes("ir_sensor") || usedBlocks.includes("ir_sensor_analog")) {
    definitions.push(`# IR sensor setup`);
    definitions.push(`IR_PIN = ADC(Pin(${pinMapping.sensors.ir.pin}))`);
    definitions.push(`IR_PIN.atten(ADC.ATTN_11DB)  # Full range 0-3.3V`);
    definitions.push(`IR_PIN.width(ADC.WIDTH_12BIT)  # 12-bit resolution (0-4095)`);
    definitions.push("");
  }
  
  if (usedBlocks.includes("temp_sensor")) {
    definitions.push(`# Analog temperature sensor setup`);
    definitions.push(`temp_adc = ADC(Pin(${pinMapping.sensors.temperature.pin}))`);
    definitions.push(`temp_adc.atten(ADC.ATTN_11DB)  # Full range 0-3.3V`);
    definitions.push(`temp_adc.width(ADC.WIDTH_12BIT)  # 12-bit resolution (0-4095)`);
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
  if (usedBlocks.includes("servo_motor") || usedBlocks.includes("servo_angle")) {
    definitions.push(`SERVO_PIN = Pin(${pinMapping.servo.servo1.pin})`);
    definitions.push(`servo1 = servo.Servo(SERVO_PIN)`);
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
    """Control DC motor with direction and speed"""
    pin_a_name = motor_id + '_PIN_A'
    pin_b_name = motor_id + '_PIN_B'
    pwm_name = motor_id + '_PWM'
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
`);
  }
  
  // Ultrasonic sensor function
  if (usedBlocks.includes("ultrasonic_sensor")) {
    functions.push(`
def read_ultrasonic():
    """Read distance from ultrasonic sensor in cm"""
    try:
        distance = ULTRASONIC_SENSOR.distance_cm()
        if distance is not None:
            print("Distance:", round(distance), "cm")
            return distance
        else:
            print("Distance: Out of range")
            return 0
    except Exception as e:
        print("Distance error:", str(e))
        return 0
`);
  }
  
  // Sensor reading functions
  if (usedBlocks.includes("ldr_sensor")) {
    functions.push(`
def read_ldr():
    """Read LDR sensor value and show light level"""
    value = LDR_PIN.read()
    
    # Determine light level
    if value < 500:
        level = "Very Dark"
    elif value < 1500:
        level = "Dark"
    elif value < 2500:
        level = "Normal"
    elif value < 3500:
        level = "Bright"
    else:
        level = "Very Bright"
    
    print("Light:", value, "(" + level + ")")
    return value
`);
  }
  
  if (usedBlocks.includes("ir_sensor")) {
    functions.push(`
def read_ir():
    value = IR_PIN.read()
    detected = value > 2048
    print("IR Sensor:", "Detected" if detected else "Not Detected", "(Raw:", value, ")")
    return detected
`);
  }
  
  if (usedBlocks.includes("ir_sensor_analog")) {
    functions.push(`
def read_ir_analog():
    value = IR_PIN.read()
    print("IR Analog:", value)
    return value
`);
  }
  
  if (usedBlocks.includes("temp_sensor")) {
    functions.push(`
def read_temperature():
    """Read temperature from analog sensor"""
    try:
        # Average multiple readings for stability
        total = 0
        samples = 10
        for _ in range(samples):
            total += temp_adc.read()
            time.sleep(0.01)
        
        raw_value = total // samples
        
        if raw_value > 3800:
            print("Temperature: Sensor not connected")
            return 0.0
        
        # Convert to voltage and temperature
        voltage = raw_value * (3.3 / 4095)
        temperature = voltage * 100
        
        # Validate range
        if temperature < 0 or temperature > 100:
            temperature = (voltage - 0.5) * 100
        
        print("Temperature:", round(temperature), "°C")
        return temperature
    except Exception as e:
        print("Temperature error:", str(e))
        return 0.0
`);
  }
  
  if (usedBlocks.includes("touch_sensor")) {
    functions.push(`
def read_touch():
    value = TOUCH_PIN.value()
    print("Touch Sensor:", "Touched" if value else "Not Touched")
    return value
`);
  }
  
  if (usedBlocks.includes("joystick1")) {
    functions.push(`
def read_joystick1():
    v = JOYSTICK1_V.read()
    h = JOYSTICK1_H.read()
    # Print for real-time monitoring on serial
    try:
        print("Joystick 1 -> V:", v, "| H:", h)
    except:
        pass
    return {'V': v, 'H': h}
`);
  }
  
  if (usedBlocks.includes("joystick2")) {
    functions.push(`
def read_joystick2():
    v = JOYSTICK2_V.read()
    h = JOYSTICK2_H.read()
    # Print for real-time monitoring on serial
    try:
        print("Joystick 2 -> V:", v, "| H:", h)
    except:
        pass
    return {'V': v, 'H': h}
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
  // Validate pin mappings
  console.log('[INFO] Pin mappings loaded from configuration');
  console.log(`[INFO] Motor M1: GPIO${PIN_MAPPING.motors.M1.pinA}, GPIO${PIN_MAPPING.motors.M1.pinB}`);
  console.log(`[INFO] Joystick 1: V=GPIO${PIN_MAPPING.joystick.joystick1.vertical}, H=GPIO${PIN_MAPPING.joystick.joystick1.horizontal}`);
  console.log(`[INFO] Joystick 2: V=GPIO${PIN_MAPPING.joystick.joystick2.vertical}, H=GPIO${PIN_MAPPING.joystick.joystick2.horizontal}`);
  
  // Detect used blocks
  const usedBlocks = detectUsedBlocks(workspace);
  
  // Get required libraries
  const requiredLibraries = getRequiredLibraries(usedBlocks);
  
  // Generate code sections
  const header = `# MicroPython Code for ESP32
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
      mainCode = `def main():
${indentedCode}

try:
    while True:
        main()
        time.sleep(0.5)
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

