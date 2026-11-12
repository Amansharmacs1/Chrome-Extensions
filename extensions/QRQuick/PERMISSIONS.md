# 🔐 QRQuick — Permissions & Security Specification

This document audits all permissions declared in the **QRQuick** Manifest V3 (`manifest.json`), justifying each permission according to the principle of least privilege.

---

## 📋 Manifest Permissions Matrix

| Permission | Scope | Justification & Technical Use |
| :--- | :--- | :--- |
| `storage` | Extension Storage API | Persists user QR code history, scan logs, custom styling presets, and user preferences locally in `chrome.storage.local`. |
| `activeTab` | Active Tab Scripting | Allows the extension to obtain the URL and title of the currently focused tab when the user clicks the extension action or invokes the keyboard shortcut (`Alt+Shift+Q`). |
| `contextMenus` | Context Menu API | Registers context menu shortcuts (*"Generate QR code for this page"*, *"Generate QR code for selection"*, *"Generate QR code for link"*) to let users generate QR codes from anywhere on the web. |

---

## 📷 Optional Web API Permissions

| API / Feature | When Invoked | Security Safeguards |
| :--- | :--- | :--- |
| `navigator.mediaDevices.getUserMedia` (Webcam) | Only when the user explicitly clicks **"Start Camera"** inside the Scanner interface. | The video stream is processed entirely in local volatile memory. Frames are discarded immediately after analysis. All video tracks are forcibly stopped when scanning finishes, when the camera is toggled off, or when the window closes. |

---

## 🚫 Explicitly Unrequested Permissions

To guarantee complete privacy and zero background surveillance, QRQuick explicitly **DOES NOT** request:
- ❌ `<all_urls>` (does not inspect, inject, or tamper with arbitrary website traffic).
- ❌ `tabs` (does not monitor broad background browsing history or cross-tab navigation).
- ❌ `cookies` (no cookie or session snooping).
- ❌ `webRequest` / `declarativeNetRequest` (does not intercept network requests).
- ❌ `downloads` (uses standard browser anchor blob downloads, avoiding unnecessary file management permissions).
- ❌ `identity` (does not require login, accounts, or user identification).

---

## 🔒 Content Security Policy (CSP)

QRQuick complies strictly with Chrome Manifest V3 CSP specifications:
- No remote code execution (`script-src 'self'`).
- No `eval()` or string-to-code execution.
- All QR generation (`qrcode-generator`) and decoding (`jsQR`) engines are bundled locally within `lib/`.
- Zero external CDN or script dependencies.
