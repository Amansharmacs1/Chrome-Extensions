/**
 * QRQuick - Advanced QR Rendering Engine
 * Transforms QR matrix data into customizable Canvas and SVG representations
 * with custom module patterns, eye styles, gradients, and logo overlays.
 */

import qrcode from '../lib/qrcode.mjs';
import { stringToBytes } from '../lib/qrcode_UTF8.mjs';

// Register UTF-8 byte encoder
qrcode.stringToBytes = stringToBytes;

/**
 * Checks if a given row & column is part of one of the 3 finder patterns
 * @param {number} r Row index (0..moduleCount-1)
 * @param {number} c Column index (0..moduleCount-1)
 * @param {number} moduleCount Total matrix size
 * @returns {{ isFinder: boolean, which?: 'TL'|'TR'|'BL', isInner?: boolean, isOuter?: boolean }}
 */
export function getFinderInfo(r, c, moduleCount) {
  let which = null;
  let localR = 0;
  let localC = 0;

  if (r < 7 && c < 7) {
    which = 'TL';
    localR = r;
    localC = c;
  } else if (r < 7 && c >= moduleCount - 7) {
    which = 'TR';
    localR = r;
    localC = c - (moduleCount - 7);
  } else if (r >= moduleCount - 7 && c < 7) {
    which = 'BL';
    localR = r - (moduleCount - 7);
    localC = c;
  }

  if (!which) {
    return { isFinder: false };
  }

  // Inside the 7x7 finder pattern:
  // Outer frame is rows/cols 0 and 6
  // White separator is rows/cols 1 and 5
  // Inner center dot is rows/cols 2, 3, 4 (3x3 block)
  const isOuter = (localR === 0 || localR === 6 || localC === 0 || localC === 6);
  const isInner = (localR >= 2 && localR <= 4 && localC >= 2 && localC <= 4);

  return { isFinder: true, which, isOuter, isInner, localR, localC };
}

/**
 * Generates raw QR matrix data using Kazuhiko Arase's engine
 * @param {string} text Payload string
 * @param {'L'|'M'|'Q'|'H'} [ecLevel='M']
 * @returns {{ moduleCount: number, isDark: (r: number, c: number) => boolean, matrix: boolean[][] }}
 */
export function generateQRMatrix(text, ecLevel = 'M') {
  if (!text) {
    throw new Error('QR content cannot be empty.');
  }

  const qr = qrcode(0, ecLevel);
  qr.addData(text, 'Byte');
  qr.make();

  const moduleCount = qr.getModuleCount();
  const matrix = [];

  for (let r = 0; r < moduleCount; r++) {
    const row = [];
    for (let c = 0; c < moduleCount; c++) {
      row.push(qr.isDark(r, c));
    }
    matrix.push(row);
  }

  return {
    moduleCount,
    isDark: (r, c) => matrix[r][c],
    matrix
  };
}

/**
 * Calculates logo bounding box in module coordinates
 * @param {number} moduleCount Total matrix size
 * @param {number} logoSizePercent Percentage of QR code width (e.g. 20)
 * @returns {{ startCol: number, endCol: number, startRow: number, endRow: number, sizeModules: number }}
 */
export function getLogoModuleBounds(moduleCount, logoSizePercent = 20) {
  const percent = Math.min(30, Math.max(10, logoSizePercent)) / 100;
  const sizeModules = Math.max(3, Math.round(moduleCount * percent));
  // Keep dimensions odd or even matching the module count for symmetry
  const startCol = Math.floor((moduleCount - sizeModules) / 2);
  const endCol = startCol + sizeModules;
  const startRow = Math.floor((moduleCount - sizeModules) / 2);
  const endRow = startRow + sizeModules;

  return { startCol, endCol, startRow, endRow, sizeModules };
}

/**
 * Renders QR code to an HTML Canvas element
 * @param {HTMLCanvasElement} canvas Target canvas
 * @param {string} payload QR text
 * @param {object} options Customization options
 * @param {HTMLImageElement} [logoImage] Optional loaded logo Image element
 * @returns {Promise<void>}
 */
