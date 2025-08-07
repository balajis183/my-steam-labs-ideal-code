// Generator for setting a digital pin
Blockly.Python['set_digital_pin'] = function(block) {
  const pin = block.getFieldValue('PIN');
  const state = block.getFieldValue('STATE'); // HIGH or LOW
  return `# Simulate setting pin ${pin} to ${state}\npin_${pin} = ${state}\n`;
};

// Generator for reading a digital pin
Blockly.Python['read_digital_pin'] = function(block) {
  const pin = block.getFieldValue('PIN');
  const code = `# Simulate reading pin ${pin}\npin_${pin} = 'HIGH'  # Example value\n`;
  return [code, Blockly.Python.ORDER_ATOMIC];
};

// Generator for controlling a DC motor
Blockly.Python['dc_motor'] = function(block) {
  const motor = block.getFieldValue('MOTOR');
  const speed = Blockly.Python.valueToCode(block, 'SPEED', Blockly.Python.ORDER_ATOMIC) || '0';
  const direction = block.getFieldValue('DIRECTION');
  return `# Simulate controlling DC motor ${motor} with speed ${speed} and direction ${direction}\n` +
         `motor_${motor}_speed = ${speed}\nmotor_${motor}_direction = '${direction}'\n`;
};

// Generator for controlling a Servo motor
Blockly.Python['servo_motor'] = function(block) {
  const servo = block.getFieldValue('SERVO');
  const angle = Blockly.Python.valueToCode(block, 'ANGLE', Blockly.Python.ORDER_ATOMIC) || '0';
  return `# Simulate controlling servo motor ${servo} to angle ${angle}\n` +
         `servo_${servo}_angle = ${angle}\n`;
};

// Generator for reading a sensor (e.g., LDR)
Blockly.Python['ldr_sensor'] = function(block) {
  return `# Simulate reading LDR sensor\nldr_value = 500  # Example sensor reading\nprint("LDR value:", ldr_value)\n`;
};

// Generator for reading an IR sensor
Blockly.Python['ir_sensor'] = function(block) {
  return `# Simulate reading IR sensor\nir_value = 'HIGH'  # Example sensor value\nprint("IR Sensor value:", ir_value)\n`;
};

// Generator for a delay function
Blockly.Python['delay_block'] = function(block) {
  const delay = block.getFieldValue('DELAY');
  return `# Simulate delay for ${delay} milliseconds\nimport time\ntime.sleep(${delay} / 1000)\n`;
};
