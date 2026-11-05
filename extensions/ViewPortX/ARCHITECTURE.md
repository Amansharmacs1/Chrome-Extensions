# ViewPortX Architecture & Engineering Guide

## 1. Architectural Philosophy

ViewPortX is engineered around four core tenets:
1. **Client-Side Autonomy**: Zero dependencies on remote APIs, backend services, or cloud rendering engines. All operations happen synchronously or asynchronously inside the user's browser.
2. **Non-Destructive Local Mutation**: Original HTML markup and server responses are never altered or persisted on the remote host. Layout adaptations are delivered via isolated CSS injection using `<style id="viewportx-responsive-styles">`.
3. **Safe Selector Synthesis**: Selectors are generated hierarchically, ensuring robust target identification without polluting document state or relying on fragile random classes.
4. **Deterministic Measurement & Verification**: No issue is marked resolved without comparing before-and-after layout geometry (`scrollWidth - clientWidth`).

---

## 2. Component Diagram

```
+-----------------------------------------------------------------------------------+
|                               Chrome Extension Context                             |
|                                                                                   |
|  +--------------------+         +---------------------+                           |
|  |     popup.html     |         |    dashboard.html   |                           |
|  |     popup.js       |         |    dashboard.js     |                           |
|  +---------+----------+         +----------+----------+                           |
|            |                               |                                      |
|            |      chrome.tabs.sendMessage  |                                      |
|            +---------------+---------------+                                      |
|                            |                                                      |
|                            v                                                      |
|                 +--------------------+                                            |
|                 |    background.js   | <---> chrome.storage.local                 |
|                 |   (Service Worker) |                                            |
|                 +----------+---------+                                            |
|                            |                                                      |
+----------------------------|------------------------------------------------------+
                             | chrome.tabs.sendMessage / chrome.scripting
                             v
+-----------------------------------------------------------------------------------+
|                             Active Web Page Context                               |
|                                                                                   |
|                      +-----------------------------+                              |
|                      |         content.js          |                              |
|                      |   (Content Script Bridge)   |                              |
|                      +--------------+--------------+                              |
|                                     |                                             |
|        +----------------------------+----------------------------+                |
|        |                            |                            |                |
|        v                            v                            v                |
|  +------------+              +--------------+             +--------------+        |
|  | scanner.js |              |  analyzer.js |             |transformer.js|        |
|  | (Inspect)  |              |  (Diagnose)  |             | (Generate)   |        |
|  +-----+------+              +------+-------+             +------+-------+        |
|        |                            |                            |                |
|        +------------+---------------+                            |                |
|                     v                                            v                |
|              +---------------+                            +--------------+        |
|              |health-score.js|                            |  <style id=  |        |
|              |  (Evaluate)   |                            |  viewportx>  |        |
|              +---------------+                            +------+-------+        |
|                                                                  |                |
|                                                                  v                |
|                                                           +--------------+        |
|                                                           |  verifier.js |        |
|                                                           |  (Validate)  |        |
|                                                           +--------------+        |
+-----------------------------------------------------------------------------------+
```

---

## 3. Core Engine Pipeline

### Step 1: DOM Scanner (`scripts/scanner.js`)
- Inspects document viewport geometry (`window.innerWidth`, `document.documentElement.clientWidth`, `scrollWidth`).
- Traverses visible layout containers, media tags, tables, forms, typography, and interactive targets up to a configurable safety limit (`maxElementsScanned`, default: 500–1000).
- Extracts computed CSS properties (`width`, `height`, `maxWidth`, `overflowX`, `boxSizing`, `flexWrap`, `gridTemplateColumns`, etc.).
- Calculates precise bounding boxes via `getBoundingClientRect()`.
- Produces a strongly-typed `DOMScanReport`.

### Step 2: Issue Detection Analyzer (`scripts/analyzer.js`)
- Evaluates the `DOMScanReport` against 10 responsive web design heuristics:
  1. **Horizontal Overflow**: `scrollWidth > clientWidth` or `rect.right > viewportWidth + 3px`.
  2. **Fixed-Width Containers**: Containers with rigid pixel widths exceeding viewport or lacking fluid `max-width`.
  3. **Images & Media**: Media elements missing `max-width: 100%` or `height: auto`.
  4. **Navigation Layout**: Flex navigation containers configured with `flex-wrap: nowrap`.
  5. **Typography Wrapping**: Text containers and `<pre>` code snippets lacking `overflow-wrap: break-word` or `overflow-x: auto`.
  6. **Flex & Grid Tracks**: CSS Grids with multiple fixed pixel columns totaling more than the viewport width.
  7. **Form Controls**: Form elements lacking `box-sizing: border-box` or extending beyond container width.
  8. **Tables**: Data tables wider than the viewport without an horizontal scroll wrapper.
  9. **Element Stacking**: Occluded content caused by fixed/absolute positioning.
  10. **Touch Targets**: Interactive links and buttons smaller than 36px on mobile viewports.
- Outputs prioritized `ResponsiveIssue[]` sorted by severity (`critical`, `high`, `medium`, `low`, `info`).

### Step 3: Responsive Health Score (`scripts/health-score.js`)
- Weights each category according to user impact:
  - Overflow: **25%**
  - Containers: **15%**
  - Navigation: **10%**
  - Media: **10%**
  - Typography: **10%**
  - Flex & Grid: **10%**
  - Forms: **5%**
  - Tables: **5%**
  - Stacking: **5%**
  - Touch Targets: **5%**
- Aggregates overall health score (0–100) and assigns an actionable letter grade (`A`, `B`, `C`, `D`, `F`).

### Step 4: CSS Transformation Engine (`scripts/transformer.js`)
- Translates detected issues into scoped CSS declarations.
- Appends global normalizations (`box-sizing: border-box`, fluid media rules).
- Compiles the final stylesheet and injects it into the page `<head>` or document root using `<style id="viewportx-responsive-styles">`.
- Supports targeted removal via `removeInjectedStyles()` for 1-click rollback.

### Step 5: Layout Verification Engine (`scripts/verifier.js`)
- Re-reads post-injection DOM geometry.
- Quantifies horizontal scrollbar reduction and individual element constraint fulfillment.
- Classifies each transformation as `verified`, `partially_verified`, `unsuccessful`, or `regressed`.
- Computes overall success rate percentage.

---

## 4. Security & Isolation

- **Zero Remote Code Execution**: All CSS rules are generated strictly within client JavaScript without evaluating remote strings (`unsafe-eval` is never used).
- **Strict Selector Escaping**: Selectors are generated from sanitized element tag names, alphanumeric IDs, and filtered CSS classes.
- **Sandboxed Emulation**: Dashboard responsive iframe simulator uses standard sandbox attributes to prevent unsolicited top-frame navigation.
