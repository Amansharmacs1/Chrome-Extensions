/**
 * QRQuick - SimpleZip Unit Tests
 */

import { SimpleZip, calculateCRC32 } from '../lib/simple-zip.js';

export async function runSimpleZipTests() {
  const assertions = [];
  function assert(condition, message) {
    if (!condition) {
      throw new Error(`SimpleZip Test Failed: ${message}`);
    }
    assertions.push(message);
  }

  // 1. CRC32 Validation
  const sampleBytes = new TextEncoder().encode('123456789');
  const crc = calculateCRC32(sampleBytes);
  // Standard test vector for '123456789' is 0xCBF43926
  assert(crc === 0xCBF43926, `CRC32 of '123456789' matches standard test vector (0xCBF43926, actual: 0x${crc.toString(16).toUpperCase()})`);

  // 2. SimpleZip Generation
  const zip = new SimpleZip();
  zip.addFile('hello.txt', 'Hello, QRQuick world!');
  zip.addFile('folder/test.svg', '<svg width="100" height="100"><circle cx="50" cy="50" r="40"/></svg>');
  zip.addFile('binary.dat', new Uint8Array([1, 2, 3, 4, 5, 255]));

  const zipBytes = zip.generate();
  assert(zipBytes instanceof Uint8Array, 'generate() returns Uint8Array');
  assert(zipBytes.length > 100, `ZIP buffer length > 100 (actual: ${zipBytes.length} bytes)`);

  // Verify PK local header signature: 0x50, 0x4B, 0x03, 0x04
  assert(zipBytes[0] === 0x50 && zipBytes[1] === 0x4B && zipBytes[2] === 0x03 && zipBytes[3] === 0x04, 'Starts with PK local file header (0x04034b50)');

  // Verify End of Central Directory signature at end: 0x50, 0x4B, 0x05, 0x06
  const eocdIndex = zipBytes.length - 22;
  assert(zipBytes[eocdIndex] === 0x50 && zipBytes[eocdIndex + 1] === 0x4B && zipBytes[eocdIndex + 2] === 0x05 && zipBytes[eocdIndex + 3] === 0x06, 'Ends with End of Central Directory record (0x06054b50)');

  return assertions;
}
