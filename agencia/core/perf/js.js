// Minificador de JS conservador con tokenizador propio. Nunca ejecuta el código: solo lo compila (vm.Script) para validar.
// Respeta strings, template literals (anidados), regex vs división y ASI. Si no puede garantizar un caso, degrada
// (modo "light": conserva cada salto de línea original) o devuelve el archivo intacto.
import vm from 'node:vm';

const REGEX_AFTER_KW = new Set(['return', 'typeof', 'instanceof', 'in', 'of', 'new', 'delete', 'void', 'throw', 'case', 'do', 'else', 'yield', 'await', 'extends']);
const CONTROL = new Set(['if', 'while', 'for', 'with']);
const RESTRICTED = new Set(['return', 'break', 'continue', 'throw', 'yield', 'async', 'let', 'await']);
const PUNCTS = ['>>>=', '...', '===', '!==', '**=', '<<=', '>>=', '>>>', '&&=', '||=', '??=', '=>', '==', '!=', '<=', '>=', '&&', '||', '??', '?.', '++', '--', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '**', '<<', '>>'];
const idStart = (c) => /[A-Za-z_$\u0080-￿]/.test(c);
const idPart = (c) => /[\w$\u0080-￿]/.test(c);

function skipString(src, i) {
  const q = src[i];
  let j = i + 1;
  while (j < src.length) {
    if (src[j] === '\\') { j += 2; continue; }
    if (src[j] === q) return j + 1;
    if (src[j] === '\n') return -1;
    j++;
  }
  return -1;
}

function skipTemplate(src, i) {
  let j = i + 1;
  while (j < src.length) {
    const c = src[j];
    if (c === '\\') { j += 2; continue; }
    if (c === '`') return j + 1;
    if (c === '$' && src[j + 1] === '{') { j = skipExpr(src, j + 2); if (j < 0) return -1; continue; }
    j++;
  }
  return -1;
}

function skipExpr(src, i) {
  let depth = 1; let j = i;
  while (j < src.length) {
    const c = src[j];
    if (c === '"' || c === "'") { j = skipString(src, j); if (j < 0) return -1; continue; }
    if (c === '`') { j = skipTemplate(src, j); if (j < 0) return -1; continue; }
    if (c === '/' && src[j + 1] === '/') { while (j < src.length && src[j] !== '\n') j++; continue; }
    if (c === '/' && src[j + 1] === '*') { const e = src.indexOf('*/', j + 2); if (e < 0) return -1; j = e + 2; continue; }
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return j + 1; }
    j++;
  }
  return -1;
}

