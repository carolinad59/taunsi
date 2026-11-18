import { h, toast } from '../ui.js';
import { play } from '../audio.js';
import { tnBlock } from './common.js';
import { recognitionSupported, listenOnce, recordingSupported, startRecording } from '../speech.js';
import { scoreSpeech, SPEECH_PASS } from '../normalize.js';

export const type = 'speak';
export const title = 'Dilo en voz alta';
export const canBuild = () => true;

export function build(item) {
  return { type, itemId: item.id, es: item.es, tn: item.tn, expected: item.tn };
}

/** Nunca bloquea: siempre hay autoevaluación ("Lo dije bien") y "Seguir". */
export function render(host, ex, api) {
  const item = api.item(ex.itemId);
  const status = h('p', { class: 'hint', role: 'status' }, '');
  const player = h('audio', { controls: true, class: 'rec-player', hidden: true });
  let rec = null;
  const btns = [
    h('button', { class: 'btn audio', type: 'button', onclick: () => play(item) }, '🔊 Escuchar modelo'),
    h('button', { class: 'btn audio', type: 'button', onclick: () => play(item, { slow: true }) }, '🐢 Lento'),
  ];
  if (recognitionSupported()) {
    btns.push(h('button', { class: 'btn audio', type: 'button', onclick: async () => {
      status.textContent = 'Escuchando…';
      try {
        const alts = await listenOnce('ar-TN');
        if (!alts.length) { status.textContent = 'No he oído nada. Prueba otra vez o usa «Lo dije bien».'; return; }
        const best = Math.max(...alts.map((a) => scoreSpeech(a, item)));
        status.textContent = `He entendido: «${alts[0]}»`;
        if (best >= SPEECH_PASS) api.finish(true, ex.tn);
        else status.textContent += ' — no coincide del todo. Repite o usa «Lo dije bien».';
      } catch (e) { status.textContent = 'El reconocimiento de voz no está disponible aquí. Usa la autoevaluación.'; }
    } }, '🎤 Hablar'));
  }
  if (recordingSupported()) {
    const recBtn = h('button', { class: 'btn audio', type: 'button', onclick: async () => {
      try {
        if (!rec) { rec = await startRecording(); recBtn.textContent = '⏹ Parar'; }
        else { const url = await rec.stop(); rec = null; recBtn.textContent = '⏺ Grabar mi voz'; player.src = url; player.hidden = false; player.play(); }
      } catch { toast('No se pudo acceder al micrófono'); rec = null; recBtn.textContent = '⏺ Grabar mi voz'; }
    } }, '⏺ Grabar mi voz');
    btns.push(recBtn);
  }
  host.append(h('p', { class: 'prompt-es' }, ex.es), h('div', { class: 'prompt-card' }, tnBlock(item, api.settings),
    item.pron ? h('p', { class: 'pron' }, `Pronunciación: ${item.pron}`) : null),
    h('div', { class: 'audio-row wrap' }, btns), player, status,
    h('div', { class: 'speak-actions' },
      h('button', { class: 'btn primary', type: 'button', onclick: () => api.finish(true, ex.tn) }, 'Lo dije bien'),
      h('button', { class: 'btn ghost', type: 'button', onclick: () => api.finish(null, ex.tn) }, 'Seguir')));
  return null; // finaliza con api.finish
}
