import { h } from '../ui.js';
import { play } from '../audio.js';
import { choiceList, distractorValues, makeOptions, audioButtons } from './common.js';

export const type = 'listen_choose';
export const title = 'Escucha y elige la traducción';
export const canBuild = (item, { pool }) => distractorValues(pool, 'es', item.es, 3, () => 0.5).length >= 2;

export function build(item, { pool, rng }) {
  const wrong = distractorValues(pool, 'es', item.es, 3, rng);
  return { type, itemId: item.id, expected: item.es, options: makeOptions(item.es, wrong, rng) };
}

export function render(host, ex, api) {
  const item = api.item(ex.itemId);
  host.append(h('div', { class: 'prompt-card center' }, audioButtons(item)));
  setTimeout(() => play(item), 250);
  const cl = choiceList(host, ex.options, api);
  return { check: () => ({ correct: !!cl.selected()?.correct, expected: ex.expected }) };
}
