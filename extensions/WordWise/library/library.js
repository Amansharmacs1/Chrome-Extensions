/**
 * WordWise - Vocabulary Library Controller
 */

import { getVocabulary, updateWord, deleteWord, getStreakData, importData } from '../services/storage-service.js';
import { getDueWords, formatNextReviewRelative } from '../flashcards/scheduler.js';
import { exportToJSON, exportToCSV, exportToMarkdown, validateImportPayload, triggerDownload } from '../services/export-service.js';
import { playPronunciation } from '../services/audio-service.js';

let fullVocab = [];
let activeEditingWord = null;
let pendingImportPayload = null;
let isFavoritesOnly = false;

document.addEventListener('DOMContentLoaded', async () => {
  initLibrary();
});

async function initLibrary() {
  bindToolbarEvents();
  bindModalEvents();
  bindImportEvents();
  await refreshLibrary();
}

/**
 * Reloads all vocabulary, recomputes metrics, and updates grid
 */
async function refreshLibrary() {
  fullVocab = await getVocabulary();
  await updateSummaryMetrics();
  populateTagFilterOptions();
  renderFilteredWords();
}

/**
 * Computes and displays dashboard metrics
 */
async function updateSummaryMetrics() {
  const total = fullVocab.length;
  const due = getDueWords(fullVocab).length;
  const mastered = fullVocab.filter(w => w.status === 'mastered').length;
  const streak = await getStreakData();

  const totalEl = document.getElementById('metricTotalWords');
  const dueEl = document.getElementById('metricDueToday');
  const masteredEl = document.getElementById('metricMastered');
  const streakEl = document.getElementById('metricStreak');

  if (totalEl) totalEl.textContent = total;
  if (dueEl) dueEl.textContent = due;
  if (masteredEl) masteredEl.textContent = mastered;
  if (streakEl) streakEl.textContent = `🔥 ${streak.currentStreak}`;
}

/**
 * Collects all unique tags across saved words and updates select options
 */
function populateTagFilterOptions() {
  const select = document.getElementById('filterTag');
  if (!select) return;

  const currentVal = select.value;
  const tagSet = new Set();
  fullVocab.forEach(item => {
    if (Array.isArray(item.tags)) {
      item.tags.forEach(t => {
        const clean = t.trim().toLowerCase();
        if (clean) tagSet.add(clean);
      });
    }
  });

  select.innerHTML = '<option value="all">All Tags</option>';
  Array.from(tagSet).sort().forEach(tag => {
    const opt = document.createElement('option');
    opt.value = tag;
    opt.textContent = `#${tag}`;
    select.appendChild(opt);
  });

  if (tagSet.has(currentVal)) {
    select.value = currentVal;
  }
}

/**
 * Filters, sorts, and renders vocabulary cards
 */
