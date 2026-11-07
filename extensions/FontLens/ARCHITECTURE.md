# 🏗️ FontLens Architecture & Technical Specification

This document provides a comprehensive architectural breakdown of the **FontLens** Chrome extension, its isolation mechanisms, font identification heuristics, DOM safety guarantees, and state persistence.

---

## 1. High-Level Component Topology

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        FontLens Architecture                           │
└────────────────────────────────────────────────────────────────────────┘

  [ Browser Toolbar / Shortcut (Alt+Shift+F) ]
                    │
                    ▼
       ┌────────────────────────┐
       │     Extension Popup    │ ─── Opens ───► [ Comparison Studio ]
       │      (popup.html)      │ ─── Opens ───► [ Workstation Dashboard ]
       └───────────┬────────────┘
                   │ Injects via chrome.scripting
                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                       Active Web Page DOM                              │
│                                                                        │
│  [ Host Page Elements ] ◄── Hover / Click Events ── [ Inspector Controller ]
│          │                                                  │
│          ▼                                                  ▼
│  [ Computed CSSOM ] ──► [ Typography Engine ] ──► [ Shadow DOM Panel ]
│  [ Effective BG ]  ──► [ Contrast Math ]    │   - Draggable Header
│  [ Inline Styler ] ◄── [ Style Manager ]     │   - Tabs: Inspect, Edit,
│                                              │           Evidence, Presets
│                                              ▼
│                                    [ Shadow DOM Scanner ]
│                                    - Element Crawler
│                                    - Unique Style Deduplication
│                                    - On-Page Multi-Element Highlight
└──────────────────────────────────────┬─────────────────────────────────┘
                                       │
                                       ▼
                       ┌───────────────────────────────┐
                       │     Central Storage Engine    │
                       │    (chrome.storage.local)     │
                       │   - Presets (Built-in/Custom) │
                       │   - Favorited Fonts           │
                       │   - Recent Inspection History │
                       │   - Comparison Snapshots      │
                       │   - User Preferences          │
                       └───────────────────────────────┘
```

---

## 2. Shadow DOM Encapsulation & Style Safety

### The Problem
Traditional browser extensions that inject floating panels into active pages suffer from two severe failure modes:
1. **Host Styles Leaking In**: The webpage's aggressive CSS (e.g. `* { box-sizing: content-box !important; color: red !important; }` or CSS resets) breaks the extension UI.
2. **Extension Styles Leaking Out**: The extension's CSS accidentally alters page buttons, fonts, or layouts.

### FontLens Solution
FontLens mounts both its Floating Inspector Panel and Page Scanner Modal inside isolated **Shadow Roots**:

```javascript
// inspector/inspector-panel.js
const host = document.createElement('fontlens-inspector-host');
host.id = 'fontlens-inspector-host';
const shadowRoot = host.attachShadow({ mode: 'open' });

// Stylesheet is injected strictly inside the shadow root
const link = document.createElement('link');
link.rel = 'stylesheet';
link.href = chrome.runtime.getURL('inspector/inspector.css');
shadowRoot.appendChild(link);
```

- Host website styles cannot penetrate the Shadow boundary.
- FontLens styles cannot escape into the parent document.
- Z-index is safely capped at `2147483647` on the host tag.
- Keyboard navigation events inside the shadow root are isolated from host shortcut listeners.

---

## 3. Font Identification & Evidence Engine

Modern web browsers do not expose a direct API to ask: *"Which exact font file did HarfBuzz / CoreText use to draw glyph 42?"* FontLens solves this challenge with a **multi-layered evidence evaluation pipeline** that scores confidence transparently:

```text
Declared Font-Family Stack: ["Inter", "-apple-system", "BlinkMacSystemFont", "sans-serif"]
                                      │
  ┌───────────────────────────────────┼───────────────────────────────────┐
  ▼                                   ▼                                   ▼
