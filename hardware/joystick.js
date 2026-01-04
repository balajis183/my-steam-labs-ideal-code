// joystick.js - Joystick control module for Steam Labs

/**
 * Simulated joystick values storage
 * Key: joystick ID, Value: { vertical: 0-1023, horizontal: 0-1023, button: 0/1 }
 */
const joystickStates = {
    joystick1: { vertical: 512, horizontal: 512, button: 0 },
    joystick2: { vertical: 512, horizontal: 512, button: 0 }
};

/**
 * Sets a simulated value for a joystick.
 * @param {string} joystickId - The joystick identifier ('joystick1' or 'joystick2').
 * @param {number} vertical - Vertical axis value (0-1023, 512 is center).
 * @param {number} horizontal - Horizontal axis value (0-1023, 512 is center).
 * @param {number} button - Button state (0 or 1).
 */
function setJoystickValue(joystickId, vertical, horizontal, button = 0) {
    if (!joystickStates[joystickId]) {
        console.error(`Invalid joystick ID: ${joystickId}`);
        return;
    }
    
    joystickStates[joystickId] = {
        vertical: Math.max(0, Math.min(1023, vertical)),
        horizontal: Math.max(0, Math.min(1023, horizontal)),
        button: button ? 1 : 0
    };
    
    console.log(`${joystickId} updated: V=${vertical}, H=${horizontal}, BTN=${button}`);
}

/**
 * Reads the current state of a joystick.
 * @param {string} joystickId - The joystick identifier ('joystick1' or 'joystick2').
 * @returns {Object} - Object with vertical, horizontal, and button properties.
 */
function readJoystick(joystickId) {
    if (!joystickStates[joystickId]) {
        console.error(`Invalid joystick ID: ${joystickId}`);
        return { vertical: 0, horizontal: 0, button: 0 };
    }
    
    const state = joystickStates[joystickId];
    console.log(`Reading ${joystickId}: V=${state.vertical}, H=${state.horizontal}, BTN=${state.button}`);
    return { ...state };
}

/**
 * Reads only the vertical axis of a joystick.
 * @param {string} joystickId - The joystick identifier.
 * @returns {number} - Vertical axis value (0-1023).
 */
function readJoystickVertical(joystickId) {
    const state = readJoystick(joystickId);
    return state.vertical;
}

/**
 * Reads only the horizontal axis of a joystick.
 * @param {string} joystickId - The joystick identifier.
 * @returns {number} - Horizontal axis value (0-1023).
 */
function readJoystickHorizontal(joystickId) {
    const state = readJoystick(joystickId);
    return state.horizontal;
}

/**
 * Reads only the button state of a joystick.
 * @param {string} joystickId - The joystick identifier.
 * @returns {number} - Button state (0 or 1).
 */
function readJoystickButton(joystickId) {
    const state = readJoystick(joystickId);
    return state.button;
}

/**
 * Checks if joystick is in center position (neutral).
 * @param {string} joystickId - The joystick identifier.
 * @param {number} tolerance - Tolerance range from center (default: 50).
 * @returns {boolean} - True if joystick is centered.
 */
function isJoystickCentered(joystickId, tolerance = 50) {
    const state = readJoystick(joystickId);
    const centerV = Math.abs(state.vertical - 512) < tolerance;
    const centerH = Math.abs(state.horizontal - 512) < tolerance;
    return centerV && centerH;
}

/**
 * Gets the direction of joystick movement.
 * @param {string} joystickId - The joystick identifier.
 * @returns {string} - Direction: 'up', 'down', 'left', 'right', 'center', or 'diagonal'.
 */
function getJoystickDirection(joystickId) {
    const state = readJoystick(joystickId);
    const threshold = 100; // Threshold for detecting movement from center
    
    const deltaV = state.vertical - 512;
    const deltaH = state.horizontal - 512;
    
    // Check if centered
    if (Math.abs(deltaV) < threshold && Math.abs(deltaH) < threshold) {
        return 'center';
    }
    
    // Determine primary direction
    if (Math.abs(deltaV) > Math.abs(deltaH)) {
        return deltaV > 0 ? 'down' : 'up';
    } else {
        return deltaH > 0 ? 'right' : 'left';
    }
}

/**
 * JoystickController class for managing a single joystick.
 */
class JoystickController {
    constructor(joystickId) {
        if (!joystickStates[joystickId]) {
            throw new Error(`Invalid joystick ID: ${joystickId}`);
        }
        this.id = joystickId;
    }
    
    read() {
        return readJoystick(this.id);
    }
    
    getVertical() {
        return readJoystickVertical(this.id);
    }
    
    getHorizontal() {
        return readJoystickHorizontal(this.id);
    }
    
    getButton() {
        return readJoystickButton(this.id);
    }
    
    isCentered(tolerance = 50) {
        return isJoystickCentered(this.id, tolerance);
    }
    
    getDirection() {
        return getJoystickDirection(this.id);
    }
    
    setValue(vertical, horizontal, button = 0) {
        setJoystickValue(this.id, vertical, horizontal, button);
    }
}

// Make available globally for browser environment
if (typeof window !== 'undefined') {
    window.setJoystickValue = setJoystickValue;
    window.readJoystick = readJoystick;
    window.readJoystickVertical = readJoystickVertical;
    window.readJoystickHorizontal = readJoystickHorizontal;
    window.readJoystickButton = readJoystickButton;
    window.isJoystickCentered = isJoystickCentered;
    window.getJoystickDirection = getJoystickDirection;
    window.JoystickController = JoystickController;
}

// Optional export for ES modules
export {
    setJoystickValue,
    readJoystick,
    readJoystickVertical,
    readJoystickHorizontal,
    readJoystickButton,
    isJoystickCentered,
    getJoystickDirection,
    JoystickController
};

