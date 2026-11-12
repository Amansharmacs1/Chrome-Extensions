/**
 * Generate PNG & SVG icon files for QRQuick
 * Theme: Dark charcoal/navy rounded square with electric cyan QR matrix glyph and center scan spark.
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

      if (absX <= 1 - cornerR && absY <= 1) {
        inCard = true;
      } else if (absX <= 1 && absY <= 1 - cornerR) {
        inCard = true;
      } else {
        const dx = absX - (1 - cornerR);
        const dy = absY - (1 - cornerR);
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

      // Base background: Dark navy (#0B0F19 to #1E293B)
      const gradT = (ny + 1) / 2;
      let r = Math.round(11 + gradT * (15 - 11));
      let g = Math.round(15 + gradT * (23 - 15));
      let b = Math.round(25 + gradT * (45 - 25));
      let a = 255;

      // Draw QR Icon inside card: 3 finder patterns + data bits
      // Map inner coordinate to 7x7 grid in bounds [-0.68, 0.68]
      const minBound = -0.68;
      const maxBound = 0.68;

      if (nx >= minBound && nx <= maxBound && ny >= minBound && ny <= maxBound) {
        const gx = ((nx - minBound) / (maxBound - minBound)) * 7;
        const gy = ((ny - minBound) / (maxBound - minBound)) * 7;
        const col = Math.floor(gx);
        const row = Math.floor(gy);

        // QR grid 7x7 model
        // Finder 1: top-left (col 0..2, row 0..2)
        // Finder 2: top-right (col 4..6, row 0..2)
        // Finder 3: bottom-left (col 0..2, row 4..6)
        let isDark = false;

        // Top-left finder
        if (col <= 2 && row <= 2) {
          if (col === 0 || col === 2 || row === 0 || row === 2 || (col === 1 && row === 1)) {
            isDark = true;
          }
        }
        // Top-right finder
        else if (col >= 4 && row <= 2) {
          if (col === 4 || col === 6 || row === 0 || row === 2 || (col === 5 && row === 1)) {
            isDark = true;
          }
        }
        // Bottom-left finder
        else if (col <= 2 && row >= 4) {
          if (col === 0 || col === 2 || row === 4 || row === 6 || (col === 1 && row === 5)) {
            isDark = true;
          }
        }
        // Data modules & scan lightning dot in center
        else if ((col === 3 && (row === 1 || row === 3 || row === 5)) ||
                 (row === 3 && (col === 1 || col === 3 || col === 5)) ||
                 (col === 4 && row === 4) || (col === 6 && row === 6) ||
                 (col === 5 && row === 5) || (col === 6 && row === 4)) {
          isDark = true;
        }

        if (isDark) {
          // Electric Cyan gradient (#06B6D4 to #38BDF8)
          const cyanT = (gx + gy) / 14;
          r = Math.round(6 + cyanT * (56 - 6));
          g = Math.round(182 + cyanT * (189 - 182));
          b = Math.round(212 + cyanT * (248 - 212));
        }
      }

      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  // PNG Header
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

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

  // IDAT chunk (compressed rawData)
  const compressed = deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressed);

  // IEND chunk
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Generate PNGs
for (const size of sizes) {
  const pngBuf = createPNG(size);
  const filePath = path.join(iconsDir, `icon${size}.png`);
  fs.writeFileSync(filePath, pngBuf);
  console.log(`Generated ${filePath} (${pngBuf.length} bytes)`);
}

// Generate crisp SVG master icon
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0F172A" />
      <stop offset="100%" stop-color="#020617" />
    </linearGradient>
    <linearGradient id="cyanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38BDF8" />
      <stop offset="100%" stop-color="#06B6D4" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="3" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Background Squircle -->
  <rect x="4" y="4" width="120" height="120" rx="28" fill="url(#bgGrad)" stroke="#1E293B" stroke-width="2"/>

  <!-- Top-Left Finder -->
  <rect x="22" y="22" width="30" height="30" rx="7" fill="none" stroke="url(#cyanGrad)" stroke-width="5"/>
  <rect x="30" y="30" width="14" height="14" rx="3.5" fill="url(#cyanGrad)"/>

  <!-- Top-Right Finder -->
  <rect x="76" y="22" width="30" height="30" rx="7" fill="none" stroke="url(#cyanGrad)" stroke-width="5"/>
  <rect x="84" y="30" width="14" height="14" rx="3.5" fill="url(#cyanGrad)"/>

  <!-- Bottom-Left Finder -->
  <rect x="22" y="76" width="30" height="30" rx="7" fill="none" stroke="url(#cyanGrad)" stroke-width="5"/>
  <rect x="30" y="84" width="14" height="14" rx="3.5" fill="url(#cyanGrad)"/>

  <!-- Data Modules & Accent Dots -->
  <rect x="60" y="24" width="8" height="8" rx="2" fill="url(#cyanGrad)"/>
  <rect x="60" y="40" width="8" height="8" rx="2" fill="url(#cyanGrad)"/>
  <rect x="24" y="60" width="8" height="8" rx="2" fill="url(#cyanGrad)"/>
  <rect x="40" y="60" width="8" height="8" rx="2" fill="url(#cyanGrad)"/>
  
  <!-- Center Glow Cluster -->
  <rect x="58" y="58" width="12" height="12" rx="3" fill="#38BDF8" filter="url(#glow)"/>
  <rect x="76" y="60" width="8" height="8" rx="2" fill="url(#cyanGrad)"/>
  <rect x="60" y="76" width="8" height="8" rx="2" fill="url(#cyanGrad)"/>
  <rect x="76" y="76" width="12" height="12" rx="3" fill="url(#cyanGrad)"/>
  <rect x="94" y="60" width="8" height="14" rx="2" fill="url(#cyanGrad)"/>
  <rect x="76" y="94" width="14" height="8" rx="2" fill="url(#cyanGrad)"/>
  <rect x="96" y="96" width="10" height="10" rx="2.5" fill="url(#cyanGrad)"/>
</svg>`;

const svgPath = path.join(iconsDir, 'icon.svg');
fs.writeFileSync(svgPath, svgContent);
console.log(`Generated ${svgPath}`);
