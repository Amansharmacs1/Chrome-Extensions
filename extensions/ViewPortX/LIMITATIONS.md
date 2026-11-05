# ViewPortX Known Limitations & Edge Cases

ViewPortX is designed to maximize safety, reversibility, and user control. As a client-side layout transformation engine, there are inherent boundaries to what client CSS overrides can achieve without altering application source code.

---

## 1. Browser Internal Pages & Web Stores

- **Constraint**: Chrome security policies strictly prohibit content scripts and CSS injection on internal browser URLs (`chrome://`, `chrome-extension://`, `edge://`, `about:`, `view-source:`) and the Chrome Web Store (`https://chromewebstore.google.com`).
- **Handling**: ViewPortX detects these restricted pages automatically, shows a friendly notice in the popup, and disables modification actions gracefully.

---

## 2. Canvas, WebGL & Video Game Renderers

- **Constraint**: Websites that render their user interface entirely inside an HTML `<canvas>` element (e.g. Unity WebGL exports, full-canvas interactive games, Flash-emulated apps) do not use DOM nodes for layout.
- **Handling**: ViewPortX scales the `<canvas>` element boundary to fit within the viewport width (`max-width: 100% !important`), but cannot reflow text or reorganize internal game UI controls rendered inside the canvas bitmap.

---

## 3. Cross-Origin `<iframe>` Elements

- **Constraint**: Content embedded inside cross-origin `<iframe>` tags (such as third-party payment widgets or embedded external embeds) is protected by the browser's Same-Origin Policy.
- **Handling**: ViewPortX constrains the outer `<iframe>` dimensions to prevent it from pushing the host page into horizontal overflow (`max-width: 100% !important`), but cannot manipulate the internal DOM of the cross-origin frame.

---

## 4. Complex JavaScript Resize Listeners

- **Constraint**: Some legacy desktop web applications execute custom JavaScript loops on window resize that continuously write hardcoded inline pixel values (e.g. `element.style.width = '1200px'`) overriding standard CSS specificity.
- **Handling**: ViewPortX applies `!important` flags on generated CSS rules, which takes precedence over normal inline styles. In rare cases where a script calculates child offsets based on old coordinate expectations, layout coordinates may require user tuning in the CSS Transformations Editor.

---

## 5. Single-Page Application (SPA) Route Transitions

- **Constraint**: Heavy client-rendered SPAs (React, Vue, Angular) that dynamically mount new DOM trees without triggering a browser navigation event may introduce newly un-scanned elements.
- **Handling**: Users can click "Re-scan Webpage" in the dashboard or click "Make Responsive" in the popup to re-analyze newly mounted view states.
