// Agente SECURITY (Zoe, ciberseguridad): auditoría estática del sitio generado. Sin red, sin ejecutar nada.
// Contrato: auditSecurity(files, structure, brief) -> { passed, checks:[{id,name,passed,details,severity}], warnings:[...] }
// severity: 'high' | 'medium' | 'low'. passed=false si falla algún chequeo high/medium. Los low solo avisan.
import { parseHtml, decodeEntities } from './tester.js';

const RESOURCE_ORIGINS_OK = new Set(['fonts.googleapis.com', 'fonts.gstatic.com']);
const SECRET_PATTERNS = [
  [/AKIA[0-9A-Z]{16}/, 'clave de acceso AWS'],
  [/AIza[0-9A-Za-z_-]{35}/, 'API key de Google'],
  [/\bsk-[A-Za-z0-9]{20,}/, 'API key tipo sk-'],
  [/ghp_[A-Za-z0-9]{30,}/, 'token de GitHub'],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'clave privada'],
  [/\b(?:api[_-]?key|secret|passwd|password|token)\s*[:=]\s*['"][^'"\s]{8,}['"]/i, 'credencial hardcodeada'],
];

function chk(id, name, passed, details, severity = 'medium') {
  return { id, name, passed: !!passed, details: details || (passed ? 'OK' : ''), severity };
}
const list = (arr, n = 5) => arr.slice(0, n).join('; ') + (arr.length > n ? `; … (+${arr.length - n} más)` : '');

function hostOf(url) {
  try { return new URL(url).hostname; } catch { return ''; }
}

