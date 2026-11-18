// Repetición espaciada simple. Fuerza 0..5; intervalos en días según la fuerza tras acertar.
export const DAY = 86400000;
export const INTERVALS = [0, 1, 3, 7, 14, 30];

/** Devuelve la nueva entrada SRS tras responder. */
export function grade(entry, correct, now = Date.now()) {
  const s = entry?.s ?? 0;
  const seen = (entry?.seen ?? 0) + 1;
  const fails = entry?.fails ?? 0;
  if (!correct) return { s: 0, due: now, seen, fails: fails + 1 };
  const ns = Math.min(5, s + 1);
  return { s: ns, due: now + INTERVALS[ns] * DAY, seen, fails };
}

export const isDue = (entry, now = Date.now()) => !!entry && entry.due <= now;

/** Ids vencidos, primero los más débiles y los que llevan más tiempo vencidos. */
export function dueIds(srs, now = Date.now()) {
  return Object.keys(srs)
    .filter((id) => isDue(srs[id], now))
    .sort((a, b) => srs[a].s - srs[b].s || srs[a].due - srs[b].due);
}

/**
 * Elige n ids para repasar entre `candidateIds` (ítems ya vistos).
 * Prioridad: vencidos y débiles; luego los no vencidos más débiles.
 */
export function pickReview(candidateIds, srs, n, now = Date.now()) {
  const learned = candidateIds.filter((id) => srs[id]);
  const cmp = (a, b) => srs[a].s - srs[b].s || srs[a].due - srs[b].due;
  const due = learned.filter((id) => isDue(srs[id], now)).sort(cmp);
  const rest = learned.filter((id) => !isDue(srs[id], now)).sort(cmp);
  return [...due, ...rest].slice(0, n);
}
