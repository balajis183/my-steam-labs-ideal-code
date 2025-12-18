/**
 * Pin Mapping Synchronization Helper
 * 
 * This script helps keep pin_mapping.json and code_generator.js in sync.
 * 
 * Usage:
 * 1. Update pin_mapping.json with exact pins from PIN MAPPING.pdf
 * 2. Run this script to sync code_generator.js
 * 3. Or manually update both files to match
 */

// This is a reference - actual sync should be done manually or via build script
// For now, ensure both files match exactly!

console.log(`
⚠️ PIN MAPPING SYNCHRONIZATION REQUIRED

To ensure code generator uses correct pins:

1. Open PIN MAPPING.pdf
2. Update config/pin_mapping.json with exact GPIO pins from PDF
3. Update PIN_MAPPING object in config/code_generator.js to match
4. Both files MUST have identical pin numbers!

Current status: Check both files manually to ensure they match PIN MAPPING.pdf
`);

