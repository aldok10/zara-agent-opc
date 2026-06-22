// Platform utilities shared across MCP tools
import { execSync, execFileSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

export const PLATFORM = os.platform();
export const HOME = path.join(os.homedir(), '.zara');

export function ensure(dir) {
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
}

export function loadJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf-8')); }
  catch { return fallback; }
}

export function saveJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), { mode: 0o600 });
}

export function killProcess(pid) {
  const numPid = parseInt(pid, 10);
  if (!Number.isFinite(numPid) || numPid <= 0) return;
  try {
    process.kill(numPid, 'SIGTERM');
  } catch {
    try { process.kill(numPid, 'SIGKILL'); } catch {}
  }
}

export function shellSpawn(cmd, args = [], opts = {}) {
  return spawn(cmd, args, { detached: true, stdio: 'ignore', ...opts });
}

export function hasCommand(cmd) {
  try {
    execFileSync(PLATFORM === 'win32' ? 'where' : 'which', [cmd], { stdio: 'ignore' });
    return true;
  } catch { return false; }
}

export function spawnPipe(cmd1, args1, cmd2, args2, opts = {}) {
  const p1 = spawn(cmd1, args1, { stdio: ['ignore', 'pipe', 'ignore'], ...opts });
  const p2 = spawn(cmd2, args2, { stdio: [p1.stdout, 'ignore', 'ignore'], detached: true, ...opts });
  p2.on('error', () => { killProcess(p1.pid); });
  p1.stdout.on('close', () => {});
  p2.unref();
  return { pid: p2.pid, kill: () => { killProcess(p1.pid); killProcess(p2.pid); } };
}

export function localPlayerArgs(filePath) {
  if (PLATFORM === 'darwin') return { cmd: 'afplay', args: [filePath] };
  if (PLATFORM === 'win32') return { cmd: 'powershell', args: ['-c', `(New-Object Media.SoundPlayer '${filePath.replace(/'/g, "''")}').PlaySync()`] };
  return { cmd: 'ffplay', args: ['-nodisp', '-autoexit', '-loglevel', 'quiet', filePath] };
}
