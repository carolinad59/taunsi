import { h } from '../ui.js';
import { tnBlock, choiceList, distractorValues, makeOptions, audioButtons } from './common.js';

export const type = 'tn_to_es_choice';
export const title = '¿Qué significa?';
export const canBuild = (item, { pool }) => distractorValues(pool, 'es', item.es, 3, () => 0.5).length >= 2;

export function build(item, { pool, rng }) {
  const wrong = distractorValues(pool, 'es', item.es, 3, rng);
  return { type, itemId: item.id, tn: item.tn, ar: item.ar, expected: item.es, options: makeOptions(item.es, wrong, rng) };
}

export function render(host, ex, api) {
  const item = api.item(ex.itemId);
  host.append(h('div', { class: 'prompt-card' }, tnBlock(item, api.settings), audioButtons(item)));
  const cl = choiceList(host, ex.options, api);
  return { check: () => ({ correct: !!cl.selected()?.correct, expected: ex.expected }) };
}
