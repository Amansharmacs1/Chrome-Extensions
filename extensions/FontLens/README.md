# 🔍 FontLens — Inspect, Identify & Compare Web Typography

> **Tagline:** Inspect. Identify. Understand.  
> **Platform:** Google Chrome (Manifest V3)  
> **Technology:** Vanilla JavaScript (ES Modules), HTML5, CSS3, DOM & CSSOM APIs, Canvas Metric Heuristics, `chrome.storage.local`.  
> **Zero External Dependencies | 100% Local & Private**

---

## 🌟 Overview

**FontLens** is a developer-grade browser typography workstation designed for frontend engineers, UI/UX designers, accessibility auditors, and typography enthusiasts.

Unlike basic font inspect extensions that merely grab `getComputedStyle(el).fontFamily` and guess blindly, FontLens combines:
1. **Multi-Layered Font Identification & Evidence Engine**: Evaluates declared font stacks using CSS Font Loading APIs (`document.fonts`, `document.fonts.check()`), canvas metric deviation heuristics, loaded `FontFace` caches, and a 100+ curated zero-network Google Fonts catalog.
2. **Shadow DOM Isolated In-Page Inspector**: Floats cleanly over any website without conflicting with host page CSS or leaking styles. Includes hover badges, click-to-pin, property grids (px, rem, weight labels, line-height ratio, letter-spacing), and WCAG 2.1 contrast evaluation with recursive parent background compositing.
3. **Non-Destructive Live Style Editor**: Test font family swaps, size, weight, line-height, letter-spacing, and text color directly on the live webpage with instant rollback (`Reset` / `Reset All`).
4. **Whole-Page Typography Scanner**: Crawls visible DOM text elements, categorizes them into Headings, Body, Interactive, and Code, calculates font distribution, highlights all matching elements on the live page, and exports clean reports in JSON and CSV.
5. **Standalone Font Comparison Studio**: Side-by-side multi-font comparative rendering with custom specimen phrases, real-time typography sliders, character sets, and instant CSS export.
6. **Central Workstation Dashboard**: Manage pre-configured and custom typography presets, bookmark favorite fonts, save comparison snapshots, browse inspection history, and export/import presets.

---

## 📸 Key Interfaces

### 1. Extension Popup
- **Shortcut Indicator**: Press `Alt+Shift+F` (configurable via `chrome://extensions/shortcuts`) to toggle in-page inspection.
- **Active Domain Status**: Displays current inspected hostname with restricted-page safety guardrails (`chrome://`, web store).
- **Quick Action Tools**: One-click launchers for the Whole-Page Scanner, Font Comparison Studio, and Workstation Dashboard.
- **Recent Fonts**: Quick list of recently sampled fonts with 1-click clipboard copy.

### 2. Floating In-Page Inspector (Shadow DOM)
- **Zero Style Collision**: Injected strictly inside an isolated `attachShadow({ mode: 'open' })` custom element (`<fontlens-inspector-host>`).
- **Draggable & Pinnable**: Position the inspector anywhere on screen; pin to lock inspection to an element.
- **4 Tabbed Views**:
  - **Inspect**: Full typography breakdown (rendered family, declared stack, px & rem sizes, weight with human labels, line-height ratio, WCAG 2.1 contrast against composited background, text-rendering, alignment).
  - **Live Editor**: Adjust font family, size slider, weight, line-height, letter spacing, and color on live DOM nodes with zero permanent DOM pollution.
  - **Evidence**: Transparent breakdown of font detection evidence scores (`High Evidence`, `Moderate Evidence`, `Fallback Candidate`, `Unverified Candidate`).
  - **Presets**: Apply curated or custom typography formulas to the inspected element with 1 click.

### 3. Page Typography Scanner
- Crawls visible text elements up to configurable limit (default: 1,500 nodes).
- Groups elements into **Headings**, **Body**, **Interactive**, and **Code**.
- Computes frequency rankings for font families, sizes, and weights.
- **Live Highlight Mode**: Clicking any unique style card highlights all matching elements on the webpage.
- **Export**: Instant JSON or CSV export for design system audits.

### 4. Font Comparison Studio
- Compare 2 to 6 fonts simultaneously side-by-side.
- Interactive controls for size, weight, line height, letter spacing, text transform, and sample presets (e.g., Pangrams, Alphabet, Numerals & Symbols, Headlines, Body Paragraphs).
- Direct `@import` and CSS declaration generation.
- Save and reload comparison studio setups.

### 5. Workstation Dashboard
- **Presets Manager**: View built-in presets (Editorial Serif, Modern Tech Sans, Dense Data Mono, Bold Display Headline, UI Interactive Button), create custom presets, edit, delete, export to JSON, and import from JSON.
- **Favorite Fonts**: Specimen previews, Google Fonts metadata, and studio shortcuts.
- **Inspection History**: Chronological log of inspected fonts with timestamp and domain origin.
- **Settings & Danger Zone**: Configure default sample text, highlight outline color, tooltips, scan depth limit, and storage reset.

---

## 🚀 Installation & Setup

1. **Clone or download the repository**:
   ```bash
   git clone https://github.com/Amansharmacs1/Chrome-Extensions.git
   ```