function renderFilteredWords() {
  const query = document.getElementById('libSearchInput')?.value.trim().toLowerCase() || '';
  const statusFilter = document.getElementById('filterStatus')?.value || 'all';
  const tagFilter = document.getElementById('filterTag')?.value || 'all';
  const sortOrder = document.getElementById('sortOrder')?.value || 'newest';

  let list = [...fullVocab];

  // 1. Text Search Filter
  if (query) {
    list = list.filter(item => {
      const w = (item.word || '').toLowerCase();
      const defs = Array.isArray(item.definitions) ? item.definitions.join(' ').toLowerCase() : '';
      const notes = (item.notes || '').toLowerCase();
      const tags = Array.isArray(item.tags) ? item.tags.join(' ').toLowerCase() : '';
      return w.includes(query) || defs.includes(query) || notes.includes(query) || tags.includes(query);
    });
  }

  // 2. Status Filter
  if (statusFilter !== 'all') {
    list = list.filter(item => item.status === statusFilter);
  }

  // 3. Tag Filter
  if (tagFilter !== 'all') {
    list = list.filter(item => Array.isArray(item.tags) && item.tags.map(t => t.toLowerCase()).includes(tagFilter));
  }

  // 4. Favorites Filter
  if (isFavoritesOnly) {
    list = list.filter(item => item.isFavorite);
  }

  // 5. Sorting
  list.sort((a, b) => {
    if (sortOrder === 'alpha_asc') {
      return (a.word || '').localeCompare(b.word || '');
    }
    if (sortOrder === 'alpha_desc') {
      return (b.word || '').localeCompare(a.word || '');
    }
    if (sortOrder === 'due_soonest') {
      const aDate = a.sm2?.nextReviewDate || 0;
      const bDate = b.sm2?.nextReviewDate || 0;
      return aDate - bDate;
    }
    // Default: 'newest'
    return (b.dateAdded || 0) - (a.dateAdded || 0);
  });

  // Render Grid
  const grid = document.getElementById('wordsGrid');
  const emptyState = document.getElementById('emptyVocabState');
  const countEl = document.getElementById('resultsCount');

  if (countEl) {
    countEl.textContent = `Showing ${list.length} of ${fullVocab.length} words`;
  }

  if (list.length === 0) {
    if (grid) grid.innerHTML = '';
    if (emptyState) emptyState.hidden = false;
    return;
  }

  if (emptyState) emptyState.hidden = true;
  if (!grid) return;

  grid.innerHTML = '';
  list.forEach(item => {
    const card = document.createElement('article');
    card.className = 'word-card';

    const def = Array.isArray(item.definitions) && item.definitions.length > 0
      ? item.definitions[0]
      : (item.definition || 'No definition saved.');

    const dueRelative = formatNextReviewRelative(item.sm2?.nextReviewDate);

    card.innerHTML = `
      <div>
        <div class="card-header-row">
          <div class="card-title-group">
            <h3 class="card-word-title">${escapeHtml(item.displayWord || item.word)}</h3>
            <div class="card-meta-line">
              <span class="card-pos">${escapeHtml(item.partOfSpeech || 'word')}</span>
              ${item.phonetic ? `<span class="card-phonetic">${escapeHtml(item.phonetic)}</span>` : ''}
            </div>
          </div>
          <button class="card-fav-btn ${item.isFavorite ? 'active' : ''}" data-id="${item.id}" title="Toggle Favorite">
            ★
          </button>
        </div>
        <p class="card-definition" style="margin-top: 10px;">${escapeHtml(def)}</p>
      </div>

      <div>
        ${Array.isArray(item.tags) && item.tags.length > 0 ? `
          <div class="card-tags-row" style="margin-bottom: 8px;">
            ${item.tags.map(t => `<span class="tag-pill">#${escapeHtml(t)}</span>`).join('')}
          </div>
        ` : ''}

        <div class="card-footer-row">
          <span class="status-badge ${item.status || 'learning'}">${escapeHtml(item.status || 'learning')}</span>
          <span>${dueRelative}</span>
        </div>
      </div>
    `;

    // Click on card opens edit modal
    card.addEventListener('click', (e) => {
      if (e.target.closest('.card-fav-btn')) return;
      openWordDetailModal(item);
    });

    // Toggle favorite button
    const favBtn = card.querySelector('.card-fav-btn');
    favBtn?.addEventListener('click', async (e) => {
      e.stopPropagation();
      const updatedFav = !item.isFavorite;
      await updateWord(item.id, { isFavorite: updatedFav });
      item.isFavorite = updatedFav;
      favBtn.classList.toggle('active', updatedFav);
      if (isFavoritesOnly && !updatedFav) {
        renderFilteredWords();
      }
    });

    grid.appendChild(card);
  });
}

/**
 * Opens Word Detail and Edit Modal
 * @param {object} item
 */
