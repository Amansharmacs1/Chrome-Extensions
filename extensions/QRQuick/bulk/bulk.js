/**
 * QRQuick - Bulk Batch Generator Controller
 * Manages CSV parsing, non-blocking queue processing,
 * individual downloads, and PKZIP archive generation.
 */

import { parseBulkInput } from './csv-parser.js';
import { renderQRToCanvas, generateQRSvg } from '../generator/qr-engine.js';
import { SimpleZip } from '../lib/simple-zip.js';
import { triggerFileDownload, sanitizeSlug } from '../services/export-service.js';
import { getPresets } from '../services/storage-service.js';

// DOM elements
const tabPasteText = document.getElementById('tabPasteText');
const tabUploadCsv = document.getElementById('tabUploadCsv');
const viewPasteText = document.getElementById('viewPasteText');
const viewUploadCsv = document.getElementById('viewUploadCsv');
const bulkTextArea = document.getElementById('bulkTextArea');
const btnParseText = document.getElementById('btnParseText');
const btnClearInput = document.getElementById('btnClearInput');

const csvDropzone = document.getElementById('csvDropzone');
const fileCsvInput = document.getElementById('fileCsvInput');
const csvFileInfo = document.getElementById('csvFileInfo');
const csvFileName = document.getElementById('csvFileName');
const btnRemoveCsv = document.getElementById('btnRemoveCsv');

const selectBulkPreset = document.getElementById('selectBulkPreset');
const selectBulkFormat = document.getElementById('selectBulkFormat');
const selectBulkSize = document.getElementById('selectBulkSize');
const selectBulkEc = document.getElementById('selectBulkEc');

const batchProgressCard = document.getElementById('batchProgressCard');
const progressStatusText = document.getElementById('progressStatusText');
const progressPctText = document.getElementById('progressPctText');
const progressBarFill = document.getElementById('progressBarFill');

const queueCounter = document.getElementById('queueCounter');
const checkSelectAll = document.getElementById('checkSelectAll');
const btnRemoveInvalid = document.getElementById('btnRemoveInvalid');
const btnStartBatch = document.getElementById('btnStartBatch');
const btnDownloadZip = document.getElementById('btnDownloadZip');
const tableBody = document.getElementById('tableBody');

// State
let queueItems = [];
let isGenerating = false;
let presetsMap = new Map();

/**
 * Initializes the bulk workspace
 */
async function initBulk() {
  await loadPresetOptions();
  bindInputTabs();
  bindParsingActions();
  bindCsvDropzone();
  bindTableActions();
  bindBatchExecution();
}

/**
 * Loads available presets into dropdown
 */
async function loadPresetOptions() {
  const presets = await getPresets();
  selectBulkPreset.innerHTML = '';
  for (const p of presets) {
    presetsMap.set(p.id, p);
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.name;
    selectBulkPreset.appendChild(opt);
  }
}

/**
 * Binds tabs (Paste vs CSV)
 */
function bindInputTabs() {
  tabPasteText.addEventListener('click', () => {
    tabPasteText.classList.add('active');
    tabUploadCsv.classList.remove('active');
    viewPasteText.classList.add('active');
    viewUploadCsv.classList.remove('active');
  });

  tabUploadCsv.addEventListener('click', () => {
    tabUploadCsv.classList.add('active');
    tabPasteText.classList.remove('active');
    viewUploadCsv.classList.add('active');
    viewPasteText.classList.remove('active');
  });
}

/**
 * Binds parsing buttons
 */
function bindParsingActions() {
  btnParseText.addEventListener('click', () => {
    const text = bulkTextArea.value.trim();
    if (!text) {
      alert('Please enter or paste at least one line of content.');
      return;
    }
    const res = parseBulkInput(text, 'text');
    loadQueue(res.items);
  });

  btnClearInput.addEventListener('click', () => {
    bulkTextArea.value = '';
    clearQueue();
  });
}

/**
 * Binds CSV dropzone and file input
 */
function bindCsvDropzone() {
  csvDropzone.addEventListener('click', () => fileCsvInput.click());

  csvDropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    csvDropzone.classList.add('dragover');
  });

  csvDropzone.addEventListener('dragleave', () => {
    csvDropzone.classList.remove('dragover');
  });

  csvDropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    csvDropzone.classList.remove('dragover');
    if (e.dataTransfer.files?.[0]) {
      handleCsvFile(e.dataTransfer.files[0]);
    }
  });

  fileCsvInput.addEventListener('change', (e) => {
    if (e.target.files?.[0]) {
      handleCsvFile(e.target.files[0]);
    }
  });

  btnRemoveCsv.addEventListener('click', () => {
    csvFileInfo.hidden = true;
    csvDropzone.hidden = false;
    fileCsvInput.value = '';
    clearQueue();
  });
}

