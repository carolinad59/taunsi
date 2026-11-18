// Carga, indexado y validación del curso. Sin DOM: se usa también desde scripts/ y tests/.
import { sample, shuffle } from './util.js';

export const ITEM_TYPES = ['word', 'phrase', 'sentence'];

export async function loadCourse(fetchJson) {
  const idx = await fetchJson('data/course.json');
  const units = await Promise.all(idx.units.map((f) => fetchJson(`data/units/${f}.json`)));
  return buildCourse(units);
}

export function buildCourse(units) {
  const itemsById = new Map(), lessonById = new Map(), unitOfLesson = new Map(), lessonOfItem = new Map();
  const lessonsFlat = [];
  for (const u of units) {
    for (const l of u.lessons) {
      lessonById.set(l.id, l); unitOfLesson.set(l.id, u); lessonsFlat.push(l);
      for (const it of l.items) { itemsById.set(it.id, it); lessonOfItem.set(it.id, l); }
    }
  }
  return { units, itemsById, lessonById, unitOfLesson, lessonOfItem, lessonsFlat };
}

export const unitItems = (unit) => unit.lessons.flatMap((l) => l.items);

/** Ítems de todas las lecciones anteriores a `lessonId` (orden del curso). */
export function itemsBefore(course, lessonId) {
  const idx = course.lessonsFlat.findIndex((l) => l.id === lessonId);
  return course.lessonsFlat.slice(0, Math.max(0, idx)).flatMap((l) => l.items);
}
export function itemsBeforeUnit(course, unitId) {
  const idx = course.units.findIndex((u) => u.id === unitId);
  return course.units.slice(0, Math.max(0, idx)).flatMap(unitItems);
}

/** Ítems de la prueba de unidad: ~75 % de la unidad y ~25 % de unidades anteriores. */
export function buildUnitTestItems(course, unit, rng = Math.random, n = 12) {
  const own = unitItems(unit);
  const older = itemsBeforeUnit(course, unit.id);
  const nOld = older.length ? Math.min(Math.round(n * 0.25), older.length) : 0;
  const picked = [...sample(own, Math.min(n - nOld, own.length), rng), ...sample(older, nOld, rng)];
  return shuffle(picked, rng);
}

/** Devuelve la lista de errores de contenido (vacía si todo cuadra). */
export function validateCourse(units) {
  const errs = [];
  const seen = { unit: new Set(), lesson: new Set(), item: new Set() };
  const dup = (kind, id, where) => {
    if (seen[kind].has(id)) errs.push(`Id duplicado (${kind}): "${id}" en ${where}`);
    seen[kind].add(id);
  };
  for (const u of units) {
    const uw = `unidad ${u.id}`;
    dup('unit', u.id, uw);
    for (const k of ['title', 'can_do', 'color', 'icon']) if (!u[k]) errs.push(`Falta "${k}" en ${uw}`);
    if (!Array.isArray(u.lessons) || u.lessons.length < 3 || u.lessons.length > 5)
      errs.push(`${uw}: debe tener entre 3 y 5 lecciones (tiene ${u.lessons?.length ?? 0})`);
    let total = 0;
    for (const l of u.lessons || []) {
      const lw = `lección ${l.id}`;
      dup('lesson', l.id, lw);
      if (!l.title) errs.push(`Falta "title" en ${lw}`);
      const n = l.items?.length ?? 0;
      total += n;
      if (n < 8 || n > 14) errs.push(`${lw}: tiene ${n} ítems (deben ser entre 8 y 14)`);
      if (!(l.items || []).some((i) => i.pron)) errs.push(`${lw}: ningún ítem tiene "pron" (pronunciación)`);
      if (!l.grammar?.text_es) errs.push(`${lw}: falta "grammar.text_es"`);
      for (const [di, d] of (l.dialogue || []).entries())
        if (!d.tn || !d.es) errs.push(`${lw}: línea de diálogo ${di + 1} sin tn o es`);
      for (const it of l.items || []) {
        const iw = `ítem ${it.id ?? '(sin id)'} (${l.id})`;
        if (!it.id) errs.push(`Ítem sin id en ${lw}`); else dup('item', it.id, iw);
        if (!it.es) errs.push(`Falta "es" en ${iw}`);
        if (!it.tn) errs.push(`Falta "tn" en ${iw}`);
        if (!ITEM_TYPES.includes(it.type)) errs.push(`${iw}: type inválido "${it.type}"`);
        const words = (it.tn || '').trim().split(/\s+/).filter(Boolean);
        if (it.type === 'sentence' && !it.tokens) errs.push(`${iw}: es "sentence" y no tiene "tokens"`);
        if (it.type === 'phrase' && words.length > 1 && !it.tokens) errs.push(`${iw}: frase de varias palabras sin "tokens"`);
        if (it.tokens && it.tokens.join(' ') !== it.tn)
          errs.push(`${iw}: tokens ["${it.tokens.join(' ')}"] no unen exactamente tn "${it.tn}"`);
        if (it.review && !it.note) errs.push(`${iw}: review:true sin "note" explicativa`);
        for (const f of ['es', 'tn', 'note', 'pron']) if (/\bTODO\b/.test(it[f] || '')) errs.push(`${iw}: contiene TODO en "${f}"`);
      }
    }
    if (total < 8) errs.push(`${uw}: no se puede generar la prueba de unidad (solo ${total} ítems)`);
  }
  return errs;
}
