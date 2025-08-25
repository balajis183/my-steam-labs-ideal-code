// Ensure C++ generator namespace exists (custom)
if (!Blockly.Cpp) {
  Blockly.Cpp = new Blockly.Generator('Cpp');
}

// C++ code generation for Blockly blocks
if (!Blockly.Cpp.forBlock) {
  Blockly.Cpp.forBlock = Object.create(null);
}
Blockly.Cpp.forBlock['set_pin'] = function(block, generator){
  const pin = generator.valueToCode(block, 'PIN', generator.ORDER_ATOMIC || 0) || '0';
  const value = generator.valueToCode(block, 'VALUE', generator.ORDER_ATOMIC || 0) || '0';
  return `digitalWrite(${pin}, ${value});\n`;
};
Blockly.Cpp.forBlock['read_pin'] = function(block, generator){
  const pin = generator.valueToCode(block, 'PIN', generator.ORDER_ATOMIC || 0) || '0';
  return [`digitalRead(${pin})`, generator.ORDER_FUNCTION_CALL || 0];
};
Blockly.Cpp['set_pin'] = function(block) {
  var pin = Blockly.Cpp.valueToCode(block, 'PIN', Blockly.Cpp.ORDER_ATOMIC) || '0';
  var value = Blockly.Cpp.valueToCode(block, 'VALUE', Blockly.Cpp.ORDER_ATOMIC) || '0';
  return 'digitalWrite(' + pin + ', ' + value + ');\n';
};

Blockly.Cpp['read_pin'] = function(block) {
  var pin = Blockly.Cpp.valueToCode(block, 'PIN', Blockly.Cpp.ORDER_ATOMIC) || '0';
  return ['digitalRead(' + pin + ')', Blockly.Cpp.ORDER_FUNCTION_CALL];
};

Blockly.Cpp['dc_motor'] = function(block) {
  var motor = block.getFieldValue('MOTOR');
  var speed = Blockly.Cpp.valueToCode(block, 'SPEED', Blockly.Cpp.ORDER_ATOMIC) || '0';
  var direction = block.getFieldValue('DIRECTION');
  return 'setMotor("' + motor + '", ' + speed + ', "' + direction + '");\n';
};

Blockly.Cpp['servo_motor'] = function(block) {
  var servo = block.getFieldValue('SERVO');
  var angle = Blockly.Cpp.valueToCode(block, 'ANGLE', Blockly.Cpp.ORDER_ATOMIC) || '0';
  return 'servo' + servo + '.write(' + angle + ');\n';
};

Blockly.Cpp['ldr_sensor'] = function() { 
  return ['analogRead(A0)', Blockly.Cpp.ORDER_FUNCTION_CALL]; 
};

Blockly.Cpp['ir_sensor'] = function() { 
  return ['digitalRead(2)', Blockly.Cpp.ORDER_FUNCTION_CALL]; 
};

Blockly.Cpp['temp_sensor'] = function() { 
  return ['readTemperature()', Blockly.Cpp.ORDER_FUNCTION_CALL]; 
};

Blockly.Cpp['ultrasonic_sensor'] = function() { 
  return ['readUltrasonic()', Blockly.Cpp.ORDER_FUNCTION_CALL]; 
};

Blockly.Cpp['touch_sensor'] = function() { 
  return ['digitalRead(4)', Blockly.Cpp.ORDER_FUNCTION_CALL]; 
};

Blockly.Cpp['color_sensor'] = function() { 
  return ['readColor()', Blockly.Cpp.ORDER_FUNCTION_CALL]; 
};

Blockly.Cpp['joystick1'] = function() { 
  return ['readJoystick1()', Blockly.Cpp.ORDER_FUNCTION_CALL]; 
};

Blockly.Cpp['joystick2'] = function() { 
  return ['readJoystick2()', Blockly.Cpp.ORDER_FUNCTION_CALL]; 
};

