// Carga opcional de .env (raiz del repo) sin dependencias. No pisa variables ya definidas en el entorno.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function loadEnvFile(file = path.join(ROOT, '.env')) {
  let text;
  try { text = fs.readFileSync(file, 'utf8'); } catch { return 0; }
  let n = 0;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const m = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (process.env[m[1]] === undefined && v !== '') { process.env[m[1]] = v; n++; }
  }
  return n;
}

loadEnvFile();
