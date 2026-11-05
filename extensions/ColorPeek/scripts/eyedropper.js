/**
 * ColorPeek - Eyedropper API Bridge
 * Manages native browser EyeDropper API invocation with cancel handling,
 * color normalization, and graceful fallback detection.
 */

import { parseColor } from './color-converter.js';

/**
 * Checks if the browser's native EyeDropper API is supported in the current context
 * @returns {boolean}
 */
export function isEyeDropperSupported() {
  return typeof window !== 'undefined' && 'EyeDropper' in window;
}

/**
 * Initiates the native Eyedropper tool to sample any pixel from the display
 * @returns {Promise<{success: boolean, hex?: string, canceled?: boolean, error?: string}>}
 */
export async function samplePixelWithEyeDropper() {
  if (!isEyeDropperSupported()) {
    return {
      success: false,
      error: 'The native EyeDropper API is not supported in this browser window. Chrome 95+ desktop is required.'
    };
  }

  try {
    const eyeDropper = new window.EyeDropper();
    const result = await eyeDropper.open();

    if (result && result.sRGBHex) {
      const parsed = parseColor(result.sRGBHex);
      if (parsed) {
        return {
          success: true,
          hex: parsed.hex,
          rgb: parsed.rgb,
          hsl: parsed.hsl,
          source: 'eyedropper'
        };
      }
    }

    return {
      success: false,
      error: 'No color could be extracted from sample.'
    };
  } catch (err) {
    // User pressed Esc or clicked outside to cancel sampling
    if (err && (err.name === 'AbortError' || err.message?.includes('aborted') || err.message?.includes('canceled'))) {
      return {
        success: false,
        canceled: true
      };
    }

    console.warn('[ColorPeek Eyedropper] Pick error:', err);
    return {
      success: false,
      error: err.message || 'Eyedropper was unable to sample color.'
    };
  }
}
