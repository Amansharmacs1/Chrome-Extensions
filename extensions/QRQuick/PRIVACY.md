# 🛡️ QRQuick — Privacy Policy & Local-First Architecture

**Effective Date:** November 12, 2026  
**Product:** QRQuick Chrome Extension ("Generate. Customize. Share.")

---

## 🔒 Executive Summary: 100% Client-Side Privacy

QRQuick is built from the ground up as a **local-first, private browser utility**. We believe your links, personal contacts, Wi-Fi passwords, and scanned documents should remain strictly under your control.

- **Zero Remote Telemetry**: QRQuick contains no Google Analytics, tracking pixels, or third-party monitoring SDKs.
- **Zero Cloud Servers**: All QR generation, matrix math, color rendering, and image decoding occur directly inside your browser sandbox.
- **No User Accounts**: QRQuick requires no registration, email, login, or personal profile.
- **No Link Interception or Redirects**: QRQuick produces direct **Static QR codes**. Your links go straight to your destination without routing through intermediate analytics servers.

---

## 🌐 External Network Communications

QRQuick performs **ZERO external network calls** during normal operation:
- QR code generation: 100% local JavaScript.
- QR image decoding: 100% local JavaScript (`jsQR`).
- ZIP archive bundling: 100% local JavaScript (`SimpleZip`).
- Image uploads and logo processing: Handled in local memory via HTML5 Canvas and `FileReader`. No logos or images are ever uploaded to a remote server.

---

## 🗄️ Data Stored Locally on Your Machine

The following data is maintained exclusively in your browser's private `chrome.storage.local`:
1. **Generated QR History**: Records of QR codes you have created (payload text, title, type, creation timestamp, customization settings).
2. **Scan History**: Records of QR codes you have decoded (decoded text, recognized type, scan timestamp).
3. **Custom Styling Presets**: Your saved color themes and pattern preferences.
4. **User Settings**: Your preferred export format, default resolution, and safety prompts.

---

## 📤 Data Portability & Complete Erasure

- **Exporting Data**: You can download a complete JSON backup of your entire history, presets, and settings at any time from the **History & Settings** dashboard.
- **Deleting Data**: You can delete individual history records, clear generated history, clear scan history, or permanently wipe all stored data via the **"Erase All Data"** button with immediate effect.
- **Uninstalling**: Removing the QRQuick extension from Chrome automatically deletes all local storage and cache files maintained by Chrome for this extension.
