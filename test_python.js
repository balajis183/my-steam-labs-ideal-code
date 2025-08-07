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
    
    exec(`python "${pyPath}"`, (err, stdout, stderr) => {
      if (err) {
        console.log('   ❌ Python execution failed:');
        console.log('   Error:', err.message);
        console.log('   Stderr:', stderr);
      } else {
        console.log('   ✅ Python execution successful:');
        console.log('   Output:', stdout);
      }
    });
  } catch (err) {
    console.log(`   ❌ Error creating test file: ${err.message}`);
  }

  // Test 3: Test mpremote availability
  console.log('\n3. Testing mpremote:');
  exec('mpremote --version', (err, stdout, stderr) => {
    if (err) {
      console.log('   ❌ mpremote not found');
      console.log('   Please install with: pip install mpremote');
    } else {
      console.log(`   ✅ mpremote available: ${stdout.trim()}`);
    }
  });

  // Test 4: Test serial port detection
  console.log('\n4. Testing Serial Port Detection:');
  try {
    const { SerialPort } = require('serialport');
    const ports = await SerialPort.list();
    console.log(`   ✅ Found ${ports.length} serial port(s):`);
    ports.forEach(port => {
      console.log(`      - ${port.path} (${port.manufacturer || 'Unknown'})`);
    });
  } catch (err) {
    console.log(`   ❌ Error listing ports: ${err.message}`);
  }

  console.log('\n📋 Test Summary:');
  console.log('   - Python code generation should work correctly');
  console.log('   - Language detection should be fixed');
  console.log('   - mpremote should be available for ESP32');
  console.log('   - Serial ports should be detected');
}

// Run the test
testPythonCode().catch(console.error); 