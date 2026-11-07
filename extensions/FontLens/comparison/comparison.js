/**
 * FontLens - Font Comparison Studio Controller
 * Coordinates live side-by-side font rendering, comparative styling,
 * Google Fonts cross-referencing, and preset saving.
 */

import { findGoogleFontMatch } from '../scripts/google-fonts-data.js';
import { testFontsCheck, isSystemFallback } from '../scripts/font-detection.js';
import { buildCssRule } from '../scripts/css-export.js';
import { saveComparison } from '../scripts/storage.js';

// Initial default comparison list
const DEFAULT_STUDIO_FONTS = [
  'Inter',
  'Playfair Display',
  'Fira Code',
  'Merriweather',
  'Roboto'
];

const POPULAR_SUGGESTIONS = [
  'Montserrat', 'Lora', 'JetBrains Mono', 'Poppins', 'Oswald',
  'Source Sans 3', 'Cinzel', 'Space Mono', 'Caveat', 'Bebas Neue'
];

let activeFonts = [...DEFAULT_STUDIO_FONTS];

// State object
const studioState = {
  sampleText: 'The quick brown fox jumps over the lazy dog.',
  fontSize: 32,
  fontWeight: 400,
  lineHeight: 1.4,
  letterSpacing: 0,
  color: '#F8FAFC',
  textTransform: 'none',
  fontStyle: 'normal'
};

function initComparisonStudio() {
  bindControls();
  renderComparisonCards();
  setupAddFontModal();
}

function bindControls() {
  // Sample Text Input
  const sampleInput = document.getElementById('sampleTextInput');
  sampleInput.addEventListener('input', (e) => {
    studioState.sampleText = e.target.value;
    updateAllCardPreviews();
  });

  // Preset Buttons
  document.querySelectorAll('.sample-preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.sample-preset-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      studioState.sampleText = btn.dataset.sample;
      sampleInput.value = studioState.sampleText;
      updateAllCardPreviews();
    });
  });

  // Font Size Slider
  const sliderSize = document.getElementById('sliderFontSize');
  const labelSize = document.getElementById('labelFontSize');
  sliderSize.addEventListener('input', (e) => {
    studioState.fontSize = parseInt(e.target.value, 10);
    labelSize.textContent = `${studioState.fontSize}px`;
    updateAllCardPreviews();
  });

  // Font Weight Slider
  const sliderWeight = document.getElementById('sliderFontWeight');
  const labelWeight = document.getElementById('labelFontWeight');
  sliderWeight.addEventListener('input', (e) => {
    studioState.fontWeight = parseInt(e.target.value, 10);
    labelWeight.textContent = studioState.fontWeight;
    updateAllCardPreviews();
  });

  // Line Height Slider
  const sliderLH = document.getElementById('sliderLineHeight');
  const labelLH = document.getElementById('labelLineHeight');
  sliderLH.addEventListener('input', (e) => {
    studioState.lineHeight = parseFloat(e.target.value);
    labelLH.textContent = `${studioState.lineHeight.toFixed(2)}×`;
    updateAllCardPreviews();
  });

  // Letter Spacing Slider
  const sliderLS = document.getElementById('sliderLetterSpacing');
  const labelLS = document.getElementById('labelLetterSpacing');
  sliderLS.addEventListener('input', (e) => {
    studioState.letterSpacing = parseFloat(e.target.value);
    labelLS.textContent = `${studioState.letterSpacing}px`;
    updateAllCardPreviews();
  });

  // Color Picker & Hex
  const colorPicker = document.getElementById('pickerColor');
  const hexInput = document.getElementById('inputColorHex');
  colorPicker.addEventListener('input', (e) => {
    studioState.color = e.target.value;
    hexInput.value = e.target.value.toUpperCase();
    updateAllCardPreviews();
  });
  hexInput.addEventListener('input', (e) => {
    if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) {
      studioState.color = e.target.value;
      colorPicker.value = e.target.value;
      updateAllCardPreviews();
    }
  });

  // Case Transform Segments
  document.querySelectorAll('#caseGroup .seg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#caseGroup .seg-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      studioState.textTransform = btn.dataset.case;
      updateAllCardPreviews();
    });
  });

  // Style Segments
  document.querySelectorAll('#styleGroup .seg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#styleGroup .seg-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      studioState.fontStyle = btn.dataset.style;
      updateAllCardPreviews();
    });
  });

  // Save Studio Action
  document.getElementById('btnSaveComparison').addEventListener('click', async () => {
    const title = prompt('Enter a name for this comparison studio preset:', 'Editorial vs Tech Comparison');
    if (title && title.trim()) {
      await saveComparison({
        title: title.trim(),
        fonts: [...activeFonts],
        state: { ...studioState }
      });
      const btn = document.getElementById('btnSaveComparison');
      const original = btn.innerHTML;
      btn.innerHTML = '<span>Saved! ✓</span>';
      setTimeout(() => { btn.innerHTML = original; }, 1500);
    }
  });
}

