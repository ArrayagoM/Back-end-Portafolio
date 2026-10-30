// Bus de eventos por proyecto, con historial para reconexiones SSE.
const MAX_HISTORY = 5000;
const histories = new Map();
const listeners = new Map();

export function emit(projectId, evt) {
  const e = { ...evt, ts: Date.now() };
  let h = histories.get(projectId);
  if (!h) { h = []; histories.set(projectId, h); }
  h.push(e);
  if (h.length > MAX_HISTORY) h.splice(0, h.length - MAX_HISTORY);
  const subs = listeners.get(projectId);
  if (subs) {
    for (const fn of [...subs]) {
      try { fn(e); } catch { /* un suscriptor roto no frena al resto */ }
    }
  }
  return e;
}

export function subscribe(projectId, fn) {
  let subs = listeners.get(projectId);
  if (!subs) { subs = new Set(); listeners.set(projectId, subs); }
  subs.add(fn);
  return () => {
    subs.delete(fn);
    if (subs.size === 0) listeners.delete(projectId);
  };
}

export function history(projectId) {
  return [...(histories.get(projectId) || [])];
}
