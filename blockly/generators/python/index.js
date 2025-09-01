// Ensure Python generator namespace exists (fallback if CDN not loaded)
if (!Blockly.Python) {
  Blockly.Python = new Blockly.Generator('Python');
}

// Python code generation for Blockly blocks
if (!Blockly.Python.forBlock) {
  Blockly.Python.forBlock = Object.create(null);
}

// FIXED: Enhanced Python generators with proper MicroPython support
Blockly.Python.forBlock['set_pin'] = function(block, generator){
  const pin = generator.valueToCode(block, 'PIN', generator.ORDER_ATOMIC || 0) || '0';
  const value = generator.valueToCode(block, 'VALUE', generator.ORDER_ATOMIC || 0) || '0';
  return `# Pin control\nfrom machine import Pin\npin${pin} = Pin(${pin}, Pin.OUT)\npin${pin}.value(${value})\n`;
};

Blockly.Python.forBlock['read_pin'] = function(block, generator){
  const pin = generator.valueToCode(block, 'PIN', generator.ORDER_ATOMIC || 0) || '0';
  return [`pin${pin}.value()`, generator.ORDER_FUNCTION_CALL || 0];
};

Blockly.Python['set_pin'] = function(block) {
  var pin = Blockly.Python.valueToCode(block, 'PIN', Blockly.Python.ORDER_ATOMIC || 0) || '0';
  var value = Blockly.Python.valueToCode(block, 'VALUE', Blockly.Python.ORDER_ATOMIC || 0) || '0';
  return `# Pin control\nfrom machine import Pin\npin${pin} = Pin(${pin}, Pin.OUT)\npin${pin}.value(${value})\n`;
};

Blockly.Python['read_pin'] = function(block) {
  var pin = Blockly.Python.valueToCode(block, 'PIN', Blockly.Python.ORDER_ATOMIC || 0) || '0';
  return [`pin${pin}.value()`, Blockly.Python.ORDER_FUNCTION_CALL || 0];
};

// FIXED: Enhanced motor control with proper imports
Blockly.Python['dc_motor'] = function(block) {
  var motor = block.getFieldValue('MOTOR');
  var speed = Blockly.Python.valueToCode(block, 'SPEED', Blockly.Python.ORDER_ATOMIC) || '0';
  var direction = block.getFieldValue('DIRECTION');
  return `# Motor control\nfrom machine import Pin, PWM\n# Set motor ${motor} speed: ${speed}, direction: ${direction}\nset_motor("${motor}", ${speed}, "${direction}")\n`;
};

Blockly.Python['servo_motor'] = function(block) {
  var servo = block.getFieldValue('SERVO');
  var angle = Blockly.Python.valueToCode(block, 'ANGLE', Blockly.Python.ORDER_ATOMIC) || '0';
  return `# Servo control\nfrom machine import Pin, PWM\nservo${servo} = PWM(Pin(${servo}))\nservo${servo}.freq(50)\n# Set angle: ${angle} degrees\nservo${servo}.duty(int(40 + (${angle} / 180) * 77))\n`;
};

// FIXED: Enhanced sensor blocks with proper MicroPython imports
Blockly.Python['ldr_sensor'] = function() { 
  return [`# LDR reading\nfrom machine import ADC, Pin\nldr = ADC(Pin(34))\nldr.read()`, Blockly.Python.ORDER_FUNCTION_CALL]; 
};

Blockly.Python['ir_sensor'] = function() { 
  return [`# IR sensor reading\nfrom machine import Pin\nir = Pin(35, Pin.IN)\nir.value()`, Blockly.Python.ORDER_FUNCTION_CALL]; 
};

Blockly.Python['temp_sensor'] = function() { 
  return [`# Temperature reading\nfrom machine import ADC, Pin\ntemp = ADC(Pin(36))\ntemp.read()`, Blockly.Python.ORDER_FUNCTION_CALL]; 
};

Blockly.Python['ultrasonic_sensor'] = function() { 
  return [`# Ultrasonic reading\nfrom machine import Pin\nimport time\ntrig = Pin(5, Pin.OUT)\necho = Pin(18, Pin.IN)\n# Measure distance\nread_ultrasonic()`, Blockly.Python.ORDER_FUNCTION_CALL]; 
};

