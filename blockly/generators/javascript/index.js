// Ensure JavaScript generator namespace exists (fallback if CDN not loaded)
if (!Blockly.JavaScript) {
  // Create a minimal generator so workspaceToCode works offline
  Blockly.JavaScript = new Blockly.Generator('JavaScript');
}

// JavaScript code generation for Blockly blocks (supports new forBlock API)
if (!Blockly.JavaScript.forBlock) {
  Blockly.JavaScript.forBlock = Object.create(null);
}

Blockly.JavaScript.forBlock['set_pin'] = function(block, generator) {
  const pin = generator.valueToCode(block, 'PIN', generator.ORDER_ATOMIC) || '0';
  const value = generator.valueToCode(block, 'VALUE', generator.ORDER_ATOMIC) || '0';
  return `setPin(${pin}, ${value});\n`;
};
Blockly.JavaScript.forBlock['read_pin'] = function(block, generator) {
  const pin = generator.valueToCode(block, 'PIN', generator.ORDER_ATOMIC) || '0';
  return [
    `readPin(${pin})`,
    generator.ORDER_FUNCTION_CALL
  ];
};

// ========================================
// NEW JAVASCRIPT FORBLOCK GENERATORS FOR MISSING BLOCKS
// ========================================

// Pin mode configuration
Blockly.JavaScript.forBlock['pin_mode'] = function(block, generator) {
  var pin = block.getFieldValue('PIN');
  var mode = block.getFieldValue('MODE');
  return `setPinMode(${pin}, ${mode});\n`;
};

// Analog read
Blockly.JavaScript.forBlock['analog_read'] = function(block, generator) {
  var pin = block.getFieldValue('PIN');
  return [`readAnalogPin(${pin})`, Blockly.JavaScript.ORDER_FUNCTION_CALL];
};

// Analog write (PWM)
Blockly.JavaScript.forBlock['analog_write'] = function(block, generator) {
  var pin = block.getFieldValue('PIN');
  var value = block.getFieldValue('VALUE');
  return `writeAnalogPin(${pin}, ${value});\n`;
};

// Motor speed control
Blockly.JavaScript.forBlock['motor_speed'] = function(block, generator) {
  var motor = block.getFieldValue('MOTOR');
  var speed = block.getFieldValue('SPEED');
  return `setMotorSpeed("${motor}", ${speed});\n`;
};

// IR sensor analog read
Blockly.JavaScript.forBlock['ir_sensor_analog'] = function(block, generator) {
  return ['readIRAnalog()', Blockly.JavaScript.ORDER_FUNCTION_CALL];
};

// WiFi connect
Blockly.JavaScript.forBlock['wifi_connect'] = function(block, generator) {
  var ssid = block.getFieldValue('SSID');
  var password = block.getFieldValue('PASSWORD');
  return `wifiConnect("${ssid}", "${password}");\n`;
};

// WiFi send
Blockly.JavaScript.forBlock['wifi_send'] = function(block, generator) {
  var data = Blockly.JavaScript.valueToCode(block, 'DATA', Blockly.JavaScript.ORDER_ATOMIC) || '""';
  var ip = block.getFieldValue('IP');
  var port = block.getFieldValue('PORT');
  return `wifiSend(${data}, "${ip}", ${port});\n`;
};

// WiFi receive
Blockly.JavaScript.forBlock['wifi_receive'] = function(block, generator) {
  var port = block.getFieldValue('PORT');
  return [`wifiReceive(${port})`, Blockly.JavaScript.ORDER_FUNCTION_CALL];
};

// Enhanced OLED display variable
Blockly.JavaScript.forBlock['oled_display_variable'] = function(block, generator) {
  var variable = Blockly.JavaScript.valueToCode(block, 'VARIABLE', Blockly.JavaScript.ORDER_ATOMIC) || '0';
  var x = block.getFieldValue('X');
  var y = block.getFieldValue('Y');
  return `displayVariableOnOLED(${variable}, ${x}, ${y});\n`;
};

