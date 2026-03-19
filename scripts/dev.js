const { spawn } = require('child_process');
const path = require('path');

const npmCli = process.env.npm_execpath;

function startProcess(name, cwd) {
  if (!npmCli) {
    throw new Error('Unable to locate npm CLI path (npm_execpath is missing).');
  }

  return spawn(process.execPath, [npmCli, 'run', 'dev'], {
    cwd,
    stdio: 'inherit',
    env: process.env,
  });
}

const rootDir = path.resolve(__dirname, '..');
const backendProcess = startProcess('backend', path.join(rootDir, 'backend'));
const frontendProcess = startProcess('frontend', path.join(rootDir, 'frontend'));

let shuttingDown = false;

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;

  if (backendProcess && !backendProcess.killed) {
    backendProcess.kill('SIGINT');
  }
  if (frontendProcess && !frontendProcess.killed) {
    frontendProcess.kill('SIGINT');
  }

  setTimeout(() => process.exit(code), 300);
}

backendProcess.on('exit', (code) => {
  if (!shuttingDown && code !== 0) {
    console.error(`Backend exited with code ${code}`);
    shutdown(code || 1);
  }
});

frontendProcess.on('exit', (code) => {
  if (!shuttingDown && code !== 0) {
    console.error(`Frontend exited with code ${code}`);
    shutdown(code || 1);
  }
});

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
