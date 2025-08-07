// Function to generate C++ code for setting a pin
function generateSetPinCodeCpp(pin, value) {
    return `// Set pin ${pin} to ${value}\n
digitalWrite(${pin}, ${value});\n`;
}

// Function to generate C++ code for reading a pin
function generateReadPinCodeCpp(pin) {
    return `// Read pin ${pin}\n
int pinValue = digitalRead(${pin});\n
return pinValue;\n`;
}

// Function to generate C++ code for controlling a DC motor
function generateDCMotorCodeCpp(motor, speed, direction) {
    return `// Set motor ${motor} to speed ${speed} and direction ${direction}\n
if (${direction} == 'forward') {
    analogWrite(${motor}, ${speed});
} else {
    analogWrite(${motor}, -${speed});
}\n`;
}

// Function to generate C++ code for controlling a Servo motor
function generateServoMotorCodeCpp(servo, angle) {
    return `// Set servo motor ${servo} to angle ${angle}\n
servo.write(${angle});\n`;
}

// Function to generate C++ code for reading an LDR sensor
function generateLDRSensorCodeCpp() {
    return `// Read LDR sensor\n
int ldrValue = analogRead(A0); // Example pin A0\n
return ldrValue;\n`;
}

// Function to generate C++ code for reading an IR sensor
function generateIRSensorCodeCpp() {
    return `// Read IR sensor\n
int irValue = digitalRead(2); // Example pin 2\n
return irValue;\n`;
}

// Example of generating C++ code for specific functionality
const generatedCodeCpp = generateSetPinCodeCpp(13, 1); // Pin 13 set to HIGH
console.log(generatedCodeCpp); // Output the generated C++ code

s