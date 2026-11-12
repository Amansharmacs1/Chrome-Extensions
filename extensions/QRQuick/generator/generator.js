/**
 * QRQuick - Standalone Generator Controller
 * Manages 9 payload builders, live interactive customization,
 * contrast & logo safety audits, and multi-format exports.
 */

import {
  buildUrlPayload,
  buildTextPayload,
  buildContactPayload,
  buildEmailPayload,
  buildPhonePayload,
  buildSmsPayload,
  buildWifiPayload,
  buildLocationPayload,
  buildEventPayload
} from '../services/payload-builder.js';
import { renderQRToCanvas, generateQRMatrix } from './qr-engine.js';
import { evaluateCustomizationSafety, DEFAULT_CUSTOMIZATION } from './customization.js';
import {
  downloadPng,
  downloadSvg,
  downloadJpeg,
  copyQrImageToClipboard,
  copyTextToClipboard
} from '../services/export-service.js';
import {
  getPresets,
  saveHistoryItem,
  getSettings
} from '../services/storage-service.js';

// DOM elements
const typeChipsContainer = document.getElementById('typeChipsContainer');
const qrCanvas = document.getElementById('qrCanvas');
const specBytes = document.getElementById('specBytes');
const specVersion = document.getElementById('specVersion');
const specEc = document.getElementById('specEc');
const pillScannability = document.getElementById('pillScannability');
const generalAlertBox = document.getElementById('generalAlertBox');

// Color & Style Inputs
const pickerFgColor = document.getElementById('pickerFgColor');
const hexFgColor = document.getElementById('hexFgColor');
const pickerBgColor = document.getElementById('pickerBgColor');
const hexBgColor = document.getElementById('hexBgColor');
const checkUseGradient = document.getElementById('checkUseGradient');
const gradientOptionsWrap = document.getElementById('gradientOptionsWrap');
const pickerGradSecondary = document.getElementById('pickerGradSecondary');
const hexGradSecondary = document.getElementById('hexGradSecondary');
const selectGradType = document.getElementById('selectGradType');
const checkTransparentBg = document.getElementById('checkTransparentBg');
const valContrastRatio = document.getElementById('valContrastRatio');
const badgeContrastStatus = document.getElementById('badgeContrastStatus');
const contrastWarningBox = document.getElementById('contrastWarningBox');

// Shapes & Modules
const selectModulePattern = document.getElementById('selectModulePattern');
const selectEyeOuter = document.getElementById('selectEyeOuter');
const selectEyeInner = document.getElementById('selectEyeInner');

// Logo Controls
const logoDropzone = document.getElementById('logoDropzone');
const fileLogoUpload = document.getElementById('fileLogoUpload');
const logoDropzoneContent = document.getElementById('logoDropzoneContent');
const logoPreviewWrap = document.getElementById('logoPreviewWrap');
const imgLogoThumb = document.getElementById('imgLogoThumb');
const logoFileName = document.getElementById('logoFileName');
const btnRemoveLogo = document.getElementById('btnRemoveLogo');
const logoControlsPanel = document.getElementById('logoControlsPanel');
const rangeLogoSize = document.getElementById('rangeLogoSize');
const lblLogoSize = document.getElementById('lblLogoSize');
const selectLogoShape = document.getElementById('selectLogoShape');
const logoWarningBox = document.getElementById('logoWarningBox');

// Parameters
const selectEcLevel = document.getElementById('selectEcLevel');
const rangeMargin = document.getElementById('rangeMargin');
const lblMarginVal = document.getElementById('lblMarginVal');
const selectExportSize = document.getElementById('selectExportSize');
const presetPillsContainer = document.getElementById('presetPillsContainer');
const btnResetStyles = document.getElementById('btnResetStyles');

