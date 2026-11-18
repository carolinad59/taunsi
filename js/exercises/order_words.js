import { h } from '../ui.js';
import { shuffle } from '../util.js';
import { isCorrect } from '../normalize.js';
import { tileBuilder } from './common.js';

export const type = 'order_words';
export const title = 'Ordena las palabras';
export const canBuild = (item) => (item.tokens?.length || 0) >= 2;

export function build(item, { rng }) {
  let bank = shuffle(item.tokens, rng);
  if (item.tokens.length > 2 && bank.join(' ') === item.tokens.join(' ')) bank = [...bank.slice(1), bank[0]];
  return { type, itemId: item.id, es: item.es, tn: item.tn, alt: item.alt || [], bank };
}

export function render(host, ex, api) {
  host.append(h('p', { class: 'prompt-es' }, ex.es));
  const tb = tileBuilder(host, ex.bank, api);
  return { check: () => ({ correct: isCorrect(tb.value().join(' '), ex), expected: ex.tn }) };
}