Blockly.Cpp['oled_show'] = function(block) {
  var text = Blockly.Cpp.valueToCode(block, 'TEXT', Blockly.Cpp.ORDER_ATOMIC) || '""';
  return 'oledDisplay(' + text + ');\n';
};

Blockly.Cpp['oled_show_color'] = function(block) {
  var text = Blockly.Cpp.valueToCode(block, 'TEXT', Blockly.Cpp.ORDER_ATOMIC) || '""';
  var color = block.getFieldValue('COLOR');
  return `showOnOLED(${text}, 0, 0, "${color}");\n`;
};

Blockly.Cpp['oled_display_colored'] = function(block) {
  const text = Blockly.Cpp.valueToCode(block, 'TEXT', Blockly.Cpp.ORDER_ATOMIC) || '""';
  const x = Blockly.Cpp.valueToCode(block, 'X', Blockly.Cpp.ORDER_ATOMIC) || '0';
  const y = Blockly.Cpp.valueToCode(block, 'Y', Blockly.Cpp.ORDER_ATOMIC) || '0';
  const color = Blockly.Cpp.valueToCode(block, 'COLOR', Blockly.Cpp.ORDER_ATOMIC) || '"white"';
  return `showOnOLED(${text}, ${x}, ${y}, ${color});\n`;
};

// ========================================
// NEW C++ GENERATORS FOR MISSING BLOCKS
// ========================================

// Pin mode configuration
Blockly.Cpp['pin_mode'] = function(block) {
  var pin = block.getFieldValue('PIN');
  var mode = block.getFieldValue('MODE');
  return `pinMode(${pin}, ${mode});\n`;
};

// Analog read
Blockly.Cpp['analog_read'] = function(block) {
  var pin = block.getFieldValue('PIN');
  return [`analogRead(${pin})`, Blockly.Cpp.ORDER_FUNCTION_CALL];
};

// Analog write (PWM)
Blockly.Cpp['analog_write'] = function(block) {
  var pin = block.getFieldValue('PIN');
  var value = block.getFieldValue('VALUE');
  return `analogWrite(${pin}, ${value});\n`;
};

// Motor speed control
Blockly.Cpp['motor_speed'] = function(block) {
  var motor = block.getFieldValue('MOTOR');
  var speed = block.getFieldValue('SPEED');
  return `setMotorSpeed("${motor}", ${speed});\n`;
};

// IR sensor analog read
Blockly.Cpp['ir_sensor_analog'] = function() {
  return ['analogRead(A1)', Blockly.Cpp.ORDER_FUNCTION_CALL];
};

// WiFi connect
Blockly.Cpp['wifi_connect'] = function(block) {
  var ssid = block.getFieldValue('SSID');
  var password = block.getFieldValue('PASSWORD');
  return `WiFi.begin("${ssid}", "${password}");\n`;
};

// WiFi send
Blockly.Cpp['wifi_send'] = function(block) {
  var data = Blockly.Cpp.valueToCode(block, 'DATA', Blockly.Cpp.ORDER_ATOMIC) || '""';
  var ip = block.getFieldValue('IP');
  var port = block.getFieldValue('PORT');
  return `wifiSend(${data}, "${ip}", ${port});\n`;
};

// WiFi receive
Blockly.Cpp['wifi_receive'] = function(block) {
  var port = block.getFieldValue('PORT');
  return [`wifiReceive(${port})`, Blockly.Cpp.ORDER_FUNCTION_CALL];
};

// Enhanced OLED display variable
Blockly.Cpp['oled_display_variable'] = function(block) {
  var variable = Blockly.Cpp.valueToCode(block, 'VARIABLE', Blockly.Cpp.ORDER_ATOMIC) || '0';
  var x = block.getFieldValue('X');
  var y = block.getFieldValue('Y');
  return `displayVariableOnOLED(${variable}, ${x}, ${y});\n`;
};

