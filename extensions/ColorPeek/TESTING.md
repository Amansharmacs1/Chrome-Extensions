# 🧪 ColorPeek Testing & Quality Assurance Guide

ColorPeek includes a comprehensive, self-contained automated test suite covering all color models, WCAG 2.1 contrast formulas, harmony calculations, palette management, CSS code generation, storage persistence, and security input validation.

---

## 1. Running the Automated Test Suite

No npm installation is required. The test runner uses Node.js built-ins (`node:assert`, `node:fs`, `node:path`):

```bash
# Run tests directly with Node.js
npm test --prefix extensions/ColorPeek

# Or directly invoke the runner script
node extensions/ColorPeek/tests/run-all.js
```

### Current Test Suite Status
- **Total Test Suites**: 8 / 8 Passing
- **Total Tests**: 216 / 216 Passing (100%)
- **Failures / Regressions**: 0

---

## 2. Test Suite Breakdown

| Suite | File | Tests | Coverage Scope |
|:---|:---|:---:|:---|
| **Manifest & Packaging** | `manifest.test.js` | 43 | Manifest V3 compliance, icons presence, permission restrictions, CSP |
| **Color Conversions** | `color-converter.test.js` | 46 | HEX 3/4/6/8-digit, RGB, RGBA, HSL, HSLA, named colors, channel clamping |
| **Contrast Engine** | `contrast-checker.test.js` | 24 | sRGB linearization, luminance, contrast ratio math, WCAG AA/AAA normal & large |
| **Harmonies & Shading** | `harmonies.test.js` | 27 | Complementary, analogous, triadic, tetradic, monochromatic, 10-step scale (50-900) |
| **Palette Manager** | `palette-manager.test.js` | 23 | CRUD, default starters, color reordering, recents deduplication, active color |
| **Code Exporter** | `css-exporter.test.js` | 25 | CSS `:root` variables, SCSS variables, Tailwind config, plain HEX, JSON, gradients |
| **Storage Engine** | `storage.test.js` | 8 | `chrome.storage.local` engine with in-memory fallback, multi-key operations |
| **Security & Sanitization** | `security.test.js` | 20 | XSS sanitization, HTML escaping, CSS variable injection rejection, channel bounds |

---

## 3. Manual Testing Verification Checklist

To verify ColorPeek in Google Chrome:

1. Open Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** (toggle in top-right corner).
3. Click **Load unpacked** and select the `/Users/amansharma/Desktop/Extension/extensions/ColorPeek/` directory.
4. Verify the extension loads without error warnings:
   - Icon displayed in toolbar.
   - Click toolbar icon to open popup.
5. **Test Eyedropper**:
   - Click "Pick Screen Pixel".
   - Sample a pixel from any webpage.
   - Verify hero swatch updates and color formats reflect the picked color.
6. **Test Element CSS Inspector**:
   - Click "Inspect CSS Color".
   - Hover over page elements and verify HUD shows tag, class, computed colors.
   - Click to sample; verify color updates in popup/studio.
   - Press <kbd>Escape</kbd> to verify HUD cleans up completely.
7. **Test Dashboard & Export**:
   - Click the expand icon to open `dashboard.html`.
   - Test RGBA and HSLA sliders in the Color Studio.
   - Select "CSS Variables", "SCSS", "Tailwind", or "JSON" in the Export Center and click "Copy Code".
   - Verify clipboard contains sanitized, ready-to-use developer snippets.