/** -> { tokens:[{k,v,nl,ctl?}], unsure:[string], error?:string } */
export function tokenizeJs(src) {
  const tokens = []; const unsure = [];
  const parens = [];
  let i = 0; let nl = false; let prev = null;
  const n = src.length;
  const push = (k, v, extra) => { const t = { k, v, nl, ...extra }; tokens.push(t); prev = t; nl = false; };
  const regexAllowed = () => {
    if (!prev) return true;
    if (['num', 'str', 'tpl', 're', 'priv'].includes(prev.k)) return false;
    if (prev.k === 'id') return REGEX_AFTER_KW.has(prev.v);
    if (prev.v === ')') return !!prev.ctl;
    if (prev.v === ']') return false;
    if (prev.v === '}') { unsure.push('barra tras }'); return false; }
    if (prev.v === '++' || prev.v === '--') return false;
    return true;
  };
  while (i < n) {
    const c = src[i];
    if (c === '\n' || c === '\r' || c === ' ' || c === ' ') { nl = true; i++; continue; }
    if (c === ' ' || c === '\t' || c === '\f' || c === '\v' || c === ' ' || c === '﻿') { i++; continue; }
    if (c === '/' && src[i + 1] === '/') { while (i < n && src[i] !== '\n' && src[i] !== '\r') i++; continue; }
    if (c === '/' && src[i + 1] === '*') {
      const e = src.indexOf('*/', i + 2);
      if (e < 0) return { tokens, unsure, error: 'comentario sin cerrar' };
      if (/[\n\r]/.test(src.slice(i, e))) nl = true;
      i = e + 2; continue;
    }
    if (c === '#' && i === 0 && src[1] === '!') { while (i < n && src[i] !== '\n') i++; continue; }
    if (c === '"' || c === "'") {
      const j = skipString(src, i);
      if (j < 0) return { tokens, unsure, error: 'string sin cerrar' };
      push('str', src.slice(i, j)); i = j; continue;
    }
    if (c === '`') {
      const j = skipTemplate(src, i);
      if (j < 0) return { tokens, unsure, error: 'template sin cerrar' };
      push('tpl', src.slice(i, j)); i = j; continue;
    }
    if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(src[i + 1] || ''))) {
      const m = /^(?:0[xXoObB][\da-fA-F_]+n?|(?:\d[\d_]*\.?[\d_]*|\.\d[\d_]*)(?:[eE][+-]?\d[\d_]*)?n?)/.exec(src.slice(i, i + 60));
      push('num', m[0]); i += m[0].length; continue;
    }
    if (idStart(c) || c === '\\') {
      let j = i;
      while (j < n && (idPart(src[j]) || src[j] === '\\')) { if (src[j] === '\\') unsure.push('escape en identificador'); j++; }
      const v = src.slice(i, j);
      push('id', v);
      i = j; continue;
    }
    if (c === '#' && idStart(src[i + 1] || '')) {
      let j = i + 1; while (j < n && idPart(src[j])) j++;
      push('priv', src.slice(i, j)); i = j; continue;
    }
    if (c === '/') {
      if (regexAllowed()) {
        let j = i + 1; let cls = false; let ok = false;
        while (j < n) {
          const d = src[j];
          if (d === '\n') break;
          if (d === '\\') { j += 2; continue; }
          if (d === '[') cls = true; else if (d === ']') cls = false;
          else if (d === '/' && !cls) { ok = true; break; }
          j++;
        }
        if (ok) {
          j++; while (j < n && /[a-z]/i.test(src[j])) j++;
          push('re', src.slice(i, j)); i = j; continue;
        }
        unsure.push('regex sin cerrar');
      }
      const op = src[i + 1] === '=' ? '/=' : '/';
      push('p', op); i += op.length; continue;
    }
    let p = PUNCTS.find((x) => src.startsWith(x, i));
    if (p === '?.' && /[0-9]/.test(src[i + 2] || '')) p = '?';
    p = p || c;
    const extra = {};
    if (p === '(') parens.push(!!(prev && prev.k === 'id' && CONTROL.has(prev.v)));
    if (p === ')') extra.ctl = parens.pop() || false;
    push('p', p, extra);
    i += p.length;
  }
  return { tokens, unsure };
}

const JOIN_AFTER = new Set(['{', '(', '[', ',', ';', ':', '?', '=', '+', '-', '*', '/', '%', '**', '&', '|', '^', '~', '!', '<', '>', '<=', '>=', '==', '===', '!=', '!==', '&&', '||', '??', '=>', '.', '?.', '...', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '**=', '<<=', '>>=', '>>>=', '&&=', '||=', '??=', '<<', '>>', '>>>']);
const JOIN_BEFORE = new Set([')', ']', '}', ',', ';', '.', '?.', ':', '?', '=', '=>', '+', '-', '*', '/', '%', '**', '&', '|', '^', '<', '>', '<=', '>=', '==', '===', '!=', '!==', '&&', '||', '??', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '**=', '<<=', '>>=', '>>>=', '&&=', '||=', '??=', '<<', '>>', '>>>', '(', '[']);

function safeJoin(a, b) {
  if (a.k === 'id' && RESTRICTED.has(a.v)) return b.k === 'p' && (b.v === ';' || b.v === '}' || b.v === ')');
  if (a.k === 'p' && JOIN_AFTER.has(a.v)) return true;
  if (b.k === 'p' && JOIN_BEFORE.has(b.v)) return true;
  return false;
}

