/**
 * QRQuick - Scanner Controller
 * Handles image file drop/upload, clipboard paste, live camera video stream,
 * and secure URL confirmation workflows.
 */

import { decodeFromBlob, decodeFromElement } from './decoder.js';
import { saveScanResult, getSettings } from '../services/storage-service.js';

// DOM Elements
const scanDropzone = document.getElementById('scanDropzone');
const scanFileInput = document.getElementById('scanFileInput');
const dropzoneContent = document.getElementById('dropzoneContent');
const scanImagePreviewWrap = document.getElementById('scanImagePreviewWrap');
const scannedImagePreview = document.getElementById('scannedImagePreview');

const btnToggleCamera = document.getElementById('btnToggleCamera');
const lblCameraBtn = document.getElementById('lblCameraBtn');
const cameraViewportWrap = document.getElementById('cameraViewportWrap');
const cameraVideo = document.getElementById('cameraVideo');
const cameraNotice = document.getElementById('cameraNotice');

const resultStatusBadge = document.getElementById('resultStatusBadge');
const emptyResultView = document.getElementById('emptyResultView');
const scannedDetailsView = document.getElementById('scannedDetailsView');
const detectedTypeBadge = document.getElementById('detectedTypeBadge');
const scanTimestamp = document.getElementById('scanTimestamp');
const scannedTitle = document.getElementById('scannedTitle');
const structuredFieldsWrap = document.getElementById('structuredFieldsWrap');
const rawDecodedText = document.getElementById('rawDecodedText');
const securityWarningBanner = document.getElementById('securityWarningBanner');
const securityWarningMsg = document.getElementById('securityWarningMsg');

const btnOpenUrl = document.getElementById('btnOpenUrl');
const btnCopyResult = document.getElementById('btnCopyResult');
const btnCustomizeInStudio = document.getElementById('btnCustomizeInStudio');
const btnSaveToHistory = document.getElementById('btnSaveToHistory');

// Safety Modal
const urlConfirmModal = document.getElementById('urlConfirmModal');
const modalTargetUrl = document.getElementById('modalTargetUrl');
const btnCancelOpenUrl = document.getElementById('btnCancelOpenUrl');
const btnConfirmOpenUrl = document.getElementById('btnConfirmOpenUrl');

// State
let cameraStream = null;
let cameraAnimationFrameId = null;
let isCameraActive = false;
let currentDecoded = null;

/**
 * Initializes the scanner
 */
function initScanner() {
  bindDropzone();
  bindPasteListener();
  bindCamera();
  bindResultActions();
  bindModalActions();
}

/**
 * Binds dropzone click, dragover, drop, and file input
 */
function bindDropzone() {
  scanDropzone.addEventListener('click', (e) => {
    // Avoid triggering if click was on preview
    if (e.target.closest('#scanImagePreviewWrap')) return;
    scanFileInput.click();
  });

  scanFileInput.addEventListener('change', (e) => {
    if (e.target.files?.[0]) {
      processImageFile(e.target.files[0]);
    }
  });

  scanDropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    scanDropzone.classList.add('dragover');
  });

  scanDropzone.addEventListener('dragleave', () => {
    scanDropzone.classList.remove('dragover');
  });

  scanDropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    scanDropzone.classList.remove('dragover');
    if (e.dataTransfer.files?.[0]) {
      processImageFile(e.dataTransfer.files[0]);
    }
  });
}

/**
 * Binds window paste event to scan images directly from clipboard (Ctrl+V / Cmd+V)
 */
function bindPasteListener() {
  window.addEventListener('paste', async (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          processImageFile(file);
          return;
        }
      }
    }
  });
}

/**
 * Processes an image File or Blob
 * @param {Blob|File} file
 */
async function processImageFile(file) {
  // Stop camera if running
  if (isCameraActive) {
    stopCamera();
  }

  // Show image preview
  const url = URL.createObjectURL(file);
  scannedImagePreview.src = url;
  dropzoneContent.hidden = true;
  scanImagePreviewWrap.hidden = false;

  resultStatusBadge.className = 'status-badge waiting';
  resultStatusBadge.textContent = 'Decoding...';

  try {
    const res = await decodeFromBlob(file);
    if (!res.success) {
      showScanError(res.error);
    } else {
      showScanSuccess(res.result);
    }
  } catch (err) {
    showScanError(err.message || 'Failed to decode image.');
  }
}

