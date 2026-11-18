import test from 'node:test';
import assert from 'node:assert/strict';
import { grade, INTERVALS, DAY, dueIds, pickReview, isDue } from '../js/srs.js';

const NOW = Date.UTC(2026, 0, 10);
test('acierto sube 1 y programa 1,3,7,14,30 días', () => {
  let e = undefined;
  const days = [];
  for (let i = 0; i < 5; i++) { e = grade(e, true, NOW); days.push((e.due - NOW) / DAY); }
  assert.deepEqual(days, [1, 3, 7, 14, 30]);
  assert.equal(e.s, 5);
});
test('la fuerza no pasa de 5', () => {
  let e = { s: 5, due: NOW, seen: 9, fails: 0 };
  e = grade(e, true, NOW);
  assert.equal(e.s, 5);
  assert.equal(e.due, NOW + INTERVALS[5] * DAY);
});
test('fallo vuelve a 0 y se repite ya (due = ahora)', () => {
  const e = grade({ s: 4, due: NOW + 14 * DAY, seen: 4, fails: 0 }, false, NOW);
  assert.equal(e.s, 0);
  assert.equal(e.due, NOW);
  assert.equal(e.fails, 1);
  assert.ok(isDue(e, NOW));
});
test('dueIds ordena por debilidad y antigüedad', () => {
  const srs = { a: { s: 3, due: NOW - 1 }, b: { s: 0, due: NOW - 5 }, c: { s: 1, due: NOW + DAY }, d: { s: 0, due: NOW - 9 } };
  assert.deepEqual(dueIds(srs, NOW), ['d', 'b', 'a']);
});
test('pickReview prioriza vencidos y débiles, luego el resto', () => {
  const srs = { a: { s: 3, due: NOW - 1 }, b: { s: 0, due: NOW - 5 }, c: { s: 1, due: NOW + DAY }, d: { s: 5, due: NOW + 9 * DAY } };
  assert.deepEqual(pickReview(['a', 'b', 'c', 'd', 'zzz'], srs, 3, NOW), ['b', 'a', 'c']);
  assert.deepEqual(pickReview(['zzz'], srs, 3, NOW), []);
});
