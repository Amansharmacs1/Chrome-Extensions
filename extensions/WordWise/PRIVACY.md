# 🛡️ WordWise — Privacy Policy & Data Handling

**Effective Date:** November 8, 2026  
**Product:** WordWise Chrome Extension ("Discover. Learn. Remember.")

---

## 🔒 Executive Summary: 100% Local-First Architecture

WordWise is built around the fundamental principle that your reading habits, vocabulary deficiencies, personal study notes, and learning pace are **strictly your private data**.

- **No User Accounts**: WordWise requires no sign-up, email, login, or password.
- **No Third-Party Analytics**: No Google Analytics, Mixpanel, Segment, or telemetry scripts are present.
- **No Ad Tracking or Fingerprinting**: WordWise contains zero advertisement code, tracking pixels, or monetization scripts.
- **Local-Only Storage**: All saved words, flashcard schedules, custom notes, quiz scores, and streak telemetry reside exclusively in your browser's `chrome.storage.local`.

---

## 🌐 External Network Communications

WordWise initiates network requests **only** under the following circumstance:
1. **Dictionary Definition Lookups**: When you inspect or search a word, the extension makes an HTTPS GET request to the public **Free Dictionary API** (`https://api.dictionaryapi.dev/api/v2/entries/en/{word}`).
   - The payload contains *only* the specific word being queried.
   - No cookies, browser identifiers, user profiles, or host page URLs are transmitted.
   - If the queried word is found in the local 30-day cache or offline dataset, zero network requests are made.

---

## 🗄️ Data Stored on Your Machine

The following data is stored locally in `chrome.storage.local`:
1. **Vocabulary Library**: Words you choose to save, their definitions, your custom notes, your custom example sentences, and your tags.
2. **Spaced Repetition States**: SM-2 calculation records (repetition counts, intervals, ease factors, next review timestamps).
3. **Activity Logs**: Timestamps of days where learning actions occurred, used to calculate streaks and render weekly consistency charts.
4. **Quiz Records**: History of completed quiz sessions (mode, accuracy, score, duration).
5. **Dictionary Cache**: Cached responses for recently searched words to minimize bandwidth and enable instant lookups.
6. **User Preferences**: Daily word target, speech synthesizer speed rate, and theme settings.

---

## 📤 Data Portability & Deletion

- **Exporting Data**: You can export your complete vocabulary library and learning data at any time in standard JSON, CSV, or Markdown format via the Library and Dashboard interfaces.
- **Deleting Data**: You can delete individual words from the Library, clear the dictionary cache, or permanently wipe all stored data via the Dashboard's **"Erase All Data"** button with immediate effect.
- **Uninstalling**: Uninstalling the WordWise extension from Chrome automatically deletes all local storage and cache files maintained by Chrome for this extension.

---

## 🤝 Third-Party Services

WordWise does not integrate with or share data with any commercial third-party vendors or marketing partners. The Free Dictionary API is an open-source educational API used strictly for read-only English vocabulary lookups.