/**
 * Sets up Live Camera feed
 */
function bindCamera() {
  btnToggleCamera.addEventListener('click', async () => {
    if (isCameraActive) {
      stopCamera();
    } else {
      await startCamera();
    }
  });
}

/**
 * Starts webcam scanning
 */
async function startCamera() {
  if (!navigator.mediaDevices?.getUserMedia) {
    alert('Live camera scanning is not supported by your browser.');
    return;
  }

  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'environment',
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: false
    });

    cameraVideo.srcObject = cameraStream;
    cameraViewportWrap.hidden = false;
    cameraNotice.hidden = false;
    isCameraActive = true;
    lblCameraBtn.textContent = 'Stop Camera';
    btnToggleCamera.classList.add('active');

    // Start video playback & scanner loop
    await cameraVideo.play();
    requestCameraFrameScan();
  } catch (err) {
    console.warn('Camera access denied or failed:', err);
    alert('Unable to access webcam. Please check Chrome camera permissions.');
    stopCamera();
  }
}

/**
 * Continuous scanning loop on camera video frames
 */
function requestCameraFrameScan() {
  if (!isCameraActive) return;

  if (cameraVideo.readyState === cameraVideo.HAVE_ENOUGH_DATA) {
    const decoded = decodeFromElement(cameraVideo);
    if (decoded) {
      // Successful scan!
      showScanSuccess(decoded);
      stopCamera(); // Stop camera once code found
      return;
    }
  }

  cameraAnimationFrameId = requestAnimationFrame(requestCameraFrameScan);
}

/**
 * Shuts down webcam stream cleanly
 */
function stopCamera() {
  if (cameraAnimationFrameId) {
    cancelAnimationFrame(cameraAnimationFrameId);
    cameraAnimationFrameId = null;
  }

  if (cameraStream) {
    cameraStream.getTracks().forEach(track => track.stop());
    cameraStream = null;
  }

  cameraVideo.srcObject = null;
  cameraViewportWrap.hidden = true;
  cameraNotice.hidden = true;
  isCameraActive = false;
  lblCameraBtn.textContent = 'Start Camera';
  btnToggleCamera.classList.remove('active');
}

/**
 * Displays error state
 */
function showScanError(msg) {
  resultStatusBadge.className = 'status-badge error';
  resultStatusBadge.textContent = 'Scan Failed ✗';

  emptyResultView.hidden = false;
  scannedDetailsView.hidden = true;

  emptyResultView.innerHTML = `
    <div class="empty-icon">⚠️</div>
    <p style="color: #F87171; font-weight: 600;">${msg}</p>
    <p style="font-size: 12px; margin-top: 8px;">Try zooming in, improving lighting, or uncropping the corners.</p>
  `;
}

/**
 * Displays decoded QR result with structured metadata and security checks
 */
async function showScanSuccess(decoded) {
  currentDecoded = decoded;

  resultStatusBadge.className = 'status-badge success';
  resultStatusBadge.textContent = 'Decoded Successfully ✓';

  emptyResultView.hidden = true;
  scannedDetailsView.hidden = false;

  detectedTypeBadge.textContent = decoded.type.toUpperCase();
  scanTimestamp.textContent = new Date().toLocaleTimeString();
  scannedTitle.textContent = decoded.title;
  rawDecodedText.textContent = decoded.rawText;

  // Render structured fields for rich types (Wi-Fi, Contact, etc.)
  renderStructuredFields(decoded);

  // Security warning banner
  if (decoded.isSuspicious) {
    securityWarningBanner.hidden = false;
    securityWarningMsg.textContent = decoded.securityWarning || 'Suspicious URL detected.';
  } else {
    securityWarningBanner.hidden = true;
  }

  // URL button
  if (decoded.isUrl && decoded.actionUrl) {
    btnOpenUrl.hidden = false;
  } else {
    btnOpenUrl.hidden = true;
  }

  // Auto-save to scan history if enabled
  const settings = await getSettings();
  if (settings.autoSaveScans) {
    saveScanResult({
      decodedText: decoded.rawText,
      recognizedType: decoded.type,
      title: decoded.title,
      isUrl: decoded.isUrl
    }).catch(() => {});
  }
}

/**
 * Renders structured metadata breakdown
 */
