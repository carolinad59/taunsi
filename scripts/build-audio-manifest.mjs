// Regenera audio/manifest.json con los mp3 presentes en audio/. Ejecútalo tras añadir mp3.
import { readdirSync, writeFileSync } from 'node:fs';
const ids = readdirSync(new URL('../audio/', import.meta.url)).filter((f) => f.endsWith('.mp3')).map((f) => f.slice(0, -4)).sort();
writeFileSync(new URL('../audio/manifest.json', import.meta.url), JSON.stringify(ids, null, 2) + '\n');
console.log(`${ids.length} mp3 en el manifiesto`);
