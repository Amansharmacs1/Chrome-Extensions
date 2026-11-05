# 🏗️ ColorPeek Architecture & Technical Design

This document details the software architecture, canonical data pipelines, color models, security boundaries, and storage lifecycle of the **ColorPeek** Chrome Extension.

---

## 1. High-Level System Architecture

ColorPeek is constructed entirely with vanilla modern JavaScript (ES2022+ modules) and standard Chrome Extension APIs under **Manifest V3**. It requires zero external build steps, zero package bundlers, and zero remote runtime dependencies.

```text
┌────────────────────────────────────────────────────────────────────────┐
│                          User Interface                                │
│                                                                        │
│   ┌──────────────────────────┐          ┌──────────────────────────┐   │
│   │   popup.html / .js       │          │   dashboard.html / .js   │   │
│   │   (Quick Action Panel)   │          │   (Color Studio Center)  │   │
│   └─────────────┬────────────┘          └─────────────┬────────────┘   │
└─────────────────┼─────────────────────────────────────┼────────────────┘
                  │                                     │
                  ▼                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        Core Processing Engine                          │
│                                                                        │
│  ┌───────────────────────┐  ┌──────────────────────┐  ┌─────────────┐  │
│  │  color-converter.js   │  │ contrast-checker.js  │  │harmonies.js │  │
│  │  Canonical Pipeline   │  │ WCAG 2.1 Luminance   │  │Design Scales│  │
│  └──────────┬────────────┘  └──────────┬───────────┘  └──────┬──────┘  │
│             │                          │                     │         │
│             ▼                          ▼                     ▼         │
│  ┌───────────────────────┐  ┌──────────────────────┐  ┌─────────────┐  │
│  │  palette-manager.js   │  │   css-exporter.js    │  │ eyedropper  │  │
│  │  Palettes & Recents   │  │   CSS/SCSS/Tailwind  │  │  & HUD      │  │
│  └───────────────────────┘  └──────────────────────┘  └─────────────┘  │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                       Storage & Communication                          │
│                                                                        │
│  ┌─────────────────────────┐             ┌──────────────────────────┐  │
│  │       storage.js        │             │      background.js       │  │
│  │  (chrome.storage.local) │             │ (Service Worker Routing) │  │
│  └─────────────────────────┘             └──────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Canonical Color Pipeline

Color data enters the system from diverse sources: user text input, Eyedropper hex values, computed CSS `rgb()`/`rgba()` strings from elements, or slider numerical values. To prevent cumulative drift and formatting bugs, ColorPeek uses a **canonical representation**:

```javascript
CanonicalColor = {
  r: 0-255,   // Red channel (integer)
  g: 0-255,   // Green channel (integer)
  b: 0-255,   // Blue channel (integer)
  a: 0.0-1.0  // Alpha channel (float, 0 to 1)
}
```

### Transformation Flow
1. **Input Parsing (`parseColor`)**: Inputs are matched against strict regular expressions supporting:
   - 3-digit HEX (`#abc`) -> converted to 6-digit (`#aabbcc`)
   - 4-digit HEX with alpha (`#abcd`) -> 8-digit (`#aabbccdd`)
   - 6-digit HEX (`#0284c7`)
   - 8-digit HEX (`#0284c7ff`)
   - `rgb(r, g, b)` and `rgba(r, g, b, a)`
   - `hsl(h, s%, l%)` and `hsla(h, s%, l%, a)`
   - 16 standardized CSS color names (white, black, red, green, blue, cyan, etc.)
2. **Channel Clamping**: Every channel is clamped strictly into its valid range: $R, G, B \in [0, 255]$, $A \in [0.0, 1.0]$.
3. **Format Projection (`formatColor`)**: Formats are derived on demand from the canonical structure:
   - `hex`: `#RRGGBB` or `#RRGGBBAA` (when alpha < 1)
   - `rgb`: `rgb(r, g, b)`
   - `rgba`: `rgba(r, g, b, a)`
   - `hsl`: `hsl(h, s%, l%)`
   - `hsla`: `hsla(h, s%, l%, a)`
   - `css-var`: `--<slug>: <hex>;`

---

## 3. WCAG 2.1 Contrast Engine

Relative luminance is calculated strictly conforming to **W3C WCAG 2.1 Recommendation §1.4.3**:

$$
L = 0.2126 \times R_{\text{lin}} + 0.7152 \times G_{\text{lin}} + 0.0722 \times B_{\text{lin}}
$$

Where linearized sRGB channels ($C_{\text{srgb}} \in [0, 1]$) are calculated as:

$$
C_{\text{lin}} = \begin{cases}
\frac{C_{\text{srgb}}}{12.92} & \text{if } C_{\text{srgb}} \le 0.04045 \\
\left(\frac{C_{\text{srgb}} + 0.055}{1.055}\right)^{2.4} & \text{otherwise}
\end{cases}
$$

The contrast ratio between two relative luminances $L_1$ and $L_2$ ($L_1 > L_2$) is:

$$
\text{Ratio} = \frac{L_1 + 0.05}{L_2 + 0.05}
$$

### Thresholds Evaluated
- **WCAG AA Normal Text**: $\ge 4.5:1$
- **WCAG AA Large Text** ($\ge 18\text{pt}$ or bold $\ge 14\text{pt}$): $\ge 3.0:1$
- **WCAG AAA Normal Text**: $\ge 7.0:1$
- **WCAG AAA Large Text**: $\ge 4.5:1$

---

## 4. Element Inspector Lifecycle

When the user activates "Inspect CSS Color" from the popup or studio:
1. `popup.js` / `dashboard.js` sends an `INSPECT_ELEMENT_COLOR` message to `background.js`.
2. `background.js` verifies the active tab URL (rejecting `chrome://`, `chrome-extension://`, and Web Store URLs).
3. `background.js` injects `scripts/element-inspector.js` via `chrome.scripting.executeScript`.
4. The content script sets up:
   - Dynamic floating HUD display (`#colorpeek-inspector-hud`).
   - `mousemove` listener with element highlight outline.
   - Transparent background resolution: if an element has `background-color: transparent` or `rgba(..., 0)`, the inspector walks up the DOM hierarchy until it finds an opaque parent surface.
   - `click` listener capturing computed `color`, `backgroundColor`, and `borderColor`.
   - `keydown` listener listening for <kbd>Escape</kbd> to cleanly tear down and remove all injected HUD elements.
5. On selection, the color is saved to `readease_active_color` in storage and the popup / studio updates immediately.

---

## 5. Storage Schema & Persistence

ColorPeek uses `chrome.storage.local` with in-memory caching and fallbacks:

```json
{
  "colorpeek_active_color": {
    "hex": "#0284c7",
    "name": "Primary Cyan",
    "source": "eyedropper",
    "timestamp": 1793344000000
  },
  "colorpeek_recent_colors": [
    {
      "hex": "#0284c7",
      "name": "Sky 600",
      "source": "eyedropper",
      "timestamp": 1793344000000
    }
  ],
  "colorpeek_palettes": [
    {
      "id": "pal-default-tail",
      "name": "Tailwind Highlights",
      "isDefault": true,
      "colors": [
        { "id": "c-1", "hex": "#0284c7", "name": "Sky 600", "note": "Primary CTA" }
      ]
    }
  ]
}
```

- **Deduplication Policy**: When a color is sampled, `recordRecentColor` checks for existing matches by HEX. If matched, it moves the color to index `0` and updates its timestamp without duplicating storage.
- **Quota Resilience**: Recent picks list is capped at 50 items to ensure storage efficiency.
