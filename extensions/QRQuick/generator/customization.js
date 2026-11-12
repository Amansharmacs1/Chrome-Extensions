/**
 * QRQuick - Customization Models & Presets
 * Manages color themes, pattern configurations, quiet zones,
 * and contrast safety evaluations.
 */

import { calculateContrastRatio, validateLogoCoverage } from '../services/validation.js';

export const PATTERN_STYLES = [
  { id: 'square', name: 'Square', description: 'Standard sharp modules (maximum scannability)' },
  { id: 'rounded', name: 'Rounded', description: 'Modern softened module corners' },
  { id: 'dots', name: 'Dots', description: 'Circular micro-dots' },
  { id: 'classy', name: 'Classy', description: 'Stylized smooth organic tiles' }
];

export const EYE_OUTER_STYLES = [
  { id: 'square', name: 'Square Frame' },
  { id: 'rounded', name: 'Rounded Frame' },
  { id: 'circle', name: 'Circular Frame' }
];

export const EYE_INNER_STYLES = [
  { id: 'square', name: 'Square Dot' },
  { id: 'circle', name: 'Round Dot' },
  { id: 'diamond', name: 'Diamond Dot' }
];

export const CURATED_PALETTES = [
  { name: 'Onyx & Snow', fg: '#0F172A', bg: '#FFFFFF' },
  { name: 'Electric Cyan', fg: '#06B6D4', bg: '#0B0F19' },
  { name: 'Deep Indigo', fg: '#4F46E5', bg: '#FFFFFF' },
  { name: 'Emerald Forest', fg: '#059669', bg: '#F0FDF4' },
  { name: 'Royal Purple', fg: '#7C3AED', bg: '#FAF5FF' },
  { name: 'Ruby Dark', fg: '#E11D48', bg: '#0F172A' },
  { name: 'Amber Minimal', fg: '#D97706', bg: '#FFFBEB' },
  { name: 'Midnight Charcoal', fg: '#334155', bg: '#020617' }
];

export const CURATED_GRADIENTS = [
  { name: 'Cyan Glow', fg1: '#06B6D4', fg2: '#38BDF8', bg: '#0B0F19' },
  { name: 'Sunset Glow', fg1: '#8B5CF6', fg2: '#EC4899', bg: '#0F172A' },
  { name: 'Ocean Breeze', fg1: '#0284C7', fg2: '#06B6D4', bg: '#FFFFFF' },
  { name: 'Neon Cyberpunk', fg1: '#10B981', fg2: '#06B6D4', bg: '#090D16' },
  { name: 'Fire Flame', fg1: '#F59E0B', fg2: '#EF4444', bg: '#FFFFFF' }
];

export const DEFAULT_CUSTOMIZATION = {
  size: 512,
  margin: 4,
  ecLevel: 'M',
  fgColor: '#0F172A',
  bgColor: '#FFFFFF',
  isGradient: false,
  gradientType: 'linear',
  fgColorSecondary: '#06B6D4',
  pattern: 'square',
  eyeOuter: 'square',
  eyeInner: 'square',
  logoDataUrl: null,
  logoSizePercent: 20,
  logoPadding: 6,
  logoBgColor: '#FFFFFF',
  logoShape: 'rounded'
};

/**
 * Evaluates the safety of the current customization configuration
 * @param {object} options
 * @returns {{ isSafe: boolean, contrast: object, logo: object, warnings: string[] }}
 */
export function evaluateCustomizationSafety(options = {}) {
  const fg = options.fgColor || DEFAULT_CUSTOMIZATION.fgColor;
  const bg = options.bgColor || DEFAULT_CUSTOMIZATION.bgColor;
  const ec = options.ecLevel || DEFAULT_CUSTOMIZATION.ecLevel;

  const warnings = [];

  // Contrast check
  const contrast = calculateContrastRatio(fg, bg);
  if (contrast.warning) {
    warnings.push(contrast.warning);
  }

  // Logo coverage check
  let logo = { isSafe: true };
  if (options.logoDataUrl) {
    logo = validateLogoCoverage(options.logoSizePercent, 100, ec);
    if (logo.warning) {
      warnings.push(logo.warning);
    }
  }

  // Margin check
  if (options.margin < 2) {
    warnings.push('A quiet zone margin below 2 modules can cause barcode readers to fail on printed or textured surfaces.');
  }

  const isSafe = contrast.isSafe && logo.isSafe;

  return {
    isSafe,
    contrast,
    logo,
    warnings
  };
}
