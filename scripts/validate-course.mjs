// Valida el contenido del curso. Sale con código 1 y mensajes claros si algo no cuadra.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { validateCourse } from '../js/course.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'));

export function loadUnits() {
  const idx = readJson('data/course.json');
  return idx.units.map((f) => readJson(`data/units/${f}.json`));
}

const units = loadUnits();
const errors = validateCourse(units);
const lessons = units.reduce((n, u) => n + u.lessons.length, 0);
const items = units.flatMap((u) => u.lessons.flatMap((l) => l.items));
if (errors.length) {
  console.error(`✖ ${errors.length} problema(s) en el contenido:\n`);
  for (const e of errors) console.error('  - ' + e);
  process.exit(1);
}
console.log(`✔ Curso válido: ${units.length} unidades, ${lessons} lecciones, ${items.length} ítems, ${items.filter((i) => i.review).length} marcados review:true`);
