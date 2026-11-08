# 🔐 WordWise — Permissions & Security Specification

This document provides a complete audit of all permissions declared in the **WordWise** Chrome Extension Manifest V3 (`manifest.json`), justifying each permission according to the principle of least privilege.

---

## 📋 Manifest Permissions Matrix

| Permission | Scope | Justification & Technical Use |
| :--- | :--- | :--- |
| `storage` | Extension Storage API | Persists user vocabulary items, SM-2 flashcard schedules, 30-day dictionary cache, daily word records, learning activity streak telemetry, and user preferences locally in `chrome.storage.local`. |
| `contextMenus` | Context Menu API | Registers the *"Look up '%s' with WordWise"* item in the browser's right-click context menu when text is selected. |
| `activeTab` | Active Tab Scripting | Allows the extension to send messages to the active webpage tab when the user invokes the keyboard shortcut (`Alt+Shift+W`) or clicks the extension action. |

---

## 🌐 Host Permissions Matrix

| Host Pattern | Purpose |
| :--- | :--- |
| `https://api.dictionaryapi.dev/*` | Enables network requests to the public Free Dictionary API to retrieve verified definitions, phonetics, and authentic MP3 pronunciation recordings. |

---

## 🛡️ Content Script Boundaries

| Resource | Target | Mode | Security Rationale |
| :--- | :--- | :--- | :--- |
| `content/content.js` | `<all_urls>` | Isolated World | Listens for mouseup selection events on webpages to surface the unobtrusive feather icon. The script runs in Chrome's Isolated World, preventing webpage scripts from tampering with the extension or accessing extension storage. |
| `content/content.css` | `<all_urls>` (inside Shadow DOM) | Web Accessible Resource | Scoped strictly to the `#wordwise-card-host` ShadowRoot to render the definition popover without style collisions. |

---

## 🚫 Explicitly Unrequested Permissions

To uphold user trust and maximize security, WordWise explicitly **DOES NOT** request:
- ❌ `<all_urls>` host permissions (does not read, modify, or intercept network traffic on arbitrary websites).
- ❌ `cookies` (no cookie or session snooping).
- ❌ `webRequest` / `declarativeNetRequest` (does not inspect network requests).
- ❌ `tabs` (does not track background browsing history).
- ❌ `identity` (does not track user identities or require sign-in).
- ❌ `management` / `proxy` (no browser control tampering).

---

## 🔒 Content Security Policy (CSP)

WordWise strictly adheres to Manifest V3 CSP restrictions:
- No remote code execution (`script-src 'self'`).
- No `eval()` or string-to-code compilation.
- All styles and scripts are bundled locally within the extension package.