export async function renderQRToCanvas(canvas, payload, options = {}, logoImage = null) {
  const {
    size = 512,
    margin = 4,
    ecLevel = 'M',
    fgColor = '#0F172A',
    bgColor = '#FFFFFF',
    isGradient = false,
    gradientType = 'linear',
    fgColorSecondary = '#06B6D4',
    pattern = 'square',      // 'square' | 'rounded' | 'dots' | 'classy'
    eyeOuter = 'square',     // 'square' | 'rounded' | 'circle'
    eyeInner = 'square',     // 'square' | 'circle' | 'diamond'
    logoSizePercent = 20,
    logoPadding = 6,
    logoBgColor = null,
    logoShape = 'rounded'    // 'rounded' | 'square' | 'circle'
  } = options;

  const effectiveEc = logoImage ? (['Q', 'H'].includes(ecLevel) ? ecLevel : 'H') : ecLevel;
  const qrData = generateQRMatrix(payload, effectiveEc);
  const moduleCount = qrData.moduleCount;

  // Canvas dimension setup
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, size, size);

  // Background
  const isTransparent = bgColor.toLowerCase() === 'transparent' || bgColor === '';
  if (!isTransparent) {
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, size, size);
  }

  // Metric computations
  const totalModules = moduleCount + margin * 2;
  const tileSize = size / totalModules;
  const offset = margin * tileSize;

  // Foreground fill style (solid or gradient)
  let fgFill = fgColor;
  if (isGradient) {
    if (gradientType === 'radial') {
      const grad = ctx.createRadialGradient(size / 2, size / 2, 10, size / 2, size / 2, size / 1.4);
      grad.addColorStop(0, fgColor);
      grad.addColorStop(1, fgColorSecondary);
      fgFill = grad;
    } else {
      const grad = ctx.createLinearGradient(0, 0, size, size);
      grad.addColorStop(0, fgColor);
      grad.addColorStop(1, fgColorSecondary);
      fgFill = grad;
    }
  }

  // Logo bounding box in module indices (skip drawing data bits behind logo)
  let logoBounds = null;
  if (logoImage) {
    logoBounds = getLogoModuleBounds(moduleCount, logoSizePercent);
  }

  // Draw data modules (excluding finder patterns and logo area)
  ctx.fillStyle = fgFill;

  for (let r = 0; r < moduleCount; r++) {
    for (let c = 0; c < moduleCount; c++) {
      if (!qrData.isDark(r, c)) continue;

      const finder = getFinderInfo(r, c, moduleCount);
      if (finder.isFinder) continue; // Finders drawn separately for custom styling

      // Skip modules covered by logo badge
      if (logoBounds) {
        if (r >= logoBounds.startRow && r < logoBounds.endRow &&
            c >= logoBounds.startCol && c < logoBounds.endCol) {
          continue;
        }
      }

      const x = offset + c * tileSize;
      const y = offset + r * tileSize;

      drawModule(ctx, x, y, tileSize, pattern);
    }
  }

  // Draw the 3 finder patterns (Top-Left, Top-Right, Bottom-Left)
  drawFinderPattern(ctx, offset, offset, tileSize, eyeOuter, eyeInner, fgFill);
  drawFinderPattern(ctx, offset + (moduleCount - 7) * tileSize, offset, tileSize, eyeOuter, eyeInner, fgFill);
  drawFinderPattern(ctx, offset, offset + (moduleCount - 7) * tileSize, tileSize, eyeOuter, eyeInner, fgFill);

  // Draw Center Logo Overlay if present
  if (logoImage) {
    const logoPxSize = Math.round(moduleCount * tileSize * (logoSizePercent / 100));
    const badgePxSize = logoPxSize + logoPadding * 2;
    const badgeX = (size - badgePxSize) / 2;
    const badgeY = (size - badgePxSize) / 2;

    // Logo badge background
    ctx.fillStyle = logoBgColor || (isTransparent ? '#FFFFFF' : bgColor);
    const badgeRadius = logoShape === 'circle' ? badgePxSize / 2 : (logoShape === 'rounded' ? badgePxSize * 0.22 : 0);

    ctx.beginPath();
    roundRect(ctx, badgeX, badgeY, badgePxSize, badgePxSize, badgeRadius);
    ctx.fill();

    // Subtle badge border
    ctx.strokeStyle = isTransparent ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Clip & draw logo
    ctx.save();
    const logoX = (size - logoPxSize) / 2;
    const logoY = (size - logoPxSize) / 2;
    const logoRadius = logoShape === 'circle' ? logoPxSize / 2 : (logoShape === 'rounded' ? logoPxSize * 0.18 : 0);

    ctx.beginPath();
    roundRect(ctx, logoX, logoY, logoPxSize, logoPxSize, logoRadius);
    ctx.clip();
    ctx.drawImage(logoImage, logoX, logoY, logoPxSize, logoPxSize);
    ctx.restore();
  }
}