// Enhanced OLED display character
Blockly.JavaScript.forBlock['oled_display_char'] = function(block, generator) {
  var char = block.getFieldValue('CHAR');
  var x = block.getFieldValue('X');
  var y = block.getFieldValue('Y');
  return `displayCharOnOLED("${char}", ${x}, ${y});\n`;
};

// Enhanced OLED animation blink
Blockly.JavaScript.forBlock['oled_animation_blink'] = function(block, generator) {
  var text = Blockly.JavaScript.valueToCode(block, 'TEXT', Blockly.JavaScript.ORDER_ATOMIC) || '""';
  var times = block.getFieldValue('TIMES');
  var delay = block.getFieldValue('DELAY');
  return `blinkTextOnOLED(${text}, ${times}, ${delay});\n`;
};

// Enhanced OLED animation scroll
Blockly.JavaScript.forBlock['oled_animation_scroll'] = function(block, generator) {
  var text = Blockly.JavaScript.valueToCode(block, 'TEXT', Blockly.JavaScript.ORDER_ATOMIC) || '""';
  var direction = block.getFieldValue('DIRECTION');
  var speed = block.getFieldValue('SPEED');
  return `scrollTextOnOLED(${text}, "${direction}", ${speed});\n`;
};

// Back-compat: older style also defined
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

Blockly.JavaScript['ldr_sensor'] = function() { 
  return ['readLDR()', Blockly.JavaScript.ORDER_FUNCTION_CALL]; 
};

Blockly.JavaScript['ir_sensor'] = function() { 
  return ['readIR()', Blockly.JavaScript.ORDER_FUNCTION_CALL]; 
};

Blockly.JavaScript['temp_sensor'] = function() { 
  return ['readTemperature()', Blockly.JavaScript.ORDER_FUNCTION_CALL]; 
};

Blockly.JavaScript['ultrasonic_sensor'] = function() { 
  return ['readUltrasonic()', Blockly.JavaScript.ORDER_FUNCTION_CALL]; 
};

Blockly.JavaScript['touch_sensor'] = function() { 
  return ['readTouch()', Blockly.JavaScript.ORDER_FUNCTION_CALL]; 
};

Blockly.JavaScript['color_sensor'] = function() { 
  return ['readColor()', Blockly.JavaScript.ORDER_FUNCTION_CALL]; 
};

Blockly.JavaScript['joystick1'] = function() { 
  return ['readJoystick1()', Blockly.JavaScript.ORDER_FUNCTION_CALL]; 
};

Blockly.JavaScript['joystick2'] = function() { 
  return ['readJoystick2()', Blockly.JavaScript.ORDER_FUNCTION_CALL]; 
};

Blockly.JavaScript['oled_show'] = function(block) {
  var text = Blockly.JavaScript.valueToCode(block, 'TEXT', Blockly.JavaScript.ORDER_ATOMIC) || '""';
  return 'oledDisplay(' + text + ');\n';
};

Blockly.JavaScript['oled_show_color'] = function(block) {
  var text = Blockly.JavaScript.valueToCode(block, 'TEXT', Blockly.JavaScript.ORDER_ATOMIC) || '""';
  var color = block.getFieldValue('COLOR');
  return `showOnOLED(${text}, 0, 0, "${color}");\n`;
};

Blockly.JavaScript['oled_display_colored'] = function(block) {
  const text = Blockly.JavaScript.valueToCode(block, 'TEXT', Blockly.JavaScript.ORDER_ATOMIC) || '""';
  const x = Blockly.JavaScript.valueToCode(block, 'X', Blockly.JavaScript.ORDER_ATOMIC) || '0';
  const y = Blockly.JavaScript.valueToCode(block, 'Y', Blockly.JavaScript.ORDER_ATOMIC) || '0';
  const color = Blockly.JavaScript.valueToCode(block, 'COLOR', Blockly.JavaScript.ORDER_ATOMIC) || '"white"';
  return `showOnOLED(${text}, ${x}, ${y}, ${color});\n`;
};

