/**
 * WebNotes — Dashboard Script
 * 
 * Full notes library: search, filter, sort, edit, import/export, settings.
 */

import {
  initializeStorage, getAllNotes, getAllHighlights, getAllTags,
  updateNote, deleteNote, toggleFavorite, togglePin,
  deleteHighlight, updateHighlightNote, getSettings, updateSettings,
  resetAllData, createNote, saveNote, STORAGE_KEYS, storageGet, storageSet
} from './scripts/storage.js';
import { normalizeUrl, extractDomain, formatUrlForDisplay } from './scripts/url-utils.js';
import { searchNotes, searchHighlights, filterNotes, sortNotes } from './scripts/search.js';
import { createExportData, getBackupFilename, downloadJson, parseImportFile, mergeNotes, mergeHighlights } from './scripts/export-import.js';

// ============================================================
// State
// ============================================================

let allNotes = [];
let allHighlights = [];
let allTags = [];
let settings = {};
let currentView = 'all-notes';
let currentSearch = '';
let currentSort = 'updatedAt';
let currentSortOrder = 'desc';
let currentTagFilter = '';
let editingNoteId = null;
let confirmCallback = null;
let importData = null;
let importMode = 'merge';

// ============================================================
// Initialization
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
  await initializeStorage();
  settings = await getSettings();
  
  applySettings();
  await refreshData();
  setupEventListeners();
  handleUrlParams();
});

function handleUrlParams() {
  const params = new URLSearchParams(window.location.search);
  
  if (params.get('action') === 'new-note') {
    const url = params.get('url') || '';
    const title = params.get('title') || '';
    openNewNoteModal(url, title);
  }

  if (params.get('filter')) {
    const filter = params.get('filter');
    const navBtn = document.querySelector(`[data-view="${filter}"]`);
    if (navBtn) navBtn.click();
  }

  if (params.get('search')) {
    document.getElementById('search-input').value = params.get('search');
    currentSearch = params.get('search');
    renderCurrentView();
  }
}

// ============================================================
// Data
// ============================================================

async function refreshData() {
  allNotes = await getAllNotes();
  allHighlights = await getAllHighlights();
  allTags = await getAllTags();
  
  updateSidebarCounts();
  renderTags();
  renderCurrentView();
  updateStorageInfo();
}

function updateSidebarCounts() {
  document.getElementById('nav-all-count').textContent = allNotes.length;
  document.getElementById('nav-quotes-count').textContent = allHighlights.length;
  document.getElementById('nav-fav-count').textContent = allNotes.filter(n => n.isFavorite).length;
  document.getElementById('nav-page-count').textContent = allNotes.filter(n => n.scope === 'page').length;
  document.getElementById('nav-domain-count').textContent = allNotes.filter(n => n.scope === 'domain').length;
}

function renderTags() {
  const container = document.getElementById('nav-tags');
  if (allTags.length === 0) {
    container.innerHTML = '<div style="padding: 4px 0; font-size: 11px; color: var(--text-tertiary);">No tags yet</div>';
    return;
  }

  container.innerHTML = allTags.map(tag => `
    <button class="nav-tag-item${currentTagFilter === tag ? ' active' : ''}" data-tag="${escapeHtml(tag)}">
      <span class="nav-tag-dot"></span>
      ${escapeHtml(tag)}
    </button>
  `).join('');

  container.querySelectorAll('.nav-tag-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const tag = btn.dataset.tag;
      if (currentTagFilter === tag) {
        currentTagFilter = '';
        btn.classList.remove('active');
      } else {
        container.querySelectorAll('.nav-tag-item').forEach(b => b.classList.remove('active'));
        currentTagFilter = tag;
        btn.classList.add('active');
      }
      switchView('all-notes');
      renderCurrentView();
    });
  });
}

// ============================================================
// Rendering
// ============================================================

