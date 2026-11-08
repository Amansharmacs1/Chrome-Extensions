# 📚 WordWise — Vocabulary Builder, Spaced Repetition & Dictionary

> **Product Tagline:** Discover. Learn. Remember.  
> **Platform:** Google Chrome Extension (Manifest V3)  
> **Technology Stack:** Pure Vanilla JavaScript (ES Modules), HTML5, CSS3, Web Audio & Web Speech APIs, `chrome.storage.local`.  
> **Zero External Runtime Dependencies | 100% Private, Local-First Architecture**

---

## 🌟 Overview

**WordWise** is a production-grade browser extension engineered for English language learners, students, voracious readers, and professionals who want to actively expand their vocabulary while browsing the web.

Instead of interrupting your reading flow by switching tabs to search for words, WordWise brings instantaneous dictionary definitions directly to your fingertips via an isolated Shadow DOM popover, context menu, or keyboard shortcut. More importantly, WordWise bridges the gap between *encountering* a word once and *actually remembering* it permanently through **SuperMemo SM-2 spaced repetition flashcards** and **adaptive multi-mode quizzes**.

---

## 🎯 Key Features & Modules

### 1. 🔍 In-Page Discovery & Floating Definition Card
- **Instant Lookup**: Select any text on any webpage and click the floating WordWise feather pill, or press `Alt+Shift+W`.
- **Surrounding Context Capture**: Automatically extracts the full surrounding sentence where you discovered the word and highlights the word in bold, giving every vocabulary item rich contextual meaning.
- **Shadow DOM Isolation**: The popover is rendered inside an isolated ShadowRoot (`#wordwise-card-host`), preventing host page CSS stylesheets, fonts, or resets from distorting the dictionary card.
- **Audio Pronunciation**: Direct one-click audio playback with clear labeling indicating whether the audio is an authentic dictionary studio MP3 or native Web Speech synthesis.
- **One-Click Save**: Add any word to your permanent vocabulary library with pre-populated parts of speech, definition, example, and discovery URL.

### 2. ⚡ Extension Popup
- **Word of the Day**: Curated daily vocabulary widget featuring verified IPA phonetics, parts of speech, definitions, sample sentences, and instant audio playback. The daily word is deterministic and stable for all users on a given calendar date.
- **Live Search Bar**: Query any English word directly from the popup with autocomplete and automatic 30-day client-side caching.
- **Learning Streak & Daily Goal Progress**: Real-time progress bar tracking how many words you've saved today against your configurable daily goal (default: 5 words).
- **Navigation Hub**: Direct entry points to the Dictionary Lookup, Flashcard Deck, Quiz Arena, and Vocabulary Library.

### 3. 📖 Dedicated Dictionary Lookup Workstation
- Accessible directly or via the Right-Click Context Menu (*"Look up '%s' with WordWise"*).
- Structured categorization by Parts of Speech (Noun, Verb, Adjective, Adverb, etc.).
- Multiple numbered definitions with authentic sample sentences.
- Interactive Synonym and Antonym pills that allow one-click jumping to explore related words.
- Sidebar Note Editor: Add personal notes, custom mnemonic sentences, and tags before or after saving.

### 4. 🧠 SuperMemo SM-2 Flashcard Deck
- Complete, verified implementation of the **SuperMemo SM-2 spaced repetition algorithm**.
- **Interactive 3D Flipping Card**: Smooth flip animation displaying the word and phonetic on the front, and definitions, examples, context sentences, and synonyms on the back.
- **4 SM-2 Rating Choices**:
  - `Again` (Grade 1): Blackout / forgotten — resets repetition count to 0, resets interval to 1 day, adjusts Ease Factor downwards.
  - `Hard` (Grade 3): Recalled with difficulty — increases interval cautiously, slightly reduces Ease Factor.
  - `Good` (Grade 4): Successfully recalled — scales interval by current Ease Factor.
  - `Easy` (Grade 5): Perfect effortless recall — expands interval with bonus multiplier and increases Ease Factor.
- **Dynamic Interval Previews**: Rating buttons display the exact upcoming interval (e.g., `1d`, `6d`, `15d`, `1mo`) before you click.
- **Keyboard Navigation**: Press `Space` or `Enter` to flip the card; press keys `1`, `2`, `3`, `4` to submit ratings without touching your mouse.
- **Session Modes**: Study all due words, review your starred favorites, or practice your entire vocabulary deck.

### 5. 🎮 Adaptive Multi-Mode Quiz Arena
Challenge yourself and measure retention through 4 specialized interactive quiz modes:
1. **Meaning Challenge**: Given a word, identify the correct definition among 4 distractor options.
2. **Word Challenge**: Given a definition, identify the target vocabulary word.
3. **Fill in the Blank (Cloze)**: Given a sample sentence with the target word masked (`_____`), pick the correct word that completes the thought.
4. **Synonym Challenge**: Identify the closest synonym for a highlighted vocabulary word.
5. **Mixed Mode**: Alternates randomly between question types for an engaging workout.
- **Smart Distractor Pooling**: Vets and shuffles distractors from your own library and a curated 113-word fallback pool to guarantee 4 unique, valid options even for brand-new users.
- **Immediate Visual Feedback**: Instant green/red feedback cards, score counter, progress bar, and comprehensive answer explanations.

