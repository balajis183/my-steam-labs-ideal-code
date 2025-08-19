// Ensure Python generator namespace exists (fallback if CDN not loaded)
if (!Blockly.Python) {
  Blockly.Python = new Blockly.Generator('Python');
}

// Python code generation for Blockly blocks
if (!Blockly.Python.forBlock) {
  Blockly.Python.forBlock = Object.create(null);
}

Blockly.Python.forBlock['set_pin'] = function(block, generator){
  const pin = generator.valueToCode(block, 'PIN', generator.ORDER_ATOMIC || 0) || '0';
  const value = generator.valueToCode(block, 'VALUE', generator.ORDER_ATOMIC || 0) || '0';
  return `set_pin(${pin}, ${value})\n`;
};
Blockly.Python.forBlock['read_pin'] = function(block, generator){
  const pin = generator.valueToCode(block, 'PIN', generator.ORDER_ATOMIC || 0) || '0';
  return [`read_pin(${pin})`, generator.ORDER_FUNCTION_CALL || 0];
};

Blockly.Python['set_pin'] = function(block) {
  var pin = Blockly.Python.valueToCode(block, 'PIN', Blockly.Python.ORDER_ATOMIC || 0) || '0';
  var value = Blockly.Python.valueToCode(block, 'VALUE', Blockly.Python.ORDER_ATOMIC || 0) || '0';
  return 'set_pin(' + pin + ', ' + value + ')\n';
};

Blockly.Python['read_pin'] = function(block) {
  var pin = Blockly.Python.valueToCode(block, 'PIN', Blockly.Python.ORDER_ATOMIC || 0) || '0';
  return ['read_pin(' + pin + ')', Blockly.Python.ORDER_FUNCTION_CALL || 0];
};

Blockly.Python['dc_motor'] = function(block) {
  var motor = block.getFieldValue('MOTOR');
  var speed = Blockly.Python.valueToCode(block, 'SPEED', Blockly.Python.ORDER_ATOMIC) || '0';
  var direction = block.getFieldValue('DIRECTION');
  return 'set_motor("' + motor + '", ' + speed + ', "' + direction + '")\n';
};

Blockly.Python['servo_motor'] = function(block) {
  var servo = block.getFieldValue('SERVO');
  var angle = Blockly.Python.valueToCode(block, 'ANGLE', Blockly.Python.ORDER_ATOMIC) || '0';
  return 'set_servo(' + servo + ', ' + angle + ')\n';
};

Blockly.Python['ldr_sensor'] = function() { 
  return ['read_ldr()', Blockly.Python.ORDER_FUNCTION_CALL]; 
};

Blockly.Python['ir_sensor'] = function() { 
  return ['read_ir()', Blockly.Python.ORDER_FUNCTION_CALL]; 
};

Blockly.Python['temp_sensor'] = function() { 
  return ['read_temperature()', Blockly.Python.ORDER_FUNCTION_CALL]; 
};

Blockly.Python['ultrasonic_sensor'] = function() { 
  return ['read_ultrasonic()', Blockly.Python.ORDER_FUNCTION_CALL]; 
};

Blockly.Python['touch_sensor'] = function() { 
  return ['read_touch()', Blockly.Python.ORDER_FUNCTION_CALL]; 
};

Blockly.Python['color_sensor'] = function() { 
  return ['read_color()', Blockly.Python.ORDER_FUNCTION_CALL]; 
};

Blockly.Python['joystick1'] = function() { 
  return ['read_joystick1()', Blockly.Python.ORDER_FUNCTION_CALL]; 
};

Blockly.Python['joystick2'] = function() { 
  return ['read_joystick2()', Blockly.Python.ORDER_FUNCTION_CALL]; 
};

Blockly.Python['oled_show'] = function(block) {
  var text = Blockly.Python.valueToCode(block, 'TEXT', Blockly.Python.ORDER_ATOMIC) || '""';
  return 'oled_display(' + text + ')\n';
};

Blockly.Python['oled_display_colored'] = function(block) {
  const text = Blockly.Python.valueToCode(block, 'TEXT', Blockly.Python.ORDER_ATOMIC) || '""';
  const x = Blockly.Python.valueToCode(block, 'X', Blockly.Python.ORDER_ATOMIC) || '0';
  const y = Blockly.Python.valueToCode(block, 'Y', Blockly.Python.ORDER_ATOMIC) || '0';
  const color = Blockly.Python.valueToCode(block, 'COLOR', Blockly.Python.ORDER_ATOMIC) || '"white"';
  return `show_on_oled(${text}, ${x}, ${y}, ${color})\n`;
};