function renderStructuredFields(decoded) {
  structuredFieldsWrap.innerHTML = '';

  if (decoded.type === 'wifi') {
    structuredFieldsWrap.hidden = false;
    structuredFieldsWrap.innerHTML = `
      <div class="structured-row">
        <span class="s-label">SSID (Network)</span>
        <span class="s-val">${escapeHtml(decoded.details.ssid)}</span>
      </div>
      <div class="structured-row">
        <span class="s-label">Security</span>
        <span class="s-val">${escapeHtml(decoded.details.encryption)}</span>
      </div>
      ${decoded.details.password ? `
        <div class="structured-row">
          <span class="s-label">Password</span>
          <span class="s-val">${escapeHtml(decoded.details.password)}</span>
        </div>
      ` : ''}
    `;
  } else if (decoded.type === 'contact') {
    structuredFieldsWrap.hidden = false;
    structuredFieldsWrap.innerHTML = `
      <div class="structured-row">
        <span class="s-label">Name</span>
        <span class="s-val">${escapeHtml(decoded.details.name)}</span>
      </div>
      ${decoded.details.phone ? `
        <div class="structured-row">
          <span class="s-label">Phone</span>
          <span class="s-val">${escapeHtml(decoded.details.phone)}</span>
        </div>
      ` : ''}
      ${decoded.details.email ? `
        <div class="structured-row">
          <span class="s-label">Email</span>
          <span class="s-val">${escapeHtml(decoded.details.email)}</span>
        </div>
      ` : ''}
      ${decoded.details.organization ? `
        <div class="structured-row">
          <span class="s-label">Company</span>
          <span class="s-val">${escapeHtml(decoded.details.organization)}</span>
        </div>
      ` : ''}
    `;
  } else {
    structuredFieldsWrap.hidden = true;
  }
}

/**
 * Escapes HTML characters for safe rendering
 */
function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Binds result action buttons
 */
function bindResultActions() {
  btnCopyResult.addEventListener('click', async () => {
    if (!currentDecoded) return;
    try {
      await navigator.clipboard.writeText(currentDecoded.rawText);
      showButtonFeedback(btnCopyResult, '✓ Content Copied!');
    } catch {
      alert('Failed to copy to clipboard.');
    }
  });

  btnCustomizeInStudio.addEventListener('click', () => {
    if (!currentDecoded) return;
    const type = currentDecoded.type || 'text';
    const text = encodeURIComponent(currentDecoded.rawText);
    const title = encodeURIComponent(currentDecoded.title || '');
    window.location.href = `../generator/generator.html?${type}=${text}&title=${title}`;
  });

  btnSaveToHistory.addEventListener('click', async () => {
    if (!currentDecoded) return;
    try {
      await saveScanResult({
        decodedText: currentDecoded.rawText,
        recognizedType: currentDecoded.type,
        title: currentDecoded.title,
        isUrl: currentDecoded.isUrl
      });
      showButtonFeedback(btnSaveToHistory, '✓ Saved to History');
    } catch (err) {
      alert('Failed to save to history.');
    }
  });

  // Open URL Safety Workflow
  btnOpenUrl.addEventListener('click', async () => {
    if (!currentDecoded || !currentDecoded.actionUrl) return;

    const settings = await getSettings();
    if (settings.promptConfirmOnUrl) {
      // Show confirmation safety modal
      modalTargetUrl.textContent = currentDecoded.actionUrl;
      urlConfirmModal.hidden = false;
    } else {
      window.open(currentDecoded.actionUrl, '_blank', 'noopener,noreferrer');
    }
  });
}

/**
 * Binds URL safety confirmation modal
 */
function bindModalActions() {
  btnCancelOpenUrl.addEventListener('click', () => {
    urlConfirmModal.hidden = true;
  });

  btnConfirmOpenUrl.addEventListener('click', () => {
    urlConfirmModal.hidden = true;
    if (currentDecoded && currentDecoded.actionUrl) {
      window.open(currentDecoded.actionUrl, '_blank', 'noopener,noreferrer');
    }
  });
}

function showButtonFeedback(btn, text) {
  const original = btn.innerHTML;
  btn.textContent = text;
  setTimeout(() => {
    btn.innerHTML = original;
  }, 1600);
}

// Cleanup camera stream if user closes window
window.addEventListener('beforeunload', () => {
  stopCamera();
});

// Start on DOM ready
document.addEventListener('DOMContentLoaded', initScanner);
