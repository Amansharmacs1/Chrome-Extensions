/**
 * QRQuick - QR Decoder Unit & Roundtrip Tests
 */

import { decodeImageData } from '../scanner/decoder.js';
import { generateQRMatrix } from '../generator/qr-engine.js';

export async function runDecoderTests() {
  const assertions = [];
  function assert(condition, message) {
    if (!condition) {
      throw new Error(`Decoder Test Failed: ${message}`);
    }
    assertions.push(message);
  }

  // 1. Synthetic Roundtrip Test: Generate QR Matrix -> Create Pixel ImageData -> Decode with jsQR
  const testPayload = 'https://qrquick.app/verify';
  const qrMatrix = generateQRMatrix(testPayload, 'M');
  const moduleCount = qrMatrix.moduleCount;

  // Scale: 4px per module, 4-module quiet zone margin
  const margin = 4;
  const scale = 4;
  const totalModules = moduleCount + margin * 2;
  const width = totalModules * scale;
  const height = width;

  const rgbaBuffer = new Uint8ClampedArray(width * height * 4);

  // Fill with white
  rgbaBuffer.fill(255);

  // Draw dark modules
  for (let r = 0; r < moduleCount; r++) {
    for (let c = 0; c < moduleCount; c++) {
      if (qrMatrix.isDark(r, c)) {
        const startX = (margin + c) * scale;
        const startY = (margin + r) * scale;

        for (let py = 0; py < scale; py++) {
          for (let px = 0; px < scale; px++) {
            const idx = ((startY + py) * width + (startX + px)) * 4;
            rgbaBuffer[idx] = 0;     // R
            rgbaBuffer[idx + 1] = 0; // G
            rgbaBuffer[idx + 2] = 0; // B
            rgbaBuffer[idx + 3] = 255; // A
          }
        }
      }
    }
  }

  const mockImageData = {
    data: rgbaBuffer,
    width,
    height
  };

  const decoded = decodeImageData(mockImageData);
  assert(decoded !== null, 'jsQR successfully detected and decoded synthetic QR image');
  assert(decoded.rawText === testPayload, `Decoded text matches original payload ("${decoded?.rawText}" === "${testPayload}")`);
  assert(decoded.type === 'url', 'Type recognized as "url"');
  assert(decoded.isUrl === true, 'isUrl flag is true');
  assert(decoded.isSuspicious === false, 'Standard URL is not marked suspicious');

  // 2. Decode Wi-Fi synthetic QR
  const wifiPayload = 'WIFI:S:MySecretNetwork;T:WPA;P:Pa$$w0rd123;;';
  const wifiMatrix = generateQRMatrix(wifiPayload, 'M');
  const wCount = wifiMatrix.moduleCount;
  const wWidth = (wCount + 8) * scale;
  const wBuffer = new Uint8ClampedArray(wWidth * wWidth * 4);
  wBuffer.fill(255);

  for (let r = 0; r < wCount; r++) {
    for (let c = 0; c < wCount; c++) {
      if (wifiMatrix.isDark(r, c)) {
        const startX = (4 + c) * scale;
        const startY = (4 + r) * scale;
        for (let py = 0; py < scale; py++) {
          for (let px = 0; px < scale; px++) {
            const idx = ((startY + py) * wWidth + (startX + px)) * 4;
            wBuffer[idx] = 0;
            wBuffer[idx + 1] = 0;
            wBuffer[idx + 2] = 0;
            wBuffer[idx + 3] = 255;
          }
        }
      }
    }
  }

  const wifiDecoded = decodeImageData({ data: wBuffer, width: wWidth, height: wWidth });
  assert(wifiDecoded !== null, 'Decoded Wi-Fi QR code');
  assert(wifiDecoded.type === 'wifi', 'Recognized type is "wifi"');
  assert(wifiDecoded.details.ssid === 'MySecretNetwork', 'Extracted Wi-Fi SSID');
  assert(wifiDecoded.details.password === 'Pa$$w0rd123', 'Extracted Wi-Fi password');

  // 3. Blank image test (should return null)
  const blankBuffer = new Uint8ClampedArray(100 * 100 * 4);
  blankBuffer.fill(255);
  const blankDecoded = decodeImageData({ data: blankBuffer, width: 100, height: 100 });
  assert(blankDecoded === null, 'Blank image returns null');

  return assertions;
}
