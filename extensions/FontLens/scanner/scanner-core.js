/**
 * FontLens - Page Typography Scanner
 * Non-destructive page-level crawler aggregating visible text elements into
 * unique font stacks, size/weight distributions, categories, and interactive highlights.
 */

import { parseFontFamilyStack } from '../scripts/typography-engine.js';
import { exportScanToJson, exportScanToCsv } from '../scripts/css-export.js';

/**
 * Scans visible text elements across the document and compiles typography analytics
 * @param {Document} [doc=document]
 * @param {number} [maxLimit=1500]
 * @returns {object} Scan summary and deduplicated styles
 */
export function scanPageTypography(doc = document, maxLimit = 1500) {
  const win = doc.defaultView || window;
  const candidates = doc.querySelectorAll(
    'h1, h2, h3, h4, h5, h6, p, blockquote, a, button, input[type="button"], input[type="submit"], label, li, dt, dd, th, td, code, pre, figcaption, span'
  );

  const totalCandidates = candidates.length;
  let scannedCount = 0;

  const fontFamiliesMap = new Map();
  const fontSizesMap = new Map();
  const fontWeightsMap = new Map();
  const uniqueStylesMap = new Map();

  const categories = {
    headings: [],
    body: [],
    interactive: [],
    code: [],
    other: []
  };

  for (let i = 0; i < totalCandidates && scannedCount < maxLimit; i++) {
    const el = candidates[i];

    // Exclude FontLens own inspector hosts
    if (el.id === 'fontlens-inspector-host' || el.id === 'fontlens-scanner-host' || el.closest('#fontlens-inspector-host') || el.closest('#fontlens-scanner-host')) {
      continue;
    }

    // Filter non-visible elements
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;

    // Filter elements with only child element text to prevent duplicate ancestor scans
    let hasDirectText = false;
    for (let n = 0; n < el.childNodes.length; n++) {
      if (el.childNodes[n].nodeType === Node.TEXT_NODE && el.childNodes[n].nodeValue.trim().length > 0) {
        hasDirectText = true;
        break;
      }
    }
    if (!hasDirectText && el.children.length > 0) continue;

    const textContent = el.textContent ? el.textContent.trim() : '';
    if (textContent.length === 0) continue;

    const style = win.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
      continue;
    }

    scannedCount++;

    const rawFamily = style.fontFamily || 'serif';
    const parsedStack = parseFontFamilyStack(rawFamily);
    const primaryFont = parsedStack[0] || 'serif';

    const fontSize = style.fontSize || '16px';
    const fontWeight = style.fontWeight || '400';
    const lineHeight = style.lineHeight || 'normal';
    const color = style.color || 'rgb(0, 0, 0)';
    const textAlign = style.textAlign || 'start';
    const tag = el.tagName.toLowerCase();

    // Tally Font Family
    fontFamiliesMap.set(primaryFont, (fontFamiliesMap.get(primaryFont) || 0) + 1);

    // Tally Font Size
    fontSizesMap.set(fontSize, (fontSizesMap.get(fontSize) || 0) + 1);

    // Tally Font Weight
    fontWeightsMap.set(fontWeight, (fontWeightsMap.get(fontWeight) || 0) + 1);

    // Categorize
    let category = 'other';
    if (/^h[1-6]$/.test(tag)) category = 'headings';
    else if (['p', 'blockquote', 'figcaption'].includes(tag)) category = 'body';
    else if (['a', 'button'].includes(tag) || el.getAttribute('role') === 'button') category = 'interactive';
    else if (['code', 'pre', 'kbd'].includes(tag)) category = 'code';

    // Unique style signature
    const signature = `${primaryFont}|${fontSize}|${fontWeight}|${lineHeight}|${color}|${textAlign}`;
    let styleRecord = uniqueStylesMap.get(signature);

    if (!styleRecord) {
      styleRecord = {
        signature,
        fontFamily: primaryFont,
        fontStack: rawFamily,
        fontSize,
        fontWeight,
        lineHeight,
        color,
        textAlign,
        category,
        count: 0,
        sampleTags: new Set(),
        elements: []
      };
      uniqueStylesMap.set(signature, styleRecord);
    }

    styleRecord.count++;
    styleRecord.sampleTags.add(tag);
    if (styleRecord.elements.length < 50) {
      styleRecord.elements.push(el);
    }

    categories[category].push({
      tag,
      textSnippet: textContent.slice(0, 50),
      fontSize,
      fontWeight,
      primaryFont
    });
  }

  // Format sorted unique styles
  const uniqueStyles = Array.from(uniqueStylesMap.values())
    .map(s => ({
      ...s,
      sampleTags: Array.from(s.sampleTags)
    }))
    .sort((a, b) => b.count - a.count);

  const uniqueFonts = Array.from(fontFamiliesMap.entries())
    .map(([font, count]) => ({ font, name: font, count }))
    .sort((a, b) => b.count - a.count);

  const fontSizes = Array.from(fontSizesMap.entries())
    .map(([size, count]) => ({ size, count }))
    .sort((a, b) => b.count - a.count);

  const fontWeights = Array.from(fontWeightsMap.entries())
    .map(([weight, count]) => ({ weight, count }))
    .sort((a, b) => b.count - a.count);

  return {
    url: win.location ? win.location.href : '',
    title: doc.title || 'Page Typography',
    timestamp: Date.now(),
    totalElements: scannedCount,
    uniqueFonts,
    fontSizes,
    fontWeights,
    uniqueStyles,
    categories
  };
}

