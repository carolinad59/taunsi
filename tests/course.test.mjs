import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCourse, buildUnitTestItems, itemsBefore, unitItems } from '../js/course.js';
import { realCourse } from './helpers.mjs';
import { mulberry32 } from '../js/util.js';

const item = (id, over = {}) => ({ id, type: 'word', es: 'a', tn: 'b', pron: 'p', ...over });
const lesson = (id, items) => ({ id, title: 't', grammar: { title: 'g', text_es: 'x' }, items });
const unit = (id, lessons) => ({ id, title: 't', can_do: 'c', color: '#000', icon: 'wave', lessons });
const eight = (p) => Array.from({ length: 8 }, (_, i) => item(`${p}${i}`, { tn: `w${p}${i}` }));
const ok = () => [unit('u', [lesson('u1', eight('a')), lesson('u2', eight('b')), lesson('u3', eight('c'))])];

test('el validador acepta contenido correcto', () => assert.deepEqual(validateCourse(ok()), []));
test('detecta ids duplicados', () => {
  const u = ok(); u[0].lessons[1].items[0].id = 'a0';
  assert.ok(validateCourse(u).some((e) => /duplicado/.test(e)));
});
test('detecta tokens que no unen tn', () => {
  const u = ok(); Object.assign(u[0].lessons[0].items[1], { type: 'phrase', tn: 'a b', tokens: ['a', 'c'] });
  assert.ok(validateCourse(u).some((e) => /tokens/.test(e)));
});
test('detecta lecciones con menos de 8 o más de 14 ítems', () => {
  const u = ok(); u[0].lessons[0].items.pop();
  assert.ok(validateCourse(u).some((e) => /7 ítems/.test(e)));
  const v = ok(); v[0].lessons[0].items.push(...Array.from({ length: 7 }, (_, i) => item(`x${i}`)));
  assert.ok(validateCourse(v).some((e) => /15 ítems/.test(e)));
});
test('detecta sentence sin tokens, falta es/tn y review sin nota', () => {
  const u = ok();
  Object.assign(u[0].lessons[0].items[0], { type: 'sentence', tn: 'a b c d' });
  delete u[0].lessons[0].items[1].es; delete u[0].lessons[0].items[2].tn;
  u[0].lessons[0].items[3].review = true;
  const e = validateCourse(u).join('\n');
  assert.match(e, /sentence/); assert.match(e, /Falta "es"/); assert.match(e, /Falta "tn"/); assert.match(e, /review:true sin "note"/);
});
test('detecta unidades con pocas lecciones', () => {
  const u = [unit('u', [lesson('u1', eight('a'))])];
  assert.ok(validateCourse(u).some((e) => /entre 3 y 5 lecciones/.test(e)));
});

test('CURSO REAL pasa la validación', () => {
  const c = realCourse();
  assert.deepEqual(validateCourse(c.units), []);
  assert.equal(c.units.length, 13);
});
test('CURSO REAL: ids únicos, tokens coherentes, review con nota', () => {
  const c = realCourse();
  const items = [...c.itemsById.values()];
  assert.ok(items.length > 300);
  for (const it of items) {
    if (it.tokens) assert.equal(it.tokens.join(' '), it.tn);
    if (it.review) assert.ok(it.note);
  }
  assert.ok(items.filter((i) => i.ar).length / items.length > 0.95, 'casi todos los ítems tienen árabe (para el audio)');
});
test('CURSO REAL: sin MSA ni marcadores TODO en los textos', () => {
  const c = realCourse();
  for (const it of c.itemsById.values()) assert.ok(!/\bTODO\b/.test(JSON.stringify(it)), it.id);
});
test('prueba de unidad: mezcla actual y anteriores sin repetir', () => {
  const c = realCourse();
  const u = c.units[3];
  const items = buildUnitTestItems(c, u, mulberry32(11), 12);
  assert.equal(items.length, 12);
  assert.equal(new Set(items.map((i) => i.id)).size, 12);
  const own = new Set(unitItems(u).map((i) => i.id));
  assert.ok(items.some((i) => !own.has(i.id)) && items.some((i) => own.has(i.id)));
  assert.ok(itemsBefore(c, 'u03-l01').length > 0);
});
