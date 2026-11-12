/**
 * QRQuick - Lightweight Pure-JS PKZIP Writer
 * Generates standards-compliant uncompressed (Stored) ZIP archives
 * without external dependencies.
 * Licensed under MIT License.
 */

// CRC-32 lookup table
const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  }
  CRC_TABLE[n] = c;
}

/**
 * Calculates 32-bit Cyclic Redundancy Check (CRC-32)
 * @param {Uint8Array} bytes
 * @returns {number}
 */
export function calculateCRC32(bytes) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < bytes.length; i++) {
    c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
  }
  return (c ^ 0xFFFFFFFF) >>> 0;
}

/**
 * Converts a string to UTF-8 Uint8Array
 * @param {string} str
 * @returns {Uint8Array}
 */
export function stringToUtf8(str) {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(str);
  }
  // Fallback
  const utf8 = [];
  for (let i = 0; i < str.length; i++) {
    let charcode = str.charCodeAt(i);
    if (charcode < 0x80) utf8.push(charcode);
    else if (charcode < 0x800) {
      utf8.push(0xc0 | (charcode >> 6), 0x80 | (charcode & 0x3f));
    } else if (charcode < 0xd800 || charcode >= 0xe000) {
      utf8.push(0xe0 | (charcode >> 12), 0x80 | ((charcode >> 6) & 0x3f), 0x80 | (charcode & 0x3f));
    } else {
      i++;
      charcode = 0x10000 + (((charcode & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff));
      utf8.push(0xf0 | (charcode >> 18), 0x80 | ((charcode >> 12) & 0x3f), 0x80 | ((charcode >> 6) & 0x3f), 0x80 | (charcode & 0x3f));
    }
  }
  return new Uint8Array(utf8);
}

/**
 * Formats a Date object to MS-DOS date and time format
 * @param {Date} [date=new Date()]
 * @returns {{ time: number, date: number }}
 */
function toDosDateTime(date = new Date()) {
  const d = (date instanceof Date && !isNaN(date)) ? date : new Date();
  const time = ((d.getHours() & 0x1F) << 11) | ((d.getMinutes() & 0x3F) << 5) | ((Math.floor(d.getSeconds() / 2)) & 0x1F);
  const dosDate = (((d.getFullYear() - 1980) & 0x7F) << 9) | (((d.getMonth() + 1) & 0x0F) << 5) | (d.getDate() & 0x1F);
  return { time, date: dosDate };
}

/**
 * SimpleZip Archive Builder
 */
export class SimpleZip {
  constructor() {
    this.files = [];
  }

  /**
   * Adds a file to the archive
   * @param {string} name Relative filename in archive (e.g., 'qr_1.png')
   * @param {Uint8Array|ArrayBuffer|string} content File contents
   * @param {Date} [date] Optional file timestamp
   */
  addFile(name, content, date = new Date()) {
    if (!name || typeof name !== 'string') {
      throw new Error('File name must be a non-empty string');
    }

    let dataBytes;
    if (typeof content === 'string') {
      dataBytes = stringToUtf8(content);
    } else if (content instanceof Uint8Array) {
      dataBytes = content;
    } else if (content instanceof ArrayBuffer) {
      dataBytes = new Uint8Array(content);
    } else {
      throw new Error(`Unsupported content type for file "${name}"`);
    }

    const nameBytes = stringToUtf8(name.replace(/\\/g, '/'));
    const crc = calculateCRC32(dataBytes);
    const { time: dosTime, date: dosDate } = toDosDateTime(date);

    this.files.push({
      name,
      nameBytes,
      dataBytes,
      crc,
      dosTime,
      dosDate,
      size: dataBytes.length
    });
  }

