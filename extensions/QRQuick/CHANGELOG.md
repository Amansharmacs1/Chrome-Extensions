# 📜 QRQuick — Changelog

All notable changes to the **QRQuick** Chrome Extension will be documented in this file.

---

## [1.0.0] — 2026-11-12

### ✨ Initial Release

#### 🚀 Core QR Generation Engine
- Implemented full QR code matrix generation powered by Kazuhiko Arase's `qrcode-generator` with automatic version detection (Version 1 to 40) and UTF-8 byte encoding.
- Configured 4 Error Correction levels: L (7%), M (15%), Q (25%), H (30%).
- Built standards-compliant payload builders for:
  - Website URL (with active tab detection).
  - Plain Text (with capacity checks).
  - Contact / vCard 3.0 (with comma/semicolon escaping).
  - Email (`mailto:` format with subject and body escaping).
  - Phone (`tel:` click-to-dial links).
  - SMS (`smsto:` mobile messaging format).
  - Wi-Fi (WPA, WEP, Open networks with backslash escaping for special characters).
  - Geographic Location (`geo:` and universal Google Maps compatibility).
  - Calendar Events (iCalendar / VEVENT with ISO basic timestamps).

#### 🎨 Live Customization & Branding Studio
- Interactive live Canvas and SVG rendering pipelines.
- Implemented custom module patterns: Square, Rounded tiles, Circular dots, Classy organic.
- Implemented corner eye geometric customization: Square, Rounded, Circular outer frames; Square, Circle, Diamond inner pupils.
- Built color customization with dual-color linear and radial gradients, plus transparent background support.
- Built real-time WCAG 2.1 relative luminance contrast checker ($L_1:L_2$) with optical scan warnings (<3.0:1).
- Integrated Center Logo Overlay: uploads PNG/JPEG/WebP, enforces Error Correction level H (30%), reserves quiet zones, and calculates coverage ratios.
- Pre-configured professional presets: Classic Dark, Electric Cyan, Ocean Gradient, Sunset Glow, and Minimal Mono.

#### 📷 QR Scanner & Security Inspector
- Client-side image decoder powered by `jsQR`.
- Multi-input support: Drag-and-drop, file upload, and clipboard paste (<kbd>Ctrl+V</kbd>).
- Optional live camera scanner via `navigator.mediaDevices.getUserMedia` with animated viewfinder and clean track shutdown.
- Type detector identifying structured metadata for Wi-Fi, Contacts, and Events.
- **Strict Security Guardrails**: Zero auto-navigation to decoded URLs, suspicious scheme detection (`javascript:`, `data:`), and mandatory URL confirmation modal.

#### 📦 Bulk Batch Generation & PKZIP Export
- Multiline text parser and RFC 4180 compliant CSV parser with quote escaping.
- Non-blocking asynchronous batch generator with real-time animated progress bar.
- Standalone, zero-dependency pure JavaScript PKZIP writer (`SimpleZip`) bundling generated PNG and SVG files into standard `.zip` archives.

#### 📜 History & Management Dashboard
- Local history logging for generated and scanned QR codes in `chrome.storage.local`.
- Search, type filtering, starred favorites, and single-click re-opening in Generator Studio.
- Real-time telemetry statistics: Total Generated, Total Scanned, Total Favorites, 24h Activity.
- Full data portability with JSON backup export and permanent data wipe tools.

#### 🧪 Testing & Developer Tooling
- Self-contained automated test suite with 8 discrete suites and 187 passing assertions (0 external npm dependencies).
- Native PNG icon generator script (`generate-icons.cjs`) creating pixel-perfect 16/32/48/128px icons.
- Complete documentation: `README.md`, `ARCHITECTURE.md`, `PERMISSIONS.md`, `PRIVACY.md`, `TESTING.md`, `CHANGELOG.md`, `lib/LICENSE-THIRD-PARTY.md`.
