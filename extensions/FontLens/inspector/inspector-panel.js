/**
 * FontLens - Inspector Floating Panel (Shadow DOM)
 * Encapsulated draggable inspection HUD with live typography editor,
 * evidence inspector, presets applicator, and CSS export actions.
 */

import { buildCssRule, buildFontFamilyDeclaration } from '../scripts/css-export.js';
import { getPresets, savePreset } from '../scripts/storage.js';
import { createPreset } from '../scripts/presets.js';

export class InspectorPanel {
  /**
   * @param {object} options
   * @param {import('./style-manager.js').StyleManager} options.styleManager
   * @param {Function} options.onClose
   * @param {Function} options.onTogglePin
   */
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

    // Dragging state
    this.isDragging = false;
    this.dragOffsetX = 0;
    this.dragOffsetY = 0;

    this.init();
  }

  async init() {
    // 1. Create or retrieve host
    let host = document.getElementById('fontlens-inspector-host');
    if (!host) {
      host = document.createElement('div');
      host.id = 'fontlens-inspector-host';
      document.body.appendChild(host);
    }
    this.hostEl = host;
    this.shadowRoot = host.attachShadow ? host.attachShadow({ mode: 'open' }) : host;

    // 2. Load stylesheet
    const styleEl = document.createElement('style');
    try {
      const cssUrl = chrome.runtime.getURL('inspector/inspector.css');
      const resp = await fetch(cssUrl);
      styleEl.textContent = await resp.text();
    } catch {
      // Fallback inline style handled by host
    }
    this.shadowRoot.appendChild(styleEl);

    // 3. Create Overlays
    this.outlineEl = document.createElement('div');
    this.outlineEl.className = 'fontlens-inspect-outline';
    this.badgeEl = document.createElement('div');
    this.badgeEl.className = 'fontlens-inspect-badge';
    this.outlineEl.appendChild(this.badgeEl);
    this.shadowRoot.appendChild(this.outlineEl);

    this.pinnedOutlineEl = document.createElement('div');
    this.pinnedOutlineEl.className = 'fontlens-pinned-outline';
    this.shadowRoot.appendChild(this.pinnedOutlineEl);

    // 4. Create Panel DOM
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
        <!-- Element Banner -->
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
            <label class="fontlens-editor-label-row">
              <span>Font Family</span>
            </label>
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
            <label class="fontlens-editor-label-row">
              <span>Text Color</span>
            </label>
            <div style="display:flex; gap:8px;">
              <input type="color" id="editColorPicker" style="width:36px; height:32px; border:none; background:none; cursor:pointer;" value="#ffffff">
              <input type="text" id="editColorHex" class="fontlens-input" value="#FFFFFF" style="flex:1;">
            </div>
          </div>

          <div class="fontlens-editor-row">
            <label class="fontlens-editor-label-row">
              <span>Alignment</span>
            </label>
            <div class="fontlens-btn-group" id="groupAlign">
              <button class="fontlens-group-btn" data-val="left">Left</button>
              <button class="fontlens-group-btn" data-val="center">Center</button>
              <button class="fontlens-group-btn" data-val="right">Right</button>
              <button class="fontlens-group-btn" data-val="justify">Justify</button>
            </div>
          </div>

          <div class="fontlens-editor-row">
            <label class="fontlens-editor-label-row">
              <span>Transform</span>
            </label>
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
          <div id="evidenceList" style="display:flex; flex-direction:column; gap:8px;">
            <!-- Rendered dynamically -->
          </div>
        </div>

        <!-- 4. Presets Tab -->
        <div id="tabPresets" class="fontlens-panel-section" hidden>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
            <span style="font-size:11px; color:#94A3B8; font-weight:600;">Saved Typography Presets</span>
            <button id="btnSaveCurrentPreset" class="fontlens-btn-sm" title="Save inspected typography as a new preset">+ Save Preset</button>
          </div>
          <div id="presetsContainer" style="display:flex; flex-direction:column; gap:6px;">
            <!-- Rendered dynamically -->
          </div>
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

    // Tabs
    const tabs = root.querySelectorAll('.fontlens-tab-btn');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.activeTab = tab.dataset.tab;

        root.getElementById('tabInspect').hidden = this.activeTab !== 'inspect';
        root.getElementById('tabEditor').hidden = this.activeTab !== 'editor';
        root.getElementById('tabEvidence').hidden = this.activeTab !== 'evidence';
        root.getElementById('tabPresets').hidden = this.activeTab !== 'presets';

        if (this.activeTab === 'presets') {
          this.renderPresetsList();
        }
      });
    });

    // Close & Minimize & Pin
    root.getElementById('btnClose').addEventListener('click', () => {
      if (this.onClose) this.onClose();
    });

    root.getElementById('btnMinimize').addEventListener('click', () => {
      this.isMinimized = !this.isMinimized;
      this.panelEl.classList.toggle('minimized', this.isMinimized);
    });

    root.getElementById('btnPin').addEventListener('click', () => {
      this.isPinned = !this.isPinned;
      root.getElementById('btnPin').classList.toggle('active', this.isPinned);
      if (this.onTogglePin) this.onTogglePin(this.isPinned);
    });

    // Dragging panel
    const header = root.getElementById('panelHeader');
    header.addEventListener('mousedown', (e) => {
      if (e.target.closest('.fontlens-icon-btn')) return;
      this.isDragging = true;
      const rect = this.panelEl.getBoundingClientRect();
      this.dragOffsetX = e.clientX - rect.left;
      this.dragOffsetY = e.clientY - rect.top;
      e.preventDefault();
    });

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

    // Copy CSS Button
    root.getElementById('btnCopyCss').addEventListener('click', () => {
      if (!this.currentData) return;
      const sel = this.currentData.element.selector || '.element';
      const css = buildCssRule(sel, this.currentData.typography);
      navigator.clipboard.writeText(css);
      const span = root.getElementById('copyCssText');
      span.textContent = 'Copied! ✓';
      setTimeout(() => { span.textContent = 'Copy CSS'; }, 1500);
    });

    // Copy Font Family
    root.getElementById('btnCopyFontFamily').addEventListener('click', () => {
      if (!this.currentData) return;
      const decl = buildFontFamilyDeclaration(this.currentData.typography.fontFamily);
      navigator.clipboard.writeText(decl);
      const btn = root.getElementById('btnCopyFontFamily');
      btn.textContent = 'Copied!';
      setTimeout(() => { btn.textContent = 'Font'; }, 1500);
    });

    // Reset Styles
    root.getElementById('btnResetStyles').addEventListener('click', () => {
      if (this.currentElement) {
        this.styleManager.resetElement(this.currentElement);
        // Refresh panel with restored styles
        if (this.onRefreshElement) this.onRefreshElement(this.currentElement);
      }
    });

    // Save Preset
    root.getElementById('btnSaveCurrentPreset').addEventListener('click', async () => {
      if (!this.currentData) return;
      const name = prompt('Enter a name for this typography preset:');
      if (name && name.trim()) {
        const typo = this.currentData.typography;
        const preset = createPreset(name, {
          fontFamily: typo.fontFamily,
          fontSize: typo.fontSize,
          fontWeight: typo.fontWeight,
          fontStyle: typo.fontStyle,
          lineHeight: typo.lineHeight.raw,
          letterSpacing: typo.letterSpacing,
          color: typo.color,
          textAlign: typo.textAlign
        });
        await savePreset(preset);
        this.renderPresetsList();
      }
    });

    // Live Editor Input Handlers
    this.bindEditorInputs();
  }

  bindEditorInputs() {
    const root = this.shadowRoot;

    // Font Family
    const editFamily = root.getElementById('editFontFamily');
    editFamily.addEventListener('input', (e) => {
      if (this.currentElement) {
        this.styleManager.applyProperty(this.currentElement, 'fontFamily', e.target.value);
        this.updateInspectionValues();
      }
    });

    // Font Size
    const sliderSize = root.getElementById('sliderFontSize');
    const valSize = root.getElementById('valFontSize');
    sliderSize.addEventListener('input', (e) => {
      valSize.textContent = `${e.target.value}px`;
      if (this.currentElement) {
        this.styleManager.applyProperty(this.currentElement, 'fontSize', `${e.target.value}px`);
        this.updateInspectionValues();
      }
    });

    // Font Weight
    const sliderWeight = root.getElementById('sliderFontWeight');
    const valWeight = root.getElementById('valFontWeight');
    sliderWeight.addEventListener('input', (e) => {
      valWeight.textContent = e.target.value;
      if (this.currentElement) {
        this.styleManager.applyProperty(this.currentElement, 'fontWeight', e.target.value);
        this.updateInspectionValues();
      }
    });

    // Line Height
    const sliderLH = root.getElementById('sliderLineHeight');
    const valLH = root.getElementById('valLineHeight');
    sliderLH.addEventListener('input', (e) => {
      valLH.textContent = `${parseFloat(e.target.value).toFixed(2)}×`;
      if (this.currentElement) {
        this.styleManager.applyProperty(this.currentElement, 'lineHeight', e.target.value);
        this.updateInspectionValues();
      }
    });

    // Letter Spacing
    const sliderLS = root.getElementById('sliderLetterSpacing');
    const valLS = root.getElementById('valLetterSpacing');
    sliderLS.addEventListener('input', (e) => {
      valLS.textContent = `${e.target.value}px`;
      if (this.currentElement) {
        this.styleManager.applyProperty(this.currentElement, 'letterSpacing', `${e.target.value}px`);
        this.updateInspectionValues();
      }
    });

    // Color Picker & Hex
    const colorPicker = root.getElementById('editColorPicker');
    const colorHex = root.getElementById('editColorHex');
    colorPicker.addEventListener('input', (e) => {
      colorHex.value = e.target.value.toUpperCase();
      if (this.currentElement) {
        this.styleManager.applyProperty(this.currentElement, 'color', e.target.value);
        this.updateInspectionValues();
      }
    });
    colorHex.addEventListener('input', (e) => {
      if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) {
        colorPicker.value = e.target.value;
        if (this.currentElement) {
          this.styleManager.applyProperty(this.currentElement, 'color', e.target.value);
          this.updateInspectionValues();
        }
      }
    });

    // Align Buttons
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

    // Transform Buttons
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

  /**
   * Updates panel with extracted typography & evidence
   * @param {HTMLElement} element
   * @param {object} typoData
   * @param {object} evidenceData
   */
  update(element, typoData, evidenceData) {
    this.currentElement = element;
    this.currentData = typoData;
    this.currentEvidence = evidenceData;

    const root = this.shadowRoot;
    const { element: elMeta, typography: typo } = typoData;

    // Element Banner
    root.getElementById('bannerSelector').textContent = elMeta.selector || elMeta.tagName;
    root.getElementById('bannerSample').textContent = `"${elMeta.textSnippet || ''}"`;

    // 1. Inspect Values
    root.getElementById('propPrimaryFont').textContent = typo.primaryFamily || '—';
    root.getElementById('propFontStack').textContent = typo.fontStack.join(', ') || '—';
    root.getElementById('propFontSize').textContent = `${typo.fontSize} (${typo.fontSizeRem})`;
    root.getElementById('propFontWeight').textContent = typo.fontWeightFormatted;
    root.getElementById('propLineHeight').textContent = `${typo.lineHeight.raw} (${typo.lineHeight.formattedRatio})`;
    root.getElementById('propLetterSpacing').textContent = typo.letterSpacing;
    root.getElementById('propColorHex').textContent = typo.colorHex;
    root.getElementById('colorSwatch').style.backgroundColor = typo.color;

    // Contrast
    const contrast = typo.contrast;
    root.getElementById('propContrastRatio').textContent = contrast.formatted;
    const contrastBadge = root.getElementById('contrastBadge');
    if (contrast.scoreAA) {
      contrastBadge.className = 'fontlens-badge-pill pass';
      contrastBadge.textContent = contrast.scoreAAA ? 'AAA ✓' : 'AA ✓';
    } else {
      contrastBadge.className = 'fontlens-badge-pill fail';
      contrastBadge.textContent = 'Low Contrast';
    }

    root.getElementById('propTextAlign').textContent = typo.textAlign;
    root.getElementById('propTextTransform').textContent = typo.textTransform;

    // 2. Sync Editor Inputs
    root.getElementById('editFontFamily').value = typo.fontFamily;
    root.getElementById('sliderFontSize').value = Math.round(typo.fontSizePx);
    root.getElementById('valFontSize').textContent = `${Math.round(typo.fontSizePx)}px`;

    root.getElementById('sliderFontWeight').value = parseInt(typo.fontWeight, 10) || 400;
    root.getElementById('valFontWeight').textContent = typo.fontWeight;

    root.getElementById('sliderLineHeight').value = typo.lineHeight.ratio;
    root.getElementById('valLineHeight').textContent = typo.lineHeight.formattedRatio;

    const parsedLS = parseFloat(typo.letterSpacing) || 0;
    root.getElementById('sliderLetterSpacing').value = parsedLS;
    root.getElementById('valLetterSpacing').textContent = `${parsedLS}px`;

    root.getElementById('editColorPicker').value = typo.colorHex.slice(0, 7);
    root.getElementById('editColorHex').value = typo.colorHex;

    // Button group active classes
    root.querySelectorAll('#groupAlign .fontlens-group-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.val === typo.textAlign);
    });
    root.querySelectorAll('#groupTransform .fontlens-group-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.val === typo.textTransform);
    });

    // 3. Render Evidence List
    this.renderEvidenceList(evidenceData);

    // 4. Update Highlight outlines
    this.updateHighlight(element, typo.primaryFamily, typo.fontSize);
  }

  renderEvidenceList(evidenceData) {
    const container = this.shadowRoot.getElementById('evidenceList');
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

  async renderPresetsList() {
    const container = this.shadowRoot.getElementById('presetsContainer');
    container.innerHTML = '<div style="color:#64748B; font-size:11px;">Loading presets...</div>';

    const presets = await getPresets();
    container.innerHTML = '';

    for (const preset of presets) {
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
    if (!el || el.nodeType !== Node.ELEMENT_NODE) {
      this.outlineEl.style.display = 'none';
      return;
    }

    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      this.outlineEl.style.display = 'none';
      return;
    }

    this.outlineEl.style.top = `${rect.top}px`;
    this.outlineEl.style.left = `${rect.left}px`;
    this.outlineEl.style.width = `${rect.width}px`;
    this.outlineEl.style.height = `${rect.height}px`;
    this.outlineEl.style.display = 'block';

    this.badgeEl.textContent = `${fontName} • ${fontSize}`;

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

  updateInspectionValues() {
    if (!this.currentElement) return;
    // Notify host inspector to re-extract computed styles and sync
    if (this.onRefreshElement) {
      this.onRefreshElement(this.currentElement);
    }
  }

  hideHoverHighlight() {
    if (!this.isPinned) {
      this.outlineEl.style.display = 'none';
    }
  }

  destroy() {
    if (this.hostEl) {
      this.hostEl.remove();
      this.hostEl = null;
    }
  }
}
