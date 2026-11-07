/**
 * FontLens - Workstation Dashboard Controller
 * Manages typography presets, favorite fonts, saved comparison studios,
 * recent history, and extension preferences with full local persistence.
 */

import {
  getPresets,
  savePreset,
  deletePreset,
  getFavorites,
  toggleFavorite,
  getRecentFonts,
  clearRecentFonts,
  getSavedComparisons,
  deleteComparison,
  getUserSettings,
  saveUserSettings,
  deleteAllData
} from '../scripts/storage.js';
import { createPreset } from '../scripts/presets.js';
import { GOOGLE_FONTS_CATALOG } from '../scripts/google-fonts-data.js';
import { generateCSSRule } from '../scripts/css-export.js';

let currentSettings = null;
let currentPresets = [];
let currentFavorites = [];
let currentComparisons = [];
let currentHistory = [];

async function initDashboard() {
  currentSettings = await getUserSettings();
  setupNavigation();
  setupPresetsSection();
  setupFavoritesSection();
  setupComparisonsSection();
  setupHistorySection();
  setupSettingsSection();

  // Load initial tab data
  await refreshPresets();
  await refreshFavorites();
  await refreshComparisons();
  await refreshHistory();
}

/**
 * 1. Navigation Tab Switching
 */
function setupNavigation() {
  const navButtons = document.querySelectorAll('.nav-item');
  const panels = document.querySelectorAll('.tab-panel');

  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-tab');
      navButtons.forEach(b => b.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const targetPanel = document.getElementById(targetId);
      if (targetPanel) {
        targetPanel.classList.add('active');
      }
    });
  });
}

/**
 * 2. Presets Manager
 */
