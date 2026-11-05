# 🎨 ColorPeek — Pick, Inspect & Convert Colors

> **Pick. Inspect. Copy.**  
> A polished, developer-focused Chrome extension for sampling, inspecting, converting, organizing, and exporting colors from websites.

---

## ✨ Features

- **🎯 Native Eyedropper (`EyeDropper` API)**: Sample any pixel from your display with pixel-perfect accuracy and cancellation resilience.
- **🔍 Webpage Element CSS Inspector**: Inspect computed CSS `color`, `background-color`, `border-color`, and `outline-color` by hovering any webpage element, with automatic parent background compositing for transparent layers.
- **🔄 Universal Color Conversions**: Instant bidirectional conversions between **HEX** (3, 4, 6, and 8-digit alpha), **RGB / RGBA**, **HSL / HSLA**, and **CSS Custom Properties**.
- **⚖️ WCAG 2.1 Contrast Engine**: Computes exact relative luminance with sRGB linearization to evaluate contrast ratios against WCAG AA and AAA standards for normal and large text.
- **🌈 Harmonic Palettes & Lightness Curves**: Mathematically derived color harmonies (Complementary, Analogous, Triadic, Tetradic, Monochromatic) plus a 10-step design-system tint/shade scale (50–900).
- **📁 Palette Management & Local Storage**: Create, rename, reorder, and save named color palettes with custom color names and developer notes.
- **💻 Developer Code Export Center**: One-click export to **CSS Custom Properties (`:root`)**, **SCSS/SASS variables**, **Tailwind CSS configuration snippets**, **plain HEX lists**, and **JSON design tokens**.
- **✨ CSS Gradient Studio**: Interactive multi-stop linear and radial gradient builder with angle controls and direct CSS snippet generation.
- **🛡️ 100% Offline & Private**: Zero external network transmission, zero telemetry, zero dependencies, and strictly minimal Manifest V3 permissions.

---

## 📂 Project Structure

```text
extensions/ColorPeek/
├── manifest.json                  # Manifest V3 configuration
├── popup.html / popup.css / popup.js # Compact popup with picker, contrast & harmonies
├── dashboard.html / dashboard.css / dashboard.js # Full-screen developer studio workstation
├── background.js                  # Service worker for inspector injection & tab routing
├── generate-icons.cjs             # Self-contained PNG/SVG icon generator
├── assets/                        # Extension icons (16, 32, 48, 128px & icon.svg)
├── scripts/
│   ├── color-converter.js         # Canonical color model & bidirectional parser
│   ├── contrast-checker.js        # WCAG 2.1 luminance & contrast calculations
│   ├── harmonies.js               # Color harmonies & 10-step shading curves
│   ├── css-exporter.js            # CSS, SCSS, Tailwind, and JSON token generator
│   ├── palette-manager.js         # Palettes CRUD, recent picks & state manager
│   ├── storage.js                 # chrome.storage.local engine with schema fallback
│   ├── eyedropper.js              # Native EyeDropper API bridge
│   ├── element-inspector.js       # Injected hover inspector for computed CSS colors
│   └── utils.js                   # Clipboard writer, toast notifications, sanitizers
├── tests/
│   ├── run-all.js                 # Master automated test runner
│   ├── manifest.test.js           # Manifest V3 & packaging audit
│   ├── color-converter.test.js    # Parsing, clamping & round-trip tests
│   ├── contrast-checker.test.js   # sRGB linearization & threshold tests
│   ├── harmonies.test.js          # Harmony calculations & scale tests
│   ├── palette-manager.test.js    # Palettes, recents & deduplication tests
│   ├── css-exporter.test.js       # Snippets & gradient generator tests
│   ├── storage.test.js            # Storage engine & persistence tests
│   └── security.test.js           # XSS, injection & bounds clamping tests
├── ARCHITECTURE.md                # System design & technical specifications
├── PERMISSIONS.md                 # Minimal permissions rationale
├── PRIVACY.md                     # Data privacy & security policy
├── TESTING.md                     # Test suite report & manual verification steps
├── CHANGELOG.md                   # Release notes & version history
└── package.json                   # Node.js test configuration
```

---

## 🚀 Installation

1. Open Google Chrome and navigate to `chrome://extensions`.
2. Enable **Developer mode** using the toggle switch in the top-right corner.
3. Click the **Load unpacked** button in the top-left corner.
4. Select the `extensions/ColorPeek` directory from this repository.
5. Pin **ColorPeek** to your Chrome toolbar for instant access.

---

## 🛠️ Usage Guide

### 1. Sampling with Native Eyedropper
- Click the **Pick** button in the popup toolbar.
- Move the magnifying loupe over any pixel on your screen or webpage.
- Click to capture the exact sampled pixel color.
- Press <kbd>Esc</kbd> anytime to cancel without errors.

### 2. Inspecting Webpage Element CSS
- Click the **Inspect** button in the popup toolbar.
- Hover over any element on the page: a clean overlay and floating HUD will display the element selector, text color, computed background color, and border color.
- Transparent backgrounds automatically traverse parent elements to identify the visible composited surface.
- Click to capture the color, or press <kbd>Esc</kbd> to exit cleanly without modifying page styles.

### 3. Contrast Evaluation
- Switch to the **Contrast** tab in the popup or visit the Dashboard.
- Adjust foreground and background colors (or click ⇄ to swap).
- Check the live text preview alongside exact WCAG AA and AAA badges for normal text (4.5:1 / 7:1) and large text (3:1 / 4.5:1).

### 4. Color Harmonies & Shading Scale
- View mathematically derived Complementary, Analogous, Triadic, and 10-step Shading curves (50 to 900) based on your active color.
- Click any swatch to load it as your active color or add it to your palette.

### 5. Developer Code Exports
- Open the Dashboard Workstation by clicking the top-right workstation icon.
- View your palette colors and select your desired format:
  - **CSS Variables**: `:root { --primary: #3B82F6; ... }`
  - **SCSS**: `$primary: #3B82F6; ...`
  - **Tailwind Config**: `module.exports = { theme: { extend: { colors: ... } } }`
  - **JSON Tokens**: Structured design token payload
  - **Plain HEX List**: One HEX per line
- Click **Copy Code** for instant clipboard export.

---

## 🧪 Testing

ColorPeek includes an automated test suite with **216 tests across 8 suites**:

```bash
npm test --prefix extensions/ColorPeek
```

All tests run in standard Node.js without third-party dependencies.

---

## 🔒 Security & Privacy

- **No Remote Servers**: 100% local processing in your browser.
- **No Analytics / Telemetry**: Your browsing activity and sampled colors never leave your device.
- **Minimal Permissions**: Strictly limited to `storage`, `activeTab`, and `scripting`. No broad `<all_urls>` access.

---

## 📄 License

MIT License. Built as part of the Chrome Extensions collection.