/**
 * Controller class managing the in-page Typography Scanner Modal
 */
export class PageScannerModal {
  constructor() {
    this.hostEl = null;
    this.shadowRoot = null;
    this.scanData = null;
    this.activeFilter = 'all';
    this.activeHighlights = [];
  }

  async open() {
    this.scanData = scanPageTypography(document, 1500);

    let host = document.getElementById('fontlens-scanner-host');
    if (!host) {
      host = document.createElement('div');
      host.id = 'fontlens-scanner-host';
      document.body.appendChild(host);
    }
    this.hostEl = host;
    this.shadowRoot = host.attachShadow ? host.attachShadow({ mode: 'open' }) : host;

    // Load stylesheet
    const styleEl = document.createElement('style');
    try {
      const cssUrl = chrome.runtime.getURL('scanner/scanner.css');
      const resp = await fetch(cssUrl);
      styleEl.textContent = await resp.text();
    } catch {}
    this.shadowRoot.appendChild(styleEl);

    // Modal Wrapper
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
      <div class="fontlens-scanner-backdrop" id="scannerBackdrop"></div>
      <div class="fontlens-scanner-modal" role="dialog" aria-modal="true">
        <!-- Header -->
        <div class="fontlens-scanner-header">
          <div class="fontlens-scanner-title-group">
            <svg width="22" height="22" viewBox="0 0 128 128">
              <rect width="128" height="128" rx="28" fill="#1E1B4B"/>
              <path d="M 32 32 L 72 32 L 72 44 L 46 44 L 46 58 L 68 58 L 68 70 L 46 70 L 46 96 L 32 96 Z" fill="#F3F4F6"/>
              <circle cx="78" cy="74" r="26" fill="rgba(139, 92, 246, 0.25)" stroke="#8B5CF6" stroke-width="6"/>
              <line x1="97" y1="93" x2="114" y2="110" stroke="#06B6D4" stroke-width="7" stroke-linecap="round"/>
            </svg>
            <div>
              <div class="fontlens-scanner-title">Page Typography Scanner</div>
              <div class="fontlens-scanner-meta">${this.scanData.url}</div>
            </div>
          </div>
          <button id="btnCloseScanner" style="background:transparent; border:none; color:#94A3B8; cursor:pointer; padding:6px; font-size:18px;">✕</button>
        </div>

        <!-- Metrics Row -->
        <div class="fontlens-scanner-metrics">
          <div class="fontlens-metric-card">
            <span class="fontlens-metric-label">Elements Scanned</span>
            <span class="fontlens-metric-val">${this.scanData.totalElements}</span>
          </div>
          <div class="fontlens-metric-card">
            <span class="fontlens-metric-label">Unique Typefaces</span>
            <span class="fontlens-metric-val">${this.scanData.uniqueFonts.length}</span>
          </div>
          <div class="fontlens-metric-card">
            <span class="fontlens-metric-label">Unique Styles</span>
            <span class="fontlens-metric-val">${this.scanData.uniqueStyles.length}</span>
          </div>
          <div class="fontlens-metric-card">
            <span class="fontlens-metric-label">Primary Font</span>
            <span class="fontlens-metric-val" style="font-size:14px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
              ${this.scanData.uniqueFonts[0]?.font || 'None'}
            </span>
          </div>
        </div>

        <!-- Filter Bar -->
        <div class="fontlens-filter-bar">
          <button class="fontlens-filter-btn active" data-filter="all">All Styles (${this.scanData.uniqueStyles.length})</button>
          <button class="fontlens-filter-btn" data-filter="headings">Headings</button>
          <button class="fontlens-filter-btn" data-filter="body">Body & Text</button>
          <button class="fontlens-filter-btn" data-filter="interactive">Buttons & Links</button>
          <button class="fontlens-filter-btn" data-filter="code">Code Blocks</button>
        </div>

        <!-- Table Body -->
        <div class="fontlens-scanner-body">
          <table class="fontlens-scan-table">
            <thead>
              <tr>
                <th>Font Family</th>
                <th>Size</th>
                <th>Weight</th>
                <th>Line Height</th>
                <th>Color</th>
                <th>Elements</th>
              </tr>
            </thead>
            <tbody id="scanTableBody">
              <!-- Rendered rows -->
            </tbody>
          </table>
        </div>

        <!-- Footer -->
        <div class="fontlens-scanner-footer">
          <span style="font-size:11px; color:#64748B;">Click any style row to highlight all matching elements on the webpage.</span>
          <div style="display:flex; gap:8px;">
            <button id="btnExportJson" style="background:#1F2937; border:1px solid #334155; color:#E2E8F0; padding:6px 12px; border-radius:6px; font-size:12px; font-weight:600; cursor:pointer;">Export JSON</button>
            <button id="btnExportCsv" style="background:#1F2937; border:1px solid #334155; color:#E2E8F0; padding:6px 12px; border-radius:6px; font-size:12px; font-weight:600; cursor:pointer;">Export CSV</button>
          </div>
        </div>
      </div>
    `;

    this.shadowRoot.appendChild(wrapper);
    this.renderTableRows();
    this.bindEvents();
  }

  renderTableRows() {
    const tbody = this.shadowRoot.getElementById('scanTableBody');
    tbody.innerHTML = '';

    const filtered = this.scanData.uniqueStyles.filter(s => {
      if (this.activeFilter === 'all') return true;
      return s.category === this.activeFilter;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#64748B; padding:24px;">No elements found for this filter category.</td></tr>`;
      return;
    }