// Enhanced OLED display character
Blockly.Cpp['oled_display_char'] = function(block) {
  var char = block.getFieldValue('CHAR');
  var x = block.getFieldValue('X');
  var y = block.getFieldValue('Y');
  return `displayCharOnOLED("${char}", ${x}, ${y});\n`;
};

// Enhanced OLED animation blink
Blockly.Cpp['oled_animation_blink'] = function(block) {
  var text = Blockly.Cpp.valueToCode(block, 'TEXT', Blockly.Cpp.ORDER_ATOMIC) || '""';
  var times = block.getFieldValue('TIMES');
  var delay = block.getFieldValue('DELAY');
  return `blinkTextOnOLED(${text}, ${times}, ${delay});\n`;
};

// Enhanced OLED animation scroll
Blockly.Cpp['oled_animation_scroll'] = function(block) {
  var text = Blockly.Cpp.valueToCode(block, 'TEXT', Blockly.Cpp.ORDER_ATOMIC) || '""';
  var direction = block.getFieldValue('DIRECTION');
  var speed = block.getFieldValue('SPEED');
  return `scrollTextOnOLED(${text}, "${direction}", ${speed});\n`;
};

Blockly.Cpp['time_delay'] = function(block) {
  var value = Blockly.Cpp.valueToCode(block, 'TIME', Blockly.Cpp.ORDER_ATOMIC) || '0';
  return 'delay(' + value + ');\n';
};

Blockly.Cpp['enhanced_if'] = function(block) {
  const cond = Blockly.Cpp.valueToCode(block, 'IF0', Blockly.Cpp.ORDER_NONE) || 'false';
  const body = Blockly.Cpp.statementToCode(block, 'DO0');
  return 'if (' + cond + ') {\n' + body + '}\n';
};

Blockly.Cpp['enhanced_compare'] = function(block) {
  var OPERATORS = { 'EQ': '==', 'NEQ': '!=', 'LT': '<', 'LTE': '<=', 'GT': '>', 'GTE': '>=' };
  var operator = OPERATORS[block.getFieldValue('OP')];
  var order = (operator == '==' || operator == '!=') ? Blockly.Cpp.ORDER_EQUALITY : Blockly.Cpp.ORDER_RELATIONAL;
  var a = Blockly.Cpp.valueToCode(block, 'A', order) || '0';
  var b = Blockly.Cpp.valueToCode(block, 'B', order) || '0';
  return [a + ' ' + operator + ' ' + b, order];
};

Blockly.Cpp['enhanced_logic'] = function(block) {
  var operator = (block.getFieldValue('OP') == 'AND') ? '&&' : '||';
  var order = (operator == '&&') ? Blockly.Cpp.ORDER_LOGICAL_AND : Blockly.Cpp.ORDER_LOGICAL_OR;
  var a = Blockly.Cpp.valueToCode(block, 'A', order) || (operator == '&&' ? 'true' : 'false');
  var b = Blockly.Cpp.valueToCode(block, 'B', order) || (operator == '&&' ? 'true' : 'false');
  return [a + ' ' + operator + ' ' + b, order];
};

Blockly.Cpp['my_program'] = function(block) {
  const body = Blockly.Cpp.statementToCode(block, 'PROGRAM');
  return '// My Program\n' + body;
};

Blockly.Cpp['variables_declare'] = function(block) {
  const v = Blockly.Cpp.nameDB_.getName(block.getFieldValue('VAR'), Blockly.Variables.NAME_TYPE);
  return 'int ' + v + ';\n';
};

Blockly.Cpp['variables_define'] = function(block) {
  const v = Blockly.Cpp.nameDB_.getName(block.getFieldValue('VAR'), Blockly.Cpp.NAME_TYPE);
  const val = Blockly.Cpp.valueToCode(block, 'VALUE', Blockly.Cpp.ORDER_ASSIGNMENT) || '0';
  return 'int ' + v + ' = ' + val + ';\n';
};

