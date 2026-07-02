// Genera los íconos PWA (192, 512, 512 maskable) a partir de una grilla pixel
// art 16x16, sin dependencias externas (ni sharp ni canvas): arma el PNG a
// mano con zlib (built-in de Node). Se ejecuta con `node scripts/generate-icons.mjs`.

import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, '../public/icons');
mkdirSync(outDir, { recursive: true });

// Colores del sistema de tokens (tailwind.config.ts)
const BG = [0x0f, 0x0e, 0x17];
const ACCENT_PRIMARY = [0x3f, 0xd0, 0xc9];
const GAME_1 = [0xff, 0xcd, 0x4b];

const GRID = 16;
const CENTER = (GRID - 1) / 2;

function buildGrid({ opaqueBackground, radius, highlightRadius }) {
  const pixels = new Uint8ClampedArray(GRID * GRID * 4);
  for (let y = 0; y < GRID; y += 1) {
    for (let x = 0; x < GRID; x += 1) {
      const dx = x - CENTER;
      const dy = y - CENTER;
      const dist = Math.abs(dx) + Math.abs(dy); // grilla en forma de diamante
      const hdx = x - (CENTER - 2);
      const hdy = y - (CENTER - 2);
      const highlightDist = Math.abs(hdx) + Math.abs(hdy);

      let rgb = null;
      let alpha = 0;
      if (dist <= radius) {
        rgb = highlightDist <= highlightRadius ? GAME_1 : ACCENT_PRIMARY;
        alpha = 255;
      } else if (opaqueBackground) {
        rgb = BG;
        alpha = 255;
      }

      const i = (y * GRID + x) * 4;
      if (rgb) {
        pixels[i] = rgb[0];
        pixels[i + 1] = rgb[1];
        pixels[i + 2] = rgb[2];
        pixels[i + 3] = alpha;
      }
    }
  }
  return pixels;
}

function upscaleNearestNeighbor(srcPixels, srcSize, destSize) {
  const dest = new Uint8ClampedArray(destSize * destSize * 4);
  for (let y = 0; y < destSize; y += 1) {
    const srcY = Math.floor((y * srcSize) / destSize);
    for (let x = 0; x < destSize; x += 1) {
      const srcX = Math.floor((x * srcSize) / destSize);
      const srcI = (srcY * srcSize + srcX) * 4;
      const destI = (y * destSize + x) * 4;
      dest[destI] = srcPixels[srcI];
      dest[destI + 1] = srcPixels[srcI + 1];
      dest[destI + 2] = srcPixels[srcI + 2];
      dest[destI + 3] = srcPixels[srcI + 3];
    }
  }
  return dest;
}

function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = new Uint32Array(256);
    for (let n = 0; n < 256; n += 1) {
      let c = n;
      for (let k = 0; k < 8; k += 1) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
      table[n] = c >>> 0;
    }
    crc32.table = table;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) {
    crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function encodePng(width, height, rgba) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // profundidad de bits
  ihdrData[9] = 6; // tipo de color: RGBA
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;
  const ihdr = pngChunk('IHDR', ihdrData);

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0; // sin filtro por fila
    Buffer.from(rgba.buffer, y * stride, stride).copy(raw, y * (stride + 1) + 1);
  }
  const idat = pngChunk('IDAT', deflateSync(raw, { level: 9 }));
  const iend = pngChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

function generate(name, size, opts) {
  const grid = buildGrid(opts);
  const upscaled = upscaleNearestNeighbor(grid, GRID, size);
  const png = encodePng(size, size, upscaled);
  writeFileSync(resolve(outDir, name), png);
  console.log(`✓ ${name} (${size}x${size})`);
}

generate('icon-192.png', 192, { opaqueBackground: false, radius: 6.5, highlightRadius: 2.5 });
generate('icon-512.png', 512, { opaqueBackground: false, radius: 6.5, highlightRadius: 2.5 });
generate('icon-512-maskable.png', 512, {
  opaqueBackground: true,
  radius: 4.5,
  highlightRadius: 1.5,
});
