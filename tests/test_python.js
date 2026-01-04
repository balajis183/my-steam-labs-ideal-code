const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

async function testPythonCode() {
  console.log('🐍 Testing Python Code Generation and Execution...\n');

  // Test 1: Generate sample Python code
  const samplePythonCode = `import os
import machine

print("Board:", os.uname().machine)
print("System:", os.uname().sysname)
print("CPU Frequency:", machine.freq())
print("Unique ID:", machine.unique_id())`;

  console.log('1. Sample Python Code:');
  console.log(samplePythonCode);
  console.log('\n');

  // Test 2: Test Python compilation
  console.log('2. Testing Python Compilation:');
  try {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'python-test-'));
    const pyPath = path.join(tmpDir, 'test.py');
    fs.writeFileSync(pyPath, samplePythonCode, 'utf-8');
    
    // Try different Python executables for Windows compatibility
    const pythonCommands = ['python', 'python3', 'py'];
    let currentIndex = 0;
    
    const tryPython = () => {
      if (currentIndex >= pythonCommands.length) {
        console.log('   ❌ Python not found. Please install Python and ensure it\'s in your PATH.');
        return;
      }
      
      const pythonCmd = pythonCommands[currentIndex];
      exec(`"${pythonCmd}" "${pyPath}"`, (err, stdout, stderr) => {
        if (err) {
          console.log(`   ❌ Python execution failed with '${pythonCmd}':`);
          console.log('   Error:', err.message);
          console.log('   Stderr:', stderr);
          currentIndex++;
          tryPython();
        } else {
          console.log(`   ✅ Python execution successful with '${pythonCmd}':`);
          console.log('   Output:', stdout);
        }
      });
    };
    
    tryPython();
  } catch (err) {
    console.log(`   ❌ Error creating test file: ${err.message}`);
  }

  // Test 3: Test esptool availability (ESP32 uploads use esptool)
  console.log('\n3. Testing esptool:');
  // Try different Python executables for Windows compatibility
  const pythonCommands = ['python', 'python3', 'py'];
  let currentIndex = 0;
  
  const tryEsptool = () => {
    if (currentIndex >= pythonCommands.length) {
      console.log('   ❌ Python not found. Please install Python and ensure it\'s in your PATH.');
      return;
    }
    
    const pythonCmd = pythonCommands[currentIndex];
    exec(`"${pythonCmd}" -m esptool version`, (err, stdout, stderr) => {
      if (err) {
        console.log(`   ❌ esptool not found with '${pythonCmd}'`);
        currentIndex++;
        tryEsptool();
      } else {
        const out = (stdout || stderr || '').trim();
        console.log(`   ✅ esptool available with '${pythonCmd}': ${out.split('\n')[0]}`);
      }
    });
  };
  
  tryEsptool();

  // Test 4: Test serial port detection (migrated to Python)
  console.log('\n4. Testing Serial Port Detection:');
  try {
    // NOTE: SerialPort removed - migrated to Python-based serial handling
    console.log('   ℹ️  Serial port detection migrated to Python (pyserial)');
    console.log('   ℹ️  Run: python -c "import serial.tools.list_ports; print(list(serial.tools.list_ports.comports()))"');
  } catch (err) {
    console.log(`   ❌ Error: ${err.message}`);
  }

  console.log('\n📋 Test Summary:');
  console.log('   - Python code generation should work correctly');
  console.log('   - Language detection should be fixed');
  console.log('   - esptool should be available for ESP32 uploads');
  console.log('   - Serial ports should be detected');
}

// Run the test
testPythonCode().catch(console.error); 