/**
 * Helper to draw a single module with selected pattern
 */
function drawModule(ctx, x, y, size, pattern) {
  const pad = 0.05 * size;
  const innerSize = size - pad * 2;
  const ix = x + pad;
  const iy = y + pad;

  ctx.beginPath();
  switch (pattern) {
    case 'dots': {
      const radius = innerSize / 2;
      ctx.arc(ix + radius, iy + radius, radius * 0.95, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'rounded': {
      roundRect(ctx, ix, iy, innerSize, innerSize, innerSize * 0.35);
      ctx.fill();
      break;
    }
    case 'classy': {
      // Smooth diamond / tear drop
      roundRect(ctx, ix, iy, innerSize, innerSize, innerSize * 0.5);
      ctx.fill();
      break;
    }
    case 'square':
    default:
      ctx.fillRect(x, y, size, size);
      break;
  }
}

/**
 * Draws one 7x7 Finder Pattern at specified pixel coordinates
 */
function drawFinderPattern(ctx, x, y, tileSize, eyeOuter, eyeInner, fgFill) {
  const outerBoxSize = 7 * tileSize;
  const innerBoxSize = 3 * tileSize;
  const innerOffset = 2 * tileSize;

  ctx.fillStyle = fgFill;

  // 1. Outer Frame (7x7 with 5x5 hollow center)
  ctx.save();
  ctx.beginPath();

  if (eyeOuter === 'circle') {
    // Outer circle
    const center = outerBoxSize / 2;
    ctx.arc(x + center, y + center, outerBoxSize / 2, 0, Math.PI * 2, false);
    // Inner hole
    ctx.arc(x + center, y + center, (outerBoxSize / 2) - tileSize, 0, Math.PI * 2, true);
    ctx.fill('evenodd');
  } else if (eyeOuter === 'rounded') {
    const rOuter = outerBoxSize * 0.28;
    const rInner = Math.max(2, rOuter - tileSize);
    roundRect(ctx, x, y, outerBoxSize, outerBoxSize, rOuter);
    roundRect(ctx, x + tileSize, y + tileSize, outerBoxSize - 2 * tileSize, outerBoxSize - 2 * tileSize, rInner);
    ctx.fill('evenodd');
  } else {
    // Square outer frame
    ctx.rect(x, y, outerBoxSize, outerBoxSize);
    ctx.rect(x + tileSize, y + tileSize, outerBoxSize - 2 * tileSize, outerBoxSize - 2 * tileSize);
    ctx.fill('evenodd');
  }
  ctx.restore();

  // 2. Inner Dot (3x3 center)
  const ix = x + innerOffset;
  const iy = y + innerOffset;

  ctx.beginPath();
  if (eyeInner === 'circle') {
    const r = innerBoxSize / 2;
    ctx.arc(ix + r, iy + r, r, 0, Math.PI * 2);
    ctx.fill();
  } else if (eyeInner === 'diamond') {
    ctx.moveTo(ix + innerBoxSize / 2, iy);
    ctx.lineTo(ix + innerBoxSize, iy + innerBoxSize / 2);
    ctx.lineTo(ix + innerBoxSize / 2, iy + innerBoxSize);
    ctx.lineTo(ix, iy + innerBoxSize / 2);
    ctx.closePath();
    ctx.fill();
  } else {
    // Square inner
    roundRect(ctx, ix, iy, innerBoxSize, innerBoxSize, eyeOuter === 'rounded' ? innerBoxSize * 0.2 : 0);
    ctx.fill();
  }
}

/**
 * Draws rounded rectangle path
 */
function roundRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.arcTo(x + width, y, x + width, y + r, r);
  ctx.lineTo(x + width, y + height - r);
  ctx.arcTo(x + width, y + height, x + width - r, y + height, r);
  ctx.lineTo(x + r, y + height);
  ctx.arcTo(x, y + height, x, y + height - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

/**
 * Generates an SVG vector string representation of the QR code
 * @param {string} payload QR text
 * @param {object} options Customization options
 * @param {string} [logoDataUrl] Base64 logo data URL
 * @returns {string} Standalone SVG XML string
 */
export function generateQRSvg(payload, options = {}, logoDataUrl = null) {
  const {
    size = 512,
    margin = 4,
    ecLevel = 'M',
    fgColor = '#0F172A',
    bgColor = '#FFFFFF',
    isGradient = false,
    gradientType = 'linear',
    fgColorSecondary = '#06B6D4',
    pattern = 'square',
    eyeOuter = 'square',
    eyeInner = 'square',
    logoSizePercent = 20,
    logoPadding = 6,
    logoBgColor = null,
    logoShape = 'rounded'
  } = options;

  const effectiveEc = logoDataUrl ? (['Q', 'H'].includes(ecLevel) ? ecLevel : 'H') : ecLevel;
  const qrData = generateQRMatrix(payload, effectiveEc);
  const moduleCount = qrData.moduleCount;
  const totalModules = moduleCount + margin * 2;
  const tileSize = size / totalModules;
  const offset = margin * tileSize;

  const isTransparent = bgColor.toLowerCase() === 'transparent' || bgColor === '';
  const defs = [];

  let fgFillId = fgColor;
  if (isGradient) {
    fgFillId = 'url(#qrGrad)';
    if (gradientType === 'radial') {
      defs.push(`
        <radialGradient id="qrGrad" cx="50%" cy="50%" r="70%">
          <stop offset="0%" stop-color="${fgColor}" />
          <stop offset="100%" stop-color="${fgColorSecondary}" />
        </radialGradient>
      `);
    } else {
      defs.push(`
        <linearGradient id="qrGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${fgColor}" />
          <stop offset="100%" stop-color="${fgColorSecondary}" />
        </linearGradient>
      `);
    }
  }

  let logoBounds = null;
  if (logoDataUrl) {
    logoBounds = getLogoModuleBounds(moduleCount, logoSizePercent);
  }

  const paths = [];

  // Data modules
  for (let r = 0; r < moduleCount; r++) {
    for (let c = 0; c < moduleCount; c++) {
      if (!qrData.isDark(r, c)) continue;

      const finder = getFinderInfo(r, c, moduleCount);
      if (finder.isFinder) continue;

      if (logoBounds) {
        if (r >= logoBounds.startRow && r < logoBounds.endRow &&
            c >= logoBounds.startCol && c < logoBounds.endCol) {
          continue;
        }
      }

      const x = offset + c * tileSize;
      const y = offset + r * tileSize;
      const pad = 0.05 * tileSize;
      const innerSize = tileSize - pad * 2;
      const ix = x + pad;
      const iy = y + pad;

      if (pattern === 'dots') {
        const radius = (innerSize / 2) * 0.95;
        paths.push(`<circle cx="${(ix + innerSize / 2).toFixed(2)}" cy="${(iy + innerSize / 2).toFixed(2)}" r="${radius.toFixed(2)}" fill="${fgFillId}" />`);
      } else if (pattern === 'rounded') {
        const rad = (innerSize * 0.35).toFixed(2);
        paths.push(`<rect x="${ix.toFixed(2)}" y="${iy.toFixed(2)}" width="${innerSize.toFixed(2)}" height="${innerSize.toFixed(2)}" rx="${rad}" fill="${fgFillId}" />`);
      } else if (pattern === 'classy') {
        const rad = (innerSize * 0.5).toFixed(2);
        paths.push(`<rect x="${ix.toFixed(2)}" y="${iy.toFixed(2)}" width="${innerSize.toFixed(2)}" height="${innerSize.toFixed(2)}" rx="${rad}" fill="${fgFillId}" />`);
      } else {
        paths.push(`<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${tileSize.toFixed(2)}" height="${tileSize.toFixed(2)}" fill="${fgFillId}" />`);
      }
    }
  }

  // Finders
  const renderSvgFinder = (fx, fy) => {
    const outerBoxSize = 7 * tileSize;
    const innerBoxSize = 3 * tileSize;
    const innerOffset = 2 * tileSize;
    const fParts = [];

    // Outer frame
    if (eyeOuter === 'circle') {
      const center = outerBoxSize / 2;
      const cx = fx + center;
      const cy = fy + center;
      const rOuter = outerBoxSize / 2;
      const rInner = rOuter - tileSize;
      fParts.push(`
        <path fill-rule="evenodd" fill="${fgFillId}" d="
          M ${cx} ${cy - rOuter}
          A ${rOuter} ${rOuter} 0 1 0 ${cx} ${cy + rOuter}
          A ${rOuter} ${rOuter} 0 1 0 ${cx} ${cy - rOuter}
          Z
          M ${cx} ${cy - rInner}
          A ${rInner} ${rInner} 0 1 1 ${cx} ${cy + rInner}
          A ${rInner} ${rInner} 0 1 1 ${cx} ${cy - rInner}
          Z
        " />
      `);
    } else if (eyeOuter === 'rounded') {
      const rOuter = outerBoxSize * 0.28;
      const rInner = Math.max(2, rOuter - tileSize);
      fParts.push(`
        <path fill-rule="evenodd" fill="${fgFillId}" d="
          M ${fx + rOuter} ${fy}
          h ${outerBoxSize - 2 * rOuter}
          a ${rOuter} ${rOuter} 0 0 1 ${rOuter} ${rOuter}
          v ${outerBoxSize - 2 * rOuter}
          a ${rOuter} ${rOuter} 0 0 1 -${rOuter} ${rOuter}
          h -${outerBoxSize - 2 * rOuter}
          a ${rOuter} ${rOuter} 0 0 1 -${rOuter} -${rOuter}
          v -${outerBoxSize - 2 * rOuter}
          a ${rOuter} ${rOuter} 0 0 1 ${rOuter} -${rOuter}
          Z
          M ${fx + tileSize + rInner} ${fy + tileSize}
          h ${outerBoxSize - 2 * tileSize - 2 * rInner}
          a ${rInner} ${rInner} 0 0 1 ${rInner} ${rInner}
          v ${outerBoxSize - 2 * tileSize - 2 * rInner}
          a ${rInner} ${rInner} 0 0 1 -${rInner} ${rInner}
          h -${outerBoxSize - 2 * tileSize - 2 * rInner}
          a ${rInner} ${rInner} 0 0 1 -${rInner} -${rInner}
          v -${outerBoxSize - 2 * tileSize - 2 * rInner}
          a ${rInner} ${rInner} 0 0 1 ${rInner} -${rInner}
          Z
        " />
      `);
    } else {
      fParts.push(`
        <path fill-rule="evenodd" fill="${fgFillId}" d="
          M ${fx} ${fy}
          h ${outerBoxSize}
          v ${outerBoxSize}
          h -${outerBoxSize}
          Z
          M ${fx + tileSize} ${fy + tileSize}
          v ${outerBoxSize - 2 * tileSize}
          h ${outerBoxSize - 2 * tileSize}
          v -${outerBoxSize - 2 * tileSize}
          Z
        " />
      `);
    }

    // Inner dot
    const ix = fx + innerOffset;
    const iy = fy + innerOffset;

    if (eyeInner === 'circle') {
      const cr = innerBoxSize / 2;
      fParts.push(`<circle cx="${(ix + cr).toFixed(2)}" cy="${(iy + cr).toFixed(2)}" r="${cr.toFixed(2)}" fill="${fgFillId}" />`);
    } else if (eyeInner === 'diamond') {
      const h = innerBoxSize / 2;
      fParts.push(`<polygon points="${ix + h},${iy} ${ix + innerBoxSize},${iy + h} ${ix + h},${iy + innerBoxSize} ${ix},${iy + h}" fill="${fgFillId}" />`);
    } else {
      const rad = eyeOuter === 'rounded' ? innerBoxSize * 0.2 : 0;
      fParts.push(`<rect x="${ix.toFixed(2)}" y="${iy.toFixed(2)}" width="${innerBoxSize.toFixed(2)}" height="${innerBoxSize.toFixed(2)}" rx="${rad.toFixed(2)}" fill="${fgFillId}" />`);
    }

    return fParts.join('\n');
  };

  paths.push(renderSvgFinder(offset, offset));
  paths.push(renderSvgFinder(offset + (moduleCount - 7) * tileSize, offset));
  paths.push(renderSvgFinder(offset, offset + (moduleCount - 7) * tileSize));

  // Logo overlay in SVG
  let logoSvg = '';
  if (logoDataUrl) {
    const logoPxSize = Math.round(moduleCount * tileSize * (logoSizePercent / 100));
    const badgePxSize = logoPxSize + logoPadding * 2;
    const badgeX = (size - badgePxSize) / 2;
    const badgeY = (size - badgePxSize) / 2;
    const badgeRadius = logoShape === 'circle' ? badgePxSize / 2 : (logoShape === 'rounded' ? badgePxSize * 0.22 : 0);

    const logoX = (size - logoPxSize) / 2;
    const logoY = (size - logoPxSize) / 2;
    const logoRadius = logoShape === 'circle' ? logoPxSize / 2 : (logoShape === 'rounded' ? logoPxSize * 0.18 : 0);

    defs.push(`
      <clipPath id="logoClip">
        <rect x="${logoX.toFixed(2)}" y="${logoY.toFixed(2)}" width="${logoPxSize.toFixed(2)}" height="${logoPxSize.toFixed(2)}" rx="${logoRadius.toFixed(2)}" />
      </clipPath>
    `);

    logoSvg = `
      <!-- Center Logo Badge -->
      <rect x="${badgeX.toFixed(2)}" y="${badgeY.toFixed(2)}" width="${badgePxSize.toFixed(2)}" height="${badgePxSize.toFixed(2)}" rx="${badgeRadius.toFixed(2)}" fill="${logoBgColor || (isTransparent ? '#FFFFFF' : bgColor)}" stroke="rgba(255,255,255,0.15)" stroke-width="1" />
      <image href="${logoDataUrl}" x="${logoX.toFixed(2)}" y="${logoY.toFixed(2)}" width="${logoPxSize.toFixed(2)}" height="${logoPxSize.toFixed(2)}" clip-path="url(#logoClip)" preserveAspectRatio="xMidYMid slice" />
    `;
  }

  const bgRect = isTransparent ? '' : `<rect width="${size}" height="${size}" fill="${bgColor}" />`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <defs>
    ${defs.join('\n')}
  </defs>
  ${bgRect}
  ${paths.join('\n')}
  ${logoSvg}
</svg>`;
}