function setupPresetsSection() {
  const btnOpenModal = document.getElementById('btnOpenNewPresetModal');
  const modal = document.getElementById('presetModal');
  const btnCloseModal = document.getElementById('btnPresetModalClose');
  const btnCancelModal = document.getElementById('btnCancelPresetModal');
  const presetForm = document.getElementById('presetForm');
  const modalTitle = document.getElementById('presetModalTitle');
  const presetIdField = document.getElementById('presetIdField');

  const nameInput = document.getElementById('presetNameField');
  const categorySelect = document.getElementById('presetCategoryField');
  const familyInput = document.getElementById('presetFamilyField');
  const sizeInput = document.getElementById('presetSizeField');
  const weightSelect = document.getElementById('presetWeightField');
  const lineHeightInput = document.getElementById('presetLineHeightField');
  const letterSpacingInput = document.getElementById('presetLetterSpacingField');
  const modalPreview = document.getElementById('modalPreviewText');

  const btnExport = document.getElementById('btnExportPresets');
  const btnImport = document.getElementById('btnImportPresets');
  const importFileInput = document.getElementById('importPresetFile');

  function updateModalPreview() {
    modalPreview.style.fontFamily = familyInput.value || 'sans-serif';
    modalPreview.style.fontSize = sizeInput.value || '24px';
    modalPreview.style.fontWeight = weightSelect.value || '400';
    modalPreview.style.lineHeight = lineHeightInput.value || '1.4';
    modalPreview.style.letterSpacing = letterSpacingInput.value || 'normal';
  }

  [familyInput, sizeInput, weightSelect, lineHeightInput, letterSpacingInput].forEach(elem => {
    elem.addEventListener('input', updateModalPreview);
  });

  function openPresetModal(presetToEdit = null) {
    if (presetToEdit) {
      modalTitle.textContent = 'Edit Custom Preset';
      presetIdField.value = presetToEdit.id;
      nameInput.value = presetToEdit.name;
      categorySelect.value = presetToEdit.category || 'Editorial';
      familyInput.value = presetToEdit.properties?.fontFamily || '';
      sizeInput.value = presetToEdit.properties?.fontSize || '24px';
      weightSelect.value = presetToEdit.properties?.fontWeight || '400';
      lineHeightInput.value = presetToEdit.properties?.lineHeight || '1.4';
      letterSpacingInput.value = presetToEdit.properties?.letterSpacing || 'normal';
    } else {
      modalTitle.textContent = 'Create Typography Preset';
      presetIdField.value = '';
      nameInput.value = '';
      categorySelect.value = 'Editorial';
      familyInput.value = "'Inter', sans-serif";
      sizeInput.value = '20px';
      weightSelect.value = '500';
      lineHeightInput.value = '1.5';
      letterSpacingInput.value = '0px';
    }
    updateModalPreview();
    modal.classList.remove('hidden');
  }

  function closePresetModal() {
    modal.classList.add('hidden');
    presetForm.reset();
  }

  btnOpenModal.addEventListener('click', () => openPresetModal(null));
  btnCloseModal.addEventListener('click', closePresetModal);
  btnCancelModal.addEventListener('click', closePresetModal);

  presetForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = presetIdField.value;
    const name = nameInput.value.trim();
    const category = categorySelect.value;
    const props = {
      fontFamily: familyInput.value.trim(),
      fontSize: sizeInput.value.trim(),
      fontWeight: weightSelect.value,
      lineHeight: lineHeightInput.value.trim(),
      letterSpacing: letterSpacingInput.value.trim(),
      color: '#F8FAFC'
    };

    try {
      if (id) {
        // Update existing custom preset
        await savePreset({
          id,
          name,
          category,
          properties: props,
          isBuiltIn: false
        });
        showToast(`Preset "${name}" updated successfully!`);
      } else {
        // Create new
        const newPreset = createPreset(name, props, category);
        await savePreset(newPreset);
        showToast(`Preset "${name}" created successfully!`);
      }
      closePresetModal();
      await refreshPresets();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // Export Presets
  btnExport.addEventListener('click', async () => {
    const presets = await getPresets();
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(presets, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `fontlens-presets-${Date.now()}.json`);
    dlAnchor.click();
    showToast('Presets exported successfully!');
  });

  // Import Presets
  btnImport.addEventListener('click', () => {
    importFileInput.value = '';
    importFileInput.click();
  });

  importFileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) {
        throw new Error('Imported JSON must be an array of preset objects.');
      }

      let importedCount = 0;
      for (const item of parsed) {
        if (item && item.name && item.properties) {
          const cleanItem = {
            ...item,
            id: item.id || `preset_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            isBuiltIn: false
          };
          await savePreset(cleanItem);
          importedCount++;
        }
      }

      showToast(`Successfully imported ${importedCount} preset(s)!`);
      await refreshPresets();
    } catch (err) {
      showToast(`Import failed: ${err.message}`, 'error');
    }
  });

  window.__editPreset = (presetId) => {
    const p = currentPresets.find(x => x.id === presetId);
    if (p) openPresetModal(p);
  };

  window.__deletePreset = async (presetId) => {
    if (confirm('Are you sure you want to delete this custom preset?')) {
      try {
        await deletePreset(presetId);
        showToast('Preset deleted.');
        await refreshPresets();
      } catch (err) {
        showToast(err.message, 'error');
      }
    }
  };
}

async function refreshPresets() {
  currentPresets = await getPresets();
  const grid = document.getElementById('presetsGrid');
  grid.innerHTML = '';

  if (currentPresets.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🎨</div>
        <div class="empty-title">No Presets Found</div>
        <div class="empty-desc">Create your first typography preset formula or click "Import" to load presets.</div>
      </div>
    `;
    return;
  }

  currentPresets.forEach(preset => {
    const card = document.createElement('div');
    card.className = 'dash-card';

    const p = preset.properties || {};
    const sampleText = currentSettings?.defaultSampleText || 'Sphinx of black quartz, judge my vow.';

    card.innerHTML = `
      <div class="card-top">
        <h3 class="card-title">${escapeHtml(preset.name)}</h3>
        <span class="card-badge ${preset.isBuiltIn ? '' : 'custom'}">${preset.isBuiltIn ? 'Built-in' : 'Custom'}</span>
      </div>

      <div class="card-specimen" style="
        font-family: ${escapeHtml(p.fontFamily || 'sans-serif')};
        font-size: ${escapeHtml(p.fontSize || '18px')};
        font-weight: ${escapeHtml(p.fontWeight || '400')};
        line-height: ${escapeHtml(p.lineHeight || '1.4')};
        letter-spacing: ${escapeHtml(p.letterSpacing || 'normal')};
      ">
        ${escapeHtml(sampleText)}
      </div>

      <div class="card-props-list">
        <div class="card-prop-item">
          <span class="card-prop-key">Family:</span>
          <span class="card-prop-val">${escapeHtml(p.fontFamily || '-')}</span>
        </div>
        <div class="card-prop-item">
          <span class="card-prop-key">Size / Weight:</span>
          <span class="card-prop-val">${escapeHtml(p.fontSize || '-')} / ${escapeHtml(p.fontWeight || '-')}</span>
        </div>
        <div class="card-prop-item">
          <span class="card-prop-key">Line Height:</span>
          <span class="card-prop-val">${escapeHtml(p.lineHeight || '-')}</span>
        </div>
      </div>

      <div class="card-bottom-actions">
        <button class="btn btn-secondary btn-copy-css" title="Copy CSS Rule">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
          Copy CSS
        </button>

        ${!preset.isBuiltIn ? `
          <div style="display: flex; gap: 6px;">
            <button class="btn btn-secondary" onclick="__editPreset('${preset.id}')" title="Edit Preset">Edit</button>
            <button class="btn btn-danger-outline" onclick="__deletePreset('${preset.id}')" title="Delete Preset">Delete</button>
          </div>
        ` : ''}
      </div>
    `;

    card.querySelector('.btn-copy-css').addEventListener('click', (e) => {
      const css = generateCSSRule(`.${preset.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`, {
        fontFamily: p.fontFamily,
        fontSize: p.fontSize,
        fontWeight: p.fontWeight,
        lineHeight: p.lineHeight,
        letterSpacing: p.letterSpacing,
        color: p.color
      });
      navigator.clipboard.writeText(css);
      const btn = e.currentTarget;
      const originalText = btn.innerHTML;
      btn.innerHTML = '<span>Copied!</span>';
      setTimeout(() => { btn.innerHTML = originalText; }, 1400);
      showToast(`Copied CSS for ${preset.name}`);
    });

    grid.appendChild(card);
  });
}

/**
 * 3. Favorites Manager
 */
function setupFavoritesSection() {
  const searchInput = document.getElementById('favSearchInput');
  searchInput.addEventListener('input', () => {
    renderFavoritesList(searchInput.value.trim().toLowerCase());
  });
}

async function refreshFavorites() {
  currentFavorites = await getFavorites();
  const countPill = document.getElementById('favCountPill');
  if (countPill) countPill.textContent = currentFavorites.length;
  renderFavoritesList();
}

function renderFavoritesList(filterQuery = '') {
  const grid = document.getElementById('favoritesGrid');
  grid.innerHTML = '';

  let filtered = currentFavorites;
  if (filterQuery) {
    filtered = currentFavorites.filter(name => name.toLowerCase().includes(filterQuery));
  }

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⭐</div>
        <div class="empty-title">No Favorite Fonts</div>
        <div class="empty-desc">
          ${filterQuery ? 'No favorites match your search.' : 'You have not favorited any fonts yet. Click below to add sample fonts from our Google Fonts library!'}
        </div>
        ${!filterQuery ? `
          <div style="margin-top: 16px; display: flex; gap: 8px; justify-content: center;">
            <button id="btnAddSampleFavs" class="btn btn-secondary">Add Inter, Roboto & Playfair Display</button>
          </div>
        ` : ''}
      </div>
    `;

    const btnSample = document.getElementById('btnAddSampleFavs');
    if (btnSample) {
      btnSample.addEventListener('click', async () => {
        await toggleFavorite('Inter');
        await toggleFavorite('Roboto');
        await toggleFavorite('Playfair Display');
        showToast('Added sample favorites!');
        await refreshFavorites();
      });
    }
    return;
  }

  filtered.forEach(fontName => {
    const card = document.createElement('div');
    card.className = 'dash-card';

    // Check if in Google Fonts catalog
    const catalogEntry = GOOGLE_FONTS_CATALOG.find(f => (f.family || f.name).toLowerCase() === fontName.toLowerCase());
    const category = catalogEntry ? catalogEntry.category : 'General';
    const sampleText = currentSettings?.defaultSampleText || 'The quick brown fox jumps over the lazy dog.';

    card.innerHTML = `
      <div class="card-top">
        <h3 class="card-title">${escapeHtml(fontName)}</h3>
        <span class="card-badge">${escapeHtml(category)}</span>
      </div>

      <div class="card-specimen" style="font-family: '${escapeHtml(fontName)}', sans-serif; font-size: 20px;">
        ${escapeHtml(sampleText)}
      </div>

      <div class="card-props-list">
        <div class="card-prop-item">
          <span class="card-prop-key">CSS declaration:</span>
          <span class="card-prop-val">font-family: "${escapeHtml(fontName)}", sans-serif;</span>
        </div>
      </div>

      <div class="card-bottom-actions">
        <button class="btn btn-secondary btn-copy-font" title="Copy font-family">
          Copy Family
        </button>
        <div style="display: flex; gap: 6px;">
          <a href="../comparison/comparison.html?font=${encodeURIComponent(fontName)}" target="_blank" class="btn btn-secondary" title="Open in Font Studio">
            Studio
          </a>
          <button class="btn btn-danger-outline btn-remove-fav" title="Remove from Favorites">
            Remove
          </button>
        </div>
      </div>
    `;

    card.querySelector('.btn-copy-font').addEventListener('click', (e) => {
      navigator.clipboard.writeText(`font-family: "${fontName}", sans-serif;`);
      const btn = e.currentTarget;
      btn.textContent = 'Copied!';
      setTimeout(() => { btn.textContent = 'Copy Family'; }, 1400);
      showToast(`Copied font-family for ${fontName}`);
    });

    card.querySelector('.btn-remove-fav').addEventListener('click', async () => {
      await toggleFavorite(fontName);
      showToast(`Removed ${fontName} from favorites.`);
      await refreshFavorites();
    });

    grid.appendChild(card);
  });
}

/**
 * 4. Saved Comparisons Manager
 */
function setupComparisonsSection() {
  // Setup hooks if any
}

async function refreshComparisons() {
  currentComparisons = await getSavedComparisons();
  const countPill = document.getElementById('compCountPill');
  if (countPill) countPill.textContent = currentComparisons.length;

  const grid = document.getElementById('comparisonsGrid');
  grid.innerHTML = '';

  if (currentComparisons.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📊</div>
        <div class="empty-title">No Saved Comparison Studios</div>
        <div class="empty-desc">You haven't saved any font comparison workspaces yet. Open Font Comparison Studio to create and save one.</div>
        <div style="margin-top: 16px;">
          <a href="../comparison/comparison.html" target="_blank" class="btn btn-primary">Launch Font Studio</a>
        </div>
      </div>
    `;
    return;
  }

  currentComparisons.forEach(comp => {
    const card = document.createElement('div');
    card.className = 'dash-card';

    const fontsList = (comp.fonts || []).map(f => f.fontFamily || f.name).filter(Boolean);
    const dateStr = comp.updatedAt ? new Date(comp.updatedAt).toLocaleDateString() : 'Recent';

    card.innerHTML = `
      <div class="card-top">
        <h3 class="card-title">${escapeHtml(comp.title || 'Untitled Studio')}</h3>
        <span class="card-badge">${dateStr}</span>
      </div>

      <div class="card-props-list" style="margin: 8px 0;">
        <div class="card-prop-item">
          <span class="card-prop-key">Compared Fonts:</span>
          <span class="card-prop-val">${escapeHtml(fontsList.join(', ') || 'Default Fonts')}</span>
        </div>
        <div class="card-prop-item">
          <span class="card-prop-key">Sample Text:</span>
          <span class="card-prop-val">${escapeHtml((comp.sampleText || '').substring(0, 30))}...</span>
        </div>
      </div>

      <div class="card-bottom-actions">
        <a href="../comparison/comparison.html?snapshot=${encodeURIComponent(comp.id)}" target="_blank" class="btn btn-primary">
          Launch Studio
        </a>
        <button class="btn btn-danger-outline btn-delete-comp">
          Delete
        </button>
      </div>
    `;

    card.querySelector('.btn-delete-comp').addEventListener('click', async () => {
      if (confirm(`Delete saved studio "${comp.title}"?`)) {
        await deleteComparison(comp.id);
        showToast('Comparison studio deleted.');
        await refreshComparisons();
      }
    });

    grid.appendChild(card);
  });
}

/**
 * 5. Recent History
 */
function setupHistorySection() {
  const btnClear = document.getElementById('btnClearHistoryBtn');
  btnClear.addEventListener('click', async () => {
    if (confirm('Clear all recently inspected fonts history?')) {
      await clearRecentFonts();
      showToast('History cleared.');
      await refreshHistory();
    }
  });
}

async function refreshHistory() {
  currentHistory = await getRecentFonts();
  const countPill = document.getElementById('recentCountPill');
  if (countPill) countPill.textContent = currentHistory.length;

  const container = document.getElementById('historyTableContainer');
  container.innerHTML = '';

  if (currentHistory.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🕒</div>
        <div class="empty-title">No Recent Inspection History</div>
        <div class="empty-desc">Use FontLens in-page inspector or scanner on any website to automatically record inspected typefaces.</div>
      </div>
    `;
    return;
  }

  const table = document.createElement('table');
  table.className = 'history-table';
  table.innerHTML = `
    <thead>
      <tr>
        <th>Font Family</th>
        <th>Source Domain</th>
        <th>Inspected Time</th>
        <th style="text-align: right;">Actions</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  const tbody = table.querySelector('tbody');

  currentHistory.forEach(item => {
    const tr = document.createElement('tr');
    const timeFormatted = item.timestamp ? new Date(item.timestamp).toLocaleString() : '-';

    tr.innerHTML = `
      <td>
        <div class="history-font-name">${escapeHtml(item.fontName)}</div>
      </td>
      <td>
        <span class="history-domain">${escapeHtml(item.url || 'Direct Webpage')}</span>
      </td>
      <td>
        <span class="history-time">${timeFormatted}</span>
      </td>
      <td style="text-align: right;">
        <button class="btn btn-secondary btn-copy-font" style="padding: 4px 10px; font-size: 11px;">
          Copy CSS
        </button>
        <button class="btn btn-secondary btn-fav-font" style="padding: 4px 10px; font-size: 11px;">
          ★ Fav
        </button>
      </td>
    `;

    tr.querySelector('.btn-copy-font').addEventListener('click', (e) => {
      navigator.clipboard.writeText(`font-family: "${item.fontName}", sans-serif;`);
      const btn = e.currentTarget;
      btn.textContent = 'Copied!';
      setTimeout(() => { btn.textContent = 'Copy CSS'; }, 1200);
      showToast(`Copied font-family for ${item.fontName}`);
    });

    tr.querySelector('.btn-fav-font').addEventListener('click', async () => {
      const isFavNow = await toggleFavorite(item.fontName);
      showToast(isFavNow ? `Added ${item.fontName} to favorites!` : `Removed ${item.fontName} from favorites.`);
      await refreshFavorites();
    });

    tbody.appendChild(tr);
  });

  container.appendChild(table);
}

/**
 * 6. Settings Section
 */
function setupSettingsSection() {
  const form = document.getElementById('settingsForm');
  const sampleInput = document.getElementById('settingSampleText');
  const highlightColorInput = document.getElementById('settingHighlightColor');
  const highlightColorPicker = document.getElementById('settingHighlightColorPicker');
  const hoverTooltipsSwitch = document.getElementById('settingHoverTooltips');
  const autoPinSwitch = document.getElementById('settingAutoPin');
  const contrastBadgesSwitch = document.getElementById('settingContrastBadges');
  const scanLimitInput = document.getElementById('settingScanLimit');
  const btnPurgeAll = document.getElementById('btnPurgeAllData');

  // Populate from current settings
  if (currentSettings) {
    sampleInput.value = currentSettings.defaultSampleText || '';
    highlightColorInput.value = currentSettings.highlightColor || '#8B5CF6';
    highlightColorPicker.value = currentSettings.highlightColor || '#8B5CF6';
    hoverTooltipsSwitch.checked = Boolean(currentSettings.enableHoverTooltips);
    autoPinSwitch.checked = Boolean(currentSettings.autoPinOnInspect);
    contrastBadgesSwitch.checked = Boolean(currentSettings.enableContrastBadges);
    scanLimitInput.value = currentSettings.scanDepthLimit || 1500;
  }

  highlightColorPicker.addEventListener('input', () => {
    highlightColorInput.value = highlightColorPicker.value;
  });

  highlightColorInput.addEventListener('input', () => {
    if (/^#[0-9A-Fa-f]{6}$/.test(highlightColorInput.value)) {
      highlightColorPicker.value = highlightColorInput.value;
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const updated = {
      defaultSampleText: sampleInput.value.trim() || 'The quick brown fox jumps over the lazy dog.',
      highlightColor: highlightColorInput.value.trim() || '#8B5CF6',
      enableHoverTooltips: hoverTooltipsSwitch.checked,
      autoPinOnInspect: autoPinSwitch.checked,
      enableContrastBadges: contrastBadgesSwitch.checked,
      scanDepthLimit: parseInt(scanLimitInput.value, 10) || 1500
    };

    currentSettings = await saveUserSettings(updated);
    showToast('Preferences saved successfully!');
    await refreshPresets();
    await refreshFavorites();
  });

  btnPurgeAll.addEventListener('click', async () => {
    const confirmation = prompt('Type "RESET" to erase all FontLens presets, bookmarks, and settings:');
    if (confirmation === 'RESET') {
      await deleteAllData();
      showToast('All FontLens data has been cleared.');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } else if (confirmation !== null) {
      showToast('Reset canceled. Text did not match.', 'error');
    }
  });
}

/**
 * Toast Notification System
 */
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.25s ease';
    setTimeout(() => toast.remove(), 250);
  }, 2800);
}

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

document.addEventListener('DOMContentLoaded', initDashboard);