function renderCurrentView() {
  // Hide all views
  document.querySelectorAll('.view-panel').forEach(v => v.classList.remove('active'));

  if (currentView === 'settings') {
    document.getElementById('view-settings').classList.add('active');
    document.getElementById('toolbar-title').textContent = 'Settings';
    return;
  }

  if (currentView === 'quotes') {
    document.getElementById('view-quotes').classList.add('active');
    document.getElementById('toolbar-title').textContent = 'Saved Quotes';
    renderQuotes();
    return;
  }

  // Notes views
  document.getElementById('view-all-notes').classList.add('active');
  
  let notes = [...allNotes];
  let title = 'All Notes';

  // Apply view filter
  switch (currentView) {
    case 'favorites':
      notes = filterNotes(notes, { favoritesOnly: true });
      title = 'Favorites';
      break;
    case 'page-notes':
      notes = filterNotes(notes, { scope: 'page' });
      title = 'Page Notes';
      break;
    case 'domain-notes':
      notes = filterNotes(notes, { scope: 'domain' });
      title = 'Domain Notes';
      break;
  }

  // Apply tag filter
  if (currentTagFilter) {
    notes = filterNotes(notes, { tag: currentTagFilter });
    title += ` · #${currentTagFilter}`;
  }

  // Apply search
  if (currentSearch) {
    notes = searchNotes(notes, currentSearch);
  }

  // Apply sort
  notes = sortNotes(notes, currentSort, currentSortOrder);

  document.getElementById('toolbar-title').textContent = `${title} (${notes.length})`;
  
  renderNotesGrid(notes);
}

function renderNotesGrid(notes) {
  const grid = document.getElementById('notes-grid');
  const empty = document.getElementById('notes-empty');
  const emptyTitle = document.getElementById('empty-title');
  const emptyDesc = document.getElementById('empty-desc');

  if (notes.length === 0) {
    grid.innerHTML = '';
    empty.style.display = 'flex';
    
    if (currentSearch) {
      emptyTitle.textContent = 'No results found';
      emptyDesc.textContent = `No notes match "${currentSearch}". Try a different search term.`;
    } else if (currentTagFilter) {
      emptyTitle.textContent = 'No tagged notes';
      emptyDesc.textContent = `No notes with the tag "${currentTagFilter}".`;
    } else if (currentView === 'favorites') {
      emptyTitle.textContent = 'No favorites';
      emptyDesc.textContent = 'Star notes you want to find quickly.';
    } else {
      emptyTitle.textContent = 'No notes yet';
      emptyDesc.textContent = 'Start by creating your first note using the popup on any webpage.';
    }
    return;
  }

  empty.style.display = 'none';
  grid.innerHTML = notes.map(note => createDashboardNoteCard(note)).join('');
}

function createDashboardNoteCard(note) {
  const title = escapeHtml(note.title);
  const body = escapeHtml(note.body);
  const scopeClass = note.scope === 'domain' ? 'domain' : 'page';
  const scopeLabel = note.scope === 'domain' ? 'Domain' : 'Page';
  const pinnedClass = note.isPinned ? ' pinned' : '';
  const favIcon = note.isFavorite ? '<span class="d-note-fav" title="Favorite">★</span>' : '';
  const sourceDisplay = note.pageTitle ? escapeHtml(note.pageTitle) : formatUrlForDisplay(note.pageUrl || note.domain, 45);
  const sourceUrl = note.pageUrl || '';
  const time = settings.showTimestamps ? formatDate(note.updatedAt || note.createdAt) : '';

  const tags = (note.tags || []).map(t => 
    `<span class="d-note-tag">${escapeHtml(t)}</span>`
  ).join('');

  return `
    <div class="d-note-card${pinnedClass}" data-note-id="${note.id}">
      <div class="d-note-card-header">
        <div class="d-note-title">${title || body.substring(0, 60) || 'Untitled'}</div>
        <div class="d-note-actions">
          <button class="icon-btn" data-action="pin" data-id="${note.id}" title="${note.isPinned ? 'Unpin' : 'Pin'}">
            <svg viewBox="0 0 16 16" fill="${note.isPinned ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
              <path d="M9.5 2L14 6.5L10.5 10L11 13.5L8 10.5L2.5 13L5.5 10L6 6.5Z"/>
            </svg>
          </button>
          <button class="icon-btn" data-action="favorite" data-id="${note.id}" title="${note.isFavorite ? 'Unfavorite' : 'Favorite'}">
            <svg viewBox="0 0 16 16" fill="${note.isFavorite ? '#f5a623' : 'none'}" stroke="${note.isFavorite ? '#f5a623' : 'currentColor'}" stroke-width="1.5">
              <path d="M8 2l1.8 3.6L14 6.2l-3 2.9.7 4.1L8 11.3 4.3 13.2l.7-4.1-3-2.9 4.2-.6z"/>
            </svg>
          </button>
          <button class="icon-btn" data-action="edit" data-id="${note.id}" title="Edit">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
              <path d="M11 2l3 3-8.5 8.5H2.5v-3L11 2z"/>
            </svg>
          </button>
          <button class="icon-btn" data-action="delete" data-id="${note.id}" title="Delete">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
              <path d="M3 4h10M6 4V3h4v1M5 4v9h6V4"/>
            </svg>
          </button>
        </div>
      </div>
      ${title && body ? `<div class="d-note-body">${body}</div>` : ''}
      ${sourceUrl ? `
        <div class="d-note-source">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
            <path d="M6 2.5h-3v11h10v-3"/>
            <path d="M9 2.5h4.5v4.5"/>
            <line x1="13.5" y1="2.5" x2="7" y2="9"/>
          </svg>
          <span class="d-note-source-text">
            <a class="d-note-source-link" data-action="open-url" data-url="${escapeHtml(sourceUrl)}" title="${escapeHtml(sourceUrl)}">${sourceDisplay}</a>
          </span>
        </div>
      ` : note.domain ? `
        <div class="d-note-source">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
            <circle cx="8" cy="8" r="6"/>
            <ellipse cx="8" cy="8" rx="3" ry="6"/>
            <line x1="2" y1="8" x2="14" y2="8"/>
          </svg>
          <span class="d-note-source-text">${escapeHtml(note.domain)}</span>
        </div>
      ` : ''}
      <div class="d-note-meta">
        <span class="d-note-scope ${scopeClass}">${scopeLabel}</span>
        ${favIcon}
        ${time ? `<span class="d-note-time">${time}</span>` : ''}
        ${tags ? `<div class="d-note-tags">${tags}</div>` : ''}
      </div>
    </div>
  `;
}