Blockly.Cpp['variables_declare'] = function(block) {
  const v = Blockly.Cpp.nameDB_.getName(block.getFieldValue('VAR'), Blockly.Cpp.NAME_TYPE);
  return 'int ' + v + ';\n';
};

Blockly.Cpp['variables_get'] = function(block) {
  const v = Blockly.Cpp.nameDB_.getName(block.getFieldValue('VAR'), Blockly.Cpp.NAME_TYPE);
  return [v, Blockly.Cpp.ORDER_ATOMIC];
};

Blockly.Cpp['math_change'] = function(block) {
  const v = Blockly.Cpp.nameDB_.getName(block.getFieldValue('VAR'), Blockly.Cpp.NAME_TYPE);
  const delta = Blockly.Cpp.valueToCode(block, 'DELTA', Blockly.Cpp.ORDER_ADDITION) || '0';
  return v + ' += ' + delta + ';\n';
};

Blockly.Cpp['bluetooth_setup'] = function(block) {
  var deviceName = block.getFieldValue('DEVICE_NAME');
  return `btSerial.begin("${deviceName}");\n`;
};

Blockly.Cpp['bluetooth_send'] = function(block) {
  var data = Blockly.Cpp.valueToCode(block, 'DATA', Blockly.Cpp.ORDER_ATOMIC) || '""';
  return `btSerial.print(${data});\n`;
};

Blockly.Cpp['bluetooth_available'] = function() { 
  return ['btSerial.available() > 0', Blockly.Cpp.ORDER_ATOMIC]; 
};

Blockly.Cpp['bluetooth_read'] = function() { 
  return ['btSerial.readString()', Blockly.Cpp.ORDER_FUNCTION_CALL]; 
};

// Text blocks
Blockly.Cpp['text'] = function(block) {
  const text = block.getFieldValue('TEXT');
  return ['"' + text + '"', Blockly.Cpp.ORDER_ATOMIC];
};

Blockly.Cpp['text_print'] = function(block) {
  const text = Blockly.Cpp.valueToCode(block, 'TEXT', Blockly.Cpp.ORDER_NONE) || '""';
  return 'Serial.println(' + text + ');\n';
};

// ========================================
// NEW C++ FORBLOCK GENERATORS FOR MISSING BLOCKS
// ========================================

// Pin mode configuration
Blockly.Cpp.forBlock['pin_mode'] = function(block, generator) {
  var pin = block.getFieldValue('PIN');
  var mode = block.getFieldValue('MODE');
  return `pinMode(${pin}, ${mode});\n`;
};

// Analog read
Blockly.Cpp.forBlock['analog_read'] = function(block, generator) {
  var pin = block.getFieldValue('PIN');
  return [`analogRead(${pin})`, Blockly.Cpp.ORDER_FUNCTION_CALL];
};

// Analog write (PWM)
Blockly.Cpp.forBlock['analog_write'] = function(block, generator) {
  var pin = block.getFieldValue('PIN');
  var value = block.getFieldValue('VALUE');
  return `analogWrite(${pin}, ${value});\n`;
};

// Motor speed control
Blockly.Cpp.forBlock['motor_speed'] = function(block, generator) {
  var motor = block.getFieldValue('MOTOR');
  var speed = block.getFieldValue('SPEED');
  return `setMotorSpeed("${motor}", ${speed});\n`;
};

// IR sensor analog read
Blockly.Cpp.forBlock['ir_sensor_analog'] = function(block, generator) {
  return ['analogRead(A1)', Blockly.Cpp.ORDER_FUNCTION_CALL];
};

// WiFi connect
Blockly.Cpp.forBlock['wifi_connect'] = function(block, generator) {
  var ssid = block.getFieldValue('SSID');
  var password = block.getFieldValue('PASSWORD');
  return `WiFi.begin("${ssid}", "${password}");\n`;
};

