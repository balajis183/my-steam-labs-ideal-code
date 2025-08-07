// oled_display.js

let displayBuffer = [];

/**
 * Initializes the OLED display simulation.
 */
function initializeOLED() {
    displayBuffer = Array(8).fill(" ".repeat(16));
    console.log("OLED Display initialized.");
    refreshOLED();
}

/**
 * Clears the OLED display.
 */
function clearOLED() {
    displayBuffer = Array(8).fill(" ".repeat(16));
    console.log("OLED Display cleared.");
    refreshOLED();
}

/**
 * Displays text on a specific line of the OLED display.
 * @param {number} line - Line number (0-7).
 * @param {string} text - Text to display.
 */
function writeOLED(line, text) {
    if (line < 0 || line >= displayBuffer.length) {
        console.warn("Invalid OLED line number");
        return;
    }

    displayBuffer[line] = text.padEnd(16).slice(0, 16);
    refreshOLED();
}

/**
 * Refreshes the simulated OLED screen (console output).
 */
function refreshOLED() {
    console.clear();
    console.log("=== OLED Display ===");
    displayBuffer.forEach((line, i) => {
        console.log(`${i}: ${line}`);
    });
    console.log("====================");
}

// Global access for browser testing
window.initializeOLED = initializeOLED;
window.clearOLED = clearOLED;
window.writeOLED = writeOLED;

// Optional export for modules
export {
    initializeOLED,
    clearOLED,
    writeOLED
};
