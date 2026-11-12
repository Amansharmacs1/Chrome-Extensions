# 📱 QRQuick — All-in-One QR Code Generator & Scanner

> **Product Tagline:** Generate. Customize. Share.  
> **Platform:** Google Chrome Extension (Manifest V3)  
> **Technology Stack:** Pure Vanilla JavaScript (ES Modules), HTML5, CSS3, Canvas API, SVG, `chrome.storage.local`.  
> **Locally Bundled Engines:** `qrcode-generator` (MIT) & `jsQR` (Apache-2.0).  
> **Zero External Runtime Dependencies | 100% Private, Local-First Architecture**

---

## 🌟 Overview

**QRQuick** is a production-grade Chrome Extension designed for developers, designers, educators, marketers, and power users who need an uncompromising, private, and fully customizable QR code generator and scanner directly in their browser.

Unlike web-based QR generators that route your links through third-party redirect tracking services or impose restrictive subscription paywalls, **QRQuick operates 100% locally on your machine**. It generates permanent, standards-compliant static QR codes that never expire, while offering pixel-level visual customization, center logo branding, CSV bulk generation, high-res exports, and a secure in-browser scanner.

---

## 🚀 Key Features

### 1. ⚡ Quick Extension Popup
- **Instant Active Webpage QR**: Automatically detects the current active tab's URL and title, generating a ready-to-scan QR code the moment you click the toolbar icon.
- **Quick Text Input**: Rapidly switch to "Quick Text" mode to paste or type any arbitrary text, links, or notes.
- **Quick Actions**: One-click **Download PNG**, **Copy Image to Clipboard**, or **Download Vector SVG**.
- **1-Click Studio Launcher**: Seamlessly transitions your active URL into the advanced Generator Studio with one click.