function renderQuotes() {
  let highlights = [...allHighlights];
  
  if (currentSearch) {
    highlights = searchHighlights(highlights, currentSearch);
  }

  // Sort by creation time descending
  highlights.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const grid = document.getElementById('quotes-grid');
  const empty = document.getElementById('quotes-empty');

  document.getElementById('toolbar-title').textContent = `Saved Quotes (${highlights.length})`;

  if (highlights.length === 0) {
    grid.innerHTML = '';
    empty.style.display = 'flex';
    return;
  }

  empty.style.display = 'none';
  grid.innerHTML = highlights.map(h => createDashboardHighlightCard(h)).join('');
}

function createDashboardHighlightCard(h) {
  const text = escapeHtml(h.selectedText);
  const note = h.userNote ? escapeHtml(h.userNote) : '';
  const sourceDisplay = h.sourceTitle ? escapeHtml(h.sourceTitle) : formatUrlForDisplay(h.sourceUrl, 50);
  const time = formatDate(h.createdAt);

  return `
    <div class="d-highlight-card" data-highlight-id="${h.id}">
      <div class="d-highlight-text">${text}</div>
      ${note ? `<div class="d-highlight-user-note">${note}</div>` : ''}
      <div class="d-highlight-meta">
        <div class="d-highlight-source">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
            <path d="M6 2.5h-3v11h10v-3"/>
            <path d="M9 2.5h4.5v4.5"/>
            <line x1="13.5" y1="2.5" x2="7" y2="9"/>
          </svg>
          <span class="d-highlight-source-text">
            <a class="d-note-source-link" data-action="open-url" data-url="${escapeHtml(h.sourceUrl)}">${sourceDisplay}</a>
            · ${time}
          </span>
        </div>
        <div class="d-highlight-actions">
          <button class="icon-btn" data-action="open-url" data-url="${escapeHtml(h.sourceUrl)}" title="Open source">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M6 2.5h-3v11h10v-3"/>
              <path d="M9 2.5h4.5v4.5"/>
              <line x1="13.5" y1="2.5" x2="7" y2="9"/>
            </svg>
          </button>
          <button class="icon-btn" data-action="delete-highlight" data-id="${h.id}" title="Delete">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
              <path d="M3 4h10M6 4V3h4v1M5 4v9h6V4"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  `;
}

// ============================================================
// Event Listeners
// ============================================================

