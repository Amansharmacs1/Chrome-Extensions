/**
 * BugShot - Screenshot Capture Orchestrator
 * Interfaces with Chrome Extension APIs to execute Viewport,
 * Region, and Full-Page captures and boots the annotation editor.
 */

import { isCapturableUrl, getUrlRestrictionReason } from './permissions.js';
import { collectTechnicalMetadata } from './metadata.js';
import { saveActiveSession } from './storage.js';
import { cropRegionFromImage, calculateStitchPlan, stitchSlicesToDataUrl } from './screenshot-stitcher.js';

/**
 * Initiates a visible viewport capture of the specified tab
 * @param {chrome.tabs.Tab} tab
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function captureViewport(tab) {
  if (!tab || !tab.id || !tab.url) {
    return { success: false, error: 'No active tab available for capture.' };
  }

  if (!isCapturableUrl(tab.url)) {
    return { success: false, error: getUrlRestrictionReason(tab.url) };
  }

  try {
    // Capture visible tab directly via Chrome API
    const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' });

    // Collect technical metadata from tab
    let meta = null;
    let consoleLogs = [];
    let networkInsights = [];

    try {
      const pageInfo = await chrome.tabs.sendMessage(tab.id, { action: 'COLLECT_PAGE_DIAGNOSTICS' });
      if (pageInfo) {
        meta = pageInfo.metadata;
        consoleLogs = pageInfo.consoleLogs || [];
        networkInsights = pageInfo.networkInsights || [];
      }
    } catch {
      // Content script might not be injected or ready, construct fallback metadata
      meta = {
        url: tab.url,
        title: tab.title || '',
        timestamp: Date.now(),
        browserName: 'Google Chrome',
        browserVersion: '',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        os: 'Desktop',
        platform: 'MacIntel',
        viewportWidth: tab.width || 1280,
        viewportHeight: tab.height || 800,
        devicePixelRatio: 1,
        screenWidth: tab.width || 1280,
        screenHeight: tab.height || 800,
        colorDepth: 24,
        language: 'en',
        online: true
      };
    }

    const session = {
      sessionId: `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      targetTabId: tab.id,
      targetUrl: tab.url,
      captureType: 'viewport',
      timestamp: Date.now(),
      rawScreenshot: dataUrl,
      metadata: meta,
      consoleLogs,
      networkInsights
    };

    await saveActiveSession(session);

    // Open Annotation Editor
    const editorUrl = chrome.runtime.getURL(`editor/editor.html?session=${session.sessionId}`);
    await chrome.tabs.create({ url: editorUrl });

    return { success: true };
  } catch (err) {
    console.error('[BugShot] Viewport capture failed:', err);
    return { success: false, error: err.message || 'Visible viewport capture failed.' };
  }
}

/**
 * Initiates an interactive on-page region selection capture
 * @param {chrome.tabs.Tab} tab
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function captureRegion(tab) {
  if (!tab || !tab.id || !tab.url) {
    return { success: false, error: 'No active tab available for capture.' };
  }

  if (!isCapturableUrl(tab.url)) {
    return { success: false, error: getUrlRestrictionReason(tab.url) };
  }

  try {
    // Ensure content script is active and signal it to launch the selection overlay
    await chrome.tabs.sendMessage(tab.id, { action: 'START_REGION_SELECTION' });
    return { success: true };
  } catch (err) {
    return { success: false, error: 'Could not activate selection overlay on page. Please refresh the page and try again.' };
  }
}

/**
 * Finalizes region capture after user finishes dragging selection box
 * @param {chrome.tabs.Tab} tab
 * @param {{ x: number, y: number, width: number, height: number, dpr: number }} region
 * @param {Object} diagnostics
 */
