// Normalización de respuestas en Arabizi tunecino (ver README, sección "Convención de escritura").
const AR_DIAC = /[ً-ٰٟۖ-ۭـ]/g;

export const isArabic = (s) => /[؀-ۿ]/.test(s || '');

export function normalizeArabic(s = '') {
  return String(s)
    .replace(AR_DIAC, '')
    .replace(/[إأآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[^ء-ي\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Forma canónica de un texto en Arabizi para compararlo.
 * - minúsculas, sin tildes ni signos; guion = espacio
 * - apóstrofo => 3 ; sh => ch ; gh => 8 ; kh => 5 ; q => 9 ; ou => u
 * - letras repetidas se reducen (aa ~ a, ee ~ e, ii ~ i, ss ~ s)
 * Los dígitos NO se mezclan entre sí: 7 y h, 3 y a, 9 y 2... son errores,
 * salvo que el ítem los admita en `alt`.
 */
export function normalize(s = '') {
  let t = String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  t = t.replace(/[’‘`´ʿʻ']/g, '3');
  t = t.replace(/[^a-z0-9]+/g, ' ');
  t = t
    .replace(/sh/g, 'ch')
    .replace(/gh/g, '8')
    .replace(/kh/g, '5')
    .replace(/q/g, '9')
    .replace(/ou/g, 'u')
    .replace(/([a-z])\1+/g, '$1');
  return t.replace(/\s+/g, ' ').trim();
}

const squash = (s) => s.replace(/ /g, '');

/** ¿La respuesta del usuario coincide con tn o con alguna variante `alt`? */
export function isCorrect(answer, item) {
  const a = normalize(answer);
  if (!a) return false;
  const cands = [item.tn, ...(item.alt || [])].map(normalize);
  return cands.some((c) => c === a || squash(c) === squash(a));
}

export function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}

export function similarity(a, b) {
  if (!a && !b) return 1;
  const d = levenshtein(a, b);
  return 1 - d / Math.max(a.length, b.length, 1);
}

/** Puntuación flexible (0..1) de una transcripción de voz frente a un ítem. */
export function scoreSpeech(transcript, item) {
  if (!transcript) return 0;
  if (isArabic(transcript)) {
    if (!item.ar) return 0;
    const a = normalizeArabic(transcript).replace(/ /g, '');
    const b = normalizeArabic(item.ar).replace(/ /g, '');
    return similarity(a, b);
  }
  const t = normalize(transcript).replace(/ /g, '');
  return Math.max(...[item.tn, ...(item.alt || [])].map((c) => similarity(t, normalize(c).replace(/ /g, ''))));
}
export const SPEECH_PASS = 0.7;
