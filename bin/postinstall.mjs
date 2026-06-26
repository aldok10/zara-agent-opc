#!/usr/bin/env node
// Post-install: create ~/.zara directory structure silently
import fs from 'fs';
import path from 'path';
import os from 'os';

const home = path.join(os.homedir(), '.zara');
const dirs = ['memory', 'reflections', 'metrics', 'knowledge', 'skills', 'sessions', 'agents', 'evolve', 'scratch'];

for (const d of dirs) {
  const p = path.join(home, d);
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}
