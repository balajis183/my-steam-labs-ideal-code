console.log(`
⚠️ PIN MAPPING SYNCHRONIZATION REQUIRED

To ensure code generator uses correct pins:

1. Open PIN MAPPING.pdf
2. Update config/pin_mapping.json with exact GPIO pins from PDF
3. Update PIN_MAPPING object in config/code_generator.js to match
4. Both files MUST have identical pin numbers!

Current status: Check both files manually to ensure they match PIN MAPPING.pdf
`);

