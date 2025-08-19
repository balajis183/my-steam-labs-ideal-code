const { SerialPort } = require('serialport');
const { exec } = require('child_process');

async function testHardwareConnectivity() {
  console.log('🔍 Testing Hardware Connectivity...\n');

  // Test 1: List Serial Ports
  console.log('1. Testing Serial Port Detection:');
  try {
    const ports = await SerialPort.list();
    console.log(`   ✅ Found ${ports.length} serial port(s):`);
    ports.forEach(port => {
      console.log(`      - ${port.path} (${port.manufacturer || 'Unknown'})`);
    });
  } catch (err) {
    console.log(`   ❌ Error listing ports: ${err.message}`);
  }

  // Test 2: Check mpremote availability
  console.log('\n2. Testing mpremote availability:');
  try {
    exec('mpremote --version', (err, stdout, stderr) => {
      if (err) {
        console.log('   ❌ mpremote not found. Please install it with: pip install mpremote');
      } else {
        console.log(`   ✅ mpremote available: ${stdout.trim()}`);
      }
    });
  } catch (err) {
    console.log(`   ❌ Error checking mpremote: ${err.message}`);
  }

  // Test 3: Check Python availability
  console.log('\n3. Testing Python availability:');
  try {
    exec('python --version', (err, stdout, stderr) => {
      if (err) {
        console.log('   ❌ Python not found in PATH');
      } else {
        console.log(`   ✅ Python available: ${stdout.trim()}`);
      }
    });
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
  console.log('   - Python uploads require mpremote for ESP32');
  console.log('   - C/C++ compilation requires GCC');
  console.log('   - JavaScript execution requires Node.js');
  console.log('   - All operations show output in terminal');
}

// Run the test
testHardwareConnectivity().catch(console.error); 