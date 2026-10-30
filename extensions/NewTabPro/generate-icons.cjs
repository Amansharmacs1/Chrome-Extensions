/**
 * Generate PNG icon files for NewTab Pro
 * Deep navy background with vibrant cyan/blue new-tab symbol
 */

const fs = require('fs');
const path = require('path');
const { deflateSync } = require('zlib');

const sizes = [16, 32, 48, 128];
const assetsDir = path.join(__dirname, 'assets');

if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

function crc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
    }
  }
  return (crc ^ -1) >>> 0;
}

function makeChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = data.length;
  const chunk = Buffer.alloc(12 + len);
  chunk.writeUInt32BE(len, 0);
  typeBuf.copy(chunk, 4);
  data.copy(chunk, 8);
  const crc = crc32(Buffer.concat([typeBuf, data]));
  chunk.writeUInt32BE(crc, 8 + len);
  return chunk;
}

function createPNG(size) {
  const width = size;
  const height = size;
  const rawData = Buffer.alloc((width * 4 + 1) * height);

  for (let y = 0; y < height; y++) {
    const rowStart = y * (width * 4 + 1);
    rawData[rowStart] = 0; // Filter: none

    for (let x = 0; x < width; x++) {
      const offset = rowStart + 1 + x * 4;
      const nx = x / width;
      const ny = y / height;

      // Outer margin and corner radius
      const margin = size * 0.08;
      const corner = size * 0.22;
      const inBoxX = x >= margin && x < width - margin;
      const inBoxY = y >= margin && y < height - margin;

      let inCard = false;
      if (inBoxX && inBoxY) {
        const left = margin + corner;
        const right = width - margin - corner;
        const top = margin + corner;
        const bottom = height - margin - corner;

        if (x < left && y < top) {
          const dx = x - left, dy = y - top;
          inCard = (dx * dx + dy * dy) <= corner * corner;
        } else if (x >= right && y < top) {
          const dx = x - right, dy = y - top;
          inCard = (dx * dx + dy * dy) <= corner * corner;
        } else if (x < left && y >= bottom) {
          const dx = x - left, dy = y - bottom;
          inCard = (dx * dx + dy * dy) <= corner * corner;
        } else if (x >= right && y >= bottom) {
          const dx = x - right, dy = y - bottom;
          inCard = (dx * dx + dy * dy) <= corner * corner;
        } else {
          inCard = true;
        }
      }

      if (!inCard) {
        // Transparent outside card
        rawData[offset] = 0;
        rawData[offset + 1] = 0;
        rawData[offset + 2] = 0;
        rawData[offset + 3] = 0;
        continue;
      }

      // Default card background: Deep slate navy gradient
      let r = Math.round(15 + 15 * nx);
      let g = Math.round(23 + 20 * ny);
      let b = Math.round(42 + 40 * (nx + ny) * 0.5);
      let a = 255;

      // Subtle cyan border
      const isBorder = (x <= margin + 1 || x >= width - margin - 2 || y <= margin + 1 || y >= height - margin - 2);
      if (isBorder && size >= 32) {
        r = Math.round(56 + 50 * nx);
        g = Math.round(189 + 30 * ny);
        b = 248;
      }

      // Modern icon symbol: Tab window + Plus / Spark (+)
      // Tab bar at top of inner card
      const barTop = margin + size * 0.14;
      const barHeight = Math.max(2, size * 0.08);
      if (y >= barTop && y < barTop + barHeight && x >= margin + size * 0.12 && x <= width - margin - size * 0.12) {
        // Tab header line (electric blue)
        r = 59; g = 130; b = 246;
      }

      // Plus / New Tab symbol in center
      const cx = width / 2;
      const cy = height / 2 + size * 0.05;
      const armLen = size * 0.22;
      const thick = Math.max(1, Math.round(size * 0.07));

      const inHBar = (Math.abs(y - cy) <= thick) && (Math.abs(x - cx) <= armLen);
      const inVBar = (Math.abs(x - cx) <= thick) && (Math.abs(y - cy) <= armLen);

      if (inHBar || inVBar) {
        // Bright cyan/white gradient
        r = 6;
        g = 182;
        b = 212;
        // Inner highlight
        if (Math.abs(y - cy) === 0 || Math.abs(x - cx) === 0) {
          r = 224;
          g = 242;
          b = 254;
        }
      }

      rawData[offset] = r;
      rawData[offset + 1] = g;
      rawData[offset + 2] = b;
      rawData[offset + 3] = a;
    }
  }

  // PNG Header
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const idat = deflateSync(rawData);

  return Buffer.concat([
    sig,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', idat),
    makeChunk('IEND', Buffer.alloc(0))
  ]);
}

for (const size of sizes) {
  const png = createPNG(size);
  const outPath = path.join(assetsDir, `icon${size}.png`);
  fs.writeFileSync(outPath, png);
  console.log(`Generated: assets/icon${size}.png (${png.length} bytes)`);
}

console.log('All icons generated successfully.');