// ========================================
// NEW JAVASCRIPT GENERATORS FOR MISSING BLOCKS
// ========================================

// Pin mode configuration
Blockly.JavaScript['pin_mode'] = function(block) {
  var pin = block.getFieldValue('PIN');
  var mode = block.getFieldValue('MODE');
  return `setPinMode(${pin}, ${mode});\n`;
};

Blockly.JavaScript['analog_read'] = function(block) {
  var pin = block.getFieldValue('PIN');
  return [`readAnalogPin(${pin})`, Blockly.JavaScript.ORDER_FUNCTION_CALL];
};

Blockly.JavaScript['analog_write'] = function(block) {
  var pin = block.getFieldValue('PIN');
  var value = block.getFieldValue('VALUE');
  return `writeAnalogPin(${pin}, ${value});\n`;
};

Blockly.JavaScript['motor_speed'] = function(block) {
  var motor = block.getFieldValue('MOTOR');
  var speed = block.getFieldValue('SPEED');
  return `setMotorSpeed("${motor}", ${speed});\n`;
};

Blockly.JavaScript['ir_sensor_analog'] = function(block) {
  return ['readIRAnalog()', Blockly.JavaScript.ORDER_FUNCTION_CALL];
};

Blockly.JavaScript['wifi_connect'] = function(block) {
  var ssid = block.getFieldValue('SSID');
  var password = block.getFieldValue('PASSWORD');
  return `wifiConnect("${ssid}", "${password}");\n`;
};

Blockly.JavaScript['wifi_send'] = function(block) {
  var data = Blockly.JavaScript.valueToCode(block, 'DATA', Blockly.JavaScript.ORDER_ATOMIC) || '""';
  var ip = block.getFieldValue('IP');
  var port = block.getFieldValue('PORT');
  return `wifiSend(${data}, "${ip}", ${port});\n`;
};

Blockly.JavaScript['wifi_receive'] = function(block) {
  var port = block.getFieldValue('PORT');
  return [`wifiReceive(${port})`, Blockly.JavaScript.ORDER_FUNCTION_CALL];
};

Blockly.JavaScript['oled_display_variable'] = function(block) {
  var variable = Blockly.JavaScript.valueToCode(block, 'VARIABLE', Blockly.JavaScript.ORDER_ATOMIC) || '0';
  var x = block.getFieldValue('X');
  var y = block.getFieldValue('Y');
  return `displayVariableOnOLED(${variable}, ${x}, ${y});\n`;
};

Blockly.JavaScript['oled_display_char'] = function(block) {
  var char = block.getFieldValue('CHAR');
  var x = block.getFieldValue('X');
  var y = block.getFieldValue('Y');
  return `displayCharOnOLED("${char}", ${x}, ${y});\n`;
};

Blockly.JavaScript['oled_animation_blink'] = function(block) {
  var text = Blockly.JavaScript.valueToCode(block, 'TEXT', Blockly.JavaScript.ORDER_ATOMIC) || '""';
  var times = block.getFieldValue('TIMES');
  var delay = block.getFieldValue('DELAY');
  return `blinkTextOnOLED(${text}, ${times}, ${delay});\n`;
};

Blockly.JavaScript['oled_animation_scroll'] = function(block) {
  var text = Blockly.JavaScript.valueToCode(block, 'TEXT', Blockly.JavaScript.ORDER_ATOMIC) || '""';
  var direction = block.getFieldValue('DIRECTION');
  var speed = block.getFieldValue('SPEED');
  return `scrollTextOnOLED(${text}, "${direction}", ${speed});\n`;
};

Blockly.JavaScript['time_delay'] = function(block) {
  var value = Blockly.JavaScript.valueToCode(block, 'TIME', Blockly.JavaScript.ORDER_ATOMIC) || '0';
  return 'delay(' + value + ');\n';
};