    for (const item of filtered) {
      const tr = document.createElement('tr');
      tr.className = 'fontlens-scan-row';
      tr.innerHTML = `
        <td style="font-weight:600; color:#F8FAFC;">${item.fontFamily}</td>
        <td><code style="color:#C4B5FD; font-size:11px;">${item.fontSize}</code></td>
        <td>${item.fontWeight}</td>
        <td><code style="color:#94A3B8; font-size:11px;">${item.lineHeight}</code></td>
        <td>
          <div style="display:flex; align-items:center; gap:6px;">
            <span style="width:12px; height:12px; border-radius:2px; background:${item.color}; border:1px solid rgba(255,255,255,0.2);"></span>
            <span style="font-size:11px; color:#94A3B8;">${item.color}</span>
          </div>
        </td>
        <td><span style="background:rgba(139, 92, 246, 0.2); color:#DDD6FE; padding:2px 8px; border-radius:4px; font-weight:700; font-size:11px;">${item.count}</span></td>
      `;

      tr.addEventListener('click', () => {
        this.shadowRoot.querySelectorAll('.fontlens-scan-row').forEach(r => r.classList.remove('highlighted'));
        tr.classList.add('highlighted');
        this.highlightElementsOnPage(item.elements);
      });

      tbody.appendChild(tr);
    }
  }

  highlightElementsOnPage(elements = []) {
    // Clear previous highlights
    this.clearPageHighlights();

    if (!elements || elements.length === 0) return;

    for (const el of elements) {
      if (!document.contains(el)) continue;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) continue;

      const hl = document.createElement('div');
      hl.className = 'fontlens-scan-element-highlight';
      hl.style.top = `${rect.top}px`;
      hl.style.left = `${rect.left}px`;
      hl.style.width = `${rect.width}px`;
      hl.style.height = `${rect.height}px`;

      this.shadowRoot.appendChild(hl);
      this.activeHighlights.push(hl);
    }

    // Scroll first visible element into view
    const first = elements.find(el => document.contains(el));
    if (first) {
      first.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  clearPageHighlights() {
    for (const hl of this.activeHighlights) {
      hl.remove();
    }
    this.activeHighlights = [];
  }

  bindEvents() {
    const root = this.shadowRoot;

    // Close
    root.getElementById('btnCloseScanner').addEventListener('click', () => this.close());
    root.getElementById('scannerBackdrop').addEventListener('click', () => this.close());

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.close();
    });

    // Filters
    root.querySelectorAll('.fontlens-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        root.querySelectorAll('.fontlens-filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeFilter = btn.dataset.filter;
        this.renderTableRows();
      });
    });

    // Export JSON
    root.getElementById('btnExportJson').addEventListener('click', () => {
      const json = exportScanToJson(this.scanData);
      this.downloadFile(json, 'fontlens-typography-scan.json', 'application/json');
    });

    // Export CSV
    root.getElementById('btnExportCsv').addEventListener('click', () => {
      const csv = exportScanToCsv(this.scanData);
      this.downloadFile(csv, 'fontlens-typography-scan.csv', 'text/csv');
    });
  }

  downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  close() {
    this.clearPageHighlights();
    if (this.hostEl) {
      this.hostEl.remove();
      this.hostEl = null;
    }
  }
}

// Global invocation helper
if (typeof window !== 'undefined') {
  window.__FONTLENS_SCANNER_LAUNCH__ = () => {
    const modal = new PageScannerModal();
    modal.open();
  };
}
