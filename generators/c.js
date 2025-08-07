// Function to generate C code for setting a pin
/*function generateSetPinCode(pin, value) {
    return `// Set pin ${pin} to ${value}\n
digitalWrite(${pin}, ${value});\n`;
}

// Function to generate C code for reading a pin
function generateReadPinCode(pin) {
    return `// Read pin ${pin}\n
int pinValue = digitalRead(${pin});\n
return pinValue;\n`;
}

// Function to generate C code for controlling a DC motor
function generateDCMotorCode(motor, speed, direction) {
    return `// Set motor ${motor} to speed ${speed} and direction ${direction}\n
if (${direction} == 'forward') {
    analogWrite(${motor}, ${speed});
} else {
    analogWrite(${motor}, -${speed});
}\n`;
}

// Function to generate C code for controlling a Servo motor
function generateServoMotorCode(servo, angle) {
    return `// Set servo motor ${servo} to angle ${angle}\n
servoWrite(${servo}, ${angle});\n`;
}

// Function to generate C code for reading an LDR sensor
function generateLDRSensorCode() {
    return `// Read LDR sensor\n
int ldrValue = analogRead(A0); // Example pin A0\n
return ldrValue;\n`;
}

// Function to generate C code for reading an IR sensor
function generateIRSensorCode() {
    return `// Read IR sensor\n
int irValue = digitalRead(2); // Example pin 2\n
return irValue;\n`;
}

// Example of generating C code for specific functionality
const generatedCode = generateSetPinCode(13, 1); // Pin 13 set to HIGH
console.log(generatedCode); // Output the generated C code
*/
// Function to generate C code for setting a digital pin
function generateSetPinCode(pin, value) {
    return `// Set digital pin ${pin} to ${value === 1 ? 'HIGH' : 'LOW'}\n` +
           `digitalWrite(${pin}, ${value === 1 ? 'HIGH' : 'LOW'});\n`;
}

// Function to generate C code for reading a digital pin
function generateReadPinCode(pin) {
    return `// Read digital pin ${pin}\n` +
           `int pinValue = digitalRead(${pin});\n` +
           `// Use pinValue as needed\n`;
}

// Function to generate C code for controlling a DC motor using H-bridge logic
function generateDCMotorCode(pin1, pin2, enPin, speed, direction) {
    return `// Control DC motor using H-Bridge\n` +
           `digitalWrite(${pin1}, ${direction === 'forward' ? 'HIGH' : 'LOW'});\n` +
           `digitalWrite(${pin2}, ${direction === 'forward' ? 'LOW' : 'HIGH'});\n` +
           `analogWrite(${enPin}, ${speed});\n`;
}

// Function to generate C code for controlling a Servo motor
function generateServoMotorCode(servoName, pin, angle) {
    return `// Control Servo motor ${servoName}\n` +
           `#include <Servo.h>\n` +
           `Servo ${servoName};\n` +
           `${servoName}.attach(${pin});\n` +
           `${servoName}.write(${angle});\n`;
}

// Function to generate C code for reading an LDR sensor
function generateLDRSensorCode(pin = 'A0') {
    return `// Read LDR sensor on analog pin ${pin}\n` +
           `int ldrValue = analogRead(${pin});\n` +
           `// Use ldrValue as needed\n`;
}

// Function to generate C code for reading an IR sensor
function generateIRSensorCode(pin = 2) {
    return `// Read IR sensor on digital pin ${pin}\n` +
           `int irValue = digitalRead(${pin});\n` +
           `// Use irValue as needed\n`;
}

// Example usage
const exampleSetPin = generateSetPinCode(13, 1);
const exampleReadPin = generateReadPinCode(7);
const exampleMotorCode = generateDCMotorCode(8, 9, 10, 200, 'forward');
const exampleServoCode = generateServoMotorCode('myServo', 3, 90);
const exampleLDRCode = generateLDRSensorCode('A1');
const exampleIRCode = generateIRSensorCode(4);

console.log(exampleSetPin);
console.log(exampleReadPin);
console.log(exampleMotorCode);
console.log(exampleServoCode);
console.log(exampleLDRCode);
console.log(exampleIRCode);

