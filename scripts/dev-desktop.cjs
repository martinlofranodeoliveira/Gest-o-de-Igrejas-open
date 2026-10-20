const { spawn } = require('child_process');
const http = require('http');

let devProcess;
let electronProcess;
let shuttingDown = false;

function getNpmInvocation(args) {
  const npmExecPath = process.env.npm_execpath;
  const nodeExecPath = process.env.npm_node_execpath;

  if (npmExecPath && nodeExecPath) {
    return {
      command: nodeExecPath,
      args: [npmExecPath, ...args],
    };
  }

  return {
    command: process.platform === 'win32' ? 'npm.cmd' : 'npm',
    args,
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(url, timeoutMs) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const isReady = await new Promise((resolve) => {
      const request = http.get(url, (response) => {
        response.resume();
        resolve(response.statusCode === 200);
      });

      request.on('error', () => resolve(false));
      request.setTimeout(1000, () => {
        request.destroy();
        resolve(false);
      });
    });

    if (isReady) {
      return;
    }

    await sleep(500);
  }

  throw new Error(`Timed out waiting for ${url}`);
}

function terminateChild(child) {
  if (!child || child.killed) {
    return;
  }

  if (process.platform === 'win32') {
    spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore' });
    return;
  }

  child.kill('SIGTERM');
}

function shutdown(exitCode = 0) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  terminateChild(electronProcess);
  terminateChild(devProcess);
  setTimeout(() => process.exit(exitCode), 250);
}

async function main() {
  const devInvocation = getNpmInvocation(['run', 'dev']);

  devProcess = spawn(devInvocation.command, devInvocation.args, {
    stdio: 'inherit',
    shell: false,
  });

  devProcess.on('exit', (code) => {
    if (!shuttingDown) {
      shutdown(code || 1);
    }
  });

  await waitForServer('http://127.0.0.1:3000', 30000);

  const startInvocation = getNpmInvocation(['run', 'start']);

  electronProcess = spawn(startInvocation.command, startInvocation.args, {
    stdio: 'inherit',
    shell: false,
  });

  electronProcess.on('exit', (code) => {
    shutdown(code || 0);
  });
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  shutdown(1);
});
