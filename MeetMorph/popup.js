/**
 * MeetMorph - Popup Controller
 * Coordinates user actions, live video previews, empty background previews,
 * WebRTC integration diagnostics, and audio snap detector controls for Google Meet.
 */

document.addEventListener('DOMContentLoaded', async () => {
  // DOM Elements
  const mainStatusDot = document.getElementById('mainStatusDot');
  const mainStatusLabel = document.getElementById('mainStatusLabel');
  const liveVideoPreview = document.getElementById('liveVideoPreview');
  const livePlaceholder = document.getElementById('livePlaceholder');
  const liveFpsBadge = document.getElementById('liveFpsBadge');
  const bgImagePreview = document.getElementById('bgImagePreview');
  const bgPlaceholder = document.getElementById('bgPlaceholder');
  const bgStatusBadge = document.getElementById('bgStatusBadge');

  const btnVanish = document.getElementById('btnVanish');
  const btnReturn = document.getElementById('btnReturn');
  const btnCaptureBg = document.getElementById('btnCaptureBg');
  const captureBtnText = document.getElementById('captureBtnText');
  const btnRefreshPage = document.getElementById('btnRefreshPage');
  const startCamBtn = document.getElementById('startCamBtn');

  const captureOverlay = document.getElementById('captureOverlay');
  const countdownNumber = document.getElementById('countdownNumber');
  const cancelCaptureBtn = document.getElementById('cancelCaptureBtn');

  const snapToggle = document.getElementById('snapToggle');
  const snapSettingsBody = document.getElementById('snapSettingsBody');
  const snapSensitivitySlider = document.getElementById('snapSensitivitySlider');
  const snapSensitivityVal = document.getElementById('snapSensitivityVal');
  const snapMeterBar = document.getElementById('snapMeterBar');
  const snapIndicator = document.getElementById('snapIndicator');

  const diagToggleHeader = document.getElementById('diagToggleHeader');
  const diagBody = document.getElementById('diagBody');
  const diagToggleIcon = document.getElementById('diagToggleIcon');
  const diagTargetPage = document.getElementById('diagTargetPage');
  const diagPageBridge = document.getElementById('diagPageBridge');
  const diagCanvasPipeline = document.getElementById('diagCanvasPipeline');
  const diagWebRtcSenders = document.getElementById('diagWebRtcSenders');
  const diagOutgoingTrack = document.getElementById('diagOutgoingTrack');
  const diagResolution = document.getElementById('diagResolution');
  const btnTestRoom = document.getElementById('btnTestRoom');
  const btnStopAll = document.getElementById('btnStopAll');

  const alertBanner = document.getElementById('alertBanner');
  const alertTitle = document.getElementById('alertTitle');
  const alertDesc = document.getElementById('alertDesc');
  const alertDismissBtn = document.getElementById('alertDismissBtn');
  const footerTargetLink = document.getElementById('footerTargetLink');

  let activeTab = null;
  let pageStatus = null;
  let popupLocalStream = null;

  // Initialize
  await setupActiveTab();
  setupEventListeners();
  loadSavedSettings();
  pollStatus();

  async function setupActiveTab() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      activeTab = tab;

      if (!activeTab || !activeTab.url) {
        setMainStatus('error', 'No Active Tab');
        diagTargetPage.textContent = 'None';
        return;
      }

      const url = new URL(activeTab.url);
      const isMeet = url.hostname.includes('meet.google.com');
      const isOmeTv = url.hostname.includes('ome.tv') || url.hostname.includes('omegle');
      const isLocalhost = url.hostname === 'localhost' || url.hostname === '127.0.0.1';

      if (isMeet) {
        const meetingCode = url.pathname.length > 1 ? url.pathname.replace(/^\//, '') : 'Home';
        diagTargetPage.textContent = `Google Meet (${meetingCode})`;
        diagTargetPage.className = 'diag-value highlight-green';
        if (footerTargetLink) footerTargetLink.textContent = 'https://meet.google.com';
        requestPageStatus();
      } else if (isOmeTv) {
        diagTargetPage.textContent = 'OmeTV';
        diagTargetPage.className = 'diag-value highlight-green';
        if (footerTargetLink) footerTargetLink.textContent = 'https://ome.tv';
        requestPageStatus();
      } else if (isLocalhost) {
        diagTargetPage.textContent = 'Local Test Room';
        diagTargetPage.className = 'diag-value highlight-green';
        if (footerTargetLink) footerTargetLink.textContent = 'http://localhost';
        requestPageStatus();
      } else {
        diagTargetPage.textContent = url.hostname;
        diagTargetPage.className = 'diag-value highlight-amber';
        showAlert(
          'Target Not Connected',
          `Active tab is ${url.hostname}. Open Google Meet (meet.google.com) or click "Launch Local Test Room" to use MeetMorph.`
        );
        setMainStatus('disconnected', 'Standby (Open Google Meet)');
      }
    } catch (err) {
      console.error('[MeetMorph Popup] setupActiveTab error:', err);
    }
  }

  function setMainStatus(type, label) {
    mainStatusDot.className = 'status-dot ' + (type || '');
    mainStatusLabel.textContent = label;
  }

  function showAlert(title, desc) {
    alertTitle.textContent = title;
    alertDesc.textContent = desc;
    alertBanner.style.display = 'flex';
  }

  function hideAlert() {
    alertBanner.style.display = 'none';
  }

  function setupEventListeners() {
    alertDismissBtn.addEventListener('click', hideAlert);

    // Vanish button
    btnVanish.addEventListener('click', async () => {
      if (!pageStatus || !pageStatus.hasBackground) {
        showAlert('Capture Background First', 'You must capture an empty room background before vanishing.');
        return;
      }
      sendTabMessage({ action: 'SET_MODE', payload: { mode: 'VANISHED' } });
    });

    // Return button
    btnReturn.addEventListener('click', async () => {
      sendTabMessage({ action: 'SET_MODE', payload: { mode: 'VISIBLE' } });
    });

    // Capture Background
    btnCaptureBg.addEventListener('click', async () => {
      sendTabMessage({ action: 'CAPTURE_BACKGROUND', payload: { seconds: 3 } });
    });

    // Cancel Countdown
    cancelCaptureBtn.addEventListener('click', () => {
      sendTabMessage({ action: 'CANCEL_COUNTDOWN' });
      captureOverlay.style.display = 'none';
    });

    // Refresh Hook
    btnRefreshPage.addEventListener('click', async () => {
      setMainStatus('connecting', 'Reconnecting...');
      requestPageStatus();
    });

    // Start Camera fallback button in popup
    startCamBtn.addEventListener('click', async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        popupLocalStream = stream;
        liveVideoPreview.srcObject = stream;
        livePlaceholder.style.display = 'none';
        liveFpsBadge.textContent = '30 FPS';
      } catch (e) {
        showAlert('Camera Access Blocked', e.message);
      }
    });

    // Snap Toggle
    snapToggle.addEventListener('change', (e) => {
      const enabled = e.target.checked;
      snapSettingsBody.style.display = enabled ? 'flex' : 'none';
      sendTabMessage({
        action: 'SET_SNAP_CONFIG',
        payload: { enabled }
      });
      chrome.storage.local.set({ snapEnabled: enabled });
    });

    // Snap Sensitivity Slider
    snapSensitivitySlider.addEventListener('input', (e) => {
      const val = e.target.value;
      snapSensitivityVal.textContent = val;
      sendTabMessage({
        action: 'SET_SNAP_CONFIG',
        payload: { sensitivity: Number(val) }
      });
      chrome.storage.local.set({ snapSensitivity: Number(val) });
    });

    // Diagnostics collapsible toggle (mouse & keyboard accessibility)
    function toggleDiagnostics() {
      const isHidden = diagBody.style.display === 'none';
      diagBody.style.display = isHidden ? 'flex' : 'none';
      diagToggleIcon.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
      diagToggleHeader.setAttribute('aria-expanded', isHidden ? 'true' : 'false');
    }

    diagToggleHeader.addEventListener('click', toggleDiagnostics);
    diagToggleHeader.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleDiagnostics();
      }
    });

    // Launch Local Test Room
    btnTestRoom.addEventListener('click', () => {
      const testRoomUrl = chrome.runtime.getURL('test-room.html');
      chrome.tabs.create({ url: testRoomUrl });
    });

    // Stop Engine
    btnStopAll.addEventListener('click', () => {
      sendTabMessage({ action: 'STOP' });
    });

    // Listen to real-time broadcasts from content.js
    chrome.runtime.onMessage.addListener((msg) => {
      if (msg.type === 'STATUS_UPDATE') {
        renderStatus(msg.payload);
      } else if (msg.type === 'COUNTDOWN_TICK') {
        updateCountdown(msg.payload.secondsRemaining);
      } else if (msg.type === 'BACKGROUND_CAPTURED') {
        onBackgroundCaptured(msg.payload);
      } else if (msg.type === 'SNAP_TRIGGERED') {
        flashSnapIndicator();
      } else if (msg.type === 'AUDIO_ENERGY') {
        updateAudioMeter(msg.payload);
      } else if (msg.type === 'ERROR') {
        showAlert('Engine Error', msg.payload.message);
      }
    });
  }

  function loadSavedSettings() {
    chrome.storage.local.get(['snapEnabled', 'snapSensitivity', 'savedBackgroundDataUrl', 'backgroundMetadata'], (data) => {
      if (data.snapEnabled) {
        snapToggle.checked = true;
        snapSettingsBody.style.display = 'flex';
      }
      if (data.snapSensitivity) {
        snapSensitivitySlider.value = data.snapSensitivity;
        snapSensitivityVal.textContent = data.snapSensitivity;
      }
      if (data.savedBackgroundDataUrl) {
        showCapturedBackground(data.savedBackgroundDataUrl, data.backgroundMetadata);
      }
    });
  }

  function sendTabMessage(message) {
    if (!activeTab || !activeTab.id) return;
    chrome.tabs.sendMessage(activeTab.id, message).catch((err) => {
      console.warn('[MeetMorph Popup] sendMessage failed:', err.message);
    });
  }

  function requestPageStatus() {
    if (!activeTab || !activeTab.id) return;
    chrome.tabs.sendMessage(activeTab.id, { action: 'GET_STATUS' }, (response) => {
      if (chrome.runtime.lastError) {
        diagPageBridge.textContent = 'Not Injected / Reload Tab';
        diagPageBridge.className = 'diag-value highlight-amber';
        setMainStatus('connecting', 'Waiting for Page Hook...');
        return;
      }
      if (response && response.status) {
        renderStatus(response.status);
      }
    });
  }

  function renderStatus(status) {
    pageStatus = status;

    // Bridge Status
    if (status.isHooked) {
      diagPageBridge.textContent = 'Hooked & Ready';
      diagPageBridge.className = 'diag-value highlight-green';
    } else {
      diagPageBridge.textContent = 'Waiting for hook';
      diagPageBridge.className = 'diag-value highlight-amber';
    }

    // Pipeline status
    if (status.hasProcessedTrack) {
      diagCanvasPipeline.textContent = `Active (${status.fps || 30} FPS)`;
      diagCanvasPipeline.className = 'diag-value highlight-green';
      liveFpsBadge.textContent = `${status.fps || 30} FPS`;
    } else {
      diagCanvasPipeline.textContent = 'Inactive (No Camera)';
      diagCanvasPipeline.className = 'diag-value';
      liveFpsBadge.textContent = '0 FPS';
    }

    // WebRTC Senders
    const senderCount = status.activeVideoSendersCount || 0;
    diagWebRtcSenders.textContent = `${senderCount} sender(s) transmitting`;
    diagWebRtcSenders.className = senderCount > 0 ? 'diag-value highlight-green' : 'diag-value';

    // Outgoing Track
    diagOutgoingTrack.textContent = status.trackId ? status.trackId.slice(0, 16) + '...' : 'None';

    // Resolution
    if (status.resolution) {
      diagResolution.textContent = `${status.resolution.width}x${status.resolution.height}`;
    }

    // Background Image
    if (status.backgroundDataUrl) {
      showCapturedBackground(status.backgroundDataUrl, status.backgroundMetadata);
    }

    // Handle Countdown State
    if (status.state === 'COUNTDOWN') {
      captureOverlay.style.display = 'flex';
      setMainStatus('countdown', 'Capturing Room...');
    } else {
      captureOverlay.style.display = 'none';

      if (status.isVanished) {
        setMainStatus('vanished', 'Vanished (Empty Room)');
        btnVanish.classList.add('active-vanish');
        btnReturn.classList.remove('active-return');
        btnVanish.disabled = true;
        btnReturn.disabled = false;
      } else if (status.hasRawStream) {
        setMainStatus('live', 'Visible (Webcam Live)');
        btnVanish.classList.remove('active-vanish');
        btnReturn.classList.add('active-return');
        btnVanish.disabled = !status.hasBackground;
        btnReturn.disabled = true;
      } else {
        setMainStatus('idle', 'Ready (Awaiting Camera)');
        btnVanish.disabled = !status.hasBackground;
        btnReturn.disabled = true;
      }
    }

    // Update capture button text if background already captured
    if (status.hasBackground) {
      captureBtnText.textContent = 'Recapture Empty Room';
    } else {
      captureBtnText.textContent = 'Capture Empty Background';
    }
  }

  function showCapturedBackground(dataUrl, metadata) {
    bgImagePreview.src = dataUrl;
    bgImagePreview.style.display = 'block';
    bgPlaceholder.style.display = 'none';
    bgStatusBadge.textContent = metadata ? `${metadata.width}x${metadata.height}` : 'Captured';
    bgStatusBadge.style.color = '#34d399';
    btnVanish.disabled = pageStatus && pageStatus.isVanished;
  }

  function updateCountdown(seconds) {
    countdownNumber.textContent = seconds;
    captureOverlay.style.display = 'flex';
  }

  function onBackgroundCaptured(payload) {
    captureOverlay.style.display = 'none';
    showCapturedBackground(payload.dataUrl, payload.metadata);
    hideAlert();
  }

  function flashSnapIndicator() {
    snapIndicator.classList.add('flash');
    setTimeout(() => {
      snapIndicator.classList.remove('flash');
    }, 600);
  }

  function updateAudioMeter(energy) {
    if (!energy) return;
    const peakPct = Math.min(100, Math.round(energy.peak * 200));
    snapMeterBar.style.width = peakPct + '%';
  }

  function pollStatus() {
    setInterval(() => {
      requestPageStatus();
    }, 1500);
  }
});
