// Genera los íconos PWA (192, 512, 512 maskable): una marca circular lisa,
// renderizada con antialiasing directo a cada resolución (sin escalar una
// grilla chica, que es lo que daba el look "pixel art" — ver ADR-004).
// Sin dependencias externas (ni sharp ni canvas): arma el PNG a mano con
// zlib (built-in de Node). Se ejecuta con `node scripts/generate-icons.mjs`.

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

// Cobertura de un círculo en el pixel (cx,cy): 1 adentro, 0 afuera, con una
// banda de un píxel de antialiasing en el borde.
function circleCoverage(px, py, cx, cy, radius) {
  const dist = Math.hypot(px - cx, py - cy);
  return Math.max(0, Math.min(1, radius - dist + 0.5));
}

function compositeOver(dst, src) {
  // dst/src: {r,g,b,a} con a en [0,1]. Alpha compositing estándar ("over").
  const outA = src.a + dst.a * (1 - src.a);
  if (outA === 0) return { r: 0, g: 0, b: 0, a: 0 };
  const mix = (ch) => (src[ch] * src.a + dst[ch] * dst.a * (1 - src.a)) / outA;
  return { r: mix('r'), g: mix('g'), b: mix('b'), a: outA };
}

function renderIcon(size, { opaqueBackground, mainRadiusRatio, highlightRadiusRatio }) {
  const pixels = new Uint8ClampedArray(size * size * 4);
  const cx = size / 2;
  const cy = size / 2;
  const mainRadius = size * mainRadiusRatio;
  const highlightRadius = size * highlightRadiusRatio;
  const highlightCx = cx - mainRadius * 0.35;
  const highlightCy = cy - mainRadius * 0.35;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let pixel = opaqueBackground
        ? { r: BG[0], g: BG[1], b: BG[2], a: 1 }
        : { r: 0, g: 0, b: 0, a: 0 };

      const mainCoverage = circleCoverage(x + 0.5, y + 0.5, cx, cy, mainRadius);
      if (mainCoverage > 0) {
        pixel = compositeOver(pixel, {
          r: ACCENT_PRIMARY[0],
          g: ACCENT_PRIMARY[1],
          b: ACCENT_PRIMARY[2],
          a: mainCoverage,
        });
      }

      const highlightCoverage = circleCoverage(
        x + 0.5,
        y + 0.5,
        highlightCx,
        highlightCy,
        highlightRadius,
      );
      if (highlightCoverage > 0) {
        pixel = compositeOver(pixel, {
          r: GAME_1[0],
          g: GAME_1[1],
          b: GAME_1[2],
          a: highlightCoverage,
        });
      }

      const i = (y * size + x) * 4;
      pixels[i] = Math.round(pixel.r);
      pixels[i + 1] = Math.round(pixel.g);
      pixels[i + 2] = Math.round(pixel.b);
      pixels[i + 3] = Math.round(pixel.a * 255);
    }
  }
  return pixels;
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
  const pixels = renderIcon(size, opts);
  const png = encodePng(size, size, pixels);
  writeFileSync(resolve(outDir, name), png);
  console.log(`✓ ${name} (${size}x${size})`);
}

generate('icon-192.png', 192, {
  opaqueBackground: false,
  mainRadiusRatio: 0.38,
  highlightRadiusRatio: 0.16,
});
generate('icon-512.png', 512, {
  opaqueBackground: false,
  mainRadiusRatio: 0.38,
  highlightRadiusRatio: 0.16,
});
// Maskable: el contenido tiene que caber en la "safe zone" central (~80% del
// lienzo), por eso el radio es más chico y el fondo va opaco de punta a punta.
generate('icon-512-maskable.png', 512, {
  opaqueBackground: true,
  mainRadiusRatio: 0.3,
  highlightRadiusRatio: 0.13,
});
