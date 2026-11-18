import { h } from '../ui.js';
import { sample, shuffle, uniq } from '../util.js';
import { choiceList } from './common.js';
import { play } from '../audio.js';

export const type = 'dialogue_reply';
export const title = 'Elige la respuesta adecuada';
export const canBuild = () => false; // se construye desde lesson.dialogue

export function buildFrom(lesson, { pool, rng }) {
  const d = lesson.dialogue || [];
  if (d.length < 2) return null;
  const i = 1 + Math.floor(rng() * (d.length - 1));
  const prompt = d[i - 1], reply = d[i];
  const wrongSrc = uniq([...d.map((x) => x.tn), ...pool.filter((p) => (p.tokens?.length || 0) >= 1).map((p) => p.tn)])
    .filter((t) => t !== reply.tn && t !== prompt.tn);
  const wrong = sample(wrongSrc, 3, rng);
  if (wrong.length < 2) return null;
  return {
    type, itemIds: [], prompt: { tn: prompt.tn, es: prompt.es, ar: prompt.ar }, expected: reply.tn, replyEs: reply.es,
    options: shuffle([{ text: reply.tn, correct: true }, ...wrong.map((text) => ({ text, correct: false }))], rng),
  };
}

export function render(host, ex, api) {
  const bubble = h('div', { class: 'bubble' }, h('div', { class: 'tn' }, ex.prompt.tn),
    h('div', { class: 'es' }, ex.prompt.es),
    ex.prompt.ar ? h('button', { class: 'btn audio small', type: 'button', onclick: () => play({ ar: ex.prompt.ar }) }, '🔊') : null);
  host.append(h('p', { class: 'hint' }, 'Te dicen:'), bubble, h('p', { class: 'hint' }, 'Tú respondes:'));
  const cl = choiceList(host, ex.options, api);
  return { check: () => ({ correct: !!cl.selected()?.correct, expected: `${ex.expected} (${ex.replyEs})` }) };
}
