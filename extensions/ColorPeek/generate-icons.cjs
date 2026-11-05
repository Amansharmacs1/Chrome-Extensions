/**
 * Generate PNG icon files for ColorPeek
 * Electric-cyan eyedropper & vibrant color spectrum icon on deep developer-slate background
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
      const r = Math.pow(Math.abs(cx), 3.4) + Math.pow(Math.abs(cy), 3.4);

      if (r <= 0.85) {
        // Deep developer dark background (#0B0F19 to #1E293B)
        let bgR = Math.round(11 + ny * 18);
        let bgG = Math.round(15 + ny * 24);
        let bgB = Math.round(25 + ny * 35);
        let alpha = 255;

        // Border glow
        if (r > 0.76) {
          bgR = Math.round(bgR + 40);
          bgG = Math.round(bgG + 80);
          bgB = Math.round(bgB + 140);
        }

        // Eyedropper & Color droplet graphics
        // Diagonal dropper oriented from top-right to bottom-left:
        // Center line: (x + y) / (2 * size) approx 0.5
        // Vector along diagonal
        const dx = nx - 0.5;
        const dy = ny - 0.5;
        const diag1 = (dx - dy); // perpendicular to dropper axis (-0.5 to 0.5)
        const diag2 = (dx + dy); // along dropper axis (-0.5 to 0.5)

        // Dropper body: diag2 between -0.3 and 0.15, |diag1| < 0.08
        const inDropperBody = diag2 >= -0.32 && diag2 <= 0.16 && Math.abs(diag1) < 0.09;
        // Dropper bulb at top right: diag2 between -0.42 and -0.28, |diag1| < 0.15
        const inBulb = Math.hypot(nx - 0.72, ny - 0.28) < 0.16;
        // Dropper tip at bottom left: diag2 between 0.16 and 0.28, tapering
        const taperWidth = 0.09 * (1 - (diag2 - 0.16) / 0.14);
        const inTip = diag2 > 0.16 && diag2 <= 0.30 && Math.abs(diag1) < Math.max(0.015, taperWidth);
        // Color droplet below tip
        const inDrop = Math.hypot(nx - 0.32, ny - 0.72) < 0.11;

        if (inBulb) {
          // Vibrant cyan bulb
          bgR = 6;
          bgG = 182;
          bgB = 212;
        } else if (inDropperBody) {
          // Glass chamber with color gradient
          const fillFrac = (diag2 + 0.32) / 0.48;
          bgR = Math.round(59 + fillFrac * 100);
          bgG = Math.round(130 + fillFrac * 80);
          bgB = Math.round(246 - fillFrac * 40);
        } else if (inTip) {
          // Tip with electric blue
          bgR = 14;
          bgG = 165;
          bgB = 233;
        } else if (inDrop) {
          // Vivid color droplet (magenta to cyan gradient)
          bgR = Math.round(236 - nx * 100);
          bgG = Math.round(72 + ny * 100);
          bgB = Math.round(153 + nx * 50);
        }

        rawData[offset] = bgR;
        rawData[offset + 1] = bgG;
        rawData[offset + 2] = bgB;
        rawData[offset + 3] = alpha;
      } else if (r <= 0.98) {
        // Anti-aliased outer edge
        const edgeAlpha = Math.round(255 * (1 - (r - 0.85) / 0.13));
        rawData[offset] = 11;
        rawData[offset + 1] = 15;
        rawData[offset + 2] = 25;
        rawData[offset + 3] = edgeAlpha;
      } else {
        // Transparent
        rawData[offset] = 0;
        rawData[offset + 1] = 0;
        rawData[offset + 2] = 0;
        rawData[offset + 3] = 0;
      }
    }
  }

  // PNG Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR Chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // 8 bits per channel
  ihdrData[9] = 6; // RGBA color type
  ihdrData[10] = 0; // Deflate compression
  ihdrData[11] = 0; // Filter
  ihdrData[12] = 0; // No interlace
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  // IDAT Chunk
  const compressedData = deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressedData);

  // IEND Chunk
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

for (const size of sizes) {
  const pngBuffer = createPNG(size);
  const outputPath = path.join(assetsDir, `icon${size}.png`);
  fs.writeFileSync(outputPath, pngBuffer);
  console.log(`Generated: ${outputPath} (${size}x${size}, ${pngBuffer.length} bytes)`);
}

// Generate icon.svg for high-res vector previews
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0B0F19"/>
      <stop offset="100%" stop-color="#1E293B"/>
    </linearGradient>
    <linearGradient id="cyanBlue" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#06B6D4"/>
      <stop offset="100%" stop-color="#3B82F6"/>
    </linearGradient>
    <linearGradient id="dropGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#EC4899"/>
      <stop offset="100%" stop-color="#8B5CF6"/>
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="3" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>
  <rect x="6" y="6" width="116" height="116" rx="28" fill="url(#bg)" stroke="#334155" stroke-width="2"/>
  <!-- Eyedropper Body -->
  <g transform="translate(64, 64) rotate(-45) translate(-64, -64)">
    <rect x="58" y="22" width="12" height="16" rx="6" fill="#06B6D4" filter="url(#glow)"/>
    <rect x="56" y="38" width="16" height="40" rx="3" fill="url(#cyanBlue)" stroke="#67E8F9" stroke-width="1.5"/>
    <polygon points="56,78 72,78 66,94 62,94" fill="#0284C7"/>
    <circle cx="64" cy="98" r="3" fill="#38BDF8"/>
  </g>
  <!-- Color Droplet -->
  <path d="M42,90 C42,98 48,104 56,104 C64,104 70,98 70,90 C70,82 56,66 56,66 C56,66 42,82 42,90 Z" fill="url(#dropGrad)" filter="url(#glow)"/>
</svg>`;

fs.writeFileSync(path.join(assetsDir, 'icon.svg'), svgContent, 'utf8');
console.log('Generated: assets/icon.svg');
