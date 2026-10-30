/**
 * Generate PNG icon files for ReadEase
 * Deep calm paper-blue background with book/reading page symbol
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
      const nx = x / (width - 1);
      const ny = y / (height - 1);

      // Rounded squircle container
      const cx = (nx - 0.5) * 2;
      const cy = (ny - 0.5) * 2;
      const r = Math.pow(Math.abs(cx), 3.2) + Math.pow(Math.abs(cy), 3.2);

      if (r <= 0.85) {
        // Serene deep slate/navy background with subtle vertical gradient
        const bgR = Math.round(18 + ny * 12);
        const bgG = Math.round(26 + ny * 16);
        const bgB = Math.round(42 + ny * 20);

        let red = bgR;
        let green = bgG;
        let blue = bgB;
        let alpha = 255;

        // Open Book / Clean Reading Sheet glyph
        // Left page: x in [0.24, 0.47], y in [0.26, 0.74]
        // Right page: x in [0.53, 0.76], y in [0.26, 0.74]
        const inLeftPage = nx >= 0.24 && nx <= 0.47 && ny >= 0.26 && ny <= 0.74;
        const inRightPage = nx >= 0.53 && nx <= 0.76 && ny >= 0.26 && ny <= 0.74;

        if (inLeftPage || inRightPage) {
          // Warm paper tone
          red = 248;
          green = 246;
          blue = 240;

          // Reading lines on pages
          // Line 1: ny ~ 0.38
          // Line 2: ny ~ 0.50
          // Line 3: ny ~ 0.62
          const isLine1 = Math.abs(ny - 0.38) < 0.035;
          const isLine2 = Math.abs(ny - 0.50) < 0.035;
          const isLine3 = Math.abs(ny - 0.62) < 0.035;

          if (inLeftPage && (isLine1 || isLine2 || isLine3)) {
            // Calm cyan/blue ink lines on left
            red = 14;
            green = 165;
            blue = 233;
          } else if (inRightPage && (isLine1 || isLine2 || isLine3)) {
            // Elegant charcoal ink lines on right
            red = 100;
            green = 116;
            blue = 139;
          }
        }

        // Bookmark ribbon in the middle top (cyan accent)
        const inRibbon = nx >= 0.47 && nx <= 0.53 && ny >= 0.22 && ny <= 0.45;
        if (inRibbon) {
          red = 56;
          green = 189;
          blue = 248;
        }

        rawData[offset] = red;
        rawData[offset + 1] = green;
        rawData[offset + 2] = blue;
        rawData[offset + 3] = alpha;
      } else {
        // Transparent outside squircle
        rawData[offset] = 0;
        rawData[offset + 1] = 0;
        rawData[offset + 2] = 0;
        rawData[offset + 3] = 0;
      }
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8-bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const idat = deflateSync(rawData);

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', idat),
    makeChunk('IEND', Buffer.alloc(0))
  ]);
}

for (const size of sizes) {
  const png = createPNG(size);
  const filePath = path.join(assetsDir, `icon${size}.png`);
  fs.writeFileSync(filePath, png);
  console.log(`Generated icon: ${filePath} (${size}x${size})`);
}
