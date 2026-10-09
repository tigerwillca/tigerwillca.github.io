#!/usr/bin/env node
// Build + sign a Ceres Apple Wallet pass (.pkpass). Runs on a SERVER, never in the browser.
// Secrets come only from env vars; nothing is committed.
//   PASS_TYPE_ID        e.g. pass.io.github.tigerwillca.ceres
//   APPLE_TEAM_ID       10-char Apple Developer Team ID
//   PASS_CERT_PATH      Pass Type ID certificate (PEM)
//   PASS_KEY_PATH       its private key (PEM)
//   PASS_KEY_PASSPHRASE optional, key passphrase
//   WWDR_CERT_PATH      Apple WWDR intermediate (G4) (PEM)
//   GATE_URL            default https://tigerwillca.github.io/gate/
// Usage: node sign-pass.mjs --name "Jane Doe" [--out ./out/ceres.pkpass]
import { readFileSync, writeFileSync, mkdtempSync, copyFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith('--') ? [...a, [v.slice(2), arr[i + 1]]] : a), []));
const need = ['PASS_TYPE_ID', 'APPLE_TEAM_ID', 'PASS_CERT_PATH', 'PASS_KEY_PATH', 'WWDR_CERT_PATH'];
const missing = need.filter((k) => !process.env[k]);
if (missing.length) { console.error('Missing env: ' + missing.join(', ')); process.exit(2); }
for (const k of ['PASS_CERT_PATH', 'PASS_KEY_PATH', 'WWDR_CERT_PATH']) if (!existsSync(process.env[k])) { console.error(k + ' not found'); process.exit(2); }

const name = String(args.name || '').replace(/[^\p{L}\p{N} .'\-]/gu, '').trim().slice(0, 40);
if (!name) { console.error('--name required'); process.exit(2); }
const vals = {
  PASS_TYPE_ID: process.env.PASS_TYPE_ID,
  APPLE_TEAM_ID: process.env.APPLE_TEAM_ID,
  SERIAL: 'CERES-' + randomUUID(),
  NAME: name,
  GATE_URL: process.env.GATE_URL || 'https://tigerwillca.github.io/gate/',
};
const tpl = readFileSync(join(here, 'pass.template.json'), 'utf8');
const passJson = JSON.stringify(JSON.parse(tpl.replace(/\$\{(\w+)\}/g, (_, k) => JSON.stringify(vals[k] ?? '').slice(1, -1))), null, 2);

const dir = mkdtempSync(join(tmpdir(), 'ceres-pass-'));
writeFileSync(join(dir, 'pass.json'), passJson);
for (const f of readdirSync(join(here, 'assets'))) copyFileSync(join(here, 'assets', f), join(dir, f));

const manifest = {};
for (const f of readdirSync(dir)) manifest[f] = createHash('sha1').update(readFileSync(join(dir, f))).digest('hex');
writeFileSync(join(dir, 'manifest.json'), JSON.stringify(manifest));

const sslArgs = ['smime', '-binary', '-sign', '-certfile', process.env.WWDR_CERT_PATH, '-signer', process.env.PASS_CERT_PATH,
  '-inkey', process.env.PASS_KEY_PATH, '-in', join(dir, 'manifest.json'), '-out', join(dir, 'signature'), '-outform', 'DER'];
if (process.env.PASS_KEY_PASSPHRASE) sslArgs.push('-passin', 'env:PASS_KEY_PASSPHRASE');
execFileSync('openssl', sslArgs, { stdio: 'inherit' });

const out = resolve(args.out || join(process.cwd(), 'ceres.pkpass'));
mkdirSync(dirname(out), { recursive: true });
const files = readdirSync(dir).map((f) => join(dir, f));
try { execFileSync('zip', ['-q', '-j', '-X', out, ...files]); }
catch (e) {
  if (e.code !== 'ENOENT') throw e; // no zip binary: fall back to python3 zipfile
  execFileSync('python3', ['-c', 'import sys,zipfile,os\nz=zipfile.ZipFile(sys.argv[1],"w",zipfile.ZIP_DEFLATED)\nfor f in sys.argv[2:]: z.write(f,os.path.basename(f))\nz.close()', out, ...files]);
}
console.log(JSON.stringify({ out, serial: vals.SERIAL }));
