/**
 * QRQuick - Validation & Safety Engine
 * Validates QR input parameters, capacity boundaries,
 * WCAG color contrast ratios, and logo coverage safety.
 */

// Max capacity by Error Correction level for Version 40 (Byte / 8-bit mode)
export const QR_BYTE_CAPACITY = {
  L: 2953, // ~7% recovery
  M: 2331, // ~15% recovery
  Q: 1663, // ~25% recovery
  H: 1273  // ~30% recovery
};

/**
 * Validates payload capacity against specified Error Correction level
 * @param {string} text Payload string
 * @param {'L'|'M'|'Q'|'H'} [ecLevel='M']
 * @returns {{ valid: boolean, byteLength: number, maxBytes: number, error?: string }}
 */
export function validatePayloadCapacity(text = '', ecLevel = 'M') {
  const clean = String(text ?? '');
  const byteLength = new TextEncoder().encode(clean).length;
  const maxBytes = QR_BYTE_CAPACITY[ecLevel] || QR_BYTE_CAPACITY.M;

  if (byteLength === 0) {
    return { valid: false, byteLength: 0, maxBytes, error: 'QR content cannot be empty.' };
  }

  if (byteLength > maxBytes) {
    return {
      valid: false,
      byteLength,
      maxBytes,
      error: `Content exceeds QR code capacity for level ${ecLevel} (${byteLength} / ${maxBytes} bytes). Please shorten the text or reduce error correction.`
    };
  }

  return { valid: true, byteLength, maxBytes };
}

/**
 * Parses any CSS hex color (#RGB, #RRGGBB, #RRGGBBAA) to RGBA components
 * @param {string} hex
 * @returns {{ r: number, g: number, b: number, a: number }|null}
 */
export function hexToRgba(hex = '') {
  let clean = String(hex).trim().replace(/^#/, '');
  if (clean.length === 3) {
    clean = clean.split('').map(c => c + c).join('');
  } else if (clean.length === 4) {
    clean = clean.split('').map(c => c + c).join('');
  }

  if (clean.length === 6) {
    const num = parseInt(clean, 16);
    if (isNaN(num)) return null;
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255,
      a: 1.0
    };
  }

  if (clean.length === 8) {
    const num = parseInt(clean, 16);
    if (isNaN(num)) return null;
    return {
      r: (num >> 24) & 255,
      g: (num >> 16) & 255,
      b: (num >> 8) & 255,
      a: Math.round(((num & 255) / 255) * 100) / 100
    };
  }

  return null;
}

/**
 * Computes relative luminance according to WCAG 2.1 formula
 * @param {number} r 0..255
 * @param {number} g 0..255
 * @param {number} b 0..255
 * @returns {number}
 */
