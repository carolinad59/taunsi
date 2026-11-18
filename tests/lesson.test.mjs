import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLessonSession, buildTestSession, buildReviewSession, composeExercises, completeSession, xpFor, PASS_MARK, sessionForNode } from '../js/lesson.js';
import { mulberry32 } from '../js/util.js';
import { tinyCourse, realCourse, freshState } from './helpers.mjs';
import { ITEM_TYPES } from '../js/exercises/index.js';

const types = (s) => s.exercises.map((e) => e.type);
const noTriple = (t) => t.every((x, i) => i < 2 || !(x === t[i - 1] && x === t[i - 2]));

function checkSession(s, label) {
  const t = types(s);
  assert.ok(t.length >= 8 && t.length <= 12, `${label}: ${t.length} ejercicios`);
  assert.ok(new Set(t).size >= 4, `${label}: menos de 4 tipos (${[...new Set(t)]})`);
  assert.ok(noTriple(t), `${label}: 3 seguidos del mismo tipo: ${t}`);
}

test('lección: 8–12 ejercicios, ≥4 tipos, sin 3 seguidos y siempre incluye speak', () => {
  const c = tinyCourse();
  for (let seed = 1; seed <= 20; seed++) {
    const s = buildLessonSession(c, c.lessonById.get('a-l1'), freshState(), { rng: mulberry32(seed) });
    checkSession(s, `a-l1/${seed}`);
    assert.ok(types(s).includes('speak'));
  }
});
test('lección con repaso: mezcla ítems anteriores (~30 %)', () => {
  const c = tinyCourse();
  const st = freshState();
  for (const it of c.lessonById.get('a-l1').items) st.srs[it.id] = { s: 1, due: 0, seen: 1, fails: 0 };
  const s = buildLessonSession(c, c.lessonById.get('a-l2'), st, { rng: mulberry32(3) });
  const ids = s.exercises.flatMap((e) => e.itemId || e.itemIds || []);
  const old = ids.filter((id) => id.startsWith('a1-'));
  assert.ok(old.length >= 2, 'debe haber repaso de la lección 1');
  checkSession(s, 'a-l2');
});
test('los primeros ejercicios son de reconocimiento', () => {
  const c = tinyCourse();
  const s = buildLessonSession(c, c.lessonById.get('a-l1'), freshState(), { rng: mulberry32(9) });
  assert.ok(types(s).slice(0, 3).every((t) => ['tn_to_es_choice', 'listen_choose'].includes(t)));
});
test('cada ejercicio tiene datos suficientes', () => {
  const c = tinyCourse();
  const s = buildLessonSession(c, c.lessonById.get('a-l1'), freshState(), { rng: mulberry32(4) });
  for (const e of s.exercises) {
    if (e.options) { assert.ok(e.options.length >= 3); assert.equal(e.options.filter((o) => o.correct).length, 1); }
    if (e.bank) assert.ok(e.bank.length >= 2);
  }
});
test('prueba de unidad: 12 ejercicios, mezcla unidades anteriores, no requeue', () => {
  const c = tinyCourse();
  const s = buildTestSession(c, c.units[1], { rng: mulberry32(2) });
  assert.equal(s.exercises.length, 12);
  assert.equal(s.requeue, false);
  const ids = s.exercises.flatMap((e) => e.itemId || e.itemIds || []);
  assert.ok(ids.some((id) => id.startsWith('a')), 'incluye ítems de la unidad anterior');
  assert.ok(ids.some((id) => id.startsWith('b')));
  assert.equal(buildTestSession(c, c.units[1], { placement: true }).exercises.length, 10);
});
test('repaso libre necesita ítems aprendidos', () => {
  const c = tinyCourse();
  assert.equal(buildReviewSession(c, freshState()), null);
  const st = freshState();
  for (const it of c.lessonById.get('a-l1').items) st.srs[it.id] = { s: 0, due: 0, seen: 1, fails: 1 };
  const r = buildReviewSession(c, st, { rng: mulberry32(1) });
  assert.equal(r.kind, 'practice');
  assert.ok(r.exercises.length >= 8);
});
test('XP: 10 + 2 por acierto a la primera', () => {
  assert.equal(xpFor(0), 10);
  assert.equal(xpFor(10), 30);
});
test('completar lección: XP, nivel de dominio (1–5), racha y desbloqueo', () => {
  const c = tinyCourse();
  const st = freshState();
  const session = { kind: 'lesson', lessonId: 'a-l1' };
  const now = new Date(2026, 2, 1, 10);
  const r = completeSession(st, c, session, { total: 10, firstTry: 8 }, now);
  assert.equal(r.xp, 26);
  assert.equal(st.xp, 26);
  assert.equal(st.lessons['a-l1'].level, 1);
  assert.equal(st.streak.count, 1);
  for (let i = 0; i < 7; i++) completeSession(st, c, session, { total: 10, firstTry: 10 }, now);
  assert.equal(st.lessons['a-l1'].level, 5);
});
test('prueba: aprueba con ≥80 % y suspende por debajo', () => {
  const c = tinyCourse();
  const st = freshState();
  const t = { kind: 'test', nodeId: 'a-test', unitId: 'a' };
  const fail = completeSession(st, c, t, { total: 12, firstTry: 9 });
  assert.equal(fail.passed, false);
  assert.equal(st.nodes['a-test'], undefined);
  assert.equal(st.xp, 0);
  const ok = completeSession(st, c, t, { total: 12, firstTry: Math.ceil(12 * PASS_MARK) });
  assert.equal(ok.passed, true);
  assert.equal(st.nodes['a-test'], true);
});
test('"Ya lo sé": superar la prueba de ubicación salta toda la unidad', () => {
  const c = tinyCourse();
  const st = freshState();
  const r = completeSession(st, c, { kind: 'placement', unitId: 'a', nodeId: 'a-test' }, { total: 10, firstTry: 9 });
  assert.equal(r.passed, true);
  assert.ok(['a-l1', 'a-l2', 'a-l3', 'a-l4'].every((id) => st.lessons[id].done));
  assert.equal(st.nodes['a-r1'], true);
  assert.equal(st.nodes['a-test'], true);
  assert.equal(st.skipped.a, true);
});
test('repaso completado marca el nodo y da un corazón', () => {
  const c = tinyCourse();
  const st = freshState();
  st.hearts.n = 2; st.hearts.t = Date.now();
  completeSession(st, c, { kind: 'review', nodeId: 'a-r1' }, { total: 10, firstTry: 5 });
  assert.equal(st.nodes['a-r1'], true);
  assert.equal(st.hearts.n, 3);
});

