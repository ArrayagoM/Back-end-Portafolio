// Orquestador de la agencia: entrevista -> analisis -> planificacion -> desarrollo -> seo -> performance -> qa -> security -> review -> done.
// Los demas modulos se cargan de forma perezosa (import dinamico) para poder inyectarlos en tests
// mediante `deps` y para que el MCP responda initialize/tools/list sin tocar el resto del sistema.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const MODULE_PATHS = {
  events: 'core/events.js',
  store: 'core/store.js',
  llm: 'core/llm/index.js',
  interviewer: 'core/agents/interviewer.js',
  architect: 'core/agents/architect.js',
  techlead: 'core/agents/techlead.js',
  developer: 'core/agents/developer.js',
  tester: 'core/agents/tester.js',
  reviewer: 'core/agents/reviewer.js',
  security: 'core/agents/security.js',
  seo: 'core/agents/seo.js',
  perf: 'core/agents/perf.js',
  logo: 'core/agents/logo.js',
  vision: 'core/agents/vision.js',
  assets: 'core/assets.js',
};

const moduleCache = new Map();

/** Carga las dependencias; `overrides` reemplaza modulos completos (tests). */
export async function loadDeps(overrides = {}) {
  const deps = {};
  for (const [key, rel] of Object.entries(MODULE_PATHS)) {
    if (overrides && overrides[key]) { deps[key] = overrides[key]; continue; }
    if (!moduleCache.has(key)) {
      moduleCache.set(key, await import(pathToFileURL(path.join(ROOT, rel)).href));
    }
    deps[key] = moduleCache.get(key);
  }
  return deps;
}

const nap = (ms) => (ms > 0 ? new Promise((r) => setTimeout(r, ms)) : Promise.resolve());
// Duracion "realista" (ms a escala 1.0) de cada tipo de trabajo. pace/700 = escala; pace=0 => instantaneo (tests, MCP).
// El trabajo real tarda milisegundos: estas esperas existen para que se vea trabajar al equipo.
const WORK_MS = {
  read: 5000, brief: 6000, structure: 9000, plan: 7000, planItem: 500,
  qa: 11000, security: 12000, review: 11000, handoff: 2500, seo: 12000, perf: 12000,
  task: { scaffold: 8000, styles: 12000, section: 11000, script: 10000, seo: 6000, assemble: 8000, fix: 8000 },
};
const MID_SAY = {
  scaffold: 'Ya tengo la estructura base, sigo con los metadatos.',
  styles: 'Voy por la mitad: paleta y tipografias listas, ahora el responsive.',
  section: 'Casi: ajusto espaciados y el contenido de la seccion.',
  script: 'Mitad de camino: menu movil y animaciones de entrada.',
  seo: 'Armando los datos para buscadores.',
  assemble: 'Uniendo todas las piezas en un solo sitio.',
  fix: 'Aplicando la correccion, reviso que no rompa nada mas.',
};
const DEVS = ['dev-1', 'dev-2', 'dev-3'];
const MAX_FIX_ROUNDS = 2;
const isPartial = (p) => p.startsWith('partials/') || p.startsWith('partials\\');
const taskNum = (t) => parseInt(String(t.id).replace(/\D/g, ''), 10) || 0;

const running = new Map(); // projectId -> Promise
export const isRunning = (projectId) => running.has(projectId);

const STAGE_LABEL = {
  interview: 'Entrevista con el cliente',
  analysis: 'Analisis y estructura',
  planning: 'Planificacion de tareas',
  development: 'Desarrollo',
  seo: 'Estrategia SEO y visibilidad',
  performance: 'Optimizacion de velocidad',
  qa: 'Pruebas de calidad',
  security: 'Auditoria de ciberseguridad',
  review: 'Revision contra lo pedido',
  done: 'Sitio entregado',
  failed: 'El proceso fallo',
};

const TASK_SAY = {
  scaffold: ['Levanto la base del sitio', 'Estructura lista, arranco'],
  styles: ['Le pongo color y estilo a todo', 'Tipografias y paleta, manos a la obra'],
  section: ['Armo la seccion {s}', 'A construir: {s}'],
  script: ['Le doy vida con JavaScript', 'Interacciones y animaciones en camino'],
  seo: ['Que Google nos encuentre: meta y sitemap', 'Ajusto el SEO'],
  assemble: ['Junto todas las piezas en el index.html', 'Ensamblando la version final'],
  fix: ['Corrijo lo que marcaron QA y review', 'Arreglo pendiente, ya lo resuelvo'],
};

function sayForTask(task, dev) {
  const opts = TASK_SAY[task.type] || ['Manos a la obra'];
  const base = opts[(taskNum(task) + DEVS.indexOf(dev)) % opts.length];
  return base.replace('{s}', task.sectionId || task.title || '');
}

const BIN_MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.ico': 'image/x-icon', '.avif': 'image/avif', '.woff': 'font/woff', '.woff2': 'font/woff2' };