export function calculateRelativeLuminance(r, g, b) {
  const [rs, gs, bs] = [r, g, b].map(c => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculates contrast ratio between foreground and background colors
 * @param {string} fgHex Foreground color
 * @param {string} bgHex Background color
 * @returns {{ ratio: number, isSafe: boolean, warning?: string }}
 */
export function calculateContrastRatio(fgHex = '#000000', bgHex = '#ffffff') {
  const fg = hexToRgba(fgHex) || { r: 0, g: 0, b: 0, a: 1 };
  const bg = hexToRgba(bgHex) || { r: 255, g: 255, b: 255, a: 1 };

  const l1 = calculateRelativeLuminance(fg.r, fg.g, fg.b);
  const l2 = calculateRelativeLuminance(bg.r, bg.g, bg.b);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  const ratio = Math.round(((lighter + 0.05) / (darker + 0.05)) * 10) / 10;

  // Optical QR scanners require at least 3.0:1 contrast; inverted or low-contrast QRs fail to scan
  const isSafe = ratio >= 3.0;
  let warning = undefined;

  if (ratio < 2.0) {
    warning = `Critical: Extremely low contrast ratio (${ratio}:1). This QR code will likely not scan on most devices.`;
  } else if (ratio < 3.0) {
    warning = `Warning: Low contrast ratio (${ratio}:1). Standard optical scanners recommend at least 3.0:1.`;
  } else if (l1 > l2) {
    // Inverted QR (light dots on dark background)
    warning = `Note: Light modules on a dark background (inverted QR). While many modern camera apps support this, legacy or specialized physical barcode scanners may fail.`;
  }

  return { ratio, isSafe, warning };
}

/**
 * Validates logo dimensions and calculates coverage ratio against QR code size
 * @param {number} logoSizePx Size of the logo in pixels
 * @param {number} qrSizePx Total QR width in pixels
 * @param {'L'|'M'|'Q'|'H'} ecLevel Error correction level
 * @returns {{ coveragePercent: number, isSafe: boolean, recommendedEcLevel: string, warning?: string }}
 */
export function validateLogoCoverage(logoSizePx, qrSizePx, ecLevel = 'M') {
  if (!logoSizePx || !qrSizePx || qrSizePx <= 0) {
    return { coveragePercent: 0, isSafe: true, recommendedEcLevel: 'M' };
  }

  const logoArea = logoSizePx * logoSizePx;
  const qrArea = qrSizePx * qrSizePx;
  const coveragePercent = Math.round((logoArea / qrArea) * 100);

  // Maximum safe coverage recommendations:
  // Level L: 7% recovery (Do not use logo)
  // Level M: 15% recovery (Max ~10% logo area)
  // Level Q: 25% recovery (Max ~15% logo area)
  // Level H: 30% recovery (Max ~22% logo area)
  let isSafe = true;
  let warning = undefined;
  const recommendedEcLevel = coveragePercent > 12 ? 'H' : 'Q';

  if (ecLevel === 'L') {
    isSafe = false;
    warning = 'Error Correction "L" (7%) is too low for logo overlays. Switch to "H" or "Q" to ensure scannability.';
  } else if (coveragePercent > 25) {
    isSafe = false;
    warning = `Logo covers ${coveragePercent}% of the QR code. This exceeds safe error correction limits and will likely cause scan failures.`;
  } else if (coveragePercent > 18 && ecLevel !== 'H') {
    warning = `Logo covers ${coveragePercent}% of the QR code. We strongly recommend setting Error Correction to "H" (30%).`;
  }

  return { coveragePercent, isSafe, recommendedEcLevel, warning };
}

/**
 * Sanitizes and validates a URL for security
 * @param {string} url
 * @returns {{ valid: boolean, sanitizedUrl: string, error?: string, isSuspicious?: boolean, reason?: string }}
 */
export function validateUrl(url = '') {
  const clean = String(url).trim();
  if (!clean) {
    return { valid: false, sanitizedUrl: '', error: 'URL cannot be empty.' };
  }

  // Prevent dangerous protocol schemes
  const lower = clean.toLowerCase();
  if (lower.startsWith('javascript:') || lower.startsWith('data:') || lower.startsWith('vbscript:')) {
    return {
      valid: false,
      sanitizedUrl: clean,
      isSuspicious: true,
      reason: 'Contains an executable or potentially hazardous URI scheme.',
      error: 'Security Warning: Dangerous URI scheme detected.'
    };
  }

  try {
    // If no scheme provided, prefix https://
    let testUrl = clean;
    if (!/^https?:\/\//i.test(testUrl) && !/^ftp:\/\//i.test(testUrl)) {
      testUrl = 'https://' + testUrl;
    }

    const parsed = new URL(testUrl);
    if (!['http:', 'https:', 'ftp:'].includes(parsed.protocol)) {
      return {
        valid: false,
        sanitizedUrl: clean,
        isSuspicious: true,
        reason: `Unsupported URL protocol (${parsed.protocol})`,
        error: 'Only http, https, and ftp URLs are supported.'
      };
    }

    return {
      valid: true,
      sanitizedUrl: parsed.href,
      isSuspicious: false
    };
  } catch (err) {
    return {
      valid: false,
      sanitizedUrl: clean,
      error: 'Invalid URL format.'
    };
  }
}
