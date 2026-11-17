// npm audit --audit-level=high con un elenco di advisory senza versione corretta, controllate a mano.
// Esce con 1 se resta una vulnerabilità alta o critica dovuta a un'advisory fuori elenco. Uso: node npm-audit-high.mjs (nella cartella del progetto).
import { execFileSync } from 'node:child_process';
const ALLOW = new Map([
  // picomatch <= 4.0.7, nessuna versione corretta (17/11/2026): solo strumenti di build (vite, astro check), mai input esterni.
  ['GHSA-fc5q-39xc-vjpf', 'picomatch, nessuna correzione pubblicata'],
]);
let out;
try { out = execFileSync('npm', ['audit', '--json'], { encoding: 'utf8', maxBuffer: 64 << 20 }); } catch (e) { out = e.stdout; }
const report = JSON.parse(out);
const bad = new Set();
for (const v of Object.values(report.vulnerabilities ?? {})) {
  for (const via of v.via ?? []) {
    if (typeof via !== 'object') continue;
    if (!['high', 'critical'].includes(via.severity)) continue;
    const id = String(via.url ?? '').split('/').pop();
    if (!ALLOW.has(id)) bad.add(`${id} (${via.name}, ${via.severity})`);
  }
}
for (const [id, why] of ALLOW) console.log(`ammessa: ${id} — ${why}`);
if (bad.size) { console.log('advisory alte o critiche non ammesse:\n' + [...bad].join('\n')); process.exit(1); }
console.log('npm audit: nessuna advisory alta o critica fuori elenco');