function renderComparisonCards() {
  const container = document.getElementById('comparisonList');
  container.innerHTML = '';

  if (activeFonts.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding:60px 20px; color:#64748B;">
        <h3>No fonts in comparison list</h3>
        <p style="margin-top:8px;">Click "+ Add Font" in the header to start comparing typography.</p>
      </div>
    `;
    return;
  }

  activeFonts.forEach(fontName => {
    const card = document.createElement('div');
    card.className = 'font-card';

    // Check Google Fonts match
    const googleMatch = findGoogleFontMatch(fontName);
    const isFallback = isSystemFallback(fontName);
    const checkPassed = testFontsCheck(fontName, studioState.fontWeight, studioState.fontStyle);

    let badgeHtml = '';
    if (googleMatch) {
      badgeHtml = `<a href="${googleMatch.specimenUrl}" target="_blank" rel="noopener noreferrer" class="font-badge google">Google Font (${googleMatch.category}) ↗</a>`;
    } else if (isFallback) {
      badgeHtml = `<span class="font-badge fallback">System Generic</span>`;
    } else if (checkPassed) {
      badgeHtml = `<span class="font-badge verified">Available in Browser ✓</span>`;
    } else {
      badgeHtml = `<span class="font-badge fallback">Declared Candidate</span>`;
    }

    card.innerHTML = `
      <div class="card-header">
        <div class="font-title-block">
          <span class="font-name">${fontName}</span>
          ${badgeHtml}
        </div>
        <div class="card-actions">
          <button class="card-btn btn-copy-font-css" title="Copy CSS for this font">Copy CSS</button>
          <button class="card-btn remove btn-remove-font" title="Remove this font from comparison">✕</button>
        </div>
      </div>

      <div class="card-preview-area" style="
        font-family: '${fontName}', -apple-system, sans-serif;
        font-size: ${studioState.fontSize}px;
        font-weight: ${studioState.fontWeight};
        line-height: ${studioState.lineHeight};
        letter-spacing: ${studioState.letterSpacing}px;
        color: ${studioState.color};
        text-transform: ${studioState.textTransform};
        font-style: ${studioState.fontStyle};
      ">
        ${escapeHtml(studioState.sampleText)}
      </div>

      <div class="glyph-strip" style="font-family: '${fontName}', monospace;">
        <span>Aa Bb Gg Qq Rr</span>
        <span>0 1 2 3 4 5 6 7 8 9</span>
        <span>&amp; @ % $ # ! ? /</span>
      </div>
    `;

    // Copy CSS
    card.querySelector('.btn-copy-font-css').addEventListener('click', (e) => {
      const css = buildCssRule(`.${slugify(fontName)}`, {
        fontFamily: `'${fontName}', sans-serif`,
        fontSize: `${studioState.fontSize}px`,
        fontWeight: studioState.fontWeight,
        lineHeight: studioState.lineHeight,
        letterSpacing: `${studioState.letterSpacing}px`,
        color: studioState.color,
        textTransform: studioState.textTransform,
        fontStyle: studioState.fontStyle
      });
      navigator.clipboard.writeText(css);
      e.target.textContent = 'Copied! ✓';
      setTimeout(() => { e.target.textContent = 'Copy CSS'; }, 1500);
    });

    // Remove Font
    card.querySelector('.btn-remove-font').addEventListener('click', () => {
      activeFonts = activeFonts.filter(f => f !== fontName);
      renderComparisonCards();
    });

    container.appendChild(card);
  });
}

function updateAllCardPreviews() {
  const cards = document.querySelectorAll('.font-card');
  cards.forEach((card, idx) => {
    const fontName = activeFonts[idx];
    const preview = card.querySelector('.card-preview-area');
    if (preview && fontName) {
      preview.style.fontFamily = `'${fontName}', -apple-system, sans-serif`;
      preview.style.fontSize = `${studioState.fontSize}px`;
      preview.style.fontWeight = studioState.fontWeight;
      preview.style.lineHeight = studioState.lineHeight;
      preview.style.letterSpacing = `${studioState.letterSpacing}px`;
      preview.style.color = studioState.color;
      preview.style.textTransform = studioState.textTransform;
      preview.style.fontStyle = studioState.fontStyle;
      preview.textContent = studioState.sampleText;
    }
  });
}

function setupAddFontModal() {
  const modal = document.getElementById('addFontModal');
  const btnOpen = document.getElementById('btnAddFont');
  const btnClose = document.getElementById('btnCloseModal');
  const btnCancel = document.getElementById('btnCancelAdd');
  const btnConfirm = document.getElementById('btnConfirmAdd');
  const input = document.getElementById('inputCustomFont');
  const chipsContainer = document.getElementById('popularChips');

  // Render chips
  chipsContainer.innerHTML = '';
  POPULAR_SUGGESTIONS.forEach(name => {
    const chip = document.createElement('button');
    chip.className = 'font-chip';
    chip.textContent = name;
    chip.addEventListener('click', () => {
      input.value = name;
    });
    chipsContainer.appendChild(chip);
  });

  const openModal = () => {
    modal.hidden = false;
    input.value = '';
    input.focus();
  };

  const closeModal = () => {
    modal.hidden = true;
  };

  btnOpen.addEventListener('click', openModal);
  btnClose.addEventListener('click', closeModal);
  btnCancel.addEventListener('click', closeModal);

  btnConfirm.addEventListener('click', () => {
    const val = input.value.trim().replace(/['"]/g, '');
    if (val && !activeFonts.includes(val)) {
      activeFonts.push(val);
      renderComparisonCards();
      closeModal();
    }
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      btnConfirm.click();
    }
  });
}

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

document.addEventListener('DOMContentLoaded', initComparisonStudio);
