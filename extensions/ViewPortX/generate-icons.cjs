/**
 * ViewPortX - Self-contained PNG & SVG Icon Generator
 * Renders multi-device responsive viewport symbols with electric-blue & cyan accents
 * on a deep charcoal/navy developer slate background.
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

      // Squircle icon container
      const cx = (nx - 0.5) * 2;
      const cy = (ny - 0.5) * 2;
      const r = Math.pow(Math.abs(cx), 3.4) + Math.pow(Math.abs(cy), 3.4);

      if (r <= 0.85) {
        // Deep developer navy surface (#0B0F19 to #1E293B)
        const bgR = Math.round(11 + (1 - ny) * 12);
        const bgG = Math.round(15 + (1 - ny) * 18);
        const bgB = Math.round(25 + (1 - ny) * 28);

        let finalR = bgR;
        let finalG = bgG;
        let finalB = bgB;
        let finalA = 255;

        // Subtle electric-cyan edge border glow
        if (r > 0.76) {
          const edgeAlpha = (r - 0.76) / 0.09;
          finalR = Math.round(finalR * (1 - edgeAlpha) + 59 * edgeAlpha);
          finalG = Math.round(finalG * (1 - edgeAlpha) + 130 * edgeAlpha);
          finalB = Math.round(finalB * (1 - edgeAlpha) + 246 * edgeAlpha);
        }

        // 1. Desktop screen outer frame (larger rectangle)
        // x: [0.18, 0.82], y: [0.22, 0.70]
        const inDesktop = (nx >= 0.18 && nx <= 0.82 && ny >= 0.22 && ny <= 0.68);
        const inDesktopBorder = inDesktop && (
          nx <= 0.23 || nx >= 0.77 || ny <= 0.27 || ny >= 0.63
        );
        // Desktop stand base
        const inStand = (nx >= 0.44 && nx <= 0.56 && ny >= 0.68 && ny <= 0.77) ||
                        (nx >= 0.35 && nx <= 0.65 && ny >= 0.76 && ny <= 0.80);

        if (inStand) {
          finalR = 100;
          finalG = 116;
          finalB = 139; // slate-500
        }

        if (inDesktopBorder) {
          // Electric blue frame (#3B82F6)
          finalR = 59;
          finalG = 130;
          finalB = 246;
        } else if (inDesktop) {
          // Inside desktop screen: dark slate preview area
          finalR = 15;
          finalG = 23;
          finalB = 42;

          // Header bar in desktop
          if (ny <= 0.33) {
            finalR = 30;
            finalG = 41;
            finalB = 59;
          }
        }

        // 2. Responsive Mobile Device Frame overlay on the right side
        // x: [0.56, 0.82], y: [0.38, 0.82]
        const inMobile = (nx >= 0.54 && nx <= 0.84 && ny >= 0.36 && ny <= 0.82);
        const inMobileBorder = inMobile && (
          nx <= 0.58 || nx >= 0.80 || ny <= 0.40 || ny >= 0.78
        );

        if (inMobileBorder) {
          // Bright Cyan frame (#06B6D4)
          finalR = 6;
          finalG = 182;
          finalB = 212;
        } else if (inMobile) {
          // Mobile screen content
          finalR = 8;
          finalG = 145;
          finalB = 178; // cyan-600

          // Responsive content blocks inside mobile phone
          if (ny >= 0.44 && ny <= 0.49 && nx >= 0.61 && nx <= 0.76) {
            finalR = 255; finalG = 255; finalB = 255; // white title card
          } else if (ny >= 0.53 && ny <= 0.68 && nx >= 0.61 && nx <= 0.76) {
            finalR = 224; finalG = 242; finalB = 254; // light cyan body card
          } else if (ny >= 0.72 && ny <= 0.75 && nx >= 0.66 && nx <= 0.72) {
            finalR = 255; finalG = 255; finalB = 255; // home indicator bar
          }
        }

        // 3. Dynamic "X" or adaptation arrow icon in the left half
        // Responsive transformation arrows in desktop area: nx in [0.28, 0.46], ny in [0.38, 0.56]
        const dx = nx - 0.36;
        const dy = ny - 0.47;
        const distDiag1 = Math.abs(dx - dy);
        const distDiag2 = Math.abs(dx + dy);
        const inXMark = (distDiag1 < 0.035 || distDiag2 < 0.035) && (Math.abs(dx) < 0.09 && Math.abs(dy) < 0.09);

        if (inXMark && !inMobile) {
          // Bright white-cyan transformation glyph
          finalR = 240;
          finalG = 249;
          finalB = 255;
        }

        rawData[offset] = finalR;
        rawData[offset + 1] = finalG;
        rawData[offset + 2] = finalB;
        rawData[offset + 3] = finalA;
      } else {
        // Transparent outside container
        rawData[offset] = 0;
        rawData[offset + 1] = 0;
        rawData[offset + 2] = 0;
        rawData[offset + 3] = 0;
      }
    }
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8-bit depth
  ihdr[9] = 6; // Color type 6: RGBA
  ihdr[10] = 0; // Compression deflate
  ihdr[11] = 0; // Filter none
  ihdr[12] = 0; // Interlace none

  const idatData = deflateSync(rawData, { level: 9 });
  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', idatData);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Generate PNG icons
for (const size of sizes) {
  const pngBuffer = createPNG(size);
  const filePath = path.join(assetsDir, `icon${size}.png`);
  fs.writeFileSync(filePath, pngBuffer);
  console.log(`✓ Generated: ${filePath} (${pngBuffer.length} bytes)`);
}

// Generate matching SVG vector icon
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" fill="none">
  <defs>
    <linearGradient id="bgGrad" x1="0" y1="0" x2="128" y2="128" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#0F172A" />
      <stop offset="100%" stop-color="#020617" />
    </linearGradient>
    <linearGradient id="blueGrad" x1="20" y1="20" x2="108" y2="108" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#38BDF8" />
      <stop offset="100%" stop-color="#2563EB" />
    </linearGradient>
    <linearGradient id="cyanGrad" x1="68" y1="44" x2="108" y2="106" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#06B6D4" />
      <stop offset="100%" stop-color="#0284C7" />
    </linearGradient>
  </defs>

  <!-- Squircle Base -->
  <rect x="4" y="4" width="120" height="120" rx="28" fill="url(#bgGrad)" stroke="#1E293B" stroke-width="2" />

  <!-- Desktop Monitor -->
  <rect x="20" y="24" width="76" height="52" rx="6" stroke="url(#blueGrad)" stroke-width="4" fill="#090D16" />
  <!-- Desktop Stand -->
  <path d="M54 78 v10 M44 88 h28" stroke="#64748B" stroke-width="4" stroke-linecap="round" />

  <!-- Adaptive Transformation Symbol (Stylized X inside monitor) -->
  <path d="M38 40 L54 60 M54 40 L38 60" stroke="#E2E8F0" stroke-width="3.5" stroke-linecap="round" />

  <!-- Mobile Phone Viewport Overlay -->
  <rect x="68" y="42" width="38" height="64" rx="7" fill="#090D16" stroke="url(#cyanGrad)" stroke-width="4" />
  <!-- Phone Screen -->
  <rect x="74" y="50" width="26" height="46" rx="3" fill="#0284C7" fill-opacity="0.25" />
  <!-- Phone Fluid Content Blocks -->
  <rect x="77" y="54" width="20" height="7" rx="1.5" fill="#38BDF8" />
  <rect x="77" y="64" width="20" height="16" rx="1.5" fill="#BAE6FD" />
  <rect x="77" y="83" width="12" height="4" rx="1" fill="#7DD3FC" />
  <!-- Home Indicator -->
  <line x1="82" y1="101" x2="92" y2="101" stroke="#94A3B8" stroke-width="2" stroke-linecap="round" />
</svg>`;

fs.writeFileSync(path.join(assetsDir, 'icon.svg'), svgContent, 'utf8');
console.log(`✓ Generated: ${path.join(assetsDir, 'icon.svg')}`);
