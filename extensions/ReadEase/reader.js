/**
 * ReadEase - Reader Controller
 * Coordinates article rendering, typography customization, reading progress,
 * resume reading, floating highlights, personal notes, and focus mode.
 */

import {
  getArticle,
  saveArticle,
  toggleFavorite,
  updateArticleProgress,
  addArticleHighlight,
  removeArticleHighlight,
  STORAGE_KEY_ACTIVE
} from './scripts/article-manager.js';
import { getLocalStorage } from './scripts/storage.js';
import {
  getSettings,
  saveSettings,
  applySettingsToDOM,
  THEMES
} from './scripts/settings.js';
import {
  attachReadingProgressListener,
  resumeReadingPosition,
  formatRemainingTime
} from './scripts/reading-progress.js';
import {
  createHighlightFromSelection,
  applyHighlightToDOM,
  restoreAllHighlights,
  removeHighlightFromDOM,
  HIGHLIGHT_COLORS
} from './scripts/highlights.js';
import { formatDate, formatReadingTime, escapeHtml } from './scripts/utils.js';

let article = null;
let currentSettings = null;
let pendingRange = null;

// Demo fallback article if reader opened directly without active page
const DEMO_ARTICLE = {
  id: 'art-welcome',
  url: 'https://readease.local/guide',
  title: 'Welcome to ReadEase — Less Clutter, More Clarity',
  byline: 'ReadEase Team',
  publishedTime: new Date().toISOString(),
  siteName: 'readease.local',
  excerpt: 'A peaceful, distraction-free reading experience for modern web articles.',
  wordCount: 380,
  readingTime: 2,
  contentHtml: `
    <p>Welcome to your digital reading sanctuary. ReadEase transforms noisy, ad-heavy web pages into calm, beautifully formatted documents designed for deep concentration.</p>
    <h2>Thoughtful Typography & Custom Reading Themes</h2>
    <p>Every reader has unique preferences. ReadEase gives you full control over typography, line spacing, margins, and paper tones. Try clicking the <strong>Aa</strong> button in the top toolbar to explore five handcrafted themes:</p>
    <ul>
      <li><strong>Warm Paper:</strong> Soothing cream paper tone inspired by classical printed books.</li>
      <li><strong>Clean Light:</strong> Crisp, modern white surface with deep slate typography.</li>
      <li><strong>Classic Sepia:</strong> Soft amber warmth for low-contrast relaxation.</li>
      <li><strong>Midnight Dark:</strong> Deep charcoal slate for night reading without eye strain.</li>
      <li><strong>OLED Contrast:</strong> High-contrast black and white for maximum screen clarity.</li>
    </ul>
    <h2>Interactive Highlights & Personal Notes</h2>
    <p>Highlight any passage in this article right now: simply select a few words with your mouse. A floating toolbar will appear offering five highlight colors and the ability to attach personal reflections or study notes.</p>
    <blockquote>"The man who does not read good books has no advantage over the man who cannot read them." — Mark Twain</blockquote>
    <h2>Distraction-Free Focus Mode</h2>
    <p>Press the <kbd>F</kbd> key or click the Focus Mode button in the header. All browser controls and buttons will vanish, leaving only the pure, centered article text. Press <kbd>Esc</kbd> anytime to exit.</p>
    <p>To read real articles, simply navigate to any blog, news website, or documentation page and click the ReadEase extension icon in your Chrome toolbar.</p>
  `,
  textContent: 'Welcome to your digital reading sanctuary...',
  highlights: [],
  tags: ['getting-started', 'guide'],
  favorite: true,
  progress: 0,
  scrollY: 0,
  savedAt: Date.now()
};

