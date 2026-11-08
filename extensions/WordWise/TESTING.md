# 🧪 WordWise — Automated & Manual Testing Guide

This document describes the testing strategy, test suites, execution procedures, and manual verification checklists for the **WordWise** Chrome Extension.

---

## 🚀 Running the Automated Test Suite

WordWise includes a self-contained, high-performance automated test suite with **zero external npm runtime dependencies**. It executes in under 20 milliseconds using native Node.js ES Modules.

### Direct Node.js Invocation
```bash
node extensions/WordWise/tests/run-all.js
```

### Via npm Script
```bash
npm test --prefix extensions/WordWise
```

---

## 📊 Test Suite Coverage & Verification Matrix

The test runner executes 7 discrete test suites comprising **187 automated assertions**:

| Suite Name | File | Assertion Focus |
| :--- | :--- | :--- |
| **Manifest V3 Structure & Asset Integrity** | `tests/manifest.test.js` | Validates MV3 spec compliance, presence of 16/32/48/128px PNG icons on disk, popup HTML paths, service worker module registration, permissions, host permissions, and curated offline dataset integrity ($\ge 100$ verified words). |
| **Spaced Repetition SM-2 Scheduler** | `tests/scheduler.test.js` | Tests SuperMemo SM-2 interval calculations across ratings 1-5 ('again', 'hard', 'good', 'easy'), Ease Factor degradation/bonus math, minimum Ease Factor clamping ($1.3$), interval progression ($1\text{d} \rightarrow 6\text{d} \rightarrow \text{interval} \times EF$), due card filtering, and relative date formatters. |
| **Dictionary Service & Normalization** | `tests/dictionary-service.test.js` | Verifies Free Dictionary API response parsing, audio URL cleanup (resolving protocol-relative `//` URLs to `https://`), multi-part-of-speech aggregation, and offline fallback retrieval from `data/daily-words.json`. |
| **Quiz Engine & Distractor Pooling** | `tests/quiz-engine.test.js` | Tests question generation for all 4 quiz types (meaning, word, cloze, synonym), Fisher-Yates array shuffling, distractor pool uniqueness, stem-aware sentence cloze masking, and fallback supplement when user vocabulary is small. |
| **Storage Service & Persistence Layer** | `tests/storage-service.test.js` | Tests memory storage fallback, vocabulary CRUD lifecycle, case-insensitive duplicate prevention, SM-2 state updates, 30-day definition caching and cache purging, learning activity recording, quiz result persistence, and settings merging. |
| **Export/Import Validation & Serialization** | `tests/export-import.test.js` | Tests RFC 4180 CSV escaping, Markdown vocabulary notebook formatting, JSON serialization, and import payload validation with duplicate word detection and preview metrics. |
| **Learning Analytics & Chart Service** | `tests/learning-service.test.js` | Tests vocabulary mastery distribution math (learning, review, mastered), accuracy percentage calculations, daily goal progress, and SVG weekly consistency bar chart rendering. |

---

## 🔍 Manual Verification & End-to-End Checklist

### 1. In-Page Word Discovery & Shadow DOM Popover
1. Load unpacked extension in Google Chrome (`chrome://extensions/`).
2. Navigate to any content-rich website (e.g., [Wikipedia](https://en.wikipedia.org/wiki/Serendipity)).
3. Select an English word on the page (e.g., "serendipity").
4. **Verify**: A floating WordWise feather pill appears near the selection cursor.
5. Click the feather pill.
6. **Verify**:
   - The popover renders inside `#wordwise-card-host` Shadow DOM.
   - Word title, phonetic, part of speech, and definition appear immediately.
   - The discovered context sentence appears with the selected word bolded.
   - Clicking the audio button plays clear pronunciation.
   - Clicking **"Save Word"** saves the entry with immediate feedback ("✓ Saved to Vocabulary").

### 2. Context Menu & Keyboard Shortcut
1. Select a word on the webpage.
2. Right-click and choose **"Look up '...' with WordWise"**.
3. **Verify**: The dedicated Dictionary Lookup workstation opens in a new tab with the word loaded.
4. Select another word and press `Alt+Shift+W`.
5. **Verify**: The in-page popover appears immediately.

### 3. Extension Popup
1. Click the WordWise toolbar icon.
2. **Verify**:
   - The Word of the Day widget displays the stable daily word, phonetic, and definition.
   - Clicking the speaker plays pronunciation.
   - Typing into the search bar and pressing Enter navigates to the Lookup workstation.
   - Current streak and daily goal progress bar reflect active statistics.

### 4. SM-2 Flashcards Workspace
1. Open the Flashcards studio (`flashcards/flashcards.html`).
2. **Verify**:
   - Word and phonetic appear on the front of the 3D card.
   - Pressing `Space` or clicking "Reveal Answer" flips the card smoothly.
   - Back of card displays definitions, examples, context sentences, and synonyms.
   - Rating buttons (`Again`, `Hard`, `Good`, `Easy`) preview upcoming intervals.
   - Pressing keys `1`, `2`, `3`, or `4` records the rating and advances to the next card.
   - Completing the deck renders the summary screen with total reviewed count and retention accuracy.

### 5. Quiz Arena
1. Open the Quiz studio (`quizzes/quiz.html`).
2. Select **Meaning Challenge** and click **Start Quiz**.
3. **Verify**:
   - 4 distinct answer options are shown.
   - Selecting the correct answer triggers a green badge and explanation.
   - Selecting an incorrect answer highlights the correct answer in green and wrong in red.
   - Completing 10 questions renders the final scorecard with percentage grade.

### 6. Data Portability (Import & Export)
1. In the Vocabulary Library (`library/library.html`), click **Export**.
2. Download CSV, Markdown, and JSON files and inspect their structure.
3. Open the **Import JSON** modal, select the exported JSON file, and verify preview metrics (shows total words, duplicate count, and new count).