[ Layer 1: System Fallback ]     [ Layer 2: FontFace Cache ]    [ Layer 3: fonts.check() ]
  - Checks generic fallbacks       - Iterates document.fonts      - Executes document.fonts.check()
  - Flags fallback candidates      - Matches loaded FontFace      - Adds +25 confidence
                                   - Adds +45 confidence
  ┌───────────────────────────────────┼───────────────────────────────────┘
  ▼                                   ▼
[ Layer 4: Canvas Metric Deviation ] [ Layer 5: Google Fonts Catalog ]
  - Measures glyph bounding box       - Checks 100+ curated library
    vs baseline system fallbacks       - Extracts category & specimen
  - Identifies width divergence       - Confirms webfont availability
  - Adds +25 confidence
                                      │
                                      ▼
                        [ Confidence Aggregator ]
            ┌─────────────────────────┬─────────────────────────┐
            │ Score ≥ 70:             │ High Evidence           │
            │ Score 35 - 69:          │ Moderate Evidence       │
            │ System generic:         │ Fallback Candidate      │
            │ Otherwise:              │ Unverified Candidate    │
            └─────────────────────────┴─────────────────────────┘
```

### Canvas Metric Deviation Heuristic
When a web font loads, glyph geometry differs from standard fallbacks (`monospace`, `sans-serif`).
FontLens measures a broad test glyph string (`BESbswy 1234567890 !@#$%^&*()`) rendered at `72px`:
```javascript
// Baseline measurements
ctx.font = '72px monospace';
const monoWidth = ctx.measureText(testString).width;

// Candidate font paired with fallback
ctx.font = '72px "CandidateFont", monospace';
const testWidth = ctx.measureText(testString).width;

const metricDivergence = Math.abs(testWidth - monoWidth) > 0.5;
```
If `metricDivergence` is true, the candidate font is installed or active in memory.

---

## 4. Recursive Parent Background Compositing & WCAG 2.1 Contrast

Most text elements have `backgroundColor: transparent` or `rgba(0, 0, 0, 0)`. Simply checking `getComputedStyle(element).backgroundColor` returns transparent, making contrast calculations impossible.

FontLens implements a recursive compositor:
1. Traverses up the DOM tree from the target element to `<html>`.
2. Collects non-transparent background colors in a stack.
3. Composites layers top-to-bottom using alpha blending (`compositeOver`):
   $$\text{Color}_{\text{result}} = \alpha \cdot \text{Color}_{\text{fg}} + (1 - \alpha) \cdot \text{Color}_{\text{bg}}$$
4. Defaults base layer to standard canvas white (`rgb(255, 255, 255)`).
5. Calculates WCAG 2.1 relative luminance ($L$):
   $$L = 0.2126 \cdot R' + 0.7152 \cdot G' + 0.0722 \cdot B'$$
6. Computes contrast ratio:
   $$\text{Ratio} = \frac{L_1 + 0.05}{L_2 + 0.05}$$
7. Evaluates against WCAG AA (4.5:1 / 3.0:1 large) and AAA (7.0:1 / 4.5:1 large).

---

## 5. Non-Destructive Live Style Manager

When developers test typography changes in the Live Editor or apply Presets:
1. `style-manager.js` records the element's existing `style.cssText` in an internal `WeakMap`.
2. Applies overrides directly via `element.style[prop] = value`.
3. Clicking **Reset** restores the original inline style string immediately.
4. Clicking **Reset All** traverses all modified elements and restores original styling.
5. Closing the inspector automatically triggers `resetAll()` to leave the user's webpage completely clean.

---

## 6. Centralized Versioned Storage

All persistence is managed via `scripts/storage.js`:
- **Schema Versioning**: Monitored via `fontlens_schema_version` (v1).
- **Graceful In-Memory Fallback**: When running inside Node.js unit tests or non-extension contexts, an in-memory `Map` provides identical asynchronous storage semantics without crashing.
- **Deduplicated History**: Recent fonts history is capped at 25 entries and automatically deduplicated.
- **Built-in Preset Protection**: Attempts to delete or corrupt built-in presets throw descriptive errors.
