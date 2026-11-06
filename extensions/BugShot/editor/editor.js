/**
 * BugShot - Annotation Editor Controller
 * Connects Canvas AnnotationEngine with HistoryManager, handles tool selection,
 * pan/zoom coordinate normalization, keyboard accelerators, and report routing.
 */

import { AnnotationEngine } from './annotation-engine.js';
import { HistoryManager } from './history-manager.js';
import { getActiveSession, saveActiveSession } from '../scripts/storage.js';

let currentSession = null;
let engine = null;
let history = null;
let currentZoom = 1.0;

// DOM Elements
const canvasBg = document.getElementById('canvas-bg');
const canvasOverlay = document.getElementById('canvas-overlay');
const canvasViewport = document.getElementById('canvas-viewport');
const canvasStage = document.getElementById('canvas-stage');
const sessionTypeBadge = document.getElementById('session-type-badge');
const zoomLevelText = document.getElementById('zoom-level-text');

const btnZoomIn = document.getElementById('btn-zoom-in');
const btnZoomOut = document.getElementById('btn-zoom-out');
const btnZoomFit = document.getElementById('btn-zoom-fit');
const btnZoomReset = document.getElementById('btn-zoom-reset');

const btnUndo = document.getElementById('btn-undo');
const btnRedo = document.getElementById('btn-redo');
const btnClear = document.getElementById('btn-clear');
const btnDownloadPng = document.getElementById('btn-download-png');
const btnCreateReport = document.getElementById('btn-create-report');

const toolBtns = document.querySelectorAll('.tool-btn');
const colorSwatches = document.querySelectorAll('.color-swatch');
const strokeBtns = document.querySelectorAll('.stroke-btn');
const sizeBtns = document.querySelectorAll('.size-btn');

/**
 * Initializes Editor Workspace
 */
async function initEditor() {
  engine = new AnnotationEngine(canvasBg, canvasOverlay);
  history = new HistoryManager(30);

  // History sync listener
  history.setOnChange(({ canUndo, canRedo }) => {
    btnUndo.disabled = !canUndo;
    btnRedo.disabled = !canRedo;
  });

  // Load active session from storage
  currentSession = await getActiveSession();

  if (currentSession && currentSession.rawScreenshot) {
    if (currentSession.captureType) {
      sessionTypeBadge.textContent = `${currentSession.captureType.toUpperCase()} CAPTURE`;
    }
    await engine.loadBaseImage(currentSession.rawScreenshot);
  } else {
    // Generate clean canvas placeholder if opened standalone
    createStandalonePlaceholder();
  }

  // Push initial empty canvas state
  history.push(engine.getShapes());

  setupCanvasInteractions();
  setupToolbarControls();
  setupZoomControls();
  setupKeyboardShortcuts();
  fitToScreen();
}

/**
 * Fallback placeholder when editor is launched directly
 */
function createStandalonePlaceholder() {
  const dummyCanvas = document.createElement('canvas');
  dummyCanvas.width = 1200;
  dummyCanvas.height = 750;
  const ctx = dummyCanvas.getContext('2d');

  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, 1200, 750);
  ctx.fillStyle = '#64748b';
  ctx.font = '24px -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('No active capture session found. Standalone Drawing Mode.', 600, 375);

  sessionTypeBadge.textContent = 'STANDALONE MODE';
  engine.loadBaseImage(dummyCanvas.toDataURL('image/png'));
}

/**
 * Normalizes client coordinates to native canvas pixels accounting for zoom & DPR
 */
function getCanvasCoordinates(e) {
  const rect = canvasOverlay.getBoundingClientRect();
  const scaleX = canvasOverlay.width / rect.width;
  const scaleY = canvasOverlay.height / rect.height;

  return {
    x: Math.round((e.clientX - rect.left) * scaleX),
    y: Math.round((e.clientY - rect.top) * scaleY)
  };
}

/**
 * Canvas drawing mouse & pointer handlers
 */
function setupCanvasInteractions() {
  canvasOverlay.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    const { x, y } = getCanvasCoordinates(e);
    engine.handlePointerDown(x, y);

    // If text tool was clicked, handle immediate history save
    if (engine.activeTool === 'text') {
      history.push(engine.getShapes());
    }
  });

  window.addEventListener('mousemove', (e) => {
    if (!engine.isDrawing) return;
    const { x, y } = getCanvasCoordinates(e);
    engine.handlePointerMove(x, y);
  });

  window.addEventListener('mouseup', () => {
    if (engine.isDrawing) {
      const updatedShapes = engine.handlePointerUp();
      if (updatedShapes) {
        history.push(updatedShapes);
      }
    }
  });
}

/**
 * Binds Tool, Color, Stroke, and Text Size controls
 */
