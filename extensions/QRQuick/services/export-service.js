/**
 * QRQuick - Export & Download Service
 * Handles high-resolution PNG, SVG, JPEG raster/vector generation,
 * clipboard image/text copying, and filename sanitization.
 */

import { renderQRToCanvas, generateQRSvg } from '../generator/qr-engine.js';

/**
 * Sanitizes a title string into a safe file slug
 * @param {string} title
 * @returns {string}
 */
export function sanitizeSlug(title = '') {
  return String(title)
    .toLowerCase()
    .trim()
    .replace(/https?:\/\//g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 30) || 'code';
}

/**
 * Formats a clean, timestamped filename
 * @param {string} type QR payload type (url, wifi, vcard, etc.)
 * @param {string} title Optional title/slug
 * @param {string} extension File extension (png, svg, jpg)
 * @returns {string}
 */
export function generateFilename(type = 'qr', title = '', extension = 'png') {
  const slug = sanitizeSlug(title);
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '');
  return `qrquick_${type}_${slug}_${dateStr}_${timeStr}.${extension}`;
}

/**
 * Triggers a client-side file download from a Blob or DataURL
 * @param {Blob|string} blobOrUrl
 * @param {string} filename
 */
export function triggerFileDownload(blobOrUrl, filename) {
  let url = blobOrUrl;
  let isCreatedUrl = false;

  if (blobOrUrl instanceof Blob) {
    url = URL.createObjectURL(blobOrUrl);
    isCreatedUrl = true;
  }

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  if (isCreatedUrl) {
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
}

/**
 * Exports QR as a high-resolution PNG file
 * @param {string} payload
 * @param {object} options
 * @param {HTMLImageElement} [logoImage]
 * @param {number} [targetSize] Optional resolution override (e.g. 1024 or 2048)
 * @returns {Promise<string>} Downloaded filename
 */
export async function downloadPng(payload, options = {}, logoImage = null, targetSize = null) {
  const exportSize = targetSize || options.size || 512;
  const offscreenCanvas = document.createElement('canvas');
  const exportOptions = { ...options, size: exportSize };

  await renderQRToCanvas(offscreenCanvas, payload, exportOptions, logoImage);

  return new Promise((resolve, reject) => {
    offscreenCanvas.toBlob((blob) => {
      if (!blob) {
        return reject(new Error('Failed to create PNG blob.'));
      }
      const filename = generateFilename(options.type || 'qr', options.title, 'png');
      triggerFileDownload(blob, filename);
      resolve(filename);
    }, 'image/png');
  });
}

/**
 * Exports QR as a standalone SVG vector file
 * @param {string} payload
 * @param {object} options
 * @param {string} [logoDataUrl]
 * @returns {string} Downloaded filename
 */
export function downloadSvg(payload, options = {}, logoDataUrl = null) {
  const svgXml = generateQRSvg(payload, options, logoDataUrl);
  const blob = new Blob([svgXml], { type: 'image/svg+xml;charset=utf-8' });
  const filename = generateFilename(options.type || 'qr', options.title, 'svg');
  triggerFileDownload(blob, filename);
  return filename;
}

/**
 * Exports QR as a high-quality JPEG file
 * @param {string} payload
 * @param {object} options
 * @param {HTMLImageElement} [logoImage]
 * @param {number} [targetSize]
 * @returns {Promise<string>} Downloaded filename
 */
export async function downloadJpeg(payload, options = {}, logoImage = null, targetSize = null) {
  const exportSize = targetSize || options.size || 512;
  const offscreenCanvas = document.createElement('canvas');
  // JPEG does not support transparency; ensure background is solid
  const bg = (options.bgColor && options.bgColor.toLowerCase() !== 'transparent') ? options.bgColor : '#FFFFFF';
  const exportOptions = { ...options, size: exportSize, bgColor: bg };

  await renderQRToCanvas(offscreenCanvas, payload, exportOptions, logoImage);

  return new Promise((resolve, reject) => {
    offscreenCanvas.toBlob((blob) => {
      if (!blob) {
        return reject(new Error('Failed to create JPEG blob.'));
      }
      const filename = generateFilename(options.type || 'qr', options.title, 'jpg');
      triggerFileDownload(blob, filename);
      resolve(filename);
    }, 'image/jpeg', 0.95);
  });
}

/**
 * Copies the QR code image to the operating system clipboard
 * @param {HTMLCanvasElement} canvas
 * @returns {Promise<boolean>}
 */
export async function copyQrImageToClipboard(canvas) {
  if (!navigator.clipboard || typeof ClipboardItem === 'undefined') {
    throw new Error('Clipboard image copy is not supported in this browser environment.');
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob(async (blob) => {
      if (!blob) {
        return reject(new Error('Failed to produce image blob for clipboard.'));
      }
      try {
        const item = new ClipboardItem({ 'image/png': blob });
        await navigator.clipboard.write([item]);
        resolve(true);
      } catch (err) {
        reject(err);
      }
    }, 'image/png');
  });
}

/**
 * Copies text payload to clipboard
 * @param {string} text
 * @returns {Promise<boolean>}
 */
export async function copyTextToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }
  // Fallback for older environments
  const textArea = document.createElement('textarea');
  textArea.value = text;
  document.body.appendChild(textArea);
  textArea.select();
  document.execCommand('copy');
  document.body.removeChild(textArea);
  return true;
}
