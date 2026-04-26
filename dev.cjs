const { spawn } = require('child_process');

const server = spawn('node', [
  'node_modules/ts-node-dev/lib/bin.js',
  '--quiet', '--respawn', '--transpile-only', 'server/index.ts'
], {
  cwd: __dirname,
  stdio: ['ignore', 'pipe', 'pipe'],
});

const client = spawn('node', [
  'node_modules/vite/bin/vite.js'
], {
  cwd: __dirname,
  stdio: ['ignore', 'pipe', 'pipe'],
});

let serverReady = false;
let clientReady = false;
let clientUrl = '';
let printed = false;

function checkReady() {
  if (printed) return;
  if (serverReady && clientReady) {
    printed = true;
    console.log('');
    console.log('\x1b[36m========================================\x1b[0m');
    console.log('\x1b[32m  启动成功！请访问 ' + clientUrl + '\x1b[0m');
    console.log('\x1b[32m  按 Ctrl+C 可停止服务\x1b[0m');
    console.log('\x1b[36m========================================\x1b[0m');
    console.log('');
  }
}

function handleOutput(data) {
  const lines = data.toString().split('\n').map(l => l.trim()).filter(Boolean);

  for (const rawLine of lines) {
    const line = rawLine.replace(/\x1b\[[0-9;]*m/g, '');

    const serverMatch = line.match(/Server running on (http:\/\/localhost:\d+)/);
    if (serverMatch) {
      serverReady = true;
      checkReady();
      continue;
    }

    const viteMatch = line.match(/Local:\s+(http:\/\/localhost:\d+)/);
    if (viteMatch) {
      clientUrl = viteMatch[1];
      clientReady = true;
      checkReady();
      continue;
    }

    if (line && (line.includes('Error') || line.includes('EADDRINUSE'))) {
      if (!line.includes('[INFO]') && !line.includes('watching') && !line.includes('DeprecationWarning')) {
        console.error('\x1b[31m' + line + '\x1b[0m');
      }
    }
  }
}

server.stdout.on('data', handleOutput);
server.stderr.on('data', handleOutput);
client.stdout.on('data', handleOutput);
client.stderr.on('data', handleOutput);

process.on('SIGINT', () => {
  server.kill();
  client.kill();
  process.exit(0);
});

process.on('exit', () => {
  server.kill();
  client.kill();
});