function setupToolbarControls() {
  // Tools
  toolBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      toolBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const tool = btn.getAttribute('data-tool');
      engine.setTool(tool);
    });
  });

  // Colors
  colorSwatches.forEach(swatch => {
    swatch.addEventListener('click', () => {
      colorSwatches.forEach(s => s.classList.remove('active'));
      swatch.classList.add('active');
      const color = swatch.getAttribute('data-color');
      engine.setColor(color);
    });
  });

  // Stroke Widths
  strokeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      strokeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const stroke = parseInt(btn.getAttribute('data-stroke'), 10);
      engine.setStrokeWidth(stroke);
    });
  });

  // Text Sizes
  sizeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      sizeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const size = parseInt(btn.getAttribute('data-size'), 10);
      engine.setFontSize(size);
    });
  });

  // Undo / Redo / Clear
  btnUndo.addEventListener('click', () => {
    const prevState = history.undo();
    if (prevState !== null) {
      engine.setShapes(prevState);
    }
  });

  btnRedo.addEventListener('click', () => {
    const nextState = history.redo();
    if (nextState !== null) {
      engine.setShapes(nextState);
    }
  });

  btnClear.addEventListener('click', () => {
    if (confirm('Clear all annotations?')) {
      engine.clear();
      history.push(engine.getShapes());
    }
  });

  // Download PNG
  btnDownloadPng.addEventListener('click', () => {
    const dataUrl = engine.exportToDataUrl();
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `bugshot-annotated-${Date.now()}.png`;
    a.click();
  });

  // Continue to Bug Report
  btnCreateReport.addEventListener('click', async () => {
    btnCreateReport.disabled = true;
    btnCreateReport.querySelector('span').textContent = 'Preparing Report...';

    try {
      const annotatedDataUrl = engine.exportToDataUrl();

      if (currentSession) {
        currentSession.annotatedScreenshot = annotatedDataUrl;
        currentSession.annotations = engine.getShapes();
        await saveActiveSession(currentSession);
      }

      // Open Report Page
      const reportUrl = chrome.runtime.getURL('report/report.html');
      await chrome.tabs.create({ url: reportUrl });
    } catch (err) {
      console.error('[BugShot Editor] Error creating report:', err);
      // Attempt safe transition even if full local storage save reported warning
      const reportUrl = chrome.runtime.getURL('report/report.html');
      await chrome.tabs.create({ url: reportUrl });
    } finally {
      btnCreateReport.disabled = false;
      btnCreateReport.querySelector('span').textContent = 'Continue to Bug Report';
    }
  });
}

/**
 * Zoom and scale management
 */
function setupZoomControls() {
  btnZoomIn.addEventListener('click', () => setZoom(currentZoom + 0.15));
  btnZoomOut.addEventListener('click', () => setZoom(currentZoom - 0.15));
  btnZoomReset.addEventListener('click', () => setZoom(1.0));
  btnZoomFit.addEventListener('click', fitToScreen);
}

function setZoom(newZoom) {
  currentZoom = Math.max(0.2, Math.min(3.0, newZoom));
  canvasViewport.style.transform = `scale(${currentZoom})`;
  zoomLevelText.textContent = `${Math.round(currentZoom * 100)}%`;
}

function fitToScreen() {
  if (!engine.width || !engine.height) return;

  const stageW = canvasStage.clientWidth - 80;
  const stageH = canvasStage.clientHeight - 80;

  const scaleX = stageW / engine.width;
  const scaleY = stageH / engine.height;
  const optimalScale = Math.min(1.0, Math.min(scaleX, scaleY));

  setZoom(optimalScale);
}

/**
 * Hotkey accelerators
 */
function setupKeyboardShortcuts() {
  window.addEventListener('keydown', (e) => {
    // Ignore keys if typing in prompt
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    // Undo / Redo
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey) {
        btnRedo.click();
      } else {
        btnUndo.click();
      }
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
      e.preventDefault();
      btnRedo.click();
      return;
    }

    // Quick Tool Selection
    const key = e.key.toLowerCase();
    switch (key) {
      case 'a': document.getElementById('tool-arrow').click(); break;
      case 'r': document.getElementById('tool-rectangle').click(); break;
      case 'c': document.getElementById('tool-circle').click(); break;
      case 'p': document.getElementById('tool-brush').click(); break;
      case 't': document.getElementById('tool-text').click(); break;
      case 'h': document.getElementById('tool-highlight').click(); break;
      case 'b': document.getElementById('tool-blur').click(); break;
      case '0': fitToScreen(); break;
      case '1': setZoom(1.0); break;
    }
  });
}

document.addEventListener('DOMContentLoaded', initEditor);
