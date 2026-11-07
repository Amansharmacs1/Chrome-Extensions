/**
 * FontLens - In-Page Typography Inspector Controller
 * Listens for mouse hover and clicks, intercepts page events safely,
 * coordinates the Shadow DOM inspector panel, and manages live editing sessions.
 */

import { extractTypography } from '../scripts/typography-engine.js';
import { analyzeFontEvidence } from '../scripts/font-detection.js';
import { StyleManager } from './style-manager.js';
import { InspectorPanel } from './inspector-panel.js';
import { addRecentFont } from '../scripts/storage.js';

(function () {
  if (window.__FONTLENS_INSPECTOR_INITIALIZED__) {
    // If already injected, toggle inspection state directly
    if (window.__FONTLENS_INSPECTOR_INSTANCE__) {
      window.__FONTLENS_INSPECTOR_INSTANCE__.toggle();
    }
    return;
  }
  window.__FONTLENS_INSPECTOR_INITIALIZED__ = true;

  class FontLensInspector {
    constructor() {
      this.isActive = false;
      this.isPinned = false;
      this.hoveredElement = null;
      this.selectedElement = null;

      this.styleManager = new StyleManager();
      this.panel = null;

      this.boundOnPointerMove = this.onPointerMove.bind(this);
      this.boundOnClick = this.onClick.bind(this);
      this.boundOnKeyDown = this.onKeyDown.bind(this);
      this.boundOnScroll = this.onScroll.bind(this);

      this.initMessaging();
    }

    initMessaging() {
      if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
          if (!message || !message.action) return false;

          switch (message.action) {
            case 'TOGGLE_INSPECTION':
              this.toggle();
              sendResponse({ active: this.isActive });
              return true;

            case 'START_INSPECTION':
              this.activate();
              sendResponse({ active: true });
              return true;

            case 'STOP_INSPECTION':
              this.deactivate();
              sendResponse({ active: false });
              return true;

            case 'GET_INSPECTOR_STATUS':
              sendResponse({
                active: this.isActive,
                pinned: this.isPinned,
                hasSelected: Boolean(this.selectedElement)
              });
              return true;
          }
        });
      }
    }

    toggle() {
      if (this.isActive) {
        this.deactivate();
      } else {
        this.activate();
      }
    }

    activate() {
      if (this.isActive) return;
      this.isActive = true;

      // Instantiate floating panel
      this.panel = new InspectorPanel({
        styleManager: this.styleManager,
        onClose: () => this.deactivate(),
        onTogglePin: (pinned) => {
          this.isPinned = pinned;
        }
      });

      this.panel.onRefreshElement = (el) => {
        this.inspectElement(el);
      };

      // Add DOM event listeners
      document.addEventListener('mousemove', this.boundOnPointerMove, true);
      document.addEventListener('click', this.boundOnClick, true);
      document.addEventListener('keydown', this.boundOnKeyDown, true);
      window.addEventListener('scroll', this.boundOnScroll, { passive: true });

      // Notify background / popup of state
      this.broadcastState(true);
    }

    deactivate() {
      if (!this.isActive) return;
      this.isActive = false;
      this.isPinned = false;

      // Reset live modifications on elements
      this.styleManager.resetAll();

      // Remove DOM listeners
      document.removeEventListener('mousemove', this.boundOnPointerMove, true);
      document.removeEventListener('click', this.boundOnClick, true);
      document.removeEventListener('keydown', this.boundOnKeyDown, true);
      window.removeEventListener('scroll', this.boundOnScroll);

      // Clean up panel
      if (this.panel) {
        this.panel.destroy();
        this.panel = null;
      }

      this.hoveredElement = null;
      this.selectedElement = null;

      this.broadcastState(false);
    }

    onPointerMove(e) {
      if (!this.isActive || this.isPinned) return;

      const target = this.getInspectableTarget(e.target);
      if (!target || target === this.hoveredElement) return;

      this.hoveredElement = target;
      this.inspectElement(target);
    }

    onClick(e) {
      if (!this.isActive) return;

      // Allow interactions with the inspector panel itself
      if (e.target.closest('#fontlens-inspector-host')) {
        return;
      }

      // Intercept and prevent navigation on the inspected element
      e.preventDefault();
      e.stopPropagation();

      const target = this.getInspectableTarget(e.target);
      if (!target) return;

      this.selectedElement = target;
      this.isPinned = true;
      if (this.panel) {
        this.panel.isPinned = true;
        const btnPin = this.panel.shadowRoot?.getElementById('btnPin');
        if (btnPin) btnPin.classList.add('active');
      }

      this.inspectElement(target);
    }

    onKeyDown(e) {
      if (!this.isActive) return;

      if (e.key === 'Escape') {
        if (this.isPinned) {
          // Unpin element first
          this.isPinned = false;
          if (this.panel) {
            this.panel.isPinned = false;
            const btnPin = this.panel.shadowRoot?.getElementById('btnPin');
            if (btnPin) btnPin.classList.remove('active');
            this.panel.pinnedOutlineEl.style.display = 'none';
          }
        } else {
          // Exit inspection mode
          this.deactivate();
        }
      }
    }

    onScroll() {
      if (this.panel && (this.selectedElement || this.hoveredElement)) {
        const el = this.selectedElement || this.hoveredElement;
        const typo = extractTypography(el);
        if (typo) {
          this.panel.updateHighlight(el, typo.typography.primaryFamily, typo.typography.fontSize);
        }
      }
    }

    inspectElement(el) {
      if (!el || !this.panel) return;

      const typoData = extractTypography(el);
      if (!typoData) return;

      const evidenceData = analyzeFontEvidence(
        typoData.typography.fontStack,
        typoData.typography.fontWeight,
        typoData.typography.fontStyle
      );

      this.panel.update(el, typoData, evidenceData);

      // Record in recent history
      if (typoData.typography.primaryFamily) {
        addRecentFont(typoData.typography.primaryFamily, window.location.href).catch(() => {});
      }
    }

    getInspectableTarget(target) {
      if (!target || target.nodeType !== Node.ELEMENT_NODE) return null;

      // Ignore our host and its contents
      if (target.id === 'fontlens-inspector-host' || target.closest('#fontlens-inspector-host')) {
        return null;
      }

      // Ignore non-visual nodes
      const tag = target.tagName.toLowerCase();
      if (['html', 'body', 'script', 'style', 'noscript', 'head', 'meta', 'link'].includes(tag)) {
        return null;
      }

      return target;
    }

    broadcastState(active) {
      if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
        chrome.runtime.sendMessage({
          type: 'INSPECTION_STATE_CHANGED',
          active,
          url: window.location.href
        }).catch(() => {});
      }
    }
  }

  window.__FONTLENS_INSPECTOR_INSTANCE__ = new FontLensInspector();
  window.__FONTLENS_INSPECTOR_INSTANCE__.activate();
})();
