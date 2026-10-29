/**
 * MeetMorph - Popup Controller
 * Coordinates user actions, live video previews, empty background previews,
 * WebRTC integration diagnostics, and audio snap detector controls for Google Meet.
 */

(function () {
  'use strict';

  let activeTab = null;
  let pageStatus = null;
  let popupLocalStream = null;
  let pollInterval = null;

  // DOM Elements cache
  let mainStatusDot;
  let mainStatusLabel;
  let liveVideoPreview;
  let livePlaceholder;
  let liveFpsBadge;
  let bgImagePreview;
  let bgPlaceholder;
  let bgStatusBadge;
  let btnVanish;
  let btnReturn;
  let btnCaptureBg;
  let captureBtnText;
  let btnRefreshPage;
  let startCamBtn;
  let captureOverlay;
  let countdownNumber;
  let cancelCaptureBtn;
  let snapToggle;
  let snapSettingsBody;
  let snapSensitivitySlider;
  let snapSensitivityVal;
  let snapMeterBar;
  let snapIndicator;
  let diagToggleHeader;
  let diagBody;
  let diagToggleIcon;
  let diagTargetPage;
  let diagPageBridge;
  let diagCanvasPipeline;
  let diagWebRtcSenders;
  let diagOutgoingTrack;
  let diagResolution;
  let btnTestRoom;
  let btnStopAll;
  let alertBanner;
  let alertTitle;
  let alertDesc;
  let alertDismissBtn;
  let footerTargetLink;

  function init() {
    cacheDomElements();
    setupEventListeners();
    loadSavedSettings();
    setupActiveTab();
  }

  function cacheDomElements() {
    mainStatusDot = document.getElementById('mainStatusDot');
    mainStatusLabel = document.getElementById('mainStatusLabel');
    liveVideoPreview = document.getElementById('liveVideoPreview');
    livePlaceholder = document.getElementById('livePlaceholder');
    liveFpsBadge = document.getElementById('liveFpsBadge');
    bgImagePreview = document.getElementById('bgImagePreview');
    bgPlaceholder = document.getElementById('bgPlaceholder');
    bgStatusBadge = document.getElementById('bgStatusBadge');

    btnVanish = document.getElementById('btnVanish');
    btnReturn = document.getElementById('btnReturn');
    btnCaptureBg = document.getElementById('btnCaptureBg');
    captureBtnText = document.getElementById('captureBtnText');
    btnRefreshPage = document.getElementById('btnRefreshPage');
    startCamBtn = document.getElementById('startCamBtn');

    captureOverlay = document.getElementById('captureOverlay');
    countdownNumber = document.getElementById('countdownNumber');
    cancelCaptureBtn = document.getElementById('cancelCaptureBtn');

    snapToggle = document.getElementById('snapToggle');
    snapSettingsBody = document.getElementById('snapSettingsBody');
    snapSensitivitySlider = document.getElementById('snapSensitivitySlider');
    snapSensitivityVal = document.getElementById('snapSensitivityVal');
    snapMeterBar = document.getElementById('snapMeterBar');
    snapIndicator = document.getElementById('snapIndicator');

    diagToggleHeader = document.getElementById('diagToggleHeader');
    diagBody = document.getElementById('diagBody');
    diagToggleIcon = document.getElementById('diagToggleIcon');
    diagTargetPage = document.getElementById('diagTargetPage');
    diagPageBridge = document.getElementById('diagPageBridge');
    diagCanvasPipeline = document.getElementById('diagCanvasPipeline');
    diagWebRtcSenders = document.getElementById('diagWebRtcSenders');
    diagOutgoingTrack = document.getElementById('diagOutgoingTrack');
    diagResolution = document.getElementById('diagResolution');
    btnTestRoom = document.getElementById('btnTestRoom');
    btnStopAll = document.getElementById('btnStopAll');

    alertBanner = document.getElementById('alertBanner');
    alertTitle = document.getElementById('alertTitle');
    alertDesc = document.getElementById('alertDesc');
    alertDismissBtn = document.getElementById('alertDismissBtn');
    footerTargetLink = document.getElementById('footerTargetLink');
  }

  function isSupportedTab(tab) {
    if (!tab || typeof tab.id !== 'number' || !tab.url) return false;
    try {
      const url = new URL(tab.url);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        return false;
      }
      const host = url.hostname.toLowerCase();
      return (
        host === 'meet.google.com' ||
        host.endsWith('.meet.google.com') ||
        host === 'ome.tv' ||
        host.endsWith('.ome.tv') ||
        host.includes('omegle') ||
        host === 'localhost' ||
        host === '127.0.0.1'
      );
    } catch {
      return false;
    }
  }

  async function setupActiveTab() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      activeTab = tab;

      if (!activeTab || !activeTab.url) {
        setMainStatus('disconnected', 'Standby (Open Google Meet)');
        if (diagTargetPage) {
          diagTargetPage.textContent = 'None';
          diagTargetPage.className = 'diag-value';
        }
        return;
      }

      let url;
      try {
        url = new URL(activeTab.url);
      } catch {
        setMainStatus('disconnected', 'Standby (Open Google Meet)');
        if (diagTargetPage) {
          diagTargetPage.textContent = 'Invalid URL';
          diagTargetPage.className = 'diag-value';
        }
        return;
      }

      // Check for restricted chrome:// or internal schemes
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        setMainStatus('disconnected', 'Standby (Open Google Meet)');
        if (diagTargetPage) {
          diagTargetPage.textContent = `${url.protocol.replace(':', '')} page`;
          diagTargetPage.className = 'diag-value highlight-amber';
        }
        return;
      }

      const host = url.hostname.toLowerCase();
      const isMeet = host === 'meet.google.com' || host.endsWith('.meet.google.com');
      const isOmeTv = host === 'ome.tv' || host.endsWith('.ome.tv') || host.includes('omegle');
      const isLocalhost = host === 'localhost' || host === '127.0.0.1';

      if (isMeet) {
        const meetingCode = url.pathname.length > 1 ? url.pathname.replace(/^\//, '') : 'Home';
        if (diagTargetPage) {
          diagTargetPage.textContent = `Google Meet (${meetingCode})`;
          diagTargetPage.className = 'diag-value highlight-green';
        }
        if (footerTargetLink) footerTargetLink.textContent = 'https://meet.google.com';
        await requestPageStatus();
        startPolling();
      } else if (isOmeTv) {
        if (diagTargetPage) {
          diagTargetPage.textContent = 'OmeTV';
          diagTargetPage.className = 'diag-value highlight-green';
        }
        if (footerTargetLink) footerTargetLink.textContent = 'https://ome.tv';
        await requestPageStatus();
        startPolling();
      } else if (isLocalhost) {
        if (diagTargetPage) {
          diagTargetPage.textContent = 'Local Test Room';
          diagTargetPage.className = 'diag-value highlight-green';
        }
        if (footerTargetLink) footerTargetLink.textContent = 'http://localhost';
        await requestPageStatus();
        startPolling();
      } else {
        if (diagTargetPage) {
          diagTargetPage.textContent = url.hostname;
          diagTargetPage.className = 'diag-value highlight-amber';
        }
        setMainStatus('disconnected', 'Standby (Open Google Meet)');
      }
    } catch {
      setMainStatus('disconnected', 'Standby (Open Google Meet)');
    }
  }

  function setMainStatus(type, label) {
    if (mainStatusDot) mainStatusDot.className = 'status-dot ' + (type || '');
    if (mainStatusLabel) mainStatusLabel.textContent = label;
  }

  function showAlert(title, desc) {
    if (alertTitle) alertTitle.textContent = title;
    if (alertDesc) alertDesc.textContent = desc;
    if (alertBanner) alertBanner.style.display = 'flex';
  }

  function hideAlert() {
    if (alertBanner) alertBanner.style.display = 'none';
  }

  function setupEventListeners() {
    if (alertDismissBtn) {
      alertDismissBtn.addEventListener('click', hideAlert);
    }

    // Vanish button
    if (btnVanish) {
      btnVanish.addEventListener('click', async () => {
        if (!pageStatus || !pageStatus.hasBackground) {
          showAlert('Capture Background First', 'You must capture an empty room background before vanishing.');
          return;
        }
        sendTabMessage({ action: 'SET_MODE', payload: { mode: 'VANISHED' } });
      });
    }

    // Return button
    if (btnReturn) {
      btnReturn.addEventListener('click', async () => {
        sendTabMessage({ action: 'SET_MODE', payload: { mode: 'VISIBLE' } });
      });
    }

    // Capture Background
    if (btnCaptureBg) {
      btnCaptureBg.addEventListener('click', async () => {
        sendTabMessage({ action: 'CAPTURE_BACKGROUND', payload: { seconds: 3 } });
      });
    }

    // Cancel Countdown
    if (cancelCaptureBtn) {
      cancelCaptureBtn.addEventListener('click', () => {
        sendTabMessage({ action: 'CANCEL_COUNTDOWN' });
        if (captureOverlay) captureOverlay.style.display = 'none';
      });
    }

    // Refresh Hook
    if (btnRefreshPage) {
      btnRefreshPage.addEventListener('click', async () => {
        setMainStatus('connecting', 'Reconnecting...');
        await requestPageStatus();
      });
    }

    // Start Camera fallback button in popup
    if (startCamBtn) {
      startCamBtn.addEventListener('click', async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          popupLocalStream = stream;
          if (liveVideoPreview) liveVideoPreview.srcObject = stream;
          if (livePlaceholder) livePlaceholder.style.display = 'none';
          if (liveFpsBadge) liveFpsBadge.textContent = '30 FPS';
        } catch (e) {
          showAlert(
            'Camera Access',
            'To test camera effects, open Google Meet or click "Launch Local Test Room" below.'
          );
        }
      });
    }

    // Snap Toggle
    if (snapToggle) {
      snapToggle.addEventListener('change', (e) => {
        const enabled = e.target.checked;
        if (snapSettingsBody) snapSettingsBody.style.display = enabled ? 'flex' : 'none';
        sendTabMessage({
          action: 'SET_SNAP_CONFIG',
          payload: { enabled }
        });
        try {
          chrome.storage.local.set({ snapEnabled: enabled });
        } catch {}
      });
    }

    // Snap Sensitivity Slider
    if (snapSensitivitySlider) {
      snapSensitivitySlider.addEventListener('input', (e) => {
        const val = e.target.value;
        if (snapSensitivityVal) snapSensitivityVal.textContent = val;
        sendTabMessage({
          action: 'SET_SNAP_CONFIG',
          payload: { sensitivity: Number(val) }
        });
        try {
          chrome.storage.local.set({ snapSensitivity: Number(val) });
        } catch {}
      });
    }

    // Diagnostics collapsible toggle
    function toggleDiagnostics() {
      if (!diagBody) return;
      const isHidden = diagBody.style.display === 'none';
      diagBody.style.display = isHidden ? 'flex' : 'none';
      if (diagToggleIcon) {
        diagToggleIcon.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
      }
      if (diagToggleHeader) {
        diagToggleHeader.setAttribute('aria-expanded', isHidden ? 'true' : 'false');
      }
    }

    if (diagToggleHeader) {
      diagToggleHeader.addEventListener('click', toggleDiagnostics);
      diagToggleHeader.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggleDiagnostics();
        }
      });
    }

    // Launch Local Test Room
    if (btnTestRoom) {
      btnTestRoom.addEventListener('click', () => {
        const testRoomUrl = chrome.runtime.getURL('test-room.html');
        chrome.tabs.create({ url: testRoomUrl });
      });
    }

    // Stop Engine
    if (btnStopAll) {
      btnStopAll.addEventListener('click', () => {
        sendTabMessage({ action: 'STOP' });
      });
    }

    // Listen to real-time broadcasts from content.js
    chrome.runtime.onMessage.addListener((msg) => {
      if (!msg || typeof msg !== 'object') return;
      if (msg.type === 'STATUS_UPDATE' && msg.payload) {
        renderStatus(msg.payload);
      } else if (msg.type === 'COUNTDOWN_TICK' && msg.payload) {
        updateCountdown(msg.payload.secondsRemaining);
      } else if (msg.type === 'BACKGROUND_CAPTURED' && msg.payload) {
        onBackgroundCaptured(msg.payload);
      } else if (msg.type === 'SNAP_TRIGGERED') {
        flashSnapIndicator();
      } else if (msg.type === 'AUDIO_ENERGY' && msg.payload) {
        updateAudioMeter(msg.payload);
      } else if (msg.type === 'ERROR' && msg.payload) {
        showAlert('Engine Error', msg.payload.message || 'An unexpected error occurred.');
      }
    });
  }

  function loadSavedSettings() {
    try {
      chrome.storage.local.get(['snapEnabled', 'snapSensitivity', 'savedBackgroundDataUrl', 'backgroundMetadata'], (data) => {
        if (chrome.runtime.lastError || !data) return;
        const snapEnabled = data.snapEnabled !== undefined ? !!data.snapEnabled : true;
        if (snapToggle) {
          snapToggle.checked = snapEnabled;
          if (snapSettingsBody) snapSettingsBody.style.display = snapEnabled ? 'flex' : 'none';
        }
        const sensitivity = data.snapSensitivity !== undefined ? Number(data.snapSensitivity) : 7;
        if (snapSensitivitySlider) {
          snapSensitivitySlider.value = sensitivity;
          if (snapSensitivityVal) snapSensitivityVal.textContent = sensitivity;
        }
        if (data.savedBackgroundDataUrl) {
          showCapturedBackground(data.savedBackgroundDataUrl, data.backgroundMetadata);
        }
      });
    } catch {}
  }

  async function sendTabMessage(message) {
    if (!isSupportedTab(activeTab)) {
      showAlert(
        'Action Unavailable',
        'Please open Google Meet (meet.google.com) or click "Launch Local Test Room" to use controls.'
      );
      return;
    }
    try {
      await chrome.tabs.sendMessage(activeTab.id, message);
    } catch {
      showAlert(
        'Page Reconnecting',
        'Could not communicate with the meeting tab. Refresh the meeting tab to reconnect.'
      );
    }
  }

  async function requestPageStatus() {
    if (!isSupportedTab(activeTab)) {
      return;
    }
    try {
      const response = await chrome.tabs.sendMessage(activeTab.id, { action: 'GET_STATUS' });
      if (response && response.status) {
        renderStatus(response.status);
      } else if (diagPageBridge) {
        diagPageBridge.textContent = 'Waiting for hook';
        diagPageBridge.className = 'diag-value highlight-amber';
      }
    } catch {
      // Content script is not injected yet or page is still loading
      if (diagPageBridge) {
        diagPageBridge.textContent = 'Not Injected / Reload Tab';
        diagPageBridge.className = 'diag-value highlight-amber';
      }
      setMainStatus('connecting', 'Waiting for Page Hook...');
    }
  }

  function startPolling() {
    if (pollInterval) {
      clearInterval(pollInterval);
    }
    pollInterval = setInterval(() => {
      if (isSupportedTab(activeTab)) {
        requestPageStatus();
      } else if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
      }
    }, 1500);
  }

  function renderStatus(status) {
    if (!status || typeof status !== 'object') return;
    pageStatus = status;

    // Bridge Status
    if (diagPageBridge) {
      if (status.isHooked) {
        diagPageBridge.textContent = 'Hooked & Ready';
        diagPageBridge.className = 'diag-value highlight-green';
      } else {
        diagPageBridge.textContent = 'Waiting for hook';
        diagPageBridge.className = 'diag-value highlight-amber';
      }
    }

    // Pipeline status
    if (diagCanvasPipeline) {
      if (status.hasProcessedTrack) {
        diagCanvasPipeline.textContent = `Active (${status.fps || 30} FPS)`;
        diagCanvasPipeline.className = 'diag-value highlight-green';
        if (liveFpsBadge) liveFpsBadge.textContent = `${status.fps || 30} FPS`;
      } else {
        diagCanvasPipeline.textContent = 'Inactive (No Camera)';
        diagCanvasPipeline.className = 'diag-value';
        if (liveFpsBadge) liveFpsBadge.textContent = '0 FPS';
      }
    }

    // WebRTC Senders
    if (diagWebRtcSenders) {
      const senderCount = typeof status.activeVideoSendersCount === 'number' ? status.activeVideoSendersCount : 0;
      diagWebRtcSenders.textContent = `${senderCount} sender(s) transmitting`;
      diagWebRtcSenders.className = senderCount > 0 ? 'diag-value highlight-green' : 'diag-value';
    }

    // Outgoing Track
    if (diagOutgoingTrack) {
      diagOutgoingTrack.textContent = status.trackId ? status.trackId.slice(0, 16) + '...' : 'None';
    }

    // Resolution
    if (diagResolution) {
      if (status.resolution && status.resolution.width && status.resolution.height) {
        diagResolution.textContent = `${status.resolution.width}x${status.resolution.height}`;
      } else {
        diagResolution.textContent = 'Awaiting Camera';
      }
    }

    // Background Image
    if (status.backgroundDataUrl) {
      showCapturedBackground(status.backgroundDataUrl, status.backgroundMetadata);
    }

    // Handle Countdown State
    if (status.state === 'COUNTDOWN') {
      if (captureOverlay) captureOverlay.style.display = 'flex';
      setMainStatus('countdown', 'Capturing Room...');
    } else {
      if (captureOverlay) captureOverlay.style.display = 'none';

      if (status.isVanished) {
        setMainStatus('vanished', 'Vanished (Empty Room)');
        if (btnVanish) {
          btnVanish.classList.add('active-vanish');
          btnVanish.disabled = true;
        }
        if (btnReturn) {
          btnReturn.classList.remove('active-return');
          btnReturn.disabled = false;
        }
      } else if (status.hasRawStream) {
        setMainStatus('live', 'Visible (Webcam Live)');
        if (btnVanish) {
          btnVanish.classList.remove('active-vanish');
          btnVanish.disabled = !status.hasBackground;
        }
        if (btnReturn) {
          btnReturn.classList.add('active-return');
          btnReturn.disabled = true;
        }
      } else {
        setMainStatus('idle', 'Ready (Awaiting Camera)');
        if (btnVanish) btnVanish.disabled = !status.hasBackground;
        if (btnReturn) btnReturn.disabled = true;
      }
    }

    // Update capture button text if background already captured
    if (captureBtnText) {
      if (status.hasBackground) {
        captureBtnText.textContent = 'Recapture Empty Room';
      } else {
        captureBtnText.textContent = 'Capture Empty Background';
      }
    }
  }

  function showCapturedBackground(dataUrl, metadata) {
    if (!dataUrl || !bgImagePreview) return;
    bgImagePreview.src = dataUrl;
    bgImagePreview.style.display = 'block';
    if (bgPlaceholder) bgPlaceholder.style.display = 'none';
    if (bgStatusBadge) {
      bgStatusBadge.textContent = metadata && metadata.width && metadata.height ? `${metadata.width}x${metadata.height}` : 'Captured';
      bgStatusBadge.style.color = '#34d399';
    }
    if (btnVanish && pageStatus) {
      btnVanish.disabled = !!pageStatus.isVanished;
    }
  }

  function updateCountdown(seconds) {
    if (countdownNumber) countdownNumber.textContent = seconds;
    if (captureOverlay) captureOverlay.style.display = 'flex';
  }

  function onBackgroundCaptured(payload) {
    if (captureOverlay) captureOverlay.style.display = 'none';
    if (payload && payload.dataUrl) {
      showCapturedBackground(payload.dataUrl, payload.metadata);
    }
    hideAlert();
  }

  function flashSnapIndicator() {
    if (!snapIndicator) return;
    snapIndicator.classList.add('flash');
    setTimeout(() => {
      if (snapIndicator) snapIndicator.classList.remove('flash');
    }, 600);
  }

  function updateAudioMeter(energy) {
    if (!energy || !snapMeterBar) return;
    const peak = typeof energy.peak === 'number' ? energy.peak : 0;
    const peakPct = Math.min(100, Math.round(peak * 200));
    snapMeterBar.style.width = peakPct + '%';
  }

  // Teardown when popup closes
  window.addEventListener('unload', () => {
    if (pollInterval) {
      clearInterval(pollInterval);
    }
    if (popupLocalStream) {
      for (const track of popupLocalStream.getTracks()) {
        try { track.stop(); } catch {}
      }
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
