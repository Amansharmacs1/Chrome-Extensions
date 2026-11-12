/**
 * QRQuick - jsQR ES Module Wrapper
 * Provides seamless ES module import for both browser and Node.js environments.
 */

import './jsQR.js';

const jsQR = (typeof window !== 'undefined' && window.jsQR) ||
             (typeof self !== 'undefined' && self.jsQR) ||
             (typeof globalThis !== 'undefined' && globalThis.jsQR);

export default jsQR;
