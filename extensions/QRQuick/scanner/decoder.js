/**
 * QRQuick - QR Code Decoder & Safety Engine
 * Decodes QR codes from Images, Blobs, Canvases, and Video streams
 * using the locally bundled jsQR engine.
 */

import jsQR from '../lib/jsqr.mjs';
import { detectPayloadType } from '../services/payload-builder.js';
import { validateUrl } from '../services/validation.js';

/**
 * Decodes QR code from raw ImageData
 * @param {ImageData} imageData
 * @returns {object|null}
 */
export function decodeImageData(imageData) {
  if (!imageData || !imageData.data || !imageData.width || !imageData.height) {
    return null;
  }

  const code = jsQR(imageData.data, imageData.width, imageData.height, {
    inversionAttempts: 'attemptBoth'
  });

  if (!code || !code.data) {
    return null;
  }

  const payloadTypeInfo = detectPayloadType(code.data);
  let isSuspicious = false;
  let securityWarning = null;

  // Security evaluation for URLs
  if (payloadTypeInfo.isUrl || code.data.toLowerCase().startsWith('http')) {
    const urlVal = validateUrl(code.data);
    if (urlVal.isSuspicious) {
      isSuspicious = true;
      securityWarning = urlVal.reason || 'Potentially hazardous URL scheme detected.';
    }
  }

  return {
    rawText: code.data,
    binaryData: code.binaryData,
    location: code.location,
    type: payloadTypeInfo.type,
    title: payloadTypeInfo.title,
    summary: payloadTypeInfo.formattedSummary,
    details: payloadTypeInfo.details,
    isUrl: payloadTypeInfo.isUrl,
    actionUrl: payloadTypeInfo.actionUrl,
    isSuspicious,
    securityWarning
  };
}

/**
 * Decodes QR code from an Image, Canvas, or Video element
 * @param {HTMLImageElement|HTMLCanvasElement|HTMLVideoElement} sourceElement
 * @returns {object|null}
 */
export function decodeFromElement(sourceElement) {
  const width = sourceElement.videoWidth || sourceElement.naturalWidth || sourceElement.width;
  const height = sourceElement.videoHeight || sourceElement.naturalHeight || sourceElement.height;

  if (!width || !height) return null;

  // Max dimension limit 1600px to prevent memory spikes
  const maxDim = 1600;
  let targetW = width;
  let targetH = height;

  if (targetW > maxDim || targetH > maxDim) {
    const scale = Math.min(maxDim / targetW, maxDim / targetH);
    targetW = Math.round(targetW * scale);
    targetH = Math.round(targetH * scale);
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(sourceElement, 0, 0, targetW, targetH);

  const imgData = ctx.getImageData(0, 0, targetW, targetH);
  return decodeImageData(imgData);
}

/**
 * Decodes QR code from an image File or Blob
 * @param {Blob|File} blob
 * @returns {Promise<object>}
 */
export async function decodeFromBlob(blob) {
  if (!blob || !(blob instanceof Blob)) {
    throw new Error('Please select a valid image file.');
  }

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);
      try {
        const result = decodeFromElement(img);
        if (!result) {
          resolve({
            success: false,
            error: 'No QR code was detected in this image. Ensure the code is clear, well-lit, and uncropped.'
          });
        } else {
          resolve({
            success: true,
            result
          });
        }
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image file. Please ensure it is a valid PNG, JPEG, or WebP image.'));
    };

    img.src = url;
  });
}
