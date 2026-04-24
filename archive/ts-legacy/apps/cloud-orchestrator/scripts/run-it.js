import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const root = join(__dirname, '..');
const logStream = fs.createWriteStream(join(root, 'run-it.log'), { flags: 'a' });

function spawnProcess(command, args, cwd, name) {
  logStream.write(`[${name}] Spawning ${command} ${args.join(' ')} in ${cwd}\n`);
  
  // Create a clean environment to avoid PowerShell 'HOME'/'Home' duplicate key errors
  const env = { ...process.env };
  delete env.HOME;
  delete env.Home;

  const child = spawn(command, args, {
    cwd,
    detached: true,
    stdio: 'ignore',
    shell: true,
    env
  });
  child.unref();
  logStream.write(`[${name}] Spawned with PID ${child.pid}\n`);
}

// Spawn Go Backend
spawnProcess(join(root, 'backend-go', 'backend.exe'), [], join(root, 'backend-go'), 'GoBackend');

// Spawn Vite
spawnProcess('pnpm', ['run', 'dev'], root, 'Vite');

logStream.write('Spawn attempt complete.\n');
logStream.end();
