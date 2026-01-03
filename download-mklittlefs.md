# Download mklittlefs for ESP32 Upload

## Quick Setup

1. **Download mklittlefs.exe:**
   - Go to: https://github.com/littlefs-project/littlefs/releases
   - Download the latest Windows release (look for `mklittlefs-windows.zip` or similar)
   - Extract `mklittlefs.exe`

2. **Place in Project Folder:**
   - Copy `mklittlefs.exe` to this folder:
     ```
     my-steam-labs-ideal-code/
     ├── mklittlefs.exe  ← Place here
     ├── package.json
     └── ...
     ```

3. **Done!** The upload system will automatically find and use it.

## Alternative: Add to PATH

If you prefer to add it to your system PATH:
1. Create a folder like `C:\tools\`
2. Place `mklittlefs.exe` there
3. Add `C:\tools\` to your Windows PATH environment variable

## Verify Installation

After placing `mklittlefs.exe`, restart the application and try uploading. The system will automatically detect it.