Blockly.JavaScript['enhanced_if'] = function(block) {
  const cond = Blockly.JavaScript.valueToCode(block, 'IF0', Blockly.JavaScript.ORDER_NONE) || 'false';
  const body = Blockly.JavaScript.statementToCode(block, 'DO0');
  return 'if (' + cond + ') {\n' + body + '}\n';
};

Blockly.JavaScript['enhanced_compare'] = function(block) {
  var OPERATORS = { 'EQ': '==', 'NEQ': '!=', 'LT': '<', 'LTE': '<=', 'GT': '>', 'GTE': '>=' };
  var operator = OPERATORS[block.getFieldValue('OP')];
  var order = (operator == '==' || operator == '!=') ? Blockly.JavaScript.ORDER_EQUALITY : Blockly.JavaScript.ORDER_RELATIONAL;
  var a = Blockly.JavaScript.valueToCode(block, 'A', order) || '0';
  var b = Blockly.JavaScript.valueToCode(block, 'B', order) || '0';
  return [a + ' ' + operator + ' ' + b, order];
};

Blockly.JavaScript['enhanced_logic'] = function(block) {
  var operator = (block.getFieldValue('OP') == 'AND') ? '&&' : '||';
  var order = (operator == '&&') ? Blockly.JavaScript.ORDER_LOGICAL_AND : Blockly.JavaScript.ORDER_LOGICAL_OR;
  var a = Blockly.JavaScript.valueToCode(block, 'A', order) || (operator == '&&' ? 'true' : 'false');
  var b = Blockly.JavaScript.valueToCode(block, 'B', order) || (operator == '&&' ? 'true' : 'false');
  return [a + ' ' + operator + ' ' + b, order];
};

Blockly.JavaScript['my_program'] = function(block) {
  const body = Blockly.JavaScript.statementToCode(block, 'PROGRAM');
  return '// My Program\n' + body;
};

Blockly.JavaScript['variables_declare'] = function(block) {
  const v = Blockly.JavaScript.nameDB_.getName(block.getFieldValue('VAR'), Blockly.Variables.NAME_TYPE);
  return 'var ' + v + ';\n';
};

Blockly.JavaScript['variables_define'] = function(block) {
  const v = Blockly.JavaScript.nameDB_.getName(block.getFieldValue('VAR'), Blockly.Variables.NAME_TYPE);
  const val = Blockly.JavaScript.valueToCode(block, 'VALUE', Blockly.JavaScript.ORDER_ASSIGNMENT) || '0';
  return 'var ' + v + ' = ' + val + ';\n';
};

Blockly.JavaScript['variables_get'] = function(block) {
  const v = Blockly.JavaScript.nameDB_.getName(block.getFieldValue('VAR'), Blockly.Variables.NAME_TYPE);
  return [v, Blockly.JavaScript.ORDER_ATOMIC];
};

Blockly.JavaScript['math_change'] = function(block) {
  const v = Blockly.JavaScript.nameDB_.getName(block.getFieldValue('VAR'), Blockly.Variables.NAME_TYPE);
  const delta = Blockly.JavaScript.valueToCode(block, 'DELTA', Blockly.JavaScript.ORDER_ADDITION) || '0';
  return v + ' += ' + delta + ';\n';
};

Blockly.JavaScript['bluetooth_setup'] = function(block) {
  var deviceName = block.getFieldValue('DEVICE_NAME');
  return `btSerial.begin("${deviceName}");\n`;
};

Blockly.JavaScript['bluetooth_send'] = function(block) {
  var data = Blockly.JavaScript.valueToCode(block, 'DATA', Blockly.JavaScript.ORDER_ATOMIC) || '""';
  return `btSerial.print(${data});\n`;
};

Blockly.JavaScript['bluetooth_available'] = function() { 
  return ['btSerial.available() > 0', Blockly.JavaScript.ORDER_ATOMIC]; 
};

Blockly.JavaScript['bluetooth_read'] = function() { 
  return ['btSerial.readString()', Blockly.JavaScript.ORDER_FUNCTION_CALL]; 
};