// Action Buttons
const btnDownloadPng = document.getElementById('btnDownloadPng');
const btnDownloadSvg = document.getElementById('btnDownloadSvg');
const btnDownloadJpeg = document.getElementById('btnDownloadJpeg');
const btnCopyImage = document.getElementById('btnCopyImage');
const btnCopyPayload = document.getElementById('btnCopyPayload');
const btnUseCurrentPage = document.getElementById('btnUseCurrentPage');
const btnToggleWifiPass = document.getElementById('btnToggleWifiPass');

// State
let activeType = 'url';
let currentPayload = '';
let currentTitle = '';
let logoImageObj = null;
let logoDataUrl = null;

let customization = { ...DEFAULT_CUSTOMIZATION };

/**
 * Initializes the Generator Studio
 */
async function initGenerator() {
  bindTabs();
  bindFormInputs();
  bindCustomizerInputs();
  bindActions();
  await loadPresets();
  parseUrlQuery();
  updateAndRender();
}

/**
 * Parses query params from URL (e.g. from context menus, shortcuts, popup)
 */
function parseUrlQuery() {
  const params = new URLSearchParams(window.location.search);

  if (params.has('url')) {
    activeType = 'url';
    document.getElementById('inputUrl').value = params.get('url');
    if (params.has('title')) {
      document.getElementById('inputUrlTitle').value = params.get('title');
    }
  } else if (params.has('text')) {
    activeType = 'text';
    document.getElementById('inputText').value = params.get('text');
  }

  // Set active tab chip
  const chip = document.querySelector(`.type-chip[data-type="${activeType}"]`);
  if (chip) switchTab(activeType, chip);
}

/**
 * Switches the active payload tab
 */
function switchTab(type, chipElement) {
  activeType = type;
  document.querySelectorAll('.type-chip').forEach(c => c.classList.remove('active'));
  chipElement.classList.add('active');

  document.querySelectorAll('.type-form').forEach(f => f.classList.remove('active'));
  const targetForm = document.getElementById(`form${type.charAt(0).toUpperCase() + type.slice(1)}`);
  if (targetForm) targetForm.classList.add('active');

  updateAndRender();
}

/**
 * Gathers input parameters and builds payload string
 */
function buildCurrentPayload() {
  try {
    switch (activeType) {
      case 'url': {
        const url = document.getElementById('inputUrl').value.trim();
        const title = document.getElementById('inputUrlTitle').value.trim();
        return buildUrlPayload({ url, title });
      }
      case 'text': {
        const text = document.getElementById('inputText').value;
        return buildTextPayload({ text });
      }
      case 'wifi': {
        const ssid = document.getElementById('inputWifiSsid').value;
        const password = document.getElementById('inputWifiPass').value;
        const encryption = document.getElementById('selectWifiEnc').value;
        const hidden = document.getElementById('checkWifiHidden').checked;
        return buildWifiPayload({ ssid, password, encryption, hidden });
      }
      case 'contact': {
        const firstName = document.getElementById('inputVcardFirst').value;
        const lastName = document.getElementById('inputVcardLast').value;
        const organization = document.getElementById('inputVcardOrg').value;
        const title = document.getElementById('inputVcardJob').value;
        const phone = document.getElementById('inputVcardPhone').value;
        const email = document.getElementById('inputVcardEmail').value;
        const website = document.getElementById('inputVcardUrl').value;
        return buildContactPayload({ firstName, lastName, organization, title, phone, email, website });
      }
      case 'email': {
        const email = document.getElementById('inputEmailTo').value;
        const subject = document.getElementById('inputEmailSubject').value;
        const body = document.getElementById('inputEmailBody').value;
        return buildEmailPayload({ email, subject, body });
      }
      case 'phone': {
        const phone = document.getElementById('inputPhone').value;
        return buildPhonePayload({ phone });
      }
      case 'sms': {
        const phone = document.getElementById('inputSmsPhone').value;
        const message = document.getElementById('inputSmsMsg').value;
        return buildSmsPayload({ phone, message });
      }
      case 'location': {
        const latitude = document.getElementById('inputLocLat').value;
        const longitude = document.getElementById('inputLocLng').value;
        const query = document.getElementById('inputLocQuery').value;
        return buildLocationPayload({ latitude, longitude, query });
      }
      case 'event': {
        const title = document.getElementById('inputEventTitle').value;
        const start = document.getElementById('inputEventStart').value;
        const end = document.getElementById('inputEventEnd').value;
        const location = document.getElementById('inputEventLoc').value;
        const description = document.getElementById('inputEventDesc').value;
        return buildEventPayload({ title, start, end, location, description });
      }
      default:
        return { payload: '', title: '' };
    }
  } catch (err) {
    return { payload: '', title: '', error: err.message };
  }
}

