# 📜 WordWise — Changelog

All notable changes to the **WordWise** Chrome Extension will be documented in this file.

---

## [1.0.0] — 2026-11-08

### ✨ Initial Release

#### 🔍 Core Discovery & Dictionary Lookups
- Implemented in-page selection listener with surrounding sentence extractor.
- Created isolated Shadow DOM floating definition card (`#wordwise-card-host`) preventing host CSS pollution.
- Integrated public Free Dictionary API client with automatic 30-day client-side caching.
- Integrated dual-mode pronunciation audio (authentic lexicographer MP3s with Web Speech API fallback).
- Added right-click context menu integration: *"Look up '%s' with WordWise"*.
- Added keyboard shortcut `Alt+Shift+W` for instant in-page lookups.

#### 🧠 Spaced Repetition (SuperMemo SM-2)
- Implemented complete SuperMemo SM-2 spaced repetition calculation engine.
- Configured 4 rating choices: Again, Hard, Good, Easy with interval scaling and ease factor adjustments.
- Built interactive 3D flipping card workspace with keyboard controls (`Space` to flip, `1-4` to rate).
- Added dynamic upcoming interval preview labels on rating buttons.
- Filter decks by Due Today, Starred Favorites, or Complete Vocabulary.

#### 🎮 Interactive Quiz Arena
- Built 4 interactive quiz modes:
  1. Meaning Challenge (Word $\rightarrow$ Definition)
  2. Word Challenge (Definition $\rightarrow$ Word)
  3. Fill in the Blank / Cloze (Masked sentence $\rightarrow$ Word)
  4. Synonym Challenge (Word $\rightarrow$ Synonym)
  5. Mixed Mode (Cycles across all 4 modes)
- Implemented smart distractor pooling with fallback distractor catalog.
- Added instant feedback cards, explanations, score counter, and session history logging.

#### 🗃️ Vocabulary Library & Notebook
- Created responsive vocabulary library dashboard with real-time text search.
- Added filters for status (`Learning`, `Active Review`, `Mastered`), starred favorites, and custom tags.
- Built full word management modal: edit notes, custom examples, tags, and favorites.
- Built multi-format data export: JSON backup, RFC 4180 CSV, and Markdown notebook.
- Built JSON import modal with duplicate detection and preview verification.

#### 📊 Learning Analytics & Settings
- Implemented learning streak tracker (current streak, longest streak, active days).
- Implemented pure SVG weekly activity bar chart.
- Added retention stage distribution breakdown.
- Added user preferences for daily word target and speech synthesis speed.
- Added dictionary cache clearing and full data backup/reset tools.

#### 🧪 Testing & Developer Tooling
- Implemented 7 automated test suites with 187 passing assertions and 0 external npm dependencies.
- Added native PNG icon generator script (`generate-icons.cjs`) creating pixel-perfect 16/32/48/128px icons.
- Authored comprehensive documentation: `README.md`, `ARCHITECTURE.md`, `PERMISSIONS.md`, `PRIVACY.md`, `TESTING.md`.
