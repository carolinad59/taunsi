// Lista los ítems que aún no tienen audio/<id>.mp3 (para grabarlos o generarlos después).
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const idx = JSON.parse(readFileSync(join(root, 'data/course.json'), 'utf8'));
const missing = [];
let total = 0;
for (const f of idx.units) {
  const u = JSON.parse(readFileSync(join(root, `data/units/${f}.json`), 'utf8'));
  for (const l of u.lessons) for (const it of l.items) {
    total++;
    if (!existsSync(join(root, 'audio', `${it.id}.mp3`))) missing.push(`${it.id}.mp3\t${it.tn}\t${it.ar || '(sin árabe: no habrá voz de respaldo)'}`);
  }
}
console.log(missing.join('\n'));
console.error(`\n${missing.length} de ${total} ítems sin mp3 (se usará síntesis de voz si el navegador tiene voz árabe).`);
