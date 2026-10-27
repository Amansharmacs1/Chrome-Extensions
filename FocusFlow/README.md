# ⚡ FocusFlow — Focus. Flow. Finish.

> **A production-quality Pomodoro timer, task manager, distraction blocker, and productivity analytics dashboard built for Google Chrome (Manifest V3).**

FocusFlow helps developers, students, and professionals maintain deep focus, structure work sessions, eliminate browser distractions, and track real productivity gains over time.

---

## ✨ Features

- ⏱️ **Robust Pomodoro Timer Engine**
  - Standard intervals: 25-minute focus, 5-minute short break, 15-minute long break after 4 cycles (all customizable).
  - Background resilience: powered by `chrome.alarms` and persistent state in `chrome.storage.local`. Never loses track of time when the popup closes or Chrome suspends the service worker.
  - Interactive SVG circular countdown with large numerals and visual phase badges.
  - Controls: Start, Pause, Resume, Reset, and Skip.
  - Optional auto-transition for breaks and focus intervals.
  - Dev Fast-Timer mode (10-second sessions) for rapid testing and demonstrations.

- 🛡️ **Declarative Distraction Blocker**
  - Real, user-controlled website blocking powered by Chrome's **DeclarativeNetRequest** dynamic rules API.
  - Add and remove custom domains (e.g. `youtube.com`, `reddit.com`, `twitter.com`, `x.com`).
  - Automatic domain normalization (strips protocols, query parameters, ports, and sub-paths).
  - Active only during focus sessions (with optional setting to block during rest intervals).
  - Safe: protects internal Chrome pages and extension management URLs.

- 📋 **Integrated Task Manager**
  - Add, prioritize (`Low`, `Medium`, `High`), and check off tasks.
  - Estimate required Pomodoro sessions per task.
  - One-click task linkage: bind active tasks to the timer so completed focus cycles automatically credit the task.
  - Instant filtering by `All`, `Pending`, and `Completed`.

- 📊 **Productivity Insights & Analytics**
  - Today's focus minutes, completed sessions, and completed tasks.
  - Daily goal progress meters (customizable targets).
  - Accessible 7-day focus trend bar chart with session counts and minutes.
  - Historical summary: all-time focus minutes, average session duration, and most productive day of the week.
  - Chronological daily session log table.
  - Zero-data empty states with clean aesthetic styling.

- 🔔 **Subtle Audio & Notifications**
  - Pure harmonic Web Audio API synthesizers for session start/completion (no external audio files required, zero latency).
  - Native Chrome desktop notifications when sessions end or daily goals are achieved.
  - Independent toggles for both sound and desktop alerts.

- 🖥️ **Dual Form Factor: Popup & Full Dashboard**
  - Compact popup window (`popup.html`) for quick checks and session control.
  - Standalone full-tab command center (`dashboard.html`) for expansive planning, analytics review, and uninterrupted focus.

---

## 📸 Interface Preview

```text
+-------------------------------------------------------------+
|  FocusFlow                                 [Sound] [Expand] |
+-------------------------------------------------------------+
|  [ FOCUS ]       [ TASKS ]       [ INSIGHTS ]   [ SETTINGS ]|
+-------------------------------------------------------------+
|                                                             |
|                    ( FOCUS SESSION )                        |
|                       Cycle 1 of 4                          |
|                                                             |
|                         25:00                               |
|                     READY TO FLOW                           |
|                                                             |
|            [ Reset ]    [ START ]    [ Skip ]               |
|                                                             |
|  * Distraction Blocker: Armed for focus (7 sites)           |
+-------------------------------------------------------------+
```

---

## 🚀 Installation Guide

1. Clone or download this repository:
   ```bash
   git clone https://github.com/Amansharmacs1/Chrome-Extensions.git
   ```
2. Open Google Chrome and navigate to:
   ```text
   chrome://extensions/
   ```
3. Enable **Developer mode** using the toggle in the upper-right corner.
4. Click **Load unpacked** in the top-left toolbar.
5. Select the `FocusFlow` directory:
   ```text
   /path/to/Chrome-Extensions/FocusFlow
   ```
6. FocusFlow will appear in your extensions bar. Pin it for quick access!

---

## 📖 User Guide

### 1. Starting a Focus Session
- Click the FocusFlow icon in your Chrome toolbar.
- (Optional) Select a task under the **Tasks** tab or click the task bar to link your session.
- Click **Start**. The circular dial turns cyan/blue and counts down.
- If distraction blocking is enabled, your configured blocklist is immediately activated in Chrome's network pipeline.

### 2. Managing Tasks
- Switch to the **Tasks** tab.
- Type your task name, select priority (`Low`, `Med`, `High`), and press **Enter** or click `+`.
- Click on any task to set it as the active timer target.
- Check the box when finished to mark it complete.

### 3. Reviewing Analytics
- Open the **Insights** tab in the popup, or click the **Open Dashboard** icon in the header for the full-screen view.
- Review your daily goal meters, 7-day focus minutes chart, and chronological session logs.

### 4. Configuring Distraction Blocker
- Open **Settings** (or the **Distraction Blocker** tab in the full dashboard).
- Toggle **Enable Website Blocking** on.
- Enter domains you wish to restrict (e.g. `youtube.com`, `instagram.com`).
- The extension automatically constructs DeclarativeNetRequest dynamic rules that activate only while the focus timer is actively running.

---

## 🔒 Permissions & Security

FocusFlow adheres strictly to the Principle of Least Privilege:

| Permission | Purpose | Justification |
|---|---|---|
| `storage` | Preserves preferences, task items, and historical session logs | Core functionality |
| `alarms` | Schedules accurate session completion without keeping the background worker alive | Battery and resource efficiency |
| `notifications` | Dispatches desktop alerts when a focus interval or break completes | User productivity notification |
| `declarativeNetRequest` | Enforces user-configured domain blocking during active focus sessions | Core distraction blocker |
| `optional_host_permissions` | Allows applying network rules to selected websites upon user configuration | Privacy-first site blocking |

See [PERMISSIONS.md](./PERMISSIONS.md) and [PRIVACY.md](./PRIVACY.md) for full details.

---

## 🧪 Testing

FocusFlow includes a full automated verification suite covering the timer state machine, task manager, analytics calculations, domain validation, storage migrations, and Manifest V3 compliance.

To run tests:
```bash
cd FocusFlow
npm test
```

See [TESTING.md](./TESTING.md) for test breakdowns and manual verification steps.

---

## ⚠️ Known Limitations

1. **Internal Chrome Pages**: In compliance with Chromium security architecture, browser extensions cannot block internal pages such as `chrome://settings`, `chrome://extensions`, or the Chrome Web Store.
2. **Pre-existing Open Tabs**: If a blocked website is already open and loaded in a tab, DeclarativeNetRequest prevents subsequent requests, reloads, and navigation, but does not forcibly close existing tabs.
3. **Sound Autoplay Policies**: Audio chimes require an active user interaction or an open popup/dashboard tab due to browser autoplay policies. Background alerts use native Chrome desktop notifications.

---

## 📄 License

This extension is part of the Chrome Extensions collection and is licensed under the [MIT License](../MeetMorph/package.json).
