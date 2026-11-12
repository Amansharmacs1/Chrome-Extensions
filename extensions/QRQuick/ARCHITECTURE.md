# 🏛️ QRQuick — Architectural Specification & Engineering Design

This document details the software architecture, data flow, rendering pipelines, decoding algorithms, security boundaries, and persistence structures powering **QRQuick**.

---

## 🏗️ High-Level System Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        User Interfaces (UI Layer)                      │
│                                                                        │
│   ┌─────────────────────┐   ┌──────────────────────────────────────┐   │
│   │   popup/popup.html  │   │  generator/generator.html            │   │
│   │   - Active Page QR  │   │  - 9 Payload Builders                │   │
│   │   - Quick Text      │   │  - Live Canvas / SVG Customizer      │   │
│   │   - Fast Download   │   │  - Logo Overlay & Contrast Meter     │   │
│   └─────────────────────┘   └──────────────────────────────────────┘   │
│   ┌─────────────────────┐   ┌──────────────────────────────────────┐   │
│   │   scanner/scanner.html │ │  bulk/bulk.html (Batch Studio)       │   │
│   │   - Drag / Paste / File ││  - CSV / Multiline Parser           │   │
│   │   - Optional Webcam     ││  - Async Non-blocking Worker Loop   │   │
│   │   - URL Security Modal  ││  - PKZIP Archive Builder (SimpleZip)│   │
│   └─────────────────────┘   └──────────────────────────────────────┘   │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │   dashboard/dashboard.html (History & Settings Hub)            │   │
│   │   - History Logs, Search, Filters, Favorites, Backup Export    │   │
│   └────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        Core Service & Engine Layer                     │
│                                                                        │
│   ┌───────────────────────────┐      ┌─────────────────────────────┐   │
│   │   payload-builder.js      │      │   validation.js             │   │
│   │   - vCard 3.0, Wi-Fi RFC  │      │   - WCAG 2.1 Contrast (L1/L2│   │
│   │   - iCalendar VEVENT, Geo │      │   - Logo Coverage Check     │   │
│   │   - Type Detector         │      │   - URL Scheme Sanity       │   │
│   └─────────────┬─────────────┘      └──────────────┬──────────────┘   │
│                 │                                   │                  │
│                 ▼                                   ▼                  │
│   ┌───────────────────────────┐      ┌─────────────────────────────┐   │
│   │   qr-engine.js            │      │   decoder.js                │   │
│   │   - Matrix Generation     │      │   - ImageData Pre-scaling   │   │
│   │   - Pattern Stylizer      │      │   - jsQR Engine             │   │
│   │   - Eye Geometry Engine   │      │   - Security Flagging       │   │
│   │   - Canvas / SVG Exporter │      │   - Type Classification     │   │
│   └─────────────┬─────────────┘      └──────────────┬──────────────┘   │
│                 │                                   │                  │
│                 ▼                                   ▼                  │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │   export-service.js (PNG, SVG, JPEG, Clipboard, Downloads)     │   │
│   └────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   Storage & Background System Layer                    │
│                                                                        │
│   ┌───────────────────────────┐      ┌─────────────────────────────┐   │
│   │  service-worker.js (MV3)  │      │  storage-service.js         │   │
│   │  - Context Menus          │      │  - Schema Version 1         │   │
│   │  - Keyboard Shortcuts     │      │  - History, Scans, Presets  │   │
│   │  - Active Tab Queries     │      │  - Quota-Safe Thumbnails    │   │
│   └───────────────────────────┘      │  - Node Memory Fallback     │   │
│                                      └──────────────┬──────────────┘   │
│                                                     ▼                  │
│                                      ┌─────────────────────────────┐   │
│                                      │    chrome.storage.local     │   │
│                                      └─────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 📦 Service Layer & Component Breakdown

### 1. `qr-engine.js` (Rendering & Matrix Computation)
- **Matrix Calculation**: Uses Kazuhiko Arase's `qrcode-generator` with `typeNumber: 0` to automatically select the optimal QR version (Version 1 to 40) for a given payload and Error Correction level.
- **Finder Isolation (`getFinderInfo`)**: Distinguishes the three 7x7 corner finder patterns from normal data modules. Allows custom geometric rendering of outer frames (*Square*, *Rounded*, *Circle*) and inner center pupils (*Square*, *Circle*, *Diamond*).
- **Module Patterns**: Supports four distinct module drawing algorithms:
  - `square`: Standard crisp rectangular modules.
  - `rounded`: Rounded rectangles with softened corners.
  - `dots`: Scaled circular dots (`arc` with radius $0.44 \times \text{tileSize}$).
  - `classy`: Organic rounded tiles.
- **Dual Vector & Raster Pipeline**: Both `renderQRToCanvas` (HTML5 Canvas) and `generateQRSvg` (SVG XML) share the exact mathematical module positions, ensuring vector and raster exports are 100% identical.
- **Logo Area Reservation (`getLogoModuleBounds`)**: When a center logo is uploaded, the engine calculates the module bounding box and suppresses data modules beneath the logo badge, creating a clean quiet zone around the logo.

### 2. `validation.js` (Safety, Contrast & Capacity Boundaries)
- **Capacity Limits**: Verifies payload byte length against maximum 8-bit byte capacity:
  - Level L: 2,953 bytes
  - Level M: 2,331 bytes
  - Level Q: 1,663 bytes
  - Level H: 1,273 bytes
- **WCAG 2.1 Contrast Ratio**: Computes relative luminance:
  $$L = 0.2126 \times R + 0.7152 \times G + 0.0722 \times B$$
  $$\text{Contrast Ratio} = \frac{\max(L_1, L_2) + 0.05}{\min(L_1, L_2) + 0.05}$$
  Flags warnings if contrast drops below $3.0:1$ (the physical scan threshold for optical sensors).
- **Logo Coverage Safeguard**: Calculates logo surface area percentage. Warns if coverage exceeds $18\%$ and rejects configurations with $>25\%$ coverage to prevent Reed-Solomon error correction exhaustion.

### 3. `payload-builder.js` (Standards-Compliant Encoders)
- **Wi-Fi QR (ZXing Format)**: Encodes `WIFI:S:ssid;T:WPA;P:password;H:false;;` with backslash escaping for characters `\`, `;`, `,`, `:`, `"`.
- **vCard 3.0 (RFC 2426)**: Builds formatted contact cards with semicolon and comma escaping.
- **iCalendar VEVENT**: Encodes UTC timestamps in basic ISO format (`YYYYMMDDTHHmmssZ`).
- **Type Intelligence**: Automatically detects 9 payload types from raw strings during decoding.

### 4. `decoder.js` (Scan & Security Guardrails)
- Integrates `jsQR` for client-side image decoding.
- Downscales images exceeding 1,600px before decoding to prevent canvas memory exhaustion.
- Enforces strict security guardrails: flags hazardous schemes (`javascript:`, `data:`, `vbscript:`) and requires explicit confirmation before opening URLs.

### 5. `simple-zip.js` (Pure JavaScript PKZIP Generator)
- Zero-dependency implementation of PKZIP 2.0 format (`0x04034b50` local header, `0x02014b50` central directory, `0x06054b50` end of central directory).
- Uses a 256-entry lookup table for CRC-32 calculation.
- Packages arbitrary PNG, SVG, and text files into standard `.zip` files natively openable on all operating systems.