// Text blocks
Blockly.JavaScript['text'] = function(block) {
  const text = block.getFieldValue('TEXT');
  return ['"' + text + '"', Blockly.JavaScript.ORDER_ATOMIC];
};

Blockly.JavaScript['text_print'] = function(block) {
  const text = Blockly.JavaScript.valueToCode(block, 'TEXT', Blockly.JavaScript.ORDER_NONE) || '""';
  return 'console.log(' + text + ');\n';
};

// Diagnostic log to confirm generator is loaded and has handlers
try {
  const jsHandled = [
    'set_pin','read_pin','dc_motor','servo_motor','ldr_sensor','ir_sensor','temp_sensor',
    'ultrasonic_sensor','touch_sensor','color_sensor','joystick1','joystick2','oled_show','oled_show_color',
    'oled_display_colored','time_delay','enhanced_if','enhanced_compare','enhanced_logic',
    'controls_if','controls_repeat_ext','controls_whileUntil','math_number','math_arithmetic',
    'logic_compare','logic_operation','logic_negate','logic_boolean','variables_declare',
    'variables_define','variables_get','math_change','text','text_print'
  ].filter(k => typeof Blockly.JavaScript[k] === 'function');
  console.info('[Blockly] JavaScript generator loaded. Handlers:', jsHandled);
} catch (e) {
  console.warn('[Blockly] JavaScript generator diagnostics failed:', e);
}

// Ensure new forBlock API handlers exist for all block types by proxying
(function ensureForBlockProxies(){
  const types = [
    'set_pin','read_pin','dc_motor','servo_motor','ldr_sensor','ir_sensor','temp_sensor',
    'ultrasonic_sensor','touch_sensor','color_sensor','joystick1','joystick2','oled_show','oled_show_color',
    'oled_display_colored','time_delay','enhanced_if','enhanced_compare','enhanced_logic',
    'controls_if','controls_repeat_ext','controls_whileUntil','math_number','math_arithmetic',
    'logic_compare','logic_operation','logic_negate','logic_boolean','variables_declare',
    'variables_define','variables_get','math_change','text','text_print','bluetooth_setup',
    'bluetooth_send','bluetooth_available','bluetooth_read','my_program'
  ];
  types.forEach(t => {
    if (!Blockly.JavaScript.forBlock[t] && typeof Blockly.JavaScript[t] === 'function') {
      Blockly.JavaScript.forBlock[t] = function(block, generator){
        // Delegate to classic handler; generator param not used by classic API
        return Blockly.JavaScript[t](block);
      };
    }
  });
})();

// Control blocks
Blockly.JavaScript['controls_if'] = function(block) {
  const n = block.elseifCount_ + (block.elseCount_ ? 1 : 0);
  let code = '';
  for (let i = 0; i <= n; i++) {
    if (i === 0) {
      const cond = Blockly.JavaScript.valueToCode(block, 'IF' + i, Blockly.JavaScript.ORDER_NONE) || 'false';
      const branch = Blockly.JavaScript.statementToCode(block, 'DO' + i);
      code += 'if (' + cond + ') {\n' + branch + '}';
    } else if (i === n && block.elseCount_) {
      const branch = Blockly.JavaScript.statementToCode(block, 'ELSE');
      code += ' else {\n' + branch + '}';
    } else {
      const cond = Blockly.JavaScript.valueToCode(block, 'IF' + i, Blockly.JavaScript.ORDER_NONE) || 'false';
      const branch = Blockly.JavaScript.statementToCode(block, 'DO' + i);
      code += ' else if (' + cond + ') {\n' + branch + '}';
    }
  }
  return code + '\n';
};

Blockly.JavaScript['controls_repeat_ext'] = function(block) {
  const times = Blockly.JavaScript.valueToCode(block, 'TIMES', Blockly.JavaScript.ORDER_ASSIGNMENT) || '0';
  const branch = Blockly.JavaScript.statementToCode(block, 'DO');
  return 'for (let i = 0; i < ' + times + '; i++) {\n' + branch + '}\n';
};

