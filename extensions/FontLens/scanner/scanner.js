/**
 * FontLens - Page Typography Scanner (Injected Content Script)
 * Self-contained crawler with zero external dependencies and zero top-level module imports.
 * Runs inside the page's isolated execution world.
 */

(function () {
  if (typeof window !== 'undefined' && window.__FONTLENS_SCANNER_INITIALIZED__) {
    if (window.__FONTLENS_SCANNER_LAUNCH__) {
      window.__FONTLENS_SCANNER_LAUNCH__();
    }
    return;
  }
  if (typeof window !== 'undefined') {
    window.__FONTLENS_SCANNER_INITIALIZED__ = true;
  }

  /**
   * Parses font-family CSS value into ordered array of individual font candidates
   * @param {string} stackStr
   * @returns {string[]}
   */
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

  /**
   * Formats scan summary to JSON string
   * @param {object} scanData
   * @returns {string}
   */
  function exportScanToJson(scanData) {
    const exportPayload = {
      generator: 'FontLens Chrome Extension v1.0.0',
      exportedAt: new Date().toISOString(),
      url: scanData.url || '',
      pageTitle: scanData.title || '',
      stats: {
        totalElementsScanned: scanData.totalElements || 0,
        uniqueFontsCount: scanData.uniqueFonts?.length || 0,
        uniqueStylesCount: scanData.uniqueStyles?.length || 0
      },
      uniqueFonts: scanData.uniqueFonts || [],
      fontSizes: scanData.fontSizes || [],
      fontWeights: scanData.fontWeights || [],
      categories: scanData.categories || {},
      uniqueStyles: scanData.uniqueStyles || []
    };

    return JSON.stringify(exportPayload, null, 2);
  }

  /**
   * Formats scan unique styles to CSV string
   * @param {object} scanData
   * @returns {string}
   */
  function exportScanToCsv(scanData) {
    const headers = [
      'Font Family',
      'Font Size',
      'Font Weight',
      'Line Height',
      'Text Color',
      'Text Align',
      'Element Count',
      'Sample Elements'
    ];

    const rows = [];
    rows.push(headers.map(h => `"${h}"`).join(','));

    const styles = scanData.uniqueStyles || [];
    for (const s of styles) {
      const row = [
        (s.fontFamily || '').replace(/"/g, '""'),
        s.fontSize || '',
        s.fontWeight || '',
        s.lineHeight || '',
        s.color || '',
        s.textAlign || '',
        s.count || 1,
        (s.sampleTags || []).join(', ')
      ];
      rows.push(row.map(val => `"${val}"`).join(','));
    }

    return rows.join('\n');
  }

  /**
   * Scans visible text elements across the document and compiles typography analytics
   * @param {Document} [doc=document]
   * @param {number} [maxLimit=1500]
   * @returns {object} Scan summary and deduplicated styles
   */
  function scanPageTypography(doc = document, maxLimit = 1500) {
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
        if (el.childNodes[n].nodeType === (typeof Node !== 'undefined' ? Node.TEXT_NODE : 3) && el.childNodes[n].nodeValue.trim().length > 0) {
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
          fontSize,
          fontWeight,
          lineHeight,
          color,
          textAlign,
          category,
          count: 0,
          sampleTags: new Set(),
          matchedElements: []
        };
        uniqueStylesMap.set(signature, styleRecord);
      }

      styleRecord.count++;
      styleRecord.sampleTags.add(tag.toUpperCase());
      styleRecord.matchedElements.push(el);

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
      categories,
      uniqueStyles
    };
  }

  /**
   * In-Page Modal for Whole-Page Scanner (Shadow DOM)
   */
  class PageScannerModal {
    constructor() {
      this.hostEl = null;
      this.shadowRoot = null;
      this.scanData = null;
      this.activeFilter = 'all';
      this.activeHighlights = [];
    }

    open() {
      this.close();

      const oldHost = document.getElementById('fontlens-scanner-host');
      if (oldHost) oldHost.remove();

      this.hostEl = document.createElement('div');
      this.hostEl.id = 'fontlens-scanner-host';
      (document.body || document.documentElement).appendChild(this.hostEl);

      this.shadowRoot = this.hostEl.attachShadow({ mode: 'open' });

      // Load scanner stylesheet via link (immune to CSP fetch restrictions)
      const linkEl = document.createElement('link');
      linkEl.rel = 'stylesheet';
      linkEl.href = chrome.runtime.getURL('scanner/scanner.css');
      this.shadowRoot.appendChild(linkEl);

      // Perform scan
      this.scanData = scanPageTypography(document, 1500);

      // Render Modal Structure
      const modalWrap = document.createElement('div');
      modalWrap.innerHTML = this.renderModalHtml();
      this.shadowRoot.appendChild(modalWrap);

      this.renderTableRows();
      this.bindEvents();
    }

    renderModalHtml() {
      const stats = {
        elements: this.scanData.totalElements,
        fonts: this.scanData.uniqueFonts.length,
        sizes: this.scanData.fontSizes.length,
        styles: this.scanData.uniqueStyles.length
      };

      return `
        <div class="fontlens-scanner-backdrop" id="scannerBackdrop">
          <div class="fontlens-scanner-modal" id="scannerModalBox">
            <!-- Header -->
            <div class="fontlens-scanner-header">
              <div class="fontlens-brand">
                <svg viewBox="0 0 128 128" width="22" height="22">
                  <rect width="128" height="128" rx="28" fill="#1E1B4B"/>
                  <path d="M 32 32 L 72 32 L 72 44 L 46 44 L 46 58 L 68 58 L 68 70 L 46 70 L 46 96 L 32 96 Z" fill="#F3F4F6"/>
                  <circle cx="78" cy="74" r="26" fill="rgba(139, 92, 246, 0.25)" stroke="#8B5CF6" stroke-width="6"/>
                  <line x1="97" y1="93" x2="114" y2="110" stroke="#06B6D4" stroke-width="7" stroke-linecap="round"/>
                </svg>
                <div>
                  <h2 class="fontlens-scanner-title">Page Typography Scanner</h2>
                  <p class="fontlens-scanner-sub">${escapeScannerHtml(this.scanData.title)} (${escapeScannerHtml(window.location.hostname)})</p>
                </div>
              </div>
              <button class="fontlens-close-btn" id="btnCloseScanner" title="Close Scanner">&times;</button>
            </div>

            <!-- Stats Bar -->
            <div class="fontlens-scanner-stats">
              <div class="fontlens-stat-tile">
                <span class="fontlens-stat-num">${stats.elements}</span>
                <span class="fontlens-stat-lbl">Text Nodes</span>
              </div>
              <div class="fontlens-stat-tile">
                <span class="fontlens-stat-num">${stats.fonts}</span>
                <span class="fontlens-stat-lbl">Unique Fonts</span>
              </div>
              <div class="fontlens-stat-tile">
                <span class="fontlens-stat-num">${stats.sizes}</span>
                <span class="fontlens-stat-lbl">Font Sizes</span>
              </div>
              <div class="fontlens-stat-tile">
                <span class="fontlens-stat-num">${stats.styles}</span>
                <span class="fontlens-stat-lbl">Style Combos</span>
              </div>
            </div>

            <!-- Filter Controls -->
            <div class="fontlens-scanner-controls">
              <div class="fontlens-filter-bar">
                <button class="fontlens-filter-btn active" data-filter="all">All Styles</button>
                <button class="fontlens-filter-btn" data-filter="headings">Headings (${this.scanData.categories.headings.length})</button>
                <button class="fontlens-filter-btn" data-filter="body">Body (${this.scanData.categories.body.length})</button>
                <button class="fontlens-filter-btn" data-filter="interactive">Interactive (${this.scanData.categories.interactive.length})</button>
                <button class="fontlens-filter-btn" data-filter="code">Code (${this.scanData.categories.code.length})</button>
              </div>

              <div class="fontlens-export-btns">
                <button class="fontlens-export-btn" id="btnExportJson">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                  Export JSON
                </button>
                <button class="fontlens-export-btn" id="btnExportCsv">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                  Export CSV
                </button>
              </div>
            </div>

            <!-- Styles Table -->
            <div class="fontlens-table-container">
              <table class="fontlens-scanner-table">
                <thead>
                  <tr>
                    <th>Font Family</th>
                    <th>Size & Weight</th>
                    <th>Line Height</th>
                    <th>Color</th>
                    <th>Elements</th>
                    <th>Count</th>
                    <th style="text-align: right;">Highlight</th>
                  </tr>
                </thead>
                <tbody id="scannerTableBody">
                  <!-- Rendered dynamically -->
                </tbody>
              </table>
            </div>

            <!-- Footer -->
            <div class="fontlens-scanner-footer">
              <span>Click "Highlight" on any row to outline all matching elements across the live webpage.</span>
            </div>
          </div>
        </div>
      `;
    }

    renderTableRows() {
      const tbody = this.shadowRoot ? this.shadowRoot.querySelector('#scannerTableBody') : null;
      if (!tbody) return;
      tbody.innerHTML = '';

      let styles = this.scanData.uniqueStyles;
      if (this.activeFilter !== 'all') {
        styles = styles.filter(s => s.category === this.activeFilter);
      }

      if (styles.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 30px; color: #64748B;">No typography styles found in this category.</td></tr>`;
        return;
      }

      styles.forEach((item, idx) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>
            <div class="font-cell-main">${escapeScannerHtml(item.fontFamily)}</div>
            <div class="font-cell-sample" style="font-family: '${escapeScannerHtml(item.fontFamily)}', sans-serif;">
              The quick brown fox jumps over the lazy dog.
            </div>
          </td>
          <td>
            <span class="badge size-badge">${escapeScannerHtml(item.fontSize)}</span>
            <span class="badge weight-badge">${escapeScannerHtml(item.fontWeight)}</span>
          </td>
          <td>
            <span class="table-dim-val">${escapeScannerHtml(item.lineHeight)}</span>
          </td>
          <td>
            <div class="table-color-preview">
              <span class="table-color-swatch" style="background-color: ${escapeScannerHtml(item.color)};"></span>
              <span class="table-dim-val">${escapeScannerHtml(item.color)}</span>
            </div>
          </td>
          <td>
            <div class="tag-pills">
              ${item.sampleTags.slice(0, 3).map(t => `<span class="tag-pill">&lt;${t}&gt;</span>`).join('')}
              ${item.sampleTags.length > 3 ? `<span class="tag-pill">+${item.sampleTags.length - 3}</span>` : ''}
            </div>
          </td>
          <td>
            <span class="fontlens-row-count">${item.count}</span>
          </td>
          <td style="text-align: right;">
            <button class="fontlens-row-action-btn btn-highlight-row" data-idx="${idx}">
              Highlight (${item.matchedElements.length})
            </button>
          </td>
        `;

        tr.querySelector('.btn-highlight-row').addEventListener('click', () => {
          this.highlightElements(item.matchedElements);
        });

        tbody.appendChild(tr);
      });
    }

    highlightElements(elements = []) {
      this.clearPageHighlights();

      if (!elements || elements.length === 0) return;

      elements.forEach(el => {
        if (!document.contains(el)) return;
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;

        const hl = document.createElement('div');
        hl.className = 'fontlens-highlight-rect';
        hl.style.position = 'absolute';
        hl.style.top = `${rect.top + window.scrollY}px`;
        hl.style.left = `${rect.left + window.scrollX}px`;
        hl.style.width = `${rect.width}px`;
        hl.style.height = `${rect.height}px`;
        hl.style.border = '2px dashed #06B6D4';
        hl.style.backgroundColor = 'rgba(6, 182, 212, 0.15)';
        hl.style.pointerEvents = 'none';
        hl.style.zIndex = '2147483640';
        hl.style.borderRadius = '4px';
        hl.style.transition = 'all 0.2s ease';

        document.body.appendChild(hl);
        this.activeHighlights.push(hl);
      });

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
      if (!root) return;

      // Close
      root.querySelector('#btnCloseScanner')?.addEventListener('click', () => this.close());
      root.querySelector('#scannerBackdrop')?.addEventListener('click', (e) => {
        if (e.target.id === 'scannerBackdrop') this.close();
      });

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
      root.querySelector('#btnExportJson')?.addEventListener('click', () => {
        const json = exportScanToJson(this.scanData);
        this.downloadFile(json, 'fontlens-typography-scan.json', 'application/json');
      });

      // Export CSV
      root.querySelector('#btnExportCsv')?.addEventListener('click', () => {
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

  function escapeScannerHtml(str = '') {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Global registration for popup / background worker triggering
  if (typeof window !== 'undefined') {
    window.__FONTLENS_SCANNER_LAUNCH__ = () => {
      const modal = new PageScannerModal();
      modal.open();
    };
    window.scanPageTypography = scanPageTypography;
  }
})();