  /**
   * Builds the complete binary ZIP file buffer
   * @returns {Uint8Array}
   */
  generate() {
    const localHeaders = [];
    const centralHeaders = [];
    let currentOffset = 0;

    for (const f of this.files) {
      // Local File Header (30 bytes + name length + data length)
      const localHeader = new Uint8Array(30 + f.nameBytes.length);
      const lView = new DataView(localHeader.buffer);

      lView.setUint32(0, 0x04034B50, true); // Local header signature
      lView.setUint16(4, 20, true);          // Version needed (2.0)
      lView.setUint16(6, 0x0800, true);       // Flags: UTF-8 filename (bit 11)
      lView.setUint16(8, 0, true);            // Compression: 0 = Stored
      lView.setUint16(10, f.dosTime, true);   // Mod time
      lView.setUint16(12, f.dosDate, true);   // Mod date
      lView.setUint32(14, f.crc, true);       // CRC-32
      lView.setUint32(18, f.size, true);      // Compressed size
      lView.setUint32(22, f.size, true);      // Uncompressed size
      lView.setUint16(26, f.nameBytes.length, true); // File name length
      lView.setUint16(28, 0, true);           // Extra field length

      localHeader.set(f.nameBytes, 30);

      // Central Directory Header (46 bytes + name length)
      const centralHeader = new Uint8Array(46 + f.nameBytes.length);
      const cView = new DataView(centralHeader.buffer);

      cView.setUint32(0, 0x02014B50, true); // Central directory signature
      cView.setUint16(4, 0x0314, true);      // Version made by: UNIX 2.0
      cView.setUint16(6, 20, true);          // Version needed: 2.0
      cView.setUint16(8, 0x0800, true);       // Flags: UTF-8
      cView.setUint16(10, 0, true);          // Compression: Stored
      cView.setUint16(12, f.dosTime, true);  // Mod time
      cView.setUint16(14, f.dosDate, true);  // Mod date
      cView.setUint32(16, f.crc, true);      // CRC-32
      cView.setUint32(20, f.size, true);     // Compressed size
      cView.setUint32(24, f.size, true);     // Uncompressed size
      cView.setUint16(28, f.nameBytes.length, true); // File name length
      cView.setUint16(30, 0, true);          // Extra field length
      cView.setUint16(32, 0, true);          // File comment length
      cView.setUint16(34, 0, true);          // Disk number start
      cView.setUint16(36, 0, true);          // Internal attributes
      cView.setUint32(38, 0x81A40000, true); // External attributes (0644 file permission)
      cView.setUint32(42, currentOffset, true); // Relative offset of local header

      centralHeader.set(f.nameBytes, 46);

      localHeaders.push(localHeader, f.dataBytes);
      centralHeaders.push(centralHeader);

      currentOffset += localHeader.length + f.dataBytes.length;
    }

    const centralDirOffset = currentOffset;
    let centralDirSize = 0;
    for (const ch of centralHeaders) {
      centralDirSize += ch.length;
    }

    // End of Central Directory Record (22 bytes)
    const eocd = new Uint8Array(22);
    const eView = new DataView(eocd.buffer);
    eView.setUint32(0, 0x06054B50, true); // EOCD signature
    eView.setUint16(4, 0, true);          // Disk number
    eView.setUint16(6, 0, true);          // Central dir disk
    eView.setUint16(8, this.files.length, true);  // Disk entries
    eView.setUint16(10, this.files.length, true); // Total entries
    eView.setUint32(12, centralDirSize, true);    // Central dir size
    eView.setUint32(16, centralDirOffset, true);  // Central dir offset
    eView.setUint16(20, 0, true);         // Comment length

    // Assemble final buffer
    const totalSize = centralDirOffset + centralDirSize + eocd.length;
    const output = new Uint8Array(totalSize);
    let pos = 0;

    for (const chunk of localHeaders) {
      output.set(chunk, pos);
      pos += chunk.length;
    }
    for (const chunk of centralHeaders) {
      output.set(chunk, pos);
      pos += chunk.length;
    }
    output.set(eocd, pos);

    return output;
  }
}
