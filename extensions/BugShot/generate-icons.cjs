/**
 * Generate PNG & SVG icon files for BugShot
 * Electric-blue crosshair & target bug-hunting viewfinder on deep navy slate.
 */

const fs = require('fs');
const path = require('path');
const { deflateSync } = require('zlib');

const sizes = [16, 32, 48, 128];
const iconsDir = path.join(__dirname, 'assets', 'icons');

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
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
    const rowOffset = y * (width * 4 + 1);
    rawData[rowOffset] = 0; // Filter: None

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;

      // Normalized coordinates -1 to 1
      const nx = (x / (width - 1)) * 2 - 1;
      const ny = (y / (height - 1)) * 2 - 1;

      // Rounded rectangle background (radius ~ 0.22)
      const absX = Math.abs(nx);
      const absY = Math.abs(ny);
      const cornerR = 0.28;
      let inCard = false;

      if (absX <= 0.88 && absY <= 0.88) {
        if (absX > (0.88 - cornerR) && absY > (0.88 - cornerR)) {
          const dx = absX - (0.88 - cornerR);
          const dy = absY - (0.88 - cornerR);
          inCard = (dx * dx + dy * dy) <= (cornerR * cornerR);
        } else {
          inCard = true;
        }
      }

      if (!inCard) {
        rawData[pxOffset] = 0;
        rawData[pxOffset + 1] = 0;
        rawData[pxOffset + 2] = 0;
        rawData[pxOffset + 3] = 0;
        continue;
      }

      // Background gradient: Navy #0a0f1d to Deep Slate #172554
      const t = (nx + ny + 2) / 4;
      let r = Math.round(10 + t * 13);
      let g = Math.round(15 + t * 22);
      let b = Math.round(29 + t * 55);

      // Dist from center
      const dist = Math.sqrt(nx * nx + ny * ny);

      // Outer viewfinder ring (radius 0.55, thickness 0.08)
      const ringOuter = 0.58;
      const ringInner = 0.46;
      const inRing = dist >= ringInner && dist <= ringOuter;

      // Crosshair lines (horizontal and vertical bars through the ring)
      const inCrosshairX = Math.abs(ny) < 0.06 && dist >= 0.25 && dist <= 0.72;
      const inCrosshairY = Math.abs(nx) < 0.06 && dist >= 0.25 && dist <= 0.72;

      // Central target dot / capture lens (radius 0.16)
      const inCenter = dist <= 0.18;

      // Corner target brackets (L-shapes in 4 corners of viewfinder)
      const isBracketX = (absX >= 0.62 && absX <= 0.76 && Math.abs(absY - 0.62) < 0.06);
      const isBracketY = (absY >= 0.62 && absY <= 0.76 && Math.abs(absX - 0.62) < 0.06);
      const inBracket = isBracketX || isBracketY;

      if (inCenter) {
        // Vibrant crimson / electric cyan target core
        r = 239; // Red-orange bug highlight
        g = 68;
        b = 68;
      } else if (inRing || inCrosshairX || inCrosshairY || inBracket) {
        // Electric Blue / Cyan #38bdf8 to #3b82f6
        r = 59;
        g = 130;
        b = 246;
      }

      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = 255;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const idatData = deflateSync(rawData, { level: 9 });

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', idatData),
    makeChunk('IEND', Buffer.alloc(0))
  ]);
}

for (const size of sizes) {
  const png = createPNG(size);
  const filePath = path.join(iconsDir, `icon${size}.png`);
  fs.writeFileSync(filePath, png);
  console.log(`Generated ${filePath} (${size}x${size})`);
}

// Generate vector SVG icon
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" fill="none">
  <defs>
    <linearGradient id="bgGrad" x1="0" y1="0" x2="128" y2="128" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#0b1120"/>
      <stop offset="100%" stop-color="#1e293b"/>
    </linearGradient>
    <linearGradient id="blueGrad" x1="20" y1="20" x2="108" y2="108" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#38bdf8"/>
      <stop offset="100%" stop-color="#3b82f6"/>
    </linearGradient>
  </defs>
  <rect width="128" height="128" rx="28" fill="url(#bgGrad)"/>
  <rect x="1.5" y="1.5" width="125" height="125" rx="26.5" stroke="#334155" stroke-width="2"/>
  <!-- Corner capture brackets -->
  <path d="M 28 42 L 28 28 L 42 28" stroke="url(#blueGrad)" stroke-width="4" stroke-linecap="round"/>
  <path d="M 100 42 L 100 28 L 86 28" stroke="url(#blueGrad)" stroke-width="4" stroke-linecap="round"/>
  <path d="M 28 86 L 28 100 L 42 100" stroke="url(#blueGrad)" stroke-width="4" stroke-linecap="round"/>
  <path d="M 100 86 L 100 100 L 86 100" stroke="url(#blueGrad)" stroke-width="4" stroke-linecap="round"/>
  <!-- Viewfinder circle -->
  <circle cx="64" cy="64" r="28" stroke="url(#blueGrad)" stroke-width="4" fill="none" opacity="0.9"/>
  <!-- Reticle crosshair -->
  <line x1="26" y1="64" x2="44" y2="64" stroke="url(#blueGrad)" stroke-width="4" stroke-linecap="round"/>
  <line x1="84" y1="64" x2="102" y2="64" stroke="url(#blueGrad)" stroke-width="4" stroke-linecap="round"/>
  <line x1="64" y1="26" x2="64" y2="44" stroke="url(#blueGrad)" stroke-width="4" stroke-linecap="round"/>
  <line x1="64" y1="84" x2="64" y2="102" stroke="url(#blueGrad)" stroke-width="4" stroke-linecap="round"/>
  <!-- Target bug core -->
  <circle cx="64" cy="64" r="8" fill="#ef4444"/>
</svg>`;

fs.writeFileSync(path.join(iconsDir, 'icon.svg'), svg, 'utf8');
console.log('Generated vector SVG icon');
