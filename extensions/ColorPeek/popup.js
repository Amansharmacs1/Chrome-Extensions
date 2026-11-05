/**
 * ColorPeek - Popup Controller
 * Connects eyedropper sampling, element inspector trigger, format conversions,
 * palette management, WCAG contrast verification, and harmonies.
 */

import { parseColor, formatColor, buildCanonical } from './scripts/color-converter.js';
import { evaluateContrast, getRecommendedTextColor } from './scripts/contrast-checker.js';
import { getAllHarmonies } from './scripts/harmonies.js';
import {
  getActiveColor,
  setActiveColor,
  getRecentColors,
  addRecentColor,
  clearRecentColors,
  getPalettes,
  addColorToPalette,
  removeColorFromPalette,
  createPalette,
  getSettings
} from './scripts/palette-manager.js';
import { samplePixelWithEyeDropper } from './scripts/eyedropper.js';
import { exportToCssVariables, exportToHexList, exportToJson } from './scripts/css-exporter.js';
import { copyToClipboard, showToast } from './scripts/utils.js';

let currentCanonical = null;
let currentPalettes = [];
let activePaletteId = null;

async function initPopup() {
  // 1. DOM Elements
  const activeColorPreview = document.getElementById('activeColorPreview');
  const colorHexInput = document.getElementById('colorHexInput');
  const inputValidationBadge = document.getElementById('inputValidationBadge');
  const colorSourceBadge = document.getElementById('colorSourceBadge');
  const btnSaveToActivePalette = document.getElementById('btnSaveToActivePalette');

  const btnPickEyedropper = document.getElementById('btnPickEyedropper');
  const btnInspectElement = document.getElementById('btnInspectElement');
  const btnOpenDashboard = document.getElementById('btnOpenDashboard');

  const valHex = document.getElementById('valHex');
  const valRgb = document.getElementById('valRgb');
  const valHsl = document.getElementById('valHsl');
  const valCssVar = document.getElementById('valCssVar');

  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabPanels = document.querySelectorAll('.tab-panel');

  const recentColorsList = document.getElementById('recentColorsList');
  const btnClearRecents = document.getElementById('btnClearRecents');
  const paletteSelect = document.getElementById('paletteSelect');
  const btnNewPalette = document.getElementById('btnNewPalette');
  const btnExportPalette = document.getElementById('btnExportPalette');
  const paletteSwatchesGrid = document.getElementById('paletteSwatchesGrid');

  // Contrast elements
  const contrastFgSwatch = document.getElementById('contrastFgSwatch');
  const contrastFgInput = document.getElementById('contrastFgInput');
  const contrastBgSwatch = document.getElementById('contrastBgSwatch');
  const contrastBgInput = document.getElementById('contrastBgInput');
  const btnSwapContrast = document.getElementById('btnSwapContrast');
  const contrastLiveCard = document.getElementById('contrastLiveCard');
  const contrastRatioDisplay = document.getElementById('contrastRatioDisplay');
  const contrastOverallBadge = document.getElementById('contrastOverallBadge');

  const compAaNormal = document.getElementById('compAaNormal');
  const compAaLarge = document.getElementById('compAaLarge');
  const compAaaNormal = document.getElementById('compAaaNormal');
  const compAaaLarge = document.getElementById('compAaaLarge');

  // Harmonies containers
  const harmonyComplementary = document.getElementById('harmonyComplementary');
  const harmonyAnalogous = document.getElementById('harmonyAnalogous');
  const harmonyTriadic = document.getElementById('harmonyTriadic');
  const harmonyShades = document.getElementById('harmonyShades');

  const btnSettingsLink = document.getElementById('btnSettingsLink');

  // 2. Load active color and initial state
  const initialHex = await getActiveColor();
  updateColor(initialHex, 'Saved Color');

  // Load palettes & recents
  await refreshPalettesUI();
  await refreshRecentsUI();

  // 3. Tab Switching
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tabButtons.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      tabPanels.forEach(p => {
        p.classList.remove('active');
        p.hidden = true;
      });

      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      const targetId = btn.dataset.tab;
      const targetPanel = document.getElementById(targetId);
      if (targetPanel) {
        targetPanel.classList.add('active');
        targetPanel.hidden = false;
      }
    });
  });

  // 4. Color Update & State Propagation
  function updateColor(colorInput, sourceLabel = 'Color') {
    const parsed = parseColor(colorInput);
    if (!parsed) {
      inputValidationBadge.textContent = '✗';
      inputValidationBadge.className = 'validation-badge invalid';
      return;
    }

    currentCanonical = parsed;
    inputValidationBadge.textContent = '✓';
    inputValidationBadge.className = 'validation-badge valid';

    // Update Hero Preview & Hex Input
    activeColorPreview.style.backgroundColor = parsed.hex;
    colorHexInput.value = parsed.hex.replace(/^#/, '');
    colorSourceBadge.textContent = sourceLabel;

    // Update Formats
    valHex.textContent = parsed.hex;
    valRgb.textContent = parsed.rgb;
    valHsl.textContent = parsed.hsl;
    valCssVar.textContent = `--color-primary: ${parsed.hex};`;

    // Save Active Color asynchronously
    setActiveColor(parsed.hex);

    // Update Contrast tab background by default
    contrastBgSwatch.style.backgroundColor = parsed.hex;
    contrastBgInput.value = parsed.hex;
    updateContrastUI();

    // Update Harmonies tab
    updateHarmoniesUI(parsed);
  }

  // 5. Hex Input Event Listener
  colorHexInput.addEventListener('input', e => {
    const raw = '#' + e.target.value.trim().replace(/^#/, '');
    const parsed = parseColor(raw);
    if (parsed) {
      updateColor(parsed.hex, 'Manual Input');
      addRecentColor(parsed.hex, 'manual').then(refreshRecentsUI);
    } else {
      inputValidationBadge.textContent = '✗';
      inputValidationBadge.className = 'validation-badge invalid';
    }
  });

  // 6. Click Large Swatch to Copy HEX
  activeColorPreview.addEventListener('click', async () => {
    if (!currentCanonical) return;
    const ok = await copyToClipboard(currentCanonical.hex);
    if (ok) showToast(`Copied ${currentCanonical.hex}`);
  });

  // 7. Format Copy Buttons
  document.querySelectorAll('.btn-copy-format').forEach(btn => {
    btn.addEventListener('click', async e => {
      const targetId = btn.dataset.target;
      const targetElem = document.getElementById(targetId);
      if (targetElem && targetElem.textContent) {
        const text = targetElem.textContent.trim();
        const ok = await copyToClipboard(text);
        if (ok) {
          showToast(`Copied: ${text}`);
          btn.style.color = 'var(--accent-success)';
          setTimeout(() => (btn.style.color = ''), 1200);
        }
      }
    });
  });

  // 8. Eyedropper Tool
  btnPickEyedropper.addEventListener('click', async () => {
    const res = await samplePixelWithEyeDropper();
    if (res.canceled) return;

    if (res.success && res.hex) {
      updateColor(res.hex, 'Sampled Pixel');
      await addRecentColor(res.hex, 'eyedropper');
      await refreshRecentsUI();

      // Check auto-copy setting
      const settings = await getSettings();
      if (settings.autoCopyOnPick) {
        await copyToClipboard(res.hex);
        showToast(`Sampled & Copied ${res.hex}`);
      } else {
        showToast(`Sampled ${res.hex}`);
      }
    } else if (res.error) {
      showToast(res.error, 'error');
    }
  });

  // 9. Element CSS Inspector Tool
  btnInspectElement.addEventListener('click', () => {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({ type: 'INSPECT_ELEMENT' }, response => {
        if (chrome.runtime?.lastError) {
          showToast('Could not launch inspector on this page.', 'error');
          return;
        }
        if (response && response.success) {
          window.close(); // Close popup so user can freely hover webpage elements
        } else if (response && response.error) {
          showToast(response.error, 'warning');
        }
      });
    } else {
      showToast('Inspector is available inside Chrome browser tabs.', 'info');
    }
  });

  // 10. Open Full Dashboard
  btnOpenDashboard.addEventListener('click', () => {
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
      chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
      window.close();
    } else {
      window.location.href = 'dashboard.html';
    }
  });

  // 11. Recent Colors List
  async function refreshRecentsUI() {
    const recents = await getRecentColors();
    recentColorsList.innerHTML = '';

    if (recents.length === 0) {
      recentColorsList.innerHTML = '<span style="font-size:11px; color:#64748B;">No recent colors yet.</span>';
      return;
    }

    recents.forEach(item => {
      const swatch = document.createElement('div');
      swatch.className = 'swatch-item';
      swatch.style.backgroundColor = item.hex;
      swatch.title = `${item.hex} (${item.source || 'picked'})`;
      swatch.addEventListener('click', () => {
        updateColor(item.hex, `Recent (${item.source || 'pick'})`);
      });
      recentColorsList.appendChild(swatch);
    });
  }

  btnClearRecents.addEventListener('click', async () => {
    await clearRecentColors();
    await refreshRecentsUI();
    showToast('Recent colors cleared');
  });

  // 12. Palette Management
  async function refreshPalettesUI() {
    currentPalettes = await getPalettes();
    paletteSelect.innerHTML = '';

    currentPalettes.forEach(pal => {
      const opt = document.createElement('option');
      opt.value = pal.id;
      opt.textContent = `${pal.name} (${pal.colors ? pal.colors.length : 0})`;
      paletteSelect.appendChild(opt);
    });

    if (!activePaletteId && currentPalettes.length > 0) {
      activePaletteId = currentPalettes[0].id;
    }
    if (activePaletteId) {
      paletteSelect.value = activePaletteId;
    }

    renderCurrentPaletteSwatches();
  }

  paletteSelect.addEventListener('change', () => {
    activePaletteId = paletteSelect.value;
    renderCurrentPaletteSwatches();
  });

  function renderCurrentPaletteSwatches() {
    paletteSwatchesGrid.innerHTML = '';
    const activePal = currentPalettes.find(p => p.id === activePaletteId);
    if (!activePal || !activePal.colors || activePal.colors.length === 0) {
      paletteSwatchesGrid.innerHTML = '<span style="grid-column: span 6; font-size:11px; color:#64748B; text-align:center; padding:10px 0;">Palette is empty. Add colors using "+ Save to Palette".</span>';
      return;
    }

    activePal.colors.forEach(col => {
      const card = document.createElement('div');
      card.className = 'palette-swatch-card';
      card.style.backgroundColor = col.hex;
      card.title = `${col.name || 'Color'} (${col.hex})`;

      const btnDel = document.createElement('button');
      btnDel.className = 'btn-del-swatch';
      btnDel.textContent = '×';
      btnDel.title = 'Remove color';
      btnDel.addEventListener('click', async e => {
        e.stopPropagation();
        await removeColorFromPalette(activePaletteId, col.id);
        await refreshPalettesUI();
        showToast(`Removed ${col.hex}`);
      });

      card.appendChild(btnDel);

      card.addEventListener('click', () => {
        updateColor(col.hex, `Palette: ${activePal.name}`);
      });

      paletteSwatchesGrid.appendChild(card);
    });
  }

  // Create New Palette Button
  btnNewPalette.addEventListener('click', async () => {
    const name = prompt('Enter a name for the new palette:', 'My Palette');
    if (name && name.trim()) {
      const created = await createPalette(name.trim());
      activePaletteId = created.id;
      await refreshPalettesUI();
      showToast(`Created palette "${created.name}"`);
    }
  });

  // Save current active color to active palette
  btnSaveToActivePalette.addEventListener('click', async () => {
    if (!currentCanonical) return;
    if (!activePaletteId && currentPalettes.length > 0) {
      activePaletteId = currentPalettes[0].id;
    }
    if (!activePaletteId) {
      const created = await createPalette('My Palette');
      activePaletteId = created.id;
    }

    const added = await addColorToPalette(activePaletteId, {
      hex: currentCanonical.hex,
      name: `Color ${Date.now().toString().slice(-4)}`
    });

    if (added) {
      await refreshPalettesUI();
      showToast(`Saved ${currentCanonical.hex} to palette!`);
    }
  });

  // Export Active Palette
  btnExportPalette.addEventListener('click', async () => {
    const activePal = currentPalettes.find(p => p.id === activePaletteId);
    if (!activePal || !activePal.colors || activePal.colors.length === 0) {
      showToast('Palette has no colors to export', 'warning');
      return;
    }

    const cssVars = exportToCssVariables(activePal.colors, activePal.name.toLowerCase().replace(/\s+/g, '-'));
    await copyToClipboard(cssVars);
    showToast(`Copied ${activePal.colors.length} CSS Variables to clipboard!`);
  });

  // 13. Contrast Checker
  function updateContrastUI() {
    const fgVal = contrastFgInput.value.trim();
    const bgVal = contrastBgInput.value.trim();

    const result = evaluateContrast(fgVal, bgVal);

    contrastFgSwatch.style.backgroundColor = fgVal;
    contrastBgSwatch.style.backgroundColor = bgVal;

    contrastLiveCard.style.color = fgVal;
    contrastLiveCard.style.backgroundColor = bgVal;

    contrastRatioDisplay.textContent = result.ratioFormatted;

    // Badges update
    contrastOverallBadge.textContent = result.grade === 'FAIL' ? 'Fail' : `${result.grade} Contrast`;
    contrastOverallBadge.className = `contrast-badge ${result.grade === 'FAIL' ? 'fail' : 'pass'}`;

    updateCompItem(compAaNormal, result.aaNormal.pass);
    updateCompItem(compAaLarge, result.aaLarge.pass);
    updateCompItem(compAaaNormal, result.aaaNormal.pass);
    updateCompItem(compAaaLarge, result.aaaLarge.pass);
  }

  function updateCompItem(elem, isPass) {
    if (!elem) return;
    const badge = elem.querySelector('.comp-status');
    if (badge) {
      badge.textContent = isPass ? 'Pass ✓' : 'Fail ✗';
      badge.className = `comp-status ${isPass ? 'pass' : 'fail'}`;
    }
  }

  contrastFgInput.addEventListener('input', updateContrastUI);
  contrastBgInput.addEventListener('input', updateContrastUI);

  btnSwapContrast.addEventListener('click', () => {
    const temp = contrastFgInput.value;
    contrastFgInput.value = contrastBgInput.value;
    contrastBgInput.value = temp;
    updateContrastUI();
  });

  // 14. Harmonies Generator
  function updateHarmoniesUI(canonical) {
    if (!canonical) return;
    const harmonies = getAllHarmonies(canonical);

    // Complementary
    renderHarmonyRow(harmonyComplementary, harmonies.complementary);
    // Analogous
    renderHarmonyRow(harmonyAnalogous, harmonies.analogous);
    // Triadic
    renderHarmonyRow(harmonyTriadic, harmonies.triadic);

    // Shades
    harmonyShades.innerHTML = '';
    harmonies.shades.forEach(({ step, color }) => {
      const box = document.createElement('div');
      box.className = 'harmony-shade-box';
      box.style.backgroundColor = color.hex;
      box.title = `${step}: ${color.hex}`;
      box.addEventListener('click', () => {
        updateColor(color.hex, `Shade ${step}`);
      });
      harmonyShades.appendChild(box);
    });
  }

  function renderHarmonyRow(container, colors) {
    container.innerHTML = '';
    colors.forEach(col => {
      const sw = document.createElement('div');
      sw.className = 'harmony-swatch';
      sw.style.backgroundColor = col.hex;
      sw.title = col.hex;
      sw.addEventListener('click', () => {
        updateColor(col.hex, 'Harmony');
      });
      container.appendChild(sw);
    });
  }

  // 15. Settings & Dashboard Links
  btnSettingsLink?.addEventListener('click', () => {
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
      chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html#settings') });
    } else {
      window.location.href = 'dashboard.html#settings';
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPopup);
} else {
  initPopup();
}