function setupEventListeners() {
  // Sidebar navigation
  document.querySelectorAll('.nav-item[data-view]').forEach(btn => {
    btn.addEventListener('click', () => {
      currentTagFilter = '';
      document.querySelectorAll('.nav-tag-item').forEach(t => t.classList.remove('active'));
      switchView(btn.dataset.view);
    });
  });

  // Search
  const searchInput = document.getElementById('search-input');
  const searchClear = document.getElementById('search-clear');
  let searchTimeout;

  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    const val = searchInput.value.trim();
    searchClear.classList.toggle('visible', val.length > 0);
    
    searchTimeout = setTimeout(() => {
      currentSearch = val;
      renderCurrentView();
    }, 150);
  });

  searchClear.addEventListener('click', () => {
    searchInput.value = '';
    currentSearch = '';
    searchClear.classList.remove('visible');
    renderCurrentView();
    searchInput.focus();
  });

  // Sort
  document.getElementById('sort-select').addEventListener('change', (e) => {
    const [sort, order] = e.target.value.split('-');
    currentSort = sort;
    currentSortOrder = order;
    renderCurrentView();
  });

  // Note/highlight action delegation
  document.getElementById('content-area').addEventListener('click', handleContentAction);

  // Edit modal
  document.getElementById('modal-cancel').addEventListener('click', closeEditModal);
  document.getElementById('modal-save').addEventListener('click', handleEditSave);

  // New note modal
  document.getElementById('btn-new-note-sidebar').addEventListener('click', () => openNewNoteModal());
  document.getElementById('new-note-cancel').addEventListener('click', closeNewNoteModal);
  document.getElementById('new-note-save').addEventListener('click', handleNewNoteSave);

  // Settings
  document.getElementById('setting-confirm-delete').addEventListener('change', async (e) => {
    await updateSettings({ confirmBeforeDelete: e.target.checked });
    settings = await getSettings();
  });

  document.getElementById('setting-show-timestamps').addEventListener('change', async (e) => {
    await updateSettings({ showTimestamps: e.target.checked });
    settings = await getSettings();
    renderCurrentView();
  });

  // Export
  document.getElementById('btn-export').addEventListener('click', handleExport);

  // Import
  document.getElementById('btn-import').addEventListener('click', () => {
    document.getElementById('import-file-input').click();
  });

  document.getElementById('import-file-input').addEventListener('change', handleImportFileSelect);

  document.getElementById('import-cancel').addEventListener('click', closeImportModal);
  document.getElementById('import-confirm').addEventListener('click', handleImportConfirm);

  document.querySelectorAll('.import-mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.import-mode-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      importMode = btn.dataset.mode;
    });
  });

  // Reset all
  document.getElementById('btn-reset-all').addEventListener('click', () => {
    showConfirmDialog('Reset All Data', 'This will permanently delete ALL notes, quotes, and settings. Export a backup first if needed. This action cannot be undone.', async () => {
      await resetAllData();
      settings = await getSettings();
      applySettings();
      await refreshData();
      showToast('All data has been reset', 'success');
    });
  });

  // Confirm dialog
  document.getElementById('confirm-cancel').addEventListener('click', closeConfirmDialog);
  document.getElementById('confirm-ok').addEventListener('click', () => {
    if (confirmCallback) confirmCallback();
    closeConfirmDialog();
  });

  // Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeEditModal();
      closeNewNoteModal();
      closeImportModal();
      closeConfirmDialog();
    }
  });

  // Storage changes (sync with popup)
  if (typeof chrome !== 'undefined' && chrome.storage) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local') {
        refreshData();
      }
    });
  }
}

function switchView(viewId) {
  currentView = viewId;

  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === viewId);
  });

  renderCurrentView();
}

// ============================================================
// Content Actions
// ============================================================

function handleContentAction(e) {
  const actionEl = e.target.closest('[data-action]');
  if (!actionEl) return;

  const action = actionEl.dataset.action;
  const id = actionEl.dataset.id;
  const url = actionEl.dataset.url;

  switch (action) {
    case 'pin':
      handleTogglePin(id);
      break;
    case 'favorite':
      handleToggleFavorite(id);
      break;
    case 'edit':
      openEditModal(id);
      break;
    case 'delete':
      handleDeleteNote(id);
      break;
    case 'delete-highlight':
      handleDeleteHighlight(id);
      break;
    case 'open-url':
      if (url) {
        e.preventDefault();
        chrome.runtime.sendMessage({ type: 'OPEN_URL', url });
      }
      break;
  }
}

async function handleTogglePin(id) {
  await togglePin(id);
  await refreshData();
}