Blockly.JavaScript['controls_whileUntil'] = function(block) {
  const mode = block.getFieldValue('MODE');
  const cond = Blockly.JavaScript.valueToCode(block, 'BOOL', Blockly.JavaScript.ORDER_NONE) || 'false';
  const branch = Blockly.JavaScript.statementToCode(block, 'DO');
  if (mode === 'WHILE') {
    return 'while (' + cond + ') {\n' + branch + '}\n';
  } else {
    return 'do {\n' + branch + '} while (' + cond + ');\n';
  }
};

// Math blocks
Blockly.JavaScript['math_number'] = function(block) {
  const number = block.getFieldValue('NUM');
  return [number, Blockly.JavaScript.ORDER_ATOMIC];
};

Blockly.JavaScript['math_arithmetic'] = function(block) {
  const OPERATORS = {
    'ADD': [' + ', Blockly.JavaScript.ORDER_ADDITION],
    'MINUS': [' - ', Blockly.JavaScript.ORDER_SUBTRACTION],
    'MULTIPLY': [' * ', Blockly.JavaScript.ORDER_MULTIPLICATION],
    'DIVIDE': [' / ', Blockly.JavaScript.ORDER_DIVISION],
    'POWER': [' ** ', Blockly.JavaScript.ORDER_EXPONENTIATION]
  };
  const tuple = OPERATORS[block.getFieldValue('OP')];
  const operator = tuple[0];
  const order = tuple[1];
  const left = Blockly.JavaScript.valueToCode(block, 'A', order) || '0';
  const right = Blockly.JavaScript.valueToCode(block, 'B', order) || '0';
  return [left + operator + right, order];
};

// Logic blocks
Blockly.JavaScript['logic_compare'] = function(block) {
  const OPERATORS = {
    'EQ': [' == ', Blockly.JavaScript.ORDER_EQUALITY],
    'NEQ': [' != ', Blockly.JavaScript.ORDER_EQUALITY],
    'LT': [' < ', Blockly.JavaScript.ORDER_RELATIONAL],
    'LTE': [' <= ', Blockly.JavaScript.ORDER_RELATIONAL],
    'GT': [' > ', Blockly.JavaScript.ORDER_RELATIONAL],
    'GTE': [' >= ', Blockly.JavaScript.ORDER_RELATIONAL]
  };
  const tuple = OPERATORS[block.getFieldValue('OP')];
  const operator = tuple[0];
  const order = tuple[1];
  const left = Blockly.JavaScript.valueToCode(block, 'A', order) || '0';
  const right = Blockly.JavaScript.valueToCode(block, 'B', order) || '0';
  return [left + operator + right, order];
};

Blockly.JavaScript['logic_operation'] = function(block) {
  const OPERATORS = {
    'AND': [' && ', Blockly.JavaScript.ORDER_LOGICAL_AND],
    'OR': [' || ', Blockly.JavaScript.ORDER_LOGICAL_OR]
  };
  const tuple = OPERATORS[block.getFieldValue('OP')];
  const operator = tuple[0];
  const order = tuple[1];
  const left = Blockly.JavaScript.valueToCode(block, 'A', order) || (operator === ' && ' ? 'true' : 'false');
  const right = Blockly.JavaScript.valueToCode(block, 'B', order) || (operator === ' && ' ? 'true' : 'false');
  return [left + operator + right, order];
};

Blockly.JavaScript['logic_negate'] = function(block) {
  const order = Blockly.JavaScript.ORDER_LOGICAL_NOT;
  const value = Blockly.JavaScript.valueToCode(block, 'BOOL', order) || 'true';
  return ['!' + value, order];
};

Blockly.JavaScript['logic_boolean'] = function(block) {
  const value = block.getFieldValue('BOOL');
  return [value, Blockly.JavaScript.ORDER_ATOMIC];
};