/**
 * Main update and render loop
 */
async function updateAndRender() {
  const built = buildCurrentPayload();

  if (built.error) {
    generalAlertBox.hidden = false;
    generalAlertBox.textContent = built.error;
    pillScannability.className = 'scannability-pill warning';
    pillScannability.textContent = 'Invalid Input ⚠';
    return;
  }

  currentPayload = built.payload;
  currentTitle = built.title;

  if (!currentPayload) {
    generalAlertBox.hidden = false;
    generalAlertBox.textContent = 'Please fill in required fields to generate QR code.';
    pillScannability.className = 'scannability-pill warning';
    pillScannability.textContent = 'Incomplete';
    return;
  }

  generalAlertBox.hidden = true;

  // Run safety evaluations
  const safety = evaluateCustomizationSafety(customization);
  updateSafetyUi(safety);

  // Render to canvas
  try {
    const effectiveEc = logoImageObj ? 'H' : customization.ecLevel;
    const matrixInfo = generateQRMatrix(currentPayload, effectiveEc);

    // Update specs bar
    const byteLength = new TextEncoder().encode(currentPayload).length;
    specBytes.textContent = `${byteLength} bytes`;
    specVersion.textContent = `Grid: ${matrixInfo.moduleCount}×${matrixInfo.moduleCount}`;
    specEc.textContent = `Level: ${effectiveEc}`;

    await renderQRToCanvas(qrCanvas, currentPayload, customization, logoImageObj);

    // Save to history automatically if enabled
    const settings = await getSettings();
    if (settings.autoSaveGenerated) {
      saveHistoryItem({
        type: activeType,
        title: currentTitle,
        payload: currentPayload,
        options: { ...customization, logoDataUrl: null }, // Omit large logo base64 from history to conserve quota
        thumbnailDataUrl: qrCanvas.toDataURL('image/png', 0.4)
      }).catch(() => {});
    }
  } catch (err) {
    generalAlertBox.hidden = false;
    generalAlertBox.textContent = err.message || 'Failed to render QR code.';
    pillScannability.className = 'scannability-pill warning';
    pillScannability.textContent = 'Error';
  }
}

/**
 * Updates contrast meter and warning badges
 */
function updateSafetyUi(safety) {
  valContrastRatio.textContent = `${safety.contrast.ratio}:1`;

  if (safety.contrast.ratio >= 4.5) {
    badgeContrastStatus.className = 'contrast-badge safe';
    badgeContrastStatus.textContent = 'Excellent (WCAG AAA)';
    contrastWarningBox.hidden = true;
  } else if (safety.contrast.ratio >= 3.0) {
    badgeContrastStatus.className = 'contrast-badge safe';
    badgeContrastStatus.textContent = 'Safe for Scanning';
    contrastWarningBox.hidden = true;
  } else {
    badgeContrastStatus.className = 'contrast-badge danger';
    badgeContrastStatus.textContent = 'Low Contrast ⚠';
    contrastWarningBox.hidden = false;
    contrastWarningBox.textContent = safety.contrast.warning || 'Contrast is too low for reliable camera scanning.';
  }

  if (safety.logo && safety.logo.warning) {
    logoWarningBox.hidden = false;
    logoWarningBox.textContent = safety.logo.warning;
  } else {
    logoWarningBox.hidden = true;
  }

  if (safety.isSafe) {
    pillScannability.className = 'scannability-pill safe';
    pillScannability.textContent = 'Ready to Scan ✓';
  } else {
    pillScannability.className = 'scannability-pill warning';
    pillScannability.textContent = 'Review Warnings ⚠';
  }
}

