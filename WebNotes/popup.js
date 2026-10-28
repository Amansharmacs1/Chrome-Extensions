/**
 * WebNotes — Popup Script
 * 
 * Manages the extension popup: page context, note creation/editing/deletion,
 * highlight display, text capture, and dashboard navigation.
 */

import {
  initializeStorage, createNote, saveNote, updateNote, deleteNote,
  toggleFavorite, togglePin, getNotesForContext, getAllHighlights,
  deleteHighlight, createHighlight, saveHighlight, normalizeTags
} from './scripts/storage.js';
import { normalizeUrl, extractDomain, isRestrictedUrl, formatUrlForDisplay } from './scripts/url-utils.js';

// ============================================================
// State
// ============================================================

let currentTab = { url: '', title: '' };
let normalizedUrl = '';
let currentDomain = '';
let isRestricted = false;
let currentNotes = [];
let currentHighlights = [];
let activeScope = 'page';
let editingNoteId = null;
let confirmCallback = null;
let capturedText = '';

// ============================================================
// Initialization
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
  await initializeStorage();
  await loadPageContext();
  await refreshData();
  setupEventListeners();
  attemptTextCapture();
});

async function loadPageContext() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_ACTIVE_TAB' });
    if (response?.success && response.tab) {
      currentTab = response.tab;
      normalizedUrl = normalizeUrl(currentTab.url) || '';
      currentDomain = extractDomain(currentTab.url) || '';
      isRestricted = isRestrictedUrl(currentTab.url);
    } else {
      isRestricted = true;
    }
  } catch {
    isRestricted = true;
  }

  updatePageContextUI();
}

function updatePageContextUI() {
  const contextEl = document.getElementById('page-context');
  const titleEl = document.getElementById('page-title');
  const urlEl = document.getElementById('page-url');

  if (isRestricted) {
    contextEl.classList.add('restricted');
    titleEl.textContent = '';
    urlEl.textContent = '';
    
    const msg = document.createElement('div');
    msg.className = 'page-context-restricted-msg';
    msg.innerHTML = `
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
        <circle cx="8" cy="8" r="6"/>
        <line x1="8" y1="5" x2="8" y2="8.5"/>
        <circle cx="8" cy="11" r="0.5" fill="currentColor"/>
      </svg>
      <span>This page doesn't support notes. Try a regular webpage.</span>
    `;
    contextEl.appendChild(msg);

    // Hide quick add for restricted pages
    const quickAdd = document.getElementById('quick-add');
    if (quickAdd) quickAdd.style.display = 'none';
  } else {
    titleEl.textContent = currentTab.title || 'Untitled Page';
    urlEl.textContent = formatUrlForDisplay(currentTab.url, 50);
  }
}

// ============================================================
// Data Loading
// ============================================================

async function refreshData() {
  if (!isRestricted && normalizedUrl) {
    currentNotes = await getNotesForContext(normalizedUrl, currentDomain);
  } else {
    currentNotes = [];
  }

  currentHighlights = await getAllHighlights();
  
  // Filter highlights for current page context
  const pageHighlights = isRestricted ? [] : currentHighlights.filter(h => {
    const hNorm = normalizeUrl(h.sourceUrl);
    const hDomain = extractDomain(h.sourceUrl);
    return hNorm === normalizedUrl || hDomain === currentDomain;
  });

  renderNotes(currentNotes);
  renderHighlights(pageHighlights);
  updateCounts(currentNotes.length, pageHighlights.length);
}

// ============================================================
// Rendering
// ============================================================

function renderNotes(notes) {
  const listEl = document.getElementById('notes-list');
  const emptyEl = document.getElementById('notes-empty');

  if (notes.length === 0) {
    listEl.innerHTML = '';
    emptyEl.style.display = 'flex';
    return;
  }

  emptyEl.style.display = 'none';

  // Sort: pinned first, then by updatedAt desc
  const sorted = [...notes].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.updatedAt) - new Date(a.updatedAt);
  });

  listEl.innerHTML = sorted.map(note => createNoteCard(note)).join('');
}