### 6. 🗃️ Vocabulary Library & Notebook
- Search, filter by status (`All`, `Learning`, `Active Review`, `Mastered`), filter by starred favorites, or filter by custom tags (`gre`, `literature`, `tech`, etc.).
- Sorting by Date Added (Newest/Oldest), Alphabetical (A-Z / Z-A), and Next Review Date.
- Full Word Management: Edit custom notes, edit example sentences, add/remove tags, toggle favorites, or delete entries.
- Multi-Format Data Portability:
  - **Export to JSON**: Full raw backup.
  - **Export to CSV**: Formatted spreadsheet with escaped fields for Excel or Google Sheets.
  - **Export to Markdown**: Clean vocabulary notebook with headings, blockquotes, code badges, and source links.
  - **JSON Import**: Seamless import engine with duplicate detection and preview metrics.

### 7. 📊 Learning Analytics & Preferences Hub
- **Streak Tracker**: Tracks consecutive days of learning activity (saving words, studying cards, taking quizzes) with current streak, longest streak, and total active days.
- **Weekly Consistency Chart**: Pure SVG bar chart displaying activity distribution across the past 7 days.
- **Retention Stage Distribution**: Visual breakdown of vocabulary across *Learning* (<4 reviews), *Active Review* (1-20 days), and *Mastered* (interval &ge; 21 days).
- **Customizable Preferences**: Set your daily word target (3, 5, 10, 15) and speech synthesis speed (0.75× to 1.2×).
- **Storage Management**: 1-click Dictionary Response Cache purging and Full Data Backup download.

---

## 📐 Mathematical Specification: SuperMemo SM-2

WordWise implements the standard SM-2 algorithm:

$$\Delta EF = 0.1 - (5 - q) \times (0.08 + (5 - q) \times 0.02)$$

$$EF' = \max(1.3, EF + \Delta EF)$$

Interval Progression:
- If $q < 3$ (Failed / Again):
  - $\text{repetitions} = 0$
  - $\text{interval} = 1\text{ day}$
- If $q \ge 3$ (Passed / Hard, Good, Easy):
  - If $\text{repetitions} = 0$: $\text{interval} = 1$
  - If $\text{repetitions} = 1$: $\text{interval} = 6$
  - If $\text{repetitions} \ge 2$: $\text{interval}_{n} = \text{round}(\text{interval}_{n-1} \times EF')$

*Note:* Ease Factor is strictly clamped at a minimum of $1.3$ to prevent degenerative review lockouts.

---

## 🌐 Public APIs & Offline Fallback Strategy

WordWise uses the open **Free Dictionary API** (`https://api.dictionaryapi.dev/api/v2/entries/en/{word}`), which requires zero API keys and zero authentication.

### Dual-Layer Caching & Offline Resilience
1. **Local Response Cache**: Every successful API response is cached in `chrome.storage.local` for 30 days. Repeat queries for the same word execute with zero network roundtrips.
2. **Curated Offline Dataset (`data/daily-words.json`)**: Bundled with 113 verified, high-frequency English vocabulary words complete with definitions, IPA phonetics, examples, and synonyms. If the user is on an airplane, loses internet connection, or queries a curated word, WordWise falls back gracefully without displaying network error banners.
3. **Saved Vocabulary Offline First**: Any word already saved to your library is instantly accessible offline.

---

## 🔒 Permissions & Privacy

WordWise is built with strict privacy and security standards:
- **`storage`**: Used solely to persist your vocabulary library, SM-2 flashcard intervals, quiz history, and cached definitions locally in `chrome.storage.local`.
- **`contextMenus`**: Adds the *"Look up '%s' with WordWise"* menu option when right-clicking selected text.
- **`activeTab`**: Allows the extension to interact with the current tab when explicitly invoked by the user.
- **`host_permissions` (`https://api.dictionaryapi.dev/*`)**: Permitted solely for querying public dictionary definitions and authentic audio files.
- **No telemetry, no tracking, no external server, no ads.** Your vocabulary and notes remain 100% on your device.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Description | Location |
| :--- | :--- | :--- |
| `Alt+Shift+W` | Look up selected word with WordWise | Any webpage |
| `Space` / `Enter` | Flip flashcard front / back | Flashcard Studio |
| `1` | Rate card as **Again** (reset interval) | Flashcard Studio |
| `2` | Rate card as **Hard** | Flashcard Studio |
| `3` | Rate card as **Good** (standard SM-2) | Flashcard Studio |
| `4` | Rate card as **Easy** (bonus interval) | Flashcard Studio |
| `1` - `4` | Select quiz options A, B, C, D | Quiz Arena |
| `Escape` | Dismiss floating in-page definition card | Any webpage |

---

## 🛠️ Developer Setup & Testing

### 1. Load in Chrome (Developer Mode)
1. Open Google Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** using the toggle in the top right corner.
3. Click **Load unpacked**.
4. Select the directory: `extensions/WordWise/`.
5. The WordWise feather icon will appear in your Chrome toolbar.

### 2. Run Automated Test Suite
WordWise includes an automated unit and integration test suite with 0 external npm dependencies:

```bash
# Run tests directly with Node.js
node extensions/WordWise/tests/run-all.js

# Or via npm
npm test --prefix extensions/WordWise
```

### 3. Regenerate Pixel-Perfect Extension Icons
To regenerate native 8-bit RGBA PNG icons (`icon16.png`, `icon32.png`, `icon48.png`, `icon128.png`):
```bash
node extensions/WordWise/generate-icons.cjs
```

---

## 📄 License
WordWise is open-source software licensed under the [MIT License](LICENSE).