function openWordDetailModal(item) {
  activeEditingWord = item;

  const modal = document.getElementById('wordModal');
  const nameEl = document.getElementById('modalWordName');
  const phoneticEl = document.getElementById('modalPhonetic');
  const defsEl = document.getElementById('modalDefinitionsList');
  const notesInput = document.getElementById('modalInputNotes');
  const exInput = document.getElementById('modalInputExample');
  const tagsInput = document.getElementById('modalInputTags');
  const statusSelect = document.getElementById('modalSelectStatus');
  const favCheck = document.getElementById('modalCheckFavorite');
  const sm2Box = document.getElementById('modalSm2Info');
  const audioBtn = document.getElementById('btnModalAudio');

  if (nameEl) nameEl.textContent = item.displayWord || item.word;
  if (phoneticEl) phoneticEl.textContent = item.phonetic || '';

  if (defsEl) {
    const defs = Array.isArray(item.definitions) ? item.definitions : [item.definition];
    defsEl.innerHTML = defs.map((d, i) => `<div><strong>${i + 1}.</strong> ${escapeHtml(d)}</div>`).join('');
  }

  if (notesInput) notesInput.value = item.notes || '';
  if (exInput) exInput.value = item.customExample || '';
  if (tagsInput) tagsInput.value = Array.isArray(item.tags) ? item.tags.join(', ') : '';
  if (statusSelect) statusSelect.value = item.status || 'learning';
  if (favCheck) favCheck.checked = Boolean(item.isFavorite);

  if (sm2Box) {
    const sm2 = item.sm2 || {};
    const nextDate = sm2.nextReviewDate ? new Date(sm2.nextReviewDate).toLocaleDateString() : 'Today';
    sm2Box.innerHTML = `
      <strong>Repetitions:</strong> ${sm2.repetitions || 0} &nbsp;|&nbsp;
      <strong>Interval:</strong> ${sm2.interval || 1}d &nbsp;|&nbsp;
      <strong>Next:</strong> ${nextDate}
    `;
  }

  if (audioBtn) {
    audioBtn.onclick = () => {
      playPronunciation({
        audioUrl: item.audioUrl,
        word: item.word
      });
    };
  }

  if (modal) modal.hidden = false;
}

function closeWordDetailModal() {
  activeEditingWord = null;
  const modal = document.getElementById('wordModal');
  if (modal) modal.hidden = true;
}

/**
 * Saves edits made in the detail modal
 */
async function saveWordModalEdits() {
  if (!activeEditingWord) return;

  const notes = document.getElementById('modalInputNotes')?.value.trim() || '';
  const customExample = document.getElementById('modalInputExample')?.value.trim() || '';
  const rawTags = document.getElementById('modalInputTags')?.value || '';
  const tags = rawTags.split(',').map(t => t.trim().toLowerCase()).filter(t => t.length > 0);
  const status = document.getElementById('modalSelectStatus')?.value || 'learning';
  const isFavorite = Boolean(document.getElementById('modalCheckFavorite')?.checked);

  const res = await updateWord(activeEditingWord.id, {
    notes,
    customExample,
    tags,
    status,
    isFavorite
  });

  if (res.success) {
    closeWordDetailModal();
    await refreshLibrary();
  }
}

/**
 * Deletes word from library
 */
async function deleteWordFromModal() {
  if (!activeEditingWord) return;
  const wordName = activeEditingWord.displayWord || activeEditingWord.word;
  const confirmed = confirm(`Are you sure you want to remove "${wordName}" from your vocabulary library?`);
  if (!confirmed) return;

  await deleteWord(activeEditingWord.id);
  closeWordDetailModal();
  await refreshLibrary();
}

/**
 * Toolbar & Filter bindings
 */
function bindToolbarEvents() {
  const searchInput = document.getElementById('libSearchInput');
  const statusSelect = document.getElementById('filterStatus');
  const tagSelect = document.getElementById('filterTag');
  const sortSelect = document.getElementById('sortOrder');
  const favToggleBtn = document.getElementById('btnFilterFavorite');

  searchInput?.addEventListener('input', renderFilteredWords);
  statusSelect?.addEventListener('change', renderFilteredWords);
  tagSelect?.addEventListener('change', renderFilteredWords);
  sortSelect?.addEventListener('change', renderFilteredWords);

  favToggleBtn?.addEventListener('click', () => {
    isFavoritesOnly = !isFavoritesOnly;
    favToggleBtn.classList.toggle('active', isFavoritesOnly);
    renderFilteredWords();
  });

  // Export buttons
  document.getElementById('btnExportJson')?.addEventListener('click', () => {
    const json = exportToJSON(fullVocab);
    triggerDownload(json, 'wordwise-vocabulary.json', 'application/json');
  });

  document.getElementById('btnExportCsv')?.addEventListener('click', () => {
    const csv = exportToCSV(fullVocab);
    triggerDownload(csv, 'wordwise-vocabulary.csv', 'text/csv');
  });

  document.getElementById('btnExportMd')?.addEventListener('click', () => {
    const md = exportToMarkdown(fullVocab);
    triggerDownload(md, 'wordwise-vocabulary.md', 'text/markdown');
  });
}

