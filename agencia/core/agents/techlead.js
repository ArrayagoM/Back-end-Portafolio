// Tech Lead: convierte la Structure en tareas y planifica correcciones.
const DEVS = ['dev-1', 'dev-2', 'dev-3'];
const SECTION_LABEL = {
  hero: 'Hero con llamada a la acción', about: 'Sección Nosotros', services: 'Grilla de servicios',
  benefits: 'Beneficios con iconos', testimonials: 'Testimonios', gallery: 'Galería', hours: 'Horarios',
  faq: 'Preguntas frecuentes', contact: 'Contacto, WhatsApp y formulario', footer: 'Pie de página'
};

function balancer(tasks = []) {
  const load = Object.fromEntries(DEVS.map((d) => [d, 0]));
  for (const t of tasks) if (load[t.assignee] !== undefined) load[t.assignee]++;
  return () => {
    const dev = DEVS.reduce((best, d) => (load[d] < load[best] ? d : best), DEVS[0]);
    load[dev]++;
    return dev;
  };
}

export function planTasks(structure, brief) {
  const sections = Array.isArray(structure?.sections) ? structure.sections : [];
  const name = brief?.businessName || 'el negocio';
  const next = balancer();
  let n = 0;
  const mk = (o) => ({ id: `T${++n}`, description: '', dependsOn: [], status: 'pending', ...o, assignee: next() });

  const list = [];
  const scaffold = mk({ title: 'Estructura base y navegación', description: `Header sticky, menú móvil y botón flotante para ${name}`, priority: 1, type: 'scaffold' });
  const styles = mk({ title: 'Sistema de diseño (CSS)', description: 'Variables del tema, tipografía fluida y estilo visual', priority: 1, type: 'styles' });
  list.push(scaffold, styles);

  // hero y contact primero; el resto por section.priority (estable)
  const idx = new Map(sections.map((s, i) => [s, i]));
  const rank = (s) => (s.type === 'hero' ? 0 : s.type === 'contact' ? 1 : 2);
  const ordered = [...sections].sort((a, b) =>
    rank(a) - rank(b) || (rank(a) === 2 ? (Number(a.priority) || 99) - (Number(b.priority) || 99) : 0) || idx.get(a) - idx.get(b));

  let prio = 1;
  const sectionTasks = ordered.map((s) => {
    prio += (s.type === 'contact' ? 0 : 1);
    return mk({
      title: SECTION_LABEL[s.type] || `Sección ${s.type}`,
      description: s.purpose || `Construir la sección ${s.id}`,
      priority: s.type === 'contact' ? 2 : prio,
      type: 'section', sectionId: s.id, dependsOn: [scaffold.id, styles.id]
    });
  });
  list.push(...sectionTasks);
  const top = Math.max(...list.map((t) => t.priority));
  const script = mk({ title: 'Interacciones y animaciones', description: 'Menú móvil, on-scroll, formulario a WhatsApp/mailto', priority: top + 1, type: 'script', dependsOn: [scaffold.id] });
  const seo = mk({ title: 'SEO, Open Graph y JSON-LD', description: 'Meta, favicon, LocalBusiness, robots y sitemap', priority: top + 1, type: 'seo', dependsOn: [scaffold.id] });
  list.push(script, seo);
  const assemble = mk({ title: 'Ensamblado final', description: 'Genera index.html, styles.css, script.js, robots.txt y sitemap.xml', priority: top + 2, type: 'assemble', dependsOn: list.map((t) => t.id) });
  list.push(assemble);

  return list.sort((a, b) => a.priority - b.priority || Number(a.id.slice(1)) - Number(b.id.slice(1)));
}

export function planFixes(failures, structure, existingTasks = []) {
  const reqs = new Map((structure?.requirements || []).map((r) => [r.id, r]));
  const base = (existingTasks || []).reduce((m, t) => Math.max(m, Number(String(t.id).replace(/\D/g, '')) || 0), 0);
  const assembleIds = (existingTasks || []).filter((t) => t.type === 'assemble').map((t) => t.id);
  const next = balancer((existingTasks || []).slice(-3));
  const out = [];
  const seen = new Set();
  let n = base;
  for (const f of failures || []) {
    if (!f || f.passed === true || f.met === true) continue;
    const id = String(f.id ?? f.name ?? 'x');
    if (seen.has(id)) continue;
    seen.add(id);
    const req = reqs.get(id);
    const text = String(f.text ?? f.name ?? req?.text ?? id);
    const detail = String(f.details ?? f.evidence ?? '');
    const check = req?.check || null;
    let sectionId;
    if (check?.kind === 'section') sectionId = (structure.sections || []).find((s) => s.id === check.value || s.type === check.value)?.id;
    out.push({
      id: `T${++n}`,
      title: `Corregir: ${text}`.slice(0, 120),
      description: detail ? `${text} — ${detail}` : text,
      priority: 1,
      assignee: next(),
      type: 'fix',
      ...(sectionId ? { sectionId } : {}),
      dependsOn: [...assembleIds],
      status: 'pending',
      fix: { failureId: id, text, details: detail, kind: check?.kind || 'generic', value: check?.value ?? '' }
    });
  }
  return out;
}