export function auditSecurity(files = {}, structure = {}, brief = {}) {
  const html = String(files['index.html'] ?? '');
  const js = String(files['script.js'] ?? '');
  const parsed = parseHtml(html);
  const els = parsed.elements || [];
  const checks = [];

  // 1. CSP
  const csp = els.find((e) => e.tag === 'meta' && /content-security-policy/i.test(e.attrs['http-equiv'] || ''));
  const cspText = csp ? decodeEntities(csp.attrs.content || '') : '';
  const cspProblems = [];
  if (!csp) cspProblems.push('falta <meta http-equiv="Content-Security-Policy">');
  else {
    if (/unsafe-eval/.test(cspText)) cspProblems.push("permite 'unsafe-eval'");
    const scriptSrc = (cspText.match(/script-src([^;]*)/) || [, ''])[1];
    if (/\*|https?:\s|'unsafe-inline'/.test(scriptSrc)) cspProblems.push("script-src demasiado permisivo (*, http:, 'unsafe-inline')");
    if (!/object-src\s+'none'/.test(cspText)) cspProblems.push("falta object-src 'none'");
    if (!/base-uri/.test(cspText)) cspProblems.push('falta base-uri');
  }
  checks.push(chk('sec-csp', 'Política de contenido (CSP) restrictiva', !cspProblems.length, cspProblems.join('; '), 'high'));

  // 2. enlaces target=_blank con rel=noopener
  const blank = els.filter((e) => e.tag === 'a' && /_blank/i.test(e.attrs.target || ''));
  const badBlank = blank.filter((e) => !/noopener/i.test(e.attrs.rel || '')).map((e) => e.attrs.href || '(sin href)');
  checks.push(chk('sec-noopener', 'Enlaces externos con rel="noopener" (anti tabnabbing)', !badBlank.length,
    badBlank.length ? `Sin noopener: ${list(badBlank)}` : `${blank.length} enlace(s) revisados`, 'high'));

  // 3. manejadores inline y javascript: URLs
  const inline = [];
  const jsUrls = [];
  for (const e of els) {
    for (const [k, v] of Object.entries(e.attrs || {})) {
      if (/^on[a-z]+$/i.test(k)) inline.push(`<${e.tag} ${k}>`);
      if (['href', 'src', 'action', 'formaction', 'xlink:href'].includes(k) && /^\s*(javascript|vbscript|data:text\/html)/i.test(String(v))) jsUrls.push(`<${e.tag} ${k}>`);
    }
  }
  checks.push(chk('sec-inline-handlers', 'Sin manejadores inline (onclick=…)', !inline.length, inline.length ? list(inline) : '', 'high'));
  checks.push(chk('sec-js-urls', 'Sin URLs javascript:/vbscript:', !jsUrls.length, jsUrls.length ? list(jsUrls) : '', 'high'));

  // 4. JS peligroso
  const danger = [];
  if (/\beval\s*\(/.test(js)) danger.push('eval()');
  if (/new\s+Function\s*\(/.test(js)) danger.push('new Function()');
  if (/document\.write(ln)?\s*\(/.test(js)) danger.push('document.write()');
  if (/set(?:Timeout|Interval)\s*\(\s*['"`]/.test(js)) danger.push('setTimeout/setInterval con string');
  checks.push(chk('sec-dangerous-js', 'script.js sin eval / Function / document.write', !danger.length, danger.join(', '), 'high'));
  const innerHtml = (js.match(/\.(?:innerHTML|outerHTML)\s*=/g) || []).length;
  checks.push(chk('sec-innerhtml', 'script.js no asigna innerHTML (riesgo XSS)', innerHtml === 0, innerHtml ? `${innerHtml} asignación(es) a innerHTML/outerHTML` : '', 'medium'));

  // 5. https / recursos de terceros
  const insecure = [];
  const foreign = [];
  for (const e of els) {
    // ¿esta etiqueta CARGA un recurso (a diferencia de un <a> que solo enlaza)?
    const loads = ['script', 'img', 'iframe', 'source', 'video', 'audio', 'embed', 'object'].includes(e.tag)
      || (e.tag === 'link' && /stylesheet|preload|modulepreload/i.test(e.attrs.rel || ''));
    for (const k of ['src', 'href', 'action', 'data']) {
      const v = String(e.attrs?.[k] ?? '');
      if (/^http:\/\//i.test(v)) insecure.push(`<${e.tag}> ${v}`);
      if (!loads || k === 'action' || !/^(https?:)?\/\//i.test(v)) continue;
      const host = hostOf(v.startsWith('//') ? `https:${v}` : v);
      if (host && !RESOURCE_ORIGINS_OK.has(host)) foreign.push(`<${e.tag}> ${host}`);
    }
  }
  checks.push(chk('sec-https', 'Sin recursos ni enlaces http:// (contenido mixto)', !insecure.length, insecure.length ? list(insecure) : '', 'high'));
  checks.push(chk('sec-third-party', 'Recursos de terceros solo de orígenes permitidos (Google Fonts)', !foreign.length, foreign.length ? `Orígenes no permitidos: ${list([...new Set(foreign)])}` : '', 'high'));
  const extScripts = els.filter((e) => e.tag === 'script' && e.attrs.src && /^(https?:)?\/\//i.test(e.attrs.src));
  checks.push(chk('sec-ext-scripts', 'Sin scripts externos', !extScripts.length, extScripts.length ? list(extScripts.map((e) => e.attrs.src)) : '', 'high'));
  const iframes = els.filter((e) => e.tag === 'iframe');
  const badFrames = iframes.filter((e) => e.attrs.sandbox === undefined);
  checks.push(chk('sec-iframes', 'iframes con sandbox', !badFrames.length, badFrames.length ? `${badFrames.length} iframe(s) sin sandbox` : `${iframes.length} iframe(s)`, 'medium'));

  // 6. formularios
  const forms = els.filter((e) => e.tag === 'form');
  const formProblems = [];
  for (const f of forms) {
    const action = String(f.attrs.action || '');
    if (action && !/^(mailto:|#|\/|\.\/|https:\/\/)/i.test(action)) formProblems.push(`action inseguro: ${action}`);
    if (/^http:/i.test(action)) formProblems.push(`action http: ${action}`);
  }
  const risky = els.filter((e) => e.tag === 'input' && /^(password|file)$/i.test(e.attrs.type || ''));
  if (risky.length) formProblems.push(`${risky.length} campo(s) password/file (un sitio estático sin backend no debe pedirlos)`);
  checks.push(chk('sec-forms', 'Formularios seguros (sin password/file, sin action http)', !formProblems.length, formProblems.join('; '), 'high'));

  // 7. secretos
  const secretHits = [];
  for (const [path, content] of Object.entries(files)) {
    if (path.startsWith('partials/') || path === '_headers') continue;
    for (const [re, label] of SECRET_PATTERNS) if (re.test(String(content))) secretHits.push(`${path}: ${label}`);
  }
  checks.push(chk('sec-secrets', 'Sin secretos ni credenciales en el código', !secretHits.length, secretHits.length ? list(secretHits) : '', 'high'));

  // 8. cabeceras
  const headers = String(files['_headers'] ?? '');
  const needH = ['Content-Security-Policy', 'X-Content-Type-Options', 'X-Frame-Options', 'Referrer-Policy', 'Strict-Transport-Security'];
  const missH = needH.filter((h) => !headers.includes(h));
  checks.push(chk('sec-headers-file', 'Archivo _headers con cabeceras de seguridad', !missH.length, missH.length ? `Faltan: ${missH.join(', ')}` : '', 'medium'));

  // 9. escape de texto del cliente (XSS reflejado desde el brief)
  const unescaped = [];
  const probe = [brief.businessName, brief.description, ...(brief.services || []).map((s) => s?.name), ...(brief.differentiators || [])]
    .map((v) => String(v ?? '')).filter((v) => /[<>"']/.test(v));
  for (const raw of probe) {
    const tagLike = raw.match(/<[^>]{1,60}>/);
    if (tagLike && html.includes(tagLike[0])) unescaped.push(tagLike[0]);
  }
  checks.push(chk('sec-escape', 'Texto del cliente escapado en el HTML', !unescaped.length,
    unescaped.length ? `HTML del cliente sin escapar: ${list(unescaped)}` : 'OK', 'high'));

  // 10. email expuesto en texto plano (aviso)
  const email = brief?.contact?.email;
  const visible = html.replace(/<script[\s\S]*?<\/script>/gi, '');
  const plainEmail = email && new RegExp(String(email).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(visible.replace(/href="mailto:[^"]*"/gi, ''));
  checks.push(chk('sec-email-scraping', 'Email visible en texto plano (puede recibir spam de bots)', !plainEmail,
    plainEmail ? 'Considerá un formulario o ofuscar el email; es un aviso, no bloquea.' : '', 'low'));

  const failed = checks.filter((c) => !c.passed);
  const blocking = failed.filter((c) => c.severity !== 'low');
  return {
    passed: blocking.length === 0,
    checks,
    warnings: failed.filter((c) => c.severity === 'low').map((c) => `${c.name}: ${c.details}`),
  };
}
