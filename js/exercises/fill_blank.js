import { h } from '../ui.js';
import { shuffle, sample } from '../util.js';
import { choiceList, tokenPool } from './common.js';

export const type = 'fill_blank';
export const title = 'Completa la frase';
export const canBuild = (item) => (item.tokens?.length || 0) >= 2;

export function build(item, { pool, rng }) {
  const blank = Math.floor(rng() * item.tokens.length);
  const answer = item.tokens[blank];
  const own = new Set(item.tokens.map((t) => t.toLowerCase()));
  const dis = sample(tokenPool(pool).filter((t) => !own.has(t.toLowerCase())), 3, rng);
  return {
    type, itemId: item.id, es: item.es, tn: item.tn, tokens: item.tokens, blank, answer,
    options: shuffle([answer, ...dis], rng).map((text) => ({ text, correct: text === answer })), expected: item.tn,
  };
}

export function render(host, ex, api) {
  const line = h('div', { class: 'blank-line' }, ex.tokens.map((t, i) => i === ex.blank ? h('span', { class: 'blank', 'aria-label': 'hueco' }, '＿＿＿') : h('span', { class: 'w' }, t)));
  host.append(h('p', { class: 'prompt-es' }, ex.es), h('div', { class: 'prompt-card' }, line));
  const cl = choiceList(host, ex.options, api);
  return { check: () => ({ correct: cl.selected()?.text === ex.answer, expected: ex.expected }) };
}
