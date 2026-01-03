/**
 * Helper script to download mklittlefs.exe for Windows
 * Run with: node download-mklittlefs.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const MKLITTLEFS_URL = 'https://github.com/earlephilhower/mklittlefs/releases/download/3.0.0/mklittlefs.exe';
const OUTPUT_PATH = path.join(__dirname, 'mklittlefs.exe');

console.log('📥 Downloading mklittlefs.exe...');
console.log(`   From: ${MKLITTLEFS_URL}`);
console.log(`   To: ${OUTPUT_PATH}`);
console.log('');

const file = fs.createWriteStream(OUTPUT_PATH);

https.get(MKLITTLEFS_URL, (response) => {
  if (response.statusCode === 302 || response.statusCode === 301) {
    // Handle redirect
    https.get(response.headers.location, (redirectResponse) => {
      redirectResponse.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log('✅ mklittlefs.exe downloaded successfully!');
        console.log(`   Location: ${OUTPUT_PATH}`);
        console.log('');
        console.log('💡 You can now use the upload feature.');
      });
    });
  } else {
    response.pipe(file);
    file.on('finish', () => {
      file.close();
      console.log('✅ mklittlefs.exe downloaded successfully!');
      console.log(`   Location: ${OUTPUT_PATH}`);
      console.log('');
      console.log('💡 You can now use the upload feature.');
    });
  }
}).on('error', (err) => {
  fs.unlink(OUTPUT_PATH, () => {}); // Delete the file on error
  console.error('❌ Download failed:', err.message);
  console.log('');
  console.log('📝 Manual download instructions:');
  console.log('   1. Visit: https://github.com/earlephilhower/mklittlefs/releases');
  console.log('   2. Download the latest mklittlefs.exe for Windows');
  console.log(`   3. Place it in: ${__dirname}`);
  process.exit(1);
});

