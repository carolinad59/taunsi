import { h } from '../ui.js';
import { play, replay } from '../audio.js';
import { shuffle, uniq } from '../util.js';

export function audioButtons(item) {
  return h('div', { class: 'audio-row' },
    h('button', { class: 'btn audio', type: 'button', 'aria-label': 'Escuchar a velocidad normal', onclick: () => play(item) }, '🔊 Normal'),
    h('button', { class: 'btn audio', type: 'button', 'aria-label': 'Escuchar despacio', onclick: () => play(item, { slow: true }) }, '🐢 Lento'),
    h('button', { class: 'btn audio', type: 'button', 'aria-label': 'Repetir', onclick: () => replay() }, '↻ Repetir'));
}

export function tnBlock(item, settings) {
  return h('div', { class: 'tn-block' },
    h('div', { class: 'tn' }, item.tn),
    settings.showArabic && item.ar ? h('div', { class: 'ar', dir: 'rtl', lang: 'ar-TN' }, item.ar) : null);
}

/** Lista de opciones de selección única. Llama a api.setReady(true) al elegir. */
export function choiceList(host, options, api) {
  let sel = null;
  const wrap = h('div', { class: 'choices', role: 'radiogroup' });
  options.forEach((o, i) => {
    const b = h('button', { class: 'choice', type: 'button', role: 'radio', 'aria-checked': 'false', 'data-opt': i },
      h('span', { class: 'k', 'aria-hidden': 'true' }, String(i + 1)), o.text);
    b.onclick = () => {
      sel = o;
      wrap.querySelectorAll('.choice').forEach((x) => { x.classList.remove('sel'); x.setAttribute('aria-checked', 'false'); });
      b.classList.add('sel'); b.setAttribute('aria-checked', 'true');
      api.setReady(true);
    };
    wrap.append(b);
  });
  host.append(wrap);
  return { selected: () => sel };
}

/** Fichas para construir una frase tocando. */
export function tileBuilder(host, words, api) {
  const ans = h('div', { class: 'answer-line', 'aria-label': 'Tu respuesta' });
  const bank = h('div', { class: 'bank', 'aria-label': 'Fichas disponibles' });
  const chosen = [];
  words.forEach((w, i) => {
    const b = h('button', { class: 'tile', type: 'button' }, w);
    b.onclick = () => {
      const k = chosen.indexOf(i);
      if (k >= 0) { chosen.splice(k, 1); bank.append(b); } else { chosen.push(i); ans.append(b); }
      api.setReady(chosen.length > 0);
    };
    bank.append(b);
  });
  host.append(ans, bank);
  return { value: () => chosen.map((i) => words[i]) };
}

/** Valores distintos de `key` en el pool, sin contar `exclude`. */
export function distractorValues(pool, key, exclude, n, rng) {
  const vals = uniq(pool.map((i) => i[key]).filter((v) => v && v !== exclude));
  return shuffle(vals, rng).slice(0, n);
}

export function makeOptions(correct, wrong, rng) {
  return shuffle([{ text: correct, correct: true }, ...wrong.map((text) => ({ text, correct: false }))], rng);
}

export const tokenPool = (pool) => uniq(pool.flatMap((i) => i.tokens || [i.tn]));
