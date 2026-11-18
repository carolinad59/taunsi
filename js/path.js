// Recorrido: nodos, estados y desbloqueo (parte pura) + render del camino (DOM).
import { h } from './ui.js';

export const reviewId = (unit, k) => `${unit.id}-r${k}`;
export const testId = (unit) => `${unit.id}-test`;

/** Nodos de una unidad: lecciones, un repaso tras cada 3 lecciones y la prueba final. */
export function unitNodes(unit) {
  const nodes = [];
  let r = 0;
  unit.lessons.forEach((l, i) => {
    nodes.push({ id: l.id, kind: 'lesson', lesson: l, unitId: unit.id });
    if ((i + 1) % 3 === 0) nodes.push({ id: reviewId(unit, ++r), kind: 'review', unitId: unit.id });
  });
  nodes.push({ id: testId(unit), kind: 'test', unitId: unit.id });
  return nodes;
}

/** Calcula el estado de cada nodo. Desbloqueo secuencial: el anterior debe estar completado. */
export function buildPath(course, state) {
  const flat = [];
  let prevDone = true;
  const units = course.units.map((unit) => {
    const nodes = unitNodes(unit).map((n) => {
      const done = n.kind === 'lesson' ? !!state.lessons[n.id]?.done : !!state.nodes[n.id];
      const status = done ? 'done' : prevDone ? 'available' : 'locked';
      prevDone = done;
      const node = { ...n, status, level: n.kind === 'lesson' ? state.lessons[n.id]?.level || 0 : 0 };
      flat.push(node);
      return node;
    });
    return { unit, nodes, complete: nodes.every((n) => n.status === 'done') };
  });
  return { units, flat, next: flat.find((n) => n.status === 'available') || null };
}

const ICONS = { wave: '👋', sound: '🔊', coin: '💰', person: '🧑', food: '🍽️', basket: '🧺', family: '👪', clock: '⏰', map: '🗺️', repeat: '🔁', history: '⏪', health: '🩺', chat: '💬' };
const OFFSETS = [0, 38, 54, 38, 0, -38, -54, -38];

export function renderPath(host, course, state, { onNode, onSkip }) {
  const { units } = buildPath(course, state);
  host.replaceChildren();
  for (const { unit, nodes, complete } of units) {
    const head = h('header', { class: 'unit-head', style: `--unit:${unit.color}` },
      h('div', { class: 'unit-title' }, h('span', { class: 'unit-icon', 'aria-hidden': 'true' }, ICONS[unit.icon] || '📘'),
        h('div', {}, h('h2', {}, `${unit.id.toUpperCase()} · ${unit.title}`), h('p', {}, unit.can_do))),
      complete ? h('span', { class: 'pill' }, '✔ Completada')
        : h('button', { class: 'btn small ghost', type: 'button', onclick: () => onSkip(unit) }, 'Ya lo sé'));
    const lane = h('div', { class: 'lane', style: `--unit:${unit.color}` });
    nodes.forEach((n, i) => {
      const label = n.kind === 'lesson' ? n.lesson.title : n.kind === 'review' ? 'Repaso' : 'Prueba de unidad';
      const inner = n.kind === 'lesson' ? String(unit.lessons.indexOf(n.lesson) + 1) : n.kind === 'review' ? '↻' : '🏆';
      const btn = h('button', {
        class: `node ${n.kind} ${n.status}`, type: 'button', style: `--dx:${OFFSETS[i % 8]}px`,
        'aria-label': `${label}${n.status === 'locked' ? ' (bloqueada)' : n.status === 'done' ? ' (completada)' : ''}`,
        onclick: () => onNode(n),
      }, h('span', { class: 'node-n' }, n.status === 'locked' ? '🔒' : inner),
        n.level ? h('span', { class: 'crowns', 'aria-hidden': 'true' }, '★'.repeat(n.level)) : null);
      lane.append(h('div', { class: 'node-row', style: `--dx:${OFFSETS[i % 8]}px` }, btn, h('span', { class: 'node-label' }, label)));
    });
    host.append(head, lane);
  }
}