const wc = (ch) => /[\w$\u0080-￿\\#]/.test(ch);
function needSpace(a, b) {
  const last = a.v[a.v.length - 1]; const first = b.v[0];
  if (wc(last) && wc(first)) return true;
  if ((last === '+' && first === '+') || (last === '-' && first === '-')) return true;
  if (last === '/' && (first === '/' || first === '*')) return true;
  if (a.k === 'num' && first === '.') return true;
  if (last === '?' && first === '.') return true;
  if (last === '<' && first === '!') return true;
  if (last === '-' && first === '>') return true;
  return false;
}

function emit(tokens, light) {
  let out = '';
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (i > 0) {
      const a = tokens[i - 1];
      if (t.nl && (light || !safeJoin(a, t))) out += '\n';
      else if (needSpace(a, t)) out += ' ';
    }
    out += t.v;
  }
  return out;
}

export function compiles(code, filename = 'script.js') {
  try { new vm.Script(code, { filename }); return true; } catch { return false; }
}

const sig = (tokens) => tokens.map((t) => `${t.k}:${t.v}`).join('\u0001');

/** -> { code, ok, mode:'full'|'light'|'none', reason? }. Nunca ejecuta el JS. */
export function minifyJs(src) {
  src = String(src ?? '');
  if (!src.trim()) return { code: src, ok: true, mode: 'none', reason: 'vacío' };
  if (!compiles(src)) return { code: src, ok: false, mode: 'none', reason: 'el original no compila' };
  const tk = tokenizeJs(src);
  if (tk.error) return { code: src, ok: false, mode: 'none', reason: tk.error };
  const want = sig(tk.tokens);
  const tryMode = (light) => {
    const code = emit(tk.tokens, light);
    if (!compiles(code)) return null;
    const re = tokenizeJs(code);
    if (re.error || sig(re.tokens) !== want) return null;
    return code;
  };
  const lightFirst = tk.unsure.length > 0;
  const order = lightFirst ? [true] : [false, true];
  for (const light of order) {
    const code = tryMode(light);
    if (code != null) return { code: code.trim(), ok: true, mode: light ? 'light' : 'full', reason: lightFirst ? `modo conservador: ${[...new Set(tk.unsure)].join(', ')}` : undefined };
  }
  return { code: src, ok: false, mode: 'none', reason: 'no se pudo garantizar la equivalencia' };
}

/** Info de strings para detectar clases construidas dinámicamente: prefijos/sufijos de concatenaciones. */
export function jsDynamicInfo(src) {
  const prefixes = []; const suffixes = [];
  const tk = tokenizeJs(String(src ?? ''));
  const T = tk.tokens;
  const lastWord = (s) => { const m = /([\w-]+)$/.exec(s); return m ? m[1] : ''; };
  const firstWord = (s) => { const m = /^([\w-]+)/.exec(s); return m ? m[1] : ''; };
  for (let i = 0; i < T.length; i++) {
    const t = T[i];
    if (t.k === 'str') {
      const body = t.v.slice(1, -1);
      const nextPlus = T[i + 1] && T[i + 1].v === '+';
      const prevPlus = T[i - 1] && T[i - 1].v === '+';
      if (nextPlus) { const w = lastWord(body); if (w) prefixes.push(w); }
      if (prevPlus) { const w = firstWord(body); if (w) suffixes.push(w); }
    } else if (t.k === 'tpl' && t.v.includes('${')) {
      const body = t.v.slice(1, -1);
      const parts = body.split(/\$\{[^}]*\}/);
      parts.forEach((p, idx) => {
        if (idx < parts.length - 1) { const w = lastWord(p); if (w) prefixes.push(w); }
        if (idx > 0) { const w = firstWord(p); if (w) suffixes.push(w); }
      });
    }
  }
  return { prefixes: [...new Set(prefixes)], suffixes: [...new Set(suffixes)] };
}
