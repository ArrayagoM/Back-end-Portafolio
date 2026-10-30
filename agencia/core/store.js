// Persistencia en disco (JSON plano). DATA_DIR se lee en cada llamada.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

function dataDir() {
  return path.resolve(process.env.DATA_DIR || path.join(process.cwd(), 'data'));
}

const ID_RE = /^[a-z0-9_-]{4,64}$/i;
function checkId(id) {
  if (typeof id !== 'string' || !ID_RE.test(id)) throw new Error('ID de proyecto inválido');
  return id;
}

export function projectDir(id) {
  return path.join(dataDir(), 'projects', checkId(id));
}

export function siteDir(id) {
  return path.join(projectDir(id), 'site');
}

function projectFile(id) {
  return path.join(projectDir(id), 'project.json');
}

export function createProject() {
  const project = {
    id: crypto.randomBytes(6).toString('hex'),
    createdAt: new Date().toISOString(),
    stage: 'interview',
    answers: {},
    brief: null,
    structure: null,
    tasks: [],
    qa: null,
    review: null,
    files: [],
    log: [],
  };
  saveProject(project);
  return project;
}

export function loadProject(id) {
  try {
    return JSON.parse(fs.readFileSync(projectFile(id), 'utf8'));
  } catch {
    return null;
  }
}

export function saveProject(project) {
  const dir = projectDir(project.id);
  fs.mkdirSync(dir, { recursive: true });
  const tmp = projectFile(project.id) + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(project, null, 2), 'utf8');
  fs.renameSync(tmp, projectFile(project.id));
  return project;
}

export function listProjects() {
  const root = path.join(dataDir(), 'projects');
  let names = [];
  try { names = fs.readdirSync(root); } catch { return []; }
  const out = [];
  for (const n of names) {
    if (!ID_RE.test(n)) continue;
    const p = loadProject(n);
    if (p) out.push(p);
  }
  return out.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

export function writeSite(id, files) {
  const base = siteDir(id);
  fs.mkdirSync(base, { recursive: true });
  fs.rmSync(path.join(base, 'assets'), { recursive: true, force: true }); // assets de una corrida anterior
  const written = [];
  for (const [rel, content] of Object.entries(files || {})) {
    const norm = rel.replace(/\\/g, '/');
    if (norm.startsWith('partials/')) continue;
    const target = path.resolve(base, norm);
    if (target !== base && !target.startsWith(base + path.sep)) {
      throw new Error('Ruta de archivo inválida: ' + rel);
    }
    fs.mkdirSync(path.dirname(target), { recursive: true });
    let data;
    if (typeof content === 'string' || Buffer.isBuffer(content)) data = content;
    else if (content && typeof content === 'object' && typeof content.base64 === 'string') data = Buffer.from(content.base64, 'base64'); // binario: { base64, mime }
    else data = String(content);
    fs.writeFileSync(target, data);
    written.push(norm);
  }
  return written;
}