Blockly.Python['time_delay'] = function(block) {
  var value = Blockly.Python.valueToCode(block, 'TIME', Blockly.Python.ORDER_ATOMIC) || '0';
  return 'time.sleep(' + value + ' / 1000)\n';
};

Blockly.Python['enhanced_if'] = function(block) {
  const cond = Blockly.Python.valueToCode(block, 'IF0', Blockly.Python.ORDER_NONE) || 'False';
  const body = Blockly.Python.statementToCode(block, 'DO0');
  return 'if ' + cond + ':\n' + body;
};

Blockly.Python['enhanced_compare'] = function(block) {
  var OPERATORS = { 'EQ': '==', 'NEQ': '!=', 'LT': '<', 'LTE': '<=', 'GT': '>', 'GTE': '>=' };
  var operator = OPERATORS[block.getFieldValue('OP')];
  var order = (operator == '==' || operator == '!=') ? Blockly.Python.ORDER_EQUALITY : Blockly.Python.ORDER_RELATIONAL;
  var a = Blockly.Python.valueToCode(block, 'A', order) || '0';
  var b = Blockly.Python.valueToCode(block, 'B', order) || '0';
  return [a + ' ' + operator + ' ' + b, order];
};

Blockly.Python['enhanced_logic'] = function(block) {
  var operator = (block.getFieldValue('OP') == 'AND') ? 'and' : 'or';
  var order = (operator == 'and') ? Blockly.Python.ORDER_LOGICAL_AND : Blockly.Python.ORDER_LOGICAL_OR;
  var a = Blockly.Python.valueToCode(block, 'A', order) || (operator == 'and' ? 'True' : 'False');
  var b = Blockly.Python.valueToCode(block, 'B', order) || (operator == 'and' ? 'True' : 'False');
  return [a + ' ' + operator + ' ' + b, order];
};

Blockly.Python['my_program'] = function(block) {
  const body = Blockly.Python.statementToCode(block, 'PROGRAM');
  return '# My Program\n' + body;
};

Blockly.Python['variables_declare'] = function(block) {
  const v = Blockly.Python.nameDB_.getName(block.getFieldValue('VAR'), Blockly.Python.NAME_TYPE);
  return v + ' = None\n';
};

Blockly.Python['variables_define'] = function(block) {
  const v = Blockly.Python.nameDB_.getName(block.getFieldValue('VAR'), Blockly.Python.NAME_TYPE);
  const val = Blockly.Python.valueToCode(block, 'VALUE', Blockly.Python.ORDER_ASSIGNMENT) || '0';
  return v + ' = ' + val + '\n';
};

Blockly.Python['variables_get'] = function(block) {
  const v = Blockly.Python.nameDB_.getName(block.getFieldValue('VAR'), Blockly.Python.NAME_TYPE);
  return [v, Blockly.Python.ORDER_ATOMIC];
};

Blockly.Python['math_change'] = function(block) {
  const v = Blockly.Python.nameDB_.getName(block.getFieldValue('VAR'), Blockly.Python.NAME_TYPE);
  const delta = Blockly.Python.valueToCode(block, 'DELTA', Blockly.Python.ORDER_ADDITION) || '0';
  return v + ' += ' + delta + '\n';
};

Blockly.Python['bluetooth_setup'] = function(block) {
  var deviceName = block.getFieldValue('DEVICE_NAME');
  return `bluetooth_setup("${deviceName}")\n`;
};

Blockly.Python['bluetooth_send'] = function(block) {
  var data = Blockly.Python.valueToCode(block, 'DATA', Blockly.Python.ORDER_ATOMIC) || '""';
  return `bluetooth_send(${data})\n`;
};

Blockly.Python['bluetooth_available'] = function() { 
  return ['bluetooth_available()', Blockly.Python.ORDER_FUNCTION_CALL]; 
};

Blockly.Python['bluetooth_read'] = function() { 
  return ['bluetooth_read()', Blockly.Python.ORDER_FUNCTION_CALL]; 
};

// Text blocks
Blockly.Python['text'] = function(block) {
  const text = block.getFieldValue('TEXT');
  return ['"' + text + '"', Blockly.Python.ORDER_ATOMIC];
};

Blockly.Python['text_print'] = function(block) {
  const text = Blockly.Python.valueToCode(block, 'TEXT', Blockly.Python.ORDER_NONE) || '""';
  return 'print(' + text + ')\n';
};