2. Open Google Chrome and navigate to:
   ```text
   chrome://extensions
   ```
3. Enable **Developer mode** using the toggle switch in the top right corner.
4. Click the **Load unpacked** button in the top left.
5. Select the `extensions/FontLens` directory:
   ```text
   Chrome-Extensions/extensions/FontLens
   ```
6. The FontLens icon will appear in your Chrome toolbar. Pin it for quick access!

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action | Scope |
|---|---|---|
| `Alt+Shift+F` | Toggle In-Page Typography Inspector | Active Browser Tab |
| `Esc` | Unpin current element / Close inspector | Active In-Page Inspector |

*Keyboard shortcuts can be customized anytime via `chrome://extensions/shortcuts`.*

---

## 🧪 Automated Testing

FontLens comes with a comprehensive automated test suite with **187 passing assertions** across 7 test suites:

```bash
# Run from repository root
npm test --prefix extensions/FontLens
```

### Test Matrix Summary
- **Manifest V3 Configuration**: 30 assertions (manifest schema, permissions, icons, action, background worker, commands, web accessible resources).
- **Typography Engine & Utilities**: 32 assertions (stack parsing, weight normalization, rem calculation, line-height ratio, WCAG 2.1 luminance & contrast ratios, safe selector generation).
- **Font Identification & Evidence**: 24 assertions (system fallback detection, 100+ Google Fonts catalog lookup, metric deviation heuristic, evidence scoring).
- **Page Typography Scanner**: 9 assertions (DOM text node crawler, family & size deduplication, category bucketing).
- **CSS Export & Serialization**: 20 assertions (CSS rule generation, font-family declaration, scan JSON & CSV exports).
- **Presets System**: 47 assertions (built-in presets inventory, validation rules, factory generator).
- **Central Storage Engine**: 25 assertions (memory fallback, presets CRUD, favorites toggling, recent history deduplication, snapshots, settings).

---

## 📁 Project Directory Structure

```text
extensions/FontLens/
├── manifest.json                  # Manifest V3 specification
├── package.json                   # Test scripts and module configuration
├── generate-icons.cjs             # Native Node.js icon generator
├── assets/
│   └── icons/                     # 16px, 32px, 48px, 128px PNGs & SVG
├── background/
│   └── service-worker.js          # MV3 Service Worker (shortcuts & menus)
├── popup/
│   ├── popup.html                 # Extension popup markup
│   ├── popup.css                  # Extension popup styles
│   └── popup.js                   # Extension popup controller
├── inspector/
│   ├── inspector.js               # In-page event controller & hover highlights
│   ├── inspector-panel.js         # Shadow DOM floating panel & tabs
│   ├── inspector.css              # Isolated panel styling
│   └── style-manager.js           # Non-destructive live editor & reset manager
├── scanner/
│   ├── scanner.js                 # Whole-page crawler & highlighter
│   └── scanner.css                # Modal and table styling
├── comparison/
│   ├── comparison.html            # Standalone font comparison studio
│   ├── comparison.css             # Studio styling
│   └── comparison.js              # Studio state controller & presets
├── dashboard/
│   ├── dashboard.html             # Workstation dashboard markup
│   ├── dashboard.css              # Workstation dashboard styles
│   └── dashboard.js               # Presets CRUD, favorites & settings controller
├── scripts/
│   ├── typography-engine.js       # Computed styles & rem/line-height math
│   ├── font-detection.js          # Multi-layer evidence scoring engine
│   ├── google-fonts-data.js       # 100+ curated zero-network Google Fonts
│   ├── css-export.js              # CSS rules, JSON, and CSV exporters
│   ├── presets.js                 # Default presets & validation
│   ├── storage.js                 # Versioned storage with memory fallback
│   └── utils.js                   # Color conversion, contrast & selectors
├── tests/
│   ├── run-all.js                 # Master test suite runner
│   ├── manifest.test.js           # MV3 schema test
│   ├── typography-engine.test.js  # Math & computed property tests
│   ├── font-detection.test.js     # Evidence scoring tests
│   ├── scanner.test.js            # Page crawler tests
│   ├── css-export.test.js         # CSS, JSON, CSV tests
│   ├── presets.test.js            # Preset schema tests
│   └── storage.test.js            # Storage & fallback tests
├── ARCHITECTURE.md                # System design & Shadow DOM isolation
├── PERMISSIONS.md                 # Least-privilege permission justifications
├── PRIVACY.md                     # Privacy guarantee & offline operation
├── TESTING.md                     # Testing strategy & verification guide
└── CHANGELOG.md                   # Version release notes
```

---

## 🔒 Security & Privacy

- **100% Local & Private**: No analytics, no tracking, no external API calls, and no font uploads.
- **Zero Third-Party CDNs**: All icons, fonts, and scripts are bundled natively.
- **Shadow DOM Sandboxing**: Prevents host page scripts or styles from compromising extension interfaces.
- **Minimally Scoped Permissions**: Only requests `activeTab`, `scripting`, `storage`, and `tabs`.

---

## 📄 License

MIT License. Free for developers, designers, students, and open-source contributors.
