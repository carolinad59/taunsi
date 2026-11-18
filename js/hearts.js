// Corazones: 5 por defecto, 1 se recupera cada `heartHours` horas, o con una sesión de repaso.
const HOUR = 3600000;
const cfg = (st) => ({
  max: st.settings.maxHearts ?? 5,
  every: Math.max(0.01, st.settings.heartHours ?? 4) * HOUR,
  unlimited: !!st.settings.heartsUnlimited,
});

/** Aplica la recuperación pendiente y devuelve los corazones actuales. */
export function heartsNow(st, now = Date.now()) {
  const c = cfg(st);
  const h = st.hearts;
  if (c.unlimited) return c.max;
  if (h.n >= c.max) { h.n = c.max; h.t = now; return h.n; }
  const gained = Math.floor((now - h.t) / c.every);
  if (gained > 0) {
    h.n = Math.min(c.max, h.n + gained);
    h.t = h.n >= c.max ? now : h.t + gained * c.every;
  }
  return h.n;
}

export function loseHeart(st, now = Date.now()) {
  const c = cfg(st);
  if (c.unlimited) return c.max;
  const before = heartsNow(st, now);
  if (before >= c.max) st.hearts.t = now; // empieza a contar la recuperación
  st.hearts.n = Math.max(0, before - 1);
  return st.hearts.n;
}

export function gainHeart(st, now = Date.now()) {
  const c = cfg(st);
  const before = heartsNow(st, now);
  st.hearts.n = Math.min(c.max, before + 1);
  if (st.hearts.n >= c.max) st.hearts.t = now;
  return st.hearts.n;
}

export const canPlay = (st, now = Date.now()) => cfg(st).unlimited || heartsNow(st, now) > 0;

/** Milisegundos hasta el siguiente corazón (0 si ya está al máximo o es ilimitado). */
export function msToNextHeart(st, now = Date.now()) {
  const c = cfg(st);
  if (c.unlimited || heartsNow(st, now) >= c.max) return 0;
  return Math.max(0, st.hearts.t + c.every - now);
}
