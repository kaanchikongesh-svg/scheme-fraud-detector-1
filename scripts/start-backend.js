import { spawn, execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';
import http from 'http';

const rootDir = process.cwd();

// Find python executable
function getPythonExecutable() {
  const candidates = [
    join(rootDir, '.venv', 'Scripts', 'python.exe'),
    join(rootDir, '.venv', 'bin', 'python'),
    'python',
    'python3',
    'py'
  ];

  for (const cmd of candidates) {
    if (cmd.includes('/') || cmd.includes('\\')) {
      if (existsSync(cmd)) return cmd;
    } else {
      try {
        execSync(`${cmd} --version`, { stdio: 'ignore' });
        return cmd;
      } catch {}
    }
  }
  return 'python';
}

function checkBackendRunning() {
  return new Promise((res) => {
    const req = http.get('http://127.0.0.1:8000/health', (response) => {
      res(response.statusCode === 200);
    });
    req.on('error', () => res(false));
    req.setTimeout(1000, () => {
      req.destroy();
      res(false);
    });
  });
}

async function start() {
  const isRunning = await checkBackendRunning();
  if (isRunning) {
    console.log('\x1b[32m[Backend]\x1b[0m FastAPI backend is already active and healthy on http://127.0.0.1:8000');
    // Keep alive so concurrently doesn't close
    setInterval(async () => {
      await checkBackendRunning();
    }, 10000);
    return;
  }

  const pythonExec = getPythonExecutable();
  console.log(`\x1b[36m[Backend]\x1b[0m Starting FastAPI uvicorn server using: ${pythonExec}...`);

  const args = [
    '-m',
    'uvicorn',
    'main:app',
    '--app-dir',
    'backend',
    '--host',
    '0.0.0.0',
    '--port',
    '8000',
    '--reload'
  ];

  const child = spawn(pythonExec, args, {
    cwd: rootDir,
    stdio: 'inherit',
    shell: process.platform === 'win32' && !pythonExec.includes('\\')
  });

  child.on('error', (err) => {
    console.error('\x1b[31m[Backend Error]\x1b[0m Failed to start backend:', err.message);
  });

  child.on('exit', (code, signal) => {
    if (code !== 0 && code !== null) {
      console.log(`\x1b[33m[Backend]\x1b[0m Process exited with code ${code}`);
    }
  });

  const cleanup = () => {
    if (child && !child.killed) {
      child.kill('SIGTERM');
    }
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}

start();