/**
 * Loads and renders preset pills
 */
async function loadPresets() {
  const presets = await getPresets();
  presetPillsContainer.innerHTML = '';

  for (const preset of presets) {
    const pill = document.createElement('button');
    pill.className = 'preset-pill';
    pill.innerHTML = `
      <span class="color-dot" style="background: ${preset.fgColor}"></span>
      <span>${preset.name}</span>
    `;

    pill.addEventListener('click', () => {
      document.querySelectorAll('.preset-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      applyPreset(preset);
    });

    presetPillsContainer.appendChild(pill);
  }
}

/**
 * Applies a styling preset to the customizer state and UI
 */
function applyPreset(preset) {
  customization.fgColor = preset.fgColor;
  customization.bgColor = preset.bgColor;
  customization.pattern = preset.pattern || 'square';
  customization.eyeOuter = preset.eyeOuter || 'square';
  customization.eyeInner = preset.eyeInner || 'square';
  customization.margin = preset.margin ?? 4;
  customization.ecLevel = preset.ecLevel || 'M';
  customization.isGradient = Boolean(preset.isGradient);
  customization.gradientType = preset.gradientType || 'linear';
  customization.fgColorSecondary = preset.fgColorSecondary || '#06B6D4';

  // Sync inputs
  pickerFgColor.value = customization.fgColor;
  hexFgColor.value = customization.fgColor;
  pickerBgColor.value = customization.bgColor;
  hexBgColor.value = customization.bgColor;
  selectModulePattern.value = customization.pattern;
  selectEyeOuter.value = customization.eyeOuter;
  selectEyeInner.value = customization.eyeInner;
  rangeMargin.value = customization.margin;
  lblMarginVal.textContent = customization.margin;
  selectEcLevel.value = customization.ecLevel;

  checkUseGradient.checked = customization.isGradient;
  gradientOptionsWrap.hidden = !customization.isGradient;
  pickerGradSecondary.value = customization.fgColorSecondary;
  hexGradSecondary.value = customization.fgColorSecondary;
  selectGradType.value = customization.gradientType;

  updateAndRender();
}

/**
 * Binds payload type tabs
 */
function bindTabs() {
  typeChipsContainer.addEventListener('click', (e) => {
    const chip = e.target.closest('.type-chip');
    if (!chip) return;
    const type = chip.dataset.type;
    switchTab(type, chip);
  });
}

/**
 * Binds form field inputs for real-time live preview
 */
function bindFormInputs() {
  const formsContainer = document.querySelector('.form-card');
  formsContainer.addEventListener('input', () => {
    updateAndRender();
  });
  formsContainer.addEventListener('change', () => {
    updateAndRender();
  });

  // Current page inserter
  btnUseCurrentPage?.addEventListener('click', async () => {
    if (typeof chrome !== 'undefined' && chrome.tabs?.query) {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]?.url) {
        document.getElementById('inputUrl').value = tabs[0].url;
        document.getElementById('inputUrlTitle').value = tabs[0].title || '';
        updateAndRender();
      }
    }
  });

  // Toggle Wi-Fi password visibility
  btnToggleWifiPass?.addEventListener('click', () => {
    const passInput = document.getElementById('inputWifiPass');
    if (passInput.type === 'password') {
      passInput.type = 'text';
      btnToggleWifiPass.textContent = '🔒';
    } else {
      passInput.type = 'password';
      btnToggleWifiPass.textContent = '👁';
    }
  });

  // Default start date for Event
  const now = new Date();
  const inOneHour = new Date(now.getTime() + 3600000);
  const toLocalIso = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  const inputEventStart = document.getElementById('inputEventStart');
  const inputEventEnd = document.getElementById('inputEventEnd');
  if (inputEventStart) inputEventStart.value = toLocalIso(now);
  if (inputEventEnd) inputEventEnd.value = toLocalIso(inOneHour);
}