function createNoteCard(note) {
  const title = escapeHtml(note.title);
  const body = escapeHtml(note.body);
  const timeAgo = formatTimeAgo(note.updatedAt || note.createdAt);
  const scopeClass = note.scope === 'domain' ? 'domain' : 'page';
  const scopeLabel = note.scope === 'domain' ? 'Domain' : 'Page';
  const pinnedClass = note.isPinned ? ' pinned' : '';
  const favIcon = note.isFavorite 
    ? '<span class="note-fav-indicator" title="Favorite">★</span>' 
    : '';
  
  const tags = (note.tags || []).map(t => 
    `<span class="note-tag">${escapeHtml(t)}</span>`
  ).join('');

  return `
    <div class="note-card${pinnedClass}" data-note-id="${note.id}">
      <div class="note-card-header">
        <div class="note-title">${title || body.substring(0, 50) || 'Untitled'}</div>
        <div class="note-actions">
          <button class="icon-btn" data-action="pin" data-id="${note.id}" title="${note.isPinned ? 'Unpin' : 'Pin'}" aria-label="${note.isPinned ? 'Unpin' : 'Pin'}">
            <svg viewBox="0 0 16 16" fill="${note.isPinned ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
              <path d="M9.5 2L14 6.5L10.5 10L11 13.5L8 10.5L2.5 13L5.5 10L6 6.5Z"/>
            </svg>
          </button>
          <button class="icon-btn" data-action="favorite" data-id="${note.id}" title="${note.isFavorite ? 'Unfavorite' : 'Favorite'}" aria-label="${note.isFavorite ? 'Unfavorite' : 'Favorite'}">
            <svg viewBox="0 0 16 16" fill="${note.isFavorite ? '#f5a623' : 'none'}" stroke="${note.isFavorite ? '#f5a623' : 'currentColor'}" stroke-width="1.5">
              <path d="M8 2l1.8 3.6L14 6.2l-3 2.9.7 4.1L8 11.3 4.3 13.2l.7-4.1-3-2.9 4.2-.6z"/>
            </svg>
          </button>
          <button class="icon-btn" data-action="edit" data-id="${note.id}" title="Edit" aria-label="Edit note">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
              <path d="M11 2l3 3-8.5 8.5H2.5v-3L11 2z"/>
            </svg>
          </button>
          <button class="icon-btn" data-action="delete" data-id="${note.id}" title="Delete" aria-label="Delete note">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
              <path d="M3 4h10M6 4V3h4v1M5 4v9h6V4"/>
            </svg>
          </button>
        </div>
      </div>
      ${title && body ? `<div class="note-body">${body}</div>` : ''}
      <div class="note-meta">
        <span class="note-scope-badge ${scopeClass}">${scopeLabel}</span>
        ${favIcon}
        <span class="note-timestamp">${timeAgo}</span>
        ${tags ? `<div class="note-tags">${tags}</div>` : ''}
      </div>
    </div>
  `;
}

function renderHighlights(highlights) {
  const listEl = document.getElementById('highlights-list');
  const emptyEl = document.getElementById('highlights-empty');

  if (highlights.length === 0) {
    listEl.innerHTML = '';
    emptyEl.style.display = 'flex';
    return;
  }

  emptyEl.style.display = 'none';

  const sorted = [...highlights].sort((a, b) => 
    new Date(b.createdAt) - new Date(a.createdAt)
  );

  listEl.innerHTML = sorted.map(h => createHighlightCard(h)).join('');
}

function createHighlightCard(h) {
  const text = escapeHtml(h.selectedText);
  const note = h.userNote ? escapeHtml(h.userNote) : '';
  const source = formatUrlForDisplay(h.sourceUrl, 40);
  const timeAgo = formatTimeAgo(h.createdAt);

  return `
    <div class="highlight-card" data-highlight-id="${h.id}">
      <div class="highlight-text">${text}</div>
      ${note ? `<div class="highlight-note">${note}</div>` : ''}
      <div class="highlight-meta">
        <span class="highlight-source" title="${escapeHtml(h.sourceUrl)}">
          ${escapeHtml(h.sourceTitle || source)} · ${timeAgo}
        </span>
        <div class="highlight-actions">
          <button class="icon-btn" data-action="open-source" data-url="${escapeHtml(h.sourceUrl)}" title="Open source page" aria-label="Open source page">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M6 2.5h-3v11h10v-3"/>
              <path d="M9 2.5h4.5v4.5"/>
              <line x1="13.5" y1="2.5" x2="7" y2="9"/>
            </svg>
          </button>
          <button class="icon-btn" data-action="delete-highlight" data-id="${h.id}" title="Delete" aria-label="Delete quote">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
              <path d="M3 4h10M6 4V3h4v1M5 4v9h6V4"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  `;
}