// WiFi send
Blockly.Cpp.forBlock['wifi_send'] = function(block, generator) {
  var data = Blockly.Cpp.valueToCode(block, 'DATA', Blockly.Cpp.ORDER_ATOMIC) || '""';
  var ip = block.getFieldValue('IP');
  var port = block.getFieldValue('PORT');
  return `wifiSend(${data}, "${ip}", ${port});\n`;
};

// WiFi receive
Blockly.Cpp.forBlock['wifi_receive'] = function(block, generator) {
  var port = block.getFieldValue('PORT');
  return [`wifiReceive(${port})`, Blockly.Cpp.ORDER_FUNCTION_CALL];
};

// Enhanced OLED display variable
Blockly.Cpp.forBlock['oled_display_variable'] = function(block, generator) {
  var variable = Blockly.Cpp.valueToCode(block, 'VARIABLE', Blockly.Cpp.ORDER_ATOMIC) || '0';
  var x = block.getFieldValue('X');
  var y = block.getFieldValue('Y');
  return `displayVariableOnOLED(${variable}, ${x}, ${y});\n`;
};

// Enhanced OLED display character
Blockly.Cpp.forBlock['oled_display_char'] = function(block, generator) {
  var char = block.getFieldValue('CHAR');
  var x = block.getFieldValue('X');
  var y = block.getFieldValue('Y');
  return `displayCharOnOLED("${char}", ${x}, ${y});\n`;
};

// Enhanced OLED animation blink
Blockly.Cpp.forBlock['oled_animation_blink'] = function(block, generator) {
  var text = Blockly.Cpp.valueToCode(block, 'TEXT', Blockly.Cpp.ORDER_ATOMIC) || '""';
  var times = block.getFieldValue('TIMES');
  var delay = block.getFieldValue('DELAY');
  return `blinkTextOnOLED(${text}, ${times}, ${delay});\n`;
};

// Enhanced OLED animation scroll
Blockly.Cpp.forBlock['oled_animation_scroll'] = function(block, generator) {
  var text = Blockly.Cpp.valueToCode(block, 'TEXT', Blockly.Cpp.ORDER_ATOMIC) || '""';
  var direction = block.getFieldValue('DIRECTION');
  var speed = block.getFieldValue('SPEED');
  return `scrollTextOnOLED(${text}, "${direction}", ${speed});\n`;
};

// Ensure forBlock proxies for C++ as well
(function ensureCppForBlockProxies(){
  const api = Blockly.Cpp;
  if (!api.forBlock) api.forBlock = Object.create(null);
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
    if (!api.forBlock[t] && typeof api[t] === 'function') {
      api.forBlock[t] = function(block, generator){
        return api[t](block);
      };
    }
  });
})();

// Control blocks
Blockly.Cpp['controls_if'] = function(block) {
  const n = block.elseifCount_ + (block.elseCount_ ? 1 : 0);
  let code = '';
  for (let i = 0; i <= n; i++) {
    if (i === 0) {
      const cond = Blockly.Cpp.valueToCode(block, 'IF' + i, Blockly.Cpp.ORDER_NONE) || 'false';
      const branch = Blockly.Cpp.statementToCode(block, 'DO' + i);
      code += 'if (' + cond + ') {\n' + branch + '}';
    } else if (i === n && block.elseCount_) {
      const branch = Blockly.Cpp.statementToCode(block, 'ELSE');
      code += ' else {\n' + branch + '}';
    } else {
      const cond = Blockly.Cpp.valueToCode(block, 'IF' + i, Blockly.Cpp.ORDER_NONE) || 'false';
      const branch = Blockly.Cpp.statementToCode(block, 'DO' + i);
      code += ' else if (' + cond + ') {\n' + branch + '}';
    }
  }
  return code + '\n';
};

Blockly.Cpp['controls_repeat_ext'] = function(block) {
  const times = Blockly.Cpp.valueToCode(block, 'TIMES', Blockly.Cpp.ORDER_ASSIGNMENT) || '0';
  const branch = Blockly.Cpp.statementToCode(block, 'DO');
  return 'for (int i = 0; i < ' + times + '; i++) {\n' + branch + '}\n';
};