/**
 * Binds customizer controls
 */
function bindCustomizerInputs() {
  // Foreground Color
  pickerFgColor.addEventListener('input', (e) => {
    customization.fgColor = e.target.value;
    hexFgColor.value = e.target.value;
    updateAndRender();
  });
  hexFgColor.addEventListener('change', (e) => {
    let val = e.target.value.trim();
    if (!val.startsWith('#')) val = '#' + val;
    customization.fgColor = val;
    pickerFgColor.value = val;
    updateAndRender();
  });

  // Background Color
  pickerBgColor.addEventListener('input', (e) => {
    customization.bgColor = e.target.value;
    hexBgColor.value = e.target.value;
    updateAndRender();
  });
  hexBgColor.addEventListener('change', (e) => {
    let val = e.target.value.trim();
    if (!val.startsWith('#')) val = '#' + val;
    customization.bgColor = val;
    pickerBgColor.value = val;
    updateAndRender();
  });

  // Gradient
  checkUseGradient.addEventListener('change', (e) => {
    customization.isGradient = e.target.checked;
    gradientOptionsWrap.hidden = !e.target.checked;
    updateAndRender();
  });
  pickerGradSecondary.addEventListener('input', (e) => {
    customization.fgColorSecondary = e.target.value;
    hexGradSecondary.value = e.target.value;
    updateAndRender();
  });
  selectGradType.addEventListener('change', (e) => {
    customization.gradientType = e.target.value;
    updateAndRender();
  });

  // Transparent Background
  checkTransparentBg.addEventListener('change', (e) => {
    if (e.target.checked) {
      customization.bgColor = 'transparent';
    } else {
      customization.bgColor = pickerBgColor.value;
    }
    updateAndRender();
  });

  // Shape selects
  selectModulePattern.addEventListener('change', (e) => {
    customization.pattern = e.target.value;
    updateAndRender();
  });
  selectEyeOuter.addEventListener('change', (e) => {
    customization.eyeOuter = e.target.value;
    updateAndRender();
  });
  selectEyeInner.addEventListener('change', (e) => {
    customization.eyeInner = e.target.value;
    updateAndRender();
  });

  // Logo upload
  logoDropzone.addEventListener('click', () => fileLogoUpload.click());
  logoDropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    logoDropzone.classList.add('dragover');
  });
  logoDropzone.addEventListener('dragleave', () => logoDropzone.classList.remove('dragover'));
  logoDropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    logoDropzone.classList.remove('dragover');
    if (e.dataTransfer.files?.[0]) {
      handleLogoFile(e.dataTransfer.files[0]);
    }
  });
  fileLogoUpload.addEventListener('change', (e) => {
    if (e.target.files?.[0]) {
      handleLogoFile(e.target.files[0]);
    }
  });

  btnRemoveLogo.addEventListener('click', () => {
    logoImageObj = null;
    logoDataUrl = null;
    customization.logoDataUrl = null;
    logoDropzoneContent.hidden = false;
    logoPreviewWrap.hidden = true;
    logoControlsPanel.hidden = true;
    btnRemoveLogo.hidden = true;
    fileLogoUpload.value = '';
    updateAndRender();
  });

  rangeLogoSize.addEventListener('input', (e) => {
    const val = parseInt(e.target.value, 10);
    customization.logoSizePercent = val;
    lblLogoSize.textContent = `${val}%`;
    updateAndRender();
  });

  selectLogoShape.addEventListener('change', (e) => {
    customization.logoShape = e.target.value;
    updateAndRender();
  });

  // Parameters
  selectEcLevel.addEventListener('change', (e) => {
    customization.ecLevel = e.target.value;
    updateAndRender();
  });
  rangeMargin.addEventListener('input', (e) => {
    const val = parseInt(e.target.value, 10);
    customization.margin = val;
    lblMarginVal.textContent = val;
    updateAndRender();
  });

  // Reset to default
  btnResetStyles.addEventListener('click', () => {
    applyPreset({ ...DEFAULT_CUSTOMIZATION, name: 'Default' });
  });
}

