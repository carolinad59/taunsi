import { h } from '../ui.js';
import { shuffle, sample } from '../util.js';
import { isCorrect } from '../normalize.js';
import { tileBuilder, tokenPool } from './common.js';

export const type = 'translate_pick';
export const title = 'Traduce al tunecino';
export const canBuild = (item) => (item.tokens?.length || 0) >= 2;

export function build(item, { pool, rng }) {
  const own = new Set(item.tokens.map((t) => t.toLowerCase()));
  const cands = tokenPool(pool).filter((t) => !own.has(t.toLowerCase()));
  const n = Math.min(cands.length, rng() < 0.5 ? 2 : 3);
  return { type, itemId: item.id, es: item.es, tn: item.tn, alt: item.alt || [], bank: shuffle([...item.tokens, ...sample(cands, n, rng)], rng) };
}

export function render(host, ex, api) {
  host.append(h('p', { class: 'prompt-es' }, ex.es));
  const tb = tileBuilder(host, ex.bank, api);
  return { check: () => ({ correct: isCorrect(tb.value().join(' '), ex), expected: ex.tn }) };
}
