// Define custom blocks using Blockly
Blockly.defineBlocksWithJsonArray([
  // Pin I/O blocks
  {
    "type": "set_pin",
    "message0": "set pin %1 to %2",
    "args0": [
      { "type": "input_value", "name": "PIN", "check": "Number" },
      { "type": "input_value", "name": "VALUE", "check": ["Boolean","Number"] }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 230,
    "tooltip": "Set digital pin value",
    "helpUrl": ""
  },
  {
    "type": "read_pin",
    "message0": "read pin %1",
    "args0": [ { "type": "input_value", "name": "PIN", "check": "Number" } ],
    "output": "Number",
    "colour": 230,
    "tooltip": "Read pin value",
    "helpUrl": ""
  },
  
  // Motor control blocks
  {
    "type": "dc_motor",
    "message0": "set motor %1 speed to %2 and direction %3",
    "args0": [
      {
        "type": "field_dropdown",
        "name": "MOTOR",
        "options": [
          ["M1", "M1"],
          ["M2", "M2"],
          ["M3", "M3"],
          ["M4", "M4"]
        ]
      },
      { "type": "input_value", "name": "SPEED", "check": "Number" },
      {
        "type": "field_dropdown",
        "name": "DIRECTION",
        "options": [
          ["forward", "FORWARD"],
          ["reverse", "REVERSE"]
        ]
      }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 20,
    "tooltip": "Control DC motor speed and direction",
    "helpUrl": ""
  },
  {
    "type": "servo_motor",
    "message0": "set servo motor %1 angle to %2",
    "args0": [
      {
        "type": "field_input",
        "name": "SERVO",
        "text": "1"
      },
      { "type": "input_value", "name": "ANGLE", "check": "Number" }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 20,
    "tooltip": "Control servo motor angle",
    "helpUrl": ""
  },
  
  // Sensor blocks
  {
    "type": "ldr_sensor",
    "message0": "read LDR sensor",
    "output": "Number",
    "colour": 120,
    "tooltip": "Read LDR sensor value",
    "helpUrl": ""
  },
  {
    "type": "ir_sensor",
    "message0": "read IR sensor",
    "output": "Boolean",
    "colour": 120,
    "tooltip": "Read IR sensor value",
    "helpUrl": ""
  },
  {
    "type": "temp_sensor",
    "message0": "read Temperature sensor",
    "output": "Number",
    "colour": 120,
    "tooltip": "Read Temperature sensor value",
    "helpUrl": ""
  },
  {
    "type": "ultrasonic_sensor",
    "message0": "read Ultrasonic sensor distance",
    "output": "Number",
    "colour": 120,
    "tooltip": "Read Ultrasonic sensor distance",
    "helpUrl": ""
  },
  {
    "type": "touch_sensor",
    "message0": "read Touch sensor",
    "output": "Boolean",
    "colour": 120,
    "tooltip": "Read Touch sensor value",
    "helpUrl": ""
  },
  {
    "type": "color_sensor",
    "message0": "read Color sensor",
    "output": "String",
    "colour": 120,
    "tooltip": "Read Color sensor value",
    "helpUrl": ""
  },
  
  // Joystick blocks
  {
    "type": "joystick1",
    "message0": "read Joystick 1 (V: %1, H: %2)",
    "args0": [
      {
        "type": "field_input",
        "name": "V",
        "text": "0"
      },
      {
        "type": "field_input",
        "name": "H",
        "text": "0"
      }
    ],
    "output": "Object",
    "colour": 290,
    "tooltip": "Read Joystick 1",
    "helpUrl": ""
  },
  {
    "type": "joystick2",
    "message0": "read Joystick 2 (V: %1, H: %2)",
    "args0": [
      {
        "type": "field_input",
        "name": "V",
        "text": "0"
      },
      {
        "type": "field_input",
        "name": "H",
        "text": "0"
      }
    ],
    "output": "Object",
    "colour": 290,
    "tooltip": "Read Joystick 2",
    "helpUrl": ""
  },
  
  // OLED display block
  {
    "type": "oled_display_colored",
    "message0": "display text %1 at x %2 y %3 in color %4",
    "args0": [
      { "type": "input_value", "name": "TEXT", "check": "String" },
      { "type": "input_value", "name": "X", "check": "Number" },
      { "type": "input_value", "name": "Y", "check": "Number" },
      { "type": "input_value", "name": "COLOR" }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 160,
    "tooltip": "Display colored text on OLED",
    "helpUrl": ""
  }
]);

// Hardware interaction functions (mock) – only used as fallbacks
function setPin(pin, value) {
  console.log(`Pin ${pin} set to ${value}`);
}

function readPin(pin) {
  console.log(`Reading value from pin ${pin}`);
  return Math.random() > 0.5 ? 1 : 0; // Mock pin read value
}

function setMotor(motor, speed, direction) {
  console.log(`Motor ${motor} set to speed ${speed} in direction ${direction}`);
}

function setServo(servo, angle) {
  console.log(`Servo ${servo} set to angle ${angle}`);
}

function readLDR() {
  return Math.random() * 1024; // Mock LDR sensor reading
}

function readIR() {
  return Math.random() > 0.5; // Mock IR sensor reading
}

function readTemperature() {
  return Math.random() * 100; // Mock temperature sensor reading
}

function readUltrasonic() {
  return Math.random() * 100; // Mock ultrasonic sensor reading
}

function readTouch() {
  return Math.random() > 0.5; // Mock touch sensor reading
}

function readColor() {
  const colors = ['red', 'green', 'blue'];
  return colors[Math.floor(Math.random() * colors.length)]; // Mock color sensor reading
}

function readJoystick1() {
  return { V: Math.random() * 1024, H: Math.random() * 1024 };
}

function readJoystick2() {
  return { V: Math.random() * 1024, H: Math.random() * 1024 };
}

function showOnOLED(text, x, y, color) {
  if (typeof window.writeOLED === 'function') {
    window.writeOLED(0, String(text));
  } else if (typeof window.oledDisplay === 'function') {
    window.oledDisplay(String(text));
  } else {
    console.log(`Displaying on OLED at (${x}, ${y}) with color ${color}: ${text}`);
  }
}

// ========================================
// NEW HARDWARE FUNCTIONS FOR MISSING BLOCKS
// ========================================

// Pin mode configuration
function setPinMode(pin, mode) {
  console.log(`Setting pin ${pin} mode to ${mode}`);
  // This would interface with actual hardware
}

// Analog read function
function readAnalogPin(pin) {
  console.log(`Reading analog value from pin ${pin}`);
  return Math.floor(Math.random() * 1024); // Mock analog read (0-1023)
}

// Analog write function (PWM)
function writeAnalogPin(pin, value) {
  console.log(`Writing analog value ${value} to pin ${pin} (PWM)`);
  // This would interface with actual hardware PWM
}

// Motor speed control
function setMotorSpeed(motor, speed) {
  console.log(`Setting motor ${motor} speed to ${speed}`);
  // This would interface with actual motor driver
}

// IR sensor analog read
function readIRAnalog() {
  console.log(`Reading IR sensor analog value`);
  return Math.floor(Math.random() * 1024); // Mock IR analog read
}

// WiFi functions
function wifiConnect(ssid, password) {
  console.log(`Connecting to WiFi: ${ssid}`);
  // This would interface with ESP32/ESP8266 WiFi
  return true; // Mock connection success
}

function wifiSend(data, ip, port) {
  console.log(`Sending data over WiFi to ${ip}:${port}: ${data}`);
  // This would send data over WiFi network
}

function wifiReceive(port) {
  console.log(`Receiving data on WiFi port ${port}`);
  return "Mock WiFi data"; // Mock received data
}

// Enhanced OLED functions
function displayVariableOnOLED(variable, x, y) {
  console.log(`Displaying variable ${variable} on OLED at (${x}, ${y})`);
  if (typeof window.writeOLED === 'function') {
    window.writeOLED(0, String(variable));
  }
}

function displayCharOnOLED(char, x, y) {
  console.log(`Displaying character ${char} on OLED at (${x}, ${y})`);
  if (typeof window.writeOLED === 'function') {
    window.writeOLED(0, char);
  }
}

function blinkTextOnOLED(text, times, delay) {
  console.log(`Blinking text "${text}" ${times} times with ${delay}ms delay`);
  // This would create blinking animation on OLED
}

function scrollTextOnOLED(text, direction, speed) {
  console.log(`Scrolling text "${text}" ${direction} with speed ${speed}`);
  // This would create scrolling animation on OLED
}

// JavaScript generators are now defined in separate files

// Extra blocks used by toolbox
Blockly.Blocks['time_delay'] = {
  init: function() {
    this.appendValueInput('TIME').setCheck('Number').appendField('Time');
    this.appendDummyInput().appendField('ms');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(195);
  }
};
// JavaScript generator moved to separate file

Blockly.Blocks['enhanced_if'] = {
  init: function() {
    this.appendValueInput('IF0').setCheck('Boolean').appendField('if');
    this.appendStatementInput('DO0').setCheck(null).appendField('do');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(210);
  }
};
// JavaScript generator moved to separate file

Blockly.Blocks['enhanced_compare'] = {
  init: function() {
    this.appendValueInput('A').setCheck(null);
    this.appendDummyInput().appendField(new Blockly.FieldDropdown([["==","EQ"],["≠","NEQ"],[">","GT"],["<","LT"],["≥","GTE"],["≤","LTE"]]), 'OP');
    this.appendValueInput('B').setCheck(null);
    this.setInputsInline(true);
    this.setOutput(true, 'Boolean');
    this.setColour(210);
  }
};
// JavaScript generator moved to separate file

Blockly.Blocks['enhanced_logic'] = {
  init: function() {
    this.appendValueInput('A').setCheck('Boolean');
    this.appendDummyInput().appendField(new Blockly.FieldDropdown([["&&","AND"],["||","OR"]]), 'OP');
    this.appendValueInput('B').setCheck('Boolean');
    this.setInputsInline(true);
    this.setOutput(true, 'Boolean');
    this.setColour(210);
  }
};
// JavaScript generator moved to separate file

// Simple OLED show block used by toolbox
Blockly.Blocks['oled_show'] = {
  init: function() {
    this.appendValueInput('TEXT').setCheck('String').appendField('OLED display');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(330);
  }
};
// JavaScript generator moved to separate file



// -----------------------------
// Extra blocks needed by toolbox
// -----------------------------

// My Program container block
if (!Blockly.Blocks['my_program']) {
  Blockly.Blocks['my_program'] = {
    init: function() {
      this.appendDummyInput().appendField('? My Program');
      this.appendStatementInput('PROGRAM').setCheck(null);
      this.setColour(160);
      this.setTooltip('Main program block');
    }
  };
}

// Simple variables helpers (in addition to built-ins)
if (!Blockly.Blocks['variables_declare']) {
  Blockly.Blocks['variables_declare'] = {
    init: function() {
      this.appendDummyInput().appendField('Declare').appendField(new Blockly.FieldVariable('i_count'), 'VAR');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(330);
      this.setTooltip('Declare a variable');
    }
  };
}

if (!Blockly.Blocks['variables_define']) {
  Blockly.Blocks['variables_define'] = {
    init: function() {
      this.appendValueInput('VALUE').setCheck(null).appendField('Define').appendField(new Blockly.FieldVariable('i_count'), 'VAR').appendField('to');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(330);
      this.setTooltip('Define a variable with initial value');
    }
  };
}

// Bluetooth blocks
if (!Blockly.Blocks['bluetooth_setup']) {
  Blockly.Blocks['bluetooth_setup'] = {
    init: function() {
      this.appendDummyInput().appendField('Setup Bluetooth with device name:')
        .appendField(new Blockly.FieldTextInput('My_ESP32'), 'DEVICE_NAME');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(290);
    }
  };
}

if (!Blockly.Blocks['bluetooth_send']) {
  Blockly.Blocks['bluetooth_send'] = {
    init: function() {
      this.appendValueInput('DATA').setCheck(['String','Number']).appendField('Bluetooth send');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(290);
    }
  };
}

if (!Blockly.Blocks['bluetooth_available']) {
  Blockly.Blocks['bluetooth_available'] = { init: function(){ this.appendDummyInput().appendField('Bluetooth data available?'); this.setOutput(true,'Boolean'); this.setColour(290);} };
  // JavaScript generator moved to separate file
}

if (!Blockly.Blocks['bluetooth_read']) {
  Blockly.Blocks['bluetooth_read'] = { init: function(){ this.appendDummyInput().appendField('Bluetooth read string'); this.setOutput(true,'String'); this.setColour(290);} };
}

// ========================================
// NEW MISSING BLOCKS ACCORDING TO DOCUMENT
// ========================================

// 1. PIN MODE CONFIGURATION
if (!Blockly.Blocks['pin_mode']) {
  Blockly.Blocks['pin_mode'] = {
    init: function() {
      this.appendDummyInput().appendField('Set pin')
        .appendField(new Blockly.FieldNumber(13, 0, 54), 'PIN')
        .appendField('as')
        .appendField(new Blockly.FieldDropdown([
          ["INPUT", "INPUT"],
          ["OUTPUT", "OUTPUT"],
          ["INPUT_PULLUP", "INPUT_PULLUP"]
        ]), 'MODE');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(230);
      this.setTooltip('Set pin mode (INPUT, OUTPUT, INPUT_PULLUP)');
    }
  };
}

// 2. ANALOG READ BLOCK
if (!Blockly.Blocks['analog_read']) {
  Blockly.Blocks['analog_read'] = {
    init: function() {
      this.appendDummyInput().appendField('Read analog pin')
        .appendField(new Blockly.FieldNumber(0, 0, 16), 'PIN');
      this.setOutput(true, 'Number');
      this.setColour(230);
      this.setTooltip('Read analog value from pin (0-1023 for Arduino, 0-4095 for ESP32)');
    }
  };
}

// 3. ANALOG WRITE BLOCK (PWM)
if (!Blockly.Blocks['analog_write']) {
  Blockly.Blocks['analog_write'] = {
    init: function() {
      this.appendDummyInput().appendField('Write analog pin')
        .appendField(new Blockly.FieldNumber(9, 0, 54), 'PIN')
        .appendField('value')
        .appendField(new Blockly.FieldNumber(128, 0, 255), 'VALUE');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(230);
      this.setTooltip('Write PWM value to pin (0-255)');
    }
  };
}

// 4. MOTOR SPEED CONTROL
if (!Blockly.Blocks['motor_speed']) {
  Blockly.Blocks['motor_speed'] = {
    init: function() {
      this.appendDummyInput().appendField('Set motor')
        .appendField(new Blockly.FieldDropdown([
          ["M1", "M1"],
          ["M2", "M2"],
          ["M3", "M3"],
          ["M4", "M4"]
        ]), 'MOTOR')
        .appendField('speed to')
        .appendField(new Blockly.FieldNumber(100, 0, 255), 'SPEED');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(20);
      this.setTooltip('Set motor speed (0-255)');
    }
  };
}

// 5. IR SENSOR ANALOG READ
if (!Blockly.Blocks['ir_sensor_analog']) {
  Blockly.Blocks['ir_sensor_analog'] = {
    init: function() {
      this.appendDummyInput().appendField('Read IR sensor analog value');
      this.setOutput(true, 'Number');
      this.setColour(120);
      this.setTooltip('Read analog value from IR sensor');
    }
  };
}

// 6. WIFI COMMUNICATION BLOCKS
if (!Blockly.Blocks['wifi_connect']) {
  Blockly.Blocks['wifi_connect'] = {
    init: function() {
      this.appendDummyInput().appendField('WiFi connect to SSID:')
        .appendField(new Blockly.FieldTextInput('MyWiFi'), 'SSID')
        .appendField('Password:')
        .appendField(new Blockly.FieldTextInput('password'), 'PASSWORD');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(290);
      this.setTooltip('Connect to WiFi network');
    }
  };
}

if (!Blockly.Blocks['wifi_send']) {
  Blockly.Blocks['wifi_send'] = {
    init: function() {
      this.appendValueInput('DATA').setCheck(['String','Number']).appendField('WiFi send to')
        .appendField(new Blockly.FieldTextInput('192.168.1.100'), 'IP')
        .appendField('port')
        .appendField(new Blockly.FieldNumber(80, 1, 65535), 'PORT');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(290);
      this.setTooltip('Send data over WiFi');
    }
  };
}

if (!Blockly.Blocks['wifi_receive']) {
  Blockly.Blocks['wifi_receive'] = {
    init: function() {
      this.appendDummyInput().appendField('WiFi receive on port')
        .appendField(new Blockly.FieldNumber(80, 1, 65535), 'PORT');
      this.setOutput(true, 'String');
      this.setColour(290);
      this.setTooltip('Receive data over WiFi');
    }
  };
}

// 7. ENHANCED OLED DISPLAY BLOCKS
if (!Blockly.Blocks['oled_display_variable']) {
  Blockly.Blocks['oled_display_variable'] = {
    init: function() {
      this.appendValueInput('VARIABLE').setCheck(null).appendField('OLED display variable')
        .appendField('at x')
        .appendField(new Blockly.FieldNumber(0, 0, 128), 'X')
        .appendField('y')
        .appendField(new Blockly.FieldNumber(0, 0, 64), 'Y');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(160);
      this.setTooltip('Display variable value on OLED');
    }
  };
}

if (!Blockly.Blocks['oled_display_char']) {
  Blockly.Blocks['oled_display_char'] = {
    init: function() {
      this.appendDummyInput().appendField('OLED display character')
        .appendField(new Blockly.FieldTextInput('A'), 'CHAR')
        .appendField('at x')
        .appendField(new Blockly.FieldNumber(0, 0, 128), 'X')
        .appendField('y')
        .appendField(new Blockly.FieldNumber(0, 0, 64), 'Y');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(160);
      this.setTooltip('Display single character on OLED');
    }
  };
}

if (!Blockly.Blocks['oled_animation_blink']) {
  Blockly.Blocks['oled_animation_blink'] = {
    init: function() {
      this.appendValueInput('TEXT').setCheck('String').appendField('OLED blink text')
        .appendField('times')
        .appendField(new Blockly.FieldNumber(3, 1, 10), 'TIMES')
        .appendField('delay')
        .appendField(new Blockly.FieldNumber(500, 100, 2000), 'DELAY');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(160);
      this.setTooltip('Blink text on OLED display');
    }
  };
}

if (!Blockly.Blocks['oled_animation_scroll']) {
  Blockly.Blocks['oled_animation_scroll'] = {
    init: function() {
      this.appendValueInput('TEXT').setCheck('String').appendField('OLED scroll text')
        .appendField('direction')
        .appendField(new Blockly.FieldDropdown([
          ["Left", "LEFT"],
          ["Right", "RIGHT"],
          ["Up", "UP"],
          ["Down", "DOWN"]
        ]), 'DIRECTION')
        .appendField('speed')
        .appendField(new Blockly.FieldNumber(100, 50, 500), 'SPEED');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(160);
      this.setTooltip('Scroll text on OLED display');
    }
  };
}






















/*Blockly.defineBlocksWithJsonArray([
  // Pin I/O blocks
  {
    "type": "set_pin",
    "message0": "set pin %1 to %2",
    "args0": [
      {
        "type": "field_input",
        "name": "PIN",
        "text": "13"
      },
      {
        "type": "field_input",
        "name": "VALUE",
        "text": "0"
      }
    ],
    "output": null,
    "colour": 230,
    "tooltip": "Set pin to HIGH or LOW",
    "helpUrl": ""
  },
  {
    "type": "read_pin",
    "message0": "read pin %1",
    "args0": [
      {
        "type": "field_input",
        "name": "PIN",
        "text": "13"
      }
    ],
    "output": "Number",
    "colour": 230,
    "tooltip": "Read pin value",
    "helpUrl": ""
  },
  
  // Motor control blocks
  {
    "type": "dc_motor",
    "message0": "set motor %1 speed to %2 and direction %3",
    "args0": [
      {
        "type": "field_dropdown",
        "name": "MOTOR",
        "options": [
          ["M1", "M1"],
          ["M2", "M2"],
          ["M3", "M3"],
          ["M4", "M4"]
        ]
      },
      {
        "type": "field_input",
        "name": "SPEED",
        "text": "100"
      },
      {
        "type": "field_dropdown",
        "name": "DIRECTION",
        "options": [
          ["forward", "FORWARD"],
          ["reverse", "REVERSE"]
        ]
      }
    ],
    "output": null,
    "colour": 20,
    "tooltip": "Control DC motor speed and direction",
    "helpUrl": ""
  },
  {
    "type": "servo_motor",
    "message0": "set servo motor %1 angle to %2",
    "args0": [
      {
        "type": "field_input",
        "name": "SERVO",
        "text": "1"
      },
      {
        "type": "field_input",
        "name": "ANGLE",
        "text": "90"
      }
    ],
    "output": null,
    "colour": 20,
    "tooltip": "Control servo motor angle",
    "helpUrl": ""
  },
  
  // Sensor blocks
  {
    "type": "ldr_sensor",
    "message0": "read LDR sensor",
    "output": "Number",
    "colour": 120,
    "tooltip": "Read LDR sensor value",
    "helpUrl": ""
  },
  {
    "type": "ir_sensor",
    "message0": "read IR sensor",
    "output": "Boolean",
    "colour": 120,
    "tooltip": "Read IR sensor value",
    "helpUrl": ""
  },
  {
    "type": "temp_sensor",
    "message0": "read Temperature sensor",
    "output": "Number",
    "colour": 120,
    "tooltip": "Read Temperature sensor value",
    "helpUrl": ""
  },
  {
    "type": "ultrasonic_sensor",
    "message0": "read Ultrasonic sensor distance",
    "output": "Number",
    "colour": 120,
    "tooltip": "Read Ultrasonic sensor distance",
    "helpUrl": ""
  },
  {
    "type": "touch_sensor",
    "message0": "read Touch sensor",
    "output": "Boolean",
    "colour": 120,
    "tooltip": "Read Touch sensor value",
    "helpUrl": ""
  },
  {
    "type": "color_sensor",
    "message0": "read Color sensor",
    "output": "String",
    "colour": 120,
    "tooltip": "Read Color sensor value",
    "helpUrl": ""
  },
  
  // Joystick blocks
  {
    "type": "joystick1",
    "message0": "read Joystick 1 (V: %1, H: %2)",
    "args0": [
      {
        "type": "field_input",
        "name": "V",
        "text": "0"
      },
      {
        "type": "field_input",
        "name": "H",
        "text": "0"
      }
    ],
    "output": "Object",
    "colour": 290,
    "tooltip": "Read Joystick 1",
    "helpUrl": ""
  },
  {
    "type": "joystick2",
    "message0": "read Joystick 2 (V: %1, H: %2)",
    "args0": [
      {
        "type": "field_input",
        "name": "V",
        "text": "0"
      },
      {
        "type": "field_input",
        "name": "H",
        "text": "0"
      }
    ],
    "output": "Object",
    "colour": 290,
    "tooltip": "Read Joystick 2",
    "helpUrl": ""
  },
  
  // OLED display block
  {
    "type": "oled_display_colored",
    "message0": "display text %1 at x %2 y %3 in color %4",
    "args0": [
      { "type": "field_input", "name": "TEXT", "text": "Hello" },
      { "type": "field_number", "name": "X", "value": 0 },
      { "type": "field_number", "name": "Y", "value": 0 },
      {
        "type": "field_colour",
        "name": "COLOR",
        "colour": "#000000"
      }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 160,
    "tooltip": "Display colored text on OLED",
    "helpUrl": ""
  }
  
  
]);
function showOnOLED(text, color) {
  console.log(`Displaying on OLED: ${text} in color ${color}`);
}

// Functions to interact with hardware components and generate code in different languages

// Pin I/O functions
function setPin(pin, value) {
console.log(`Pin ${pin} set to ${value}`);
}

function readPin(pin) {
console.log(`Reading value from pin ${pin}`);
return Math.random() > 0.5 ? 1 : 0; // Mock pin read value
}

// Motor control functions
function setMotor(motor, speed, direction) {
console.log(`Motor ${motor} set to speed ${speed} in direction ${direction}`);
}

function setServo(servo, angle) {
console.log(`Servo ${servo} set to angle ${angle}`);
}

// Sensor reading functions (mock)
function readLDR() {
return Math.random() * 1024; // Mock LDR sensor reading
}

function readIR() {
return Math.random() > 0.5; // Mock IR sensor reading
}

function readTemperature() {
return Math.random() * 100; // Mock temperature sensor reading
}

function readUltrasonic() {
return Math.random() * 100; // Mock ultrasonic sensor reading
}

function readTouch() {
return Math.random() > 0.5; // Mock touch sensor reading
}

function readColor() {
const colors = ['red', 'green', 'blue'];
return colors[Math.floor(Math.random() * colors.length)]; // Mock color sensor reading
}

// Joystick reading functions (mock)
function readJoystick1() {
return { V: Math.random() * 1024, H: Math.random() * 1024 };
}

function readJoystick2() {
return { V: Math.random() * 1024, H: Math.random() * 1024 };
}

// OLED display function (mock)
function showOnOLED(text, x, y, color) {
  console.log(`Displaying on OLED at (${x}, ${y}) with color ${color}: ${text}`);
}

*/
