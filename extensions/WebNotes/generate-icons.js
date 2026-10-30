/**
 * Generate PNG icon files from a simple canvas drawing.
 * Run with: node generate-icons.js
 */

const { createCanvas } = (() => {
  // Fallback: generate a minimal valid PNG for each size
  // This creates basic colored squares with the WebNotes branding
  const fs = require('fs');
  const path = require('path');
  
  const sizes = [16, 32, 48, 128];
  const assetsDir = path.join(__dirname, 'assets');
  
  // Minimal PNG generator — creates a simple colored icon
  function createPNG(size) {
    // Create a simple PNG with a gradient-like pattern
    // Using raw PNG encoding
    const { deflateSync } = require('zlib');
    
    const width = size;
    const height = size;
    
    // Create raw image data (RGBA)
    const rawData = Buffer.alloc((width * 4 + 1) * height);
    
    for (let y = 0; y < height; y++) {
      const rowStart = y * (width * 4 + 1);
      rawData[rowStart] = 0; // filter byte
      
      for (let x = 0; x < width; x++) {
        const offset = rowStart + 1 + x * 4;
        
        // Calculate position ratios
        const xr = x / width;
        const yr = y / height;
        
        // Background: dark navy
        let r = 13, g = 17, b = 23, a = 255;
        
        // Draw rounded rectangle area
        const margin = Math.max(1, size * 0.1);
        const cornerR = Math.max(2, size * 0.2);
        
        if (x >= margin && x < width - margin && y >= margin && y < height - margin) {
          // Check corners for rounding
          const inCornerTL = x < margin + cornerR && y < margin + cornerR;
          const inCornerTR = x >= width - margin - cornerR && y < margin + cornerR;
          const inCornerBL = x < margin + cornerR && y >= height - margin - cornerR;
          const inCornerBR = x >= width - margin - cornerR && y >= height - margin - cornerR;
          
          let isInside = true;
          
          if (inCornerTL) {
            const dx = x - (margin + cornerR);
            const dy = y - (margin + cornerR);
            isInside = dx * dx + dy * dy <= cornerR * cornerR;
          } else if (inCornerTR) {
            const dx = x - (width - margin - cornerR);
            const dy = y - (margin + cornerR);
            isInside = dx * dx + dy * dy <= cornerR * cornerR;
          } else if (inCornerBL) {
            const dx = x - (margin + cornerR);
            const dy = y - (height - margin - cornerR);
            isInside = dx * dx + dy * dy <= cornerR * cornerR;
          } else if (inCornerBR) {
            const dx = x - (width - margin - cornerR);
            const dy = y - (height - margin - cornerR);
            isInside = dx * dx + dy * dy <= cornerR * cornerR;
          }
          
          if (isInside) {
            // Accent circle in bottom-right
            const circleX = width * 0.72;
            const circleY = height * 0.68;
            const circleR = size * 0.22;
            const dist = Math.sqrt((x - circleX) ** 2 + (y - circleY) ** 2);
            
            if (dist < circleR) {
              // Cyan accent
              r = 0; g = 212; b = 255;
              
              // Plus sign in circle
              const cx = Math.abs(x - circleX);
              const cy = Math.abs(y - circleY);
              const lineW = Math.max(1, size * 0.04);
              const lineLen = circleR * 0.55;
              
              if ((cx < lineW && cy < lineLen) || (cy < lineW && cx < lineLen)) {
                r = 13; g = 17; b = 23;
              }
            } else {
              // Lines in the note area
              const lineY1 = height * 0.3;
              const lineY2 = height * 0.42;
              const lineY3 = height * 0.54;
              const lineW = Math.max(1, size * 0.04);
              const lineStartX = width * 0.28;
              
              if (Math.abs(y - lineY1) < lineW && x > lineStartX && x < width * 0.78) {
                r = 0; g = 212; b = 255;
              } else if (Math.abs(y - lineY2) < lineW && x > lineStartX && x < width * 0.7) {
                r = 0; g = 180; b = 220; a = 200;
              } else if (Math.abs(y - lineY3) < lineW && x > lineStartX && x < width * 0.6) {
                r = 0; g = 150; b = 190; a = 150;
              } else {
                // Dark background
                r = 22; g = 27; b = 34;
              }
            }
          }
        }
        
        rawData[offset] = r;
        rawData[offset + 1] = g;
        rawData[offset + 2] = b;
        rawData[offset + 3] = a;
      }
    }
    
    // Compress
    const compressed = deflateSync(rawData);
    
    // Build PNG
    const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    
    function createChunk(type, data) {
      const typeBuffer = Buffer.from(type);
      const length = Buffer.alloc(4);
      length.writeUInt32BE(data.length);
      
      const combined = Buffer.concat([typeBuffer, data]);
      const crc = crc32(combined);
      const crcBuffer = Buffer.alloc(4);
      crcBuffer.writeUInt32BE(crc >>> 0);
      
      return Buffer.concat([length, combined, crcBuffer]);
    }
    
    // IHDR
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0);
    ihdr.writeUInt32BE(height, 4);
    ihdr[8] = 8; // bit depth
    ihdr[9] = 6; // color type (RGBA)
    ihdr[10] = 0; // compression
    ihdr[11] = 0; // filter
    ihdr[12] = 0; // interlace
    
    const ihdrChunk = createChunk('IHDR', ihdr);
    const idatChunk = createChunk('IDAT', compressed);
    const iendChunk = createChunk('IEND', Buffer.alloc(0));
    
    return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
  }
  
  // CRC32 table
  const crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    crcTable[n] = c;
  }
  
  function crc32(buf) {
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) {
      crc = crcTable[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
    }
    return crc ^ 0xFFFFFFFF;
  }
  
  // Generate icons
  for (const size of sizes) {
    const png = createPNG(size);
    const filePath = path.join(assetsDir, `icon${size}.png`);
    fs.writeFileSync(filePath, png);
    console.log(`Generated ${filePath} (${size}x${size})`);
  }
  
  return {};
})();
