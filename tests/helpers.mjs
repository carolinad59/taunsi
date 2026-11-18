import { readFileSync } from 'node:fs';
import { buildCourse } from '../js/course.js';
import { defaultState } from '../js/storage.js';

export function realCourse() {
  const idx = JSON.parse(readFileSync(new URL('../data/course.json', import.meta.url)));
  return buildCourse(idx.units.map((f) => JSON.parse(readFileSync(new URL(`../data/units/${f}.json`, import.meta.url)))));
}
export const freshState = (now) => defaultState(now);

const mkItem = (id, tn, es, extra = {}) => ({ id, type: tn.includes(' ') ? 'phrase' : 'word', tn, es, ...(tn.includes(' ') ? { tokens: tn.split(' ') } : {}), ...extra });
export function tinyCourse() {
  const mkLesson = (id, items, extra = {}) => ({ id, title: id, kind: 'normal', grammar: { title: 'g', text_es: 't' }, items, ...extra });
  const w = (u, n) => Array.from({ length: n }, (_, i) => mkItem(`${u}-w${i}`, `pal${u}${i} x${i}`, `significado ${u}${i}`, { pron: 'p' }));
  const units = ['a', 'b'].map((u) => ({
    id: u, title: u, can_do: 'x', color: '#000', icon: 'wave',
    lessons: [1, 2, 3, 4].map((k) => mkLesson(`${u}-l${k}`, w(`${u}${k}`, 9))),
  }));
  return buildCourse(units);
}
