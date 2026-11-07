/**
 * FontLens - In-Page Typography Inspector Controller (Injected Content Script)
 * Self-contained, robust engine for real-time typography inspection, font identification,
 * Shadow DOM floating HUD, and non-destructive live editing.
 * Zero external dependencies and zero top-level module imports for seamless script injection.
 */

(function () {
  if (typeof window !== 'undefined' && window.__FONTLENS_INSPECTOR_INITIALIZED__) {
    if (window.__FONTLENS_INSPECTOR_INSTANCE__) {
      window.__FONTLENS_INSPECTOR_INSTANCE__.toggle();
    }
    return;
  }
  if (typeof window !== 'undefined') {
    window.__FONTLENS_INSPECTOR_INITIALIZED__ = true;
  }

  /* ========================================================================== */
  /* 1. COLOR & CONTRAST UTILITIES                                              */
  /* ========================================================================== */

  function parseColor(str = '') {
    if (!str || typeof str !== 'string') return null;
    const s = str.trim().toLowerCase();
    if (s === 'transparent' || s === 'rgba(0, 0, 0, 0)') return { r: 0, g: 0, b: 0, a: 0 };
    if (s === 'white') return { r: 255, g: 255, b: 255, a: 1 };
    if (s === 'black') return { r: 0, g: 0, b: 0, a: 1 };

    if (s.startsWith('#')) {
      const hex = s.slice(1);
      if (hex.length === 3) {
        return {
          r: parseInt(hex[0] + hex[0], 16),
          g: parseInt(hex[1] + hex[1], 16),
          b: parseInt(hex[2] + hex[2], 16),
          a: 1
        };
      }
      if (hex.length === 6) {
        return {
          r: parseInt(hex.slice(0, 2), 16),
          g: parseInt(hex.slice(2, 4), 16),
          b: parseInt(hex.slice(4, 6), 16),
          a: 1
        };
      }
    }

    const rgbMatch = s.match(/rgba?\s*\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)(?:\s*[,/]\s*([0-9.]+%?))?\s*\)/);
    if (rgbMatch) {
      let a = 1;
      if (rgbMatch[4] !== undefined) {
        a = rgbMatch[4].endsWith('%') ? parseFloat(rgbMatch[4]) / 100 : parseFloat(rgbMatch[4]);
      }
      return {
        r: Math.round(parseFloat(rgbMatch[1])),
        g: Math.round(parseFloat(rgbMatch[2])),
        b: Math.round(parseFloat(rgbMatch[3])),
        a: Math.max(0, Math.min(1, a))
      };
    }
    return null;
  }

  function rgbaToHex(rgba) {
    if (!rgba) return '#000000';
    const toHex = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
    return `#${toHex(rgba.r)}${toHex(rgba.g)}${toHex(rgba.b)}`.toUpperCase();
  }

  function getRelativeLuminance({ r, g, b }) {
    const srgb = [r, g, b].map(v => {
      const val = v / 255;
      return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
  }

  function compositeOver(fg, bg) {
    const alpha = fg.a !== undefined ? fg.a : 1;
    return {
      r: Math.round(fg.r * alpha + bg.r * (1 - alpha)),
      g: Math.round(fg.g * alpha + bg.g * (1 - alpha)),
      b: Math.round(fg.b * alpha + bg.b * (1 - alpha))
    };
  }

  function getContrastRating(fgColor, bgColor) {
    const fg = typeof fgColor === 'string' ? parseColor(fgColor) : fgColor;
    const bg = typeof bgColor === 'string' ? parseColor(bgColor) : bgColor;
    if (!fg || !bg) {
      return { ratio: 1, scoreAA: false, scoreAAA: false, formatted: '1.0:1' };
    }

    const finalFg = fg.a < 1 ? compositeOver(fg, bg) : fg;
    const lum1 = getRelativeLuminance(finalFg);
    const lum2 = getRelativeLuminance(bg);

    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);
    const ratio = Math.round(((brightest + 0.05) / (darkest + 0.05)) * 100) / 100;

    return {
      ratio,
      scoreAA: ratio >= 4.5,
      scoreAAA: ratio >= 7.0,
      formatted: `${ratio.toFixed(1)}:1`
    };
  }

  function getEffectiveBackgroundColor(element) {
    let curr = element;
    let compositeBg = { r: 255, g: 255, b: 255 };
    const layers = [];

    while (curr && curr.nodeType === (typeof Node !== 'undefined' ? Node.ELEMENT_NODE : 1)) {
      try {
        const style = window.getComputedStyle(curr);
        if (style && style.backgroundColor) {
          const bg = parseColor(style.backgroundColor);
          if (bg && bg.a > 0) {
            layers.unshift(bg);
          }
        }
      } catch {}
      curr = curr.parentElement;
    }

    for (const layer of layers) {
      compositeBg = compositeOver(layer, compositeBg);
    }

    return {
      color: `rgb(${compositeBg.r}, ${compositeBg.g}, ${compositeBg.b})`,
      hex: rgbaToHex(compositeBg),
      rgb: compositeBg
    };
  }

  function getSafeSelector(el) {
    if (!el || el.nodeType !== (typeof Node !== 'undefined' ? Node.ELEMENT_NODE : 1)) return '';
    const tag = (el.tagName || 'div').toLowerCase();
    if (el.id && /^[a-zA-Z][\w-]*$/.test(el.id)) {
      return `#${el.id}`;
    }

    const classList = el.classList ? Array.from(el.classList) : [];
    const classes = classList
      .filter(c => /^[a-zA-Z0-9_-]+$/.test(c) && !c.startsWith('fontlens-') && !c.startsWith('inspect-'))
      .slice(0, 2);

    if (classes.length > 0) {
      return `${tag}.${classes.join('.')}`;
    }
    return tag;
  }

  function truncate(str = '', max = 60) {
    const clean = String(str).replace(/\s+/g, ' ').trim();
    if (clean.length <= max) return clean;
    return clean.slice(0, max) + '…';
  }

  /* ========================================================================== */
  /* 2. TYPOGRAPHY EXTRACTION & NORMALIZATION                                   */
  /* ========================================================================== */

  const FONT_WEIGHT_LABELS = {
    '100': 'Thin',
    '200': 'ExtraLight',
    '300': 'Light',
    '400': 'Regular',
    '500': 'Medium',
    '600': 'SemiBold',
    '700': 'Bold',
    '800': 'ExtraBold',
    '900': 'Black',
    '950': 'ExtraBlack'
  };

  function formatFontWeight(weight) {
    const wStr = String(weight).trim();
    const label = FONT_WEIGHT_LABELS[wStr] || (wStr === 'normal' ? 'Regular' : wStr === 'bold' ? 'Bold' : 'Custom');
    return `${label} (${wStr})`;
  }

  function parseFontFamilyStack(stackStr = '') {
    if (!stackStr || typeof stackStr !== 'string') return [];
    const list = [];
    let current = '';
    let inQuotes = false;
    let quoteChar = '';

    for (let i = 0; i < stackStr.length; i++) {
      const ch = stackStr[i];
      if ((ch === '"' || ch === "'") && (!inQuotes || ch === quoteChar)) {
        inQuotes = !inQuotes;
        quoteChar = inQuotes ? ch : '';
        continue;
      }
      if (ch === ',' && !inQuotes) {
        const clean = current.trim().replace(/^['"]|['"]$/g, '');
        if (clean) list.push(clean);
        current = '';
        continue;
      }
      current += ch;
    }
    const lastClean = current.trim().replace(/^['"]|['"]$/g, '');
    if (lastClean) list.push(lastClean);
    return list;
  }

  function normalizeLineHeight(lineHeightStr = '', fontSizePx = 16) {
    const clean = String(lineHeightStr).trim();
    const fsPx = typeof fontSizePx === 'string' ? parseFloat(fontSizePx) || 16 : (Number(fontSizePx) || 16);

    if (clean === 'normal') {
      const approxPx = Math.round(fsPx * 1.2 * 10) / 10;
      return { raw: 'normal', px: approxPx, ratio: 1.2, formattedRatio: '1.20 (approx)' };
    }

    if (clean.endsWith('px')) {
      const px = parseFloat(clean) || fsPx;
      const ratio = Math.round((px / fsPx) * 100) / 100;
      return { raw: clean, px: Math.round(px * 10) / 10, ratio, formattedRatio: `${ratio.toFixed(2)}×` };
    }

    const unitless = parseFloat(clean);
    if (!isNaN(unitless) && unitless > 0) {
      const px = Math.round(unitless * fsPx * 10) / 10;
      return { raw: clean, px, ratio: Math.round(unitless * 100) / 100, formattedRatio: `${unitless.toFixed(2)}×` };
    }

    return { raw: clean || 'normal', px: fsPx, ratio: 1.0, formattedRatio: '1.00×' };
  }

  function getRootFontSize() {
    try {
      const rootStyle = window.getComputedStyle(document.documentElement);
      return parseFloat(rootStyle.fontSize) || 16;
    } catch {
      return 16;
    }
  }

  function extractTypography(element) {
    if (!element || element.nodeType !== (typeof Node !== 'undefined' ? Node.ELEMENT_NODE : 1)) return null;

    let style;
    try {
      const win = element.ownerDocument?.defaultView || window;
      style = win.getComputedStyle(element);
    } catch {
      return null;
    }
    if (!style) return null;

    const rawFamily = style.fontFamily || '';
    const fontStack = parseFontFamilyStack(rawFamily);
    const primaryFamily = fontStack[0] || 'serif';

    const rawFontSize = style.fontSize || '16px';
    const fontSizePx = parseFloat(rawFontSize) || 16;
    const rootSize = getRootFontSize();
    const fontSizeRem = Math.round((fontSizePx / rootSize) * 1000) / 1000;

    const fontWeight = style.fontWeight || '400';
    const fontStyle = style.fontStyle || 'normal';

    const rawLineHeight = style.lineHeight || 'normal';
    const lineHeight = normalizeLineHeight(rawLineHeight, fontSizePx);
    const letterSpacing = style.letterSpacing || 'normal';
    const wordSpacing = style.wordSpacing || 'normal';

    const textColor = style.color || 'rgb(0, 0, 0)';
    const parsedColor = parseColor(textColor) || { r: 0, g: 0, b: 0, a: 1 };
    const hexColor = rgbaToHex(parsedColor);

    const effectiveBg = getEffectiveBackgroundColor(element);
    const contrast = getContrastRating(parsedColor, effectiveBg.rgb);

    const textAlign = style.textAlign || 'start';
    const textTransform = style.textTransform || 'none';
    const textDecoration = style.textDecorationLine || style.textDecoration || 'none';
    const textIndent = style.textIndent || '0px';
    const textRendering = style.textRendering || 'auto';

    const tagName = String(element.tagName || 'div').toLowerCase();
    const selector = getSafeSelector(element);
    const id = typeof element.id === 'string' ? element.id : '';
    const classes = Array.from(element.classList || []);
    const parentTag = element.parentElement ? String(element.parentElement.tagName || '').toLowerCase() : '';
    const textSnippet = truncate(element.textContent || '', 75);

    return {
      element: { tagName, selector, id, classes, parentTag, textSnippet },
      typography: {
        fontFamily: rawFamily,
        fontStack,
        primaryFamily,
        fontSize: rawFontSize,
        fontSizePx,
        fontSizeRem: `${fontSizeRem}rem`,
        fontWeight,
        fontWeightFormatted: formatFontWeight(fontWeight),
        fontStyle,
        lineHeight,
        letterSpacing,
        wordSpacing,
        color: textColor,
        colorHex: hexColor,
        backgroundColor: effectiveBg.color,
        backgroundColorHex: effectiveBg.hex,
        contrast,
        textAlign,
        textTransform,
        textDecoration,
        textIndent,
        textRendering
      }
    };
  }

  /* ========================================================================== */
  /* 3. FONT IDENTIFICATION & EVIDENCE ENGINE                                   */
  /* ========================================================================== */

  const SYSTEM_FALLBACKS = new Set([
    'sans-serif', 'serif', 'monospace', 'cursive', 'fantasy',
    'system-ui', '-apple-system', 'blinkmacsystemfont', 'segoe ui',
    'roboto', 'helvetica neue', 'helvetica', 'arial', 'times new roman',
    'times', 'courier new', 'courier'
  ]);

  function isSystemFallback(fontName = '') {
    const clean = String(fontName || '').toLowerCase().replace(/['"]/g, '').trim();
    return SYSTEM_FALLBACKS.has(clean);
  }

  function inspectLoadedFontFaces(familyName = '') {
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
    } catch {}
    return {
      loaded: matched.some(f => f.status === 'loaded'),
      fontFaces: matched
    };
  }

  function testFontsCheck(familyName = '', weight = '400', style = 'normal') {
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

  function measureCanvasMetricEvidence(fontName = '') {
    if (typeof document === 'undefined') return null;
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      const testString = 'BESbswy 1234567890 !@#$%^&*()';
      const testSize = '72px';

      ctx.font = `${testSize} monospace`;
      const monoWidth = ctx.measureText(testString).width;

      ctx.font = `${testSize} sans-serif`;
      const sansWidth = ctx.measureText(testString).width;

      const cleanFont = `"${String(fontName || '').replace(/['"]/g, '')}"`;

      ctx.font = `${testSize} ${cleanFont}, monospace`;
      const testMonoWidth = ctx.measureText(testString).width;

      ctx.font = `${testSize} ${cleanFont}, sans-serif`;
      const testSansWidth = ctx.measureText(testString).width;

      const divergesFromMono = Math.abs(testMonoWidth - monoWidth) > 0.5;
      const divergesFromSans = Math.abs(testSansWidth - sansWidth) > 0.5;

      return divergesFromMono || divergesFromSans;
    } catch {
      return null;
    }
  }

  const COMMON_GOOGLE_FONTS = new Set([
    'roboto', 'open sans', 'lato', 'montserrat', 'inter', 'poppins', 'oswald',
    'raleway', 'nunito', 'nunito sans', 'rubik', 'ubuntu', 'work sans',
    'quicksand', 'pt sans', 'fira sans', 'barlow', 'mulish', 'kanit',
    'merriweather', 'playfair display', 'lora', 'pt serif', 'noto serif',
    'fira code', 'jetbrains mono', 'source code pro', 'inconsolata',
    'bebas neue', 'lobster', 'comfortaa', 'pacifico', 'caveat'
  ]);

  function findGoogleFontMatch(fontName = '') {
    const clean = String(fontName || '').toLowerCase().replace(/['"]/g, '').trim();
    if (COMMON_GOOGLE_FONTS.has(clean)) {
      const slug = clean.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('+');
      return {
        isGoogleFont: true,
        name: fontName,
        category: 'web-font',
        specimenUrl: `https://fonts.google.com/specimen/${slug}`
      };
    }
    return null;
  }

  function analyzeFontEvidence(fontStack = [], weight = '400', style = 'normal') {
    const candidates = [];

    for (let i = 0; i < fontStack.length; i++) {
      const name = fontStack[i].trim();
      if (!name) continue;

      const isFallback = isSystemFallback(name);
      const loadedFaces = inspectLoadedFontFaces(name);
      const fontsCheckPassed = testFontsCheck(name, weight, style);
      const metricEvidence = measureCanvasMetricEvidence(name);
      const googleMatch = findGoogleFontMatch(name);

      let confidence = 'Unverified Candidate';
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
        evidenceNotes.push(`Cataloged in Google Fonts library.`);
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
          fontsCheckPassed,
          metricEvidence,
          confidenceScore: Math.min(100, confidenceScore),
          confidence,
          notes: evidenceNotes
        }
      });
    }

    const topCandidate = candidates.find(c => c.evidence.confidence === 'High Evidence') ||
                         candidates.find(c => c.evidence.confidence === 'Moderate Evidence') ||
                         candidates[0] || null;

    return {
      declaredStack: fontStack,
      candidates,
      topCandidate: topCandidate ? topCandidate.name : 'Unknown',
      topCandidateConfidence: topCandidate ? topCandidate.evidence.confidence : 'Unverified'
    };
  }

  /* ========================================================================== */
  /* 4. PRESETS & EXPORT UTILITIES                                              */
  /* ========================================================================== */

  const BUILTIN_PRESETS = [
    {
      id: 'preset_editorial_serif',
      name: 'Editorial Serif',
      properties: {
        fontFamily: 'Merriweather, Georgia, serif',
        fontSize: '18px',
        fontWeight: '400',
        lineHeight: '1.75',
        letterSpacing: '0px'
      }
    },
    {
      id: 'preset_modern_tech_sans',
      name: 'Modern Tech Sans',
      properties: {
        fontFamily: '"Inter", -apple-system, sans-serif',
        fontSize: '16px',
        fontWeight: '500',
        lineHeight: '1.5',
        letterSpacing: '-0.2px'
      }
    },
    {
      id: 'preset_dense_data_mono',
      name: 'Dense Data Mono',
      properties: {
        fontFamily: '"Fira Code", monospace',
        fontSize: '14px',
        fontWeight: '400',
        lineHeight: '1.6',
        letterSpacing: '0px'
      }
    },
    {
      id: 'preset_bold_display_headline',
      name: 'Bold Display Headline',
      properties: {
        fontFamily: '"Montserrat", sans-serif',
        fontSize: '36px',
        fontWeight: '800',
        lineHeight: '1.15',
        letterSpacing: '-0.8px'
      }
    }
  ];

  function buildCssRule(selector = '.typography-preview', typo = {}) {
    if (!typo) return '';
    const cleanSel = selector && typeof selector === 'string' ? selector.trim() : '.typography-preview';
    const lines = [];
    if (typo.fontFamily) lines.push(`  font-family: ${typo.fontFamily};`);
    if (typo.fontSize) lines.push(`  font-size: ${typo.fontSize};`);
    if (typo.fontWeight) lines.push(`  font-weight: ${typo.fontWeight};`);
    if (typo.lineHeight) {
      const val = typeof typo.lineHeight === 'object' ? typo.lineHeight.raw : typo.lineHeight;
      if (val && val !== 'normal') lines.push(`  line-height: ${val};`);
    }
    if (typo.letterSpacing && typo.letterSpacing !== 'normal' && typo.letterSpacing !== '0px') {
      lines.push(`  letter-spacing: ${typo.letterSpacing};`);
    }
    if (typo.color) lines.push(`  color: ${typo.color};`);
    if (typo.textAlign && typo.textAlign !== 'start' && typo.textAlign !== 'left') {
      lines.push(`  text-align: ${typo.textAlign};`);
    }
    return `${cleanSel} {\n${lines.join('\n')}\n}`;
  }

  function buildFontFamilyDeclaration(fontFamily = '') {
    return `font-family: ${fontFamily || 'sans-serif'};`;
  }

  /* ========================================================================== */
  /* 5. LIVE STYLE MANAGER                                                      */
  /* ========================================================================== */

  class StyleManager {
    constructor() {
      this.trackedElements = new Map();
      this.managedProperties = [
        'fontFamily', 'fontSize', 'fontWeight', 'fontStyle',
        'lineHeight', 'letterSpacing', 'wordSpacing', 'color',
        'textAlign', 'textDecoration', 'textTransform'
      ];
    }

    track(el) {
      if (!el || !(el instanceof HTMLElement)) return;
      if (this.trackedElements.has(el)) return;

      const originalStyles = {};
      for (const prop of this.managedProperties) {
        originalStyles[prop] = el.style[prop] || '';
      }
      this.trackedElements.set(el, { originalStyles, modified: false });
    }

    applyProperty(el, property, value) {
      if (!el || !(el instanceof HTMLElement)) return;
      this.track(el);
      const record = this.trackedElements.get(el);
      if (!record) return;
      el.style[property] = value;
      record.modified = true;
    }

    applyPreset(el, presetProperties = {}) {
      if (!el || !(el instanceof HTMLElement)) return;
      this.track(el);
      for (const [prop, val] of Object.entries(presetProperties)) {
        if (this.managedProperties.includes(prop) && val) {
          el.style[prop] = val;
        }
      }
      const record = this.trackedElements.get(el);
      if (record) record.modified = true;
    }

    resetElement(el) {
      if (!el || !this.trackedElements.has(el)) return;
      const { originalStyles } = this.trackedElements.get(el);
      for (const prop of this.managedProperties) {
        el.style[prop] = originalStyles[prop] || '';
      }
      this.trackedElements.delete(el);
    }

    resetAll() {
      for (const [el, { originalStyles }] of this.trackedElements.entries()) {
        if (el instanceof HTMLElement && document.contains(el)) {
          for (const prop of this.managedProperties) {
            el.style[prop] = originalStyles[prop] || '';
          }
        }
      }
      this.trackedElements.clear();
    }
  }

  /* ========================================================================== */
  /* 6. INSPECTOR FLOATING PANEL (SHADOW DOM)                                   */
  /* ========================================================================== */

  class InspectorPanel {
    constructor({ styleManager, onClose, onTogglePin }) {
      this.styleManager = styleManager;
      this.onClose = onClose;
      this.onTogglePin = onTogglePin;

      this.hostEl = null;
      this.shadowRoot = null;
      this.panelEl = null;
      this.outlineEl = null;
      this.badgeEl = null;
      this.pinnedOutlineEl = null;

      this.currentData = null;
      this.currentElement = null;
      this.activeTab = 'inspect';
      this.isPinned = false;
      this.isMinimized = false;

      this.isDragging = false;
      this.dragOffsetX = 0;
      this.dragOffsetY = 0;

      this.init();
    }

    $(id) {
      return this.shadowRoot ? this.shadowRoot.querySelector(`#${id}`) : null;
    }

    init() {
      // Clean up any pre-existing host to prevent attachShadow duplication errors
      const oldHost = document.getElementById('fontlens-inspector-host');
      if (oldHost) {
        oldHost.remove();
      }

      const host = document.createElement('div');
      host.id = 'fontlens-inspector-host';
      host.style.position = 'absolute';
      host.style.top = '0';
      host.style.left = '0';
      host.style.width = '0';
      host.style.height = '0';
      host.style.zIndex = '2147483647';
      host.style.border = 'none';
      host.style.padding = '0';
      host.style.margin = '0';
      (document.body || document.documentElement).appendChild(host);

      this.hostEl = host;
      this.shadowRoot = host.attachShadow({ mode: 'open' });

      // Load stylesheet via link (immune to CSP fetch restrictions)
      const linkEl = document.createElement('link');
      linkEl.rel = 'stylesheet';
      linkEl.href = chrome.runtime.getURL('inspector/inspector.css');
      this.shadowRoot.appendChild(linkEl);

      // Overlays
      this.outlineEl = document.createElement('div');
      this.outlineEl.className = 'fontlens-inspect-outline';
      this.badgeEl = document.createElement('div');
      this.badgeEl.className = 'fontlens-inspect-badge';
      this.outlineEl.appendChild(this.badgeEl);
      this.shadowRoot.appendChild(this.outlineEl);

      this.pinnedOutlineEl = document.createElement('div');
      this.pinnedOutlineEl.className = 'fontlens-pinned-outline';
      this.shadowRoot.appendChild(this.pinnedOutlineEl);

      // Panel
      this.panelEl = document.createElement('div');
      this.panelEl.className = 'fontlens-panel';
      this.panelEl.innerHTML = this.renderPanelHtml();
      this.shadowRoot.appendChild(this.panelEl);

      this.bindEvents();
    }

    renderPanelHtml() {
      return `
        <!-- Header -->
        <div class="fontlens-header" id="panelHeader">
          <div class="fontlens-brand">
            <svg class="fontlens-logo" viewBox="0 0 128 128" width="20" height="20">
              <rect width="128" height="128" rx="28" fill="#1E1B4B"/>
              <path d="M 32 32 L 72 32 L 72 44 L 46 44 L 46 58 L 68 58 L 68 70 L 46 70 L 46 96 L 32 96 Z" fill="#F3F4F6"/>
              <circle cx="78" cy="74" r="26" fill="rgba(139, 92, 246, 0.25)" stroke="#8B5CF6" stroke-width="6"/>
              <line x1="97" y1="93" x2="114" y2="110" stroke="#06B6D4" stroke-width="7" stroke-linecap="round"/>
            </svg>
            <div>
              <div class="fontlens-title">FontLens</div>
            </div>
          </div>
          <div class="fontlens-header-actions">
            <button id="btnPin" class="fontlens-icon-btn" title="Pin / Unpin Inspector">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2v8m0 0l4-4m-4 4L8 6m4 12v4M4 14h16"/>
              </svg>
            </button>
            <button id="btnMinimize" class="fontlens-icon-btn" title="Minimize / Restore">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </button>
            <button id="btnClose" class="fontlens-icon-btn" title="Exit Inspection Mode [Esc]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Tabs Navigation -->
        <div class="fontlens-tabs">
          <button class="fontlens-tab-btn active" data-tab="inspect">Inspect</button>
          <button class="fontlens-tab-btn" data-tab="editor">Live Editor</button>
          <button class="fontlens-tab-btn" data-tab="evidence">Evidence</button>
          <button class="fontlens-tab-btn" data-tab="presets">Presets</button>
        </div>

        <!-- Main Body -->
        <div class="fontlens-body">
          <div class="fontlens-element-banner">
            <span id="bannerSelector" class="fontlens-selector-badge">&lt;select text element&gt;</span>
            <span id="bannerSample" class="fontlens-sample-preview">Hover or click any text</span>
          </div>

          <!-- 1. Inspect Tab -->
          <div id="tabInspect" class="fontlens-panel-section">
            <div class="fontlens-prop-grid">
              <div class="fontlens-prop-card span-2">
                <span class="fontlens-prop-label">Primary Font</span>
                <span id="propPrimaryFont" class="fontlens-prop-value">—</span>
              </div>
              <div class="fontlens-prop-card span-2">
                <span class="fontlens-prop-label">Declared Stack</span>
                <span id="propFontStack" class="fontlens-prop-value" style="font-size:11px; color:#94A3B8;">—</span>
              </div>
              <div class="fontlens-prop-card">
                <span class="fontlens-prop-label">Font Size</span>
                <span id="propFontSize" class="fontlens-prop-value">—</span>
              </div>
              <div class="fontlens-prop-card">
                <span class="fontlens-prop-label">Font Weight</span>
                <span id="propFontWeight" class="fontlens-prop-value">—</span>
              </div>
              <div class="fontlens-prop-card">
                <span class="fontlens-prop-label">Line Height</span>
                <span id="propLineHeight" class="fontlens-prop-value">—</span>
              </div>
              <div class="fontlens-prop-card">
                <span class="fontlens-prop-label">Letter Spacing</span>
                <span id="propLetterSpacing" class="fontlens-prop-value">—</span>
              </div>
              <div class="fontlens-prop-card">
                <span class="fontlens-prop-label">Text Color</span>
                <div class="fontlens-color-row">
                  <span id="colorSwatch" class="fontlens-color-swatch"></span>
                  <span id="propColorHex" class="fontlens-prop-value">—</span>
                </div>
              </div>
              <div class="fontlens-prop-card">
                <span class="fontlens-prop-label">WCAG Contrast</span>
                <div class="fontlens-color-row">
                  <span id="propContrastRatio" class="fontlens-prop-value">—</span>
                  <span id="contrastBadge" class="fontlens-badge-pill pass">AA ✓</span>
                </div>
              </div>
              <div class="fontlens-prop-card">
                <span class="fontlens-prop-label">Text Align</span>
                <span id="propTextAlign" class="fontlens-prop-value">—</span>
              </div>
              <div class="fontlens-prop-card">
                <span class="fontlens-prop-label">Text Transform</span>
                <span id="propTextTransform" class="fontlens-prop-value">—</span>
              </div>
            </div>
          </div>

          <!-- 2. Live Editor Tab -->
          <div id="tabEditor" class="fontlens-panel-section" hidden>
            <div class="fontlens-editor-row">
              <label class="fontlens-editor-label-row"><span>Font Family</span></label>
              <input type="text" id="editFontFamily" class="fontlens-input" placeholder="e.g. Inter, Roboto, serif">
            </div>

            <div class="fontlens-editor-row">
              <div class="fontlens-editor-label-row">
                <span>Font Size</span>
                <span id="valFontSize" class="fontlens-slider-val">16px</span>
              </div>
              <div class="fontlens-slider-row">
                <input type="range" id="sliderFontSize" class="fontlens-range" min="8" max="96" value="16">
              </div>
            </div>

            <div class="fontlens-editor-row">
              <div class="fontlens-editor-label-row">
                <span>Font Weight</span>
                <span id="valFontWeight" class="fontlens-slider-val">400</span>
              </div>
              <div class="fontlens-slider-row">
                <input type="range" id="sliderFontWeight" class="fontlens-range" min="100" max="900" step="100" value="400">
              </div>
            </div>

            <div class="fontlens-editor-row">
              <div class="fontlens-editor-label-row">
                <span>Line Height</span>
                <span id="valLineHeight" class="fontlens-slider-val">1.50×</span>
              </div>
              <div class="fontlens-slider-row">
                <input type="range" id="sliderLineHeight" class="fontlens-range" min="0.8" max="2.6" step="0.05" value="1.5">
              </div>
            </div>

            <div class="fontlens-editor-row">
              <div class="fontlens-editor-label-row">
                <span>Letter Spacing</span>
                <span id="valLetterSpacing" class="fontlens-slider-val">0px</span>
              </div>
              <div class="fontlens-slider-row">
                <input type="range" id="sliderLetterSpacing" class="fontlens-range" min="-3" max="10" step="0.2" value="0">
              </div>
            </div>

            <div class="fontlens-editor-row">
              <label class="fontlens-editor-label-row"><span>Text Color</span></label>
              <div style="display:flex; gap:8px;">
                <input type="color" id="editColorPicker" style="width:36px; height:32px; border:none; background:none; cursor:pointer;" value="#ffffff">
                <input type="text" id="editColorHex" class="fontlens-input" value="#FFFFFF" style="flex:1;">
              </div>
            </div>

            <div class="fontlens-editor-row">
              <label class="fontlens-editor-label-row"><span>Alignment</span></label>
              <div class="fontlens-btn-group" id="groupAlign">
                <button class="fontlens-group-btn" data-val="left">Left</button>
                <button class="fontlens-group-btn" data-val="center">Center</button>
                <button class="fontlens-group-btn" data-val="right">Right</button>
                <button class="fontlens-group-btn" data-val="justify">Justify</button>
              </div>
            </div>

            <div class="fontlens-editor-row">
              <label class="fontlens-editor-label-row"><span>Transform</span></label>
              <div class="fontlens-btn-group" id="groupTransform">
                <button class="fontlens-group-btn" data-val="none">None</button>
                <button class="fontlens-group-btn" data-val="uppercase">UPPER</button>
                <button class="fontlens-group-btn" data-val="lowercase">lower</button>
                <button class="fontlens-group-btn" data-val="capitalize">Title</button>
              </div>
            </div>
          </div>

          <!-- 3. Evidence Tab -->
          <div id="tabEvidence" class="fontlens-panel-section" hidden>
            <div style="font-size:11px; color:#94A3B8; margin-bottom:4px;">
              Browser APIs cannot establish exact rendered glyphs with 100% certainty. Below is verified evidence gathered from FontFace sets, Font Loading API checks, and glyph bounding box metrics:
            </div>
            <div id="evidenceList" style="display:flex; flex-direction:column; gap:8px;"></div>
          </div>

          <!-- 4. Presets Tab -->
          <div id="tabPresets" class="fontlens-panel-section" hidden>
            <div style="font-size:11px; color:#94A3B8; font-weight:600; margin-bottom:6px;">Recommended Typography Presets</div>
            <div id="presetsContainer" style="display:flex; flex-direction:column; gap:6px;"></div>
          </div>
        </div>

        <!-- Footer Actions -->
        <div class="fontlens-footer">
          <button id="btnCopyCss" class="fontlens-btn-primary" title="Copy clean CSS rule to clipboard">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            <span id="copyCssText">Copy CSS</span>
          </button>
          <button id="btnCopyFontFamily" class="fontlens-btn-secondary" title="Copy font-family statement">Font</button>
          <button id="btnResetStyles" class="fontlens-btn-secondary danger" title="Reset live changes on selected element">Reset</button>
        </div>
      `;
    }

    bindEvents() {
      const root = this.shadowRoot;

      const tabs = root.querySelectorAll('.fontlens-tab-btn');
      tabs.forEach(tab => {
        tab.addEventListener('click', () => {
          tabs.forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
          this.activeTab = tab.dataset.tab;

          const tInspect = this.$('tabInspect');
          const tEditor = this.$('tabEditor');
          const tEvidence = this.$('tabEvidence');
          const tPresets = this.$('tabPresets');

          if (tInspect) tInspect.hidden = this.activeTab !== 'inspect';
          if (tEditor) tEditor.hidden = this.activeTab !== 'editor';
          if (tEvidence) tEvidence.hidden = this.activeTab !== 'evidence';
          if (tPresets) tPresets.hidden = this.activeTab !== 'presets';

          if (this.activeTab === 'presets') {
            this.renderPresetsList();
          }
        });
      });

      this.$('btnClose')?.addEventListener('click', () => {
        if (this.onClose) this.onClose();
      });

      this.$('btnMinimize')?.addEventListener('click', () => {
        this.isMinimized = !this.isMinimized;
        this.panelEl.classList.toggle('minimized', this.isMinimized);
      });

      this.$('btnPin')?.addEventListener('click', () => {
        this.isPinned = !this.isPinned;
        this.$('btnPin')?.classList.toggle('active', this.isPinned);
        if (this.onTogglePin) this.onTogglePin(this.isPinned);
      });

      // Dragging
      const header = this.$('panelHeader');
      if (header) {
        header.addEventListener('mousedown', (e) => {
          if (e.target.closest('.fontlens-icon-btn')) return;
          this.isDragging = true;
          const rect = this.panelEl.getBoundingClientRect();
          this.dragOffsetX = e.clientX - rect.left;
          this.dragOffsetY = e.clientY - rect.top;
          e.preventDefault();
        });
      }

      window.addEventListener('mousemove', (e) => {
        if (!this.isDragging) return;
        const left = Math.max(10, Math.min(window.innerWidth - this.panelEl.offsetWidth - 10, e.clientX - this.dragOffsetX));
        const top = Math.max(10, Math.min(window.innerHeight - this.panelEl.offsetHeight - 10, e.clientY - this.dragOffsetY));
        this.panelEl.style.left = `${left}px`;
        this.panelEl.style.top = `${top}px`;
        this.panelEl.style.right = 'auto';
      });

      window.addEventListener('mouseup', () => {
        this.isDragging = false;
      });

      this.$('btnCopyCss')?.addEventListener('click', () => {
        if (!this.currentData) return;
        const sel = this.currentData.element.selector || '.element';
        const css = buildCssRule(sel, this.currentData.typography);
        navigator.clipboard.writeText(css);
        const span = this.$('copyCssText');
        if (span) {
          span.textContent = 'Copied! ✓';
          setTimeout(() => { span.textContent = 'Copy CSS'; }, 1500);
        }
      });

      this.$('btnCopyFontFamily')?.addEventListener('click', () => {
        if (!this.currentData) return;
        const decl = buildFontFamilyDeclaration(this.currentData.typography.fontFamily);
        navigator.clipboard.writeText(decl);
        const btn = this.$('btnCopyFontFamily');
        if (btn) {
          btn.textContent = 'Copied!';
          setTimeout(() => { btn.textContent = 'Font'; }, 1500);
        }
      });

      this.$('btnResetStyles')?.addEventListener('click', () => {
        if (this.currentElement) {
          this.styleManager.resetElement(this.currentElement);
          if (this.onRefreshElement) this.onRefreshElement(this.currentElement);
        }
      });

      this.bindEditorInputs();
    }

    bindEditorInputs() {
      const root = this.shadowRoot;

      this.$('editFontFamily')?.addEventListener('input', (e) => {
        if (this.currentElement) {
          this.styleManager.applyProperty(this.currentElement, 'fontFamily', e.target.value);
          this.updateInspectionValues();
        }
      });

      const sliderSize = this.$('sliderFontSize');
      const valSize = this.$('valFontSize');
      sliderSize?.addEventListener('input', (e) => {
        if (valSize) valSize.textContent = `${e.target.value}px`;
        if (this.currentElement) {
          this.styleManager.applyProperty(this.currentElement, 'fontSize', `${e.target.value}px`);
          this.updateInspectionValues();
        }
      });

      const sliderWeight = this.$('sliderFontWeight');
      const valWeight = this.$('valFontWeight');
      sliderWeight?.addEventListener('input', (e) => {
        if (valWeight) valWeight.textContent = e.target.value;
        if (this.currentElement) {
          this.styleManager.applyProperty(this.currentElement, 'fontWeight', e.target.value);
          this.updateInspectionValues();
        }
      });

      const sliderLH = this.$('sliderLineHeight');
      const valLH = this.$('valLineHeight');
      sliderLH?.addEventListener('input', (e) => {
        if (valLH) valLH.textContent = `${parseFloat(e.target.value).toFixed(2)}×`;
        if (this.currentElement) {
          this.styleManager.applyProperty(this.currentElement, 'lineHeight', e.target.value);
          this.updateInspectionValues();
        }
      });

      const sliderLS = this.$('sliderLetterSpacing');
      const valLS = this.$('valLetterSpacing');
      sliderLS?.addEventListener('input', (e) => {
        if (valLS) valLS.textContent = `${e.target.value}px`;
        if (this.currentElement) {
          this.styleManager.applyProperty(this.currentElement, 'letterSpacing', `${e.target.value}px`);
          this.updateInspectionValues();
        }
      });

      const colorPicker = this.$('editColorPicker');
      const colorHex = this.$('editColorHex');
      colorPicker?.addEventListener('input', (e) => {
        if (colorHex) colorHex.value = e.target.value.toUpperCase();
        if (this.currentElement) {
          this.styleManager.applyProperty(this.currentElement, 'color', e.target.value);
          this.updateInspectionValues();
        }
      });

      colorHex?.addEventListener('input', (e) => {
        if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) {
          if (colorPicker) colorPicker.value = e.target.value;
          if (this.currentElement) {
            this.styleManager.applyProperty(this.currentElement, 'color', e.target.value);
            this.updateInspectionValues();
          }
        }
      });

      root.querySelectorAll('#groupAlign .fontlens-group-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          root.querySelectorAll('#groupAlign .fontlens-group-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          if (this.currentElement) {
            this.styleManager.applyProperty(this.currentElement, 'textAlign', btn.dataset.val);
            this.updateInspectionValues();
          }
        });
      });

      root.querySelectorAll('#groupTransform .fontlens-group-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          root.querySelectorAll('#groupTransform .fontlens-group-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          if (this.currentElement) {
            this.styleManager.applyProperty(this.currentElement, 'textTransform', btn.dataset.val);
            this.updateInspectionValues();
          }
        });
      });
    }

    update(element, typoData, evidenceData) {
      this.currentElement = element;
      this.currentData = typoData;
      this.currentEvidence = evidenceData;

      const { element: elMeta, typography: typo } = typoData;

      const bannerSel = this.$('bannerSelector');
      if (bannerSel) bannerSel.textContent = elMeta.selector || elMeta.tagName;
      const bannerSample = this.$('bannerSample');
      if (bannerSample) bannerSample.textContent = `"${elMeta.textSnippet || ''}"`;

      const pFamily = this.$('propPrimaryFont');
      if (pFamily) pFamily.textContent = typo.primaryFamily || '—';
      const pStack = this.$('propFontStack');
      if (pStack) pStack.textContent = typo.fontStack.join(', ') || '—';
      const pSize = this.$('propFontSize');
      if (pSize) pSize.textContent = `${typo.fontSize} (${typo.fontSizeRem})`;
      const pWeight = this.$('propFontWeight');
      if (pWeight) pWeight.textContent = typo.fontWeightFormatted;
      const pLH = this.$('propLineHeight');
      if (pLH) pLH.textContent = `${typo.lineHeight.raw} (${typo.lineHeight.formattedRatio})`;
      const pLS = this.$('propLetterSpacing');
      if (pLS) pLS.textContent = typo.letterSpacing;
      const pColorHex = this.$('propColorHex');
      if (pColorHex) pColorHex.textContent = typo.colorHex;
      const swatch = this.$('colorSwatch');
      if (swatch) swatch.style.backgroundColor = typo.color;

      const contrast = typo.contrast;
      const pContrast = this.$('propContrastRatio');
      if (pContrast) pContrast.textContent = contrast.formatted;
      const contrastBadge = this.$('contrastBadge');
      if (contrastBadge) {
        if (contrast.scoreAA) {
          contrastBadge.className = 'fontlens-badge-pill pass';
          contrastBadge.textContent = contrast.scoreAAA ? 'AAA ✓' : 'AA ✓';
        } else {
          contrastBadge.className = 'fontlens-badge-pill fail';
          contrastBadge.textContent = 'Low Contrast';
        }
      }

      const pAlign = this.$('propTextAlign');
      if (pAlign) pAlign.textContent = typo.textAlign;
      const pTransform = this.$('propTextTransform');
      if (pTransform) pTransform.textContent = typo.textTransform;

      const editFam = this.$('editFontFamily');
      if (editFam) editFam.value = typo.fontFamily;
      const sSize = this.$('sliderFontSize');
      if (sSize) sSize.value = Math.round(typo.fontSizePx);
      const vSize = this.$('valFontSize');
      if (vSize) vSize.textContent = `${Math.round(typo.fontSizePx)}px`;

      const sWeight = this.$('sliderFontWeight');
      if (sWeight) sWeight.value = parseInt(typo.fontWeight, 10) || 400;
      const vWeight = this.$('valFontWeight');
      if (vWeight) vWeight.textContent = typo.fontWeight;

      const sLH = this.$('sliderLineHeight');
      if (sLH) sLH.value = typo.lineHeight.ratio;
      const vLH = this.$('valLineHeight');
      if (vLH) vLH.textContent = typo.lineHeight.formattedRatio;

      const parsedLS = parseFloat(typo.letterSpacing) || 0;
      const sLS = this.$('sliderLetterSpacing');
      if (sLS) sLS.value = parsedLS;
      const vLS = this.$('valLetterSpacing');
      if (vLS) vLS.textContent = `${parsedLS}px`;

      const cPicker = this.$('editColorPicker');
      if (cPicker) cPicker.value = typo.colorHex.slice(0, 7);
      const cHex = this.$('editColorHex');
      if (cHex) cHex.value = typo.colorHex;

      const root = this.shadowRoot;
      root.querySelectorAll('#groupAlign .fontlens-group-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.val === typo.textAlign);
      });
      root.querySelectorAll('#groupTransform .fontlens-group-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.val === typo.textTransform);
      });

      this.renderEvidenceList(evidenceData);
      this.updateHighlight(element, typo.primaryFamily, typo.fontSize);
    }

    renderEvidenceList(evidenceData) {
      const container = this.$('evidenceList');
      if (!container) return;
      container.innerHTML = '';

      if (!evidenceData || !evidenceData.candidates || evidenceData.candidates.length === 0) {
        container.innerHTML = '<div style="color:#64748B; font-size:12px;">No declared font candidates found.</div>';
        return;
      }

      for (const cand of evidenceData.candidates) {
        const card = document.createElement('div');
        card.className = 'fontlens-evidence-card';

        let pillClass = 'unverified';
        if (cand.evidence.confidence === 'High Evidence') pillClass = 'high';
        else if (cand.evidence.confidence === 'Moderate Evidence') pillClass = 'moderate';
        else if (cand.evidence.confidence === 'Fallback Candidate') pillClass = 'fallback';

        let googleHtml = '';
        if (cand.googleMatch) {
          googleHtml = `
            <a href="${cand.googleMatch.specimenUrl}" target="_blank" rel="noopener noreferrer" class="fontlens-google-link">
              <span>Official Google Font Specimen</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                <polyline points="15 3 21 3 21 9"></polyline>
                <line x1="10" y1="14" x2="21" y2="3"></line>
              </svg>
            </a>
          `;
        }

        card.innerHTML = `
          <div class="fontlens-candidate-name">
            <span>${cand.isPrimaryDeclared ? '★ ' : ''}${cand.name}</span>
            <span class="fontlens-evidence-pill ${pillClass}">${cand.evidence.confidence}</span>
          </div>
          <div class="fontlens-evidence-notes">
            ${cand.evidence.notes.map(n => `<div>• ${n}</div>`).join('')}
          </div>
          ${googleHtml}
        `;

        container.appendChild(card);
      }
    }

    renderPresetsList() {
      const container = this.$('presetsContainer');
      if (!container) return;
      container.innerHTML = '';

      for (const preset of BUILTIN_PRESETS) {
        const item = document.createElement('div');
        item.className = 'fontlens-preset-item';
        item.innerHTML = `
          <div class="fontlens-preset-info">
            <span class="fontlens-preset-name">${preset.name}</span>
            <span class="fontlens-preset-desc">${preset.properties.fontFamily.split(',')[0]} • ${preset.properties.fontSize} • ${preset.properties.fontWeight}</span>
          </div>
          <button class="fontlens-btn-sm btn-apply-preset">Apply</button>
        `;

        item.querySelector('.btn-apply-preset').addEventListener('click', () => {
          if (this.currentElement) {
            this.styleManager.applyPreset(this.currentElement, preset.properties);
            this.updateInspectionValues();
          }
        });

        container.appendChild(item);
      }
    }

    updateHighlight(el, fontName = '', fontSize = '') {
      if (!el || el.nodeType !== (typeof Node !== 'undefined' ? Node.ELEMENT_NODE : 1)) {
        if (this.outlineEl) this.outlineEl.style.display = 'none';
        return;
      }

      const rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) {
        if (this.outlineEl) this.outlineEl.style.display = 'none';
        return;
      }

      if (this.outlineEl) {
        this.outlineEl.style.top = `${rect.top}px`;
        this.outlineEl.style.left = `${rect.left}px`;
        this.outlineEl.style.width = `${rect.width}px`;
        this.outlineEl.style.height = `${rect.height}px`;
        this.outlineEl.style.display = 'block';
      }

      if (this.badgeEl) {
        this.badgeEl.textContent = `${fontName} • ${fontSize}`;
      }

      if (this.pinnedOutlineEl) {
        if (this.isPinned) {
          this.pinnedOutlineEl.style.top = `${rect.top}px`;
          this.pinnedOutlineEl.style.left = `${rect.left}px`;
          this.pinnedOutlineEl.style.width = `${rect.width}px`;
          this.pinnedOutlineEl.style.height = `${rect.height}px`;
          this.pinnedOutlineEl.style.display = 'block';
        } else {
          this.pinnedOutlineEl.style.display = 'none';
        }
      }
    }

    updateInspectionValues() {
      if (!this.currentElement) return;
      if (this.onRefreshElement) {
        this.onRefreshElement(this.currentElement);
      }
    }

    destroy() {
      if (this.hostEl) {
        this.hostEl.remove();
        this.hostEl = null;
      }
    }
  }

  /* ========================================================================== */
  /* 7. INSPECTOR CONTROLLER & DOM INTERCEPTOR                                  */
  /* ========================================================================== */

  class FontLensInspector {
    constructor() {
      this.isActive = false;
      this.isPinned = false;
      this.hoveredElement = null;
      this.selectedElement = null;

      this.styleManager = new StyleManager();
      this.panel = null;

      this.boundOnPointerMove = this.onPointerMove.bind(this);
      this.boundOnClick = this.onClick.bind(this);
      this.boundOnKeyDown = this.onKeyDown.bind(this);
      this.boundOnScroll = this.onScroll.bind(this);

      this.initMessaging();
    }

    initMessaging() {
      if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
          if (!message || !message.action) return false;

          switch (message.action) {
            case 'TOGGLE_INSPECTION':
              this.toggle();
              sendResponse({ active: this.isActive });
              return true;

            case 'START_INSPECTION':
              this.activate();
              sendResponse({ active: true });
              return true;

            case 'STOP_INSPECTION':
              this.deactivate();
              sendResponse({ active: false });
              return true;

            case 'GET_INSPECTOR_STATUS':
              sendResponse({
                active: this.isActive,
                pinned: this.isPinned,
                hasSelected: Boolean(this.selectedElement)
              });
              return true;
          }
        });
      }
    }

    toggle() {
      if (this.isActive) {
        this.deactivate();
      } else {
        this.activate();
      }
    }

    activate() {
      if (this.isActive) return;
      this.isActive = true;

      this.panel = new InspectorPanel({
        styleManager: this.styleManager,
        onClose: () => this.deactivate(),
        onTogglePin: (pinned) => {
          this.isPinned = pinned;
        }
      });

      this.panel.onRefreshElement = (el) => {
        this.inspectElement(el);
      };

      document.addEventListener('mousemove', this.boundOnPointerMove, true);
      document.addEventListener('click', this.boundOnClick, true);
      document.addEventListener('keydown', this.boundOnKeyDown, true);
      window.addEventListener('scroll', this.boundOnScroll, { passive: true });

      this.broadcastState(true);
    }

    deactivate() {
      if (!this.isActive) return;
      this.isActive = false;
      this.isPinned = false;

      this.styleManager.resetAll();

      document.removeEventListener('mousemove', this.boundOnPointerMove, true);
      document.removeEventListener('click', this.boundOnClick, true);
      document.removeEventListener('keydown', this.boundOnKeyDown, true);
      window.removeEventListener('scroll', this.boundOnScroll);

      if (this.panel) {
        this.panel.destroy();
        this.panel = null;
      }

      this.hoveredElement = null;
      this.selectedElement = null;

      this.broadcastState(false);
    }

    onPointerMove(e) {
      if (!this.isActive || this.isPinned) return;
      const target = this.getInspectableTarget(e.target);
      if (!target || target === this.hoveredElement) return;

      this.hoveredElement = target;
      this.inspectElement(target);
    }

    onClick(e) {
      if (!this.isActive) return;

      if (e.target.closest('#fontlens-inspector-host')) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      const target = this.getInspectableTarget(e.target);
      if (!target) return;

      this.selectedElement = target;
      this.isPinned = true;
      if (this.panel) {
        this.panel.isPinned = true;
        const btnPin = this.panel.$('btnPin');
        if (btnPin) btnPin.classList.add('active');
      }

      this.inspectElement(target);
      this.recordRecentFont(target);
    }

    onKeyDown(e) {
      if (!this.isActive) return;

      if (e.key === 'Escape') {
        if (this.isPinned) {
          this.isPinned = false;
          if (this.panel) {
            this.panel.isPinned = false;
            const btnPin = this.panel.$('btnPin');
            if (btnPin) btnPin.classList.remove('active');
            if (this.panel.pinnedOutlineEl) {
              this.panel.pinnedOutlineEl.style.display = 'none';
            }
          }
        } else {
          this.deactivate();
        }
      }
    }

    onScroll() {
      if (this.panel && (this.selectedElement || this.hoveredElement)) {
        const el = this.selectedElement || this.hoveredElement;
        const typo = extractTypography(el);
        if (typo) {
          this.panel.updateHighlight(el, typo.typography.primaryFamily, typo.typography.fontSize);
        }
      }
    }

    inspectElement(el) {
      if (!el || !this.panel) return;
      const typoData = extractTypography(el);
      if (!typoData) return;

      const evidenceData = analyzeFontEvidence(
        typoData.typography.fontStack,
        typoData.typography.fontWeight,
        typoData.typography.fontStyle
      );

      this.panel.update(el, typoData, evidenceData);
    }

    recordRecentFont(el) {
      if (!el) return;
      const typoData = extractTypography(el);
      if (!typoData || !typoData.typography || !typoData.typography.primaryFamily) return;

      const fontName = typoData.typography.primaryFamily;
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        chrome.storage.local.get(['fontlens_recent'], (result) => {
          const list = Array.isArray(result?.fontlens_recent) ? result.fontlens_recent : [];
          const filtered = list.filter(item => item && typeof item.fontName === 'string' && item.fontName.toLowerCase() !== fontName.toLowerCase());
          filtered.unshift({
            fontName,
            timestamp: Date.now(),
            url: window.location.href
          });
          if (filtered.length > 25) filtered.length = 25;
          chrome.storage.local.set({ fontlens_recent: filtered }, () => {
            // Ignore any lastError
            if (chrome.runtime?.lastError) {}
          });
        });
      }
    }

    getInspectableTarget(target) {
      if (!target || target.nodeType !== (typeof Node !== 'undefined' ? Node.ELEMENT_NODE : 1)) return null;

      try {
        if (target.id === 'fontlens-inspector-host' || (target.closest && target.closest('#fontlens-inspector-host'))) {
          return null;
        }
      } catch {
        return null;
      }

      const tag = String(target.tagName || '').toLowerCase();
      if (['html', 'body', 'script', 'style', 'noscript', 'head', 'meta', 'link'].includes(tag)) {
        return null;
      }

      return target;
    }

    broadcastState(active) {
      if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
        chrome.runtime.sendMessage({
          type: 'INSPECTION_STATE_CHANGED',
          active,
          url: window.location.href
        }).catch(() => {});
      }
    }
  }

  if (window.__FONTLENS_INSPECTOR_INSTANCE__) {
    window.__FONTLENS_INSPECTOR_INSTANCE__.activate();
  } else {
    window.__FONTLENS_INSPECTOR_INSTANCE__ = new FontLensInspector();
    window.__FONTLENS_INSPECTOR_INSTANCE__.activate();
  }
})();
