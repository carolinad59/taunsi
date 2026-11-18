// Audio: audio/<id>.mp3 si existe; si no, síntesis de voz (ar-TN, luego ar) con el campo `ar`.
import { toast } from './ui.js';

const missing = new Set();   // ids sin mp3 (evita reintentos y errores 404 repetidos)
let current = null;
let lastOpts = {};
let lastItem = null;

const synth = () => globalThis.speechSynthesis;
export const voices = () => synth()?.getVoices?.() || [];
export function pickVoice() {
  const v = voices();
  const norm = (x) => (x.lang || '').toLowerCase().replace('_', '-');
  return v.find((x) => norm(x) === 'ar-tn') || v.find((x) => norm(x).startsWith('ar')) || null;
}

export function stop() {
  try { current?.pause?.(); } catch { /* nada */ }
  current = null;
  try { synth()?.cancel(); } catch { /* nada */ }
}

let warned = false;
function speak(text, rate) {
  return new Promise((resolve) => {
    if (!synth() || typeof SpeechSynthesisUtterance === 'undefined') return resolve(false);
    const voice = pickVoice();
    if (!voice && !warned) {
      warned = true;
      toast('Tu navegador no tiene voz árabe. Instala una voz del sistema o añade mp3 en audio/ (mira el README).', 6000);
    }
    const u = new SpeechSynthesisUtterance(text);
    if (voice) { u.voice = voice; u.lang = voice.lang; } else u.lang = 'ar-TN';
    u.rate = rate;
    u.onend = () => resolve(true);
    u.onerror = () => resolve(false);
    synth().cancel();
    synth().speak(u);
  });
}

/** Reproduce un ítem (o línea de diálogo). opts.slow = velocidad 0,6. Devuelve true si sonó algo. */
export async function play(item, { slow = false } = {}) {
  lastItem = item; lastOpts = { slow };
  stop();
  const rate = slow ? 0.6 : 1;
  if (item.id && !missing.has(item.id)) {
    const ok = await new Promise((resolve) => {
      const a = new Audio(`audio/${item.id}.mp3`);
      a.playbackRate = rate;
      a.onended = () => resolve(true);
      a.onerror = () => { missing.add(item.id); resolve(false); };
      current = a;
      a.play().catch(() => { missing.add(item.id); resolve(false); });
    });
    if (ok) return true;
  }
  if (item.ar) return speak(item.ar, rate);
  toast('Audio no disponible para este ítem');
  return false;
}
export const replay = () => (lastItem ? play(lastItem, lastOpts) : Promise.resolve(false));

/** Reproduce una lista de ítems en orden (botón "Escuchar la lección"). */
export async function playAll(items, { cancelled = () => false } = {}) {
  for (const it of items) {
    if (cancelled()) break;
    await play(it);
    await new Promise((r) => setTimeout(r, 450));
  }
}
