# MicroPython Stubs for IDE Support
# This file helps IDEs understand MicroPython modules and removes red squiggly lines

# Machine module stubs
class machine:
    """MicroPython machine module for hardware access"""
    
    @staticmethod
    def freq() -> int:
        """Get CPU frequency in Hz"""
        pass
    
    @staticmethod
    def unique_id() -> bytes:
        """Get unique board ID"""
        pass
    
    class Pin:
        """GPIO Pin class"""
        def __init__(self, pin_id: int, mode: int = None, pull: int = None):
            pass
        
        def on(self):
            """Turn pin on"""
            pass
        
        def off(self):
            """Turn pin off"""
            pass
        
        def value(self, val: int = None) -> int:
            """Get or set pin value"""
            pass
    
    class ADC:
        """Analog to Digital Converter"""
        def __init__(self, pin):
            pass
        
        def read(self) -> int:
            """Read ADC value"""
            pass
    
    class PWM:
        """Pulse Width Modulation"""
        def __init__(self, pin, freq: int = None, duty: int = None):
            pass
        
        def freq(self, freq: int = None) -> int:
            """Get or set frequency"""
            pass
        
        def duty(self, duty: int = None) -> int:
            """Get or set duty cycle"""
            pass
    
    class I2C:
        """I2C communication"""
        def __init__(self, id: int, scl=None, sda=None, freq: int = 400000):
            pass
        
        def scan(self) -> list:
            """Scan for I2C devices"""
            pass
        
        def readfrom(self, addr: int, nbytes: int) -> bytes:
            """Read from I2C device"""
            pass
        
        def writeto(self, addr: int, buf: bytes) -> int:
            """Write to I2C device"""
            pass
    
    class SPI:
        """SPI communication"""
        def __init__(self, id: int, baudrate: int = 1000000, polarity: int = 0, phase: int = 0):
            pass
        
        def read(self, nbytes: int) -> bytes:
            """Read from SPI"""
            pass
        
        def write(self, buf: bytes) -> int:
            """Write to SPI"""
            pass
    
    class UART:
        """UART communication"""
        def __init__(self, id: int, baudrate: int = 115200, bits: int = 8, parity=None, stop: int = 1):
            pass
        
        def read(self, nbytes: int = None) -> bytes:
            """Read from UART"""
            pass
        
        def write(self, buf: bytes) -> int:
            """Write to UART"""
            pass
        
        def any(self) -> int:
            """Check if data available"""
            pass
    
    class Timer:
        """Hardware timer"""
        def __init__(self, id: int, mode: int = None, freq: int = None, period: int = None, callback=None):
            pass
        
        def init(self, mode: int = None, freq: int = None, period: int = None, callback=None):
            """Initialize timer"""
            pass
        
        def deinit(self):
            """Deinitialize timer"""
            pass
    
    class RTC:
        """Real Time Clock"""
        def __init__(self, id: int = 0):
            pass
        
        def datetime(self, datetimetuple=None):
            """Get or set datetime"""
            pass
    
    class WDT:
        """Watchdog Timer"""
        def __init__(self, id: int = 0, timeout: int = 5000):
            pass
        
        def feed(self):
            """Feed the watchdog"""
            pass

# OS module stubs for MicroPython
class os:
    """MicroPython os module"""
    
    @staticmethod
    def uname():
        """Get system information"""
        class UnameResult:
            def __init__(self):
                self.sysname = "MicroPython"
                self.nodename = "esp32"
                self.release = "1.19.1"
                self.version = "v1.19.1"
                self.machine = "ESP32 module with ESP32"
        
        return UnameResult()
    
    @staticmethod
    def listdir(path: str = "/") -> list:
        """List directory contents"""
        pass
    
    @staticmethod
    def mkdir(path: str):
        """Create directory"""
        pass
    
    @staticmethod
    def remove(path: str):
        """Remove file"""
        pass
    
    @staticmethod
    def rename(old_path: str, new_path: str):
        """Rename file or directory"""
        pass
    
    @staticmethod
    def stat(path: str):
        """Get file status"""
        pass
    
    @staticmethod
    def chdir(path: str):
        """Change current directory"""
        pass
    
    @staticmethod
    def getcwd() -> str:
        """Get current working directory"""
        pass

# Additional MicroPython modules
class time:
    """MicroPython time module"""
    
    @staticmethod
    def sleep(seconds: float):
        """Sleep for given seconds"""
        pass
    
    @staticmethod
    def sleep_ms(milliseconds: int):
        """Sleep for given milliseconds"""
        pass
    
    @staticmethod
    def sleep_us(microseconds: int):
        """Sleep for given microseconds"""
        pass
    
    @staticmethod
    def ticks_ms() -> int:
        """Get ticks in milliseconds"""
        pass
    
    @staticmethod
    def ticks_us() -> int:
        """Get ticks in microseconds"""
        pass
    
    @staticmethod
    def ticks_diff(end: int, start: int) -> int:
        """Calculate difference between ticks"""
        pass

class gc:
    """Garbage collector"""
    
    @staticmethod
    def collect():
        """Run garbage collection"""
        pass
    
    @staticmethod
    def mem_free() -> int:
        """Get free memory in bytes"""
        pass
    
    @staticmethod
    def mem_alloc() -> int:
        """Get allocated memory in bytes"""
        pass

# Network module
class network:
    """Network module"""
    
    class WLAN:
        """WiFi interface"""
        def __init__(self, interface_id: int):
            pass
        
        def active(self, status: bool = None) -> bool:
            """Activate/deactivate WiFi"""
            pass
        
        def connect(self, ssid: str, password: str):
            """Connect to WiFi network"""
            pass
        
        def disconnect(self):
            """Disconnect from WiFi"""
            pass
        
        def isconnected(self) -> bool:
            """Check if connected"""
            pass
        
        def ifconfig(self) -> tuple:
            """Get network interface configuration"""
            pass

# This tells the IDE that these are valid imports
__all__ = ['machine', 'os', 'time', 'gc', 'network'] 