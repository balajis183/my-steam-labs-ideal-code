// Ensure C generator namespace exists (custom)
if (!Blockly.C) {
  Blockly.C = new Blockly.Generator('C');
}

// C code generation for Blockly blocks
if (!Blockly.C.forBlock) {
  Blockly.C.forBlock = Object.create(null);
}
Blockly.C.forBlock['set_pin'] = function(block, generator){
  const pin = generator.valueToCode(block, 'PIN', generator.ORDER_ATOMIC || 0) || '0';
  const value = generator.valueToCode(block, 'VALUE', generator.ORDER_ATOMIC || 0) || '0';
  return `digitalWrite(${pin}, ${value});\n`;
};
Blockly.C.forBlock['read_pin'] = function(block, generator){
  const pin = generator.valueToCode(block, 'PIN', generator.ORDER_ATOMIC || 0) || '0';
  return [`digitalRead(${pin})`, generator.ORDER_FUNCTION_CALL || 0];
};
Blockly.C['set_pin'] = function(block) {
  var pin = Blockly.C.valueToCode(block, 'PIN', Blockly.C.ORDER_ATOMIC) || '0';
  var value = Blockly.C.valueToCode(block, 'VALUE', Blockly.C.ORDER_ATOMIC) || '0';
  return 'digitalWrite(' + pin + ', ' + value + ');\n';
};

Blockly.C['read_pin'] = function(block) {
  var pin = Blockly.C.valueToCode(block, 'PIN', Blockly.C.ORDER_ATOMIC) || '0';
  return ['digitalRead(' + pin + ')', Blockly.C.ORDER_FUNCTION_CALL];
};

Blockly.C['dc_motor'] = function(block) {
  var motor = block.getFieldValue('MOTOR');
  var speed = Blockly.C.valueToCode(block, 'SPEED', Blockly.C.ORDER_ATOMIC) || '0';
  var direction = block.getFieldValue('DIRECTION');
  return 'setMotor("' + motor + '", ' + speed + ', "' + direction + '");\n';
};

Blockly.C['servo_motor'] = function(block) {
  var servo = block.getFieldValue('SERVO');
  var angle = Blockly.C.valueToCode(block, 'ANGLE', Blockly.C.ORDER_ATOMIC) || '0';
  return 'servoWrite(' + servo + ', ' + angle + ');\n';
};

Blockly.C['ldr_sensor'] = function() { 
  return ['analogRead(A0)', Blockly.C.ORDER_FUNCTION_CALL]; 
};

Blockly.C['ir_sensor'] = function() { 
  return ['digitalRead(2)', Blockly.C.ORDER_FUNCTION_CALL]; 
};

Blockly.C['temp_sensor'] = function() { 
  return ['readTemperature()', Blockly.C.ORDER_FUNCTION_CALL]; 
};

Blockly.C['ultrasonic_sensor'] = function() { 
  return ['readUltrasonic()', Blockly.C.ORDER_FUNCTION_CALL]; 
};

Blockly.C['touch_sensor'] = function() { 
  return ['digitalRead(4)', Blockly.C.ORDER_FUNCTION_CALL]; 
};

Blockly.C['color_sensor'] = function() { 
  return ['readColor()', Blockly.C.ORDER_FUNCTION_CALL]; 
};

Blockly.C['joystick1'] = function() { 
  return ['readJoystick1()', Blockly.C.ORDER_FUNCTION_CALL]; 
};

Blockly.C['joystick2'] = function() { 
  return ['readJoystick2()', Blockly.C.ORDER_FUNCTION_CALL]; 
};

Blockly.C['oled_show'] = function(block) {
  var text = Blockly.C.valueToCode(block, 'TEXT', Blockly.C.ORDER_ATOMIC) || '""';
  return 'oledDisplay(' + text + ');\n';
};

Blockly.C['oled_display_colored'] = function(block) {
  const text = Blockly.C.valueToCode(block, 'TEXT', Blockly.C.ORDER_ATOMIC) || '""';
  const x = Blockly.C.valueToCode(block, 'X', Blockly.C.ORDER_ATOMIC) || '0';
  const y = Blockly.C.valueToCode(block, 'Y', Blockly.C.ORDER_ATOMIC) || '0';
  const color = Blockly.C.valueToCode(block, 'COLOR', Blockly.C.ORDER_ATOMIC) || '"white"';
  return `showOnOLED(${text}, ${x}, ${y}, ${color});\n`;
};

Blockly.C['time_delay'] = function(block) {
  var value = Blockly.C.valueToCode(block, 'TIME', Blockly.C.ORDER_ATOMIC) || '0';
  return 'delay(' + value + ');\n';
};

Blockly.C['enhanced_if'] = function(block) {
  const cond = Blockly.C.valueToCode(block, 'IF0', Blockly.C.ORDER_NONE) || '0';
  const body = Blockly.C.statementToCode(block, 'DO0');
  return 'if (' + cond + ') {\n' + body + '}\n';
};