### 2. 🎨 Advanced Generator & Customization Studio
Generate and customize QR codes across **9 standardized payload types**:
- 🔗 **Website URL**: Standard HTTP/HTTPS URLs with "Use Current Page" shortcut.
- 📝 **Plain Text**: Arbitrary text, notes, keys, or serialized payloads with capacity boundary tracking.
- 📶 **Wi-Fi Network**: WPA/WPA2/WPA3, WEP, or Open networks with hidden network support and backslash escaping for special characters (`;`, `:`, `\`, `"`, `,`).
- 👤 **Contact (vCard 3.0)**: Name, Organization, Job Title, Phone, Email, Website, and Address.
- ✉️ **Email (mailto:)**: Recipient, Subject line, and Pre-filled message body.
- 📞 **Phone (tel:)**: Direct one-tap click-to-dial telephone links.
- 💬 **SMS (smsto:)**: Mobile telephone number with pre-filled SMS message text.
- 📍 **Location (Geo / Maps)**: Latitude and Longitude coordinates with universal Google Maps compatibility.
- 📅 **Calendar Event (iCalendar / VEVENT)**: Event Title, Start/End timestamps, Location, and Description.

### 3. 🖌️ Pixel-Level Customization & Branding
- **Design Presets**: One-click curated presets including *Classic Dark*, *Electric Cyan*, *Ocean Gradient*, *Sunset Glow*, and *Minimal Mono*.
- **Color & Gradients**: Full hex and RGB color pickers, dual-color linear or radial gradients, and background transparency option.
- **WCAG 2.1 Contrast Safety Meter**: Evaluates relative luminance contrast ratio in real-time ($L_1:L_2$), warning if contrast falls below $3.0:1$ to guarantee reliable optical scannability.
- **Module Patterns**: Choose between *Square (sharp standard)*, *Rounded tiles*, *Circular dots*, and *Classy organic*.
- **Corner Eye Shapes**: Independently customize corner frames (*Square*, *Rounded*, *Circle*) and inner pupil dots (*Square*, *Circle*, *Diamond*).
- **Logo & Branding Overlay**:
  - Upload your company or personal logo (PNG, JPEG, WebP).
  - Adjust logo size (12% to 28%) and padding.
  - Choose badge geometry (*Rounded*, *Circle*, *Square*).
  - Automatically elevates Error Correction to **Level H (30%)** to ensure scannability.
  - Warns if logo coverage exceeds safe optical thresholds (>20%).

### 4. 📷 Multi-Source QR Scanner with Security Protection
- **Flexible Input**: Drag and drop any image, upload from disk, or paste directly from your clipboard (<kbd>Ctrl+V</kbd> / <kbd>Cmd+V</kbd>).
- **Optional Live Camera Scanner**: Scan physical QR codes using your device's webcam with animated laser reticle and one-click camera shutdown.
- **Type Intelligence**: Automatically detects whether the scanned code is a URL, Wi-Fi network, vCard, Email, Phone, or Calendar event, rendering a clean structured breakdown.
- **Strict Security Safeguard**:
  - **Zero Auto-Navigation**: QRQuick **never** automatically navigates to scanned URLs.
  - Displays the complete raw URL in high-visibility monospace.
  - Flags suspicious protocol schemes (`javascript:`, `data:`, `vbscript:`).
  - Displays a confirmation modal requiring explicit user authorization before opening links in new tabs.

### 5. 📦 High-Throughput Bulk Batch Generator
- **Multi-Line & CSV Input**: Paste a list of URLs/text or upload a CSV file with automatic column detection (`content`, `url`, `label`, `title`, `type`).
- **Interactive Queue**: Review parsed records, remove invalid rows, toggle individual selection, and edit labels.
- **Non-Blocking Chunked Processing**: Processes large batches asynchronously without freezing the browser interface.
- **PKZIP Archive Export**: Uses a bundled, pure JavaScript ZIP archiver (`SimpleZip`) to package all generated PNG or SVG files into a single `.zip` file with clean, unique filenames.
- **Individual Downloads**: Download any single code directly from the batch table.

### 6. 📜 History, Favorites & Management Hub
- **Local Storage Log**: Automatically tracks generated and scanned QR codes in `chrome.storage.local`.
- **Search & Filters**: Search by title or payload text, filter by type (URL, Wi-Fi, vCard, etc.), and filter by starred favorites.
- **Quick Actions**: Reopen any past code directly in the Generator Studio, download again, copy payload text, or delete.
- **Usage Telemetry**: Real-time statistics on total generated, total scanned, total favorites, and 24-hour activity.
- **Full Data Backup**: One-click JSON export and permanent data wipe tools.

---

## 📐 Static vs. Dynamic QR Codes

QRQuick creates **Static QR Codes**:

| Feature | Static QR Code (QRQuick) | Dynamic QR Code |
| :--- | :--- | :--- |
| **How It Works** | Data is directly etched into the module matrix. | Contains a redirect URL to a third-party server. |
| **Privacy** | **100% Private**: Zero servers, zero telemetry, no tracking. | Server logs every scan (IP address, location, time). |
| **Lifespan** | **Permanent**: Never expires, works offline indefinitely. | Expires if subscription lapses or redirect server shuts down. |
| **Editable After Print** | No (data is physically encoded). | Yes (redirect destination can change on the server). |
| **Dependencies** | None (100% client-side). | Requires subscription, active backend, and database. |

---

## 🔒 Permissions & Security Architecture

QRQuick adheres strictly to the principle of least privilege:
- **`storage`**: Used exclusively to store your QR history, custom presets, and user settings locally in `chrome.storage.local`.
- **`activeTab`**: Allows the extension to read the URL and title of your active tab only when you explicitly click the extension action or press the keyboard shortcut.
- **`contextMenus`**: Adds convenient right-click shortcuts (*"Generate QR code for this page"*, *"Generate QR code for selection"*, *"Generate QR code for link"*).
- **Camera Access (`getUserMedia`)**: Only requested when the user explicitly clicks "Start Camera" in the Scanner. Video streams are processed purely in local memory and terminated immediately when scanning finishes.
- **Zero Remote Code**: Contains no external analytics, tracking pixels, or remote scripts.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action | Scope |
| :--- | :--- | :--- |
| `Alt+Shift+Q` | Generate QR code for the current webpage | Any browser tab |
| `Ctrl+V` / `Cmd+V` | Paste screenshot or image to decode | QR Scanner |
| `Enter` | Submit quick text input | Extension Popup |

---

## 🧪 Automated Testing

QRQuick includes a self-contained unit and integration test suite with **187 passing assertions** and **0 external npm runtime dependencies**:

```bash
# Run tests directly with Node.js
node extensions/QRQuick/tests/run-all.js

# Or via npm
npm test --prefix extensions/QRQuick
```

### Verified Test Suites:
1. `Manifest V3 Structure & Asset Integrity`: Validates schema, PNG icons, popup, background service worker, and permissions.
2. `Payload Builders & Type Detector`: Validates URL, Text, vCard 3.0, Email, Phone, SMS, Wi-Fi escaping, Location, and Event.
3. `QR Engine & Rendering Calculations`: Validates matrix sizing, finder pattern detection, logo module bounds, and SVG generation.
4. `Validation, Contrast & Safety Engine`: Tests QR byte capacities, WCAG 2.1 contrast formulas, and logo coverage safety.
5. `RFC 4180 CSV & Bulk Parser`: Tests quoted CSV strings, escaped quotes, multiline parsing, and batch queues.
6. `QR Decoder & Roundtrip Verification`: End-to-end roundtrip test (generates synthetic QR $\rightarrow$ rasterizes $\rightarrow$ decodes with `jsQR`).
7. `Storage Service & Persistence Layer`: Tests memory storage fallback, history CRUD, presets, settings, and backups.
8. `SimpleZip PKZIP Generator`: Validates CRC32 calculation and standard PKZIP archive generation.

---

## 🛠️ Chrome Installation Guide

1. Open Google Chrome and visit `chrome://extensions/`.
2. Toggle on **Developer mode** in the upper right corner.
3. Click **Load unpacked** in the top left corner.
4. Select the directory: `extensions/QRQuick/`.
5. The **QRQuick** icon will appear in your Chrome toolbar. Click it or press `Alt+Shift+Q`!

---

## 📄 License & Attribution

QRQuick is licensed under the [MIT License](LICENSE).  
Bundled third-party libraries:
- `qrcode-generator`: Copyright (c) Kazuhiko Arase (MIT License).
- `jsQR`: Copyright (c) Cosmo Wolfe (Apache-2.0 License).
- See [`lib/LICENSE-THIRD-PARTY.md`](file:///Users/amansharma/Desktop/Extension/extensions/QRQuick/lib/LICENSE-THIRD-PARTY.md) for full license texts.
