/**
 * Generate PNG & SVG icon files for FontLens
 * Electric violet & cyan magnifying lens over a crisp typography letterform 'F'.
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

      if (absX <= 0.85 && absY <= 0.85) {
        if (absX <= (0.85 - cornerR) || absY <= (0.85 - cornerR)) {
          inCard = true;
        } else {
          const dx = absX - (0.85 - cornerR);
          const dy = absY - (0.85 - cornerR);
          if (dx * dx + dy * dy <= cornerR * cornerR) {
            inCard = true;
          }
        }
      }

      if (!inCard) {
        // Transparent outside card
        rawData[pxOffset] = 0;
        rawData[pxOffset + 1] = 0;
        rawData[pxOffset + 2] = 0;
        rawData[pxOffset + 3] = 0;
        continue;
      }

      // Card Background: Rich dark slate (#0B0F19 to #1E1B4B gradient)
      let r = 14;
      let g = 17;
      let b = 28;

      // Subtle border highlight
      const distFromEdge = 0.85 - Math.max(absX, absY);
      if (distFromEdge < 0.05 && distFromEdge >= 0) {
        r = 124;
        g = 58;
        b = 237; // Violet accent border
      }

      // Letter 'F' shape coordinates
      // Stem: nx between -0.42 and -0.20, ny between -0.55 and 0.55
      const inStem = (nx >= -0.42 && nx <= -0.20 && ny >= -0.55 && ny <= 0.55);
      // Top bar: nx between -0.20 and 0.35, ny between -0.55 and -0.35
      const inTopBar = (nx >= -0.20 && nx <= 0.35 && ny >= -0.55 && ny <= -0.35);
      // Mid bar: nx between -0.20 and 0.15, ny between -0.10 and 0.08
      const inMidBar = (nx >= -0.20 && nx <= 0.15 && ny >= -0.10 && ny <= 0.08);

      const inLetterF = inStem || inTopBar || inMidBar;

      if (inLetterF) {
        // Crisp white / soft lavender letterform
        r = 243;
        g = 244;
        b = 246;
      }

      // Lens Ring: Circle centered at (0.18, 0.18) with radius 0.42
      const lx = nx - 0.18;
      const ly = ny - 0.18;
      const lensDist = Math.sqrt(lx * lx + ly * ly);

      // Lens rim thickness
      if (lensDist >= 0.32 && lensDist <= 0.44) {
        // Electric Violet / Cyan gradient ring
        const t = (nx + ny + 2) / 4;
        r = Math.round(139 * (1 - t) + 6 * t);
        g = Math.round(92 * (1 - t) + 182 * t);
        b = Math.round(246 * (1 - t) + 212 * t);
      } else if (lensDist < 0.32) {
        // Inside lens glass: luminous glow tinting the letter 'F'
        if (inLetterF) {
          r = 167;
          g = 139;
          b = 250; // Tinted electric lavender
        } else {
          r = Math.min(255, r + 25);
          g = Math.min(255, g + 20);
          b = Math.min(255, b + 60); // Glass refraction
        }
      }

      // Lens Handle: angled line at 45 degrees from rim (0.42 to 0.70)
      const hx = nx - 0.48;
      const hy = ny - 0.48;
      const handleDist = Math.abs(hx - hy);
      const handlePos = (hx + hy) / 2;
      if (handleDist < 0.08 && handlePos >= -0.05 && handlePos <= 0.28) {
        r = 6;
        g = 182;
        b = 212; // Cyan handle
      }

      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = 255;
    }
  }

  // PNG header
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // Bit depth: 8
  ihdrData[9] = 6; // Color type: RGBA
  ihdrData[10] = 0; // Compression
  ihdrData[11] = 0; // Filter
  ihdrData[12] = 0; // Interlace
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  // IDAT chunk (compressed pixel data)
  const compressed = deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressed);

  // IEND chunk
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

for (const size of sizes) {
  const pngBuffer = createPNG(size);
  const filePath = path.join(iconsDir, `icon${size}.png`);
  fs.writeFileSync(filePath, pngBuffer);
  console.log(`Generated ${filePath} (${size}x${size})`);
}

// Write scalable SVG icon
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0F172A" />
      <stop offset="100%" stop-color="#1E1B4B" />
    </linearGradient>
    <linearGradient id="lensGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#8B5CF6" />
      <stop offset="100%" stop-color="#06B6D4" />
    </linearGradient>
    <linearGradient id="glassGlow" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="rgba(139, 92, 246, 0.25)" />
      <stop offset="100%" stop-color="rgba(6, 182, 212, 0.15)" />
    </linearGradient>
  </defs>
  <!-- Card Background -->
  <rect x="8" y="8" width="112" height="112" rx="28" fill="url(#bgGrad)" stroke="#7C3AED" stroke-width="2" />

  <!-- Letter 'F' Typography Glyphs -->
  <path d="M 32 32 L 72 32 L 72 44 L 46 44 L 46 58 L 68 58 L 68 70 L 46 70 L 46 96 L 32 96 Z" fill="#F3F4F6" />

  <!-- Magnifying Glass Lens -->
  <circle cx="78" cy="74" r="26" fill="url(#glassGlow)" stroke="url(#lensGrad)" stroke-width="5" />
  
  <!-- In-Lens Refracted Accent Character -->
  <text x="78" y="84" font-family="-apple-system, system-ui, sans-serif" font-size="28" font-weight="800" text-anchor="middle" fill="#C4B5FD">a</text>

  <!-- Handle -->
  <line x1="97" y1="93" x2="114" y2="110" stroke="#06B6D4" stroke-width="6" stroke-linecap="round" />
</svg>`;

const svgPath = path.join(iconsDir, 'icon.svg');
fs.writeFileSync(svgPath, svgContent);
console.log(`Generated ${svgPath}`);