Blockly.C['enhanced_compare'] = function(block) {
  var OPERATORS = { 'EQ': '==', 'NEQ': '!=', 'LT': '<', 'LTE': '<=', 'GT': '>', 'GTE': '>=' };
  var operator = OPERATORS[block.getFieldValue('OP')];
  var order = (operator == '==' || operator == '!=') ? Blockly.C.ORDER_EQUALITY : Blockly.C.ORDER_RELATIONAL;
  var a = Blockly.C.valueToCode(block, 'A', order) || '0';
  var b = Blockly.C.valueToCode(block, 'B', order) || '0';
  return [a + ' ' + operator + ' ' + b, order];
};

Blockly.C['enhanced_logic'] = function(block) {
  var operator = (block.getFieldValue('OP') == 'AND') ? '&&' : '||';
  var order = (operator == '&&') ? Blockly.C.ORDER_LOGICAL_AND : Blockly.C.ORDER_LOGICAL_OR;
  var a = Blockly.C.valueToCode(block, 'A', order) || (operator == '&&' ? '1' : '0');
  var b = Blockly.C.valueToCode(block, 'B', order) || (operator == '&&' ? '1' : '0');
  return [a + ' ' + operator + ' ' + b, order];
};

Blockly.C['my_program'] = function(block) {
  const body = Blockly.C.statementToCode(block, 'PROGRAM');
  return '// My Program\n' + body;
};

Blockly.C['variables_declare'] = function(block) {
  const v = Blockly.C.nameDB_.getName(block.getFieldValue('VAR'), Blockly.Variables.NAME_TYPE);
  return 'int ' + v + ';\n';
};

Blockly.C['variables_define'] = function(block) {
  const v = Blockly.C.nameDB_.getName(block.getFieldValue('VAR'), Blockly.C.NAME_TYPE);
  const val = Blockly.C.valueToCode(block, 'VALUE', Blockly.C.ORDER_ASSIGNMENT) || '0';
  return 'int ' + v + ' = ' + val + ';\n';
};

Blockly.C['variables_declare'] = function(block) {
  const v = Blockly.C.nameDB_.getName(block.getFieldValue('VAR'), Blockly.C.NAME_TYPE);
  return 'int ' + v + ';\n';
};

Blockly.C['variables_get'] = function(block) {
  const v = Blockly.C.nameDB_.getName(block.getFieldValue('VAR'), Blockly.C.NAME_TYPE);
  return [v, Blockly.C.ORDER_ATOMIC];
};

Blockly.C['math_change'] = function(block) {
  const v = Blockly.C.nameDB_.getName(block.getFieldValue('VAR'), Blockly.C.NAME_TYPE);
  const delta = Blockly.C.valueToCode(block, 'DELTA', Blockly.C.ORDER_ADDITION) || '0';
  return v + ' += ' + delta + ';\n';
};

Blockly.C['bluetooth_setup'] = function(block) {
  var deviceName = block.getFieldValue('DEVICE_NAME');
  return `bluetoothSetup("${deviceName}");\n`;
};

Blockly.C['bluetooth_send'] = function(block) {
  var data = Blockly.C.valueToCode(block, 'DATA', Blockly.C.ORDER_ATOMIC) || '""';
  return `bluetoothSend(${data});\n`;
};

Blockly.C['bluetooth_available'] = function() { 
  return ['bluetoothAvailable()', Blockly.C.ORDER_FUNCTION_CALL]; 
};

Blockly.C['bluetooth_read'] = function() { 
  return ['bluetoothRead()', Blockly.C.ORDER_FUNCTION_CALL]; 
};

// Ensure forBlock proxies for C as well
(function ensureCForBlockProxies(){
  const api = Blockly.C;
  if (!api.forBlock) api.forBlock = Object.create(null);
  const types = [
    'set_pin','read_pin','dc_motor','servo_motor','ldr_sensor','ir_sensor','temp_sensor',
    'ultrasonic_sensor','touch_sensor','color_sensor','joystick1','joystick2','oled_show',
    'oled_display_colored','time_delay','enhanced_if','enhanced_compare','enhanced_logic',
    'controls_if','controls_repeat_ext','controls_whileUntil','math_number','math_arithmetic',
    'logic_compare','logic_operation','logic_negate','logic_boolean','variables_declare',
    'variables_define','variables_get','math_change','text','text_print','bluetooth_setup',
    'bluetooth_send','bluetooth_available','bluetooth_read','my_program'
  ];
  types.forEach(t => {
    if (!api.forBlock[t] && typeof api[t] === 'function') {
      api.forBlock[t] = function(block, generator){
        return api[t](block);
      };
    }
  });
})();

// Text blocks
Blockly.C['text'] = function(block) {
  const text = block.getFieldValue('TEXT');
  return ['"' + text + '"', Blockly.C.ORDER_ATOMIC];
};

Blockly.C['text_print'] = function(block) {
  const text = Blockly.C.valueToCode(block, 'TEXT', Blockly.C.ORDER_NONE) || '""';
  return 'printf(' + text + ');\n';
};

