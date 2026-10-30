/**
 * ReadEase - Library Dashboard Controller
 * Handles article catalogs, search-as-you-type, tag filtering,
 * reading status classification, sorting, favorites, deletion, and JSON backup/restore.
 */

import {
  getLibraryIndex,
  deleteArticle,
  toggleFavorite,
  filterAndSortArticles
} from './scripts/article-manager.js';
import {
  searchArticles,
  extractUniqueTags,
  exportLibraryData,
  validateImportJSON,
  importLibraryData
} from './scripts/search.js';
import { getSettings, applySettingsToDOM } from './scripts/settings.js';
import { formatDate, formatReadingTime, debounce, escapeHtml } from './scripts/utils.js';

let allArticles = [];
let currentFilter = 'all';
let currentSort = 'recent-saved';
let currentSearchQuery = '';
let activeTag = null;
let validatedImportData = null;

async function initLibrary() {
  // DOM Elements
  const libraryStatsSummary = document.getElementById('libraryStatsSummary');
  const searchInput = document.getElementById('searchInput');
  const btnClearSearch = document.getElementById('btnClearSearch');

  const filterTabs = document.querySelectorAll('.filter-tab');
  const badgeAll = document.getElementById('badgeAll');
  const badgeUnread = document.getElementById('badgeUnread');
  const badgeInProgress = document.getElementById('badgeInProgress');
  const badgeCompleted = document.getElementById('badgeCompleted');
  const badgeFavorites = document.getElementById('badgeFavorites');

  const sortSelect = document.getElementById('sortSelect');
  const tagFilterBar = document.getElementById('tagFilterBar');
  const tagPillsList = document.getElementById('tagPillsList');

  const articlesGrid = document.getElementById('articlesGrid');
  const emptyState = document.getElementById('emptyState');
  const emptyTitle = document.getElementById('emptyTitle');
  const emptyDesc = document.getElementById('emptyDesc');

  // Modal Elements
  const btnBackupModal = document.getElementById('btnBackupModal');
  const backupModal = document.getElementById('backupModal');
  const btnCloseModal = document.getElementById('btnCloseModal');
  const btnExportJSON = document.getElementById('btnExportJSON');
  const importFileInput = document.getElementById('importFileInput');
  const importPreviewBox = document.getElementById('importPreviewBox');
  const previewCount = document.getElementById('previewCount');
  const previewDate = document.getElementById('previewDate');
  const btnConfirmImport = document.getElementById('btnConfirmImport');
  const importStatus = document.getElementById('importStatus');

  // 1. Apply user settings (e.g. current theme)
  const settings = await getSettings();
  applySettingsToDOM(settings);

  // 2. Load and refresh library
  await refreshLibrary();

  // 3. Search Bar Interaction
  const handleSearch = debounce(() => {
    currentSearchQuery = searchInput.value.trim();
    btnClearSearch.hidden = !currentSearchQuery;
    renderArticles();
  }, 120);

  searchInput.addEventListener('input', handleSearch);

  btnClearSearch.addEventListener('click', () => {
    searchInput.value = '';
    currentSearchQuery = '';
    btnClearSearch.hidden = true;
    renderArticles();
  });

  // 4. Category Tabs Interaction
  filterTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      filterTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentFilter = tab.dataset.filter;
      activeTag = null; // Clear tag filter when switching categories
      renderArticles();
    });
  });

  // 5. Sort Selection
  sortSelect.addEventListener('change', (ev) => {
    currentSort = ev.target.value;
    renderArticles();
  });

  // 6. Backup & Restore Modal Interaction
  btnBackupModal.addEventListener('click', () => {
    backupModal.hidden = false;
    importPreviewBox.hidden = true;
    importStatus.hidden = true;
    importFileInput.value = '';
    validatedImportData = null;
  });

  btnCloseModal.addEventListener('click', () => {
    backupModal.hidden = true;
  });

  backupModal.addEventListener('click', (ev) => {
    if (ev.target === backupModal) {
      backupModal.hidden = true;
    }
  });

  // Export JSON
  btnExportJSON.addEventListener('click', async () => {
    try {
      btnExportJSON.disabled = true;
      const data = await exportLibraryData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `readease-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[ReadEase Library] Export error:', err);
      alert('Failed to export library.');
    } finally {
      btnExportJSON.disabled = false;
    }
  });

  // Import JSON File Selection
  importFileInput.addEventListener('change', (ev) => {
    const file = ev.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      const validation = validateImportJSON(content);

      if (!validation.valid) {
        importStatus.className = 'status-msg error';
        importStatus.textContent = validation.error;
        importStatus.hidden = false;
        importPreviewBox.hidden = true;
        return;
      }

      // Valid preview
      validatedImportData = validation.data;
      previewCount.textContent = validation.preview.articleCount;
      previewDate.textContent = formatDate(validation.preview.exportedAt);

      importStatus.hidden = true;
      importPreviewBox.hidden = false;
    };
    reader.readAsText(file);
  });

  // Confirm Import
  btnConfirmImport.addEventListener('click', async () => {
    if (!validatedImportData) return;

    try {
      btnConfirmImport.disabled = true;
      const mode = document.querySelector('input[name="importMode"]:checked')?.value || 'merge';
      const result = await importLibraryData({ data: validatedImportData, mode });

      importStatus.className = 'status-msg success';
      importStatus.textContent = `Successfully imported ${result.importedCount} articles!`;
      importStatus.hidden = false;
      importPreviewBox.hidden = true;

      await refreshLibrary();
    } catch (err) {
      console.error('[ReadEase Library] Import error:', err);
      importStatus.className = 'status-msg error';
      importStatus.textContent = 'Import failed. Check console for details.';
      importStatus.hidden = false;
    } finally {
      btnConfirmImport.disabled = false;
    }
  });

  // Helper: Refresh library dataset from storage
  async function refreshLibrary() {
    allArticles = await getLibraryIndex();
    updateBadgesAndStats();
    renderTagsBar();
    renderArticles();
  }

  // Helper: Update counts and header stats
  function updateBadgesAndStats() {
    const total = allArticles.length;
    const unread = allArticles.filter(a => a.status === 'unread').length;
    const inProgress = allArticles.filter(a => a.status === 'in-progress').length;
    const completed = allArticles.filter(a => a.status === 'completed').length;
    const favorites = allArticles.filter(a => a.favorite).length;

    badgeAll.textContent = total;
    badgeUnread.textContent = unread;
    badgeInProgress.textContent = inProgress;
    badgeCompleted.textContent = completed;
    badgeFavorites.textContent = favorites;

    if (total === 0) {
      libraryStatsSummary.textContent = 'No articles saved yet';
    } else {
      libraryStatsSummary.textContent = `${total} ${total === 1 ? 'article' : 'articles'} saved • ${completed} completed • ${inProgress} in progress`;
    }
  }

  // Helper: Render dynamic tag filter bar
  function renderTagsBar() {
    const uniqueTags = extractUniqueTags(allArticles);
    if (uniqueTags.length === 0) {
      tagFilterBar.hidden = true;
      return;
    }

    tagFilterBar.hidden = false;
    tagPillsList.innerHTML = '';

    uniqueTags.forEach(({ tag, count }) => {
      const pill = document.createElement('button');
      pill.className = `tag-filter-pill ${activeTag === tag ? 'active' : ''}`;
      pill.textContent = `#${tag} (${count})`;
      pill.addEventListener('click', () => {
        if (activeTag === tag) {
          activeTag = null;
        } else {
          activeTag = tag;
        }
        renderTagsBar();
        renderArticles();
      });
      tagPillsList.appendChild(pill);
    });
  }

  // Helper: Render filtered and sorted article cards
  function renderArticles() {
    articlesGrid.innerHTML = '';

    // 1. Apply category / tag filter and sort
    let filtered = filterAndSortArticles(allArticles, {
      filter: activeTag || currentFilter,
      sort: currentSort
    });

    // 2. Apply search query if active
    if (currentSearchQuery) {
      filtered = searchArticles(filtered, currentSearchQuery);
    }

    // 3. Handle empty results
    if (filtered.length === 0) {
      emptyState.hidden = false;
      if (currentSearchQuery) {
        emptyTitle.textContent = 'No matching articles';
        emptyDesc.textContent = `No articles matched "${currentSearchQuery}". Try adjusting your keywords or clearing the search.`;
      } else if (activeTag) {
        emptyTitle.textContent = `No articles tagged #${activeTag}`;
        emptyDesc.textContent = 'Try choosing another tag or selecting "All Articles".';
      } else if (currentFilter === 'favorites') {
        emptyTitle.textContent = 'No favorite articles';
        emptyDesc.textContent = 'Star articles you love in the reader or library to quickly find them here.';
      } else if (currentFilter === 'completed') {
        emptyTitle.textContent = 'No completed articles';
        emptyDesc.textContent = 'When you finish reading an article, it will be automatically archived here.';
      } else {
        emptyTitle.textContent = 'Your reading library is empty';
        emptyDesc.textContent = 'Click the ReadEase extension icon on any blog or article in Chrome to save it for distraction-free reading.';
      }
      return;
    }

    emptyState.hidden = true;

    // 4. Render cards
    filtered.forEach(article => {
      const card = document.createElement('article');
      card.className = 'article-card';

      // Top row
      const topRow = document.createElement('div');
      topRow.className = 'card-top-row';

      const siteBadge = document.createElement('span');
      siteBadge.className = 'card-site-badge';
      siteBadge.textContent = article.siteName || 'Article';

      const actions = document.createElement('div');
      actions.className = 'card-actions';

      // Favorite toggle button
      const favBtn = document.createElement('button');
      favBtn.className = `card-fav-btn ${article.favorite ? 'active' : ''}`;
      favBtn.title = article.favorite ? 'Unfavorite' : 'Favorite';
      favBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="${article.favorite ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
        </svg>
      `;

      favBtn.addEventListener('click', async (ev) => {
        ev.stopPropagation();
        const newFav = await toggleFavorite(article.id);
        article.favorite = newFav;
        favBtn.classList.toggle('active', newFav);
        favBtn.querySelector('svg').setAttribute('fill', newFav ? 'currentColor' : 'none');
        updateBadgesAndStats();
      });

      // Delete button
      const delBtn = document.createElement('button');
      delBtn.className = 'card-delete-btn';
      delBtn.title = 'Delete article from library';
      delBtn.innerHTML = `
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
      `;

      delBtn.addEventListener('click', async (ev) => {
        ev.stopPropagation();
        if (confirm(`Remove "${article.title}" from your library?`)) {
          await deleteArticle(article.id);
          allArticles = allArticles.filter(a => a.id !== article.id);
          updateBadgesAndStats();
          renderTagsBar();
          renderArticles();
        }
      });

      actions.appendChild(favBtn);
      actions.appendChild(delBtn);
      topRow.appendChild(siteBadge);
      topRow.appendChild(actions);

      // Title
      const titleLink = document.createElement('a');
      titleLink.className = 'card-title-link';
      titleLink.href = `reader.html?id=${encodeURIComponent(article.id)}`;
      titleLink.textContent = article.title;

      // Excerpt
      const excerpt = document.createElement('p');
      excerpt.className = 'card-excerpt';
      excerpt.textContent = article.excerpt || 'No description available.';

      // Progress bar
      const progressWrap = document.createElement('div');
      progressWrap.className = 'card-progress-wrap';

      const progressPercent = article.progress || 0;
      progressWrap.innerHTML = `
        <div class="card-progress-info">
          <span>${progressPercent}% read</span>
          <span>${formatReadingTime(article.readingTime || 1)}</span>
        </div>
        <div class="card-progress-track">
          <div class="card-progress-fill" style="width: ${progressPercent}%;"></div>
        </div>
      `;

      // Footer row
      const footer = document.createElement('div');
      footer.className = 'card-footer';

      const savedDate = document.createElement('span');
      savedDate.textContent = formatDate(article.savedAt);

      const tagsContainer = document.createElement('div');
      tagsContainer.className = 'card-tags';

      if (Array.isArray(article.tags) && article.tags.length > 0) {
        article.tags.slice(0, 3).forEach(t => {
          const tagSpan = document.createElement('span');
          tagSpan.className = 'card-tag';
          tagSpan.textContent = `#${t}`;
          tagsContainer.appendChild(tagSpan);
        });
      }

      footer.appendChild(savedDate);
      footer.appendChild(tagsContainer);

      card.appendChild(topRow);
      card.appendChild(titleLink);
      card.appendChild(excerpt);
      card.appendChild(progressWrap);
      card.appendChild(footer);

      articlesGrid.appendChild(card);
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLibrary);
} else {
  initLibrary();
}
