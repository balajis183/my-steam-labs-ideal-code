// Define custom blocks using Blockly
// Define custom blocks using Blockly
Blockly.defineBlocksWithJsonArray([
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

// Hardware interaction functions (mock)
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
  console.log(`Displaying on OLED at (${x}, ${y}) with color ${color}: ${text}`);
}

// JavaScript code generation for Blockly blocks
Blockly.JavaScript['set_pin'] = function(block) {
  var pin = block.getFieldValue('PIN');
  var value = Blockly.JavaScript.valueToCode(block, 'VALUE', Blockly.JavaScript.ORDER_ATOMIC) || '0'; // default fallback
  var code = 'setPin(' + pin + ', ' + value + ');\n';
  return code;
};


Blockly.JavaScript['dc_motor'] = function(block) {
  var pin = block.getFieldValue('PIN');
  var speed = Blockly.JavaScript.valueToCode(block, 'SPEED', Blockly.JavaScript.ORDER_ATOMIC) || '0'; // Fallback to 0
  var code = 'motorControl(' + pin + ', ' + speed + ');\n';
  return code;
};



Blockly.JavaScript['ldr_sensor'] = function() {
  return ['readLDR()', Blockly.JavaScript.ORDER_NONE];
};

Blockly.JavaScript['ir_sensor'] = function() {
  return ['readIR()', Blockly.JavaScript.ORDER_NONE];
};

Blockly.JavaScript['temp_sensor'] = function() {
  return ['readTemperature()', Blockly.JavaScript.ORDER_NONE];
};

Blockly.JavaScript['ultrasonic_sensor'] = function() {
  return ['readUltrasonic()', Blockly.JavaScript.ORDER_NONE];
};

Blockly.JavaScript['touch_sensor'] = function() {
  return ['readTouch()', Blockly.JavaScript.ORDER_NONE];
};

Blockly.JavaScript['color_sensor'] = function() {
  return ['readColor()', Blockly.JavaScript.ORDER_NONE];
};

Blockly.JavaScript['joystick1'] = function() {
  return ['readJoystick1()', Blockly.JavaScript.ORDER_NONE];
};

Blockly.JavaScript['joystick2'] = function() {
  return ['readJoystick2()', Blockly.JavaScript.ORDER_NONE];
};

Blockly.JavaScript['oled_display_colored'] = function(block) {
  const text = Blockly.JavaScript.valueToCode(block, 'TEXT', Blockly.JavaScript.ORDER_ATOMIC) || '""';
  const x = Blockly.JavaScript.valueToCode(block, 'X', Blockly.JavaScript.ORDER_ATOMIC) || '0';
  const y = Blockly.JavaScript.valueToCode(block, 'Y', Blockly.JavaScript.ORDER_ATOMIC) || '0';
  const color = Blockly.JavaScript.valueToCode(block, 'COLOR', Blockly.JavaScript.ORDER_ATOMIC) || '"white"';
  return `showOnOLED(${text}, ${x}, ${y}, ${color});\n`;
};


// Code generation for Python, C++, and C
Blockly.Python['set_pin'] = Blockly.JavaScript['set_pin'];
Blockly.Python['read_pin'] = Blockly.JavaScript['read_pin'];
Blockly.Python['dc_motor'] = Blockly.JavaScript['dc_motor'];
Blockly.Python['servo_motor'] = Blockly.JavaScript['servo_motor'];
Blockly.Python['oled_display_colored'] = Blockly.JavaScript['oled_display_colored'];

Blockly.Cpp['set_pin'] = Blockly.JavaScript['set_pin'];
Blockly.Cpp['read_pin'] = Blockly.JavaScript['read_pin'];
Blockly.Cpp['dc_motor'] = Blockly.JavaScript['dc_motor'];
Blockly.Cpp['servo_motor'] = Blockly.JavaScript['servo_motor'];
Blockly.Cpp['oled_display_colored'] = Blockly.JavaScript['oled_display_colored'];

Blockly.C['set_pin'] = Blockly.JavaScript['set_pin'];
Blockly.C['read_pin'] = Blockly.JavaScript['read_pin'];
Blockly.C['dc_motor'] = Blockly.JavaScript['dc_motor'];
Blockly.C['servo_motor'] = Blockly.JavaScript['servo_motor'];
Blockly.C['oled_display_colored'] = Blockly.JavaScript['oled_display_colored'];






















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

// JavaScript generator for set_pin
Blockly.JavaScript['set_pin'] = function(block) {
  const pin = block.getFieldValue('PIN');
  const value = block.getFieldValue('VALUE');
  return `setPin(${pin}, ${value});\n`;
};

Blockly.JavaScript['read_pin'] = function(block) {
  const pin = block.getFieldValue('PIN');
  return [`readPin(${pin})`, Blockly.JavaScript.ORDER_ATOMIC];
};

Blockly.JavaScript['dc_motor'] = function(block) {
  const motor = block.getFieldValue('MOTOR');
  const speed = block.getFieldValue('SPEED');
  const direction = block.getFieldValue('DIRECTION');
  return `setMotor("${motor}", ${speed}, "${direction}");\n`;
};

Blockly.JavaScript['servo_motor'] = function(block) {
  const servo = block.getFieldValue('SERVO');
  const angle = block.getFieldValue('ANGLE');
  return `setServo(${servo}, ${angle});\n`;
};

Blockly.JavaScript['ldr_sensor'] = function() {
  return ['readLDR()', Blockly.JavaScript.ORDER_NONE];
};

Blockly.JavaScript['ir_sensor'] = function() {
  return ['readIR()', Blockly.JavaScript.ORDER_NONE];
};

Blockly.JavaScript['temp_sensor'] = function() {
  return ['readTemperature()', Blockly.JavaScript.ORDER_NONE];
};

Blockly.JavaScript['ultrasonic_sensor'] = function() {
  return ['readUltrasonic()', Blockly.JavaScript.ORDER_NONE];
};

Blockly.JavaScript['touch_sensor'] = function() {
  return ['readTouch()', Blockly.JavaScript.ORDER_NONE];
};

Blockly.JavaScript['color_sensor'] = function() {
  return ['readColor()', Blockly.JavaScript.ORDER_NONE];
};

Blockly.JavaScript['joystick1'] = function() {
  return ['readJoystick1()', Blockly.JavaScript.ORDER_NONE];
};

Blockly.JavaScript['joystick2'] = function() {
  return ['readJoystick2()', Blockly.JavaScript.ORDER_NONE];
};

Blockly.JavaScript['oled_display_colored'] = function(block) {
  const text = block.getFieldValue('TEXT');
  const x = block.getFieldValue('X');
  const y = block.getFieldValue('Y');
  const color = block.getFieldValue('COLOR');
  return `showOnOLED("${text}", ${x}, ${y}, "${color}");\n`;
};


// Code generation for different languages (Python, C++, C)
// Convert the Blockly block to Python code
Blockly.Python['oled_show'] = function(block) {
  const text = block.getFieldValue('TEXT');
  const color = block.getFieldValue('COLOR');
  return `showOnOLED("${text}", "${color}")\n`;
};

// C++ Code generation
Blockly.Cpp['oled_show'] = function(block) {
  const text = block.getFieldValue('TEXT');
  const color = block.getFieldValue('COLOR');
  return `showOnOLED("${text}", "${color}");\n`;
};

// C Code generation
Blockly.C['oled_show'] = function(block) {
  const text = block.getFieldValue('TEXT');
  const color = block.getFieldValue('COLOR');
  return `showOnOLED("${text}", "${color}");\n`;
};
// Convert the Blockly block to Python code
Blockly.Python['set_pin'] = function(block) {
const pin = block.getFieldValue('PIN');
const value = block.getFieldValue('VALUE');
return `setPin(${pin}, ${value})\n`;
};

Blockly.Python['read_pin'] = function(block) {
const pin = block.getFieldValue('PIN');
return `readPin(${pin})\n`;
};

// C++ Code generation
Blockly.Cpp['set_pin'] = function(block) {
const pin = block.getFieldValue('PIN');
const value = block.getFieldValue('VALUE');
return `setPin(${pin}, ${value});\n`;
};

Blockly.Cpp['read_pin'] = function(block) {
const pin = block.getFieldValue('PIN');
return `readPin(${pin});\n`;
};

// C Code generation
Blockly.C['set_pin'] = function(block) {
const pin = block.getFieldValue('PIN');
const value = block.getFieldValue('VALUE');
return `setPin(${pin}, ${value});\n`;
};

Blockly.C['read_pin'] = function(block) {
const pin = block.getFieldValue('PIN');
return `readPin(${pin});\n`;
};*/