export async function finalizeRegionCapture(tab, region, diagnostics = {}) {
  const fullDataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' });
  const croppedDataUrl = await cropRegionFromImage(fullDataUrl, region, region.dpr || 1);

  const session = {
    sessionId: `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    targetTabId: tab.id,
    targetUrl: tab.url,
    captureType: 'region',
    timestamp: Date.now(),
    rawScreenshot: croppedDataUrl,
    metadata: diagnostics.metadata || {
      url: tab.url,
      title: tab.title || '',
      timestamp: Date.now(),
      browserName: 'Google Chrome',
      browserVersion: '',
      userAgent: '',
      os: 'Desktop',
      platform: '',
      viewportWidth: Math.round(region.width),
      viewportHeight: Math.round(region.height),
      devicePixelRatio: region.dpr || 1,
      screenWidth: 0,
      screenHeight: 0,
      colorDepth: 24,
      language: 'en',
      online: true
    },
    consoleLogs: diagnostics.consoleLogs || [],
    networkInsights: diagnostics.networkInsights || []
  };

  await saveActiveSession(session);

  const editorUrl = chrome.runtime.getURL(`editor/editor.html?session=${session.sessionId}`);
  await chrome.tabs.create({ url: editorUrl });
}

/**
 * Executes a full-page scroll-and-stitch capture
 * @param {chrome.tabs.Tab} tab
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function captureFullPage(tab) {
  if (!tab || !tab.id || !tab.url) {
    return { success: false, error: 'No active tab available for capture.' };
  }

  if (!isCapturableUrl(tab.url)) {
    return { success: false, error: getUrlRestrictionReason(tab.url) };
  }

  try {
    // 1. Ask content script for stitch plan
    const prepResponse = await chrome.tabs.sendMessage(tab.id, { action: 'PREPARE_FULL_PAGE_CAPTURE' });
    if (!prepResponse || !prepResponse.plan) {
      throw new Error('Webpage dimensions could not be calculated for full-page capture.');
    }

    const { plan, originalScroll, diagnostics } = prepResponse;
    const capturedSlices = [];

    // 2. Iterate slices, scrolling and capturing each viewport
    for (const slice of plan.slices) {
      // Scroll tab to slice Y
      await chrome.tabs.sendMessage(tab.id, { action: 'SCROLL_TO_Y', y: slice.y });
      // Brief delay for rendering & sticky reflows
      await new Promise(r => setTimeout(r, 180));

      const sliceDataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' });
      capturedSlices.push({
        dataUrl: sliceDataUrl,
        slice
      });
    }

    // 3. Restore original scroll position
    await chrome.tabs.sendMessage(tab.id, { action: 'RESTORE_SCROLL', scroll: originalScroll });

    // 4. Stitch slices together
    const stitchedDataUrl = await stitchSlicesToDataUrl(capturedSlices, plan);

    const session = {
      sessionId: `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      targetTabId: tab.id,
      targetUrl: tab.url,
      captureType: 'full-page',
      timestamp: Date.now(),
      rawScreenshot: stitchedDataUrl,
      metadata: diagnostics?.metadata || {
        url: tab.url,
        title: tab.title || '',
        timestamp: Date.now(),
        browserName: 'Google Chrome',
        browserVersion: '',
        userAgent: '',
        os: 'Desktop',
        platform: '',
        viewportWidth: plan.viewportWidth,
        viewportHeight: plan.viewportHeight,
        devicePixelRatio: plan.dpr,
        screenWidth: 0,
        screenHeight: 0,
        colorDepth: 24,
        language: 'en',
        online: true
      },
      consoleLogs: diagnostics?.consoleLogs || [],
      networkInsights: diagnostics?.networkInsights || []
    };

    await saveActiveSession(session);

    const editorUrl = chrome.runtime.getURL(`editor/editor.html?session=${session.sessionId}`);
    await chrome.tabs.create({ url: editorUrl });

    return { success: true };
  } catch (err) {
    console.error('[BugShot] Full page capture failed:', err);
    return { success: false, error: err.message || 'Full page capture failed.' };
  }
}
