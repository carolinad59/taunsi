// Progreso en localStorage con clave versionada. Exportar / importar como JSON.
export const KEY = 'taunsi.v1';

export function defaultState(now = Date.now()) {
  return {
    v: 1,
    xp: 0,
    streak: { count: 0, last: null },
    lessons: {},   // id -> { done, level 1..5, best }
    nodes: {},     // ids de repaso y pruebas completadas
    skipped: {},   // unidades saltadas con "Ya lo sé"
    srs: {},       // itemId -> { s, due, seen, fails }
    hearts: { n: 5, t: now },
    settings: { showArabic: true, heartsUnlimited: false, heartHours: 4, maxHearts: 5 },
  };
}

function ls() { try { return globalThis.localStorage ?? null; } catch { return null; } }

export function parseState(text) {
  const o = typeof text === 'string' ? JSON.parse(text) : text;
  if (!o || typeof o !== 'object' || o.v !== 1) throw new Error('Formato de progreso no válido');
  const d = defaultState();
  return {
    ...d, ...o,
    settings: { ...d.settings, ...(o.settings || {}) },
    streak: { ...d.streak, ...(o.streak || {}) },
    hearts: { ...d.hearts, ...(o.hearts || {}) },
    lessons: o.lessons || {}, nodes: o.nodes || {}, skipped: o.skipped || {}, srs: o.srs || {},
  };
}

export let state = (() => {
  try { const t = ls()?.getItem(KEY); return t ? parseState(t) : defaultState(); } catch { return defaultState(); }
})();

export function commit() { try { ls()?.setItem(KEY, JSON.stringify(state)); } catch { /* sin almacenamiento */ } }
export function replaceState(s) { state = s; commit(); }
export function resetState() { replaceState(defaultState()); }
export const exportJSON = () => JSON.stringify(state, null, 2);

export function dayKey(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function yesterday(now) { const y = new Date(now); y.setDate(y.getDate() - 1); return y; }

/** Racha vigente: se pierde si no hubo actividad ni hoy ni ayer. */
export function currentStreak(st, now = new Date()) {
  const l = st.streak.last;
  if (!l) return 0;
  return l === dayKey(now) || l === dayKey(yesterday(now)) ? st.streak.count : 0;
}

export function registerActivity(st, now = new Date()) {
  const today = dayKey(now);
  if (st.streak.last === today) return;
  st.streak.count = st.streak.last === dayKey(yesterday(now)) ? st.streak.count + 1 : 1;
  st.streak.last = today;
}