function bindModalEvents() {
  document.getElementById('btnModalClose')?.addEventListener('click', closeWordDetailModal);
  document.getElementById('btnModalCancel')?.addEventListener('click', closeWordDetailModal);
  document.getElementById('btnModalSave')?.addEventListener('click', saveWordModalEdits);
  document.getElementById('btnModalDelete')?.addEventListener('click', deleteWordFromModal);

  // Close on backdrop click
  document.getElementById('wordModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'wordModal') closeWordDetailModal();
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeWordDetailModal();
      closeImportModal();
    }
  });
}

/**
 * Import Backup modal and file drop management
 */
function bindImportEvents() {
  const openBtn = document.getElementById('btnOpenImportModal');
  const closeBtn = document.getElementById('btnImportClose');
  const cancelBtn = document.getElementById('btnImportCancel');
  const fileInput = document.getElementById('importFileInput');
  const dropArea = document.getElementById('dropArea');
  const executeBtn = document.getElementById('btnExecuteImport');

  openBtn?.addEventListener('click', openImportModal);
  closeBtn?.addEventListener('click', closeImportModal);
  cancelBtn?.addEventListener('click', closeImportModal);

  dropArea?.addEventListener('click', () => fileInput?.click());

  dropArea?.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropArea.style.borderColor = '#8B5CF6';
  });

  dropArea?.addEventListener('dragleave', () => {
    dropArea.style.borderColor = '';
  });

  dropArea?.addEventListener('drop', (e) => {
    e.preventDefault();
    dropArea.style.borderColor = '';
    const file = e.dataTransfer.files[0];
    if (file) handleSelectedFile(file);
  });

  fileInput?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleSelectedFile(file);
  });

  executeBtn?.addEventListener('click', async () => {
    if (!pendingImportPayload) return;
    executeBtn.disabled = true;
    executeBtn.textContent = 'Importing...';

    const mode = document.getElementById('selectImportMode')?.value || 'merge';
    const res = await importData(pendingImportPayload, mode);

    if (res.success) {
      alert(`Import complete! Added ${res.importedCount} words (${res.duplicateCount} duplicates skipped).`);
      closeImportModal();
      await refreshLibrary();
    } else {
      alert(`Import failed: ${res.error || 'Unknown error'}`);
      executeBtn.disabled = false;
      executeBtn.textContent = 'Import Words';
    }
  });
}

function openImportModal() {
  pendingImportPayload = null;
  const modal = document.getElementById('importModal');
  const previewBox = document.getElementById('importPreviewBox');
  const executeBtn = document.getElementById('btnExecuteImport');
  const fileInput = document.getElementById('importFileInput');

  if (fileInput) fileInput.value = '';
  if (previewBox) previewBox.hidden = true;
  if (executeBtn) executeBtn.disabled = true;
  if (modal) modal.hidden = false;
}

function closeImportModal() {
  const modal = document.getElementById('importModal');
  if (modal) modal.hidden = true;
}

function handleSelectedFile(file) {
  if (!file.name.endsWith('.json')) {
    alert('Please select a valid .json file.');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const parsed = JSON.parse(e.target.result);
      const validation = validateImportPayload(parsed, fullVocab);

      if (!validation.isValid) {
        alert(validation.error || 'No valid words found in file.');
        return;
      }

      pendingImportPayload = parsed;

      const previewBox = document.getElementById('importPreviewBox');
      const newBadge = document.getElementById('previewNewCount');
      const dupBadge = document.getElementById('previewDupCount');
      const executeBtn = document.getElementById('btnExecuteImport');

      if (previewBox) previewBox.hidden = false;
      if (newBadge) newBadge.textContent = `+${validation.newCount} New Words`;
      if (dupBadge) dupBadge.textContent = `${validation.duplicateCount} Duplicates (Skipped)`;
      if (executeBtn) executeBtn.disabled = false;
    } catch (err) {
      alert('Error parsing JSON file: ' + err.message);
    }
  };
  reader.readAsText(file);
}

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
