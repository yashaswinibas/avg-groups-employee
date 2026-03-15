// kill-port.js
import { exec } from 'child_process';
import { platform } from 'os';

const isWindows = platform() === 'win32';
const PORT = 3000;

console.log(`🔍 Checking for process on port ${PORT}...`);

if (isWindows) {
  // Windows command to kill process on port 3000
  exec(`for /f "tokens=5" %a in ('netstat -ano ^| findstr :${PORT}') do taskkill /F /PID %a`, (error, stdout, stderr) => {
    if (error) {
      console.log('✅ No process found on port 3000');
    } else {
      console.log('✅ Killed process on port 3000');
    }
    if (stderr) console.error(stderr);
    if (stdout) console.log(stdout);
  });
} else {
  // Mac/Linux command
  exec(`lsof -ti:${PORT} | xargs kill -9`, (error, stdout, stderr) => {
    if (error) {
      console.log('✅ No process found on port 3000');
    } else {
      console.log('✅ Killed process on port 3000');
    }
    if (stderr) console.error(stderr);
    if (stdout) console.log(stdout);
  });
}