/** Lee recursivamente los archivos del sitio generado: texto como string, binarios como { base64, mime }. */
export async function readSiteFiles(projectId, depOverrides) {
  const deps = await loadDeps(depOverrides);
  const base = await deps.store.siteDir(projectId);
  const out = {};
  const walk = (dir, prefix) => {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const rel = prefix ? `${prefix}/${e.name}` : e.name;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full, rel);
      else if (e.isFile() && !isPartial(rel)) {
        const mime = BIN_MIME[path.extname(e.name).toLowerCase()];
        out[rel] = mime ? { base64: fs.readFileSync(full).toString('base64'), mime } : fs.readFileSync(full, 'utf8');
      }
    }
  };
  walk(base, '');
  return out;
}

/** Crea un proyecto y devuelve la primera pregunta de la entrevista. */
export async function startProject(depOverrides) {
  const deps = await loadDeps(depOverrides);
  const project = await deps.store.createProject();
  const question = await deps.interviewer.nextQuestion(project);
  deps.events.emit(project.id, { type: 'stage', message: STAGE_LABEL.interview, data: { stage: 'interview' } });
  deps.events.emit(project.id, { type: 'agent', agent: 'interviewer', state: 'working', message: 'Esperando al cliente' });
  deps.events.emit(project.id, { type: 'say', agent: 'interviewer', message: 'Hola! Cuentame de tu negocio, te hago unas preguntas cortas.' });
  return { project, question: question || null };
}

export async function answerAndAdvance(projectId, text, depOverrides) {
  const deps = await loadDeps(depOverrides);
  const { emit } = deps.events;
  const project = await deps.store.loadProject(projectId);
  if (!project) throw Object.assign(new Error('Proyecto no encontrado'), { status: 404 });
  if (project.stage !== 'interview') throw Object.assign(new Error('La entrevista ya termino'), { status: 409 });
  const clean = String(text ?? '').trim();
  // vacío es válido: el entrevistador repregunta si era obligatoria o salta si era opcional
  await deps.interviewer.recordAnswer(project, clean);
  const nextQuestion = (await deps.interviewer.nextQuestion(project)) || null;
  await deps.store.saveProject(project);
  if (nextQuestion) {
    emit(projectId, { type: 'say', agent: 'interviewer', message: 'Anotado. ' + (nextQuestion.question || '') });
  } else {
    emit(projectId, { type: 'say', agent: 'interviewer', message: 'Listo, tengo todo lo que necesito. Paso al equipo!' });
    emit(projectId, { type: 'agent', agent: 'interviewer', state: 'done', message: 'Entrevista completa' });
  }
  return { project, nextQuestion };
}

/** Ejecuta todo el pipeline. Nunca lanza: los errores terminan en stage 'failed'. */
export function runPipeline(projectId, opts = {}) {
  if (running.has(projectId)) return running.get(projectId);
  const p = _run(projectId, opts).finally(() => running.delete(projectId));
  running.set(projectId, p);
  return p;
}