async function handleToggleFavorite(id) {
  await toggleFavorite(id);
  await refreshData();
}

function handleDeleteNote(id) {
  if (settings.confirmBeforeDelete) {
    showConfirmDialog('Delete Note', 'This note will be permanently deleted.', async () => {
      await deleteNote(id);
      await refreshData();
      showToast('Note deleted', 'success');
    });
  } else {
    deleteNote(id).then(() => {
      refreshData();
      showToast('Note deleted', 'success');
    });
  }
}

function handleDeleteHighlight(id) {
  if (settings.confirmBeforeDelete) {
    showConfirmDialog('Delete Quote', 'This saved quote will be permanently deleted.', async () => {
      await deleteHighlight(id);
      await refreshData();
      showToast('Quote deleted', 'success');
    });
  } else {
    deleteHighlight(id).then(() => {
      refreshData();
      showToast('Quote deleted', 'success');
    });
  }
}

// ============================================================
// Edit Modal
// ============================================================

function openEditModal(noteId) {
  editingNoteId = noteId;
  const note = allNotes.find(n => n.id === noteId);
  if (!note) return;

  document.getElementById('modal-title').textContent = 'Edit Note';
  document.getElementById('modal-edit-title').value = note.title || '';
  document.getElementById('modal-edit-body').value = note.body || '';
  document.getElementById('modal-edit-tags').value = (note.tags || []).join(', ');
  document.getElementById('edit-modal').classList.add('active');
  document.getElementById('modal-edit-title').focus();
}

function closeEditModal() {
  editingNoteId = null;
  document.getElementById('edit-modal').classList.remove('active');
}

async function handleEditSave() {
  if (!editingNoteId) return;

  const title = document.getElementById('modal-edit-title').value.trim();
  const body = document.getElementById('modal-edit-body').value.trim();
  const tagsStr = document.getElementById('modal-edit-tags').value;
  const tags = tagsStr ? tagsStr.split(',').map(t => t.trim()).filter(Boolean) : [];

  if (!body) {
    showToast('Note content is required', 'error');
    return;
  }

  try {
    await updateNote(editingNoteId, { title, body, tags });
    closeEditModal();
    await refreshData();
    showToast('Note updated', 'success');
  } catch {
    showToast('Failed to update note', 'error');
  }
}

// ============================================================
// New Note Modal
// ============================================================

function openNewNoteModal(url = '', pageTitle = '') {
  document.getElementById('new-note-title').value = '';
  document.getElementById('new-note-body').value = '';
  document.getElementById('new-note-url').value = url;
  document.getElementById('new-note-page-title').value = pageTitle;
  document.getElementById('new-note-tags').value = '';
  document.getElementById('new-note-scope').value = 'page';
  document.getElementById('new-note-modal').classList.add('active');
  document.getElementById('new-note-body').focus();
}

function closeNewNoteModal() {
  document.getElementById('new-note-modal').classList.remove('active');
}

async function handleNewNoteSave() {
  const title = document.getElementById('new-note-title').value.trim();
  const body = document.getElementById('new-note-body').value.trim();
  const scope = document.getElementById('new-note-scope').value;
  const url = document.getElementById('new-note-url').value.trim();
  const pageTitle = document.getElementById('new-note-page-title').value.trim();
  const tagsStr = document.getElementById('new-note-tags').value;
  const tags = tagsStr ? tagsStr.split(',').map(t => t.trim()).filter(Boolean) : [];

  if (!body) {
    showToast('Note content is required', 'error');
    return;
  }

  try {
    const note = createNote({
      title,
      body,
      scope,
      pageUrl: normalizeUrl(url) || url,
      domain: extractDomain(url) || '',
      pageTitle,
      tags
    });

    await saveNote(note);
    closeNewNoteModal();
    await refreshData();
    showToast('Note created!', 'success');
  } catch {
    showToast('Failed to create note', 'error');
  }
}

// ============================================================
// Import/Export
// ============================================================

async function handleExport() {
  try {
    const notes = await getAllNotes();
    const highlights = await getAllHighlights();
    const currentSettings = await getSettings();
    
    const data = createExportData(notes, highlights, currentSettings);
    const filename = getBackupFilename();
    downloadJson(data, filename);
    showToast(`Exported ${notes.length} notes and ${highlights.length} quotes`, 'success');
  } catch {
    showToast('Failed to export data', 'error');
  }
}

