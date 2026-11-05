# ViewPortX Permissions & Security Model

ViewPortX strictly adheres to the principle of least privilege required by Manifest V3.

---

## Declared Permissions

| Permission | Purpose | Justification |
| :--- | :--- | :--- |
| `activeTab` | Temporary access to the currently focused browser tab | Allows ViewPortX to inspect computed layout styles and inject responsive CSS overrides into the active webpage when the user interacts with the extension. |
| `scripting` | Programmatic script and stylesheet injection | Enables dynamic injection of `content.js` and responsive override stylesheets without requesting broad permanent host permissions. |
| `storage` | Local client-side preference persistence | Stores user configuration (theme, auto-scan toggles, DOM scanning depth) and domain-specific transformation preferences in `chrome.storage.local`. |
| `tabs` | Tab management & workstation routing | Facilitates opening the workstation dashboard (`dashboard.html`) in a dedicated tab and maintaining communication with the target tab. |

---

## Web-Accessible Resources

- `assets/*`: Extension icons and visual assets.
- `scripts/*`: Modular JavaScript ES Modules loaded by the content script via `chrome.runtime.getURL()`.

No sensitive data, cookies, passwords, or authentication credentials are ever accessed, read, or transmitted.