Blockly.Python['touch_sensor'] = function() { 
  return [`# Touch sensor\nfrom machine import TouchPad, Pin\ntouch = TouchPad(Pin(4))\ntouch.read()`, Blockly.Python.ORDER_FUNCTION_CALL]; 
};

Blockly.Python['color_sensor'] = function() { 
  return [`# Color sensor reading\nread_color()`, Blockly.Python.ORDER_FUNCTION_CALL]; 
};

Blockly.Python['joystick1'] = function() { 
  return [`# Joystick 1 reading\nfrom machine import ADC, Pin\njoy1_x = ADC(Pin(32))\njoy1_y = ADC(Pin(33))\n(joy1_x.read(), joy1_y.read())`, Blockly.Python.ORDER_FUNCTION_CALL]; 
};

Blockly.Python['joystick2'] = function() { 
  return [`# Joystick 2 reading\nfrom machine import ADC, Pin\njoy2_x = ADC(Pin(25))\njoy2_y = ADC(Pin(26))\n(joy2_x.read(), joy2_y.read())`, Blockly.Python.ORDER_FUNCTION_CALL]; 
};

// FIXED: Enhanced OLED blocks with proper I2C setup
Blockly.Python['oled_show'] = function(block) {
  var text = Blockly.Python.valueToCode(block, 'TEXT', Blockly.Python.ORDER_ATOMIC) || '""';
  return `# OLED display\nfrom machine import Pin, I2C\ntry:\n    from ssd1306 import SSD1306_I2C\n    i2c = I2C(-1, scl=Pin(22), sda=Pin(21))\n    oled = SSD1306_I2C(128, 64, i2c)\n    oled.text(str(${text}), 0, 0)\n    oled.show()\nexcept:\n    print("OLED not available:", ${text})\n`;
};

Blockly.Python['oled_show_color'] = function(block) {
  var text = Blockly.Python.valueToCode(block, 'TEXT', Blockly.Python.ORDER_ATOMIC) || '""';
  var color = block.getFieldValue('COLOR');
  return `# OLED colored text\nfrom machine import Pin, I2C\ntry:\n    from ssd1306 import SSD1306_I2C\n    i2c = I2C(-1, scl=Pin(22), sda=Pin(21))\n    oled = SSD1306_I2C(128, 64, i2c)\n    oled.text(str(${text}), 0, 0, 1 if "${color}" == "white" else 0)\n    oled.show()\nexcept:\n    print("OLED display:", ${text})\n`;
};

Blockly.Python['oled_display_colored'] = function(block) {
  const text = Blockly.Python.valueToCode(block, 'TEXT', Blockly.Python.ORDER_ATOMIC) || '""';
  const x = Blockly.Python.valueToCode(block, 'X', Blockly.Python.ORDER_ATOMIC) || '0';
  const y = Blockly.Python.valueToCode(block, 'Y', Blockly.Python.ORDER_ATOMIC) || '0';
  const color = Blockly.Python.valueToCode(block, 'COLOR', Blockly.Python.ORDER_ATOMIC) || '"white"';
  return `# OLED positioned text\nfrom machine import Pin, I2C\ntry:\n    from ssd1306 import SSD1306_I2C\n    i2c = I2C(-1, scl=Pin(22), sda=Pin(21))\n    oled = SSD1306_I2C(128, 64, i2c)\n    oled.text(str(${text}), ${x}, ${y}, 1 if ${color} == "white" else 0)\n    oled.show()\nexcept:\n    print("OLED display:", ${text})\n`;
};

// ========================================
// FIXED: Enhanced generators with proper MicroPython patterns
// ========================================

// Pin mode configuration
Blockly.Python['pin_mode'] = function(block) {
  var pin = block.getFieldValue('PIN');
  var mode = block.getFieldValue('MODE');
  var modeStr = mode === 'OUTPUT' ? 'Pin.OUT' : 'Pin.IN';
  return `# Pin mode setup\nfrom machine import Pin\npin${pin} = Pin(${pin}, ${modeStr})\n`;
};