// Ensure forBlock proxies for Python too, so toolbox blocks route correctly
(function ensurePyForBlockProxies(){
  const api = Blockly.Python;
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

// Control blocks
Blockly.Python['controls_if'] = function(block) {
  const n = block.elseifCount_ + (block.elseCount_ ? 1 : 0);
  let code = '';
  for (let i = 0; i <= n; i++) {
    if (i === 0) {
      const cond = Blockly.Python.valueToCode(block, 'IF' + i, Blockly.Python.ORDER_NONE) || 'False';
      const branch = Blockly.Python.statementToCode(block, 'DO' + i);
      code += 'if ' + cond + ':\n' + branch;
    } else if (i === n && block.elseCount_) {
      const branch = Blockly.Python.statementToCode(block, 'ELSE');
      code += 'else:\n' + branch;
    } else {
      const cond = Blockly.Python.valueToCode(block, 'IF' + i, Blockly.Python.ORDER_NONE) || 'False';
      const branch = Blockly.Python.statementToCode(block, 'DO' + i);
      code += 'elif ' + cond + ':\n' + branch;
    }
  }
  return code + '\n';
};

Blockly.Python['controls_repeat_ext'] = function(block) {
  const times = Blockly.Python.valueToCode(block, 'TIMES', Blockly.Python.ORDER_ASSIGNMENT) || '0';
  const branch = Blockly.Python.statementToCode(block, 'DO');
  return 'for i in range(' + times + '):\n' + branch + '\n';
};

Blockly.Python['controls_whileUntil'] = function(block) {
  const mode = block.getFieldValue('MODE');
  const cond = Blockly.Python.valueToCode(block, 'BOOL', Blockly.Python.ORDER_NONE) || 'False';
  const branch = Blockly.Python.statementToCode(block, 'DO');
  if (mode === 'WHILE') {
    return 'while ' + cond + ':\n' + branch + '\n';
  } else {
    return 'while True:\n' + branch + '  if not ' + cond + ':\n    break\n';
  }
};

// Math blocks
Blockly.Python['math_number'] = function(block) {
  const number = block.getFieldValue('NUM');
  return [number, Blockly.Python.ORDER_ATOMIC];
};

Blockly.Python['math_arithmetic'] = function(block) {
  const OPERATORS = {
    'ADD': [' + ', Blockly.Python.ORDER_ADDITION],
    'MINUS': [' - ', Blockly.Python.ORDER_SUBTRACTION],
    'MULTIPLY': [' * ', Blockly.Python.ORDER_MULTIPLICATION],
    'DIVIDE': [' / ', Blockly.Python.ORDER_DIVISION],
    'POWER': [' ** ', Blockly.Python.ORDER_EXPONENTIATION]
  };
  const tuple = OPERATORS[block.getFieldValue('OP')];
  const operator = tuple[0];
  const order = tuple[1];
  const left = Blockly.Python.valueToCode(block, 'A', order) || '0';
  const right = Blockly.Python.valueToCode(block, 'B', order) || '0';
  return [left + operator + right, order];
};

// Logic blocks
Blockly.Python['logic_compare'] = function(block) {
  const OPERATORS = {
    'EQ': [' == ', Blockly.Python.ORDER_EQUALITY],
    'NEQ': [' != ', Blockly.Python.ORDER_EQUALITY],
    'LT': [' < ', Blockly.Python.ORDER_RELATIONAL],
    'LTE': [' <= ', Blockly.Python.ORDER_RELATIONAL],
    'GT': [' > ', Blockly.Python.ORDER_RELATIONAL],
    'GTE': [' >= ', Blockly.Python.ORDER_RELATIONAL]
  };
  const tuple = OPERATORS[block.getFieldValue('OP')];
  const operator = tuple[0];
  const order = tuple[1];
  const left = Blockly.Python.valueToCode(block, 'A', order) || '0';
  const right = Blockly.Python.valueToCode(block, 'B', order) || '0';
  return [left + operator + right, order];
};

Blockly.Python['logic_operation'] = function(block) {
  const OPERATORS = {
    'AND': [' and ', Blockly.Python.ORDER_LOGICAL_AND],
    'OR': [' or ', Blockly.Python.ORDER_LOGICAL_OR]
  };
  const tuple = OPERATORS[block.getFieldValue('OP')];
  const operator = tuple[0];
  const order = tuple[1];
  const left = Blockly.Python.valueToCode(block, 'A', order) || (operator === ' and ' ? 'True' : 'False');
  const right = Blockly.Python.valueToCode(block, 'B', order) || (operator === ' and ' ? 'True' : 'False');
  return [left + operator + right, order];
};

Blockly.Python['logic_negate'] = function(block) {
  const order = Blockly.Python.ORDER_LOGICAL_NOT;
  const value = Blockly.Python.valueToCode(block, 'BOOL', order) || 'True';
  return ['not ' + value, order];
};

Blockly.Python['logic_boolean'] = function(block) {
  const value = block.getFieldValue('BOOL');
  return [value, Blockly.Python.ORDER_ATOMIC];
};
