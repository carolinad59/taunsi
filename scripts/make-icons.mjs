// Genera los iconos PNG (192, 512 y maskable) sin dependencias. Uso: node scripts/make-icons.mjs
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';

function crc32(buf) {
  let c, crc = ~0;
  for (let n = 0; n < buf.length; n++) { c = (crc ^ buf[n]) & 0xff; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crc = (crc >>> 8) ^ c; }
  return ~crc >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
const BLUE = [27, 95, 168], SAND = [250, 246, 239], RED = [228, 87, 46];

function star(x, y) { // estrella de 5 puntas aproximada (coordenadas normalizadas -1..1)
  const r = Math.hypot(x, y), a = Math.atan2(y, x) + Math.PI / 2;
  const seg = (2 * Math.PI) / 5, t = ((a % seg) + seg) % seg - seg / 2;
  const k = Math.abs(t) / (seg / 2); // 0 en la punta, 1 en el valle
  return r < 0.62 * (1 - 0.55 * k);
}
function png(size, maskable) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const nx = (x / size) * 2 - 1, ny = (y / size) * 2 - 1;
      let col = BLUE, a = 255;
      const corner = maskable ? 0 : 0.22;
      const ax = Math.abs(nx) - (1 - corner), ay = Math.abs(ny) - (1 - corner);
      if (corner && ax > 0 && ay > 0 && Math.hypot(ax, ay) > corner) a = 0;
      const R = maskable ? 0.55 : 0.7;
      if (Math.hypot(nx, ny) < R) col = SAND;
      const s = R / 0.7;
      if (star(nx / s, (ny + 0.1 * s) / s)) col = RED;
      if (Math.abs(nx) < 0.34 * s && ny > 0.42 * s && ny < 0.54 * s) col = BLUE;
      const o = y * (size * 4 + 1) + 1 + x * 4;
      raw[o] = col[0]; raw[o + 1] = col[1]; raw[o + 2] = col[2]; raw[o + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
writeFileSync('icons/icon-192.png', png(192, false));
writeFileSync('icons/icon-512.png', png(512, false));
writeFileSync('icons/icon-maskable-512.png', png(512, true));
console.log('Iconos generados en icons/');
