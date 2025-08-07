// sensors.js

/**
 * Simulated sensor values storage
 * Key: pin number, Value: sensor reading (0 or 1 for digital, 0-1023 for analog)
 */
const sensorValues = {};

/**
 * Sets a simulated value for a sensor pin.
 * @param {number} pin - The sensor pin number.
 * @param {number} value - The value to set (0 or 1 for digital, 0–1023 for analog).
 */
function setSensorValue(pin, value) {
    sensorValues[pin] = value;
    console.log(`Sensor on pin ${pin} set to value ${value}`);
}

/**
 * Reads a digital sensor value.
 * @param {number} pin - The sensor pin number.
 * @returns {number} - 0 or 1
 */
function readDigital(pin) {
    const value = sensorValues[pin] ?? 0;
    console.log(`Digital read from pin ${pin}: ${value}`);
    return value;
}

/**
 * Reads an analog sensor value.
 * @param {number} pin - The sensor pin number.
 * @returns {number} - value between 0 and 1023
 */
function readAnalog(pin) {
    const value = sensorValues[pin] ?? 0;
    console.log(`Analog read from pin ${pin}: ${value}`);
    return value;
}

// Make available globally for browser-based use
window.setSensorValue = setSensorValue;
window.readDigital = readDigital;
window.readAnalog = readAnalog;

// Optional export for ES modules
export { setSensorValue, readDigital, readAnalog };
