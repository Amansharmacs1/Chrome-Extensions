/**
 * Generate PNG & SVG icon files for WordWise
 * Theme: Deep navy background with vibrant violet & electric sky open book 'W' emblem with wisdom spark.
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

      // Rounded rectangle background (radius ~ 0.28)
      const absX = Math.abs(nx);
      const absY = Math.abs(ny);
      const cornerR = 0.28;
      let inCard = false;

      if (absX <= 0.88 - cornerR && absY <= 0.88) {
        inCard = true;
      } else if (absX <= 0.88 && absY <= 0.88 - cornerR) {
        inCard = true;
      } else {
        const dx = absX - (0.88 - cornerR);
        const dy = absY - (0.88 - cornerR);
        if (dx * dx + dy * dy <= cornerR * cornerR) {
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

      // Default background: deep midnight navy gradient (#0B0F19 to #1E1B4B)
      const bgGrad = (ny + 1) * 0.5;
      let r = Math.round(11 + bgGrad * 18);
      let g = Math.round(15 + bgGrad * 12);
      let b = Math.round(28 + bgGrad * 45);
      let a = 255;

      // W letter / Open book emblem
      // 4 diagonal strokes forming the 'W':
      // Left stroke: from (-0.62, -0.45) down to (-0.35, 0.48)
      // Left-center stroke: from (-0.35, 0.48) up to (-0.02, -0.15)
      // Right-center stroke: from (-0.02, -0.15) down to (0.32, 0.48)
      // Right stroke: from (0.32, 0.48) up to (0.58, -0.45)

      function distToSegment(px, py, x1, y1, x2, y2) {
        const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
        if (l2 === 0) return Math.hypot(px - x1, py - y1);
        let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
        t = Math.max(0, Math.min(1, t));
        return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
      }

      const strokeW = 0.14;
      const d1 = distToSegment(nx, ny, -0.58, -0.42, -0.32, 0.45);
      const d2 = distToSegment(nx, ny, -0.32, 0.45, 0.0, -0.12);
      const d3 = distToSegment(nx, ny, 0.0, -0.12, 0.32, 0.45);
      const d4 = distToSegment(nx, ny, 0.32, 0.45, 0.58, -0.42);

      const minD = Math.min(d1, d2, d3, d4);

      if (minD < strokeW) {
        // Gradient along W: left violet (#A855F7), center radiant cyan (#38BDF8), right indigo (#6366F1)
        const t = (nx + 0.6) / 1.2;
        const strokeR = Math.round(168 * (1 - t) + 56 * t);
        const strokeG = Math.round(85 * (1 - t) + 189 * t);
        const strokeB = Math.round(247 * (1 - t) + 248 * t);

        const antialias = Math.min(1, (strokeW - minD) * 12);
        r = Math.round(r * (1 - antialias) + strokeR * antialias);
        g = Math.round(g * (1 - antialias) + strokeG * antialias);
        b = Math.round(b * (1 - antialias) + strokeB * antialias);
      }

      // Sparkle / Diamond in upper right quadrant (center at nx=0.55, ny=-0.58)
      const sx = Math.abs(nx - 0.46);
      const sy = Math.abs(ny - (-0.58));
      const sparkDist = sx + sy; // Diamond metric
      if (sparkDist < 0.16) {
        const sparkAlpha = Math.min(1, (0.16 - sparkDist) * 16);
        r = Math.round(r * (1 - sparkAlpha) + 254 * sparkAlpha);
        g = Math.round(g * (1 - sparkAlpha) + 240 * sparkAlpha);
        b = Math.round(b * (1 - sparkAlpha) + 138 * sparkAlpha);
      }

      // Underline / Book base spine curved stroke
      // from (-0.45, 0.65) to (0.45, 0.65) curving up at center
      const spineY = 0.62 - 0.08 * Math.cos((nx / 0.5) * (Math.PI / 2));
      if (Math.abs(nx) < 0.48 && Math.abs(ny - spineY) < 0.05) {
        const spineAlpha = Math.min(1, (0.05 - Math.abs(ny - spineY)) * 25);
        r = Math.round(r * (1 - spineAlpha) + 139 * spineAlpha);
        g = Math.round(g * (1 - spineAlpha) + 92 * spineAlpha);
        b = Math.round(b * (1 - spineAlpha) + 246 * spineAlpha);
      }

      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const idatData = deflateSync(rawData);
  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', idatData);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Generate PNGs
sizes.forEach(size => {
  const pngBuf = createPNG(size);
  const filePath = path.join(iconsDir, `icon${size}.png`);
  fs.writeFileSync(filePath, pngBuf);
  console.log(`Generated icon: ${filePath} (${pngBuf.length} bytes)`);
});

// Generate scalable SVG
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0B0F19"/>
      <stop offset="100%" stop-color="#1E1B4B"/>
    </linearGradient>
    <linearGradient id="wGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#A855F7"/>
      <stop offset="50%" stop-color="#6366F1"/>
      <stop offset="100%" stop-color="#38BDF8"/>
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="3" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>

  <!-- Background Card -->
  <rect width="128" height="128" rx="28" fill="url(#bgGrad)"/>
  <rect x="1" y="1" width="126" height="126" rx="27" fill="none" stroke="#312E81" stroke-width="2" stroke-opacity="0.6"/>

  <!-- Open Book Page Base / Spine -->
  <path d="M 28 98 Q 64 88 100 98" fill="none" stroke="#8B5CF6" stroke-width="5" stroke-linecap="round"/>

  <!-- Letter 'W' / Open Book Pages Wings -->
  <path d="M 28 36 L 46 88 L 64 48 L 82 88 L 100 36"
        fill="none"
        stroke="url(#wGrad)"
        stroke-width="11"
        stroke-linecap="round"
        stroke-linejoin="round"
        filter="url(#glow)"/>

  <!-- Wisdom Sparkle Diamond -->
  <path d="M 98 22 L 101 27 L 106 30 L 101 33 L 98 38 L 95 33 L 90 30 L 95 27 Z" fill="#FDE047"/>
  <circle cx="98" cy="30" r="1.5" fill="#FFFFFF"/>
</svg>`;

fs.writeFileSync(path.join(iconsDir, 'icon.svg'), svgContent, 'utf8');
console.log('Generated icon.svg successfully.');
