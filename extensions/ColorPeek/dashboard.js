/**
 * ColorPeek - Dashboard Workstation Controller
 * Full-screen studio for color fine-tuning, palette management, multi-format code exports,
 * gradient building, and accessibility contrast evaluations.
 */

import { parseColor, buildCanonical, hslToRgb, rgbToHsl } from './scripts/color-converter.js';
import { evaluateContrast } from './scripts/contrast-checker.js';
import {
  getPalettes,
  savePalettes,
  createPalette,
  renamePalette,
  deletePalette,
  addColorToPalette,
  removeColorFromPalette,
  getActiveColor,
  setActiveColor
} from './scripts/palette-manager.js';
import {
  exportToCssVariables,
  exportToScssVariables,
  exportToTailwindConfig,
  exportToHexList,
  exportToJson,
  generateCssGradient
} from './scripts/css-exporter.js';
import { copyToClipboard, showToast } from './scripts/utils.js';

let allPalettes = [];
let activePalette = null;
let studioCanonical = null;

let currentExportFormat = 'css';
let gradientAngle = 90;
let gradientType = 'linear';

async function initDashboard() {
  // DOM Elements
  const palettesNavList = document.getElementById('palettesNavList');
  const btnNewPaletteSidebar = document.getElementById('btnNewPaletteSidebar');
  const btnExportAllJson = document.getElementById('btnExportAllJson');
  const btnImportJson = document.getElementById('btnImportJson');
  const importFileInput = document.getElementById('importFileInput');

  const currentPaletteTitle = document.getElementById('currentPaletteTitle');
  const paletteColorCountBadge = document.getElementById('paletteColorCountBadge');
  const btnRenamePalette = document.getElementById('btnRenamePalette');
  const btnDeletePalette = document.getElementById('btnDeletePalette');

  const studioColorPreview = document.getElementById('studioColorPreview');
  const studioHexInput = document.getElementById('studioHexInput');
  const btnAddStudioColorToPal = document.getElementById('btnAddStudioColorToPal');

  // Sliders
  const sliderR = document.getElementById('sliderR');
  const sliderG = document.getElementById('sliderG');
  const sliderB = document.getElementById('sliderB');
  const sliderH = document.getElementById('sliderH');
  const sliderS = document.getElementById('sliderS');
  const sliderL = document.getElementById('sliderL');

  const sliderValR = document.getElementById('sliderValR');
  const sliderValG = document.getElementById('sliderValG');
  const sliderValB = document.getElementById('sliderValB');
  const sliderValH = document.getElementById('sliderValH');
  const sliderValS = document.getElementById('sliderValS');
  const sliderValL = document.getElementById('sliderValL');

  const dashboardPaletteGrid = document.getElementById('dashboardPaletteGrid');

  // Code Export
  const exportTabs = document.querySelectorAll('.export-tab');
  const exportCodeOutput = document.getElementById('exportCodeOutput');
  const codeLanguageLabel = document.getElementById('codeLanguageLabel');
  const btnCopyExportCode = document.getElementById('btnCopyExportCode');

  // Gradient
  const gradientLivePreview = document.getElementById('gradientLivePreview');
  const gradientAngleSlider = document.getElementById('gradientAngleSlider');
  const angleValText = document.getElementById('angleValText');
  const gradientTypeButtons = document.querySelectorAll('.type-btn');
  const btnCopyGradientCss = document.getElementById('btnCopyGradientCss');

  // Contrast Matrix
  const matrixFgSelect = document.getElementById('matrixFgSelect');
  const matrixBgSelect = document.getElementById('matrixBgSelect');
  const matrixLiveCard = document.getElementById('matrixLiveCard');
  const matrixResultsBar = document.getElementById('matrixResultsBar');

  // 1. Initial State Load
  const initialHex = await getActiveColor();
  setStudioColor(initialHex);

  allPalettes = await getPalettes();
  if (allPalettes.length > 0) {
    activePalette = allPalettes[0];
  }

  renderSidebarPalettes();
  renderPaletteWorkspace();

  // 2. Studio Color Synchronizers
  function setStudioColor(colorInput) {
    const parsed = parseColor(colorInput);
    if (!parsed) return;
    studioCanonical = parsed;

    studioColorPreview.style.backgroundColor = parsed.hex;
    studioHexInput.value = parsed.hex.replace(/^#/, '');

    // Sync sliders
    sliderR.value = parsed.r;
    sliderG.value = parsed.g;
    sliderB.value = parsed.b;
    sliderH.value = parsed.h;
    sliderS.value = parsed.s;
    sliderL.value = parsed.l;

    sliderValR.textContent = parsed.r;
    sliderValG.textContent = parsed.g;
    sliderValB.textContent = parsed.b;
    sliderValH.textContent = `${parsed.h}°`;
    sliderValS.textContent = `${parsed.s}%`;
    sliderValL.textContent = `${parsed.l}%`;

    setActiveColor(parsed.hex);
  }

  // RGB Sliders Handler
  function onRgbSliderChange() {
    const r = parseInt(sliderR.value, 10);
    const g = parseInt(sliderG.value, 10);
    const b = parseInt(sliderB.value, 10);
    const canonical = buildCanonical(r, g, b, 1);
    setStudioColor(canonical.hex);
  }

  sliderR.addEventListener('input', onRgbSliderChange);
  sliderG.addEventListener('input', onRgbSliderChange);
  sliderB.addEventListener('input', onRgbSliderChange);

  // HSL Sliders Handler
  function onHslSliderChange() {
    const h = parseInt(sliderH.value, 10);
    const s = parseInt(sliderS.value, 10);
    const l = parseInt(sliderL.value, 10);
    const rgb = hslToRgb(h, s, l);
    const canonical = buildCanonical(rgb.r, rgb.g, rgb.b, 1);
    setStudioColor(canonical.hex);
  }

  sliderH.addEventListener('input', onHslSliderChange);
  sliderS.addEventListener('input', onHslSliderChange);
  sliderL.addEventListener('input', onHslSliderChange);

  // Hex Text Input Handler
  studioHexInput.addEventListener('input', e => {
    const raw = '#' + e.target.value.trim().replace(/^#/, '');
    const parsed = parseColor(raw);
    if (parsed) {
      setStudioColor(parsed.hex);
    }
  });

  // Add Studio Color to Current Palette
  btnAddStudioColorToPal.addEventListener('click', async () => {
    if (!activePalette || !studioCanonical) return;
    await addColorToPalette(activePalette.id, {
      hex: studioCanonical.hex,
      name: `Color ${activePalette.colors.length + 1}`
    });
    allPalettes = await getPalettes();
    activePalette = allPalettes.find(p => p.id === activePalette.id) || allPalettes[0];
    renderSidebarPalettes();
    renderPaletteWorkspace();
    showToast(`Added ${studioCanonical.hex} to ${activePalette.name}!`);
  });

  // 3. Sidebar Palette Navigation
  function renderSidebarPalettes() {
    palettesNavList.innerHTML = '';

    allPalettes.forEach(pal => {
      const item = document.createElement('div');
      item.className = `palette-nav-item ${activePalette && activePalette.id === pal.id ? 'active' : ''}`;

      const left = document.createElement('div');
      left.className = 'nav-item-left';

      // Mini swatch slice preview
      const swatchPreview = document.createElement('div');
      swatchPreview.className = 'nav-swatch-preview';
      const colors = (pal.colors || []).slice(0, 4);
      if (colors.length > 0) {
        colors.forEach(c => {
          const slice = document.createElement('div');
          slice.className = 'nav-swatch-slice';
          slice.style.backgroundColor = c.hex;
          swatchPreview.appendChild(slice);
        });
      } else {
        swatchPreview.style.backgroundColor = '#1E293B';
      }

      const title = document.createElement('span');
      title.className = 'nav-palette-title';
      title.textContent = pal.name;

      left.appendChild(swatchPreview);
      left.appendChild(title);

      const count = document.createElement('span');
      count.className = 'nav-palette-count';
      count.textContent = `${pal.colors ? pal.colors.length : 0}`;

      item.appendChild(left);
      item.appendChild(count);

      item.addEventListener('click', () => {
        activePalette = pal;
        renderSidebarPalettes();
        renderPaletteWorkspace();
      });

      palettesNavList.appendChild(item);
    });
  }

  // New Palette from Sidebar
  btnNewPaletteSidebar.addEventListener('click', async () => {
    const name = prompt('Enter a name for the new palette:', 'Brand Palette');
    if (name && name.trim()) {
      const created = await createPalette(name.trim());
      allPalettes = await getPalettes();
      activePalette = created;
      renderSidebarPalettes();
      renderPaletteWorkspace();
      showToast(`Created palette "${created.name}"`);
    }
  });

  // 4. Palette Workspace Rendering
  function renderPaletteWorkspace() {
    if (!activePalette) return;

    currentPaletteTitle.textContent = activePalette.name;
    const count = activePalette.colors ? activePalette.colors.length : 0;
    paletteColorCountBadge.textContent = `${count} ${count === 1 ? 'color' : 'colors'}`;

    renderColorCardsGrid();
    renderExportCode();
    renderGradientPreview();
    renderContrastMatrix();
  }

  // Rename & Delete Palette Handlers
  btnRenamePalette.addEventListener('click', async () => {
    if (!activePalette) return;
    const newName = prompt('Rename palette:', activePalette.name);
    if (newName && newName.trim()) {
      await renamePalette(activePalette.id, newName.trim());
      allPalettes = await getPalettes();
      activePalette = allPalettes.find(p => p.id === activePalette.id);
      renderSidebarPalettes();
      renderPaletteWorkspace();
      showToast('Palette renamed');
    }
  });

  btnDeletePalette.addEventListener('click', async () => {
    if (!activePalette) return;
    if (allPalettes.length <= 1) {
      alert('You must keep at least one palette.');
      return;
    }
    if (confirm(`Delete palette "${activePalette.name}"?`)) {
      await deletePalette(activePalette.id);
      allPalettes = await getPalettes();
      activePalette = allPalettes[0];
      renderSidebarPalettes();
      renderPaletteWorkspace();
      showToast('Palette deleted');
    }
  });

  // 5. Color Cards Grid
  function renderColorCardsGrid() {
    dashboardPaletteGrid.innerHTML = '';
    const colors = activePalette.colors || [];

    if (colors.length === 0) {
      dashboardPaletteGrid.innerHTML = `
        <div style="grid-column: 1 / -1; background: var(--bg-card); border:1px dashed var(--border-subtle); border-radius:10px; padding:30px; text-align:center; color:#94A3B8;">
          <p style="font-weight:600; margin-bottom:4px;">This palette is currently empty.</p>
          <span style="font-size:12px;">Pick colors using the Color Studio above or the ColorPeek popup to populate this collection.</span>
        </div>
      `;
      return;
    }

    colors.forEach(col => {
      const card = document.createElement('div');
      card.className = 'palette-item-card';

      // Top Swatch
      const topSwatch = document.createElement('div');
      topSwatch.className = 'card-swatch-top';
      topSwatch.style.backgroundColor = col.hex;
      topSwatch.title = 'Click to inspect in Color Studio';
      topSwatch.addEventListener('click', () => {
        setStudioColor(col.hex);
        showToast(`Loaded ${col.hex} in Studio`);
      });

      // Card Body
      const body = document.createElement('div');
      body.className = 'card-body';

      // Color Name Input
      const nameInput = document.createElement('input');
      nameInput.className = 'card-name-input';
      nameInput.value = col.name || 'Untitled';
      nameInput.title = 'Edit color name';
      nameInput.addEventListener('change', async () => {
        col.name = nameInput.value.trim() || 'Untitled';
        await savePalettes(allPalettes);
        renderExportCode();
      });

      // Color Code Row (HEX + Copy)
      const codeRow = document.createElement('div');
      codeRow.className = 'card-code-row';
      codeRow.innerHTML = `<span>${col.hex}</span>`;

      const btnCopy = document.createElement('button');
      btnCopy.className = 'card-btn-copy';
      btnCopy.textContent = 'Copy';
      btnCopy.addEventListener('click', async e => {
        e.stopPropagation();
        await copyToClipboard(col.hex);
        showToast(`Copied ${col.hex}`);
      });
      codeRow.appendChild(btnCopy);

      // Note Input
      const noteInput = document.createElement('input');
      noteInput.className = 'card-note-input';
      noteInput.placeholder = 'Add note (e.g. Header bg)...';
      noteInput.value = col.note || '';
      noteInput.addEventListener('change', async () => {
        col.note = noteInput.value.trim();
        await savePalettes(allPalettes);
      });

      // Delete action
      const actionsRow = document.createElement('div');
      actionsRow.className = 'card-actions-row';

      const btnDel = document.createElement('button');
      btnDel.className = 'btn-card-del';
      btnDel.textContent = 'Remove';
      btnDel.addEventListener('click', async () => {
        await removeColorFromPalette(activePalette.id, col.id);
        allPalettes = await getPalettes();
        activePalette = allPalettes.find(p => p.id === activePalette.id);
        renderSidebarPalettes();
        renderPaletteWorkspace();
        showToast(`Removed ${col.hex}`);
      });

      actionsRow.appendChild(btnDel);

      body.appendChild(nameInput);
      body.appendChild(codeRow);
      body.appendChild(noteInput);
      body.appendChild(actionsRow);

      card.appendChild(topSwatch);
      card.appendChild(body);
      dashboardPaletteGrid.appendChild(card);
    });
  }

  // 6. Code Export Center
  exportTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      exportTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentExportFormat = tab.dataset.export;
      renderExportCode();
    });
  });

  function renderExportCode() {
    if (!activePalette) return;
    const colors = activePalette.colors || [];
    let code = '';

    switch (currentExportFormat) {
      case 'css':
        codeLanguageLabel.textContent = 'CSS Custom Properties';
        code = exportToCssVariables(colors, activePalette.name.toLowerCase().replace(/\s+/g, '-'));
        break;
      case 'scss':
        codeLanguageLabel.textContent = 'SCSS / SASS Variables';
        code = exportToScssVariables(colors);
        break;
      case 'tailwind':
        codeLanguageLabel.textContent = 'Tailwind CSS Config';
        code = exportToTailwindConfig(colors, activePalette.name);
        break;
      case 'hex':
        codeLanguageLabel.textContent = 'Plain HEX List';
        code = exportToHexList(colors);
        break;
      case 'json':
        codeLanguageLabel.textContent = 'JSON Tokens';
        code = exportToJson(activePalette);
        break;
      default:
        code = exportToCssVariables(colors);
    }

    exportCodeOutput.textContent = code;
  }

  btnCopyExportCode.addEventListener('click', async () => {
    const code = exportCodeOutput.textContent;
    if (code) {
      await copyToClipboard(code);
      showToast('Export code copied to clipboard!');
    }
  });

  // 7. Gradient Studio
  function renderGradientPreview() {
    if (!activePalette) return;
    const colors = activePalette.colors || [];
    const cssGradient = generateCssGradient(colors, gradientType, gradientAngle);
    gradientLivePreview.style.background = cssGradient;
  }

  gradientAngleSlider.addEventListener('input', e => {
    gradientAngle = parseInt(e.target.value, 10);
    angleValText.textContent = `${gradientAngle}°`;
    renderGradientPreview();
  });

  gradientTypeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      gradientTypeButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      gradientType = btn.dataset.gtype;
      renderGradientPreview();
    });
  });

  btnCopyGradientCss.addEventListener('click', async () => {
    const colors = activePalette.colors || [];
    const cssGradient = generateCssGradient(colors, gradientType, gradientAngle);
    await copyToClipboard(`background: ${cssGradient};`);
    showToast('Copied CSS gradient snippet!');
  });

  // 8. Contrast Evaluation Matrix
  function renderContrastMatrix() {
    if (!activePalette) return;
    const colors = activePalette.colors || [];

    matrixFgSelect.innerHTML = '<option value="#FFFFFF">Pure White (#FFFFFF)</option><option value="#000000">Pure Black (#000000)</option>';
    matrixBgSelect.innerHTML = '<option value="#0F172A">Dark Canvas (#0F172A)</option><option value="#FFFFFF">White Surface (#FFFFFF)</option>';

    colors.forEach(c => {
      const opt1 = document.createElement('option');
      opt1.value = c.hex;
      opt1.textContent = `${c.name || 'Color'} (${c.hex})`;
      matrixFgSelect.appendChild(opt1);

      const opt2 = document.createElement('option');
      opt2.value = c.hex;
      opt2.textContent = `${c.name || 'Color'} (${c.hex})`;
      matrixBgSelect.appendChild(opt2);
    });

    if (colors.length > 0) {
      matrixBgSelect.value = colors[0].hex;
    }

    updateMatrixEvaluation();
  }

  function updateMatrixEvaluation() {
    const fg = matrixFgSelect.value;
    const bg = matrixBgSelect.value;

    matrixLiveCard.style.color = fg;
    matrixLiveCard.style.backgroundColor = bg;

    const res = evaluateContrast(fg, bg);

    matrixResultsBar.innerHTML = `
      <div style="display:flex; align-items:center; gap:14px;">
        <span style="font-size:12px; color:#94A3B8; text-transform:uppercase; font-weight:700;">Contrast Ratio</span>
        <span style="font-family:var(--font-mono); font-size:20px; font-weight:800; color:#FFFFFF;">${res.ratioFormatted}</span>
        <span class="contrast-badge ${res.grade === 'FAIL' ? 'fail' : 'pass'}">${res.grade} Compliance</span>
      </div>
      <div style="display:flex; gap:16px; font-size:12px;">
        <span>AA Normal: <b style="color:${res.aaNormal.pass ? '#34D399' : '#F87171'};">${res.aaNormal.pass ? 'Pass ✓' : 'Fail ✗'}</b></span>
        <span>AA Large: <b style="color:${res.aaLarge.pass ? '#34D399' : '#F87171'};">${res.aaLarge.pass ? 'Pass ✓' : 'Fail ✗'}</b></span>
        <span>AAA Normal: <b style="color:${res.aaaNormal.pass ? '#34D399' : '#F87171'};">${res.aaaNormal.pass ? 'Pass ✓' : 'Fail ✗'}</b></span>
      </div>
    `;
  }

  matrixFgSelect.addEventListener('change', updateMatrixEvaluation);
  matrixBgSelect.addEventListener('change', updateMatrixEvaluation);

  // 9. Export All JSON Backup
  btnExportAllJson.addEventListener('click', () => {
    const backup = {
      version: 1,
      exportedAt: new Date().toISOString(),
      palettes: allPalettes
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `colorpeek-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Exported ColorPeek JSON backup!');
  });

  // 10. Import JSON Backup
  btnImportJson.addEventListener('click', () => {
    importFileInput.click();
  });

  importFileInput.addEventListener('change', async e => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      let importedList = [];
      if (Array.isArray(parsed.palettes)) {
        importedList = parsed.palettes;
      } else if (Array.isArray(parsed.colors)) {
        importedList = [parsed];
      }

      if (importedList.length > 0) {
        // Merge with existing
        allPalettes = [...importedList, ...allPalettes];
        await savePalettes(allPalettes);
        activePalette = allPalettes[0];
        renderSidebarPalettes();
        renderPaletteWorkspace();
        showToast(`Successfully imported ${importedList.length} palettes!`);
      } else {
        showToast('Invalid palette backup structure', 'error');
      }
    } catch (err) {
      showToast('Error reading JSON file', 'error');
    }
    importFileInput.value = '';
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDashboard);
} else {
  initDashboard();
}
