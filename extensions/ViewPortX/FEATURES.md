# ViewPortX Features & Capabilities

Comprehensive breakdown of features available in **ViewPortX — Auto Responsive Engine**.

---

## 1. Responsive Transformation Engine

- **Automated Overflow Elimination**: Automatically intercepts unwanted horizontal scrollbars by applying `overflow-x: hidden !important; max-width: 100vw !important` at document level while keeping internal scrollable elements functional.
- **Fluid Container Conversion**: Converts rigid desktop fixed-width layouts (`width: 960px`, `width: 1200px`) into flexible responsive containers (`max-width: 100% !important; width: 100% !important`).
- **Responsive Media Scaling**: Automatically imposes `max-width: 100% !important; height: auto !important; object-fit: contain` on oversized images, SVGs, canvases, and video players.
- **Data Table Touch Scrollers**: Transforms wide desktop data tables into horizontally scrollable touch-friendly blocks (`display: block !important; overflow-x: auto !important; -webkit-overflow-scrolling: touch !important`).
- **Navigation Flow Wrapping**: Resolves rigid `flex-wrap: nowrap` desktop headers and menus, enabling multi-row fluid wrapping or scroll containment on small screens.
- **Typography Auto-Wrapping**: Injects `overflow-wrap: break-word !important; word-break: break-word !important` to eliminate viewport expansion caused by long unbroken URLs, hashes, and headlines.
- **Code Block Touch Scrolling**: Ensures preformatted `<pre>` and `<code>` blocks wrap cleanly or offer smooth horizontal scrolling instead of pushing document margins.
- **Grid Auto-Fitting**: Converts rigid fixed pixel column tracks (`grid-template-columns: 350px 350px 350px`) into fluid responsive columns (`repeat(auto-fit, minmax(min(100%, 260px), 1fr))`).
- **Touch Target Optimization**: Flags undersized interactive targets (< 36px) and provides one-click minimum dimension overrides (`min-height: 44px; min-width: 44px`).

---

## 2. Popup Quick Controller

- **Health Gauge**: Instant visual radial meter displaying the page's mobile readiness score (0–100) and letter grade (A–F).
- **Target Metadata**: Shows active domain name and current window viewport dimensions.
- **Key Metrics Trio**: Quick indicators for total horizontal overflow pixels, defect counts, and active transformation mode (`Original` vs `Adapted`).
- **1-Click Make Responsive**: Immediately computes and injects tailored CSS overrides into the active tab.
- **1-Click Restore Original**: Removes injected styles and returns the active tab to its exact original presentation.
- **Hover Highlighting**: Hovering over any issue in the popup highlights the corresponding element directly in the page with an animated indigo border.
- **Open Dashboard**: One-click shortcut to launch the dedicated workstation tab.

---

## 3. Full Workstation Dashboard

### Section 1: Overview
- High-level executive dashboard showing total score, grade, headline summary, and total tested element count.
- Diagnostic grid breaking down scores, tested counts, and pass/fail states across all 10 categories.
- Key telemetry stats: horizontal overflow in pixels, critical flaw counts, viewport geometry, and verification percentage.

### Section 2: DOM Inspector
- Tabular tree of scanned DOM elements with real-time computed styles.
- Live search filtering by tag, class, or selector.
- Dropdown tag filter (`div`, `img`, `table`, `nav`, `input`, `header`, `section`).
- "Highlight in Webpage" action button for individual elements.

### Section 3: Responsive Preview Simulator
- Multi-device preset buttons:
  - iPhone SE (320 × 568px)
  - iPhone 14 (390 × 844px)
  - iPhone XR (414 × 896px)
  - iPad Mini (768 × 1024px)
  - iPad Air (1024 × 768px)
  - Laptop (1280 × 800px)
- Custom width and height pixel input fields with real-time resize.
- Orientation rotation button (swaps width and height).
- Interactive device mockup frame with realistic bezel.
- Live iframe preview of the target webpage.

### Section 4: Detected Issues Diagnostic
- Filter issues by severity (`critical`, `high`, `medium`, `low`).
- Filter issues by category (`overflow`, `container`, `image`, `navigation`, `typography`, `flex-grid`, `form`, `table`, `touch-target`).
- In-depth issue cards displaying description, evidence measurements, and recommended CSS rules.
- Direct element highlight action.

### Section 5: CSS Transformations Editor
- Code editor interface showing complete generated CSS stylesheet.
- Granular rule toggles: enable or disable individual transformation rules.
- Live editing capability: customize CSS rules and click "Apply to Page" to inject them into the active tab.
- "Copy CSS" and "Export CSS" (downloads `viewportx-responsive-overrides.css`).

### Section 6: Settings & Customization
- **Auto-Scan on Page Load**: Enable automatic background inspection of loaded pages.
- **Auto-Apply Safe Fixes**: Automatically inject non-breaking fluid media and overflow rules.
- **Remember Per-Site**: Persist user transformations per domain.
- **Theme Palette**: Switch workstation styling between Obsidian Dark, Midnight Indigo, and High Contrast.
- **DOM Node Safety Ceiling**: Configurable element scanning limit (250, 500, or 1000 nodes).
