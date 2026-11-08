# 🏛️ WordWise — Architectural Specification & Engineering Design

This document details the software architecture, data models, persistence structures, security boundaries, and runtime workflows powering **WordWise**.

---

## 🏗️ High-Level System Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Web Page Context                                │
│                                                                        │
│   Host DOM  ◄── Selection Event (Word Detection & Context Sentence)   │
│       │                                                                │
│       ▼                                                                │
│   #wordwise-card-host (Shadow DOM Root, Mode: Open)                   │
│       ├── Isolated Stylesheet (content.css)                            │
│       └── Floating Definition Card / Feather Pill                      │
└───────────────────▲──────────────────────────────┬─────────────────────┘
                    │                              │
             PostMessage / chrome.runtime          │
                    │                              │
┌───────────────────▼──────────────────────────────▼─────────────────────┐
│                    Chrome Extension Process                            │
│                                                                        │
│   ┌─────────────────────┐   ┌──────────────────────────────────────┐   │
│   │  service-worker.js  │   │  UI Surfaces                         │   │
│   │  - Context Menus    │   │  - popup/popup.html (Word of Day)    │   │
│   │  - Keyboard Router  │   │  - lookup/lookup.html (Dict Studio)  │   │
│   │  - Tab Communication│   │  - flashcards/flashcards.html (SM-2) │   │
│   └──────────┬──────────┘   │  - quizzes/quiz.html (Multi-mode)    │   │
│              │              │  - library/library.html (Notebook)   │   │
│              │              │  - dashboard/dashboard.html (Stats)  │   │
│              │              └──────────────────┬───────────────────┘   │
│              ▼                                 ▼                       │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │                      Core Service Layer                        │   │
│   │  - dictionary-service.js (API Client, Cache, Offline Fallback) │   │
│   │  - scheduler.js          (SuperMemo SM-2 Interval Engine)      │   │
│   │  - quiz-engine.js        (Distractor Pooling, Cloze Generator) │   │
│   │  - learning-service.js   (Streak Analytics, SVG Charts)        │   │
│   │  - audio-service.js      (Web Audio MP3 & Web Speech Synthesis)│   │
│   │  - export-service.js     (CSV / JSON / Markdown & Import Val)  │   │
│   │  - storage-service.js    (Central Storage & Schema Migration)  │   │
│   └────────────────────────────────┬───────────────────────────────┘   │
│                                    ▼                                   │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │                   Persistence & Local Data                     │   │
│   │  - chrome.storage.local (Schema Version 1)                     │   │
│   │  - Curated Offline Dataset (data/daily-words.json)             │   │
│   └────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 📦 Service Layer Breakdown

### 1. `storage-service.js` (Central Persistence Engine)
The centralized persistence layer guarantees that all storage mutations adhere to Schema Version 1, preventing corrupted or desynchronized states.
- **Storage Keys**:
  - `wordwise_schema`: Version integer (`1`).
  - `wordwise_vocabulary`: Array of canonical vocabulary objects.
  - `wordwise_cache`: Key-value map of normalized words to API responses with 30-day TTL.
  - `wordwise_daily`: Stable Word of the Day record (`dateString`, `timestamp`, `word`).
  - `wordwise_activity`: Date-indexed log of learning events for streak calculations.
  - `wordwise_quiz_history`: Historical log of quiz sessions with accuracy metrics.
  - `wordwise_settings`: User configuration parameters.
- **Node.js Memory Storage Fallback**: When running in automated test environments where `chrome.storage.local` is unavailable, the service transparently switches to an in-memory dictionary store without code modification.

### 2. `dictionary-service.js` (Dictionary Client & Normalization)
- Communicates with the public Free Dictionary API (`https://api.dictionaryapi.dev/api/v2/entries/en/{word}`).
- **Normalization Pipeline**: Unifies nested API structures into a clean schema containing:
  - Canonical lowercased word key and display title.
  - Pronunciation text (IPA) and authentic MP3 audio URLs.
  - Meanings grouped by part of speech.
  - Consolidated arrays of definitions, examples, synonyms, and antonyms.
- **Offline Fallback**: In case of network failure or offline study, queries `data/daily-words.json` and local vocabulary before reporting failure.

### 3. `scheduler.js` (SuperMemo SM-2 Interval Engine)
Calculates review intervals and ease factor updates according to the SuperMemo SM-2 algorithm:
- Tracks:
  - `repetitions`: Count of consecutive successful reviews.
  - `interval`: Days until the next scheduled review.
  - `easeFactor`: Float parameter reflecting word memorability (default: 2.5, floor: 1.3).
  - `nextReviewDate`: Epoch timestamp in milliseconds.
- Categorizes words into 3 retention tiers:
  - `learning`: New words or words recently reset after a blackout (`rating: 1`).
  - `review`: Words actively expanding intervals between 1 day and 20 days.
  - `mastered`: Words with $\ge 4$ successful reviews and interval $\ge 21$ days.

### 4. `quiz-engine.js` (Adaptive Quiz Engine)
- Provides 4 distinct assessment modalities:
  1. `meaning`: Word $\rightarrow$ 4 definition choices.
  2. `word`: Definition $\rightarrow$ 4 vocabulary word choices.
  3. `cloze`: Sentence with masked word (`_____`) $\rightarrow$ 4 word choices.
  4. `synonym`: Target word $\rightarrow$ 4 synonym choices.
- **Distractor Pooling**: Dynamically selects 3 plausible distractors from the user's saved vocabulary and the curated offline catalog, ensuring no duplicated or trivially invalid options.
- **Stem-Aware Cloze Masking**: Uses case-insensitive regex with stem-matching heuristics to reliably mask both root words and inflected/plural forms in sample sentences.

### 5. `audio-service.js` (Pronunciation Engine)
- Evaluates audio availability:
  - **Priority 1**: Streams authentic studio-recorded MP3 pronunciation files provided by lexicographers.
  - **Priority 2**: Gracefully falls back to browser-native `window.speechSynthesis` with British or American English voice matching.
- Explicitly flags audio source (`authentic` vs `synthesis`) so users know the fidelity of the audio.

### 6. `export-service.js` (Data Portability)
- **CSV Exporter**: Adheres to RFC 4180 with standard double-quote escaping.
- **Markdown Exporter**: Generates structured personal notebook documents with metadata, examples, and study notes.
- **JSON Exporter / Importer**: Validates schemas and provides duplicate detection previews prior to committing imported entries to storage.

---

## 🛡️ Security & Content Script Isolation

### Shadow DOM Encapsulation
Host web pages feature wildly unpredictable styling, reset sheets (e.g., Tailwind, Normalize.css, CSS resets), and aggressive CSS variables. To guarantee visual integrity:
1. The content script mounts a single host element `#wordwise-card-host` in the document body.
2. Injects a ShadowRoot with `mode: 'open'`.
3. Injects `content.css` strictly into the ShadowRoot.
4. Prevents host styles from altering WordWise buttons, fonts, and popovers, while preventing WordWise rules from leaking into the webpage.

### Selection Hygiene & Sanitization
- Selection queries check `window.getSelection()`, trimming whitespace and limiting target tokens to single words or compound expressions ($\le 40$ characters).
- Surrounding sentences are extracted by scanning punctuation boundaries (`.`, `?`, `!`, `\n`) around the selection anchor.
- All injected text is escaped through `textContent` or sanitized DOM nodes, preventing XSS injection from webpage content.
