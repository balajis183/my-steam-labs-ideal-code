// motor_control.js

import { setPin } from './pin_io.js';

/**
 * MotorController controls a DC motor using two GPIO pins.
 * It can move the motor forward, backward, and stop it.
 */
class MotorController {
    constructor(pinA, pinB) {
        this.pinA = pinA;
        this.pinB = pinB;
    }

    // Move motor forward
    forward() {
        setPin(this.pinA, 1);
        setPin(this.pinB, 0);
        console.log(`Motor moving forward: pin${this.pinA}=1, pin${this.pinB}=0`);
    }

    // Move motor backward
    backward() {
        setPin(this.pinA, 0);
        setPin(this.pinB, 1);
        console.log(`Motor moving backward: pin${this.pinA}=0, pin${this.pinB}=1`);
    }

    // Stop motor
    stop() {
        setPin(this.pinA, 0);
        setPin(this.pinB, 0);
        console.log(`Motor stopped: pin${this.pinA}=0, pin${this.pinB}=0`);
    }
}

// Make available for browser environment
window.MotorController = MotorController;

// Optional export for module environments
export { MotorController };