async function _run(projectId, { llm, pace = 0, deps: depOverrides } = {}) {
  let deps;
  try { deps = await loadDeps(depOverrides); } catch (e) {
    console.error('[pipeline] no se pudieron cargar los modulos:', e.message);
    return null;
  }
  const safeEmit = (evt) => { try { deps.events.emit(projectId, evt); } catch (e) { console.error('[pipeline] emit fallo:', e.message); } };
  const say = (agent, message) => safeEmit({ type: 'say', agent, message });
  const agent = (id, state, message) => safeEmit({ type: 'agent', agent: id, state, message });
  const emitTask = (task, dev) => safeEmit({ type: 'task', agent: dev || task.assignee, message: `${task.id} ${task.status}: ${task.title}`, data: { task: { ...task } } });
  let project = null;
  // escala de tiempo: pace 700 (default del server) => 1.0; pace 0 => sin esperas
  const scale = pace > 0 ? pace / 700 : 0;
  const work = (ms) => nap(Math.round(ms * scale));
  // Trabaja `ms` en tramos y emite avance real: evento 'progress' {agent, pct, label, taskId?} y, si es una tarea,
  // 'task' con task.progress. from/to mapean el tramo al rango de la barra (varios tramos seguidos = una barra continua).
  const PROGRESS_STEPS = 8;
  async function working(agentId, label, ms, { task = null, from = 0, to = 95 } = {}) {
    for (let i = 1; i <= PROGRESS_STEPS; i++) {
      await work(ms / PROGRESS_STEPS);
      const pct = Math.round(from + ((to - from) * i) / PROGRESS_STEPS);
      if (task) { task.progress = pct; emitTask(task, agentId); }
      safeEmit({ type: 'progress', agent: agentId, message: label, data: { pct, label, taskId: task ? task.id : undefined } });
    }
  }
  const progressDone = (agentId, label, task = null) => {
    if (task) task.progress = 100;
    safeEmit({ type: 'progress', agent: agentId, message: label, data: { pct: 100, label, taskId: task ? task.id : undefined } });
  };

  try {
    project = await deps.store.loadProject(projectId);
    if (!project) throw new Error(`Proyecto no encontrado: ${projectId}`);
    llm = llm || deps.llm.getLLM({ unlocked: !!project.ai });
    project.log = Array.isArray(project.log) ? project.log : [];
    delete project.error;

    const setStage = async (stage, message) => {
      project.stage = stage;
      project.log.push({ ts: Date.now(), stage });
      await deps.store.saveProject(project);
      safeEmit({ type: 'stage', message: message || STAGE_LABEL[stage] || stage, data: { stage } });
    };

    // 2. analysis
    await setStage('analysis');
    agent('analyst', 'working', 'Leyendo la entrevista');
    say('analyst', 'Leo las respuestas y armo el brief del negocio.');
    await working('analyst', 'Leyendo la entrevista', WORK_MS.read, { from: 0, to: 25 });
    project.brief = await deps.interviewer.buildBrief(project, llm);
    // logo elegido + imagenes del cliente: se aplican al brief ANTES de disenar (la paleta del logo no pisa los colores del cliente)
    const applied = deps.assets.applyAssetsToBrief(project.brief, project, { applyLogoToBrief: deps.logo.applyLogoToBrief });
    project.brief = applied.brief;
    if (applied.used.logo) say('analyst', applied.used.logo === 'uploaded' ? 'Uso el logo que subiste en el header y como favicon.' : 'Incorporo el logo que elegiste: va en el header, el favicon y las redes.');
    if (applied.used.images) say('analyst', `Sumo ${applied.used.images} foto(s) tuyas al sitio, con su texto alternativo.`);
    say('analyst', `Entendido: ${project.brief?.businessName || 'el negocio'} (${project.brief?.sector || 'rubro general'}). Dejame que me inspiro...`);
    // la estructura (y la visión, que puede usar IA) se calcula mientras Tomas "trabaja": así la espera de la IA no se suma a la animación
    const designP = Promise.resolve().then(() => deps.architect.designStructure(project.brief, llm));
    designP.catch(() => { /* el error real se propaga más abajo */ });
    await working('analyst', 'Armando el brief del negocio', WORK_MS.brief, { from: 25, to: 55 });
    say('analyst', 'Elijo secciones, paleta y tipografías según el rubro y el tono.');
    project.structure = await designP;
    const vis = project.structure?.vision;
    if (vis && vis.name) {
      const q = WORK_MS.structure / 4;
      const bold = vis.boldness || project.brief?.boldness || 'atrevido';
      say('analyst', `¡Tengo una visión! Esto va a ser «${vis.name}»: ${(vis.mood || []).join(', ')} y con muchísima personalidad.`);
      safeEmit({ type: 'vision', agent: 'analyst', message: `Concepto creativo: ${vis.name}`, data: { vision: vis, source: project.structure.visionSource, note: project.structure.visionNote } });
      await working('analyst', 'Soñando el concepto', q, { from: 55, to: 65 });
      say('analyst', vis.manifesto || 'Esto va a ser algo que nadie vio.');
      await working('analyst', 'Bocetando en el aire', q, { from: 65, to: 75 });
      say('analyst', `Mi jugada audaz: ${vis.signature}. Motivo «${vis.motif}», movimiento «${vis.motion}». ¡Acá el scroll es un viaje!`);
      await working('analyst', 'Afinando cada pixel', q, { from: 75, to: 85 });
      say('analyst', {
        sobrio: 'Pediste sobriedad: dosis fina de magia, ¡pero con alma! Que se note sin levantar la voz.',
        atrevido: 'Nivel atrevido activado: animaciones con intención, composiciones que rompen la grilla y cero miedo a salirse de la caja.',
        extremo: '¡Modo EXTREMO! Tipografía cinética, capas, secciones torcidas y un easter egg escondido: probá hacer clic cinco veces en el logo.',
      }[bold] || 'Atrevido, pero con criterio.');
      if (project.structure.visionSource === 'ai') say('analyst', 'Esta visión la co-diseñé con mi musa de IA. ¡Qué dupla!');
      else if (project.structure.visionNote) say('analyst', `Mi musa de IA se tildó (${project.structure.visionNote}). Tiré de oficio y la visión sale igual de atrevida.`);
      await working('analyst', 'Ultimando detalles', q, { from: 85, to: 95 });
    } else {
      await working('analyst', 'Disenando la estructura', WORK_MS.structure, { from: 55, to: 95 });
    }
    const nSec = project.structure?.sections?.length || 0;
    say('analyst', `Estructura lista: ${nSec} secciones, paleta y SEO definidos.`);
    progressDone('analyst', 'Estructura lista');
    agent('analyst', 'done', `${nSec} secciones`);
    await deps.store.saveProject(project);
    await work(WORK_MS.handoff);

    // 3. planning
    await setStage('planning');
    agent('techlead', 'working', 'Armando el plan de tareas');
    say('techlead', 'Reviso la estructura y desarmo el trabajo en tareas.');
    await working('techlead', 'Desarmando el trabajo en tareas', WORK_MS.plan, { from: 0, to: 60 });
    project.tasks = (await deps.techlead.planTasks(project.structure, project.brief)).map(normTask);
    const hero = project.tasks.find((t) => t.sectionId && /hero/i.test(String(t.sectionId)));
    say('techlead', `Armo el plan: ${project.tasks.length} tareas${hero ? ', hero primero' : ', lo urgente primero'}.`);
    for (let i = 0; i < project.tasks.length; i++) {
      emitTask(project.tasks[i]);
      safeEmit({ type: 'progress', agent: 'techlead', message: 'Repartiendo tareas', data: { pct: Math.round(60 + (35 * (i + 1)) / project.tasks.length), label: 'Repartiendo tareas' } });
      await work(WORK_MS.planItem);
    }
    progressDone('techlead', 'Plan repartido');
    agent('techlead', 'done', `${project.tasks.length} tareas repartidas`);
    await deps.store.saveProject(project);
    await work(WORK_MS.handoff);

    // 4. development
    await setStage('development');
    const ctx = { brief: project.brief, structure: project.structure, files: deps.assets.siteAssetFiles(projectId, project.brief), llm };
    await runTasks(project.tasks);

    // 4b. seo (Rocío) y 4c. performance (Lucho): un hallazgo bloqueante se reporta como observación, nunca tumba el proyecto
    await runSeoStage();
    await runPerfStage();

    // 5/6. qa + review con ciclo de correcciones (max 2 vueltas)
    let qa; let review; let security; let round = 0;
    for (;;) {
      await setStage('qa');
      agent('qa-1', 'working', 'Corriendo pruebas');
      say('qa-1', round ? 'Re-testeo despues de las correcciones.' : 'Reviso HTML, accesibilidad, SEO y enlaces.');
      await working('qa-1', 'Revisando HTML y accesibilidad', WORK_MS.qa / 2, { from: 0, to: 50 });
      say('qa-1', 'Pruebo el sitio en celular y escritorio, y recorro cada enlace.');
      await working('qa-1', 'Probando enlaces y responsive', WORK_MS.qa / 2, { from: 50, to: 95 });
      qa = await deps.tester.runTests(ctx.files, project.structure);
      progressDone('qa-1', 'Pruebas completas');
      const qaFails = (qa.checks || []).filter((c) => !c.passed);
      project.qa = qa;
      agent('qa-1', qa.passed ? 'done' : 'blocked', qa.passed ? 'Todo en orden' : `${qaFails.length} chequeos fallaron`);
      say('qa-1', qa.passed ? `Pase limpio: ${(qa.checks || []).length} chequeos OK.` : `Encontre ${qaFails.length} problemas, los paso al lead.`);
      await deps.store.saveProject(project);
      await work(WORK_MS.handoff);

      // ciberseguridad: audita el codigo generado antes de la revision final del cliente
      await setStage('security');
      agent('security', 'working', 'Auditando la seguridad del sitio');
      say('security', round ? 'Re-audito despues de las correcciones.' : 'Reviso politica de contenido, enlaces externos, formularios y secretos.');
      await working('security', 'Buscando vulnerabilidades', WORK_MS.security / 2, { from: 0, to: 50 });
      say('security', 'Pruebo inyeccion de texto, scripts de terceros y cabeceras.');
      await working('security', 'Verificando cabeceras y scripts', WORK_MS.security / 2, { from: 50, to: 95 });
      security = deps.security ? deps.security.auditSecurity(ctx.files, project.structure, project.brief) : { passed: true, checks: [], warnings: [] };
      progressDone('security', 'Auditoria completa');
      const secFails = (security.checks || []).filter((c) => !c.passed && c.severity !== 'low');
      project.security = security;
      agent('security', security.passed ? 'done' : 'blocked', security.passed ? 'Sin vulnerabilidades' : `${secFails.length} hallazgos`);
      say('security', security.passed
        ? `Sitio limpio: ${(security.checks || []).length} controles de seguridad OK${security.warnings?.length ? ` (${security.warnings.length} aviso)` : ''}.`
        : `Encontre ${secFails.length} hallazgo(s) de seguridad, se los paso al lead.`);
      await deps.store.saveProject(project);
      await work(WORK_MS.handoff);

      await setStage('review');
      agent('qa-2', 'working', 'Contrastando con lo que pidio el cliente');
      say('qa-2', 'Ahora verifico cada requisito del cliente.');
      await working('qa-2', 'Leyendo lo que pidio el cliente', WORK_MS.review / 2, { from: 0, to: 50 });
      say('qa-2', 'Comparo el sitio contra lo que me pidio el cliente, punto por punto.');
      await working('qa-2', 'Comparando requisito por requisito', WORK_MS.review / 2, { from: 50, to: 95 });
      review = await deps.reviewer.reviewRequirements(project.brief, project.structure, ctx.files);
      progressDone('qa-2', 'Revision completa');
      const revFails = (review.results || []).filter((r) => !r.met);
      project.review = review;
      agent('qa-2', review.passed ? 'done' : 'blocked', review.passed ? 'Cumple todo lo pedido' : `${revFails.length} requisitos sin cumplir`);
      say('qa-2', review.passed ? 'Todo lo que pidio el cliente esta en el sitio.' : `Faltan ${revFails.length} requisitos del cliente.`);
      await deps.store.saveProject(project);
      await work(WORK_MS.handoff);

      if (qa.passed && review.passed && security.passed) break;
      if (round >= MAX_FIX_ROUNDS) {
        say('techlead', 'Llegamos al limite de correcciones, entrego con observaciones.');
        break;
      }
      round++;
      const failures = [...qaFails, ...secFails, ...revFails];
      await setStage('development', `Correcciones (vuelta ${round} de ${MAX_FIX_ROUNDS})`);
      agent('techlead', 'working', 'Planificando correcciones');
      say('techlead', `Vuelta ${round}: ${failures.length} cosas para arreglar, las reparto.`);
      const fixes = ((await deps.techlead.planFixes(failures, project.structure, project.tasks)) || []).map(normTask);
      const used = new Set(project.tasks.map((t) => t.id));
      for (const f of fixes) {
        let n = project.tasks.length + 1;
        while (used.has(f.id)) f.id = `T${n++}`;
        used.add(f.id);
        f.status = 'pending';
        project.tasks.push(f);
        emitTask(f);
      }
      agent('techlead', 'done', `${fixes.length} tareas de correccion`);
      if (!fixes.length) { say('techlead', 'No encuentro como arreglarlo automaticamente.'); break; }
      await runTasks(fixes);
    }

    // 7. done
    const files = ctx.files;
    await deps.store.writeSite(projectId, files);
    project.files = Object.keys(files).filter((f) => !isPartial(f));
    const clean = !!(qa?.passed && review?.passed && security?.passed && project.seo?.validation?.passed !== false && project.perf?.validation?.passed !== false);
    await setStage('done', clean ? 'Sitio terminado' : 'Sitio terminado con observaciones');
    safeEmit({ type: 'done', message: clean ? 'Tu sitio esta listo' : 'Tu sitio esta listo (con observaciones)', data: { siteUrl: `/sites/${projectId}/` } });
    return project;

    // ---- etapa SEO: plan + archivos + validacion; sin promesas de resultados ----
    async function runSeoStage() {
      if (!deps.seo) return;
      const AG = 'seo';
      await setStage('seo');
      agent(AG, 'working', 'Armando la estrategia de visibilidad');
      try {
        const compute = async () => {
          const plan = await deps.seo.planSeo(project.brief, project.structure, llm);
          const planNotes = [...(deps.seo.planSeo.lastNotes || [])];
          const assets = deps.seo.buildSeoAssets(ctx.files, project.brief, project.structure, plan);
          // applySeoAssets reemplaza el JSON-LD del desarrollador: conservamos su logo/imagen reales (datos del cliente) en el nodo principal
          try {
            const prev = [...String(ctx.files['index.html'] || '').matchAll(/<script type="application\/ld\+json">\s*([\s\S]*?)<\/script>/gi)].map((m) => JSON.parse(m[1]));
            const old = prev.find((o) => o && (o.logo || o.image));
            const main = assets.jsonld && assets.jsonld[0];
            if (old && main) { for (const k of ['logo', 'image']) if (old[k] && !main[k]) main[k] = old[k]; }
          } catch { /* JSON-LD previo ilegible: se usa solo el generado */ }
          const next = deps.seo.applySeoAssets(ctx.files, assets);
          const docNames = [];
          for (const [name, content] of Object.entries(assets.docs || {})) { next[`docs/${name}`] = content; docNames.push(`docs/${name}`); }
          const validation = deps.seo.validateSeo(next, project.brief, project.structure);
          return { plan, planNotes, assets, next, docNames, validation };
        };
        const resultP = compute();
        resultP.catch(() => { /* se propaga en el await */ });
        await working(AG, 'Investigando palabras clave', WORK_MS.seo / 6, { from: 0, to: 15 });
        const r = await resultP;
        ctx.files = r.next;
        const v = r.validation;
        project.seo = {
          plan: r.plan,
          validation: { passed: !!v.passed, score: v.score, checks: v.checks, aiReadiness: v.aiReadiness, disclaimer: v.disclaimer },
          notes: [...r.planNotes, ...(r.assets.notes || [])],
          docs: r.docNames,
        };
        project.files = Object.keys(ctx.files).filter((f) => !isPartial(f));
        const lines = deps.seo.sayLines(r.plan, v);
        const labels = ['Armando palabras clave', 'Pensando en tu zona', 'Revisando el sitio', 'Mirando los detalles', 'Preparando para las IAs', 'Acciones fuera del sitio', 'Cerrando con honestidad'];
        const per = (WORK_MS.seo * 5) / 6 / Math.max(lines.length, 1);
        for (let i = 0; i < lines.length; i++) {
          say(AG, lines[i]);
          await working(AG, labels[i % labels.length], per, { from: 15 + (80 * i) / lines.length, to: 15 + (80 * (i + 1)) / lines.length });
        }
        if ((project.seo.notes || []).some((n) => /example\.com/i.test(n))) say(AG, 'Aviso: no tengo tu dominio, así que el sitemap quedó con example.com. Cambialo por el real al publicar; no invento direcciones.');
        progressDone(AG, 'Estrategia lista');
        agent(AG, v.passed ? 'done' : 'blocked', v.passed ? `SEO ${v.score}/100 · IAs ${v.aiReadiness?.score ?? '-'}/100` : `SEO ${v.score}/100 con observaciones`);
      } catch (e) {
        console.error('[pipeline] etapa seo fallo (se reporta como observacion):', e?.message || e);
        project.seo = { plan: null, validation: { passed: false, score: 0, checks: [], aiReadiness: { score: 0, checks: [] }, disclaimer: '' }, notes: [`La etapa SEO no pudo completarse: ${e?.message || e}`], docs: [] };
        say(AG, 'Se me complicó el análisis SEO; sigo sin tocar el sitio y lo dejo anotado como observación.');
        agent(AG, 'blocked', 'SEO no pudo completarse');
      }
      await deps.store.saveProject(project);
      await work(WORK_MS.handoff);
    }

    // ---- etapa performance: solo reemplaza los archivos si la verificacion de Lucho pasa ----
    async function runPerfStage() {
      if (!deps.perf) return;
      const AG = 'perf';
      await setStage('performance');
      agent(AG, 'working', 'Midiendo y optimizando el sitio');
      try {
        const compute = async () => {
          const before = ctx.files;
          const res = (await deps.perf.optimizeSite(before, { structure: project.structure, brief: project.brief })) || {};
          const report = res.report || {};
          const ok = !!(report.verification && report.verification.ok) && res.files && typeof res.files === 'object';
          let after = before;
          if (ok) {
            after = { ...res.files };
            for (const k of Object.keys(before)) if (isPartial(k) && !(k in after)) after[k] = before[k];
          }
          const validation = await deps.perf.validatePerformance(after, { structure: project.structure, brief: project.brief });
          return { report, ok, after, validation };
        };
        const resultP = compute();
        resultP.catch(() => { /* se propaga en el await */ });
        await working(AG, 'Pesando cada archivo', WORK_MS.perf / 6, { from: 0, to: 15 });
        const r = await resultP;
        if (r.ok) ctx.files = r.after;
        const rep = r.report; const val = r.validation || {};
        project.perf = {
          report: { before: rep.before, after: rep.after, savingsPct: rep.savingsPct, applied: rep.applied || [], skipped: rep.skipped || [], verification: rep.verification, notes: rep.notes || [] },
          validation: { passed: !!val.passed, score: val.score, budgets: val.budgets, checks: val.checks || [], estimates: val.estimates, disclaimer: val.disclaimer },
        };
        project.files = Object.keys(ctx.files).filter((f) => !isPartial(f));
        const lines = deps.perf.sayLines(rep, val);
        const labels = ['Recortando CSS', 'Achicando JS', 'Puliendo el HTML', 'Verificando cada cambio', 'Armando la caché', 'Midiendo de nuevo', 'Últimos kilobytes'];
        const per = (WORK_MS.perf * 5) / 6 / Math.max(lines.length, 1);
        for (let i = 0; i < lines.length; i++) {
          say(AG, lines[i]);
          await working(AG, labels[i % labels.length], per, { from: 15 + (80 * i) / lines.length, to: 15 + (80 * (i + 1)) / lines.length });
        }
        progressDone(AG, 'Optimizacion lista');
        const blocked = !r.ok || val.passed === false;
        agent(AG, blocked ? 'blocked' : 'done', !r.ok ? 'Verificación fallida: sitio original conservado' : `Rendimiento ${val.score}/100 (estimado) · ${rep.savingsPct}% menos peso`);
      } catch (e) {
        console.error('[pipeline] etapa performance fallo (se reporta como observacion):', e?.message || e);
        project.perf = { report: { before: null, after: null, savingsPct: 0, applied: [], skipped: [], verification: { ok: false, checks: [], reason: String(e?.message || e) }, notes: [`La etapa de rendimiento no pudo completarse: ${e?.message || e}`] }, validation: { passed: false, score: 0, budgets: null, checks: [], estimates: null, disclaimer: '' } };
        say(AG, 'No pude optimizar con seguridad; dejo el sitio original intacto y lo anoto como observación.');
        agent(AG, 'blocked', 'Optimización no completada');
      }
      await deps.store.saveProject(project);
      await work(WORK_MS.handoff);
    }

    // ---- scheduler de desarrolladores en paralelo ----
    async function runTasks(batch) {
      const all = project.tasks;
      const byId = new Map(all.map((t) => [t.id, t]));
      const mine = new Set(batch.map((t) => t.id));
      const idle = new Set(DEVS);
      const inFlight = new Map(); // dev -> Promise
      const pending = () => all.filter((t) => mine.has(t.id) && t.status === 'pending');

      for (;;) {
        // propagar fallos a dependientes
        let changed = true;
        while (changed) {
          changed = false;
          for (const t of pending()) {
            const bad = (t.dependsOn || []).map((d) => byId.get(d)).find((d) => d && d.status === 'failed');
            if (bad) { t.status = 'failed'; t.error = `Bloqueada por ${bad.id}`; emitTask(t); changed = true; }
          }
        }
        const ready = pending()
          .filter((t) => (t.dependsOn || []).every((d) => !byId.has(d) || byId.get(d).status === 'done'))
          .sort((a, b) => (a.priority - b.priority) || (taskNum(a) - taskNum(b)));
        for (const dev of [...idle]) {
          if (!ready.length) break;
          let i = ready.findIndex((t) => t.assignee === dev);
          if (i < 0) i = 0; // robo de trabajo si el propio no esta listo
          const [task] = ready.splice(i, 1);
          idle.delete(dev);
          inFlight.set(dev, execute(dev, task).then(() => { inFlight.delete(dev); idle.add(dev); }));
        }
        if (!inFlight.size) {
          for (const t of pending()) { t.status = 'failed'; t.error = 'Dependencias imposibles de cumplir'; emitTask(t); }
          break;
        }
        await Promise.race(inFlight.values());
      }
      await deps.store.saveProject(project);
    }

    async function execute(dev, task) {
      task.assignee = dev;
      task.status = 'running';
      emitTask(task, dev);
      agent(dev, 'working', `${task.id}: ${task.title}`);
      say(dev, sayForTask(task, dev));
      const ms = WORK_MS.task[task.type] || 8000;
      task.progress = 0;
      await working(dev, task.title, ms / 2, { task, from: 0, to: 50 });
      say(dev, MID_SAY[task.type] || 'Sigo avanzando.');
      await working(dev, task.title, ms / 2, { task, from: 50, to: 95 });
      try {
        await deps.developer.executeTask(task, ctx);
        task.status = 'done';
        progressDone(dev, task.title, task);
        agent(dev, 'done', `${task.id} terminada`);
      } catch (e) {
        task.status = 'failed';
        task.error = e?.message || String(e);
        agent(dev, 'blocked', `${task.id} fallo: ${task.error}`);
        say(dev, `Me trabe con ${task.id}: ${task.error}`);
      }
      emitTask(task, dev);
      project.files = Object.keys(ctx.files).filter((f) => !isPartial(f));
      try { await deps.store.saveProject(project); } catch { /* ya se persiste al cambiar de etapa */ }
      await work(WORK_MS.handoff / 2);
    }
  } catch (err) {
    const msg = err?.message || String(err);
    console.error('[pipeline] fallo:', msg);
    try {
      if (project) { project.stage = 'failed'; project.error = msg; await deps.store.saveProject(project); }
    } catch { /* nada mas que hacer */ }
    safeEmit({ type: 'stage', message: `El proceso fallo: ${msg}`, data: { stage: 'failed', error: msg } });
    return project;
  }
}

