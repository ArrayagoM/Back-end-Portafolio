// Developer: ejecuta tareas delegando al generador y mutando ctx.files.
import {
  makeCtx, renderSection, renderHeader, renderFloat, buildStyles, buildScript,
  buildSeoHead, buildRobots, buildSitemap, buildHeadersFile, assemblePage
} from '../generator/index.js';
import { slug } from '../generator/util.js';

const EXTRAS = 'partials/_extras.json';

function readExtras(files) {
  try { return JSON.parse(files[EXTRAS] || '[]'); } catch { return []; }
}

function partialsFrom(files, g) {
  const p = {};
  for (const s of g.sections) {
    const k = slug(s.id || s.type);
    if (files[`partials/${k}.html`] != null) p[k] = files[`partials/${k}.html`];
  }
  if (files['partials/header.html'] != null) p.header = files['partials/header.html'];
  if (files['partials/float.html'] != null) p.float = files['partials/float.html'];
  if (files['partials/seo.html'] != null) p.seo = files['partials/seo.html'];
  return p;
}

function assembleAll(ctx, g) {
  const files = ctx.files;
  files['styles.css'] = buildStyles(g);
  files['script.js'] = buildScript(g);
  files['robots.txt'] = buildRobots(g);
  files['sitemap.xml'] = buildSitemap(g);
  files['_headers'] = buildHeadersFile();
  // logo generado: se emite como archivo (header, og:image, JSON-LD) y su icono cuadrado como favicon.
  // El logo subido y las imagenes del cliente ya vienen copiados a ctx.files['assets/...'] por el pipeline.
  if (g.logo && g.logo.kind === 'generated') {
    files['assets/logo.svg'] = g.logo.svg;
    if (g.logo.icon) files['assets/favicon.svg'] = g.logo.icon;
  }
  files['index.html'] = assemblePage(g, partialsFrom(files, g), readExtras(files));
}

export async function executeTask(task, ctx) {
  if (!task || !ctx) throw new Error('executeTask requiere task y ctx');
  ctx.files = ctx.files || {};
  const files = ctx.files;
  const g = makeCtx(ctx.brief, ctx.structure);

  switch (task.type) {
    case 'scaffold':
      files['partials/header.html'] = renderHeader(g);
      files['partials/float.html'] = renderFloat(g);
      break;
    case 'styles':
      files['styles.css'] = buildStyles(g);
      break;
    case 'section': {
      const s = g.sections.find((x) => x.id === task.sectionId);
      if (!s) throw new Error(`Sección inexistente: ${task.sectionId}`);
      files[`partials/${slug(s.id || s.type)}.html`] = renderSection(g, s);
      break;
    }
    case 'script':
      files['script.js'] = buildScript(g);
      break;
    case 'seo':
      files['partials/seo.html'] = buildSeoHead(g);
      files['robots.txt'] = buildRobots(g);
      files['sitemap.xml'] = buildSitemap(g);
      break;
    case 'assemble':
      // completa lo que falte (p. ej. si una tarea previa no corrió) y arma el index final
      for (const s of g.sections) {
        const k = `partials/${slug(s.id || s.type)}.html`;
        if (files[k] == null) files[k] = renderSection(g, s);
      }
      assembleAll(ctx, g);
      break;
    case 'fix': {
      const fx = task.fix || {};
      const extras = readExtras(files);
      // asegurar sección faltante
      if (fx.kind === 'section' && fx.value && !g.sections.some((s) => s.id === fx.value || s.type === fx.value)) {
        const sec = { id: String(fx.value), type: String(fx.value), purpose: 'Sección solicitada', priority: 50, content: {} };
        ctx.structure = { ...(ctx.structure || {}), sections: [...(ctx.structure?.sections || []), sec] };
      }
      // 'contains'/'link' NO se parchean con texto oculto: eso engañaría al QA. Se re-renderiza desde el brief
      // y, si el requisito sigue sin cumplirse, el pipeline debe reportarlo como fallo real.
      if (fx.kind === 'meta' && fx.value && !/^(title|description|viewport|charset)$/i.test(String(fx.value))) {
        extras.push({ kind: 'meta', name: String(fx.value), value: g.seo?.description || g.name });
      }
      files[EXTRAS] = JSON.stringify(extras);
      // re-renderizar todo con los datos actuales y reensamblar
      const g2 = makeCtx(ctx.brief, ctx.structure);
      for (const s of g2.sections) files[`partials/${slug(s.id || s.type)}.html`] = renderSection(g2, s);
      files['partials/header.html'] = renderHeader(g2);
      files['partials/float.html'] = renderFloat(g2);
      files['partials/seo.html'] = buildSeoHead(g2);
      assembleAll(ctx, g2);
      break;
    }
    default:
      throw new Error(`Tipo de tarea desconocido: ${task.type}`);
  }
  return { ok: true, task: task.id, type: task.type };
}
