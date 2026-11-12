# 🧪 QRQuick — Automated & Manual Testing Guide

This document describes the testing strategy, test suites, execution procedures, and manual verification checklists for the **QRQuick** Chrome Extension.

---

## 🚀 Running the Automated Test Suite

QRQuick includes a self-contained, high-performance automated test suite with **zero external npm runtime dependencies**. It executes in under 30 milliseconds using native Node.js ES Modules.

### Direct Node.js Invocation
```bash
node extensions/QRQuick/tests/run-all.js
```

### Via npm Script
```bash
npm test --prefix extensions/QRQuick
```

---

## 📊 Test Suite Coverage & Verification Matrix

The test runner executes 8 discrete test suites comprising **187 automated assertions**:

| Suite Name | File | Assertion Focus |
| :--- | :--- | :--- |
| **Manifest V3 Structure & Asset Integrity** | `tests/manifest.test.js` | Validates MV3 spec compliance, presence of 16/32/48/128px PNG icons on disk, popup HTML paths, service worker module registration, permissions, host permissions, and bundled library presence. |
| **Payload Builders & Type Detector** | `tests/payload-builder.test.js` | Tests all 9 payload builders (URL, Text, vCard, Email, Phone, SMS, Wi-Fi with special character escaping, Location, Calendar Event) and payload type auto-detection. |
| **QR Engine & Rendering Calculations** | `tests/qr-engine.test.js` | Verifies QR matrix generation (`generateQRMatrix`), finder pattern detection (`getFinderInfo`), logo module bounds calculation (`getLogoModuleBounds`), and SVG XML generation. |
| **Validation, Contrast & Safety Engine** | `tests/validation.test.js` | Tests QR byte capacity limits across Error Correction levels (L, M, Q, H), WCAG 2.1 relative luminance and contrast ratio math, logo coverage safety, and URL scheme sanitation. |
| **RFC 4180 CSV & Bulk Parser** | `tests/csv-parser.test.js` | Verifies RFC 4180 compliance: quoted fields, commas inside quotes, escaped double-quotes (`""` -> `"`), CRLF/LF newlines, and automatic column detection (`content`, `label`, `type`). |
| **QR Decoder & Roundtrip Verification** | `tests/decoder.test.js` | End-to-end roundtrip test: generates synthetic QR matrix $\rightarrow$ rasterizes to raw RGBA ImageData $\rightarrow$ decodes with `jsQR` and verifies 100% data fidelity. |
| **Storage Service & Persistence Layer** | `tests/storage-service.test.js` | Tests in-memory fallback, schema initialization, history CRUD, scan history, presets, settings updates, and backup exports. |
| **SimpleZip PKZIP Generator** | `tests/simple-zip.test.js` | Validates CRC-32 calculation against standard test vectors and verifies standard PKZIP binary structure (`0x04034b50` local header, `0x06054b50` EOCD). |

---

## 🔍 Manual Verification & End-to-End Checklist

### 1. Popup & Active Tab QR Generation
1. Load unpacked extension in Google Chrome (`chrome://extensions/`).
2. Navigate to any website (e.g. `https://github.com`).
3. Click the QRQuick toolbar icon.
4. **Verify**:
   - The webpage title and URL populate automatically.
   - The QR code appears on the canvas.
   - Clicking **"Download PNG"** downloads a clear PNG file.
   - Clicking **"Copy Image"** copies the QR code to your clipboard.
   - Clicking **"Customize & Advanced Types"** opens the Generator Studio pre-filled with the active URL.

### 2. Generator Studio (Payloads & Customization)
1. Open the Generator Studio (`generator/generator.html`).
2. Test **Wi-Fi** tab: enter SSID `Home_5G` and password `Secret123`.
3. Test **Contact (vCard)** tab: enter Name, Phone, and Email.
4. Adjust styling:
   - Select the **Electric Cyan** preset.
   - Switch module pattern to **Rounded** or **Dots**.
   - Switch corner frame to **Circle** and corner dot to **Diamond**.
   - Upload a test logo image: verify that Error Correction automatically elevates to **Level H (30%)** and the logo appears centered with a clean protective badge.
5. Export:
   - Click **Download SVG**: inspect the resulting `.svg` in a vector viewer (Inkscape or browser) to verify clean vector geometry.
   - Click **Download PNG**: verify high-resolution raster output.

### 3. QR Scanner & URL Safety Modal
1. Open the Scanner (`scanner/scanner.html`).
2. Drag and drop any saved QR code image onto the dropzone, or paste a screenshot using <kbd>Ctrl+V</kbd>.
3. **Verify**:
   - The QR code decodes instantly.
   - The recognized type badge and structured fields appear.
   - If the code contains a URL, click **"Open URL in New Tab"**.
   - **Verify Security**: A safety confirmation modal appears displaying the exact URL and warning before opening.

### 4. Bulk Batch Generator
1. Open the Bulk Generator (`bulk/bulk.html`).
2. Paste 5 sample URLs:
   ```text
   https://example.com/one
   https://example.com/two
   https://example.com/three
   https://example.com/four
   https://example.com/five
   ```
3. Click **"Parse List"**: verify all 5 items appear in the table with "Ready" status.
4. Click **"Generate All"**: verify the animated progress bar updates smoothly without freezing the UI.
5. Click **"Download ZIP Archive"**: open the resulting `.zip` file and verify all 5 individual QR images are present with clean filenames.

### 5. History & Settings Hub
1. Open History (`dashboard/dashboard.html`).
2. Verify all generated and scanned QR codes appear in their respective tabs.
3. Test search filter, type filter, and star favorite toggle.
4. Click **"Export JSON"**: verify the complete backup file downloads.