// Analog read with proper ADC setup
Blockly.Python['analog_read'] = function(block) {
  var pin = block.getFieldValue('PIN');
  return [`# ADC reading\nfrom machine import ADC, Pin\nadc${pin} = ADC(Pin(${pin}))\nadc${pin}.atten(ADC.ATTN_11DB)\nadc${pin}.read()`, Blockly.Python.ORDER_FUNCTION_CALL];
};

// Analog write (PWM)
Blockly.Python['analog_write'] = function(block) {
  var pin = block.getFieldValue('PIN');
  var value = block.getFieldValue('VALUE');
  return `# PWM output\nfrom machine import Pin, PWM\npwm${pin} = PWM(Pin(${pin}))\npwm${pin}.freq(1000)\npwm${pin}.duty(${value})\n`;
};

// FIXED: WiFi blocks with proper network setup
Blockly.Python['wifi_connect'] = function(block) {
  var ssid = block.getFieldValue('SSID');
  var password = block.getFieldValue('PASSWORD');
  return `# WiFi connection\nimport network\nwifi = network.WLAN(network.STA_IF)\nwifi.active(True)\nwifi.connect("${ssid}", "${password}")\nwhile not wifi.isconnected():\n    pass\nprint("Connected to WiFi:", wifi.ifconfig())\n`;
};

// Time delay with proper import
Blockly.Python['time_delay'] = function(block) {
  var value = Blockly.Python.valueToCode(block, 'TIME', Blockly.Python.ORDER_ATOMIC) || '0';
  return `# Delay\nimport time\ntime.sleep(${value} / 1000)\n`;
};

