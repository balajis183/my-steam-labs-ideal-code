// NOTE: SerialPort removed - migrated to Python-based serial handling
// const { SerialPort } = require('serialport');
const { exec } = require('child_process');

async function testHardwareConnectivity() {
  console.log('🔍 Testing Hardware Connectivity...\n');

  // Test 1: List Serial Ports (using Python now)
  console.log('1. Testing Serial Port Detection:');
  try {
    // Serial ports now detected via Python pyserial
    console.log('   ℹ️  Serial port detection migrated to Python (pyserial)');
    console.log('   ℹ️  Run: python -c "import serial.tools.list_ports; print(list(serial.tools.list_ports.comports()))"');
  } catch (err) {
    console.log(`   ❌ Error: ${err.message}`);
  }

  // Test 2: Check esptool availability (ESP32 uploads use esptool)
  console.log('\n2. Testing esptool availability:');
  try {
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
  } catch (err) {
    console.log(`   ❌ Error checking esptool: ${err.message}`);
  }

  // Test 3: Check Python availability
  console.log('\n3. Testing Python availability:');
  try {
    // Try different Python executables for Windows compatibility
    const pythonCommands = ['python', 'python3', 'py'];
    let currentIndex = 0;
    
    const tryPython = () => {
      if (currentIndex >= pythonCommands.length) {
        console.log('   ❌ Python not found. Please install Python and ensure it\'s in your PATH.');
        return;
      }
      
      const pythonCmd = pythonCommands[currentIndex];
      exec(`${pythonCmd} --version`, (err, stdout, stderr) => {
        if (err) {
          console.log(`   ❌ Python command '${pythonCmd}' not found`);
          currentIndex++;
          tryPython();
        } else {
          console.log(`   ✅ Python available with '${pythonCmd}': ${stdout.trim()}`);
        }
      });
    };
    
    tryPython();
  } catch (err) {
    console.log(`   ❌ Error checking Python: ${err.message}`);
  }

  // Test 4: Check GCC availability
  console.log('\n4. Testing GCC availability:');
  try {
    exec('gcc --version', (err, stdout, stderr) => {
      if (err) {
        console.log('   ❌ GCC not found. Please install a C/C++ compiler');
      } else {
        console.log(`   ✅ GCC available: ${stdout.split('\n')[0]}`);
      }
    });
  } catch (err) {
    console.log(`   ❌ Error checking GCC: ${err.message}`);
  }

  // Test 5: Check Node.js availability
  console.log('\n5. Testing Node.js availability:');
  try {
    exec('node --version', (err, stdout, stderr) => {
      if (err) {
        console.log('   ❌ Node.js not found');
      } else {
        console.log(`   ✅ Node.js available: ${stdout.trim()}`);
      }
    });
  } catch (err) {
    console.log(`   ❌ Error checking Node.js: ${err.message}`);
  }

  console.log('\n📋 Hardware Connectivity Summary:');
  console.log('   - Serial ports will be detected automatically');
  console.log('   - Python uploads require esptool for ESP32');
  console.log('   - C/C++ compilation requires GCC');
  console.log('   - JavaScript execution requires Node.js');
  console.log('   - All operations show output in terminal');
}

// Run the test
testHardwareConnectivity().catch(console.error); 