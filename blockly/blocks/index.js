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

// JavaScript code generation for Blockly blocks (consistent with inputs)
Blockly.JavaScript['set_pin'] = function(block) {
  var pin = Blockly.JavaScript.valueToCode(block, 'PIN', Blockly.JavaScript.ORDER_ATOMIC) || '0';
  var value = Blockly.JavaScript.valueToCode(block, 'VALUE', Blockly.JavaScript.ORDER_ATOMIC) || '0';
  return 'setPin(' + pin + ', ' + value + ');\n';
};

Blockly.JavaScript['read_pin'] = function(block) {
  var pin = Blockly.JavaScript.valueToCode(block, 'PIN', Blockly.JavaScript.ORDER_ATOMIC) || '0';
  return ['readPin(' + pin + ')', Blockly.JavaScript.ORDER_FUNCTION_CALL];
};

Blockly.JavaScript['dc_motor'] = function(block) {
  var motor = block.getFieldValue('MOTOR');
  var speed = Blockly.JavaScript.valueToCode(block, 'SPEED', Blockly.JavaScript.ORDER_ATOMIC) || '0';
  var direction = block.getFieldValue('DIRECTION');
  return 'setMotor("' + motor + '", ' + speed + ', "' + direction + '");\n';
};

Blockly.JavaScript['servo_motor'] = function(block) {
  var servo = block.getFieldValue('SERVO');
  var angle = Blockly.JavaScript.valueToCode(block, 'ANGLE', Blockly.JavaScript.ORDER_ATOMIC) || '0';
  return 'setServo(' + servo + ', ' + angle + ');\n';
};

Blockly.JavaScript['ldr_sensor'] = function() { return ['readLDR()', Blockly.JavaScript.ORDER_FUNCTION_CALL]; };
Blockly.JavaScript['ir_sensor'] = function() { return ['readIR()', Blockly.JavaScript.ORDER_FUNCTION_CALL]; };
Blockly.JavaScript['temp_sensor'] = function() { return ['readTemperature()', Blockly.JavaScript.ORDER_FUNCTION_CALL]; };
Blockly.JavaScript['ultrasonic_sensor'] = function() { return ['readUltrasonic()', Blockly.JavaScript.ORDER_FUNCTION_CALL]; };
Blockly.JavaScript['touch_sensor'] = function() { return ['readTouch()', Blockly.JavaScript.ORDER_FUNCTION_CALL]; };
Blockly.JavaScript['color_sensor'] = function() { return ['readColor()', Blockly.JavaScript.ORDER_FUNCTION_CALL]; };
Blockly.JavaScript['joystick1'] = function() { return ['readJoystick1()', Blockly.JavaScript.ORDER_FUNCTION_CALL]; };
Blockly.JavaScript['joystick2'] = function() { return ['readJoystick2()', Blockly.JavaScript.ORDER_FUNCTION_CALL]; };

Blockly.JavaScript['oled_display_colored'] = function(block) {
  const text = Blockly.JavaScript.valueToCode(block, 'TEXT', Blockly.JavaScript.ORDER_ATOMIC) || '""';
  const x = Blockly.JavaScript.valueToCode(block, 'X', Blockly.JavaScript.ORDER_ATOMIC) || '0';
  const y = Blockly.JavaScript.valueToCode(block, 'Y', Blockly.JavaScript.ORDER_ATOMIC) || '0';
  const color = Blockly.JavaScript.valueToCode(block, 'COLOR', Blockly.JavaScript.ORDER_ATOMIC) || '"white"';
  return `showOnOLED(${text}, ${x}, ${y}, ${color});\n`;
};

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
Blockly.JavaScript['time_delay'] = function(block) {
  var value = Blockly.JavaScript.valueToCode(block, 'TIME', Blockly.JavaScript.ORDER_ATOMIC) || '0';
  return 'delay(' + value + ');\n';
};

Blockly.Blocks['enhanced_if'] = {
  init: function() {
    this.appendValueInput('IF0').setCheck('Boolean').appendField('if');
    this.appendStatementInput('DO0').setCheck(null).appendField('do');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(210);
  }
};
Blockly.JavaScript['enhanced_if'] = function(block) {
  const cond = Blockly.JavaScript.valueToCode(block, 'IF0', Blockly.JavaScript.ORDER_NONE) || 'false';
  const body = Blockly.JavaScript.statementToCode(block, 'DO0');
  return 'if (' + cond + ') {\n' + body + '}\n';
};

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
Blockly.JavaScript['enhanced_compare'] = function(block) {
  var OPERATORS = { 'EQ': '==', 'NEQ': '!=', 'LT': '<', 'LTE': '<=', 'GT': '>', 'GTE': '>=' };
  var operator = OPERATORS[block.getFieldValue('OP')];
  var order = (operator == '==' || operator == '!=') ? Blockly.JavaScript.ORDER_EQUALITY : Blockly.JavaScript.ORDER_RELATIONAL;
  var a = Blockly.JavaScript.valueToCode(block, 'A', order) || '0';
  var b = Blockly.JavaScript.valueToCode(block, 'B', order) || '0';
  return [a + ' ' + operator + ' ' + b, order];
};

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
Blockly.JavaScript['enhanced_logic'] = function(block) {
  var operator = (block.getFieldValue('OP') == 'AND') ? '&&' : '||';
  var order = (operator == '&&') ? Blockly.JavaScript.ORDER_LOGICAL_AND : Blockly.JavaScript.ORDER_LOGICAL_OR;
  var a = Blockly.JavaScript.valueToCode(block, 'A', order) || (operator == '&&' ? 'true' : 'false');
  var b = Blockly.JavaScript.valueToCode(block, 'B', order) || (operator == '&&' ? 'true' : 'false');
  return [a + ' ' + operator + ' ' + b, order];
};

