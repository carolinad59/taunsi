import { h } from '../ui.js';
import { play } from '../audio.js';
import { isCorrect } from '../normalize.js';
import { audioButtons } from './common.js';

export const type = 'listen_type';
export const title = 'Escribe lo que oyes (Arabizi)';
export const canBuild = () => true;

export function build(item) {
  return { type, itemId: item.id, tn: item.tn, alt: item.alt || [], es: item.es };
}

export function render(host, ex, api) {
  const item = api.item(ex.itemId);
  const input = h('input', {
    class: 'text-input', type: 'text', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false',
    'aria-label': 'Escribe en Arabizi', placeholder: 'Escribe aquí…',
    oninput: () => api.setReady(input.value.trim().length > 0),
  });
  const keys = h('div', { class: 'keys', 'aria-label': 'Teclas de sonidos tunecinos' },
    ['2', '3', '5', '6', '7', '8', '9'].map((k) => h('button', { class: 'key', type: 'button', onclick: () => { input.value += k; input.focus(); api.setReady(true); } }, k)));
  host.append(h('div', { class: 'prompt-card center' }, audioButtons(item)), input, keys,
    h('p', { class: 'hint' }, 'Pista: ¿te cuesta una letra? Mira la guía de sonidos en Ajustes.'));
  setTimeout(() => play(item), 250);
  return { check: () => ({ correct: isCorrect(input.value, ex), expected: ex.tn }) };
}
