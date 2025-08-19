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


// Language-specific generators are now defined in separate files

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
  // JavaScript generator moved to separate file
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
  // JavaScript generator moved to separate file
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
  // JavaScript generator moved to separate file
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
  // JavaScript generator moved to separate file
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
  // JavaScript generator moved to separate file
}

if (!Blockly.Blocks['bluetooth_available']) {
  Blockly.Blocks['bluetooth_available'] = { init: function(){ this.appendDummyInput().appendField('Bluetooth data available?'); this.setOutput(true,'Boolean'); this.setColour(290);} };
  // JavaScript generator moved to separate file
}

if (!Blockly.Blocks['bluetooth_read']) {
  Blockly.Blocks['bluetooth_read'] = { init: function(){ this.appendDummyInput().appendField('Bluetooth read string'); this.setOutput(true,'String'); this.setColour(290);} };
  // JavaScript generator moved to separate file
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
