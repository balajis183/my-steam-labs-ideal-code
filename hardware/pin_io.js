// pin_io.js

// Simulated pin state map
const pinStates = {};

// Set the state of a pin (0 or 1)
function setPin(pinNumber, value) {
    if (typeof pinNumber !== 'number' || (value !== 0 && value !== 1)) {
        console.error(`Invalid arguments for setPin: pin=${pinNumber}, value=${value}`);
        return;
    }

    pinStates[pinNumber] = value;
    console.log(`Pin ${pinNumber} set to ${value}`);
}

// Read the state of a pin (returns 0 or 1)
function readPin(pinNumber) {
    if (typeof pinNumber !== 'number') {
        console.error(`Invalid argument for readPin: pin=${pinNumber}`);
        return null;
    }

    const value = pinStates[pinNumber] ?? 0;
    console.log(`Pin ${pinNumber} read value: ${value}`);
    return value;
}

// Toggle the state of a pin (flip 0 ↔ 1)
function togglePin(pinNumber) {
    if (typeof pinNumber !== 'number') {
        console.error(`Invalid argument for togglePin: pin=${pinNumber}`);
        return;
    }

    const current = pinStates[pinNumber] ?? 0;
    const newValue = current === 0 ? 1 : 0;
    pinStates[pinNumber] = newValue;
    console.log(`Pin ${pinNumber} toggled to ${newValue}`);
    return newValue;
}

// Expose functions globally if needed (for use in browser)
window.setPin = setPin;
window.readPin = readPin;
window.togglePin = togglePin;

// Optional export for module systems (Node.js, ES Modules)
export { setPin, readPin, togglePin };