/**
 * Reads CSV file and populates queue
 */
function handleCsvFile(file) {
  if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
    alert('Please upload a valid .csv file.');
    return;
  }

  csvFileName.textContent = file.name;
  csvFileInfo.hidden = false;
  csvDropzone.hidden = true;

  const reader = new FileReader();
  reader.onload = (e) => {
    const content = e.target.result;
    const res = parseBulkInput(content, 'csv');
    loadQueue(res.items);
  };
  reader.readAsText(file);
}

/**
 * Loads parsed items into queue state and renders table
 */
function loadQueue(items) {
  queueItems = items.map((item, idx) => ({
    ...item,
    index: idx + 1,
    isSelected: item.isValid,
    isGenerated: false,
    outputBlob: null,
    outputSvg: null,
    generatedFilename: null
  }));

  renderTable();
}

/**
 * Clears queue state
 */
function clearQueue() {
  queueItems = [];
  renderTable();
}

/**
 * Renders batch table rows
 */
function renderTable() {
  const total = queueItems.length;
  const validCount = queueItems.filter(i => i.isValid).length;
  const invalidCount = total - validCount;
  const selectedCount = queueItems.filter(i => i.isSelected).length;

  queueCounter.textContent = `${total} items (${selectedCount} selected)`;
  btnRemoveInvalid.hidden = invalidCount === 0;
  btnStartBatch.disabled = selectedCount === 0 || isGenerating;

  if (total === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="7" class="empty-table-msg">
          No records loaded. Paste a list of items or upload a CSV above to begin.
        </td>
      </tr>
    `;
    btnDownloadZip.hidden = true;
    return;
  }

  tableBody.innerHTML = '';

  for (const item of queueItems) {
    const tr = document.createElement('tr');

    let statusChip = '';
    if (!item.isValid) {
      statusChip = `<span class="status-chip invalid" title="${item.error || 'Invalid'}">Error ⚠</span>`;
    } else if (item.isGenerated) {
      statusChip = `<span class="status-chip generated">Generated ✓</span>`;
    } else {
      statusChip = `<span class="status-chip ready">Ready</span>`;
    }

    tr.innerHTML = `
      <td><input type="checkbox" class="row-checkbox" data-id="${item.id}" ${item.isSelected ? 'checked' : ''} ${!item.isValid ? 'disabled' : ''}></td>
      <td>${item.index}</td>
      <td><strong>${escapeHtml(item.label)}</strong></td>
      <td class="content-cell" title="${escapeHtml(item.content)}">${escapeHtml(item.content)}</td>
      <td><span style="text-transform: uppercase; font-size: 10px; color: var(--text-muted);">${item.type}</span></td>
      <td>${statusChip}</td>
      <td>
        ${item.isGenerated ? `<button class="table-btn btn-dl-row" data-id="${item.id}">Download</button>` : ''}
        <button class="table-btn danger btn-del-row" data-id="${item.id}">✕</button>
      </td>
    `;

    tableBody.appendChild(tr);
  }
}

/**
 * Binds table interactions (checkboxes, individual downloads, delete)
 */
function bindTableActions() {
  // Select All toggle
  checkSelectAll.addEventListener('change', (e) => {
    const checked = e.target.checked;
    for (const item of queueItems) {
      if (item.isValid) {
        item.isSelected = checked;
      }
    }
    renderTable();
  });

  // Table row clicks
  tableBody.addEventListener('click', (e) => {
    const checkbox = e.target.closest('.row-checkbox');
    if (checkbox) {
      const id = checkbox.dataset.id;
      const item = queueItems.find(i => i.id === id);
      if (item) {
        item.isSelected = checkbox.checked;
        const selectedCount = queueItems.filter(i => i.isSelected).length;
        btnStartBatch.disabled = selectedCount === 0 || isGenerating;
        queueCounter.textContent = `${queueItems.length} items (${selectedCount} selected)`;
      }
      return;
    }

    // Individual download
    const dlBtn = e.target.closest('.btn-dl-row');
    if (dlBtn) {
      const id = dlBtn.dataset.id;
      const item = queueItems.find(i => i.id === id);
      if (item && item.isGenerated) {
        if (item.outputBlob) {
          triggerFileDownload(item.outputBlob, item.generatedFilename);
        } else if (item.outputSvg) {
          const blob = new Blob([item.outputSvg], { type: 'image/svg+xml;charset=utf-8' });
          triggerFileDownload(blob, item.generatedFilename);
        }
      }
      return;
    }

    // Delete row
    const delBtn = e.target.closest('.btn-del-row');
    if (delBtn) {
      const id = delBtn.dataset.id;
      queueItems = queueItems.filter(i => i.id !== id);
      renderTable();
      return;
    }
  });

  // Remove invalid rows
  btnRemoveInvalid.addEventListener('click', () => {
    queueItems = queueItems.filter(i => i.isValid);
    renderTable();
  });
}

/**
 * Binds batch generation and ZIP download
 */
function bindBatchExecution() {
  btnStartBatch.addEventListener('click', async () => {
    const selected = queueItems.filter(i => i.isSelected && i.isValid);
    if (selected.length === 0) return;

    isGenerating = true;
    btnStartBatch.disabled = true;
    batchProgressCard.hidden = false;
    btnDownloadZip.hidden = true;

    const presetId = selectBulkPreset.value;
    const format = selectBulkFormat.value; // 'png' | 'svg'
    const size = parseInt(selectBulkSize.value, 10) || 512;
    const ecLevel = selectBulkEc.value || 'M';

    const preset = presetsMap.get(presetId) || {};
    const options = {
      ...preset,
      size,
      ecLevel
    };

    const offscreenCanvas = document.createElement('canvas');

    let completed = 0;
    const total = selected.length;

    for (const item of selected) {
      progressStatusText.textContent = `Generating item ${completed + 1} of ${total}: "${item.label}"`;
      const pct = Math.round((completed / total) * 100);
      progressPctText.textContent = `${pct}%`;
      progressBarFill.style.width = `${pct}%`;

      try {
        const slug = sanitizeSlug(item.label || item.content);
        const padIndex = String(item.index).padStart(3, '0');
        const filename = `qr_${padIndex}_${slug}.${format}`;

        if (format === 'svg') {
          const svgString = generateQRSvg(item.content, options);
          item.outputSvg = svgString;
          item.generatedFilename = filename;
          item.isGenerated = true;
        } else {
          await renderQRToCanvas(offscreenCanvas, item.content, options);
          const blob = await new Promise(res => offscreenCanvas.toBlob(res, 'image/png'));
          item.outputBlob = blob;
          item.generatedFilename = filename;
          item.isGenerated = true;
        }
      } catch (err) {
        console.warn(`Failed to generate item ${item.index}:`, err);
        item.isGenerated = false;
      }

      completed++;

      // Yield event loop every iteration so UI never stutters
      await new Promise(r => setTimeout(r, 12));
    }

    // Finalize progress
    progressPctText.textContent = '100%';
    progressBarFill.style.width = '100%';
    progressStatusText.textContent = `Batch complete! Generated ${completed} QR codes.`;

    isGenerating = false;
    btnStartBatch.disabled = false;
    btnDownloadZip.hidden = false;

    renderTable();
  });

  // Download all as ZIP
  btnDownloadZip.addEventListener('click', async () => {
    const generated = queueItems.filter(i => i.isGenerated);
    if (generated.length === 0) return;

    btnDownloadZip.disabled = true;
    btnDownloadZip.textContent = 'Building ZIP Archive...';

    try {
      const zip = new SimpleZip();

      for (const item of generated) {
        if (item.outputBlob) {
          const arrayBuffer = await item.outputBlob.arrayBuffer();
          zip.addFile(item.generatedFilename, new Uint8Array(arrayBuffer));
        } else if (item.outputSvg) {
          zip.addFile(item.generatedFilename, item.outputSvg);
        }
      }

      const zipBytes = zip.generate();
      const zipBlob = new Blob([zipBytes], { type: 'application/zip' });
      const nowStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const zipFilename = `qrquick_batch_${nowStr}.zip`;

      triggerFileDownload(zipBlob, zipFilename);
      btnDownloadZip.textContent = '✓ ZIP Downloaded';
      setTimeout(() => {
        btnDownloadZip.disabled = false;
        btnDownloadZip.textContent = 'Download ZIP Archive';
      }, 2000);
    } catch (err) {
      console.error('ZIP creation failed:', err);
      alert('Failed to generate ZIP file.');
      btnDownloadZip.disabled = false;
      btnDownloadZip.textContent = 'Download ZIP Archive';
    }
  });
}

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Start on DOM ready
document.addEventListener('DOMContentLoaded', initBulk);
