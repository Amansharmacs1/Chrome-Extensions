# 🏛️ BugShot — Architecture & Technical Design

This document details the software architecture, state lifecycle, canvas rendering strategy, and diagnostic pipelines in BugShot.

---

## 1. System Overview & Component Diagram

```text
┌─────────────────────────────────────────────────────────────┐
│                       Active Browser Tab                    │
│  [console-monitor.js] [selection-overlay.js] [content.js]   │
└──────────────────────────────┬──────────────────────────────┘
                               │ IPC Messaging
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Background Service Worker                   │
│        (captureVisibleTab / executeScript / routing)        │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
               ▼                              ▼
┌─────────────────────────────┐  ┌────────────────────────────┐
│      Annotation Editor      │  │      Report Generator      │
│  [Dual-Canvas Engine]       │  │  [Form & Export Center]    │
│  [HistoryManager Stack]     │  │  [JSON, MD, PDF, Summary]  │
└──────────────┬──────────────┘  └────────────┬───────────────┘
               │                              │
               ▼                              ▼
┌─────────────────────────────────────────────────────────────┐
│               Centralized Storage Engine                    │
│   Primary: chrome.storage.local (with unlimitedStorage)     │
│   Safety Tier: IndexedDB (BugShotDB keyval high-capacity)   │
│   Memory Tier: Local Map fallback for offline tests         │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Capture Pipeline

1. **User Action**: The user selects Viewport, Region, or Full Page capture via the popup or shortcut.
2. **Diagnostics Query**: The background script queries the active tab's content script for `COLLECT_PAGE_DIAGNOSTICS`, returning captured console logs, network failures, and page metadata.
3. **Capture Execution**:
   - **Viewport**: Uses `chrome.tabs.captureVisibleTab({ format: 'png' })`.
   - **Region**: Injects an interactive drag-to-crop overlay, retrieves coordinates, and slices the viewport via canvas cropping.
   - **Full Page**: Calculates a scroll stride schedule via `calculateStitchPlan`, sequentially scrolling and capturing each viewport slice, then composites them onto a unified high-resolution canvas.
4. **Session Handshake**: The raw image data, target URL, and diagnostics are serialized into `bugshot_active_session` and routed to `editor/editor.html?session=sess_...`.

---

## 3. Dual-Canvas Annotation Architecture

To achieve zero-lag rendering during high-frequency mouse moves, the editor employs two stacked canvas elements:

- **Background Canvas (`canvas-bg`)**: Holds the static screenshot bitmap. Loaded once at 1:1 pixel resolution.
- **Overlay Canvas (`canvas-overlay`)**: Renders active vector paths, shapes, text pills, and user interactions.

```text
┌───────────────────────────────────────┐
│     canvas-overlay (Interactive)      │  <-- Shapes, Arrows, Text, Blur
├───────────────────────────────────────┤
│     canvas-bg (Static Screenshot)     │  <-- Screenshot Bitmap
└───────────────────────────────────────┘
```

### True Pixelation Redaction
Unlike cosmetic CSS `backdrop-filter: blur()`, BugShot executes true permanent image redaction:
1. Coordinates of the redaction rectangle are read.
2. `getImageData(x, y, w, h)` extracts raw RGBA pixels from the base image canvas.
3. Pixels are grouped into 12×12 pixel blocks.
4. The arithmetic mean color of each block is calculated and written back over every pixel in that block.
5. `putImageData` burns the blurred pixels irreversibly into the image before export. Sensitive passwords, tokens, or PII can never be recovered from the exported PNG.

---

## 4. Dual-Tier Storage Resilience

By default, Chrome enforces a 10MB quota on `chrome.storage.local`. To handle high-resolution screenshots and long-term report archives:

1. **`unlimitedStorage`**: Declared in `manifest.json` to lift artificial storage limits.
2. **IndexedDB Fallback**: If `chrome.storage.local.set` reports `Resource::kQuotaBytes quota exceeded` or encounters browser serialization bottlenecks, the storage engine automatically persists the payload to IndexedDB (`BugShotDB`).
3. **Optimized Report Transition**: When creating a report from an annotated session, the storage manager drops redundant unannotated bitmaps if storage constraints are detected, halving memory footprint without data loss.