// FIXED: Enhanced control blocks
Blockly.Python['enhanced_if'] = function(block) {
  const cond = Blockly.Python.valueToCode(block, 'IF0', Blockly.Python.ORDER_NONE) || 'False';
  const body = Blockly.Python.statementToCode(block, 'DO0');
  return 'if ' + cond + ':\n' + (body || '    pass\n');
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

// FIXED: Enhanced program structure with proper main function
Blockly.Python['my_program'] = function(block) {
  const body = Blockly.Python.statementToCode(block, 'PROGRAM');
  const safeBody = body && body.trim() ? body : '    print("Hello from ESP32!")\n';
  return `# Main program\ndef main():\n${safeBody}\n\nif __name__ == "__main__":\n    main()\n`;
};

// FIXED: Variable handling
Blockly.Python['variables_declare'] = function(block) {
  const v = Blockly.Python.nameDB_.getName(block.getFieldValue('VAR'), Blockly.Python.NAME_TYPE);
  return v + ' = None  # Variable declaration\n';
};

Blockly.Python['variables_define'] = function(block) {
  const v = Blockly.Python.nameDB_.getName(block.getFieldValue('VAR'), Blockly.Python.NAME_TYPE);
  const val = Blockly.Python.valueToCode(block, 'VALUE', Blockly.Python.ORDER_ASSIGNMENT) || '0';
  return v + ' = ' + val + '  # Variable assignment\n';
};

Blockly.Python['variables_get'] = function(block) {
  const v = Blockly.Python.nameDB_.getName(block.getFieldValue('VAR'), Blockly.Python.NAME_TYPE);
  return [v, Blockly.Python.ORDER_ATOMIC];
};

Blockly.Python['math_change'] = function(block) {
  const v = Blockly.Python.nameDB_.getName(block.getFieldValue('VAR'), Blockly.Python.NAME_TYPE);
  const delta = Blockly.Python.valueToCode(block, 'DELTA', Blockly.Python.ORDER_ADDITION) || '0';
  return v + ' += ' + delta + '  # Increment variable\n';
};

// FIXED: Bluetooth blocks with proper setup
Blockly.Python['bluetooth_setup'] = function(block) {
  var deviceName = block.getFieldValue('DEVICE_NAME');
  return `# Bluetooth setup\nfrom machine import UART\nimport bluetooth\nble = bluetooth.BLE()\nble.active(True)\nprint("Bluetooth active as: ${deviceName}")\n`;
};

Blockly.Python['bluetooth_send'] = function(block) {
  var data = Blockly.Python.valueToCode(block, 'DATA', Blockly.Python.ORDER_ATOMIC) || '""';
  return `# Bluetooth send\nble.send(str(${data}))\n`;
};

Blockly.Python['bluetooth_available'] = function() { 
  return ['ble.available()', Blockly.Python.ORDER_FUNCTION_CALL]; 
};

Blockly.Python['bluetooth_read'] = function() { 
  return ['ble.read()', Blockly.Python.ORDER_FUNCTION_CALL]; 
};

// Text blocks
Blockly.Python['text'] = function(block) {
  const text = block.getFieldValue('TEXT');
  return ['"' + text.replace(/"/g, '\\"') + '"', Blockly.Python.ORDER_ATOMIC];
};

Blockly.Python['text_print'] = function(block) {
  const text = Blockly.Python.valueToCode(block, 'TEXT', Blockly.Python.ORDER_NONE) || '""';
  return 'print(' + text + ')\n';
};

// ========================================
// FIXED: forBlock generators with enhanced MicroPython support
// ========================================

// Copy all regular generators to forBlock with generator parameter
const blockTypes = [
  'pin_mode', 'analog_read', 'analog_write', 'motor_speed', 'ir_sensor_analog',
  'wifi_connect', 'wifi_send', 'wifi_receive', 'oled_display_variable', 
  'oled_display_char', 'oled_animation_blink', 'oled_animation_scroll',
  'bluetooth_setup', 'bluetooth_send', 'bluetooth_available', 'bluetooth_read'
];

blockTypes.forEach(blockType => {
  if (Blockly.Python[blockType] && !Blockly.Python.forBlock[blockType]) {
    Blockly.Python.forBlock[blockType] = function(block, generator) {
      return Blockly.Python[blockType](block);
    };
  }
});

// Ensure forBlock proxies for Python, so toolbox blocks route correctly
(function ensurePyForBlockProxies(){
  const api = Blockly.Python;
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

// FIXED: Enhanced control blocks with proper structure
Blockly.Python['controls_if'] = function(block) {
  const n = block.elseifCount_ + (block.elseCount_ ? 1 : 0);
  let code = '';
  for (let i = 0; i <= n; i++) {
    if (i === 0) {
      const cond = Blockly.Python.valueToCode(block, 'IF' + i, Blockly.Python.ORDER_NONE) || 'False';
      const branch = Blockly.Python.statementToCode(block, 'DO' + i) || '    pass\n';
      code += 'if ' + cond + ':\n' + branch;
    } else if (i === n && block.elseCount_) {
      const branch = Blockly.Python.statementToCode(block, 'ELSE') || '    pass\n';
      code += 'else:\n' + branch;
    } else {
      const cond = Blockly.Python.valueToCode(block, 'IF' + i, Blockly.Python.ORDER_NONE) || 'False';
      const branch = Blockly.Python.statementToCode(block, 'DO' + i) || '    pass\n';
      code += 'elif ' + cond + ':\n' + branch;
    }
  }
  return code;
};

Blockly.Python['controls_repeat_ext'] = function(block) {
  const times = Blockly.Python.valueToCode(block, 'TIMES', Blockly.Python.ORDER_ASSIGNMENT) || '0';
  const branch = Blockly.Python.statementToCode(block, 'DO') || '    pass\n';
  return 'for i in range(' + times + '):\n' + branch;
};

Blockly.Python['controls_whileUntil'] = function(block) {
  const mode = block.getFieldValue('MODE');
  const cond = Blockly.Python.valueToCode(block, 'BOOL', Blockly.Python.ORDER_NONE) || 'False';
  const branch = Blockly.Python.statementToCode(block, 'DO') || '    pass\n';
  if (mode === 'WHILE') {
    return 'while ' + cond + ':\n' + branch;
  } else {
    return 'while True:\n' + branch + '    if not ' + cond + ':\n        break\n';
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