/**
 * Handles uploaded logo image
 */
function handleLogoFile(file) {
  if (!file.type.startsWith('image/')) {
    alert('Please upload a valid image file (PNG, JPEG, WebP).');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const dataUrl = e.target.result;
    const img = new Image();
    img.onload = () => {
      logoImageObj = img;
      logoDataUrl = dataUrl;
      customization.logoDataUrl = dataUrl;

      // When logo is uploaded, automatically elevate Error Correction to 'H'
      customization.ecLevel = 'H';
      selectEcLevel.value = 'H';

      // Update UI
      imgLogoThumb.src = dataUrl;
      logoFileName.textContent = file.name;
      logoDropzoneContent.hidden = true;
      logoPreviewWrap.hidden = false;
      logoControlsPanel.hidden = false;
      btnRemoveLogo.hidden = false;

      updateAndRender();
    };
    img.src = dataUrl;
  };
  reader.readAsDataURL(file);
}

/**
 * Binds download & copy action buttons
 */
function bindActions() {
  btnDownloadPng.addEventListener('click', async () => {
    if (!currentPayload) return;
    const targetSize = parseInt(selectExportSize.value, 10) || 512;
    try {
      const filename = await downloadPng(currentPayload, {
        ...customization,
        type: activeType,
        title: currentTitle,
        size: targetSize
      }, logoImageObj, targetSize);
      showButtonSuccess(btnDownloadPng, `✓ Downloaded ${filename}`);
    } catch (err) {
      console.error('Download PNG failed:', err);
      alert('Failed to download PNG.');
    }
  });

  btnDownloadSvg.addEventListener('click', () => {
    if (!currentPayload) return;
    const targetSize = parseInt(selectExportSize.value, 10) || 512;
    try {
      const filename = downloadSvg(currentPayload, {
        ...customization,
        type: activeType,
        title: currentTitle,
        size: targetSize
      }, logoDataUrl);
      showButtonSuccess(btnDownloadSvg, `✓ Saved SVG`);
    } catch (err) {
      console.error('Download SVG failed:', err);
      alert('Failed to download SVG.');
    }
  });

  btnDownloadJpeg.addEventListener('click', async () => {
    if (!currentPayload) return;
    const targetSize = parseInt(selectExportSize.value, 10) || 512;
    try {
      await downloadJpeg(currentPayload, {
        ...customization,
        type: activeType,
        title: currentTitle,
        size: targetSize
      }, logoImageObj, targetSize);
      showButtonSuccess(btnDownloadJpeg, `✓ Saved JPEG`);
    } catch (err) {
      console.error('Download JPEG failed:', err);
      alert('Failed to download JPEG.');
    }
  });

  btnCopyImage.addEventListener('click', async () => {
    if (!currentPayload) return;
    try {
      await copyQrImageToClipboard(qrCanvas);
      showButtonSuccess(btnCopyImage, '✓ Image Copied!');
    } catch (err) {
      alert('Failed to copy image to clipboard: ' + err.message);
    }
  });

  btnCopyPayload.addEventListener('click', async () => {
    if (!currentPayload) return;
    try {
      await copyTextToClipboard(currentPayload);
      showButtonSuccess(btnCopyPayload, '✓ Text Copied!');
    } catch (err) {
      alert('Failed to copy payload text.');
    }
  });
}

function showButtonSuccess(btn, text) {
  const original = btn.innerHTML;
  btn.textContent = text;
  setTimeout(() => {
    btn.innerHTML = original;
  }, 1800);
}

// Start on DOM ready
document.addEventListener('DOMContentLoaded', initGenerator);