function updateCounts(notesCount, highlightsCount) {
  document.getElementById('notes-count').textContent = notesCount;
  document.getElementById('highlights-count').textContent = highlightsCount;
  document.getElementById('footer-stats').textContent = `${notesCount} note${notesCount !== 1 ? 's' : ''} · ${highlightsCount} quote${highlightsCount !== 1 ? 's' : ''}`;
}

// ============================================================
// Event Listeners
// ============================================================

function setupEventListeners() {
  // Tab navigation
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Scope toggle
  document.querySelectorAll('.scope-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.scope-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeScope = btn.dataset.scope;
    });
  });

  // Note body input — enable/disable save button
  const bodyInput = document.getElementById('note-body-input');
  bodyInput.addEventListener('input', () => {
    document.getElementById('btn-save-note').disabled = !bodyInput.value.trim();
  });

  // Save note
  document.getElementById('btn-save-note').addEventListener('click', handleSaveNote);

  // Keyboard shortcut: Ctrl/Cmd+Enter to save
  bodyInput.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSaveNote();
    }
  });

  // Notes list actions (delegation)
  document.getElementById('notes-list').addEventListener('click', handleNoteAction);
  document.getElementById('highlights-list').addEventListener('click', handleHighlightAction);

  // Edit overlay
  document.getElementById('btn-edit-cancel').addEventListener('click', closeEditOverlay);
  document.getElementById('btn-edit-save').addEventListener('click', handleEditSave);

  // Confirm dialog
  document.getElementById('btn-confirm-cancel').addEventListener('click', closeConfirmDialog);
  document.getElementById('btn-confirm-ok').addEventListener('click', () => {
    if (confirmCallback) confirmCallback();
    closeConfirmDialog();
  });

  // Close overlays with Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeEditOverlay();
      closeConfirmDialog();
    }
  });

  // Dashboard buttons
  document.getElementById('btn-open-dashboard').addEventListener('click', openDashboard);
  document.getElementById('btn-dashboard-link').addEventListener('click', openDashboard);

  // Capture button
  document.getElementById('btn-capture').addEventListener('click', handleCapture);
  document.getElementById('btn-save-capture').addEventListener('click', handleSaveCapturedText);
  document.getElementById('btn-dismiss-capture').addEventListener('click', dismissCapture);

  // Listen for storage changes (sync with dashboard)
  if (typeof chrome !== 'undefined' && chrome.storage) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local') {
        refreshData();
      }
    });
  }

  // Listen for messages from background (highlight saved via context menu)
  if (typeof chrome !== 'undefined' && chrome.runtime) {
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === 'HIGHLIGHT_SAVED') {
        refreshData();
        showToast('Quote saved!', 'success');
      }
    });
  }
}

function switchTab(tabId) {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    const isActive = btn.dataset.tab === tabId;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-selected', isActive);
  });

  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.remove('active');
  });

  document.getElementById(`content-${tabId}`).classList.add('active');
}

// ============================================================
// Note Actions
// ============================================================

async function handleSaveNote() {
  if (isRestricted) {
    showToast('Cannot create notes on this page', 'error');
    return;
  }

  const titleEl = document.getElementById('note-title-input');
  const bodyEl = document.getElementById('note-body-input');
  const tagsEl = document.getElementById('note-tags-input');

  const body = bodyEl.value.trim();
  if (!body) {
    showToast('Note content is required', 'error');
    return;
  }

  const tags = tagsEl.value ? tagsEl.value.split(',').map(t => t.trim()).filter(Boolean) : [];

  try {
    const note = createNote({
      title: titleEl.value.trim(),
      body: body,
      scope: activeScope,
      pageUrl: normalizedUrl,
      domain: currentDomain,
      pageTitle: currentTab.title || '',
      tags
    });

    await saveNote(note);

    // Clear inputs
    titleEl.value = '';
    bodyEl.value = '';
    tagsEl.value = '';
    document.getElementById('btn-save-note').disabled = true;

    await refreshData();
    showToast('Note saved!', 'success');
  } catch (err) {
    showToast('Failed to save note', 'error');
  }
}