function normTask(t) {
  return { ...t, dependsOn: Array.isArray(t.dependsOn) ? t.dependsOn : [], status: t.status || 'pending', priority: Number.isFinite(t.priority) ? t.priority : 5, progress: Number.isFinite(t.progress) ? t.progress : 0 };
}

// ---------------------------------------------------------------- logos (usados por el server y el MCP)
const httpErr = (status, message) => Object.assign(new Error(message), { status });
const LOGO_CHOICES = ['logo-1', 'logo-2', 'logo-3', 'uploaded', 'none'];

/**
 * Genera 3 propuestas de logo con las respuestas ACTUALES (sin correr el pipeline) y las guarda en project.logoOptions.
 * Devuelve { options, notes }. Tomas presenta las opciones con eventos `say` y un evento `logos`.
 */
export async function proposeProjectLogos(projectId, { llm, deps: depOverrides } = {}) {
  const deps = await loadDeps(depOverrides);
  const project = await deps.store.loadProject(projectId);
  if (!project) throw httpErr(404, 'Proyecto no encontrado');
  if (isRunning(projectId)) throw httpErr(409, 'El pipeline esta corriendo; espera a que termine para pedir logos.');
  llm = llm || deps.llm.getLLM({ unlocked: !!project.ai });
  const brief = await deps.interviewer.buildBrief({ ...project, answers: { ...(project.answers || {}) } }, llm);
  const named = brief && String(brief.businessName || '').trim();
  const answered = Object.values(project.answers || {}).some((v) => String(v ?? '').trim());
  if (!named || !answered || (brief.businessName === 'Mi negocio' && !String(project.answers?.q_name ?? '').trim())) {
    throw httpErr(400, 'Para proponer logos necesito al menos el nombre del negocio: responde primero esa pregunta.');
  }
  // vision: la del proyecto si ya existe; si no, el modulo de vision (con IA si hay, determinista si no). No corre el pipeline.
  let vision = project.structure?.vision || null;
  if (!vision) {
    try { const r = await deps.vision.aiVision(brief, llm); vision = r.vision; } catch { vision = null; }
    if (!vision) vision = deps.vision.designVision(brief);
  }
  const options = await deps.logo.proposeLogos(brief, vision, llm);
  const notes = [...(deps.logo.proposeLogos.lastNotes || [])];
  const fresh = (await deps.store.loadProject(projectId)) || project;
  fresh.logoOptions = options;
  await deps.store.saveProject(fresh);

  const emit = (evt) => { try { deps.events.emit(projectId, evt); } catch { /* el bus no debe romper la peticion */ } };
  const n = options.length;
  emit({ type: 'agent', agent: 'analyst', state: 'working', message: 'Dibujando logos para el cliente' });
  emit({ type: 'say', agent: 'analyst', message: `¡Esto me tiene fascinado! Armé ${n} identidades para ${brief.businessName}, cada una con su paleta y su tipografía.` });
  options.forEach((o, i) => emit({ type: 'say', agent: 'analyst', message: `Opción ${i + 1}, «${o.name}»: ${String(o.concept || o.rationale || '').slice(0, 200)}` }));
  emit({ type: 'say', agent: 'analyst', message: 'Elegí la que te haga vibrar, subí la tuya o seguí sin logo: el sitio queda espectacular igual.' });
  emit({ type: 'agent', agent: 'analyst', state: 'idle', message: 'Logos presentados' });
  emit({ type: 'logos', agent: 'analyst', message: `${n} propuestas de logo listas`, data: { count: n } });
  return { options, notes };
}

