import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPath, unitNodes } from '../js/path.js';
import { tinyCourse, freshState } from './helpers.mjs';
import { dayKey, registerActivity, currentStreak, defaultState, parseState } from '../js/storage.js';

test('nodos: repaso tras cada 3 lecciones y prueba al final', () => {
  const c = tinyCourse();
  const nodes = unitNodes(c.units[0]);
  assert.deepEqual(nodes.map((n) => n.kind), ['lesson', 'lesson', 'lesson', 'review', 'lesson', 'test']);
});
test('solo la primera lección está disponible al empezar', () => {
  const p = buildPath(tinyCourse(), freshState());
  const st = p.flat.map((n) => n.status);
  assert.equal(st[0], 'available');
  assert.ok(st.slice(1).every((s) => s === 'locked'));
  assert.equal(p.next.id, 'a-l1');
});
test('desbloqueo secuencial: completar una lección libera la siguiente', () => {
  const s = freshState();
  s.lessons['a-l1'] = { done: true, level: 1 };
  const p = buildPath(tinyCourse(), s);
  assert.equal(p.flat[0].status, 'done');
  assert.equal(p.flat[1].status, 'available');
  assert.equal(p.flat[2].status, 'locked');
});
test('el repaso y la prueba se desbloquean en orden y la unidad 2 espera a la prueba', () => {
  const s = freshState();
  for (const id of ['a-l1', 'a-l2', 'a-l3']) s.lessons[id] = { done: true, level: 1 };
  let p = buildPath(tinyCourse(), s);
  assert.equal(p.next.kind, 'review');
  s.nodes['a-r1'] = true; s.lessons['a-l4'] = { done: true, level: 2 };
  p = buildPath(tinyCourse(), s);
  assert.equal(p.next.kind, 'test');
  assert.equal(p.units[1].nodes[0].status, 'locked');
  s.nodes['a-test'] = true;
  p = buildPath(tinyCourse(), s);
  assert.equal(p.next.id, 'b-l1');
  assert.equal(p.units[0].complete, true);
});
test('racha: suma días seguidos y se rompe si hay un hueco', () => {
  const st = defaultState();
  const d = (y, m, dd) => new Date(y, m - 1, dd, 12);
  registerActivity(st, d(2026, 3, 1)); registerActivity(st, d(2026, 3, 1));
  assert.equal(st.streak.count, 1);
  registerActivity(st, d(2026, 3, 2));
  assert.equal(st.streak.count, 2);
  assert.equal(currentStreak(st, d(2026, 3, 3)), 2);
  assert.equal(currentStreak(st, d(2026, 3, 5)), 0);
  registerActivity(st, d(2026, 3, 5));
  assert.equal(st.streak.count, 1);
  assert.equal(dayKey(d(2026, 3, 5)), '2026-03-05');
});
test('importar progreso valida la versión', () => {
  assert.throws(() => parseState('{"v":2}'));
  const ok = parseState(JSON.stringify({ v: 1, xp: 50 }));
  assert.equal(ok.xp, 50);
  assert.equal(ok.settings.maxHearts, 5);
});
