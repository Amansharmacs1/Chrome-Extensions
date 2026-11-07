/**
 * FontLens - Font Identification & Evidence Engine
 * Gathers multi-layered evidence across CSS Font Loading APIs, canvas width metrics,
 * loaded FontFace sets, and Google Fonts catalogs to evaluate likely rendered typography.
 */

import { findGoogleFontMatch } from './google-fonts-data.js';

// Generic system font families
export const SYSTEM_FALLBACKS = new Set([
  'sans-serif',
  'serif',
  'monospace',
  'cursive',
  'fantasy',
  'system-ui',
  '-apple-system',
  'blinkmacsystemfont',
  'segoe ui',
  'roboto',
  'helvetica neue',
  'helvetica',
  'arial',
  'times new roman',
  'times',
  'courier new',
  'courier'
]);

/**
 * Checks if a font name is a generic or common system fallback
 * @param {string} fontName
 * @returns {boolean}
 */
export function isSystemFallback(fontName = '') {
  const clean = String(fontName || '').toLowerCase().replace(/['"]/g, '').trim();
  return SYSTEM_FALLBACKS.has(clean);
}

/**
 * Inspects document.fonts to find any loaded FontFace matching family
 * @param {string} familyName
 * @returns {{ loaded: boolean, fontFaces: Array<{ family: string, status: string, weight: string, style: string }> }}
 */
export function inspectLoadedFontFaces(familyName = '') {
  if (typeof document === 'undefined' || !document.fonts) {
    return { loaded: false, fontFaces: [] };
  }

  const clean = String(familyName || '').toLowerCase().replace(/['"]/g, '').trim();
  const matched = [];

  try {
    for (const fontFace of document.fonts) {
      if (!fontFace || !fontFace.family) continue;
      const faceClean = String(fontFace.family).toLowerCase().replace(/['"]/g, '').trim();
      if (faceClean === clean) {
        matched.push({
          family: fontFace.family,
          status: fontFace.status,
          weight: fontFace.weight,
          style: fontFace.style
        });
      }
    }
  } catch {
    // Some browser contexts restrict iterating document.fonts
  }

  return {
    loaded: matched.some(f => f.status === 'loaded'),
    fontFaces: matched
  };
}

/**
 * Executes document.fonts.check for supporting evidence
 * @param {string} familyName
 * @param {string|number} weight
 * @param {string} style
 * @returns {boolean}
 */
export function testFontsCheck(familyName = '', weight = '400', style = 'normal') {
  if (typeof document === 'undefined' || !document.fonts || typeof document.fonts.check !== 'function') {
    return false;
  }

  try {
    const cleanFam = String(familyName || '').replace(/['"]/g, '');
    const spec = `${style} ${weight} 16px "${cleanFam}"`;
    return document.fonts.check(spec);
  } catch {
    return false;
  }
}

/**
 * Canvas glyph measurement heuristic to test whether a font alters rendering vs base fallbacks
 * @param {string} fontName
 * @returns {boolean|null} true if font caused metric deviation, false if identical to fallback, null if canvas unavailable
 */
export function measureCanvasMetricEvidence(fontName = '') {
  if (typeof document === 'undefined') return null;

  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const testString = 'BESbswy 1234567890 !@#$%^&*()';
    const testSize = '72px';

    // Baseline fallback measurements
    ctx.font = `${testSize} monospace`;
    const monoWidth = ctx.measureText(testString).width;

    ctx.font = `${testSize} sans-serif`;
    const sansWidth = ctx.measureText(testString).width;

    // Test font paired with fallbacks
    const cleanFont = `"${fontName.replace(/['"]/g, '')}"`;

    ctx.font = `${testSize} ${cleanFont}, monospace`;
    const testMonoWidth = ctx.measureText(testString).width;

    ctx.font = `${testSize} ${cleanFont}, sans-serif`;
    const testSansWidth = ctx.measureText(testString).width;

    // If font is installed/rendered, the width will diverge from the pure fallback
    const divergesFromMono = Math.abs(testMonoWidth - monoWidth) > 0.5;
    const divergesFromSans = Math.abs(testSansWidth - sansWidth) > 0.5;

    return divergesFromMono || divergesFromSans;
  } catch {
    return null;
  }
}

/**
 * Evaluates font identification evidence across all candidates in declared stack
 * @param {string[]} fontStack
 * @param {string|number} [weight='400']
 * @param {string} [style='normal']
 * @returns {object} Structured evidence report
 */
export function analyzeFontEvidence(fontStack = [], weight = '400', style = 'normal') {
  const candidates = [];

  for (let i = 0; i < fontStack.length; i++) {
    const name = fontStack[i].trim();
    if (!name) continue;

    const isFallback = isSystemFallback(name);
    const loadedFaces = inspectLoadedFontFaces(name);
    const fontsCheckPassed = testFontsCheck(name, weight, style);
    const metricEvidence = measureCanvasMetricEvidence(name);
    const googleMatch = findGoogleFontMatch(name);

    let confidence = 'Unverified';
    let confidenceScore = 10;
    const evidenceNotes = [];

    if (loadedFaces.loaded) {
      confidenceScore += 45;
      evidenceNotes.push('Declared FontFace is loaded via CSS Font Loading API.');
    }

    if (fontsCheckPassed) {
      confidenceScore += 25;
      evidenceNotes.push('Passed document.fonts.check() validation.');
    }

    if (metricEvidence === true) {
      confidenceScore += 25;
      evidenceNotes.push('Glyph bounding-box metrics diverge from default system fallbacks.');
    }

    if (googleMatch) {
      evidenceNotes.push(`Cataloged in Google Fonts library as ${googleMatch.category}.`);
    }

    if (isFallback) {
      confidence = 'Fallback Candidate';
      evidenceNotes.push('Recognized system/browser generic fallback.');
    } else if (confidenceScore >= 70) {
      confidence = 'High Evidence';
    } else if (confidenceScore >= 35) {
      confidence = 'Moderate Evidence';
    } else {
      confidence = 'Unverified Candidate';
      evidenceNotes.push('Font declared in CSS stack, but not explicitly verified by browser font APIs.');
    }

    candidates.push({
      name,
      index: i,
      isPrimaryDeclared: i === 0,
      isSystemFallback: isFallback,
      googleMatch,
      evidence: {
        fontFaceLoaded: loadedFaces.loaded,
        fontFacesCount: loadedFaces.fontFaces.length,
        fontsCheckPassed,
        metricEvidence,
        confidenceScore: Math.min(100, confidenceScore),
        confidence,
        notes: evidenceNotes
      }
    });
  }

  // Determine top likely rendered font candidate
  let topCandidate = candidates.find(c => c.evidence.confidence === 'High Evidence') ||
                     candidates.find(c => c.evidence.confidence === 'Moderate Evidence') ||
                     candidates[0] || null;

  return {
    declaredStack: fontStack,
    candidates,
    topCandidate: topCandidate ? topCandidate.name : 'Unknown',
    topCandidateConfidence: topCandidate ? topCandidate.evidence.confidence : 'Unverified',
    hasGoogleFont: candidates.some(c => Boolean(c.googleMatch)),
    summary: topCandidate
      ? `Likely rendering "${topCandidate.name}" with ${topCandidate.evidence.confidence.toLowerCase()}.`
      : 'No font candidates could be evaluated.'
  };
}