// Control blocks
Blockly.C['controls_if'] = function(block) {
  const n = block.elseifCount_ + (block.elseCount_ ? 1 : 0);
  let code = '';
  for (let i = 0; i <= n; i++) {
    if (i === 0) {
      const cond = Blockly.C.valueToCode(block, 'IF' + i, Blockly.C.ORDER_NONE) || '0';
      const branch = Blockly.C.statementToCode(block, 'DO' + i);
      code += 'if (' + cond + ') {\n' + branch + '}';
    } else if (i === n && block.elseCount_) {
      const branch = Blockly.C.statementToCode(block, 'ELSE');
      code += ' else {\n' + branch + '}';
    } else {
      const cond = Blockly.C.valueToCode(block, 'IF' + i, Blockly.C.ORDER_NONE) || '0';
      const branch = Blockly.C.statementToCode(block, 'DO' + i);
      code += ' else if (' + cond + ') {\n' + branch + '}';
    }
  }
  return code + '\n';
};

Blockly.C['controls_repeat_ext'] = function(block) {
  const times = Blockly.C.valueToCode(block, 'TIMES', Blockly.C.ORDER_ASSIGNMENT) || '0';
  const branch = Blockly.C.statementToCode(block, 'DO');
  return 'for (int i = 0; i < ' + times + '; i++) {\n' + branch + '}\n';
};

Blockly.C['controls_whileUntil'] = function(block) {
  const mode = block.getFieldValue('MODE');
  const cond = Blockly.C.valueToCode(block, 'BOOL', Blockly.C.ORDER_NONE) || '0';
  const branch = Blockly.C.statementToCode(block, 'DO');
  if (mode === 'WHILE') {
    return 'while (' + cond + ') {\n' + branch + '}\n';
  } else {
    return 'do {\n' + branch + '} while (' + cond + ');\n';
  }
};

// Math blocks
Blockly.C['math_number'] = function(block) {
  const number = block.getFieldValue('NUM');
  return [number, Blockly.C.ORDER_ATOMIC];
};

Blockly.C['math_arithmetic'] = function(block) {
  const OPERATORS = {
    'ADD': [' + ', Blockly.C.ORDER_ADDITION],
    'MINUS': [' - ', Blockly.C.ORDER_SUBTRACTION],
    'MULTIPLY': [' * ', Blockly.C.ORDER_MULTIPLICATION],
    'DIVIDE': [' / ', Blockly.C.ORDER_DIVISION],
    'POWER': [' pow(', Blockly.C.ORDER_FUNCTION_CALL]
  };
  const tuple = OPERATORS[block.getFieldValue('OP')];
  const operator = tuple[0];
  const order = tuple[1];
  const left = Blockly.C.valueToCode(block, 'A', order) || '0';
  const right = Blockly.C.valueToCode(block, 'B', order) || '0';
  if (operator === ' pow(') {
    return [operator + left + ', ' + right + ')', order];
  }
  return [left + operator + right, order];
};

// Logic blocks
Blockly.C['logic_compare'] = function(block) {
  const OPERATORS = {
    'EQ': [' == ', Blockly.C.ORDER_EQUALITY],
    'NEQ': [' != ', Blockly.C.ORDER_EQUALITY],
    'LT': [' < ', Blockly.C.ORDER_RELATIONAL],
    'LTE': [' <= ', Blockly.C.ORDER_RELATIONAL],
    'GT': [' > ', Blockly.C.ORDER_RELATIONAL],
    'GTE': [' >= ', Blockly.C.ORDER_RELATIONAL]
  };
  const tuple = OPERATORS[block.getFieldValue('OP')];
  const operator = tuple[0];
  const order = tuple[1];
  const left = Blockly.C.valueToCode(block, 'A', order) || '0';
  const right = Blockly.C.valueToCode(block, 'B', order) || '0';
  return [left + operator + right, order];
};

Blockly.C['logic_operation'] = function(block) {
  const OPERATORS = {
    'AND': [' && ', Blockly.C.ORDER_LOGICAL_AND],
    'OR': [' || ', Blockly.C.ORDER_LOGICAL_OR]
  };
  const tuple = OPERATORS[block.getFieldValue('OP')];
  const operator = tuple[0];
  const order = tuple[1];
  const left = Blockly.C.valueToCode(block, 'A', order) || (operator === ' && ' ? '1' : '0');
  const right = Blockly.C.valueToCode(block, 'B', order) || (operator === ' && ' ? '1' : '0');
  return [left + operator + right, order];
};

Blockly.C['logic_negate'] = function(block) {
  const order = Blockly.C.ORDER_LOGICAL_NOT;
  const value = Blockly.C.valueToCode(block, 'BOOL', order) || '1';
  return ['!' + value, order];
};

Blockly.C['logic_boolean'] = function(block) {
  const value = block.getFieldValue('BOOL');
  return [value, Blockly.C.ORDER_ATOMIC];
};