// Simple OLED show block used by toolbox
Blockly.Blocks['oled_show'] = {
  init: function() {
    this.appendValueInput('TEXT').setCheck('String').appendField('OLED display');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(330);
  }
};
Blockly.JavaScript['oled_show'] = function(block) {
  var text = Blockly.JavaScript.valueToCode(block, 'TEXT', Blockly.JavaScript.ORDER_ATOMIC) || '""';
  return 'oledDisplay(' + text + ');\n';
};


// Guarded mappings for other languages (if present)
if (Blockly.Python) {
  Blockly.Python['set_pin'] = function(block){ return Blockly.JavaScript['set_pin'](block); };
  Blockly.Python['read_pin'] = function(block){ return Blockly.JavaScript['read_pin'](block); };
  Blockly.Python['dc_motor'] = function(block){ return Blockly.JavaScript['dc_motor'](block); };
  Blockly.Python['servo_motor'] = function(block){ return Blockly.JavaScript['servo_motor'](block); };
  Blockly.Python['oled_display_colored'] = function(block){ return Blockly.JavaScript['oled_display_colored'](block); };
}
if (Blockly.Cpp) {
  Blockly.Cpp['set_pin'] = function(block){ return Blockly.JavaScript['set_pin'](block); };
  Blockly.Cpp['read_pin'] = function(block){ return Blockly.JavaScript['read_pin'](block); };
  Blockly.Cpp['dc_motor'] = function(block){ return Blockly.JavaScript['dc_motor'](block); };
  Blockly.Cpp['servo_motor'] = function(block){ return Blockly.JavaScript['servo_motor'](block); };
  Blockly.Cpp['oled_display_colored'] = function(block){ return Blockly.JavaScript['oled_display_colored'](block); };
}
if (Blockly.C) {
  Blockly.C['set_pin'] = function(block){ return Blockly.JavaScript['set_pin'](block); };
  Blockly.C['read_pin'] = function(block){ return Blockly.JavaScript['read_pin'](block); };
  Blockly.C['dc_motor'] = function(block){ return Blockly.JavaScript['dc_motor'](block); };
  Blockly.C['servo_motor'] = function(block){ return Blockly.JavaScript['servo_motor'](block); };
  Blockly.C['oled_display_colored'] = function(block){ return Blockly.JavaScript['oled_display_colored'](block); };
}

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
  Blockly.JavaScript['my_program'] = function(block) {
    const body = Blockly.JavaScript.statementToCode(block, 'PROGRAM');
    return '// My Program\n' + body;
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
  Blockly.JavaScript['variables_declare'] = function(block) {
    const v = Blockly.JavaScript.nameDB_.getName(block.getFieldValue('VAR'), Blockly.Variables.NAME_TYPE);
    return 'var ' + v + ';\n';
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
  Blockly.JavaScript['variables_define'] = function(block) {
    const v = Blockly.JavaScript.nameDB_.getName(block.getFieldValue('VAR'), Blockly.Variables.NAME_TYPE);
    const val = Blockly.JavaScript.valueToCode(block, 'VALUE', Blockly.JavaScript.ORDER_ASSIGNMENT) || '0';
    return 'var ' + v + ' = ' + val + ';\n';
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
  Blockly.JavaScript['bluetooth_setup'] = function(block) {
    var deviceName = block.getFieldValue('DEVICE_NAME');
    return `btSerial.begin("${deviceName}");\n`;
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
  Blockly.JavaScript['bluetooth_send'] = function(block) {
    var data = Blockly.JavaScript.valueToCode(block, 'DATA', Blockly.JavaScript.ORDER_ATOMIC) || '""';
    return `btSerial.print(${data});\n`;
  };
}

if (!Blockly.Blocks['bluetooth_available']) {
  Blockly.Blocks['bluetooth_available'] = { init: function(){ this.appendDummyInput().appendField('Bluetooth data available?'); this.setOutput(true,'Boolean'); this.setColour(290);} };
  Blockly.JavaScript['bluetooth_available'] = function(){ return ['btSerial.available() > 0', Blockly.JavaScript.ORDER_ATOMIC]; };
}

if (!Blockly.Blocks['bluetooth_read']) {
  Blockly.Blocks['bluetooth_read'] = { init: function(){ this.appendDummyInput().appendField('Bluetooth read string'); this.setOutput(true,'String'); this.setColour(290);} };
  Blockly.JavaScript['bluetooth_read'] = function(){ return ['btSerial.readString()', Blockly.JavaScript.ORDER_FUNCTION_CALL]; };
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