async function initReader() {
  // DOM Elements
  const headerSiteBadge = document.getElementById('headerSiteBadge');
  const btnBackToSource = document.getElementById('btnBackToSource');
  const btnFooterBack = document.getElementById('btnFooterBack');
  const btnFooterLibrary = document.getElementById('btnFooterLibrary');

  const readingProgressPill = document.getElementById('readingProgressPill');
  const readingProgressText = document.getElementById('readingProgressText');
  const readingTimeRemainingText = document.getElementById('readingTimeRemainingText');
  const progressFill = document.getElementById('progressFill');

  const btnTypography = document.getElementById('btnTypography');
  const typographyPopover = document.getElementById('typographyPopover');
  const btnCloseTypography = document.getElementById('btnCloseTypography');

  const btnHighlightsToggle = document.getElementById('btnHighlightsToggle');
  const highlightsCountBadge = document.getElementById('highlightsCountBadge');
  const highlightsDrawer = document.getElementById('highlightsDrawer');
  const btnCloseDrawer = document.getElementById('btnCloseDrawer');
  const drawerList = document.getElementById('drawerList');

  const btnFavoriteToggle = document.getElementById('btnFavoriteToggle');
  const favIcon = document.getElementById('favIcon');
  const btnSaveArticle = document.getElementById('btnSaveArticle');
  const btnSaveLabel = document.getElementById('btnSaveLabel');
  const btnFocusMode = document.getElementById('btnFocusMode');
  const focusExitPill = document.getElementById('focusExitPill');
  const btnExitFocus = document.getElementById('btnExitFocus');

  const resumeBanner = document.getElementById('resumeBanner');
  const resumeText = document.getElementById('resumeText');
  const btnRestartTop = document.getElementById('btnRestartTop');
  const btnCloseResumeBanner = document.getElementById('btnCloseResumeBanner');

  const articleHeading = document.getElementById('articleHeading');
  const articleAuthor = document.getElementById('articleAuthor');
  const articleDateDot = document.getElementById('articleDateDot');
  const articleDate = document.getElementById('articleDate');
  const articleStats = document.getElementById('articleStats');
  const articleTagsBar = document.getElementById('articleTagsBar');
  const articleTagsList = document.getElementById('articleTagsList');
  const btnAddTagBtn = document.getElementById('btnAddTagBtn');
  const readerBody = document.getElementById('readerBody');

  // Floating highlight toolbar & composer
  const highlightToolbar = document.getElementById('highlightToolbar');
  const btnHlAddNote = document.getElementById('btnHlAddNote');
  const noteComposer = document.getElementById('noteComposer');
  const noteInput = document.getElementById('noteInput');
  const btnSaveNote = document.getElementById('btnSaveNote');
  const btnCloseComposer = document.getElementById('btnCloseComposer');

  // 1. Load user settings and apply them to the document
  try {
    currentSettings = await getSettings();
    applySettingsToDOM(currentSettings);
    syncSettingsUI(currentSettings);
  } catch (settingsErr) {
    console.warn('[ReadEase Reader] Settings load warning:', settingsErr);
  }

  // 2. Identify and load the article
  const params = new URLSearchParams(window.location.search);
  const articleId = params.get('id');

  try {
    // Check local storage active article first (fastest, especially for fresh reads)
    const activeArticle = await getLocalStorage(STORAGE_KEY_ACTIVE);
    if (activeArticle && (!articleId || activeArticle.id === articleId)) {
      article = activeArticle;
    }

    // If not matching, query IndexedDB / library
    if (!article && articleId) {
      article = await getArticle(articleId);
    }

    // If still not found, check if activeArticle exists at all
    if (!article && activeArticle) {
      article = activeArticle;
    }
  } catch (err) {
    console.warn('[ReadEase Reader] Article fetch warning:', err);
  }

  if (!article) {
    article = DEMO_ARTICLE;
  }

  // 3. Render the article content IMMEDIATELY
  renderArticle(article);

  // 4. Attach reading progress tracking
  attachReadingProgressListener({
    totalMinutes: article.readingTime || 1,
    onProgressUpdate: ({ progress, remainingMinutes, scrollY }) => {
      progressFill.style.width = `${progress}%`;
      readingProgressText.textContent = `${progress}% read`;
      readingTimeRemainingText.textContent = formatRemainingTime(remainingMinutes);

      // Debounce saving progress to storage if saved article
      if (article.id && article.id !== DEMO_ARTICLE.id) {
        updateArticleProgress(article.id, progress, scrollY).catch(() => {});
      }
    }
  });

  // 5. Check resume reading position
  if (currentSettings.autoResume && article.scrollY && article.progress < 95) {
    resumeReadingPosition(article.scrollY, article.progress, ({ savedProgress, restart }) => {
      resumeBanner.hidden = false;
      resumeText.textContent = `Resumed reading from ${savedProgress}%`;
      btnRestartTop.onclick = () => {
        restart();
        resumeBanner.hidden = true;
      };
    });
  }

  btnCloseResumeBanner.addEventListener('click', () => {
    resumeBanner.hidden = true;
  });

  // 6. Navigation Buttons
  const returnToSource = () => {
    if (article.url && article.url !== 'https://readease.local/guide') {
      window.location.href = article.url;
    } else {
      window.close();
    }
  };

  btnBackToSource.addEventListener('click', returnToSource);
  btnFooterBack.addEventListener('click', returnToSource);

  btnFooterLibrary.addEventListener('click', () => {
    window.location.href = 'library.html';
  });

  // 7. Save to Library Button
  const updateSaveButtonState = (isSaved) => {
    if (isSaved) {
      btnSaveArticle.classList.add('saved');
      btnSaveLabel.textContent = 'Saved ✓';
    } else {
      btnSaveArticle.classList.remove('saved');
      btnSaveLabel.textContent = 'Save';
    }
  };

  // Check if article is currently saved in library
  try {
    const existingSaved = await getArticle(article.id);
    updateSaveButtonState(Boolean(existingSaved));
  } catch (err) {
    console.warn('[ReadEase Reader] Saved state check warning:', err);
    updateSaveButtonState(false);
  }

  btnSaveArticle.addEventListener('click', async () => {
    try {
      btnSaveLabel.textContent = 'Saving...';
      await saveArticle(article);
      updateSaveButtonState(true);
    } catch (err) {
      console.error('[ReadEase Reader] Save error:', err);
      btnSaveLabel.textContent = 'Save';
    }
  });

  // 8. Favorite Button
  const updateFavoriteUI = (isFav) => {
    if (isFav) {
      btnFavoriteToggle.classList.add('active');
      favIcon.setAttribute('fill', 'currentColor');
    } else {
      btnFavoriteToggle.classList.remove('active');
      favIcon.setAttribute('fill', 'none');
    }
  };

  updateFavoriteUI(Boolean(article.favorite));

  btnFavoriteToggle.addEventListener('click', async () => {
    article.favorite = !article.favorite;
    updateFavoriteUI(article.favorite);
    if (article.id) {
      await saveArticle(article);
      updateSaveButtonState(true);
    }
  });

  // 9. Focus Mode Toggle
  const toggleFocus = () => {
    currentSettings.focusMode = !currentSettings.focusMode;
    applySettingsToDOM(currentSettings);
    focusExitPill.hidden = !currentSettings.focusMode;
  };

  btnFocusMode.addEventListener('click', toggleFocus);
  btnExitFocus.addEventListener('click', toggleFocus);

  // Keyboard shortcut listener
  document.addEventListener('keydown', (ev) => {
    if (ev.target.tagName === 'INPUT' || ev.target.tagName === 'TEXTAREA') return;

    if (ev.key === 'Escape') {
      if (currentSettings.focusMode) {
        toggleFocus();
      }
      typographyPopover.hidden = true;
      highlightsDrawer.hidden = true;
      highlightToolbar.hidden = true;
      noteComposer.hidden = true;
    } else if (ev.key === 'f' || ev.key === 'F') {
      toggleFocus();
    }
  });

  // 10. Typography Popover Controls
  btnTypography.addEventListener('click', () => {
    typographyPopover.hidden = !typographyPopover.hidden;
  });

  btnCloseTypography.addEventListener('click', () => {
    typographyPopover.hidden = true;
  });

  // Theme selection buttons
  document.querySelectorAll('.theme-select-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      document.querySelectorAll('.theme-select-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentSettings = await saveSettings({ theme: btn.dataset.theme });
      applySettingsToDOM(currentSettings);
    });
  });

  // Font family pills
  document.querySelectorAll('#fontFamilyGroup .pill-option').forEach(btn => {
    btn.addEventListener('click', async () => {
      document.querySelectorAll('#fontFamilyGroup .pill-option').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentSettings = await saveSettings({ fontFamily: btn.dataset.font });
      applySettingsToDOM(currentSettings);
    });
  });

  // Content width pills
  document.querySelectorAll('#contentWidthGroup .pill-option').forEach(btn => {
    btn.addEventListener('click', async () => {
      document.querySelectorAll('#contentWidthGroup .pill-option').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentSettings = await saveSettings({ contentWidth: btn.dataset.width });
      applySettingsToDOM(currentSettings);
    });
  });

  // Line spacing pills
  document.querySelectorAll('#lineSpacingGroup .pill-option').forEach(btn => {
    btn.addEventListener('click', async () => {
      document.querySelectorAll('#lineSpacingGroup .pill-option').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentSettings = await saveSettings({ lineSpacing: btn.dataset.spacing });
      applySettingsToDOM(currentSettings);
    });
  });

  // Text alignment pills
  document.querySelectorAll('#textAlignGroup .pill-option').forEach(btn => {
    btn.addEventListener('click', async () => {
      document.querySelectorAll('#textAlignGroup .pill-option').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentSettings = await saveSettings({ textAlign: btn.dataset.align });
      applySettingsToDOM(currentSettings);
    });
  });

  // Font size slider & steppers
  const fontSizeSlider = document.getElementById('fontSizeSlider');
  const fontSizeDisplay = document.getElementById('fontSizeDisplay');
  const btnFontDec = document.getElementById('btnFontDec');
  const btnFontInc = document.getElementById('btnFontInc');

  const updateFontSize = async (newSize) => {
    const clamped = Math.max(14, Math.min(28, Number(newSize)));
    fontSizeSlider.value = clamped;
    fontSizeDisplay.textContent = `${clamped}px`;
    currentSettings = await saveSettings({ fontSize: clamped });
    applySettingsToDOM(currentSettings);
  };

  fontSizeSlider.addEventListener('input', (ev) => {
    updateFontSize(ev.target.value);
  });

  btnFontDec.addEventListener('click', () => {
    updateFontSize(Number(fontSizeSlider.value) - 1);
  });

  btnFontInc.addEventListener('click', () => {
    updateFontSize(Number(fontSizeSlider.value) + 1);
  });

  // 11. Text Selection & Floating Highlight Toolbar
  // Prevent toolbar and composer clicks from prematurely collapsing user selection
  highlightToolbar.addEventListener('mousedown', (ev) => {
    ev.preventDefault();
  });
  noteComposer.addEventListener('mousedown', (ev) => {
    if (ev.target.tagName !== 'TEXTAREA') {
      ev.preventDefault();
    }
  });

  document.addEventListener('selectionchange', () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !readerBody.contains(selection.anchorNode)) {
      if (!noteComposer.contains(document.activeElement)) {
        highlightToolbar.hidden = true;
      }
      return;
    }

    const text = selection.toString().trim();
    if (text.length >= 3) {
      try {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        highlightToolbar.style.top = `${window.scrollY + rect.top - 46}px`;
        highlightToolbar.style.left = `${Math.max(10, rect.left + (rect.width / 2) - 110)}px`;
        highlightToolbar.hidden = false;
        pendingRange = range.cloneRange();
      } catch {}
    }
  });

  // Color button clicks
  document.querySelectorAll('.hl-color-btn').forEach(btn => {
    btn.addEventListener('click', async (ev) => {
      ev.stopPropagation();
      const colorId = btn.dataset.color;
      await executeHighlight(colorId, '');
    });
  });

  // Note button click: opens composer
  btnHlAddNote.addEventListener('click', (ev) => {
    ev.stopPropagation();
    highlightToolbar.hidden = true;

    if (!pendingRange) {
      const sel = window.getSelection();
      if (sel && !sel.isCollapsed) {
        try { pendingRange = sel.getRangeAt(0).cloneRange(); } catch {}
      }
    }
    if (!pendingRange) return;

    try {
      const rect = pendingRange.getBoundingClientRect();
      noteComposer.style.top = `${window.scrollY + rect.top - 140}px`;
      noteComposer.style.left = `${Math.max(10, rect.left + (rect.width / 2) - 140)}px`;
      noteComposer.hidden = false;
      noteInput.value = '';
      noteInput.focus();
    } catch {}
  });

  btnCloseComposer.addEventListener('click', () => {
    noteComposer.hidden = true;
  });

  btnSaveNote.addEventListener('click', async () => {
    const note = noteInput.value.trim();
    await executeHighlight('yellow', note);
    noteComposer.hidden = true;
  });

  async function executeHighlight(colorId, note) {
    const target = pendingRange || window.getSelection();
    if (!target) return;

    const hlRecord = createHighlightFromSelection(target, article.id, colorId, note);
    if (!hlRecord) return;

    // Apply to DOM
    applyHighlightToDOM(readerBody, hlRecord);

    // Save to article model & storage
    article.highlights = article.highlights || [];
    article.highlights.push(hlRecord);
    await saveArticle(article);
    updateSaveButtonState(true);

    // Refresh highlights UI
    updateHighlightsBadge();
    renderHighlightsDrawer();

    // Clear selection
    try {
      window.getSelection()?.removeAllRanges();
    } catch {}
    pendingRange = null;
    highlightToolbar.hidden = true;
    noteComposer.hidden = true;
  }

  // 12. Highlights Drawer
  btnHighlightsToggle.addEventListener('click', () => {
    highlightsDrawer.hidden = !highlightsDrawer.hidden;
    if (!highlightsDrawer.hidden) {
      renderHighlightsDrawer();
    }
  });

  btnCloseDrawer.addEventListener('click', () => {
    highlightsDrawer.hidden = true;
  });

  function updateHighlightsBadge() {
    const count = article.highlights?.length || 0;
    if (count > 0) {
      highlightsCountBadge.hidden = false;
      highlightsCountBadge.textContent = count;
    } else {
      highlightsCountBadge.hidden = true;
    }
  }

  function renderHighlightsDrawer() {
    drawerList.innerHTML = '';
    const list = article.highlights || [];

    if (list.length === 0) {
      drawerList.innerHTML = `
        <div class="empty-highlights-state">
          <p>No highlights yet.</p>
          <span class="empty-hint">Select any text in the article to highlight or add personal reflections.</span>
        </div>
      `;
      return;
    }

    list.forEach(hl => {
      const card = document.createElement('div');
      card.className = 'highlight-card';

      const quote = document.createElement('p');
      quote.className = 'hl-quote';
      quote.style.borderColor = hl.color || '#fef08a';
      quote.textContent = `"${hl.text}"`;

      card.appendChild(quote);

      if (hl.note) {
        const noteEl = document.createElement('div');
        noteEl.className = 'hl-note-text';
        noteEl.textContent = hl.note;
        card.appendChild(noteEl);
      }

      const footer = document.createElement('div');
      footer.className = 'hl-card-footer';
      footer.innerHTML = `
        <span>${formatDate(hl.createdAt)}</span>
        <button class="hl-delete-btn" title="Delete highlight">Delete</button>
      `;

      footer.querySelector('.hl-delete-btn').addEventListener('click', async (ev) => {
        ev.stopPropagation();
        removeHighlightFromDOM(readerBody, hl.id);
        article.highlights = article.highlights.filter(h => h.id !== hl.id);
        await removeArticleHighlight(article.id, hl.id);
        if (article.id) {
          await saveArticle(article);
        }
        updateHighlightsBadge();
        renderHighlightsDrawer();
      });

      // Click card to scroll to highlight in article
      card.addEventListener('click', () => {
        const mark = readerBody.querySelector(`mark[data-highlight-id="${hl.id}"]`);
        if (mark) {
          mark.scrollIntoView({ behavior: 'smooth', block: 'center' });
          mark.classList.add('flash-highlight');
          setTimeout(() => mark.classList.remove('flash-highlight'), 1600);
        }
      });

      drawerList.appendChild(card);
    });
  }

  // 13. Tag Addition
  btnAddTagBtn.addEventListener('click', async () => {
    const tagName = prompt('Enter a tag for this article (e.g. tech, research, study):');
    if (tagName && tagName.trim()) {
      const clean = tagName.trim().toLowerCase();
      article.tags = article.tags || [];
      if (!article.tags.includes(clean)) {
        article.tags.push(clean);
        await saveArticle(article);
        updateSaveButtonState(true);
        renderTags(article.tags);
      }
    }
  });

  function renderTags(tags = []) {
    articleTagsList.innerHTML = '';
    articleTagsBar.hidden = false;
    if (Array.isArray(tags)) {
      tags.forEach(tag => {
        const badge = document.createElement('span');
        badge.className = 'tag-badge';
        badge.textContent = `#${tag}`;
        articleTagsList.appendChild(badge);
      });
    }
  }

  // Helper: Synchronize UI settings
  function syncSettingsUI(cfg) {
    document.querySelectorAll('.theme-select-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.theme === cfg.theme);
    });
    document.querySelectorAll('#fontFamilyGroup .pill-option').forEach(b => {
      b.classList.toggle('active', b.dataset.font === cfg.fontFamily);
    });
    document.querySelectorAll('#contentWidthGroup .pill-option').forEach(b => {
      b.classList.toggle('active', b.dataset.width === cfg.contentWidth);
    });
    document.querySelectorAll('#lineSpacingGroup .pill-option').forEach(b => {
      b.classList.toggle('active', b.dataset.spacing === cfg.lineSpacing);
    });
    document.querySelectorAll('#textAlignGroup .pill-option').forEach(b => {
      b.classList.toggle('active', b.dataset.align === cfg.textAlign);
    });

    fontSizeSlider.value = cfg.fontSize || 18;
    fontSizeDisplay.textContent = `${cfg.fontSize || 18}px`;
  }

  // Helper: Render full article
  function renderArticle(art) {
    document.title = `${art.title || 'Article'} — ReadEase`;
    headerSiteBadge.textContent = art.siteName || 'Web Article';
    articleHeading.textContent = art.title || 'Untitled Article';

    if (art.byline) {
      articleAuthor.textContent = `By ${art.byline}`;
      articleAuthor.hidden = false;
    } else {
      articleAuthor.hidden = true;
    }

    if (art.publishedTime) {
      articleDate.textContent = formatDate(art.publishedTime);
      articleDateDot.hidden = !art.byline;
    } else {
      articleDateDot.hidden = true;
    }

    articleStats.textContent = `${art.wordCount || 0} words • ${formatReadingTime(art.readingTime || 1)}`;

    // Render HTML content
    readerBody.innerHTML = art.contentHtml || '<p>No readable content available.</p>';

    // Restore highlights onto article DOM
    if (Array.isArray(art.highlights) && art.highlights.length > 0) {
      restoreAllHighlights(readerBody, art.highlights);
    }
    updateHighlightsBadge();

    // Render tags
    renderTags(art.tags);
  }
}

function startReader() {
  initReader().catch(err => {
    console.error('[ReadEase Reader] Top-level initialization error:', err);
    if (!article) {
      renderArticle(DEMO_ARTICLE);
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startReader);
} else {
  startReader();
}
