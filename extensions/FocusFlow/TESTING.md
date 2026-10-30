# 🧪 FocusFlow Testing & Quality Assurance

This document details the automated test suite, execution instructions, test results, and step-by-step manual verification procedures for FocusFlow.

---

## 1. Automated Test Suite

FocusFlow includes six automated unit and integration test suites that execute in Node.js without third-party test runners or heavy dependencies.

### Running Automated Tests
```bash
cd FocusFlow
npm test
```
or directly:
```bash
node tests/run-all.js
```

### Test Suite Breakdown

| Suite | File | Coverage |
|---|---|---|
| **Timer Engine** | `tests/timer.test.js` | Timestamp math, running/paused calculations, MM:SS formatting, session transitions (Focus → Short Break → Long Break), cycle increments, dev fast-timer. |
| **Task Manager** | `tests/tasks.test.js` | Task creation, title sanitization, priority validation, session counter increments, toggling completion, filtering (All/Pending/Done), reordering. |
| **Analytics & Goals** | `tests/analytics.test.js` | Midnight date boundaries, daily goal percentages, 7-day focus minutes aggregation, all-time statistics, average session duration, timeline ordering, zero-data states. |
| **Distraction Blocker** | `tests/blocker.test.js` | Domain normalization (stripping protocols, sub-paths, ports, query strings), RFC 1035 domain validation, protected domain rejection, DeclarativeNetRequest dynamic rule construction. |
| **Storage & Migrations** | `tests/storage.test.js` | Schema version validation, default fallbacks for missing/corrupted storage keys, bounds clamping for numeric inputs. |
| **Manifest V3 & Security** | `tests/manifest.test.js` | MV3 compliance, required files existence, icon asset resolution, strict permissions audit (zero unauthorized permissions). |

### Automated Test Results
```text
====================================================
⚡ Running FocusFlow Automated Verification Suite
====================================================

🧪 Testing Timer Module...
✅ All Timer tests passed!

🧪 Testing Tasks Module...
✅ All Tasks tests passed!

🧪 Testing Analytics Module...
✅ All Analytics tests passed!

🧪 Testing Distraction Blocker Module...
✅ All Distraction Blocker tests passed!

🧪 Testing Storage & Migration Module...
✅ All Storage & Migration tests passed!

🧪 Testing Manifest V3 Compliance & Permissions...
✅ All Manifest V3 & Security Audit tests passed!

====================================================
🎉 ALL 6/6 TEST SUITES PASSED in 0.003s!
====================================================
```

---

## 2. Manual Chrome Verification Checklist

To verify FocusFlow in a real browser environment:

### Step 1: Loading the Unpacked Extension
1. Open Google Chrome and go to `chrome://extensions/`.
2. Turn on **Developer mode** in the upper-right corner.
3. Click **Load unpacked** and select the `FocusFlow` folder.
4. Verify that FocusFlow appears without errors or warnings.

### Step 2: Timer Controls & State Persistence
1. Click the FocusFlow icon in the toolbar.
2. Click **Start**. Verify the countdown begins and the circular ring animates smoothly.
3. Close the popup window. Wait 15 seconds.
4. Re-open the popup: verify the timer continued counting down accurately based on the target timestamp.
5. Click **Pause**: verify the countdown freezes and the status badge updates to "Paused".
6. Click **Resume**: verify countdown resumes from the exact paused second.
7. Click **Reset**: verify timer returns to default 25:00 in "Ready to Flow" state.

### Step 3: Fast-Timer Mode Verification
1. Open the **Settings** tab.
2. Toggle on **Dev Fast Timer (10s)**.
3. Return to the **Focus** tab and click **Start**.
4. Allow the 10-second timer to reach zero.
5. Verify:
   - Completion sound chimes (if sound enabled).
   - Chrome desktop notification appears.
   - Timer transitions to **Short Break**.
   - Cycle indicator increments to `Cycle 2 of 4`.

### Step 4: Task Management & Session Linking
1. Switch to the **Tasks** tab.
2. Enter a task title (e.g., `Review Pull Request`), choose `High` priority, and submit.
3. Verify the task appears in the list with the red "HIGH" priority badge.
4. Click on the task: observe that it becomes highlighted and set as the active target on the timer.
5. Complete a focus session: verify that the task's completed Pomodoro count (`🍅 0/1`) increments to `🍅 1/1`.
6. Click the checkbox: verify the task is struck through and marked complete.
7. Switch between `All`, `Pending`, and `Completed` filter tabs.

### Step 5: Distraction Blocker Verification
1. Under **Settings**, enable **Website Blocking**.
2. Add `youtube.com` or `reddit.com` to the blocklist.
3. Start a focus session.
4. In a new tab, navigate to `https://www.youtube.com`.
5. Verify that Chrome blocks the navigation while the focus timer is active.
6. Return to FocusFlow and click **Pause** or **Reset**.
7. Reload the tab: verify normal navigation resumes immediately.

### Step 6: Full Dashboard Verification
1. Click the **Open Dashboard** icon in the popup header.
2. Verify `dashboard.html` opens in a full tab.
3. Confirm that the 260px circular dial, 7-day productivity bar chart, and task manager display in real-time.
4. Verify that actions taken in the dashboard sync across to the popup window.

### Step 7: Data Reset
1. Under **Settings**, click **Reset All FocusFlow Data**.
2. Confirm the reset in the modal dialog.
3. Verify all settings, tasks, and historical session logs return to clean defaults.
