# 🏛️ ReadEase — System Architecture & Technical Design

**Extension:** ReadEase — Distraction-Free Reader & Library  
**Specification:** Google Chrome Extensions Manifest V3  
**Design Standard:** Vanilla ES6 Modules, Zero Bundler Overhead, 100% Local Processing

---

## 1. High-Level Architecture

ReadEase is organized around five autonomous, loosely coupled subsystems:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CHROME WEBPAGE TAB                              │
│  [Cloned DOM] ──> [Readability Heuristic] ──> [HTML Sanitizer Engine]  │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │ Article Payload
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                         DUAL-TIER STORAGE                              │
│   • chrome.storage.local  ──> Settings & Lightweight Index Catalog     │
│   • Browser IndexedDB     ──> Full Sanitized HTML, Highlights, Notes   │
└──────────────────┬───────────────────────────────┬─────────────────────┘
                   │                               │
                   ▼                               ▼
┌──────────────────────────────────┐ ┌───────────────────────────────────┐
│        DEDICATED READER          │ │        LIBRARY DASHBOARD          │
│ • Custom Typography Engine       │ │ • Instant Search-As-You-Type      │
│ • 5 Theme Palettes               │ │ • Dynamic Tag Filtering           │
│ • Floating Highlight Toolbar     │ │ • Category Classification         │
│ • Contextual Text Locator        │ │ • Multi-Field Sorting             │
│ • Reading Progress & Resume      │ │ • Versioned JSON Backup / Restore │
│ • Focus Mode Immersion           │ │ • Offline Card Catalog            │
└──────────────────────────────────┘ └───────────────────────────────────┘
```

---

## 2. Article Extraction Pipeline

Article extraction operates non-destructively:

1. **Document Cloning:** Clones `document.body.cloneNode(true)`. The active webpage DOM is never altered.
2. **Metadata Extraction:** Gathers title, byline/author, publication date, site name, and excerpt from OpenGraph tags (`og:title`, `og:description`, `og:site_name`), Twitter cards, JSON-LD, microdata, and standard semantic HTML tags (`<time>`, `[rel="author"]`, `<h1>`).
3. **Boilerplate Stripping:** Purges non-content elements matching unwanted selectors (`header`, `footer`, `nav`, `aside`, `.sidebar`, `.ad`, `.social-share`, `.cookie-banner`, `.comments`, `.popup`, `.modal`).
4. **Scoring Candidate Nodes:** Evaluates containers (`<article>`, `<section>`, `<div>`, `<main>`) based on:
   - Tag weighting (`article` +30, `main` +25, `section` +10).
   - Class/ID regex heuristics (`content, entry, post, story` +25; `comment, promo, sponsor, widget` -25).
   - Paragraph text density and length.
   - Code block density (valuable for technical documentation & tutorials).
   - Image and figure presence.
   - High link-density penalty (penalizes navigation lists and archive indexes).
5. **Heuristic Fallback:** If word count < 60 or paragraph count < 2, the page is classified as non-article (`isArticle: false`). If the user has highlighted text on the page, ReadEase offers an instant "Read Selected Text" option!

---

## 3. Strict HTML Sanitization Engine

Untrusted webpage HTML is never injected raw into the reader:

- **Whitelist Enforcement:** Only approved structural tags (`p, h1-h6, b, strong, i, em, code, pre, kbd, blockquote, ul, ol, li, figure, figcaption, img, table, tr, th, td, a`) are preserved.
- **Dangerous Element Purge:** Strictly strips `<script>`, `<style>`, `<iframe>`, `<object>`, `<embed>`, `<form>`, `<input>`, `<button>`, `<svg>`, `<audio>`, `<video>`, `<meta>`, `<link>`.
- **Event Handler Neutralization:** Removes all `on*` attributes (`onclick`, `onload`, `onerror`, `onmouseover`).
- **Safe Protocol Verification:** Verifies `href` and `src` attributes against safe protocols (`https:`, `http:`, `mailto:`, relative paths, or safe image data URIs). Strictly strips `javascript:`, `vbscript:`, and `data:text/html`.
- **Enforced Link & Image Security:** All `<a>` tags receive forced `target="_blank" rel="noopener noreferrer"`. All `<img>` tags receive `loading="lazy"`.

---

## 4. Dual-Tier Storage Architecture

| Layer | Technology | Key Scope | Justification |
|---|---|---|---|
| **Preferences & Index** | `chrome.storage.local` | `readease_settings`, `readease_active_article`, `readease_library_index` | Fast synchronous settings access upon tab creation; instant library card listing without querying large databases. |
| **Offline Article Data** | `IndexedDB` (`ReadEaseDB`) | Object store `articles` | IndexedDB eliminates chrome.storage 5MB/10MB quota restrictions, allowing hundreds of full offline articles, code snippets, and annotations to be stored reliably. |

---

## 5. Reading Progress & Resume Algorithm

- **Scroll Tracker:** Calculates reading percentage using `(scrollTop / (scrollHeight - clientHeight)) * 100` throttled with `window.requestAnimationFrame`.
- **Remaining Reading Time:** Derives remaining minutes: `Math.ceil(totalMinutes * (1 - progress / 100))`.
- **Auto-Status Classification:** Automatically transitions articles from `unread` (0–5%) to `in-progress` (6–89%) to `completed` (≥90%).
- **Smooth Position Resume:** When reopening an article with saved progress between 6% and 94%, scrolls smoothly to the saved position and displays a subtle banner with a 1-click "Restart from beginning" option.

---

## 6. Contextual Highlight & Annotation Restoration

To survive DOM variations and whitespace changes:

- **Highlight Record:** Captures `{ id, articleId, text, prefix, suffix, color, colorId, note, createdAt }`.
- **Prefix & Suffix Context:** Stores 35 characters preceding and following the selected text.
- **Fuzzy TreeWalker Search:** Traverses text nodes using browser `TreeWalker` to match the passage, wrapping the matched text in `<mark class="readease-highlight" data-highlight-id="...">`.
- **Drawer Navigation:** Clicking any highlight card in the slide-out panel smoothly scrolls the reader directly to the passage and activates a 1.5-second ambient pulse animation (`.flash-highlight`).
