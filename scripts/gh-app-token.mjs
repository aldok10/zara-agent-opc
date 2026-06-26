#!/usr/bin/env node
// gh-app-token.mjs — mint a GitHub App installation token so Zara acts as zara[bot].
// Zero dependencies. Node >= 20 (uses node:crypto for RS256 JWT).
//
// Usage:
//   ZARA_APP_ID=123456 ZARA_APP_KEY=~/.zara/zara-app.pem node scripts/gh-app-token.mjs
//   ZARA_APP_ID=... ZARA_APP_KEY=... node scripts/gh-app-token.mjs --owner aldok10 --repo zara-agent-opc
//
// Prints the installation token to stdout (nothing else), so you can do:
//   TOKEN=$(node scripts/gh-app-token.mjs ...) && GH_TOKEN=$TOKEN gh issue create ...

import { readFileSync } from 'node:fs';
import { createSign } from 'node:crypto';
import { homedir } from 'node:os';

const APP_ID = process.env.ZARA_APP_ID;
const KEY_PATH = (process.env.ZARA_APP_KEY || '').replace(/^~/, homedir());
const args = process.argv.slice(2);
const arg = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : def;
};
const OWNER = arg('owner', 'aldok10');
const REPO = arg('repo', 'zara-agent-opc');

if (!APP_ID || !KEY_PATH) {
  console.error('Missing ZARA_APP_ID or ZARA_APP_KEY env var.');
  console.error('  ZARA_APP_ID=<app id> ZARA_APP_KEY=<path to .pem> node scripts/gh-app-token.mjs');
  process.exit(1);
}

const b64url = (buf) =>
  Buffer.from(buf).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

function makeJwt(appId, privateKey) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = { iat: now - 60, exp: now + 540, iss: String(appId) }; // 9 min, 60s clock skew
  const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  const sig = createSign('RSA-SHA256').update(signingInput).sign(privateKey);
  return `${signingInput}.${b64url(sig)}`;
}

async function gh(path, token, method = 'GET') {
  const res = await fetch(`https://api.github.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'zara-agent',
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub ${method} ${path} -> ${res.status}: ${body}`);
  }
  return res.json();
}

async function main() {
  let privateKey;
  try {
    privateKey = readFileSync(KEY_PATH, 'utf8');
  } catch (e) {
    console.error(`Cannot read private key at ${KEY_PATH}: ${e.message}`);
    process.exit(1);
  }

  // Key age check: warn if > 90 days old
  const { statSync } = await import('node:fs');
  const keyAge = (Date.now() - statSync(KEY_PATH).mtimeMs) / (1000 * 60 * 60 * 24);
  if (keyAge > 90) {
    console.error(`WARNING: Private key is ${Math.floor(keyAge)} days old. Rotate at https://github.com/settings/apps/zara-agent`);
  }

  const jwt = makeJwt(APP_ID, privateKey);

  // Find the installation for this repo
  const installation = await gh(`/repos/${OWNER}/${REPO}/installation`, jwt);
  const tokenResp = await gh(
    `/app/installations/${installation.id}/access_tokens`,
    jwt,
    'POST',
  );

  // Only the token to stdout. Everything else to stderr.
  console.error(`Installation ${installation.id} for ${OWNER}/${REPO}, token expires ${tokenResp.expires_at}`);
  process.stdout.write(tokenResp.token);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