Blockly.Cpp['controls_whileUntil'] = function(block) {
  const mode = block.getFieldValue('MODE');
  const cond = Blockly.Cpp.valueToCode(block, 'BOOL', Blockly.Cpp.ORDER_NONE) || 'false';
  const branch = Blockly.Cpp.statementToCode(block, 'DO');
  if (mode === 'WHILE') {
    return 'while (' + cond + ') {\n' + branch + '}\n';
  } else {
    return 'do {\n' + branch + '} while (' + cond + ');\n';
  }
};

// Math blocks
Blockly.Cpp['math_number'] = function(block) {
  const number = block.getFieldValue('NUM');
  return [number, Blockly.Cpp.ORDER_ATOMIC];
};

Blockly.Cpp['math_arithmetic'] = function(block) {
  const OPERATORS = {
    'ADD': [' + ', Blockly.Cpp.ORDER_ADDITION],
    'MINUS': [' - ', Blockly.Cpp.ORDER_SUBTRACTION],
    'MULTIPLY': [' * ', Blockly.Cpp.ORDER_MULTIPLICATION],
    'DIVIDE': [' / ', Blockly.Cpp.ORDER_DIVISION],
    'POWER': [' pow(', Blockly.Cpp.ORDER_FUNCTION_CALL]
  };
  const tuple = OPERATORS[block.getFieldValue('OP')];
  const operator = tuple[0];
  const order = tuple[1];
  const left = Blockly.Cpp.valueToCode(block, 'A', order) || '0';
  const right = Blockly.Cpp.valueToCode(block, 'B', order) || '0';
  if (operator === ' pow(') {
    return [operator + left + ', ' + right + ')', order];
  }
  return [left + operator + right, order];
};

// Logic blocks
Blockly.Cpp['logic_compare'] = function(block) {
  const OPERATORS = {
    'EQ': [' == ', Blockly.Cpp.ORDER_EQUALITY],
    'NEQ': [' != ', Blockly.Cpp.ORDER_EQUALITY],
    'LT': [' < ', Blockly.Cpp.ORDER_RELATIONAL],
    'LTE': [' <= ', Blockly.Cpp.ORDER_RELATIONAL],
    'GT': [' > ', Blockly.Cpp.ORDER_RELATIONAL],
    'GTE': [' >= ', Blockly.Cpp.ORDER_RELATIONAL]
  };
  const tuple = OPERATORS[block.getFieldValue('OP')];
  const operator = tuple[0];
  const order = tuple[1];
  const left = Blockly.Cpp.valueToCode(block, 'A', order) || '0';
  const right = Blockly.Cpp.valueToCode(block, 'B', order) || '0';
  return [left + operator + right, order];
};

Blockly.Cpp['logic_operation'] = function(block) {
  const OPERATORS = {
    'AND': [' && ', Blockly.Cpp.ORDER_LOGICAL_AND],
    'OR': [' || ', Blockly.Cpp.ORDER_LOGICAL_OR]
  };
  const tuple = OPERATORS[block.getFieldValue('OP')];
  const operator = tuple[0];
  const order = tuple[1];
  const left = Blockly.Cpp.valueToCode(block, 'A', order) || (operator === ' && ' ? 'true' : 'false');
  const right = Blockly.Cpp.valueToCode(block, 'B', order) || (operator === ' && ' ? 'true' : 'false');
  return [left + operator + right, order];
};

Blockly.Cpp['logic_negate'] = function(block) {
  const order = Blockly.Cpp.ORDER_LOGICAL_NOT;
  const value = Blockly.Cpp.valueToCode(block, 'BOOL', order) || 'true';
  return ['!' + value, order];
};

Blockly.Cpp['logic_boolean'] = function(block) {
  const value = block.getFieldValue('BOOL');
  return [value, Blockly.Cpp.ORDER_ATOMIC];
};