function handleImportFileSelect(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    const result = parseImportFile(event.target.result);
    
    if (!result.valid) {
      showToast(result.error, 'error');
      return;
    }

    importData = result;
    showImportModal(result.summary);
  };

  reader.readAsText(file);
  // Reset file input
  e.target.value = '';
}

function showImportModal(summary) {
  const content = document.getElementById('import-summary-content');
  content.innerHTML = `
    <div class="import-summary">
      <div class="import-summary-row">
        <span>Notes to import</span>
        <span class="value">${summary.validNotes}</span>
      </div>
      <div class="import-summary-row">
        <span>Quotes to import</span>
        <span class="value">${summary.validHighlights}</span>
      </div>
      ${summary.invalidNotes > 0 ? `
        <div class="import-summary-row">
          <span>Invalid notes (skipped)</span>
          <span class="value" style="color: var(--color-warning);">${summary.invalidNotes}</span>
        </div>
      ` : ''}
      ${summary.invalidHighlights > 0 ? `
        <div class="import-summary-row">
          <span>Invalid quotes (skipped)</span>
          <span class="value" style="color: var(--color-warning);">${summary.invalidHighlights}</span>
        </div>
      ` : ''}
      <div class="import-summary-row">
        <span>Backup date</span>
        <span class="value">${formatDate(summary.exportedAt)}</span>
      </div>
      <div class="import-summary-row">
        <span>Schema version</span>
        <span class="value">v${summary.schemaVersion}</span>
      </div>
    </div>
  `;

  document.getElementById('import-mode-select').style.display = 'flex';
  document.getElementById('import-confirm').disabled = false;
  importMode = 'merge';
  document.querySelectorAll('.import-mode-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('import-merge').classList.add('active');
  
  document.getElementById('import-modal').classList.add('active');
}

function closeImportModal() {
  importData = null;
  document.getElementById('import-modal').classList.remove('active');
}

async function handleImportConfirm() {
  if (!importData || !importData.valid) return;

  try {
    if (importMode === 'replace') {
      // Replace all data
      await storageSet({
        [STORAGE_KEYS.NOTES]: importData.data.notes,
        [STORAGE_KEYS.HIGHLIGHTS]: importData.data.highlights
      });
      
      showToast(`Replaced data with ${importData.data.notes.length} notes and ${importData.data.highlights.length} quotes`, 'success');
    } else {
      // Merge
      const existingNotes = await getAllNotes();
      const existingHighlights = await getAllHighlights();

      const notesResult = mergeNotes(existingNotes, importData.data.notes);
      const highlightsResult = mergeHighlights(existingHighlights, importData.data.highlights);

      await storageSet({
        [STORAGE_KEYS.NOTES]: notesResult.merged,
        [STORAGE_KEYS.HIGHLIGHTS]: highlightsResult.merged
      });

      showToast(`Imported ${notesResult.imported} notes, ${highlightsResult.imported} quotes. Skipped ${notesResult.skipped + highlightsResult.skipped} duplicates.`, 'success');
    }

    closeImportModal();
    await refreshData();
  } catch {
    showToast('Failed to import data', 'error');
  }
}

// ============================================================
// Settings
// ============================================================

function applySettings() {
  document.getElementById('setting-confirm-delete').checked = settings.confirmBeforeDelete !== false;
  document.getElementById('setting-show-timestamps').checked = settings.showTimestamps !== false;
}

async function updateStorageInfo() {
  const notes = allNotes.length;
  const highlights = allHighlights.length;
  const tags = allTags.length;
  
  document.getElementById('storage-info').textContent = 
    `${notes} note${notes !== 1 ? 's' : ''}, ${highlights} quote${highlights !== 1 ? 's' : ''}, ${tags} tag${tags !== 1 ? 's' : ''} stored locally.`;
}

// ============================================================
// Confirm Dialog
// ============================================================

function showConfirmDialog(title, message, callback) {
  document.getElementById('confirm-title').textContent = title;
  document.getElementById('confirm-message').textContent = message;
  confirmCallback = callback;
  document.getElementById('confirm-overlay').classList.add('active');
}

function closeConfirmDialog() {
  confirmCallback = null;
  document.getElementById('confirm-overlay').classList.remove('active');
}

// ============================================================
// Utilities
// ============================================================

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  } catch {
    return dateStr;
  }
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('out');
    setTimeout(() => toast.remove(), 200);
  }, 3000);
}