test('CURSO REAL: todas las lecciones generan sesiones válidas (varias semillas)', () => {
  const c = realCourse();
  for (const l of c.lessonsFlat) {
    for (const seed of [1, 2, 3]) {
      const st = freshState();
      const s = buildLessonSession(c, l, st, { rng: mulberry32(seed) });
      checkSession(s, `${l.id}/${seed}`);
      assert.ok(types(s).includes('speak'), `${l.id} sin speak`);
    }
  }
});
test('CURSO REAL: pruebas de unidad, repasos y práctica', () => {
  const c = realCourse();
  for (const u of c.units) {
    const s = buildTestSession(c, u, { rng: mulberry32(5) });
    assert.ok(s.exercises.length >= 10, u.id);
    for (const node of ['r1', 'test']) {
      const st = freshState();
      const sess = sessionForNode(c, st, `${u.id}-${node}`, mulberry32(1));
      if (node === 'r1') { assert.ok(sess, `${u.id} repaso`); checkSession(sess, `${u.id}-r1`); }
    }
  }
});
test('CURSO REAL: cada tipo de ejercicio se genera al menos una vez', () => {
  const c = realCourse();
  const seen = new Set();
  for (const l of c.lessonsFlat) for (const e of buildLessonSession(c, l, freshState(), { rng: mulberry32(7) }).exercises) seen.add(e.type);
  for (const t of [...ITEM_TYPES, 'match_pairs', 'dialogue_reply']) assert.ok(seen.has(t), `falta ${t}`);
});
