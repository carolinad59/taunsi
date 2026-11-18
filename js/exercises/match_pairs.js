import { h } from '../ui.js';
import { shuffle } from '../util.js';

export const type = 'match_pairs';
export const title = 'Une las parejas';
export const canBuild = () => false; // se inserta aparte, con varios ítems

export function buildFrom(items, { rng }) {
  const seenEs = new Set(), seenTn = new Set(), pairs = [];
  for (const it of items) {
    if (seenEs.has(it.es) || seenTn.has(it.tn)) continue;
    seenEs.add(it.es); seenTn.add(it.tn); pairs.push({ id: it.id, es: it.es, tn: it.tn });
    if (pairs.length === 6) break;
  }
  if (pairs.length < 4) return null;
  return { type, itemIds: pairs.map((p) => p.id), pairs, left: shuffle(pairs, rng), right: shuffle(pairs, rng), expected: pairs.map((p) => `${p.tn} = ${p.es}`).join(' · ') };
}

export function render(host, ex, api) {
  let a = null, mistakes = 0, matched = 0;
  const mk = (side, p) => h('button', { class: 'pair', type: 'button', 'data-id': p.id, 'data-side': side }, side === 'l' ? p.es : p.tn);
  const L = h('div', { class: 'col' }, ex.left.map((p) => mk('l', p)));
  const R = h('div', { class: 'col' }, ex.right.map((p) => mk('r', p)));
  host.append(h('div', { class: 'pairs' }, L, R));
  host.addEventListener('click', (e) => {
    const b = e.target.closest('.pair');
    if (!b || b.disabled || b.classList.contains('done')) return;
    if (!a) { a = b; b.classList.add('sel'); return; }
    if (a === b) { b.classList.remove('sel'); a = null; return; }
    if (a.dataset.side === b.dataset.side) { a.classList.remove('sel'); a = b; b.classList.add('sel'); return; }
    if (a.dataset.id === b.dataset.id) {
      for (const x of [a, b]) { x.classList.remove('sel'); x.classList.add('done'); x.disabled = true; }
      matched++;
      if (matched === ex.pairs.length) setTimeout(() => api.finish(mistakes === 0, ex.expected), 350);
    } else {
      mistakes++;
      for (const x of [a, b]) { x.classList.add('bad'); setTimeout(() => x.classList.remove('bad', 'sel'), 450); }
    }
    a = null;
  });
  return null;
}