async function handleNoteAction(e) {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;

  const action = btn.dataset.action;
  const id = btn.dataset.id;

  switch (action) {
    case 'pin':
      await togglePin(id);
      await refreshData();
      break;
    case 'favorite':
      await toggleFavorite(id);
      await refreshData();
      break;
    case 'edit':
      openEditOverlay(id);
      break;
    case 'delete':
      showConfirmDialog('Delete Note', 'This note will be permanently deleted.', async () => {
        await deleteNote(id);
        await refreshData();
        showToast('Note deleted', 'success');
      });
      break;
  }
}

async function handleHighlightAction(e) {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;

  const action = btn.dataset.action;

  if (action === 'open-source') {
    const url = btn.dataset.url;
    if (url) {
      chrome.runtime.sendMessage({ type: 'OPEN_URL', url });
    }
  } else if (action === 'delete-highlight') {
    const id = btn.dataset.id;
    showConfirmDialog('Delete Quote', 'This saved quote will be permanently deleted.', async () => {
      await deleteHighlight(id);
      await refreshData();
      showToast('Quote deleted', 'success');
    });
  }
}

// ============================================================
// Edit Overlay
// ============================================================

async function openEditOverlay(noteId) {
  editingNoteId = noteId;
  const note = currentNotes.find(n => n.id === noteId);
  if (!note) return;

  document.getElementById('edit-title').value = note.title || '';
  document.getElementById('edit-body').value = note.body || '';
  document.getElementById('edit-tags').value = (note.tags || []).join(', ');
  document.getElementById('edit-overlay').classList.add('active');
  
  document.getElementById('edit-title').focus();
}

function closeEditOverlay() {
  editingNoteId = null;
  document.getElementById('edit-overlay').classList.remove('active');
}

async function handleEditSave() {
  if (!editingNoteId) return;

  const title = document.getElementById('edit-title').value.trim();
  const body = document.getElementById('edit-body').value.trim();
  const tagsStr = document.getElementById('edit-tags').value;
  const tags = tagsStr ? tagsStr.split(',').map(t => t.trim()).filter(Boolean) : [];

  if (!body) {
    showToast('Note content is required', 'error');
    return;
  }

  try {
    await updateNote(editingNoteId, { title, body, tags });
    closeEditOverlay();
    await refreshData();
    showToast('Note updated!', 'success');
  } catch (err) {
    showToast('Failed to update note', 'error');
  }
}

// ============================================================
// Text Capture
// ============================================================

async function attemptTextCapture() {
  if (isRestricted) return;
  
  try {
    const response = await chrome.runtime.sendMessage({ type: 'CAPTURE_SELECTION' });
    if (response?.success && response.selectedText) {
      showCaptureBar(response.selectedText);
    }
  } catch {
    // Scripting not available — that's fine
  }
}

async function handleCapture() {
  if (isRestricted) {
    showToast('Cannot capture text on this page', 'error');
    return;
  }

  try {
    const response = await chrome.runtime.sendMessage({ type: 'CAPTURE_SELECTION' });
    if (response?.success && response.selectedText) {
      showCaptureBar(response.selectedText);
    } else {
      showToast(response?.error || 'No text selected. Select text on the page first.', 'error');
    }
  } catch {
    showToast('Cannot access page content. Try using the right-click menu.', 'error');
  }
}

function showCaptureBar(text) {
  capturedText = text;
  const bar = document.getElementById('capture-bar');
  const preview = document.getElementById('captured-text-preview');
  preview.textContent = text;
  bar.classList.add('active');
}

function dismissCapture() {
  capturedText = '';
  document.getElementById('capture-bar').classList.remove('active');
}

async function handleSaveCapturedText() {
  if (!capturedText.trim()) return;

  try {
    const highlight = createHighlight({
      selectedText: capturedText.trim(),
      userNote: '',
      sourceUrl: normalizedUrl || currentTab.url,
      sourceTitle: currentTab.title || ''
    });

    await saveHighlight(highlight);
    dismissCapture();
    await refreshData();
    switchTab('highlights');
    showToast('Quote saved!', 'success');
  } catch (err) {
    showToast('Failed to save quote', 'error');
  }
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
// Dashboard
// ============================================================

function openDashboard() {
  chrome.runtime.sendMessage({ type: 'OPEN_DASHBOARD' });
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

function formatTimeAgo(dateStr) {
  if (!dateStr) return '';
  
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
  }, 2500);
}