/** Fija project.logo: 'logo-1|2|3' (generado), 'uploaded' (assetId) o 'none'. Devuelve { project, logo }. */
export async function chooseProjectLogo(projectId, { choice, assetId } = {}, depOverrides) {
  const deps = await loadDeps(depOverrides);
  const project = await deps.store.loadProject(projectId);
  if (!project) throw httpErr(404, 'Proyecto no encontrado');
  if (isRunning(projectId)) throw httpErr(409, 'El pipeline esta corriendo; espera a que termine para cambiar el logo.');
  if (typeof choice !== 'string' || !LOGO_CHOICES.includes(choice)) throw httpErr(400, 'choice debe ser logo-1, logo-2, logo-3, uploaded o none.');
  let logo;
  if (choice === 'none') {
    logo = { kind: 'none' };
  } else if (choice === 'uploaded') {
    const rec = deps.assets.getAssetRecord(projectId, assetId);
    if (!rec) throw httpErr(404, 'Ese archivo no existe en el proyecto. Subilo primero con POST /assets.');
    if (rec.kind !== 'logo') throw httpErr(400, 'Ese archivo se subio como imagen, no como logo.');
    const palette = rec.colors?.length ? deps.logo.paletteFromImageColors(rec.colors) : null;
    logo = { kind: 'uploaded', assetId: rec.id, name: rec.name, mime: rec.mime, ...(palette ? { palette } : {}) };
  } else {
    const opt = (project.logoOptions || []).find((o) => o && o.id === choice);
    if (!opt) throw httpErr(409, 'Todavia no hay propuestas de logo: pedilas primero con POST /logos.');
    const safeSvg = deps.logo.sanitizeSvg(opt.svg);
    if (!safeSvg) throw httpErr(409, 'La propuesta de logo no es valida; pedí nuevas propuestas.');
    logo = {
      kind: 'generated', id: opt.id, name: opt.name, svg: safeSvg, icon: opt.icon ? deps.logo.sanitizeSvg(opt.icon) : null,
      palette: opt.palette, fonts: opt.fonts, rationale: opt.rationale, style: opt.style, mark: opt.mark,
    };
  }
  project.logo = logo;
  await deps.store.saveProject(project);
  try {
    const say = choice === 'none' ? 'Sin logo: vamos con el monograma, queda prolijo igual.'
      : choice === 'uploaded' ? 'Perfecto, usamos tu logo: lo cuido en el header y como favicon.'
        : `Elegiste «${logo.name}»: ¡qué ojo! Ya lo voy integrando al sitio.`;
    deps.events.emit(projectId, { type: 'say', agent: 'analyst', message: say });
  } catch { /* ignorar */ }
  return { project, logo };
}

/** Vista de los archivos del sitio para API/MCP: texto tal cual; binarios { encoding:'base64', mime, bytes, data? } (sin `data` si pesan > maxInline). */
export function describeSiteFiles(files, { maxInline = 200 * 1024 } = {}) {
  const out = {};
  for (const [name, v] of Object.entries(files || {})) {
    if (typeof v === 'string') { out[name] = v; continue; }
    if (v && typeof v === 'object' && typeof v.base64 === 'string') {
      const bytes = Buffer.from(v.base64, 'base64').length;
      out[name] = { encoding: 'base64', mime: v.mime || 'application/octet-stream', bytes, ...(bytes <= maxInline ? { data: v.base64 } : {}) };
    }
  }
  return out;
}
