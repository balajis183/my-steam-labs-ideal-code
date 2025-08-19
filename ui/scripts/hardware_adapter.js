// Map generator helper names to hardware shims so generated JS can run in preview

// Ensure OLED helpers exist
window.oledDisplay = function(text) {
	try {
		if (typeof writeOLED === 'function') {
			// Show on first line for preview
			writeOLED(0, String(text));
		} else {
			console.log('[OLED]', text);
		}
	} catch (e) {
		console.log('[OLED]', text);
	}
};

// Sensors
window.readLDR = function() {
	if (typeof readAnalog === 'function') return readAnalog(0);
	return Math.floor(Math.random() * 1024);
};

window.readIR = function() {
	if (typeof readDigital === 'function') return readDigital(2);
	return Math.random() > 0.5 ? 1 : 0;
};

window.getDistance = function() {
	// Placeholder ultrasonic distance
	return Math.floor(10 + Math.random() * 90);
};

// Motors
window.motorSpeed = function(speed) {
	console.log('[Motor] speed ->', speed);
};

window.servoWrite = function(angle) {
	console.log('[Servo] angle ->', angle);
};

// Initialize OLED if available
try {
	if (typeof initializeOLED === 'function') {
		initializeOLED();
	}
} catch (e) { /* noop */ }


